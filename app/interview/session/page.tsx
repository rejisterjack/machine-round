"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PanelistAvatarRow,
  TranscriptPanel,
} from "@/components/interview/transcript-panel";
import { VoiceControls } from "@/components/interview/voice-controls";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  getPanelistForQuestion,
  type PanelistId,
} from "@/lib/ai/personas/panelists";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import {
  loadSession,
  saveSession,
  type InterviewMessage,
  type InterviewSession,
} from "@/lib/session/interview-store";
import { useRealtimeVoice } from "@/hooks/use-realtime-voice";
import type { RealtimeEvent } from "@/lib/voice/realtime-webrtc";
import {
  extractMessageFromRealtimeEvent,
  extractPartialDelta,
  syncVoiceTranscript,
} from "@/lib/voice/realtime-transcript";

export default function InterviewSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(() =>
    typeof window !== "undefined" ? loadSession() : null,
  );
  const [input, setInput] = useState("");
  const [referencedAnswer, setReferencedAnswer] = useState<string>();
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState<{
    role: "user" | "assistant";
    content: string;
    speaker?: PanelistId;
  }>();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const voiceStopRef = useRef<() => void>(() => {});
  const voiceModeEnabledRef = useRef(voiceModeEnabled);
  voiceModeEnabledRef.current = voiceModeEnabled;

  const activePanelist =
    getPanelistForQuestion(session?.questionCount ?? 0).id;

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    const current = sessionRef.current;
    const currentSpeaker = current
      ? getPanelistForQuestion(current.questionCount).id
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

    const updated: InterviewSession = {
      ...current,
      messages,
      questionCount,
      inputMode: "voice",
      status: message.role === "assistant" ? "idle" : "listening",
    };

    sessionRef.current = updated;
    setSession(updated);
    saveSession(updated);

    if (message.role === "user" && current.dbSessionId) {
      void syncVoiceTranscript(current.dbSessionId, message.content);
    }

    if (message.role === "assistant") {
      voiceStopRef.current();
      if (questionCount >= MAX_QUESTIONS) {
        const completed: InterviewSession = {
          ...updated,
          status: "complete",
        };
        sessionRef.current = completed;
        setSession(completed);
        saveSession(completed);
        router.push("/report");
      }
    }
  }, [router]);

  const voice = useRealtimeVoice({
    sessionId: session?.dbSessionId,
    roleId: session?.roleId,
    roleTitle: session?.roleTitle,
    questionCount: session?.questionCount,
    activePanelist,
    messages: session?.messages,
    onEvent: handleRealtimeEvent,
  });
  voiceStopRef.current = voice.stop;
  const bootstrapped = useRef(false);
  const hydrating = useRef(false);
  const interviewRetryCount = useRef(0);

  const endRound = useCallback(
    (current?: InterviewSession) => {
      const base = current ?? session;
      if (!base) return;
      voiceStopRef.current();
      setVoiceModeEnabled(false);
      const completed: InterviewSession = {
        ...base,
        status: "complete",
        inputMode: voiceModeEnabledRef.current ? "voice" : base.inputMode,
      };
      setSession(completed);
      saveSession(completed);
      router.push("/report");
    },
    [router, session],
  );

  const requestNextQuestion = useCallback(async (
    current: InterviewSession,
    messages: InterviewMessage[],
  ) => {
    if (current.questionCount >= MAX_QUESTIONS) {
      endRound(current);
      return;
    }
    const nextSession = { ...current, status: "thinking" as const, error: undefined };
    setSession(nextSession);
    saveSession(nextSession);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: current.roleId,
          roleTitle: current.roleTitle,
          messages,
          questionCount: current.questionCount,
          sessionId: current.dbSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Interview request failed.");
      }

      const data = await response.json();
      const assistantMessage: InterviewMessage = {
        role: "assistant",
        content: data.message,
        speaker: data.speaker,
      };
      const updatedMessages = [...messages, assistantMessage];
      const updatedSession: InterviewSession = {
        ...current,
        messages: updatedMessages,
        questionCount: current.questionCount + 1,
        topicsCovered: data.topicsCovered ?? current.topicsCovered,
        weakSignals: data.weakSignals ?? current.weakSignals,
        status: data.done ? "complete" : "idle",
      };

      setReferencedAnswer(data.referencedAnswer);
      setSession(updatedSession);
      saveSession(updatedSession);
      interviewRetryCount.current = 0;

      if (data.done) {
        router.push("/report");
      }
    } catch {
      if (interviewRetryCount.current < 1) {
        interviewRetryCount.current += 1;
        void requestNextQuestion(current, messages);
        return;
      }

      const errored: InterviewSession = {
        ...current,
        status: "error",
        error: "Could not reach the panel. Try again.",
      };
      setSession(errored);
      saveSession(errored);
    }
  }, [router, endRound]);

  async function continueVoicePanel(
    current: InterviewSession,
    messages: InterviewMessage[],
  ) {
    if (current.questionCount >= MAX_QUESTIONS) {
      endRound({ ...current, messages });
      return;
    }

    const nextPanelist = getPanelistForQuestion(current.questionCount).id;
    sessionRef.current = { ...current, messages };
    await voice.reconnect(nextPanelist, messages);
  }

  useEffect(() => {
    const dbSessionId = session?.dbSessionId;
    if (!dbSessionId || (session?.messages.length ?? 0) > 0 || hydrating.current) {
      return;
    }

    hydrating.current = true;

    async function hydrateSession() {
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
        };

        if (!data.messages?.length) return;

        setSession((current) => {
          if (!current) return current;
          const hydrated: InterviewSession = {
            ...current,
            messages: data.messages!,
            questionCount: data.questionCount ?? current.questionCount,
            topicsCovered: data.topicsCovered ?? current.topicsCovered,
            weakSignals: data.weakSignals ?? current.weakSignals,
            status: data.status === "completed" ? "complete" : "idle",
            publicId: data.publicId ?? current.publicId,
          };
          saveSession(hydrated);
          bootstrapped.current = true;
          return hydrated;
        });
      } catch {
        // Keep client-only session when hydration fails.
      }
    }

    void hydrateSession();
  }, [session?.dbSessionId, session?.messages.length]);

  useEffect(() => {
    if (!session?.dbSessionId) return;

    const markAbandoned = () => {
      if (session.status === "complete") return;
      void fetch(`/api/sessions/${session.dbSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "abandoned" }),
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", markAbandoned);
    return () => window.removeEventListener("beforeunload", markAbandoned);
  }, [session?.dbSessionId, session?.status]);

  useEffect(() => {
    if (session === null) {
      router.replace("/interview");
      return;
    }
    if (bootstrapped.current || session.messages.length > 0) return;
    if (voiceModeEnabled || voice.active) return;
    bootstrapped.current = true;
    void requestNextQuestion(session, []);
  }, [router, session, requestNextQuestion, voice.active, voiceModeEnabled]);

  async function handleVoiceToggle() {
    if (voice.active || voice.connecting) {
      voice.stop();
      setVoiceModeEnabled(false);
      return;
    }

    const current = sessionRef.current;
    if (!current) return;

    setVoiceModeEnabled(true);
    const panelist = getPanelistForQuestion(current.questionCount).id;
    await voice.start(panelist);
  }

  async function handleSend() {
    if (!session || !input.trim() || session.status === "thinking") return;
    if (session.questionCount >= MAX_QUESTIONS) {
      endRound();
      return;
    }

    const userMessage: InterviewMessage = { role: "user", content: input.trim() };
    const messages = [...session.messages, userMessage];
    const updated: InterviewSession = {
      ...session,
      messages,
      status: "idle",
      error: undefined,
    };
    setSession(updated);
    saveSession(updated);
    setInput("");

    if (voiceModeEnabled) {
      sessionRef.current = updated;
      await continueVoicePanel(updated, messages);
      return;
    }

    await requestNextQuestion(updated, messages);
  }

  if (!session) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </PageShell>
    );
  }

  const progressValue = (session.questionCount / MAX_QUESTIONS) * 100;
  const atQuestionCap = session.questionCount >= MAX_QUESTIONS;
  const voiceModeActive = voiceModeEnabled;
  const canSend =
    !atQuestionCap &&
    session.status !== "thinking" &&
    session.status !== "complete" &&
    (!voiceModeActive || !voice.active);
  const displayPanelist = voice.activePanelist ?? activePanelist;
  const avatarStatus = voiceModeActive && voice.active
    ? voice.voiceState === "speaking"
      ? "thinking"
      : voice.voiceState === "listening"
        ? "listening"
        : session.status
    : session.status;

  return (
    <PageShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Breadcrumb
          items={[
            { label: "Choose track", href: "/interview" },
            { label: "Live session" },
          ]}
        />
        <p className="nd-section-heading">Live session</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PanelistAvatarRow
            status={avatarStatus}
            activePanelist={displayPanelist}
          />
          <div className="min-w-0 flex-1 sm:min-w-48">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{session.roleTitle}</span>
              <span>
                Q {session.questionCount}/{MAX_QUESTIONS}
              </span>
            </div>
            <Progress value={progressValue} />
          </div>
        </div>

        <TranscriptPanel
          messages={session.messages}
          referencedAnswer={referencedAnswer}
          activePanelist={displayPanelist}
          partialTranscript={partialTranscript}
        />

        <VoiceControls
          active={voiceModeEnabled}
          connecting={voice.connecting}
          handoffPanelist={voice.handoffPanelist}
          voiceState={voice.voiceState}
          activePanelist={displayPanelist}
          supported={voice.supported}
          error={voice.error}
          onToggle={() => void handleVoiceToggle()}
        />

        {session.status === "error" ? (
          <ApiErrorCard
            message={session.error ?? "Could not reach the panel."}
            onRetry={() => {
              interviewRetryCount.current = 0;
              void requestNextQuestion(session, session.messages);
            }}
            retryLabel="Retry"
          />
        ) : null}

        <div className="nd-course-card p-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              voiceModeActive && voice.active
                ? "Panelist is speaking… type your answer once they finish."
                : voiceModeActive
                  ? "Type your answer — the next panelist will speak it aloud."
                  : atQuestionCap
                    ? "Question limit reached. End the round to view your report."
                    : "Type your answer. Toggle voice to hear Akshay & Archy."
            }
            className="min-h-24 resize-none"
            disabled={!canSend}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <Button variant="ndGhost" render={<Link href="/interview" />}>
              Change role
            </Button>
            {atQuestionCap || session.messages.some((m) => m.role === "user") ? (
              <Button variant="ndPrimary" onClick={() => endRound()}>
                End round
              </Button>
            ) : null}
            <Button
              variant="ndFilled"
              disabled={!input.trim() || !canSend}
              onClick={() => void handleSend()}
            >
              {session.status === "thinking" ? "Thinking..." : "Send answer"}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
