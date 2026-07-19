import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler, withRetry } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { runInterviewTurn } from "@/lib/ai/interview-turn";
import { computeQuestionCount } from "@/lib/interview/question-counter";
import { isDbReady } from "@/lib/db/ready";
import {
  appendInterviewMessages,
  getInterviewSessionById,
  recomputeSessionQuestionCount,
} from "@/lib/session/persistence";
import { interviewRequestSchema } from "@/lib/session/interview-store";
import { resolveRoleFromSession } from "@/lib/session/session-role-binding";
import { reconcileSessionTranscript } from "@/lib/session/transcript-reconcile";
import { prisma } from "@/lib/prisma";


export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = interviewRequestSchema.parse(await request.json());

  const { role, bound } = await resolveRoleFromSession(
    body.sessionId,
    authSession.user.id,
    body,
  );

  if (body.sessionId && (await isDbReady())) {
    await reconcileSessionTranscript(body.sessionId, body.messages);
    await prisma.interviewSession.update({
      where: { id: body.sessionId },
      data: { status: "thinking", lastError: null },
    });
  }

  const questionCountBefore = computeQuestionCount(body.messages);

  try {
    const parsed = await withRetry(() =>
      runInterviewTurn({
        roleTitle: role.title,
        roleId: role.id,
        messages: body.messages,
        questionCount: questionCountBefore,
        panelistMode: bound?.panelistMode ?? body.panelistMode,
        promptContext: bound?.promptContext ?? undefined,
        interviewDuration: bound?.interviewDuration,
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
      await appendInterviewMessages(body.sessionId, [assistantMessage], {
        referencedAnswer: parsed.referencedAnswer,
        topicsCovered: parsed.topicsCovered,
        weakSignals: parsed.weakSignals,
        status: parsed.done ? "completed" : "active",
        completedAt: parsed.done ? new Date() : null,
      });
      await recomputeSessionQuestionCount(body.sessionId);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (body.sessionId && (await isDbReady())) {
      const message =
        error instanceof Error ? error.message : "Interview turn failed.";
      await prisma.interviewSession.update({
        where: { id: body.sessionId },
        data: { status: "error", lastError: message },
      });
    }
    throw error;
  }
}, { timeoutMs: API_TIMEOUTS.interview });
