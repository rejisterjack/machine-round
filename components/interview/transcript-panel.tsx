"use client";

import { useEffect, useRef } from "react";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { InterviewMessage } from "@/lib/session/interview-store";

type TranscriptPanelProps = {
  messages: InterviewMessage[];
  referencedAnswer?: string;
  partialTranscript?: {
    role: "user" | "assistant";
    content: string;
  };
};

export function TranscriptPanel({
  messages,
  referencedAnswer,
  partialTranscript,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <CodexTerminal
      title="Namaste Machine Round · live session"
      statusLine={
        referencedAnswer
          ? `Adaptive follow-up tied to: "${referencedAnswer}"`
          : undefined
      }
      className="flex min-h-80 flex-col sm:min-h-96"
    >
      <div className="flex min-h-64 flex-1 flex-col sm:min-h-80">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your Namaste Machine Round interviewer will ask the first question
              shortly.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "assistant"
                    ? "nd-message-assistant"
                    : "nd-message-user"
                }
              >
                {message.content}
              </div>
            ))
          )}
          {partialTranscript?.content ? (
            <div
              className={
                partialTranscript.role === "assistant"
                  ? "nd-message-assistant opacity-70"
                  : "nd-message-user opacity-70"
              }
            >
              {partialTranscript.content}
              <span className="ml-1 text-xs text-primary">…</span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>
    </CodexTerminal>
  );
}

export function InterviewerAvatar({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className={cn(status === "thinking" && "ring-2 ring-primary/60")}>
        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">Namaste Machine Round</p>
        <p className="text-xs capitalize text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
