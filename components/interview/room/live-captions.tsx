"use client";

import { useEffect, useRef } from "react";
import { getPanelist } from "@/lib/ai/personas/panelists";
import type { InterviewMessage } from "@/lib/session/interview-store";
import type { PanelistId } from "@/lib/ai/personas/panelists";
import { cn } from "@/lib/utils";

type LiveCaptionsProps = {
  open: boolean;
  messages: InterviewMessage[];
  partialTranscript?: {
    role: "user" | "assistant";
    content: string;
    speaker?: PanelistId;
  };
};

export function LiveCaptions({
  open,
  messages,
  partialTranscript,
}: LiveCaptionsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages, partialTranscript?.content]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-24 z-20 mx-auto max-w-3xl px-4 transition-all duration-300",
        open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-black/75 p-4 text-sm backdrop-blur-md pointer-events-auto">
        {messages.length === 0 && !partialTranscript?.content ? (
          <p className="text-center text-muted-foreground">Live captions will appear here.</p>
        ) : (
          <div className="space-y-3">
            {messages.slice(-6).map((message, index) => (
              <p key={`${message.role}-${index}`}>
                <span className="font-medium text-primary">
                  {message.role === "user"
                    ? "You"
                    : getPanelist(message.speaker ?? "akshay").shortName}
                  :
                </span>{" "}
                <span className="text-foreground/90">{message.content}</span>
              </p>
            ))}
            {partialTranscript?.content ? (
              <p className="opacity-70">
                <span className="font-medium text-primary">
                  {partialTranscript.role === "user"
                    ? "You"
                    : getPanelist(
                        partialTranscript.speaker ?? "akshay",
                      ).shortName}
                  :
                </span>{" "}
                {partialTranscript.content}…
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
