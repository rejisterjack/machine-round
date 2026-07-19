import type { RealtimeConnection } from "@/lib/voice/realtime-webrtc";

export type AnnouncementKind =
  | "reconnecting"
  | "reconnect_ok"
  | "reconnect_failed"
  | "token_refresh"
  | "closing_goodbye"
  | "time_wrap_up";

const ANNOUNCEMENT_COPY: Record<AnnouncementKind, string> = {
  reconnecting: "Give me a moment — I'm reconnecting.",
  reconnect_ok: "Sorry about that hiccup. Let's continue.",
  reconnect_failed:
    "I'm having trouble with the connection. Tap Retry voice when you're ready.",
  token_refresh: "Still here — one moment while I reconnect.",
  closing_goodbye:
    "Thank you for your time today. Your readiness report is up next.",
  time_wrap_up:
    "We have about two minutes left — let's start wrapping up.",
};

export function getAnnouncementCopy(kind: AnnouncementKind): string {
  return ANNOUNCEMENT_COPY[kind];
}

export function speakPanelistAnnouncement(
  connection: RealtimeConnection | null,
  kind: AnnouncementKind,
  customText?: string,
): boolean {
  if (!connection?.dataChannel || connection.dataChannel.readyState !== "open") {
    return false;
  }

  const phrase = customText?.trim() || getAnnouncementCopy(kind);
  const sentContext = connection.sendEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: `[System] Speak naturally and briefly. Say exactly this (or very close): "${phrase}"`,
        },
      ],
    },
  });

  if (!sentContext) return false;

  return connection.sendEvent({ type: "response.create" });
}

export function requestClosingGoodbye(
  connection: RealtimeConnection | null,
): boolean {
  if (!connection?.dataChannel || connection.dataChannel.readyState !== "open") {
    return false;
  }

  connection.sendEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "[System] This is the final turn. Give a warm closing line: thank the candidate, say the interview is complete, and mention their readiness report is next. Do not ask another question.",
        },
      ],
    },
  });

  return connection.sendEvent({ type: "response.create" });
}
