"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiveCaptions } from "@/components/interview/room/live-captions";
import { MediaControlBar } from "@/components/interview/room/media-control-bar";
import { PreJoinLobby } from "@/components/interview/room/pre-join-lobby";
import { ScreenShareStage } from "@/components/interview/room/screen-share-stage";
import { SelfPreview } from "@/components/interview/room/self-preview";
import { SpeakerStage } from "@/components/interview/room/speaker-stage";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { useMediaDevices } from "@/hooks/use-media-devices";
import { useRealtimeVoice } from "@/hooks/use-realtime-voice";
import { useSessionRecorder } from "@/hooks/use-session-recorder";
import {
  getPanelistForQuestion,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import {
  createScreenRealtimePusher,
  type ScreenFlushOptions,
} from "@/lib/interview/screen-realtime";
import { captureCameraFrameFromSource, captureCameraPrecisionFrameFromSource } from "@/lib/interview/screen-capture";
import { buildVisualFocusQuestion } from "@/lib/interview/screen-intent";
import type { ScreenContextMeta, FramePushResult } from "@/hooks/use-realtime-voice";
import { isFramePushFailure } from "@/lib/interview/realtime-vision";
import {
  needsClosingGoodbye,
  needsClosingGoodbyeByTime,
  shouldScheduleInterviewEnd,
  shouldScheduleInterviewEndByTime,
  shouldWarnDurationWrapUp,
} from "@/lib/ai/question-cap";
import {
  DEFAULT_INTERVIEW_DURATION,
  getMaxQuestionsForDuration,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import { logInterviewDebug } from "@/lib/interview/debug-log";
import { computeQuestionCount } from "@/lib/interview/question-counter";
import { mapDbSessionStatusToClient } from "@/lib/session/client-session-status";
import {
  CAMERA_REALTIME_INTERVAL_MS,
  INTERVIEW_COMPLETE_BANNER_MS,
  INTERVIEW_COMPLETE_FALLBACK_MS,
  MAX_SCREEN_SNAPSHOTS,
} from "@/lib/session/session-limits";
import {
  loadSession,
  saveSession,
  type InterviewMessage,
  type InterviewSession,
  type ScreenObservation,
} from "@/lib/session/interview-store";
import type { RealtimeEvent } from "@/lib/voice/realtime-webrtc";
import {
  extractMessageFromRealtimeEvent,
  extractPartialDelta,
  flushTranscriptQueue,
  syncVoiceTranscript,
} from "@/lib/voice/realtime-transcript";
import { onTranscriptSyncStatus } from "@/lib/voice/transcript-sync";
import { isTranscriptSyncFailing } from "@/lib/voice/transcript-sync";
import { abandonSessionAction, updateSessionMetadataAction } from "@/lib/actions/session-actions";
import { reconcileTranscriptWithServer } from "@/lib/voice/transcript-reconcile-client";
import {
  detectWeakSignalsFromAnswer,
  mergeWeakSignals,
} from "@/lib/voice/weak-signal-heuristics";
import {
  createAssistantDedupState,
  shouldAcceptAssistantTranscriptEvent,
} from "@/lib/voice/transcript-dedup";

const InterviewRoom = dynamic(
  () =>
    import("@/components/interview/room/interview-room").then((module) => ({
      default: module.InterviewRoom,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading interview room…
      </div>
    ),
  },
);

type RoomPhase = "lobby" | "room";

export default function InterviewSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [phase, setPhase] = useState<RoomPhase>("lobby");
  const [joining, setJoining] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState<{
    role: "user" | "assistant";
    content: string;
    speaker?: PanelistId;
  }>();
  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [cloudSyncFailed, setCloudSyncFailed] = useState(false);
  const [screenAnalyzePaused, setScreenAnalyzePaused] = useState<string>();
  const [cameraVisionPaused, setCameraVisionPaused] = useState<string>();
  const [finishingInterview, setFinishingInterview] = useState(false);
  const [completeBanner, setCompleteBanner] = useState(false);
  const [canResumeSession, setCanResumeSession] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const voiceStopRef = useRef<() => void>(() => {});
  const voiceReconnectRef = useRef<
    (panelist: PanelistId, messages?: InterviewMessage[]) => Promise<unknown>
  >(async () => null);
  const sendScreenContextRef = useRef<
    (summary: string, meta?: ScreenContextMeta) => void
  >(() => {});
  const sendScreenFrameRef = useRef<
    (
      imageBase64: string,
      mimeType?: "image/jpeg" | "image/png" | "image/webp",
      options?: { force?: boolean; source?: "screen" | "camera" },
    ) => FramePushResult
  >(() => "channel_unavailable");
  const realtimeVisionModeRef = useRef<"unknown" | "image" | "text">("unknown");
  const notifyScreenShareActiveRef = useRef<() => void>(() => {});
  const notifyScreenShareEndedRef = useRef<() => void>(() => {});
  const notifyCameraActiveRef = useRef<() => void>(() => {});
  const notifyCameraInactiveRef = useRef<() => void>(() => {});
  const flushScreenContextRef = useRef<
    (options?: ScreenFlushOptions) => Promise<void>
  >(async () => {});
  const flushCameraContextRef = useRef<
    (options?: ScreenFlushOptions) => Promise<void>
  >(async () => {});
  const voiceConnectionActiveRef = useRef(false);
  const getRemoteAudioRef = useRef<() => HTMLAudioElement | null>(() => null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenRealtimeRef = useRef<ReturnType<
    typeof createScreenRealtimePusher
  > | null>(null);
  const screenRealtimeTrackIdRef = useRef<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraRealtimeRef = useRef<ReturnType<
    typeof createScreenRealtimePusher
  > | null>(null);
  const cameraRealtimeTrackIdRef = useRef<string | null>(null);
  const snapshotCountRef = useRef(0);
  const recorderRefreshInFlightRef = useRef(false);
  const recorderRef = useRef<ReturnType<typeof useSessionRecorder> | null>(null);
  const hydrating = useRef(false);
  const completingRef = useRef(false);
  const abandoningRef = useRef(false);
  const pendingCompleteRef = useRef<InterviewSession | null>(null);
  const pendingCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const completeSessionRef = useRef<(base: InterviewSession) => Promise<void>>(
    async () => {},
  );
  const voicePrefetchBothRef = useRef<
    (
      context?: { messages?: InterviewMessage[]; questionCount?: number },
    ) => Promise<void>
  >(async () => {});
  const voiceWaitForSpeechEndRef = useRef<() => Promise<void>>(
    async () => {},
  );
  const voiceHandleUserTurnCompleteRef = useRef<
    (messages: InterviewMessage[]) => Promise<void>
  >(async () => {});
  const voiceGetConnectedPanelistRef = useRef<() => PanelistId | undefined>(
    () => undefined,
  );
  const voiceRequestClosingGoodbyeRef = useRef<() => boolean>(() => false);
  const voiceSpeakAnnouncementRef = useRef<
    (kind: "time_wrap_up") => boolean
  >(() => false);
  const durationWarningSentRef = useRef(false);
  const durationEndTriggeredRef = useRef(false);
  const assistantDedupRef = useRef(createAssistantDedupState());

  const clearPersistedScreenSharing = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.screenSharing) return;
    const updated = { ...current, screenSharing: false };
    sessionRef.current = updated;
    setSession(updated);
    saveSession(updated);
  }, []);

  const stopCameraRealtime = useCallback(() => {
    cameraRealtimeRef.current?.stop();
    cameraRealtimeRef.current = null;
    cameraRealtimeTrackIdRef.current = null;
  }, []);

  const stopScreenRealtime = useCallback(() => {
    screenRealtimeRef.current?.stop();
    screenRealtimeRef.current = null;
    screenRealtimeTrackIdRef.current = null;
  }, []);

  const persistScreenObservation = useCallback((summary: string) => {
    const current = sessionRef.current;
    if (!current) return;
    const observation: ScreenObservation = {
      timestamp: new Date().toISOString(),
      summary,
    };
    const updated: InterviewSession = {
      ...current,
      screenSharing: true,
      screenObservations: [...(current.screenObservations ?? []), observation],
    };
    sessionRef.current = updated;
    setSession(updated);
    saveSession(updated);
  }, []);

  const pushVisionContextToVoice = useCallback(
    (
      summary: string | undefined,
      imageBase64?: string,
      meta?: ScreenContextMeta,
    ): boolean => {
      let imageOk = true;
      if (imageBase64) {
        const source = meta?.contextLabel ?? "screen";
        const pushResult = sendScreenFrameRef.current(
          imageBase64,
          meta?.mimeType ?? "image/jpeg",
          {
            force: meta?.forceImage ?? !meta?.imageOnly,
            source,
          },
        );
        imageOk = !isFramePushFailure(pushResult);
        if (pushResult === "sent" && source === "camera") {
          setCameraVisionPaused(undefined);
        }
      }
      if (summary?.trim()) {
        if (meta?.contextLabel === "camera") {
          setCameraVisionPaused(undefined);
        } else {
          setScreenAnalyzePaused(undefined);
        }
        sendScreenContextRef.current(summary, {
          ...meta,
          contextLabel: meta?.contextLabel ?? "screen",
        });
      }
      return imageOk;
    },
    [],
  );

  const startScreenRealtime = useCallback(
    (video: HTMLVideoElement, track?: MediaStreamTrack) => {
      const trackId = track?.id ?? null;
      screenVideoRef.current = video;
      screenTrackRef.current = track ?? null;

      if (
        screenRealtimeRef.current &&
        screenRealtimeTrackIdRef.current === trackId
      ) {
        return;
      }

      stopScreenRealtime();
      screenRealtimeTrackIdRef.current = trackId;

      const pusher = createScreenRealtimePusher({
        getSource: () => ({
          videoEl: screenVideoRef.current,
          track: screenTrackRef.current,
        }),
        getSessionContext: () => {
          const current = sessionRef.current;
          if (!current?.dbSessionId) return null;
          return {
            dbSessionId: current.dbSessionId,
            roleTitle: current.roleTitle,
            panelistMode: current.panelistMode,
          };
        },
        pushToVoice: pushVisionContextToVoice,
        shouldPushImages: () => realtimeVisionModeRef.current !== "text",
        isPaused: () => !voiceConnectionActiveRef.current,
        onHotError: (message) => setScreenAnalyzePaused(message),
        onArchiveError: (message) => setScreenAnalyzePaused(message),
        onArchiveFrame: async (frames, summary) => {
          const current = sessionRef.current;
          if (!current?.dbSessionId) return;
          if (snapshotCountRef.current >= MAX_SCREEN_SNAPSHOTS) {
            setScreenAnalyzePaused("Snapshot limit reached for this session.");
            stopScreenRealtime();
            return;
          }

          const snapshotResponse = await fetch("/api/media/screen-snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: current.dbSessionId,
              imageBase64: frames.archiveBase64,
              mimeType: frames.archiveMime,
              capturedAt: new Date().toISOString(),
              questionSequence: current.questionCount,
              summary,
            }),
          });

          if (snapshotResponse.ok) {
            persistScreenObservation(summary);
            snapshotCountRef.current += 1;
            setScreenAnalyzePaused(undefined);
          } else if (snapshotResponse.status === 400) {
            setScreenAnalyzePaused("Screen snapshots paused for this session.");
            stopScreenRealtime();
          }
        },
      });

      screenRealtimeRef.current = pusher;
      flushScreenContextRef.current = (options) => pusher.flushNow(options);
      pusher.start();
    },
    [persistScreenObservation, pushVisionContextToVoice, stopScreenRealtime],
  );

  const startCameraRealtime = useCallback(
    (video: HTMLVideoElement, track?: MediaStreamTrack) => {
      const trackId = track?.id ?? null;
      cameraVideoRef.current = video;
      cameraTrackRef.current = track ?? null;

      if (
        cameraRealtimeRef.current &&
        cameraRealtimeTrackIdRef.current === trackId
      ) {
        return;
      }

      stopCameraRealtime();
      cameraRealtimeTrackIdRef.current = trackId;

      const pusher = createScreenRealtimePusher({
        getSource: () => ({
          videoEl: cameraVideoRef.current,
          track: cameraTrackRef.current,
        }),
        getSessionContext: () => {
          const current = sessionRef.current;
          if (!current?.dbSessionId) return null;
          return {
            dbSessionId: current.dbSessionId,
            roleTitle: current.roleTitle,
            panelistMode: current.panelistMode,
          };
        },
        pushToVoice: pushVisionContextToVoice,
        shouldPushImages: () => realtimeVisionModeRef.current !== "text",
        isPaused: () => !voiceConnectionActiveRef.current,
        enableArchive: false,
        visionSource: "camera",
        reportSkippedFrames: false,
        onHotError: (message) => setCameraVisionPaused(message),
        captureRealtimeFrame: captureCameraFrameFromSource,
        capturePrecisionFrame: captureCameraPrecisionFrameFromSource,
        intervalMs: CAMERA_REALTIME_INTERVAL_MS,
      });

      cameraRealtimeRef.current = pusher;
      flushCameraContextRef.current = (options) => pusher.flushNow(options);
      pusher.start();
    },
    [pushVisionContextToVoice, stopCameraRealtime],
  );

  const refreshRecorderTracks = useCallback(async () => {
    if (recorderRefreshInFlightRef.current) return;
    recorderRefreshInFlightRef.current = true;
    try {
      await recorderRef.current?.refreshTracks();
    } finally {
      recorderRefreshInFlightRef.current = false;
    }
  }, []);

  const media = useMediaDevices({
    onScreenShareEnd: clearPersistedScreenSharing,
  });
  const micStreamRef = useRef<MediaStream | null>(null);
  micStreamRef.current = media.micStream;

  const panelistMode: PanelistMode = session?.panelistMode ?? "both";
  const joinPanelist = getPanelistForQuestion(
    session?.questionCount ?? 0,
    panelistMode,
  ).id;

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement, track?: MediaStreamTrack) => {
      if (!media.sharingScreen) return;
      stopCameraRealtime();
      startScreenRealtime(video, track);
      window.setTimeout(() => {
        notifyScreenShareActiveRef.current();
      }, 400);
    },
    [media.sharingScreen, startScreenRealtime, stopCameraRealtime],
  );

  const handleCameraVideoReady = useCallback(
    (video: HTMLVideoElement, track?: MediaStreamTrack) => {
      if (!media.cameraEnabled || media.sharingScreen) return;
      startCameraRealtime(video, track);
      window.setTimeout(() => {
        notifyCameraActiveRef.current();
      }, 400);
    },
    [media.cameraEnabled, media.sharingScreen, startCameraRealtime],
  );

  useEffect(() => {
    if (media.sharingScreen) {
      stopCameraRealtime();
      return;
    }
    if (media.cameraEnabled && cameraVideoRef.current) {
      startCameraRealtime(
        cameraVideoRef.current,
        cameraTrackRef.current ?? undefined,
      );
    } else {
      if (cameraRealtimeRef.current) {
        notifyCameraInactiveRef.current();
      }
      stopCameraRealtime();
      setCameraVisionPaused(undefined);
    }
  }, [
    media.cameraEnabled,
    media.sharingScreen,
    startCameraRealtime,
    stopCameraRealtime,
  ]);

  const prevSharingScreenRef = useRef(media.sharingScreen);
  useEffect(() => {
    if (prevSharingScreenRef.current && !media.sharingScreen) {
      notifyScreenShareEndedRef.current();
    }
    prevSharingScreenRef.current = media.sharingScreen;
  }, [media.sharingScreen]);

  const handleRetryScreenShare = useCallback(async () => {
    const stream = await media.retryScreenShare();
    if (!stream) return;
    const current = sessionRef.current;
    if (current) {
      const updated = { ...current, screenSharing: true };
      sessionRef.current = updated;
      setSession(updated);
      saveSession(updated);
    }
    void refreshRecorderTracks();
  }, [media, refreshRecorderTracks]);

  const clearPendingComplete = useCallback(() => {
    if (pendingCompleteTimerRef.current) {
      clearTimeout(pendingCompleteTimerRef.current);
      pendingCompleteTimerRef.current = null;
    }
    pendingCompleteRef.current = null;
    setFinishingInterview(false);
  }, []);

  const schedulePendingComplete = useCallback((updated: InterviewSession) => {
    pendingCompleteRef.current = updated;
    setFinishingInterview(true);
    if (pendingCompleteTimerRef.current) {
      clearTimeout(pendingCompleteTimerRef.current);
    }
    pendingCompleteTimerRef.current = setTimeout(() => {
      if (!pendingCompleteRef.current) return;
      const pending = pendingCompleteRef.current;
      clearPendingComplete();
      void completeSessionRef.current(pending);
    }, INTERVIEW_COMPLETE_FALLBACK_MS);
  }, [clearPendingComplete]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (
        pendingCompleteRef.current &&
        (event.type === "response.done" ||
          event.type === "response.completed" ||
          event.type === "output_audio_buffer.stopped")
      ) {
        const pending = pendingCompleteRef.current;
        clearPendingComplete();
        void completeSessionRef.current(pending);
        return;
      }

      const current = sessionRef.current;
      const currentSpeaker =
        voiceGetConnectedPanelistRef.current() ??
        joinPanelist;

      const partial = extractPartialDelta(event, currentSpeaker);
      if (partial) {
        setPartialTranscript((previous) => {
          if (previous && previous.role === partial.role) {
            return {
              role: partial.role,
              content: previous.content + partial.content,
              speaker: partial.speaker ?? previous.speaker,
            };
          }
          return partial;
        });
      }

      const message = extractMessageFromRealtimeEvent(event, currentSpeaker);
      if (!message) return;

      setPartialTranscript(undefined);
      if (!current) return;

      if (message.role === "assistant") {
        if (
          !shouldAcceptAssistantTranscriptEvent(
            assistantDedupRef.current,
            event,
            message.content,
            current.messages,
          )
        ) {
          logInterviewDebug("assistant_transcript_deduped", {
            type: event.type,
            responseId: message.responseId,
          });
          return;
        }
      }

      const last = current.messages[current.messages.length - 1];
      if (last?.role === message.role && last.content === message.content) {
        return;
      }

      const { responseId: _responseId, itemId: _itemId, source: _source, ...storedMessage } =
        message;

      const messages = [...current.messages, storedMessage];
      const questionCount =
        message.role === "assistant"
          ? computeQuestionCount(messages)
          : current.questionCount;

      logInterviewDebug("transcript_message", {
        role: message.role,
        questionCount,
        eventType: event.type,
      });

      const lastUserAnswer =
        message.role === "user"
          ? message.content
          : current.messages.filter((item) => item.role === "user").at(-1)
              ?.content;

      const weakSignals =
        message.role === "user"
          ? mergeWeakSignals(
              current.weakSignals,
              detectWeakSignalsFromAnswer(message.content),
            )
          : current.weakSignals;

      const topicsCovered =
        message.role === "assistant" && lastUserAnswer
          ? [
              ...new Set([
                ...current.topicsCovered,
                lastUserAnswer.slice(0, 80),
              ]),
            ].slice(0, 20)
          : current.topicsCovered;

      const updated: InterviewSession = {
        ...current,
        messages,
        questionCount,
        topicsCovered,
        weakSignals,
        inputMode: "voice",
        status: message.role === "assistant" ? "idle" : "listening",
        error: undefined,
      };

      sessionRef.current = updated;
      setSession(updated);
      saveSession(updated);

      if (current.dbSessionId) {
        syncVoiceTranscript({
          sessionId: current.dbSessionId,
          content: message.content,
          role: message.role,
          speaker: message.speaker,
          questionCount,
          topicsCovered,
          weakSignals,
          referencedAnswer:
            message.role === "assistant" && lastUserAnswer
              ? lastUserAnswer.slice(0, 500)
              : undefined,
          status: "active",
        });
      }

      if (message.role === "assistant") {
        const interviewDuration =
          current.interviewDuration ?? DEFAULT_INTERVIEW_DURATION;
        const maxQuestions = getMaxQuestionsForDuration(interviewDuration);
        const lastAssistant = message.content;

        if (
          needsClosingGoodbye(questionCount, lastAssistant, maxQuestions) ||
          needsClosingGoodbyeByTime(elapsedSeconds, lastAssistant, interviewDuration)
        ) {
          voiceRequestClosingGoodbyeRef.current();
          schedulePendingComplete(updated);
          return;
        }

        if (
          shouldScheduleInterviewEnd(questionCount, lastAssistant, maxQuestions) ||
          shouldScheduleInterviewEndByTime(
            elapsedSeconds,
            lastAssistant,
            interviewDuration,
          )
        ) {
          schedulePendingComplete(updated);
          return;
        }

        void voicePrefetchBothRef.current({
          messages: updated.messages,
          questionCount,
        });
        return;
      }

      if (message.role === "user") {
        void voiceHandleUserTurnCompleteRef.current(updated.messages);
      }
    },
    [schedulePendingComplete, clearPendingComplete, joinPanelist, elapsedSeconds],
  );

  const voice = useRealtimeVoice({
    sessionId: session?.dbSessionId,
    roleId: session?.roleId,
    roleTitle: session?.roleTitle,
    questionCount: session?.questionCount,
    panelistMode,
    interviewDuration: session?.interviewDuration ?? DEFAULT_INTERVIEW_DURATION,
    promptContext: session?.promptContext,
    courseId:
      session?.trackMode === "job_description" ? undefined : session?.roleId,
    messages: session?.messages,
    screenReviewEnabled: media.sharingScreen,
    cameraReviewEnabled: media.cameraEnabled && !media.sharingScreen,
    getMicStream: () => micStreamRef.current,
    onEvent: handleRealtimeEvent,
    onBeforeAssistantResponse: async () => {
      const messages = sessionRef.current?.messages ?? [];
      const lastUser = messages
        .filter((message) => message.role === "user")
        .at(-1)?.content;
      const lastAssistant = messages
        .filter((message) => message.role === "assistant")
        .at(-1)?.content;
      const focusQuestion = buildVisualFocusQuestion(
        lastUser,
        lastAssistant,
      );

      if (media.sharingScreen) {
        await flushScreenContextRef.current({ focusQuestion });
        return;
      }
      if (media.cameraEnabled) {
        await flushCameraContextRef.current({ focusQuestion });
      }
    },
  });

  voiceStopRef.current = voice.stop;
  voiceReconnectRef.current = voice.reconnect;
  sendScreenContextRef.current = voice.sendScreenContext;
  sendScreenFrameRef.current = voice.sendScreenFrame;
  notifyScreenShareActiveRef.current = voice.notifyScreenShareActive;
  notifyScreenShareEndedRef.current = voice.notifyScreenShareEnded;
  notifyCameraActiveRef.current = voice.notifyCameraActive;
  notifyCameraInactiveRef.current = voice.notifyCameraInactive;
  realtimeVisionModeRef.current = voice.realtimeVisionMode;
  voiceConnectionActiveRef.current = voice.connectionStatus === "active";

  useEffect(() => {
    realtimeVisionModeRef.current = voice.realtimeVisionMode;
    voiceConnectionActiveRef.current = voice.connectionStatus === "active";
    if (media.sharingScreen && voice.realtimeVisionMode === "text") {
      setScreenAnalyzePaused(
        "Screen vision using text descriptions — image mode unavailable.",
      );
    }
  }, [media.sharingScreen, voice.realtimeVisionMode, voice.connectionStatus]);
  getRemoteAudioRef.current = voice.getRemoteAudioElement;
  voicePrefetchBothRef.current = voice.prefetchBothSessions;
  voiceWaitForSpeechEndRef.current = voice.waitForSpeechEnd;
  voiceHandleUserTurnCompleteRef.current = voice.handleUserTurnComplete;
  voiceGetConnectedPanelistRef.current = voice.getConnectedPanelist;
  voiceRequestClosingGoodbyeRef.current = voice.requestClosingGoodbye;
  voiceSpeakAnnouncementRef.current = voice.speakAnnouncement;

  useEffect(() => {
    const base = sessionRef.current;
    if (!voice.error || !base?.dbSessionId || base.status === "complete") return;
    void fetch(`/api/sessions/${base.dbSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "error", lastError: voice.error }),
      keepalive: true,
    });
  }, [voice.error]);

  const recorder = useSessionRecorder({
    sessionId: session?.dbSessionId,
    micStream: media.micStream,
    getRemoteAudioElement: () => getRemoteAudioRef.current(),
    screenStream: media.screenStream,
    cameraStream: media.cameraStream,
  });
  recorderRef.current = recorder;

  const completeSession = useCallback(
    async (base: InterviewSession) => {
      if (completingRef.current) return;
      completingRef.current = true;
      clearPendingComplete();
      stopScreenRealtime();
      stopCameraRealtime();

      voiceStopRef.current();

      setSavingSession(true);
      setSaveError(undefined);

      const completed: InterviewSession = {
        ...base,
        questionCount: computeQuestionCount(base.messages),
        status: "complete",
        inputMode: "voice",
        screenSharing: false,
      };
      sessionRef.current = completed;
      setSession(completed);
      saveSession(completed);

      if (base.dbSessionId) {
        await flushTranscriptQueue();
        const latest = sessionRef.current ?? completed;
        const questionCount = computeQuestionCount(latest.messages);

        const reconcileResult = await reconcileTranscriptWithServer(
          base.dbSessionId,
          latest.messages,
        );
        if (!reconcileResult.ok || isTranscriptSyncFailing()) {
          setSaveError(
            (!reconcileResult.ok ? reconcileResult.error : undefined) ??
              "Cloud transcript sync is incomplete. Your report may use this device's copy of the interview.",
          );
        }

        if (questionCount !== latest.questionCount) {
          const reconciled = { ...latest, questionCount };
          sessionRef.current = reconciled;
          setSession(reconciled);
          saveSession(reconciled);
        }

        const patchResponse = await fetch(`/api/sessions/${base.dbSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            questionCount,
            topicsCovered: latest.topicsCovered,
            weakSignals: latest.weakSignals,
            completedAt: new Date().toISOString(),
            lastError: null,
          }),
        });
        if (!patchResponse.ok) {
          setSaveError(
            "Could not mark your session complete in the cloud. Your report may still generate from this device.",
          );
        }
      }

      let recordingFailed = false;
      if (base.dbSessionId && recorderRef.current?.supported) {
        if (recorderRef.current?.error) {
          recordingFailed = true;
          void fetch(`/api/sessions/${base.dbSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recordingStatus: "failed" }),
            keepalive: true,
          });
        }
        const uploadResult = await recorderRef.current.stopAndUpload();
        if (uploadResult.kind === "failed") {
          recordingFailed = true;
          void fetch(`/api/sessions/${base.dbSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recordingStatus: "failed" }),
            keepalive: true,
          });
          setSaveError(
            "Your recording could not be uploaded. Your transcript and report are still saved.",
          );
        }
      }

      media.cleanup();

      if (recordingFailed) {
        setSavingSession(false);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      let sessionForReport: InterviewSession = sessionRef.current ?? completed;
      const reportSource = sessionRef.current ?? completed;
      if (
        reportSource.dbSessionId &&
        reportSource.messages.length > 0 &&
        !reportSource.report
      ) {
        try {
          const evaluateResponse = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roleId: reportSource.roleId,
              roleTitle: reportSource.roleTitle,
              messages: reportSource.messages,
              sessionId: reportSource.dbSessionId,
              weakSignals: reportSource.weakSignals,
            }),
          });
          if (evaluateResponse.ok) {
            const report = (await evaluateResponse.json()) as InterviewSession["report"];
            sessionForReport = {
              ...reportSource,
              report: report
                ? { ...report, shareToken: report.shareToken ?? null }
                : undefined,
            };
            sessionRef.current = sessionForReport;
            setSession(sessionForReport);
            saveSession(sessionForReport);
          } else {
            const data = (await evaluateResponse.json().catch(() => ({}))) as {
              error?: string;
            };
            const reportError =
              data.error ??
              "Could not generate your readiness report. Retry from My Rounds.";
            setSaveError(reportError);
            if (reportSource.dbSessionId) {
              void fetch(`/api/sessions/${reportSource.dbSessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lastError: reportError }),
                keepalive: true,
              });
            }
          }
        } catch {
          const reportError =
            "Could not generate your readiness report. Retry from My Rounds.";
          setSaveError(reportError);
          if (reportSource.dbSessionId) {
            void fetch(`/api/sessions/${reportSource.dbSessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lastError: reportError }),
              keepalive: true,
            });
          }
        }
      }

      setSavingSession(false);
      setCompleteBanner(true);
      await new Promise((resolve) =>
        setTimeout(resolve, INTERVIEW_COMPLETE_BANNER_MS),
      );
      router.push(
        reportSource.dbSessionId
          ? `/report?session=${reportSource.dbSessionId}`
          : "/report",
      );
    },
    [clearPendingComplete, media, router, stopScreenRealtime, stopCameraRealtime],
  );
  completeSessionRef.current = completeSession;

  const abandonSession = useCallback(async () => {
    if (completingRef.current || abandoningRef.current) return;
    abandoningRef.current = true;
    clearPendingComplete();
    stopScreenRealtime();
    stopCameraRealtime();

    voiceStopRef.current();
    await recorderRef.current?.stop();

    const base = sessionRef.current;
    if (base?.dbSessionId && base.status !== "complete") {
      void abandonSessionAction(base.dbSessionId).catch(() => undefined);
      void fetch(`/api/sessions/${base.dbSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "abandoned" }),
        keepalive: true,
      });
    }

    clearPersistedScreenSharing();
    media.cleanup();
    router.push("/interview");
  }, [clearPendingComplete, clearPersistedScreenSharing, media, router, stopScreenRealtime, stopCameraRealtime]);

  const endRound = useCallback(() => {
    const base = sessionRef.current;
    if (!base) return;
    void completeSession(base);
  }, [completeSession]);

  const startVoice = useCallback(
    async (panelist?: PanelistId) => {
      if (!sessionRef.current) return;
      const id =
        panelist ??
        getPanelistForQuestion(
          sessionRef.current.questionCount,
          sessionRef.current.panelistMode ?? "both",
        ).id;
      await voice.start(id);
    },
    [voice],
  );

  const handleDurationChange = useCallback((duration: InterviewDuration) => {
    const current = sessionRef.current;
    if (!current) return;
    const updated = { ...current, interviewDuration: duration };
    sessionRef.current = updated;
    setSession(updated);
    saveSession(updated);

    if (current.dbSessionId) {
      void updateSessionMetadataAction(current.dbSessionId, {
        interviewDuration: duration,
      }).catch(() => undefined);
    }
  }, []);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    const stream = await media.requestMic();
    if (!stream) {
      setJoining(false);
      return;
    }

    const current = sessionRef.current;
    const interviewDuration =
      current?.interviewDuration ?? DEFAULT_INTERVIEW_DURATION;

    if (current?.dbSessionId) {
      try {
        await updateSessionMetadataAction(current.dbSessionId, {
          interviewDuration,
        });
      } catch {
        // Continue with client-side duration if persistence fails.
      }
    }

    setPhase("room");
    setJoining(false);
    await media.ensureCamera();
    const panelist = getPanelistForQuestion(
      current?.questionCount ?? 0,
      current?.panelistMode ?? "both",
    ).id;
    await startVoice(panelist);
    await recorderRef.current?.start();
  }, [media, startVoice]);

  useEffect(() => () => clearPendingComplete(), [clearPendingComplete]);

  useEffect(() => {
    setSession(loadSession());
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (session === null) {
      router.replace("/interview");
      return;
    }
    if (!session.dbSessionId) {
      router.replace("/interview");
    }
  }, [router, session, sessionReady]);

  useEffect(() => {
    if (phase !== "room") return;
    if (!media.screenStream && !media.cameraStream) return;
    const delayMs = media.screenStream ? 3000 : 0;
    const timer = window.setTimeout(() => {
      void refreshRecorderTracks();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    phase,
    media.screenStream,
    media.cameraStream,
    refreshRecorderTracks,
  ]);

  useEffect(() => {
    if (phase !== "room") return;
    if (voice.connectionStatus !== "active") return;
    void refreshRecorderTracks();
  }, [phase, voice.connectionStatus, refreshRecorderTracks]);

  useEffect(() => {
    if (phase !== "room") return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "room") return;
    if (pendingCompleteRef.current) return;

    const current = sessionRef.current;
    if (!current) return;

    const interviewDuration =
      current.interviewDuration ?? DEFAULT_INTERVIEW_DURATION;
    const lastAssistant = current.messages
      .filter((message) => message.role === "assistant")
      .at(-1)?.content;

    if (
      shouldWarnDurationWrapUp(elapsedSeconds, interviewDuration) &&
      !durationWarningSentRef.current
    ) {
      durationWarningSentRef.current = true;
      voiceSpeakAnnouncementRef.current("time_wrap_up");
    }

    if (
      !durationEndTriggeredRef.current &&
      (needsClosingGoodbyeByTime(elapsedSeconds, lastAssistant, interviewDuration) ||
        shouldScheduleInterviewEndByTime(
          elapsedSeconds,
          lastAssistant,
          interviewDuration,
        ))
    ) {
      durationEndTriggeredRef.current = true;
      if (
        needsClosingGoodbyeByTime(
          elapsedSeconds,
          lastAssistant,
          interviewDuration,
        )
      ) {
        voiceRequestClosingGoodbyeRef.current();
      }
      schedulePendingComplete(current);
    }
  }, [elapsedSeconds, phase, schedulePendingComplete]);

  useEffect(() => {
    const dbSessionId = session?.dbSessionId;
    if (!dbSessionId) return;

    async function hydrateFromServer() {
      try {
        const response = await fetch(`/api/sessions/${dbSessionId}`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages?: InterviewMessage[];
          questionCount?: number;
          topicsCovered?: string[];
          weakSignals?: string[];
          status?: string;
          lastError?: string | null;
          publicId?: string;
          panelistMode?: PanelistMode;
          interviewDuration?: InterviewDuration;
          snapshotCount?: number;
        };

        if (typeof data.snapshotCount === "number") {
          snapshotCountRef.current = data.snapshotCount;
        }

        if (!data.messages?.length) return;

        if (
          data.status === "active" &&
          data.messages.length > 0 &&
          (sessionRef.current?.messages.length ?? 0) === 0
        ) {
          setCanResumeSession(true);
        }

        if (hydrating.current || (sessionRef.current?.messages.length ?? 0) > 0) {
          return;
        }

        hydrating.current = true;
        setSession((current) => {
          if (!current) return current;
          const clientStatus = mapDbSessionStatusToClient(data.status);
          const hydrated: InterviewSession = {
            ...current,
            messages: data.messages!,
            questionCount: computeQuestionCount(data.messages!),
            topicsCovered: data.topicsCovered ?? current.topicsCovered,
            weakSignals: data.weakSignals ?? current.weakSignals,
            panelistMode: data.panelistMode ?? current.panelistMode,
            interviewDuration:
              data.interviewDuration ?? current.interviewDuration,
            status: clientStatus,
            error:
              clientStatus === "error" && data.lastError
                ? data.lastError
                : clientStatus === "error"
                  ? current.error
                  : undefined,
            publicId: data.publicId ?? current.publicId,
          };
          saveSession(hydrated);
          return hydrated;
        });
      } catch {
        // Keep client-only session when hydration fails.
      }
    }

    void hydrateFromServer();
  }, [session?.dbSessionId]);

  useEffect(() => {
    return onTranscriptSyncStatus(setCloudSyncFailed);
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      if (completingRef.current || abandoningRef.current) return;
      const base = sessionRef.current;
      if (!base?.dbSessionId || base.status === "complete") return;
      abandoningRef.current = true;
      void abandonSessionAction(base.dbSessionId).catch(() => undefined);
      void fetch(`/api/sessions/${base.dbSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "abandoned" }),
        keepalive: true,
      });
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    if (!media.sharingScreen) {
      stopScreenRealtime();
      screenVideoRef.current = null;
      screenTrackRef.current = null;
    }
  }, [media.sharingScreen, stopScreenRealtime]);

  useEffect(() => () => {
    stopScreenRealtime();
    stopCameraRealtime();
  }, [stopScreenRealtime, stopCameraRealtime]);

  const handleResume = useCallback(async () => {
    setJoining(true);
    const stream = await media.requestMic();
    if (!stream) {
      setJoining(false);
      return;
    }
    setCanResumeSession(false);
    setPhase("room");
    setJoining(false);
    await media.ensureCamera();
    const current = sessionRef.current;
    if (!current) return;
    const panelist = getPanelistForQuestion(
      current.questionCount,
      current.panelistMode ?? "both",
    ).id;
    await voiceReconnectRef.current(panelist, current.messages);
    await recorderRef.current?.start();
  }, [media]);

  if (!sessionReady || !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#030303]">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <PreJoinLobby
        roleTitle={session.roleTitle}
        panelistMode={panelistMode}
        selectedDuration={session.interviewDuration ?? DEFAULT_INTERVIEW_DURATION}
        onSelectDuration={handleDurationChange}
        joining={joining}
        error={media.error}
        onJoin={() => void handleJoin()}
        onRetryMic={() => void media.requestMic()}
        canResume={canResumeSession}
        onResume={() => void handleResume()}
      />
    );
  }

  const displayPanelist = voice.connectedPanelist ?? joinPanelist;
  const speakingPanelist =
    voice.voiceState === "speaking" ? displayPanelist : undefined;

  const statusChipLabel =
    completeBanner
      ? "Interview complete — saving your report to My Rounds"
      : finishingInterview
        ? "Finishing interview…"
        : voice.connectionStatus === "reconnecting"
          ? "Reconnecting…"
          : null;

  const stage = media.sharingScreen && media.screenStream ? (
    <ScreenShareStage
      screenStream={media.screenStream}
      activePanelist={displayPanelist}
      speakingPanelist={speakingPanelist}
      panelistMode={panelistMode}
      voiceState={voice.voiceState}
      connecting={voice.connecting}
      handoffPanelist={voice.handoffPanelist}
      screenShareWarning={media.screenShareWarning}
      onRetryScreenShare={() => void handleRetryScreenShare()}
      onVideoReady={handleVideoReady}
    />
  ) : (
    <SpeakerStage
      activePanelist={displayPanelist}
      speakingPanelist={speakingPanelist}
      panelistMode={panelistMode}
      voiceState={voice.voiceState}
      connecting={voice.connecting}
      handoffPanelist={voice.handoffPanelist}
    />
  );

  return (
    <>
      {savingSession ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="rounded-lg border border-border bg-card px-6 py-4 text-center">
            <p className="font-medium">Saving your session…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {saveError ?? "Uploading recording and media"}
            </p>
          </div>
        </div>
      ) : null}
      {completeBanner ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="rounded-lg border border-border bg-card px-6 py-4 text-center">
            <p className="font-medium">
              Interview complete — saving your report to My Rounds
            </p>
          </div>
        </div>
      ) : null}
      <InterviewRoom
      roleTitle={session.roleTitle}
      questionCount={session.questionCount}
      interviewDuration={session.interviewDuration ?? DEFAULT_INTERVIEW_DURATION}
      elapsedSeconds={elapsedSeconds}
      onLeave={() => void abandonSession()}
      statusChip={
        statusChipLabel ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
            {statusChipLabel}
          </span>
        ) : null
      }
      stage={stage}
      selfPreview={
        <SelfPreview
          stream={media.cameraStream}
          visible={media.cameraEnabled}
          onVideoReady={handleCameraVideoReady}
        />
      }
      captions={
        <LiveCaptions
          open={captionsOpen}
          messages={session.messages}
          partialTranscript={partialTranscript}
        />
      }
      controls={
        <MediaControlBar
          muted={media.muted}
          cameraEnabled={media.cameraEnabled}
          sharingScreen={media.sharingScreen}
          captionsOpen={captionsOpen}
          onToggleMic={media.toggleMic}
          onToggleCamera={() => void media.toggleCamera()}
          onToggleScreenShare={() => {
            if (media.sharingScreen) {
              media.stopScreenShare();
              stopScreenRealtime();
            } else {
              void media.startScreenShare().then((stream) => {
                if (!stream) return;
                const current = sessionRef.current;
                if (current) {
                  const updated = { ...current, screenSharing: true };
                  sessionRef.current = updated;
                  setSession(updated);
                  saveSession(updated);
                }
                void refreshRecorderTracks();
              });
            }
          }}
          onToggleCaptions={() => setCaptionsOpen((open) => !open)}
          onEndCall={endRound}
        />
      }
      error={
        cloudSyncFailed ||
        screenAnalyzePaused ||
        cameraVisionPaused ||
        session.status === "error" ||
        session.status === "abandoned" ||
        voice.error ||
        recorder.error ? (
          <div className="space-y-2">
            {cloudSyncFailed ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Cloud sync paused — your transcript is saved on this device.
              </p>
            ) : null}
            {screenAnalyzePaused ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {screenAnalyzePaused}
              </p>
            ) : null}
            {cameraVisionPaused ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {cameraVisionPaused}
              </p>
            ) : null}
            {session.status === "abandoned" ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                This session was abandoned. Start a new Machine Round from the
                interview page.
              </p>
            ) : null}
            {session.status === "error" || voice.error || recorder.error ? (
              <ApiErrorCard
                message={
                  [session.error, voice.error, recorder.error]
                    .filter(Boolean)
                    .join(" ") || "Could not connect voice session."
                }
                onRetry={() => void startVoice()}
                retryLabel="Retry voice"
              />
            ) : null}
          </div>
        ) : null
      }
    />
    </>
  );
}
