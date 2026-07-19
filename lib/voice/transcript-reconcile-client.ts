import type { InterviewMessage } from "@/lib/session/interview-store";

export async function reconcileTranscriptWithServer(
  sessionId: string,
  messages: InterviewMessage[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/interview/transcript/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      error: data.error ?? "Could not reconcile transcript with the cloud.",
    };
  }

  return { ok: true };
}
