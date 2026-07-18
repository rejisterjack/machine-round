"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRealtimeConnection,
  type RealtimeConnection,
  type RealtimeConnectionState,
  type RealtimeEvent,
  type RealtimeVoiceState,
} from "@/lib/voice/realtime-webrtc";

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
  onEvent?: (event: RealtimeEvent) => void;
};

export function useRealtimeVoice(options: RealtimeVoiceOptions = {}) {
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("idle");
  const [voiceState, setVoiceState] = useState<RealtimeVoiceState>("idle");
  const [error, setError] = useState<string>();
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  const stop = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState("idle");
    setVoiceState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Voice is not supported in this browser.");
      return null;
    }

    setError(undefined);
    setConnectionState("connecting");

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
      const ephemeralKey = session.client_secret?.value;
      const callsUrl = session.callsUrl;

      if (!ephemeralKey || !callsUrl) {
        throw new Error("Realtime session token missing.");
      }

      connectionRef.current?.close();
      connectionRef.current = await createRealtimeConnection({
        ephemeralKey,
        callsUrl,
        onEvent: (event) => onEventRef.current?.(event),
        onStateChange: setConnectionState,
        onVoiceStateChange: setVoiceState,
        onError: (message) => setError(message),
      });

      return session;
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Voice session failed.";
      setError(message);
      setConnectionState("error");
      stop();
      return null;
    }
  }, [
    options.questionCount,
    options.roleId,
    options.roleTitle,
    options.sessionId,
    stop,
    supported,
  ]);

  const toggle = useCallback(async () => {
    if (connectionState === "active" || connectionState === "connecting") {
      stop();
      return;
    }
    await start();
  }, [connectionState, start, stop]);

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, []);

  return {
    active: connectionState === "active" || connectionState === "connecting",
    connecting: connectionState === "connecting",
    connectionState,
    voiceState,
    error,
    supported,
    start,
    stop,
    toggle,
    sendEvent: (event: Record<string, unknown>) => {
      connectionRef.current?.sendEvent(event);
    },
  };
}
