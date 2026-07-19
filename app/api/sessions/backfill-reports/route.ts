import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import {
  canGenerateEvaluateReport,
  evaluateIneligibleMessage,
} from "@/lib/session/evaluate-eligibility";
import { generateEvaluateReport } from "@/lib/session/generate-evaluate-report";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { listPendingReportSessionIds } from "@/lib/session/session-maintenance";
import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";
import type { InterviewMessage } from "@/lib/session/interview-store";

export const maxDuration = 60;

export const POST = withApiHandler(async () => {
  const authSession = await requireAuth();

  if (!(await isDbReady())) {
    return NextResponse.json({
      processed: 0,
      succeeded: 0,
      failed: [],
    });
  }

  const pending = await listPendingReportSessionIds(authSession.user.id);
  const failed: Array<{ sessionId: string; error: string }> = [];
  let succeeded = 0;

  for (const { id } of pending) {
    const dbSession = await getInterviewSessionById(id);
    if (!dbSession) {
      failed.push({ sessionId: id, error: "Session not found." });
      continue;
    }

    const messages: InterviewMessage[] = dbSession.messages.map((message) => ({
      role: message.role as InterviewMessage["role"],
      content: message.content,
      speaker: normalizeInterviewMessageSpeaker(message.speakerName),
    }));

    if (!canGenerateEvaluateReport(messages)) {
      failed.push({
        sessionId: id,
        error: evaluateIneligibleMessage(messages),
      });
      continue;
    }

    try {
      await generateEvaluateReport({
        sessionId: id,
        userId: authSession.user.id,
        messages,
        weakSignals: dbSession.weakSignals,
      });
      succeeded += 1;
    } catch (error) {
      failed.push({
        sessionId: id,
        error:
          error instanceof Error ? error.message : "Failed to generate report.",
      });
    }
  }

  return NextResponse.json({
    processed: pending.length,
    succeeded,
    failed,
  });
}, { timeoutMs: API_TIMEOUTS.evaluate });
