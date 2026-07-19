import type { InterviewSession } from "@/lib/session/interview-store";

type SessionApiResponse = {
  roleId?: string;
  roleTitle: string;
  messages: InterviewSession["messages"];
  topicsCovered?: string[];
  weakSignals?: string[];
  questionCount?: number;
};

export async function fetchSessionForEvaluate(
  sessionId: string,
): Promise<InterviewSession | null> {
  const response = await fetch(`/api/sessions/${sessionId}`);
  if (!response.ok) return null;

  const data = (await response.json()) as SessionApiResponse;
  if (!data.messages?.length) return null;

  return {
    roleId: data.roleId ?? "",
    roleTitle: data.roleTitle,
    trackMode: "namaste_course",
    panelistMode: "both",
    messages: data.messages,
    questionCount: data.questionCount ?? 0,
    topicsCovered: data.topicsCovered ?? [],
    weakSignals: data.weakSignals ?? [],
    status: "complete",
    dbSessionId: sessionId,
  };
}

export async function generateReportForSession(
  session: InterviewSession,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roleId: session.roleId || undefined,
      roleTitle: session.roleTitle,
      messages: session.messages,
      sessionId: session.dbSessionId,
      weakSignals: session.weakSignals,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "Failed to generate report." };
  }

  return { ok: true };
}

export async function backfillPendingReport(sessionId: string) {
  const session = await fetchSessionForEvaluate(sessionId);
  if (!session) {
    return { ok: false as const, error: "Could not load session transcript." };
  }
  return generateReportForSession(session);
}
