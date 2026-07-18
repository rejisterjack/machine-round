import type { InterviewMessage } from "@/lib/session/interview-store";
import type { RealtimeEvent } from "@/lib/voice/realtime-webrtc";

export type PartialTranscript = {
  role: "user" | "assistant";
  content: string;
};

export function extractMessageFromRealtimeEvent(
  event: RealtimeEvent,
): InterviewMessage | null {
  if (event.type === "conversation.item.input_audio_transcription.completed") {
    const transcript =
      typeof event.transcript === "string" ? event.transcript.trim() : "";
    return transcript ? { role: "user", content: transcript } : null;
  }

  if (event.type === "response.output_audio_transcript.done") {
    const transcript =
      typeof event.transcript === "string" ? event.transcript.trim() : "";
    return transcript ? { role: "assistant", content: transcript } : null;
  }

  if (event.type === "response.output_text.done") {
    const text = typeof event.text === "string" ? event.text.trim() : "";
    return text ? { role: "assistant", content: text } : null;
  }

  return null;
}

export function extractPartialDelta(event: RealtimeEvent): PartialTranscript | null {
  if (event.type === "response.output_audio_transcript.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    return delta ? { role: "assistant", content: delta } : null;
  }

  if (event.type === "conversation.item.input_audio_transcription.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    return delta ? { role: "user", content: delta } : null;
  }

  return null;
}

export async function syncVoiceTranscript(sessionId: string, content: string) {
  try {
    await fetch("/api/interview/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, content }),
    });
  } catch {
    // Best-effort DB sync; client transcript remains source of truth.
  }
}
