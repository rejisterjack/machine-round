import type { InterviewMessage } from "@/lib/session/interview-store";
import type { RealtimeEvent } from "@/lib/voice/realtime-webrtc";

export type AssistantTranscriptSource = "audio" | "text";

export type ExtractedRealtimeMessage = InterviewMessage & {
  responseId?: string;
  itemId?: string;
  source?: AssistantTranscriptSource;
};

const ASSISTANT_AUDIO_EVENT = "response.output_audio_transcript.done";
const ASSISTANT_TEXT_EVENT = "response.output_text.done";

export function extractResponseId(event: RealtimeEvent): string | undefined {
  const direct =
    typeof event.response_id === "string"
      ? event.response_id
      : typeof event.responseId === "string"
        ? event.responseId
        : undefined;
  if (direct) return direct;

  const response = event.response;
  if (response && typeof response === "object") {
    const nested = (response as { id?: string }).id;
    if (typeof nested === "string") return nested;
  }

  return undefined;
}

export function extractItemId(event: RealtimeEvent): string | undefined {
  const direct =
    typeof event.item_id === "string"
      ? event.item_id
      : typeof event.itemId === "string"
        ? event.itemId
        : undefined;
  if (direct) return direct;

  const item = event.item;
  if (item && typeof item === "object") {
    const nested = (item as { id?: string }).id;
    if (typeof nested === "string") return nested;
  }

  return undefined;
}

export function normalizeTranscriptContent(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAssistantTranscriptEvent(event: RealtimeEvent): boolean {
  return (
    event.type === ASSISTANT_AUDIO_EVENT || event.type === ASSISTANT_TEXT_EVENT
  );
}

export function getAssistantTranscriptSource(
  event: RealtimeEvent,
): AssistantTranscriptSource | undefined {
  if (event.type === ASSISTANT_AUDIO_EVENT) return "audio";
  if (event.type === ASSISTANT_TEXT_EVENT) return "text";
  return undefined;
}

export function getAssistantDedupKey(
  event: RealtimeEvent,
  content: string,
): string {
  const responseId = extractResponseId(event);
  if (responseId) return `response:${responseId}`;

  const itemId = extractItemId(event);
  if (itemId) return `item:${itemId}`;

  const source = getAssistantTranscriptSource(event) ?? "text";
  return `content:${source}:${normalizeTranscriptContent(content)}`;
}

export function shouldSkipDuplicateAssistantMessage(
  messages: InterviewMessage[],
  content: string,
  lookback = 2,
): boolean {
  const normalized = normalizeTranscriptContent(content);
  if (!normalized) return true;

  const recentAssistant = messages
    .filter((message) => message.role === "assistant")
    .slice(-lookback);

  return recentAssistant.some(
    (message) => normalizeTranscriptContent(message.content) === normalized,
  );
}

export type AssistantDedupState = {
  processedKeys: Set<string>;
  audioResponseIds: Set<string>;
};

export function createAssistantDedupState(): AssistantDedupState {
  return {
    processedKeys: new Set<string>(),
    audioResponseIds: new Set<string>(),
  };
}

/** Returns false when the assistant event should be ignored (duplicate). */
export function shouldAcceptAssistantTranscriptEvent(
  state: AssistantDedupState,
  event: RealtimeEvent,
  content: string,
  messages: InterviewMessage[],
): boolean {
  const source = getAssistantTranscriptSource(event);
  const responseId = extractResponseId(event);
  const dedupKey = getAssistantDedupKey(event, content);

  if (state.processedKeys.has(dedupKey)) {
    return false;
  }

  if (source === "text" && responseId && state.audioResponseIds.has(responseId)) {
    return false;
  }

  if (shouldSkipDuplicateAssistantMessage(messages, content)) {
    return false;
  }

  state.processedKeys.add(dedupKey);
  if (source === "audio" && responseId) {
    state.audioResponseIds.add(responseId);
  }

  return true;
}
