"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildContinuationPrompt } from "@/lib/ai/conversation-phases";
import type { PanelistId, PanelistMode } from "@/lib/ai/personas/panelists";
import { formatMessageSpeaker } from "@/lib/ai/personas/panelists";
import type { InterviewMessage } from "@/lib/session/interview-store";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { SCREEN_FLUSH_TIMEOUT_MS, SCREEN_PRECISION_FLUSH_TIMEOUT_MS, MAX_VOICE_RECONNECT_ATTEMPTS, REALTIME_TOKEN_REFRESH_BUFFER_MS } from "@/lib/session/session-limits";
import {
  requestClosingGoodbye,
  speakPanelistAnnouncement,
  type AnnouncementKind,
} from "@/lib/voice/realtime-announcements";
import {
  buildVisualFocusQuestion,
  isScreenPrecisionEnabled,
  isVisualFollowUpQuestion,
} from "@/lib/interview/screen-intent";
import {
  buildScreenFrameImageUrl,
  formatVisionContextPrefix,
  framePushIntervalMs,
  initialRealtimeVisionMode,
  isRealtimeVisionEnabled,
  shouldRateLimitFramePush,
  type FramePushResult,
  type RealtimeVisionMode,
  type VisionContextSource,
} from "@/lib/interview/realtime-vision";
import { REALTIME_CHANNEL_MAX_BASE64_CHARS } from "@/lib/media/media-optimization";
import {
  createRealtimeConnection,
  type RealtimeConnection,
  type RealtimeConnectionState,
  type RealtimeEvent,
  type RealtimeVoiceState,
} from "@/lib/voice/realtime-webrtc";

type RealtimeSession = {
  client_secret?: { value?: string; expires_at?: number };
  callsUrl?: string;
  deployment?: string;
  activePanelist?: PanelistId;
  serverVadEnabled?: boolean;
  expires_at?: number;
};

export type VoiceConnectionStatus =
  | "idle"
  | "connecting"
  | "active"
  | "reconnecting"
  | "failed";

type PrefetchedSession = {
  panelist: PanelistId;
  ephemeralKey: string;
  callsUrl: string;
  activePanelist: PanelistId;
  serverVadEnabled: boolean;
  messageCount: number;
  questionCount: number;
};

type RealtimeVoiceOptions = {
  sessionId?: string;
  roleId?: string;
  roleTitle?: string;
  questionCount?: number;
  panelistMode?: PanelistMode;
  interviewDuration?: InterviewDuration;
  promptContext?: string;
  courseId?: string;
  messages?: InterviewMessage[];
  screenReviewEnabled?: boolean;
  cameraReviewEnabled?: boolean;
  routerReason?: string;
  getMicStream?: () => MediaStream | null;
  onEvent?: (event: RealtimeEvent) => void;
  onBeforeAssistantResponse?: () => Promise<void>;
};

export type ScreenContextMeta = {
  capturedAt?: string;
  surface?: string;
  imageOnly?: boolean;
  forceImage?: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  contextLabel?: VisionContextSource;
};

export type { FramePushResult } from "@/lib/interview/realtime-vision";

async function fetchRealtimeSession(
  opts: RealtimeVoiceOptions,
  panelist?: PanelistId,
): Promise<RealtimeSession & { ephemeralKey: string; callsUrl: string; expiresAt?: number }> {
  const response = await fetch("/api/realtime/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      roleId: opts.roleId,
      roleTitle: opts.roleTitle,
      questionCount: opts.questionCount,
      panelistMode: opts.panelistMode,
      interviewDuration: opts.interviewDuration,
      promptContext: opts.promptContext,
      courseId: opts.courseId ?? opts.roleId,
      activePanelist: panelist,
      messages: opts.messages,
      screenReviewEnabled: opts.screenReviewEnabled,
      cameraReviewEnabled: opts.cameraReviewEnabled,
      routerReason: opts.routerReason,
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
  const expiresAt =
    session.client_secret?.expires_at ??
    session.expires_at ??
    (session.client_secret as { expires_at?: number } | undefined)?.expires_at;

  if (!ephemeralKey || !callsUrl) {
    throw new Error("Realtime session token missing.");
  }

  return { ...session, ephemeralKey, callsUrl, expiresAt };
}

export function useRealtimeVoice(options: RealtimeVoiceOptions = {}) {
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("idle");
  const [connectionStatus, setConnectionStatus] =
    useState<VoiceConnectionStatus>("idle");
  const [voiceState, setVoiceState] = useState<RealtimeVoiceState>("idle");
  const voiceStateRef = useRef<RealtimeVoiceState>("idle");
  voiceStateRef.current = voiceState;
  const [error, setError] = useState<string>();
  const [connectedPanelist, setConnectedPanelist] = useState<
    PanelistId | undefined
  >();
  const [handoffPanelist, setHandoffPanelist] = useState<PanelistId>();
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const prefetchedMapRef = useRef<Map<PanelistId, PrefetchedSession>>(
    new Map(),
  );
  const prefetchingRef = useRef<Set<PanelistId>>(new Set());
  const pendingConnectedPanelistRef = useRef<PanelistId | undefined>(undefined);
  const connectedPanelistRef = useRef<PanelistId | undefined>(undefined);
  const handoffInFlightRef = useRef(false);
  const autoReconnectAttemptsRef = useRef(0);
  const reconnectInFlightRef = useRef(false);
  const reconnectIncidentUntilRef = useRef(0);
  const tokenExpiresAtRef = useRef<number | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasAutoReconnectingRef = useRef(false);
  const reconnectExhaustedRef = useRef(false);
  const visionImageErrorCountRef = useRef(0);
  const startRef = useRef<
  (
    panelistOverride?: PanelistId,
    startResponse?: boolean,
    forceFresh?: boolean,
    isAutoReconnect?: boolean,
  ) => Promise<unknown>
  >(async () => null);
  const reconnectRef = useRef<
    (
      panelist: PanelistId,
      messages?: InterviewMessage[],
      startResponse?: boolean,
      forceFresh?: boolean,
    ) => Promise<unknown>
  >(async () => null);
  const supported =
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const onEventRef = useRef(options.onEvent);
  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  const onBeforeAssistantResponseRef = useRef(options.onBeforeAssistantResponse);
  useEffect(() => {
    onBeforeAssistantResponseRef.current = options.onBeforeAssistantResponse;
  }, [options.onBeforeAssistantResponse]);

  const realtimeVisionSupportedRef = useRef<boolean | null>(
    isRealtimeVisionEnabled() ? null : false,
  );
  const [realtimeVisionMode, setRealtimeVisionMode] =
    useState<RealtimeVisionMode>(initialRealtimeVisionMode);
  const lastScreenFramePushAtRef = useRef(0);
  const lastCameraFramePushAtRef = useRef(0);
  const lastImageSendAtRef = useRef(0);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "error" && lastImageSendAtRef.current > 0) {
      const elapsed = Date.now() - lastImageSendAtRef.current;
      if (elapsed < 5000 && realtimeVisionSupportedRef.current !== false) {
        visionImageErrorCountRef.current += 1;
        if (visionImageErrorCountRef.current >= 2) {
          realtimeVisionSupportedRef.current = false;
          setRealtimeVisionMode("text");
        }
      }
    }

    if (
      (event.type === "conversation.item.created" ||
        event.type === "conversation.item.done") &&
      lastImageSendAtRef.current > 0
    ) {
      const elapsed = Date.now() - lastImageSendAtRef.current;
      if (elapsed < 3000) {
        visionImageErrorCountRef.current = 0;
        if (realtimeVisionSupportedRef.current === null) {
          realtimeVisionSupportedRef.current = true;
          setRealtimeVisionMode("image");
        }
      }
    }

    onEventRef.current?.(event);
  }, []);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cancelActiveResponse = useCallback(() => {
    const channel = connectionRef.current?.dataChannel;
    if (channel?.readyState !== "open") return;
    if (voiceStateRef.current === "speaking") {
      connectionRef.current?.sendEvent({ type: "response.cancel" });
    }
  }, []);

  const closeConnection = useCallback(() => {
    cancelActiveResponse();
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState("idle");
    setVoiceState("idle");
  }, [cancelActiveResponse]);

  const stop = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    closeConnection();
    prefetchedMapRef.current.clear();
    prefetchingRef.current.clear();
    setHandoffPanelist(undefined);
    setConnectionStatus("idle");
  }, [closeConnection]);

  const scheduleTokenRefresh = useCallback(
    (expiresAt?: number) => {
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      if (!expiresAt) return;

      tokenExpiresAtRef.current = expiresAt;
      const refreshAtMs =
        expiresAt * 1000 - Date.now() - REALTIME_TOKEN_REFRESH_BUFFER_MS;
      if (refreshAtMs <= 0) return;

      tokenRefreshTimerRef.current = setTimeout(() => {
        const panelist = connectedPanelistRef.current;
        if (!panelist) return;
        setConnectionStatus("reconnecting");
        void reconnectRef.current(
          panelist,
          optionsRef.current.messages,
          false,
          true,
        );
      }, refreshAtMs);
    },
    [],
  );

  const triggerAutoReconnect = useCallback((panelist?: PanelistId) => {
    const now = Date.now();
    if (reconnectExhaustedRef.current) return;
    if (now < reconnectIncidentUntilRef.current) return;
    if (reconnectInFlightRef.current || handoffInFlightRef.current) return;
    if (autoReconnectAttemptsRef.current >= MAX_VOICE_RECONNECT_ATTEMPTS) {
      reconnectExhaustedRef.current = true;
      setConnectionStatus("failed");
      speakPanelistAnnouncement(
        connectionRef.current,
        "reconnect_failed",
      );
      return;
    }

    reconnectIncidentUntilRef.current = now + 5000;
    reconnectInFlightRef.current = true;
    autoReconnectAttemptsRef.current += 1;
    setConnectionStatus("reconnecting");
    wasAutoReconnectingRef.current = true;

    const delayMs = autoReconnectAttemptsRef.current * 1000;
    window.setTimeout(() => {
      speakPanelistAnnouncement(connectionRef.current, "reconnecting");
      void startRef
        .current(panelist, false, true, true)
        .finally(() => {
          reconnectInFlightRef.current = false;
        });
    }, delayMs);
  }, []);

  const connectWithSession = useCallback(
    async (
      ephemeralKey: string,
      callsUrl: string,
      sessionActivePanelist?: PanelistId,
      serverVadEnabled = true,
      startResponse = true,
    ) => {
      const opts = optionsRef.current;
      cancelActiveResponse();
      connectionRef.current?.close();
      if (sessionActivePanelist) {
        pendingConnectedPanelistRef.current = sessionActivePanelist;
      }

      connectionRef.current = await createRealtimeConnection({
        ephemeralKey,
        callsUrl,
        localAudioStream: opts.getMicStream?.() ?? undefined,
        serverVadEnabled,
        startResponse,
        onEvent: handleRealtimeEvent,
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === "active") {
            const panelist =
              pendingConnectedPanelistRef.current ??
              connectedPanelistRef.current;
            if (panelist) {
              connectedPanelistRef.current = panelist;
              setConnectedPanelist(panelist);
              pendingConnectedPanelistRef.current = undefined;
            }
            setHandoffPanelist(undefined);
            autoReconnectAttemptsRef.current = 0;
            reconnectIncidentUntilRef.current = 0;
            reconnectExhaustedRef.current = false;
            setConnectionStatus("active");
            if (wasAutoReconnectingRef.current) {
              speakPanelistAnnouncement(connectionRef.current, "reconnect_ok");
              wasAutoReconnectingRef.current = false;
            }
          } else if (state === "connecting") {
            setConnectionStatus(
              reconnectInFlightRef.current ? "reconnecting" : "connecting",
            );
          } else if (state === "error") {
            triggerAutoReconnect(connectedPanelistRef.current);
          } else if (state === "idle") {
            if (!reconnectInFlightRef.current) {
              setConnectionStatus("idle");
            }
          }
        },
        onVoiceStateChange: setVoiceState,
        onError: (message) => setError(message),
      });
    },
    [cancelActiveResponse, handleRealtimeEvent, triggerAutoReconnect],
  );

  const prefetchSession = useCallback(
    async (
      panelist: PanelistId,
      context?: { messages?: InterviewMessage[]; questionCount?: number },
    ) => {
      const messages = context?.messages ?? optionsRef.current.messages ?? [];
      const messageCount = messages.length;
      const questionCount =
        context?.questionCount ?? optionsRef.current.questionCount ?? 0;

      const existing = prefetchedMapRef.current.get(panelist);
      if (
        existing &&
        existing.messageCount === messageCount &&
        existing.questionCount === questionCount
      ) {
        return;
      }

      if (prefetchingRef.current.has(panelist)) {
        return;
      }

      prefetchingRef.current.add(panelist);
      try {
        const opts = {
          ...optionsRef.current,
          messages,
          questionCount,
        };
        const session = await fetchRealtimeSession(opts, panelist);
        prefetchedMapRef.current.set(panelist, {
          panelist,
          ephemeralKey: session.ephemeralKey,
          callsUrl: session.callsUrl,
          activePanelist: session.activePanelist ?? panelist,
          serverVadEnabled: session.serverVadEnabled ?? true,
          messageCount,
          questionCount,
        });
      } catch {
        // Prefetch is best-effort.
      } finally {
        prefetchingRef.current.delete(panelist);
      }
    },
    [],
  );

  const prefetchBothSessions = useCallback(
    async (context?: {
      messages?: InterviewMessage[];
      questionCount?: number;
    }) => {
      const mode = optionsRef.current.panelistMode ?? "both";
      if (mode !== "both") return;
      await Promise.all([
        prefetchSession("akshay", context),
        prefetchSession("archy", context),
      ]);
    },
    [prefetchSession],
  );

  const start = useCallback(
    async (
      panelistOverride?: PanelistId,
      startResponse = true,
      forceFresh = false,
      isAutoReconnect = false,
    ) => {
      if (!supported) {
        setError("Voice is not supported in this browser.");
        return null;
      }

      const opts = optionsRef.current;
      const panelist =
        panelistOverride ?? connectedPanelistRef.current ?? "akshay";
      const messageCount = opts.messages?.length ?? 0;
      setHandoffPanelist(panelist);
      pendingConnectedPanelistRef.current = panelist;

      if (!isAutoReconnect) {
        setError(undefined);
      }
      setConnectionState("connecting");
      setConnectionStatus(isAutoReconnect ? "reconnecting" : "connecting");

      try {
        const cached =
          !forceFresh ? prefetchedMapRef.current.get(panelist) ?? null : null;
        const useCache =
          cached !== null &&
          cached.messageCount === messageCount &&
          cached.questionCount === (opts.questionCount ?? 0);

        if (cached && useCache) {
          prefetchedMapRef.current.delete(panelist);
          await connectWithSession(
            cached.ephemeralKey,
            cached.callsUrl,
            cached.activePanelist,
            cached.serverVadEnabled,
            startResponse,
          );
          return { activePanelist: cached.activePanelist };
        }

        if (cached) {
          prefetchedMapRef.current.delete(panelist);
        }

        const session = await fetchRealtimeSession(opts, panelist);
        scheduleTokenRefresh(session.expiresAt);
        await connectWithSession(
          session.ephemeralKey,
          session.callsUrl,
          session.activePanelist ?? panelist,
          session.serverVadEnabled ?? true,
          startResponse,
        );
        return session;
      } catch (startError) {
        const message =
          startError instanceof Error
            ? startError.message
            : "Voice session failed.";
        setError(message);
        setConnectionState("error");

        if (
          isAutoReconnect &&
          autoReconnectAttemptsRef.current < MAX_VOICE_RECONNECT_ATTEMPTS
        ) {
          setConnectionStatus("reconnecting");
          return null;
        }

        if (autoReconnectAttemptsRef.current >= MAX_VOICE_RECONNECT_ATTEMPTS) {
          setConnectionStatus("failed");
          speakPanelistAnnouncement(connectionRef.current, "reconnect_failed");
        } else {
          setConnectionStatus("failed");
        }

        setHandoffPanelist(undefined);
        pendingConnectedPanelistRef.current = undefined;
        if (!isAutoReconnect) {
          stop();
        }
        return null;
      }
    },
    [connectWithSession, scheduleTokenRefresh, stop, supported],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const reconnect = useCallback(
    async (
      panelist: PanelistId,
      messages?: InterviewMessage[],
      startResponse = true,
      forceFresh = false,
    ) => {
      if (messages) {
        optionsRef.current = { ...optionsRef.current, messages };
      }
      closeConnection();
      return start(panelist, startResponse, forceFresh);
    },
    [closeConnection, start],
  );

  useEffect(() => {
    reconnectRef.current = reconnect;
  }, [reconnect]);

  const handoffToPanelist = useCallback(
    async (
      panelist: PanelistId,
      context?: {
        messages?: InterviewMessage[];
        questionCount?: number;
        routerReason?: string;
      },
    ) => {
      optionsRef.current = {
        ...optionsRef.current,
        ...(context?.messages ? { messages: context.messages } : {}),
        ...(context?.questionCount !== undefined
          ? { questionCount: context.questionCount }
          : {}),
        ...(context?.routerReason
          ? { routerReason: context.routerReason }
          : {}),
      };
      setHandoffPanelist(panelist);
      pendingConnectedPanelistRef.current = panelist;
      return reconnect(panelist, context?.messages, false, true);
    },
    [reconnect],
  );

  const pushTurnContext = useCallback(
    (
      panelist: PanelistId,
      messages: InterviewMessage[],
      routerReason?: string,
    ) => {
      const opts = optionsRef.current;
      const transcript = messages.map(formatMessageSpeaker).join("\n");
      const instructions = buildContinuationPrompt({
        role: opts.roleTitle ?? "Software Engineer",
        questionCount: opts.questionCount ?? 0,
        panelistMode: opts.panelistMode ?? "both",
        activePanelist: panelist,
        transcript,
        messages,
        routerReason,
      });

      connectionRef.current?.sendEvent({
        type: "session.update",
        session: { instructions },
      });
    },
    [],
  );

  const waitForConnectionActive = useCallback((timeoutMs = 15_000) => {
    return new Promise<void>((resolve, reject) => {
      if (connectionRef.current?.dataChannel?.readyState === "open") {
        resolve();
        return;
      }

      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(interval);
        if (error) reject(error);
        else resolve();
      };

      const interval = window.setInterval(() => {
        if (connectionRef.current?.dataChannel?.readyState === "open") {
          finish();
        }
      }, 50);

      const timer = window.setTimeout(() => {
        finish(new Error("Voice connection timed out."));
      }, timeoutMs);
    });
  }, []);

  const handleUserTurnComplete = useCallback(
    async (messages: InterviewMessage[]) => {
      if (handoffInFlightRef.current) return;
      handoffInFlightRef.current = true;

      try {
        const opts = optionsRef.current;
        const connected =
          connectedPanelistRef.current ?? connectedPanelist ?? "akshay";
        optionsRef.current = { ...opts, messages };

        prefetchedMapRef.current.clear();

        let nextSpeaker = connected;
        let routerReason: string | undefined;

        if ((opts.panelistMode ?? "both") === "both" && opts.sessionId) {
          try {
            const response = await fetch("/api/interview/next-speaker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: opts.sessionId,
                messages,
                panelistMode: opts.panelistMode,
                connectedPanelist: connected,
                roleTitle: opts.roleTitle ?? "Software Engineer",
              }),
            });
            if (response.ok) {
              const decision = (await response.json()) as {
                speaker: PanelistId;
                reason: string;
              };
              nextSpeaker = decision.speaker;
              routerReason = decision.reason;
            }
          } catch {
            // Keep connected panelist on router failure.
          }
        }

        if (nextSpeaker !== connected) {
          await handoffToPanelist(nextSpeaker, {
            messages,
            questionCount: opts.questionCount,
            routerReason,
          });
          try {
            await waitForConnectionActive();
          } catch {
            setError("Voice connection timed out during panelist handoff.");
            return;
          }
        } else if (routerReason) {
          optionsRef.current = {
            ...optionsRef.current,
            routerReason,
          };
        }

        const lastUserMessage = messages
          .filter((message) => message.role === "user")
          .at(-1)?.content;
        const lastAssistantMessage = messages
          .filter((message) => message.role === "assistant")
          .at(-1)?.content;
        const visualFollowUp =
          (opts.screenReviewEnabled || opts.cameraReviewEnabled) &&
          isVisualFollowUpQuestion(lastUserMessage, lastAssistantMessage);
        const flushTimeoutMs =
          visualFollowUp && isScreenPrecisionEnabled()
            ? SCREEN_PRECISION_FLUSH_TIMEOUT_MS
            : SCREEN_FLUSH_TIMEOUT_MS;

        await Promise.race([
          onBeforeAssistantResponseRef.current?.() ?? Promise.resolve(),
          new Promise<void>((resolve) => {
            setTimeout(resolve, flushTimeoutMs);
          }),
        ]);

        if (connectionRef.current?.dataChannel?.readyState !== "open") {
          const panelist = connectedPanelistRef.current ?? nextSpeaker;
          await reconnect(panelist, messages, false, true);
          try {
            await waitForConnectionActive();
          } catch {
            setError("Voice connection lost before the panelist could respond.");
            setConnectionStatus("failed");
            speakPanelistAnnouncement(
              connectionRef.current,
              "reconnect_failed",
            );
            return;
          }
        }

        pushTurnContext(nextSpeaker, messages, routerReason);
        connectionRef.current?.sendEvent({ type: "response.create" });
      } finally {
        handoffInFlightRef.current = false;
      }
    },
    [
      connectedPanelist,
      handoffToPanelist,
      pushTurnContext,
      reconnect,
      waitForConnectionActive,
    ],
  );

  const requestClosingGoodbyeFromVoice = useCallback(() => {
    return requestClosingGoodbye(connectionRef.current);
  }, []);

  const speakAnnouncement = useCallback((kind: AnnouncementKind) => {
    return speakPanelistAnnouncement(connectionRef.current, kind);
  }, []);

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

  const sendScreenFrame = useCallback(
    (
      imageBase64: string,
      mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
      options?: { force?: boolean; source?: VisionContextSource },
    ): FramePushResult => {
      if (!isRealtimeVisionEnabled()) return "disabled";
      if (realtimeVisionSupportedRef.current === false) return "disabled";

      const source = options?.source ?? "screen";
      const lastPushAtRef =
        source === "camera"
          ? lastCameraFramePushAtRef
          : lastScreenFramePushAtRef;
      const now = Date.now();
      if (
        shouldRateLimitFramePush(
          lastPushAtRef.current,
          now,
          framePushIntervalMs(source),
          options?.force,
        )
      ) {
        return "rate_limited";
      }

      const connection = connectionRef.current;
      if (
        !connection?.dataChannel ||
        connection.dataChannel.readyState !== "open"
      ) {
        return "channel_unavailable";
      }

      if (imageBase64.length > REALTIME_CHANNEL_MAX_BASE64_CHARS) {
        return "too_large";
      }

      lastPushAtRef.current = now;
      lastImageSendAtRef.current = now;

      const sent = connection.sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: buildScreenFrameImageUrl(imageBase64, mimeType),
              detail: options?.force ? "high" : "auto",
            },
          ],
        },
      });

      return sent ? "sent" : "channel_unavailable";
    },
    [],
  );

  const sendScreenImage = useCallback(
    (imageBase64: string) => {
      sendScreenFrame(imageBase64, "image/jpeg", { force: true });
    },
    [sendScreenFrame],
  );

  const probeRealtimeVision = useCallback(() => {
    return Promise.resolve(realtimeVisionSupportedRef.current ?? false);
  }, []);

  const notifyCameraActive = useCallback(() => {
    optionsRef.current = {
      ...optionsRef.current,
      cameraReviewEnabled: true,
    };
    connectionRef.current?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "[Camera on] The candidate's camera is live. Fresh camera images arrive periodically. Answer questions about their appearance, gestures, hands, or fingers from the most recent camera image — describe what you can clearly see.",
          },
        ],
      },
    });
  }, []);

  const notifyCameraInactive = useCallback(() => {
    optionsRef.current = {
      ...optionsRef.current,
      cameraReviewEnabled: false,
    };
    connectionRef.current?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "[Camera off] The candidate turned off their camera. Do not answer camera-specific questions until it is on again.",
          },
        ],
      },
    });
  }, []);

  const notifyScreenShareActive = useCallback(() => {
    optionsRef.current = {
      ...optionsRef.current,
      screenReviewEnabled: true,
    };
    connectionRef.current?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "[Screen share started] The candidate is sharing their screen. Fresh screen images arrive as they change. Answer visual questions from the most recent screen image in context, not older text summaries.",
          },
        ],
      },
    });
  }, []);

  const notifyScreenShareEnded = useCallback(() => {
    optionsRef.current = {
      ...optionsRef.current,
      screenReviewEnabled: false,
    };
    connectionRef.current?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "[Screen share ended] The candidate stopped sharing their screen. Do not answer screen-specific questions until they share again.",
          },
        ],
      },
    });
  }, []);

  const sendScreenContext = useCallback(
    (summary: string, meta?: ScreenContextMeta) => {
      if (!summary.trim()) return;
      const prefix = formatVisionContextPrefix(meta?.contextLabel ?? "screen");
      const suffix = meta?.capturedAt
        ? ` (captured ${meta.capturedAt})`
        : "";
      connectionRef.current?.sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${prefix}${suffix} ${summary}`,
            },
          ],
        },
      });
    },
    [],
  );

  const getRemoteAudioElement = useCallback(() => {
    return connectionRef.current?.remoteAudioElement ?? null;
  }, []);

  const getConnectedPanelist = useCallback(() => {
    return connectedPanelistRef.current;
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
    connectionStatus,
    voiceState,
    connectedPanelist,
    activePanelist: connectedPanelist,
    handoffPanelist,
    error,
    supported,
    start,
    stop,
    reconnect,
    handoffToPanelist,
    prefetchSession,
    prefetchBothSessions,
    handleUserTurnComplete,
    getConnectedPanelist,
    toggle,
    sendScreenContext,
    sendScreenImage,
    sendScreenFrame,
    probeRealtimeVision,
    realtimeVisionMode,
    notifyScreenShareActive,
    notifyScreenShareEnded,
    notifyCameraActive,
    notifyCameraInactive,
    getRemoteAudioElement,
    waitForSpeechEnd,
    requestClosingGoodbye: requestClosingGoodbyeFromVoice,
    speakAnnouncement,
    sendEvent: (event: Record<string, unknown>) => {
      connectionRef.current?.sendEvent(event);
    },
  };
}
