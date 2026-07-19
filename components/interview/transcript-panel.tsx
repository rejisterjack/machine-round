"use client";

import { useEffect, useRef } from "react";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import { cn } from "@/lib/utils";
import {
  getPanelist,
  PANELIST_ORDER,
  type PanelistId,
} from "@/lib/ai/personas/panelists";
import type { InterviewMessage } from "@/lib/session/interview-store";

type TranscriptPanelProps = {
  messages: InterviewMessage[];
  referencedAnswer?: string;
  activePanelist?: PanelistId;
  partialTranscript?: {
    role: "user" | "assistant";
    content: string;
    speaker?: PanelistId;
  };
};

function PanelistBubble({
  message,
}: {
  message: InterviewMessage;
}) {
  const speakerId = message.speaker ?? "akshay";
  const panelist = getPanelist(speakerId);

  return (
    <div className="flex gap-3">
      <PanelistAvatar panelistId={speakerId} className="size-8" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {panelist.name}
        </p>
        <div className="nd-message-assistant">{message.content}</div>
      </div>
    </div>
  );
}

export function TranscriptPanel({
  messages,
  referencedAnswer,
  activePanelist,
  partialTranscript,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partialTranscript?.content]);

  return (
    <CodexTerminal
      title="Namaste Machine Round · live panel"
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
              Akshay Saini and Archy Gupta will open the panel shortly.
            </p>
          ) : (
            messages.map((message, index) =>
              message.role === "assistant" ? (
                <PanelistBubble key={`${message.role}-${index}`} message={message} />
              ) : (
                <div key={`${message.role}-${index}`} className="nd-message-user">
                  {message.content}
                </div>
              ),
            )
          )}
          {partialTranscript?.content ? (
            partialTranscript.role === "assistant" ? (
              <div className="flex gap-3 opacity-70">
                <PanelistAvatar
                  panelistId={
                    partialTranscript.speaker ?? activePanelist ?? "akshay"
                  }
                  className="size-8"
                />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {
                      getPanelist(
                        partialTranscript.speaker ?? activePanelist ?? "akshay",
                      ).name
                    }
                  </p>
                  <div className="nd-message-assistant">
                    {partialTranscript.content}
                    <span className="ml-1 text-xs text-primary">…</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nd-message-user opacity-70">
                {partialTranscript.content}
                <span className="ml-1 text-xs text-primary">…</span>
              </div>
            )
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>
    </CodexTerminal>
  );
}

type PanelistAvatarRowProps = {
  status: string;
  activePanelist?: PanelistId;
};

export function PanelistAvatarRow({
  status,
  activePanelist = "akshay",
}: PanelistAvatarRowProps) {
  return (
    <div className="flex items-center gap-4">
      {PANELIST_ORDER.map((id) => {
        const panelist = getPanelist(id);
        const isActive = id === activePanelist;
        return (
          <div key={id} className="flex items-center gap-2">
            <PanelistAvatar
              panelistId={id}
              className={cn(
                "size-10 transition-all",
                isActive && status === "thinking" && "ring-2 ring-primary/60",
                isActive && "ring-2 ring-primary/30",
                !isActive && "opacity-50",
              )}
            />
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{panelist.shortName}</p>
              {isActive ? (
                <p className="text-xs capitalize text-muted-foreground">{status}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** @deprecated Use PanelistAvatarRow */
export function InterviewerAvatar({
  status,
  activePanelist,
}: PanelistAvatarRowProps) {
  return (
    <PanelistAvatarRow status={status} activePanelist={activePanelist} />
  );
}
