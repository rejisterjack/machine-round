"use client";

import { useCallback, useState } from "react";

type RealtimeSession = {
  client_secret?: { value?: string };
  callsUrl?: string;
  deployment?: string;
};

type RealtimeVoiceOptions = {
  sessionId?: string;
  roleId?: string;
  roleTitle?: string;
  questionCount?: number;
};

export function useRealtimeVoice(options: RealtimeVoiceOptions = {}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string>();
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined";

  const start = useCallback(async () => {
    setError(undefined);
    try {
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: options.sessionId,
          roleId: options.roleId,
          roleTitle: options.roleTitle,
          questionCount: options.questionCount,
        }),
      });
      if (!response.ok) {
        throw new Error("Could not start voice session.");
      }
      const session = (await response.json()) as RealtimeSession;
      if (!session.client_secret?.value) {
        throw new Error("Realtime session token missing.");
      }
      setActive(true);
      return session;
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Voice session failed.";
      setError(message);
      setActive(false);
      return null;
    }
  }, [
    options.questionCount,
    options.roleId,
    options.roleTitle,
    options.sessionId,
  ]);

  const stop = useCallback(() => {
    setActive(false);
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      stop();
      return;
    }
    await start();
  }, [active, start, stop]);

  return {
    active,
    error,
    supported,
    start,
    stop,
    toggle,
  };
}
