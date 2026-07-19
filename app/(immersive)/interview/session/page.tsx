"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterviewRoom } from "@/components/interview/room/interview-room";
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
import { startScreenSampler as startScreenSamplerLib } from "@/lib/interview/screen-capture";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import { shouldEndInterview } from "@/lib/ai/question-cap";
import { MAX_SCREEN_SNAPSHOTS } from "@/lib/session/session-limits";
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
import {
  detectWeakSignalsFromAnswer,
  mergeWeakSignals,
} from "@/lib/voice/weak-signal-heuristics";

type RoomPhase = "lobby" | "room";

export default function InterviewSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(() =>
    typeof window !== "undefined" ? loadSession() : null,
  );
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
  const [canResumeSession, setCanResumeSession] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const voiceStopRef = useRef<() => void>(() => {});
  const voiceReconnectRef = useRef<
    (panelist: PanelistId, messages?: InterviewMessage[]) => Promise<unknown>
  >(async () => null);
  const sendScreenContextRef = useRef<(summary: string) => void>(() => {});
  const getRemoteAudioRef = useRef<() => HTMLAudioElement | null>(() => null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const stopSamplerRef = useRef<(() => void) | null>(null);
  const snapshotCountRef = useRef(0);
  const analyzeInFlightRef = useRef(false);
  const bindScreenSamplerRef = useRef<(video: HTMLVideoElement) => void>(() => {});
  const recorderRefreshInFlightRef = useRef(false);
  const recorderRef = useRef<ReturnType<typeof useSessionRecorder> | null>(null);
  const hydrating = useRef(false);
  const completingRef = useRef(false);
  const pendingCompleteRef = useRef<InterviewSession | null>(null);
  const pendingCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const completeSessionRef = useRef<(base: InterviewSession) => Promise<void>>(
    async () => {},
  );
  const voicePrefetchRef = useRef<(panelist: PanelistId) => Promise<void>>(
    async () => {},
  );
  const voiceWaitForSpeechEndRef = useRef<() => Promise<void>>(
    async () => {},
  );

  const clearPersistedScreenSharing = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.screenSharing) return;
    const updated = { ...current, screenSharing: false };
    sessionRef.current = updated;
    setSession(updated);
    saveSession(updated);
  }, []);

  const stopScreenSampler = useCallback(() => {
    stopSamplerRef.current?.();
    stopSamplerRef.current = null;
  }, []);

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
  const activePanelist = getPanelistForQuestion(
    session?.questionCount ?? 0,
    panelistMode,
  ).id;

  const continueVoicePanel = useCallback(
    async (current: InterviewSession, messages: InterviewMessage[]) => {
      if (shouldEndInterview(current.questionCount)) return;
      const nextPanelist = getPanelistForQuestion(
        current.questionCount,
        current.panelistMode ?? "both",
      ).id;
      sessionRef.current = { ...current, messages };
      await voiceReconnectRef.current(nextPanelist, messages);
    },
    [],
  );

  const appendScreenObservation = useCallback((summary: string) => {
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
    sendScreenContextRef.current(summary);
  }, []);

  const bindScreenSampler = useCallback(
    (video: HTMLVideoElement) => {
      stopScreenSampler();
      stopSamplerRef.current = startScreenSamplerLib(video, async (frames) => {
        const current = sessionRef.current;
        if (!current?.dbSessionId) return;
        if (analyzeInFlightRef.current) return;
        if (snapshotCountRef.current >= MAX_SCREEN_SNAPSHOTS) {
          setScreenAnalyzePaused("Snapshot limit reached for this session.");
          stopScreenSampler();
          return;
        }

        analyzeInFlightRef.current = true;
        try {
          const response = await fetch("/api/interview/screen-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: current.dbSessionId,
              imageBase64: frames.analysisBase64,
              roleTitle: current.roleTitle,
              panelistMode: current.panelistMode,
              priorSummary:
                current.screenObservations?.at(-1)?.summary ?? undefined,
            }),
          });

          if (!response.ok) {
            try {
              const errData = (await response.json()) as { reason?: string };
              if (errData.reason === "capacity") {
                setScreenAnalyzePaused(
                  "Screen analysis paused — capacity limit reached.",
                );
                stopScreenSampler();
              } else if (response.status === 429) {
                setScreenAnalyzePaused(
                  "Screen analysis paused — rate limit. Will retry on the next frame.",
                );
              } else {
                setScreenAnalyzePaused(
                  "Screen analysis paused — temporary error.",
                );
              }
            } catch {
              setScreenAnalyzePaused("Screen analysis paused.");
            }
            return;
          }

          setScreenAnalyzePaused(undefined);

          const data = (await response.json()) as {
            summary?: string;
            observationStored?: boolean;
            reason?: string;
          };
          if (data.reason === "capacity") {
            setScreenAnalyzePaused(
              "Screen analysis paused — session snapshot cap reached.",
            );
            stopScreenSampler();
            return;
          }
          if (!data.summary) return;

          setScreenAnalyzePaused(undefined);

          if (data.observationStored === false) {
            sendScreenContextRef.current(data.summary);
          } else {
            appendScreenObservation(data.summary);
          }

          if (snapshotCountRef.current >= MAX_SCREEN_SNAPSHOTS) return;

          const snapshotResponse = await fetch("/api/media/screen-snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: current.dbSessionId,
              imageBase64: frames.archiveBase64,
              mimeType: frames.archiveMime,
              capturedAt: new Date().toISOString(),
              questionSequence: current.questionCount,
              summary: data.summary,
            }),
          });

          if (snapshotResponse.ok) {
            snapshotCountRef.current += 1;
          } else if (snapshotResponse.status === 400) {
            setScreenAnalyzePaused("Screen snapshots paused for this session.");
            stopScreenSampler();
          }
        } catch {
          setScreenAnalyzePaused(
            "Screen analysis paused — will retry on the next frame.",
          );
        } finally {
          analyzeInFlightRef.current = false;
        }
      });
    },
    [appendScreenObservation, stopScreenSampler],
  );
  bindScreenSamplerRef.current = bindScreenSampler;

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    screenVideoRef.current = video;
    bindScreenSamplerRef.current(video);
  }, []);

  const clearPendingComplete = useCallback(() => {
    if (pendingCompleteTimerRef.current) {
      clearTimeout(pendingCompleteTimerRef.current);
      pendingCompleteTimerRef.current = null;
    }
    pendingCompleteRef.current = null;
  }, []);

  const schedulePendingComplete = useCallback((updated: InterviewSession) => {
    pendingCompleteRef.current = updated;
    if (pendingCompleteTimerRef.current) {
      clearTimeout(pendingCompleteTimerRef.current);
    }
    pendingCompleteTimerRef.current = setTimeout(() => {
      if (!pendingCompleteRef.current) return;
      const pending = pendingCompleteRef.current;
      clearPendingComplete();
      void completeSessionRef.current(pending);
    }, 30_000);
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
      const currentSpeaker = current
        ? getPanelistForQuestion(
            current.questionCount,
            current.panelistMode ?? "both",
          ).id
        : "akshay";

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

      const last = current.messages[current.messages.length - 1];
      if (last?.role === message.role && last.content === message.content) {
        return;
      }

      const messages = [...current.messages, message];
      const questionCount =
        message.role === "assistant"
          ? current.questionCount + 1
          : current.questionCount;

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
        if (shouldEndInterview(questionCount)) {
          schedulePendingComplete(updated);
          return;
        }

        const nextPanelist = getPanelistForQuestion(
          questionCount,
          updated.panelistMode ?? "both",
        ).id;
        void voicePrefetchRef.current(nextPanelist);
        return;
      }

      if (questionCount < MAX_QUESTIONS && !shouldEndInterview(questionCount)) {
        void continueVoicePanel(updated, messages);
      }
    },
    [continueVoicePanel, schedulePendingComplete, clearPendingComplete],
  );

  const voice = useRealtimeVoice({
    sessionId: session?.dbSessionId,
    roleId: session?.roleId,
    roleTitle: session?.roleTitle,
    questionCount: session?.questionCount,
    panelistMode,
    activePanelist,
    messages: session?.messages,
    screenReviewEnabled: media.sharingScreen,
    getMicStream: () => micStreamRef.current,
    onEvent: handleRealtimeEvent,
  });

  voiceStopRef.current = voice.stop;
  voiceReconnectRef.current = voice.reconnect;
  sendScreenContextRef.current = voice.sendScreenContext;
  getRemoteAudioRef.current = voice.getRemoteAudioElement;
  voicePrefetchRef.current = voice.prefetchSession;
  voiceWaitForSpeechEndRef.current = voice.waitForSpeechEnd;

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
      stopScreenSampler();

      setSavingSession(true);
      setSaveError(undefined);

      const completed: InterviewSession = {
        ...base,
        status: "complete",
        inputMode: "voice",
        screenSharing: false,
      };
      sessionRef.current = completed;
      setSession(completed);
      saveSession(completed);

      await voiceWaitForSpeechEndRef.current();
      voiceStopRef.current();

      if (base.dbSessionId) {
        await flushTranscriptQueue();
        const patchResponse = await fetch(`/api/sessions/${base.dbSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            questionCount: base.questionCount,
            topicsCovered: base.topicsCovered,
            weakSignals: base.weakSignals,
            completedAt: new Date().toISOString(),
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
        const uploadResult = await recorderRef.current.stopAndUpload();
        if (uploadResult.kind === "failed") {
          recordingFailed = true;
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

      setSavingSession(false);
      router.push("/report");
    },
    [clearPendingComplete, media, router, stopScreenSampler],
  );
  completeSessionRef.current = completeSession;

  const abandonSession = useCallback(async () => {
    if (completingRef.current) return;
    clearPendingComplete();
    stopScreenSampler();

    voiceStopRef.current();
    await recorderRef.current?.stop();

    const base = sessionRef.current;
    if (base?.dbSessionId && base.status !== "complete") {
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
  }, [clearPendingComplete, clearPersistedScreenSharing, media, router, stopScreenSampler]);

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

  const handleJoin = useCallback(async () => {
    setJoining(true);
    const stream = await media.requestMic();
    if (!stream) {
      setJoining(false);
      return;
    }
    setPhase("room");
    setJoining(false);
    const current = sessionRef.current;
    const panelist = getPanelistForQuestion(
      current?.questionCount ?? 0,
      current?.panelistMode ?? "both",
    ).id;
    await startVoice(panelist);
    await recorderRef.current?.start();
  }, [media, startVoice]);

  useEffect(() => () => clearPendingComplete(), [clearPendingComplete]);

  useEffect(() => {
    if (session === null) {
      router.replace("/interview");
      return;
    }
    if (!session.dbSessionId) {
      router.replace("/interview");
    }
  }, [router, session]);

  useEffect(() => {
    if (phase !== "room") return;
    const shouldRefreshRecorder =
      voice.connectionState === "active" ||
      media.sharingScreen ||
      media.cameraEnabled;
    if (!shouldRefreshRecorder) return;
    void refreshRecorderTracks();
  }, [
    phase,
    voice.connectionState,
    media.sharingScreen,
    media.cameraEnabled,
    media.screenStream,
    media.cameraStream,
    refreshRecorderTracks,
  ]);

  useEffect(() => {
    if (phase !== "room") return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

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
          publicId?: string;
          panelistMode?: PanelistMode;
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
          const hydrated: InterviewSession = {
            ...current,
            messages: data.messages!,
            questionCount: data.questionCount ?? current.questionCount,
            topicsCovered: data.topicsCovered ?? current.topicsCovered,
            weakSignals: data.weakSignals ?? current.weakSignals,
            panelistMode: data.panelistMode ?? current.panelistMode,
            status: data.status === "completed" ? "complete" : "idle",
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
    if (!media.sharingScreen) {
      stopScreenSampler();
      screenVideoRef.current = null;
    }
  }, [media.sharingScreen, stopScreenSampler]);

  useEffect(() => () => {
    stopScreenSampler();
  }, [stopScreenSampler]);

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
    const current = sessionRef.current;
    if (!current) return;
    const panelist = getPanelistForQuestion(
      current.questionCount,
      current.panelistMode ?? "both",
    ).id;
    await voiceReconnectRef.current(panelist, current.messages);
    await recorderRef.current?.start();
  }, [media]);

  if (!session) {
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
        joining={joining}
        error={media.error}
        onJoin={() => void handleJoin()}
        onRetryMic={() => void media.requestMic()}
        canResume={canResumeSession}
        onResume={() => void handleResume()}
      />
    );
  }

  const displayPanelist = voice.activePanelist ?? activePanelist;

  const stage = media.sharingScreen && media.screenStream ? (
    <ScreenShareStage
      screenStream={media.screenStream}
      activePanelist={displayPanelist}
      panelistMode={panelistMode}
      voiceState={voice.voiceState}
      connecting={voice.connecting}
      handoffPanelist={voice.handoffPanelist}
      onVideoReady={handleVideoReady}
    />
  ) : (
    <SpeakerStage
      activePanelist={displayPanelist}
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
      <InterviewRoom
      roleTitle={session.roleTitle}
      questionCount={session.questionCount}
      elapsedSeconds={elapsedSeconds}
      onLeave={() => void abandonSession()}
      stage={stage}
      selfPreview={
        <SelfPreview stream={media.cameraStream} visible={media.cameraEnabled} />
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
              stopScreenSampler();
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
        session.status === "error" ||
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
