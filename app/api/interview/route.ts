import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler, withRetry } from "@/lib/api/handler";
import { runInterviewTurn } from "@/lib/ai/interview-turn";
import { isDbReady } from "@/lib/db/ready";
import {
  appendInterviewMessages,
  getInterviewSessionById,
} from "@/lib/session/persistence";
import { interviewRequestSchema } from "@/lib/session/interview-store";
import { resolveRole } from "@/lib/session/roles";
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
  const body = interviewRequestSchema.parse(await request.json());
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
    }),
  );

  if (body.sessionId && (await isDbReady())) {
    await appendInterviewMessages(
      body.sessionId,
      [
        {
          role: "assistant",
          content: parsed.message,
          speaker: parsed.speaker,
        },
      ],
      {
        referencedAnswer: parsed.referencedAnswer,
        questionCount: body.questionCount + 1,
        topicsCovered: parsed.topicsCovered,
        weakSignals: parsed.weakSignals,
        status: parsed.done ? "completed" : "active",
        completedAt: parsed.done ? new Date() : null,
      },
    );
  }

  return NextResponse.json(parsed);
}, { timeoutMs: API_TIMEOUTS.interview });
