import type { InterviewMessage } from "@/lib/session/interview-store";
import type { PanelistId } from "@/lib/ai/personas/panelists";
import type { RealtimeEvent } from "@/lib/voice/realtime-webrtc";
import {
  extractItemId,
  extractResponseId,
  getAssistantTranscriptSource,
  type ExtractedRealtimeMessage,
} from "@/lib/voice/transcript-dedup";
import {
  enqueueTranscriptSync,
  flushTranscriptQueue,
  type TranscriptSyncPayload,
} from "@/lib/voice/transcript-sync";

export type { TranscriptSyncPayload };

export type PartialTranscript = {
  role: "user" | "assistant";
  content: string;
  speaker?: PanelistId;
};

export type { ExtractedRealtimeMessage };

export function extractMessageFromRealtimeEvent(
  event: RealtimeEvent,
  activeSpeaker?: PanelistId,
): ExtractedRealtimeMessage | null {
  if (event.type === "conversation.item.input_audio_transcription.completed") {
    const transcript =
      typeof event.transcript === "string" ? event.transcript.trim() : "";
    return transcript
      ? {
          role: "user",
          content: transcript,
          itemId: extractItemId(event),
        }
      : null;
  }

  if (event.type === "response.output_audio_transcript.done") {
    const transcript =
      typeof event.transcript === "string" ? event.transcript.trim() : "";
    return transcript
      ? {
          role: "assistant",
          content: transcript,
          speaker: activeSpeaker,
          responseId: extractResponseId(event),
          itemId: extractItemId(event),
          source: getAssistantTranscriptSource(event),
        }
      : null;
  }

  if (event.type === "response.output_text.done") {
    const text = typeof event.text === "string" ? event.text.trim() : "";
    return text
      ? {
          role: "assistant",
          content: text,
          speaker: activeSpeaker,
          responseId: extractResponseId(event),
          itemId: extractItemId(event),
          source: getAssistantTranscriptSource(event),
        }
      : null;
  }

  return null;
}

export function extractPartialDelta(
  event: RealtimeEvent,
  activeSpeaker?: PanelistId,
): PartialTranscript | null {
  if (event.type === "response.output_audio_transcript.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    return delta
      ? { role: "assistant", content: delta, speaker: activeSpeaker }
      : null;
  }

  if (event.type === "conversation.item.input_audio_transcription.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    return delta ? { role: "user", content: delta } : null;
  }

  return null;
}

export async function syncVoiceTranscript(
  payload: TranscriptSyncPayload,
) {
  enqueueTranscriptSync(payload);
}

export { flushTranscriptQueue };
