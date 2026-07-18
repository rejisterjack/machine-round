"use client";

import { useCallback, useState } from "react";

type RealtimeSession = {
  client_secret?: { value?: string };
  callsUrl?: string;
  deployment?: string;
};

export function useRealtimeVoice() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string>();
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined";

  const start = useCallback(async () => {
    setError(undefined);
    try {
      const response = await fetch("/api/realtime/session", { method: "POST" });
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
  }, []);

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
