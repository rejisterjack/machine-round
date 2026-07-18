"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterviewerAvatar, TranscriptPanel } from "@/components/interview/transcript-panel";
import { VoiceControls } from "@/components/interview/voice-controls";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import {
  loadSession,
  saveSession,
  type InterviewMessage,
  type InterviewSession,
} from "@/lib/session/interview-store";
import { useRealtimeVoice } from "@/hooks/use-realtime-voice";

export default function InterviewSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(() =>
    typeof window !== "undefined" ? loadSession() : null,
  );
  const [input, setInput] = useState("");
  const [referencedAnswer, setReferencedAnswer] = useState<string>();
  const voice = useRealtimeVoice({
    sessionId: session?.dbSessionId,
    roleId: session?.roleId,
    roleTitle: session?.roleTitle,
    questionCount: session?.questionCount,
  });
  const bootstrapped = useRef(false);

  const requestNextQuestion = useCallback(async (
    current: InterviewSession,
    messages: InterviewMessage[],
  ) => {
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

      if (data.done) {
        router.push("/report");
      }
    } catch {
      const errored: InterviewSession = {
        ...current,
        status: "error",
        error: "Could not reach the interviewer. Try again.",
      };
      setSession(errored);
      saveSession(errored);
    }
  }, [router]);

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
    bootstrapped.current = true;
    void requestNextQuestion(session, []);
  }, [router, session, requestNextQuestion]);

  async function handleSend() {
    if (!session || !input.trim() || session.status === "thinking") return;

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
          <InterviewerAvatar status={session.status} />
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
        />

        <VoiceControls
          active={voice.active}
          supported={voice.supported}
          error={voice.error}
          onToggle={() => void voice.toggle()}
        />

        {session.status === "error" ? (
          <div className="nd-course-card border-destructive/40 p-4 text-sm text-destructive">
            {session.error}
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={() => void requestNextQuestion(session, session.messages)}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        <div className="nd-course-card p-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your answer. Voice is optional."
            className="min-h-24 resize-none"
            disabled={session.status === "thinking" || session.status === "complete"}
          />
          <div className="mt-3 flex justify-end gap-3">
            <Button variant="ndGhost" render={<Link href="/interview" />}>
              Change role
            </Button>
            <Button
              variant="ndFilled"
              disabled={!input.trim() || session.status === "thinking"}
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
