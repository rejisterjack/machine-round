import { NextResponse } from "next/server";
import { z } from "zod";
import type { InputMode, SessionStatus } from "@/generated/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { isDbReady } from "@/lib/db/ready";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";
import { prisma } from "@/lib/prisma";

const patchSessionSchema = z.object({
  status: z
    .enum(["active", "thinking", "completed", "abandoned", "error"])
    .optional(),
  inputMode: z.enum(["text", "voice", "mixed"]).optional(),
  questionCount: z.number().int().min(0).optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
  lastError: z.string().nullable().optional(),
});

export const GET = withApiHandler(
  async (
    _request: Request,
    context?: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await context!.params;
    const session = await getInterviewSessionById(id);
    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      status: session.status,
      inputMode: session.inputMode,
      questionCount: session.questionCount,
      topicsCovered: session.topicsCovered,
      weakSignals: session.weakSignals,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        speaker: message.speakerName ?? undefined,
      })),
      report: reportToEvaluateResponse(session.report),
      shareToken: session.report?.shareToken ?? null,
    });
  },
);

export const PATCH = withApiHandler(
  async (request: Request, context?: { params: Promise<{ id: string }> }) => {
    const { id } = await context!.params;

    if (!(await isDbReady())) {
      return NextResponse.json({ persisted: false });
    }

    const body = patchSessionSchema.parse(await request.json());
    const session = await prisma.interviewSession.update({
      where: { id },
      data: {
        status: body.status as SessionStatus | undefined,
        inputMode: body.inputMode as InputMode | undefined,
        questionCount: body.questionCount,
        topicsCovered: body.topicsCovered,
        weakSignals: body.weakSignals,
        lastError: body.lastError ?? undefined,
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
