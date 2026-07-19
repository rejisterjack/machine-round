import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import {
  getReportByShareToken,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { assertSessionOwner } from "@/lib/session/session-access";
import type { EvaluateResponse } from "@/lib/session/interview-store";
import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { roleSlugToId } from "@/lib/session/role-slug";

export type SharedReportData = EvaluateResponse & {
  roleTitle: string;
  publicId: string;
  generatedAt: string;
  shareToken: string;
};

export type SessionReportData = {
  id: string;
  publicId: string;
  roleId?: string;
  roleTitle: string;
  interviewDuration?: InterviewDuration;
  questionCount: number;
  topicsCovered: string[];
  weakSignals: string[];
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    speaker?: string;
  }>;
  report?: EvaluateResponse & { shareToken?: string | null };
  shareToken?: string | null;
  lastError?: string | null;
};

async function loadSharedReportDataCached(
  token: string,
): Promise<SharedReportData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`share-report:${token}`);

  const report = await getReportByShareToken(token);
  if (!report) return null;

  const payload = reportToEvaluateResponse(report);
  if (!payload) return null;

  return {
    ...payload,
    roleTitle: report.session.role.title,
    publicId: report.session.publicId,
    generatedAt: report.generatedAt.toISOString(),
    shareToken: token,
  };
}

export async function loadSharedReportData(
  token: string,
): Promise<SharedReportData | null> {
  return loadSharedReportDataCached(token);
}

export async function loadSessionReport(
  sessionId: string,
  userId: string,
): Promise<SessionReportData | null> {
  await assertSessionOwner(sessionId, userId);
  const session = await getInterviewSessionById(sessionId);
  if (!session) return null;

  const report = session.report
    ? reportToEvaluateResponse(session.report)
    : undefined;

  return {
    id: session.id,
    publicId: session.publicId,
    roleId: roleSlugToId(session.role.slug),
    roleTitle: session.role.title,
    interviewDuration: session.interviewDuration ?? "minutes_30",
    questionCount: session.questionCount,
    topicsCovered: session.topicsCovered,
    weakSignals: session.weakSignals,
    messages: session.messages.map((message) => ({
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
      speaker: normalizeInterviewMessageSpeaker(message.speakerName),
    })),
    report: report
      ? { ...report, shareToken: session.report?.shareToken ?? null }
      : undefined,
    shareToken: session.report?.shareToken ?? null,
    lastError: session.lastError,
  };
}

export function invalidateReportCache(input: {
  shareToken?: string | null;
  sessionId?: string;
}) {
  if (input.shareToken) {
    revalidateTag(`share-report:${input.shareToken}`, "max");
  }
  if (input.sessionId) {
    revalidateTag(`session-report:${input.sessionId}`, "max");
  }
}
