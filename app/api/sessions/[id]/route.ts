import { NextResponse } from "next/server";
import { z } from "zod";
import type { InputMode, InterviewDuration, RecordingStatus, SessionStatus } from "@/generated/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { parseJson } from "@/lib/api/validate";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { countScreenCaptures } from "@/lib/session/media-queries";
import { roleSlugToId } from "@/lib/session/role-slug";
import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";
import { assertSessionOwner } from "@/lib/session/session-access";
import { interviewDurationSchema } from "@/lib/session/interview-store";
import { deleteSessionCloudinaryAssets } from "@/lib/media/session-media-cleanup";
import { prisma } from "@/lib/prisma";

const patchSessionSchema = z.object({
  status: z
    .enum(["active", "thinking", "completed", "abandoned", "error"])
    .optional(),
  inputMode: z.enum(["text", "voice", "mixed"]).optional(),
  interviewDuration: interviewDurationSchema.optional(),
  questionCount: z.number().int().min(0).optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
  lastError: z.string().nullable().optional(),
  recordingStatus: z.enum(["none", "pending", "uploaded", "failed"]).optional(),
  completedAt: z.string().datetime().optional(),
});

export const GET = withApiHandler(
  async (
    _request: Request,
    context?: { params: Promise<{ id: string }> },
  ) => {
    const authSession = await requireAuth();
    const { id } = await context!.params;
    await assertSessionOwner(id, authSession.user.id);

    const session = await getInterviewSessionById(id);
    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    const snapshotCount = await countScreenCaptures(id);

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      roleId: roleSlugToId(session.role.slug),
      status: session.status,
      inputMode: session.inputMode,
      panelistMode: session.panelistMode ?? "both",
      interviewDuration: session.interviewDuration ?? "minutes_30",
      questionCount: session.questionCount,
      topicsCovered: session.topicsCovered,
      weakSignals: session.weakSignals,
      lastError: session.lastError,
      snapshotCount,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        speaker: normalizeInterviewMessageSpeaker(message.speakerName),
      })),
      report: reportToEvaluateResponse(session.report),
      shareToken: session.report?.shareToken ?? null,
    });
  },
);

export const PATCH = withApiHandler(
  async (request: Request, context?: { params: Promise<{ id: string }> }) => {
    const authSession = await requireAuth();
    const { id } = await context!.params;
    await assertSessionOwner(id, authSession.user.id);

    if (!(await isDbReady())) {
      return NextResponse.json({ persisted: false });
    }

    const body = await parseJson(request, patchSessionSchema);

    const existing = await prisma.interviewSession.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    if (
      body.status === "abandoned" &&
      (existing.status === "completed" || existing.status === "abandoned")
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Cannot abandon a session that is already finished.",
        400,
      );
    }

    if (body.status === "abandoned") {
      await deleteSessionCloudinaryAssets(id);
    }

    const session = await prisma.interviewSession.update({
      where: { id },
      data: {
        status: body.status as SessionStatus | undefined,
        inputMode: body.inputMode as InputMode | undefined,
        interviewDuration: body.interviewDuration as InterviewDuration | undefined,
        questionCount: body.questionCount,
        topicsCovered: body.topicsCovered,
        weakSignals: body.weakSignals,
        lastError: body.lastError ?? undefined,
        recordingStatus: body.recordingStatus as RecordingStatus | undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
    });

    return NextResponse.json({
      id: session.id,
      status: session.status,
      inputMode: session.inputMode,
      questionCount: session.questionCount,
    });
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, context?: { params: Promise<{ id: string }> }) => {
    const authSession = await requireAuth();
    const { id } = await context!.params;
    await assertSessionOwner(id, authSession.user.id);

    if (!(await isDbReady())) {
      throw new ApiError("UPSTREAM_ERROR", "Database is not available.", 503);
    }

    const existing = await prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    await deleteSessionCloudinaryAssets(id);
    await prisma.interviewSession.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  },
);
