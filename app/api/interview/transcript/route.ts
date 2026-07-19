import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/validate";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { appendInterviewMessages, recomputeSessionQuestionCount } from "@/lib/session/persistence";
import { transcriptRequestSchema } from "@/lib/session/interview-store";
import { assertSessionOwner } from "@/lib/session/session-access";
import type { SessionStatus } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";

type TranscriptBody = z.infer<typeof transcriptRequestSchema>;

async function applyTranscriptSessionMetadata(body: TranscriptBody) {
  const data: {
    topicsCovered?: string[];
    weakSignals?: string[];
    status?: SessionStatus;
    completedAt?: Date | null;
  } = {};

  if (body.topicsCovered !== undefined) {
    data.topicsCovered = body.topicsCovered;
  }
  if (body.weakSignals !== undefined) {
    data.weakSignals = body.weakSignals;
  }
  if (body.status !== undefined) {
    data.status = body.status as SessionStatus;
  }
  if (body.completedAt !== undefined) {
    data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  await prisma.interviewSession.update({
    where: { id: body.sessionId },
    data,
  });
}

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = await parseJson(request, transcriptRequestSchema);
  await assertSessionOwner(body.sessionId, authSession.user.id);

  if (await isDbReady()) {
    if (body.clientSyncId) {
      const existing = await prisma.interviewMessage.findFirst({
        where: {
          sessionId: body.sessionId,
          clientSyncId: body.clientSyncId,
        },
        select: { id: true },
      });
      if (existing) {
        await applyTranscriptSessionMetadata(body);
        await recomputeSessionQuestionCount(body.sessionId);
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    await appendInterviewMessages(
      body.sessionId,
      [
        {
          role: body.role,
          content: body.content.trim(),
          speaker: body.speaker,
        },
      ],
      {
        inputMode: "voice",
        clientSyncId: body.clientSyncId,
        referencedAnswer: body.referencedAnswer,
        topicsCovered: body.topicsCovered,
        weakSignals: body.weakSignals,
        status: body.status as SessionStatus | undefined,
        completedAt:
          body.completedAt === undefined
            ? undefined
            : body.completedAt
              ? new Date(body.completedAt)
              : null,
      },
    );
    await recomputeSessionQuestionCount(body.sessionId);
  }

  return NextResponse.json({ ok: true });
});
