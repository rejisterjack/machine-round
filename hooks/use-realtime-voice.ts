"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/session/interview-store";
import type { PanelistId, PanelistMode } from "@/lib/ai/personas/panelists";
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

type PrefetchedSession = {
  panelist: PanelistId;
  ephemeralKey: string;
  callsUrl: string;
  activePanelist: PanelistId;
};

type RealtimeVoiceOptions = {
  sessionId?: string;
  roleId?: string;
  roleTitle?: string;
  questionCount?: number;
  panelistMode?: PanelistMode;
  activePanelist?: PanelistId;
  messages?: InterviewMessage[];
  screenReviewEnabled?: boolean;
  getMicStream?: () => MediaStream | null;
  onEvent?: (event: RealtimeEvent) => void;
};

async function fetchRealtimeSession(
  opts: RealtimeVoiceOptions,
  panelist?: PanelistId,
): Promise<RealtimeSession & { ephemeralKey: string; callsUrl: string }> {
  const response = await fetch("/api/realtime/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      roleId: opts.roleId,
      roleTitle: opts.roleTitle,
      questionCount: opts.questionCount,
      panelistMode: opts.panelistMode,
      activePanelist: panelist,
      messages: opts.messages,
      screenReviewEnabled: opts.screenReviewEnabled,
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

  return { ...session, ephemeralKey, callsUrl };
}

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
  const prefetchedRef = useRef<PrefetchedSession | null>(null);
  const prefetchingRef = useRef<PanelistId | null>(null);
  const autoReconnectAttemptsRef = useRef(0);
  const startRef = useRef<
    (panelistOverride?: PanelistId) => Promise<unknown>
  >(async () => null);
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const onEventRef = useRef(options.onEvent);
  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const closeConnection = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState("idle");
    setVoiceState("idle");
  }, []);

  const stop = useCallback(() => {
    closeConnection();
    prefetchedRef.current = null;
    prefetchingRef.current = null;
    setHandoffPanelist(undefined);
  }, [closeConnection]);

  const connectWithSession = useCallback(
    async (
      ephemeralKey: string,
      callsUrl: string,
      sessionActivePanelist?: PanelistId,
    ) => {
      const opts = optionsRef.current;
      connectionRef.current?.close();
      connectionRef.current = await createRealtimeConnection({
        ephemeralKey,
        callsUrl,
        localAudioStream: opts.getMicStream?.() ?? undefined,
        onEvent: (event) => onEventRef.current?.(event),
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === "active") {
            setHandoffPanelist(undefined);
            autoReconnectAttemptsRef.current = 0;
          }
          if (state === "error" && autoReconnectAttemptsRef.current < 1) {
            autoReconnectAttemptsRef.current += 1;
            const panelist = optionsRef.current.activePanelist;
            void startRef.current(panelist);
          }
        },
        onVoiceStateChange: setVoiceState,
        onError: (message) => setError(message),
      });

      if (sessionActivePanelist) {
        setActivePanelist(sessionActivePanelist);
      }
    },
    [],
  );

  const prefetchSession = useCallback(async (panelist: PanelistId) => {
    if (prefetchingRef.current === panelist || prefetchedRef.current?.panelist === panelist) {
      return;
    }

    prefetchingRef.current = panelist;
    try {
      const opts = optionsRef.current;
      const session = await fetchRealtimeSession(opts, panelist);
      prefetchedRef.current = {
        panelist,
        ephemeralKey: session.ephemeralKey,
        callsUrl: session.callsUrl,
        activePanelist: session.activePanelist ?? panelist,
      };
    } catch {
      // Prefetch is best-effort.
    } finally {
      if (prefetchingRef.current === panelist) {
        prefetchingRef.current = null;
      }
    }
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
        const cached =
          panelist && prefetchedRef.current?.panelist === panelist
            ? prefetchedRef.current
            : null;
        prefetchedRef.current = null;

        if (cached) {
          await connectWithSession(
            cached.ephemeralKey,
            cached.callsUrl,
            cached.activePanelist,
          );
          return { activePanelist: cached.activePanelist };
        }

        const session = await fetchRealtimeSession(opts, panelist);
        await connectWithSession(
          session.ephemeralKey,
          session.callsUrl,
          session.activePanelist,
        );
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
    [connectWithSession, stop, supported],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const reconnect = useCallback(
    async (panelist: PanelistId, messages?: InterviewMessage[]) => {
      if (messages) {
        optionsRef.current = { ...optionsRef.current, messages };
      }
      closeConnection();
      return start(panelist);
    },
    [closeConnection, start],
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
      queueMicrotask(() => setActivePanelist(options.activePanelist));
    }
  }, [options.activePanelist]);

  const sendScreenContext = useCallback((summary: string) => {
    connectionRef.current?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: `[Screen update] ${summary}` }],
      },
    });
  }, []);

  const getRemoteAudioElement = useCallback(() => {
    return connectionRef.current?.remoteAudioElement ?? null;
  }, []);

  const waitForSpeechEnd = useCallback((timeoutMs = 30_000) => {
    return new Promise<void>((resolve) => {
      const connection = connectionRef.current;
      if (!connection?.dataChannel) {
        resolve();
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        connection.dataChannel?.removeEventListener("message", onMessage);
        clearTimeout(timer);
        resolve();
      };

      const onMessage = (messageEvent: MessageEvent) => {
        try {
          const event = JSON.parse(String(messageEvent.data)) as RealtimeEvent;
          if (
            event.type === "response.done" ||
            event.type === "response.completed" ||
            event.type === "output_audio_buffer.stopped"
          ) {
            finish();
          }
        } catch {
          // Ignore malformed events.
        }
      };

      connection.dataChannel.addEventListener("message", onMessage);
      const timer = setTimeout(finish, timeoutMs);
    });
  }, []);

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
    prefetchSession,
    toggle,
    sendScreenContext,
    getRemoteAudioElement,
    waitForSpeechEnd,
    sendEvent: (event: Record<string, unknown>) => {
      connectionRef.current?.sendEvent(event);
    },
  };
}
