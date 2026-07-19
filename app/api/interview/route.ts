import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler, withRetry } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { runInterviewTurn } from "@/lib/ai/interview-turn";
import { isDbReady } from "@/lib/db/ready";
import {
  appendInterviewMessages,
  getInterviewSessionById,
} from "@/lib/session/persistence";
import { computeQuestionCount } from "@/lib/interview/question-counter";
import { interviewRequestSchema } from "@/lib/session/interview-store";
import { resolveRole } from "@/lib/session/roles";
import { assertSessionOwnerIfPresent } from "@/lib/session/session-access";
import { prisma } from "@/lib/prisma";

async function syncUnsyncedMessages(
  sessionId: string,
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const dbSession = await getInterviewSessionById(sessionId);
  if (!dbSession) return;

  const unsynced = messages.slice(dbSession.messages.length);
  if (unsynced.length === 0) return;

  await appendInterviewMessages(sessionId, unsynced, { status: "thinking" });
}

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = interviewRequestSchema.parse(await request.json());
  await assertSessionOwnerIfPresent(body.sessionId, authSession.user.id);
  const role = await resolveRole(body);

  if (body.sessionId && (await isDbReady())) {
    await syncUnsyncedMessages(body.sessionId, body.messages);
    await prisma.interviewSession.update({
      where: { id: body.sessionId },
      data: { status: "thinking", lastError: null },
    });
  }

  const parsed = await withRetry(() =>
    runInterviewTurn({
      roleTitle: role.title,
      roleId: role.id,
      messages: body.messages,
      questionCount: body.questionCount,
      panelistMode: body.panelistMode,
    }),
  );

  const assistantMessage = {
    role: "assistant" as const,
    content: parsed.message,
    speaker: parsed.speaker,
  };
  const questionCount = computeQuestionCount([
    ...body.messages,
    assistantMessage,
  ]);

  if (body.sessionId && (await isDbReady())) {
    await appendInterviewMessages(
      body.sessionId,
      [assistantMessage],
      {
        referencedAnswer: parsed.referencedAnswer,
        questionCount,
        topicsCovered: parsed.topicsCovered,
        weakSignals: parsed.weakSignals,
        status: parsed.done ? "completed" : "active",
        completedAt: parsed.done ? new Date() : null,
      },
    );
  }

  return NextResponse.json(parsed);
}, { timeoutMs: API_TIMEOUTS.interview });
