"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/session/interview-store";
import type { PanelistId } from "@/lib/ai/personas/panelists";
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
  activePanelist?: PanelistId;
};

type RealtimeVoiceOptions = {
  sessionId?: string;
  roleId?: string;
  roleTitle?: string;
  questionCount?: number;
  activePanelist?: PanelistId;
  messages?: InterviewMessage[];
  onEvent?: (event: RealtimeEvent) => void;
};

export function useRealtimeVoice(options: RealtimeVoiceOptions = {}) {
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("idle");
  const [voiceState, setVoiceState] = useState<RealtimeVoiceState>("idle");
  const [error, setError] = useState<string>();
  const [activePanelist, setActivePanelist] = useState<PanelistId | undefined>(
    options.activePanelist,
  );
  const [handoffPanelist, setHandoffPanelist] = useState<PanelistId>();
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState("idle");
    setVoiceState("idle");
    setHandoffPanelist(undefined);
  }, []);

  const start = useCallback(
    async (panelistOverride?: PanelistId) => {
      if (!supported) {
        setError("Voice is not supported in this browser.");
        return null;
      }

      const opts = optionsRef.current;
      const panelist = panelistOverride ?? opts.activePanelist;
      if (panelist) {
        setHandoffPanelist(panelist);
        setActivePanelist(panelist);
      }

      setError(undefined);
      setConnectionState("connecting");

      try {
        const response = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: opts.sessionId,
            roleId: opts.roleId,
            roleTitle: opts.roleTitle,
            questionCount: opts.questionCount,
            activePanelist: panelist,
            messages: opts.messages,
          }),
        });

        if (!response.ok) {
          throw new Error("Could not start voice session.");
        }

        const session = (await response.json()) as RealtimeSession;
        const ephemeralKey =
          session.client_secret?.value ??
          (session as RealtimeSession & { value?: string }).value;
        const callsUrl = session.callsUrl;

        if (!ephemeralKey || !callsUrl) {
          throw new Error("Realtime session token missing.");
        }

        if (session.activePanelist) {
          setActivePanelist(session.activePanelist);
        }

        connectionRef.current?.close();
        connectionRef.current = await createRealtimeConnection({
          ephemeralKey,
          callsUrl,
          onEvent: (event) => onEventRef.current?.(event),
          onStateChange: (state) => {
            setConnectionState(state);
            if (state === "active") {
              setHandoffPanelist(undefined);
            }
          },
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
        setHandoffPanelist(undefined);
        stop();
        return null;
      }
    },
    [stop, supported],
  );

  const reconnect = useCallback(
    async (panelist: PanelistId, messages?: InterviewMessage[]) => {
      if (messages) {
        optionsRef.current = { ...optionsRef.current, messages };
      }
      stop();
      return start(panelist);
    },
    [start, stop],
  );

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

  useEffect(() => {
    if (options.activePanelist) {
      setActivePanelist(options.activePanelist);
    }
  }, [options.activePanelist]);

  return {
    active: connectionState === "active" || connectionState === "connecting",
    connecting: connectionState === "connecting",
    connectionState,
    voiceState,
    activePanelist,
    handoffPanelist,
    error,
    supported,
    start,
    stop,
    reconnect,
    toggle,
    sendEvent: (event: Record<string, unknown>) => {
      connectionRef.current?.sendEvent(event);
    },
  };
}
