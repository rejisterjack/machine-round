"use client";

import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { ndColors } from "@/lib/design/tokens";
import {
  countScoredQuestions,
  MAX_SCORED_QUESTIONS,
} from "@/lib/ai/question-cap";

type InterviewRoomProps = {
  roleTitle: string;
  questionCount: number;
  elapsedSeconds: number;
  onLeave: () => void;
  stage: ReactNode;
  captions: ReactNode;
  controls: ReactNode;
  selfPreview?: ReactNode;
  error?: ReactNode;
};

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function InterviewRoom({
  roleTitle,
  questionCount,
  elapsedSeconds,
  onLeave,
  stage,
  captions,
  controls,
  selfPreview,
  error,
}: InterviewRoomProps) {
  const scored = countScoredQuestions(questionCount);
  const progress = (scored / MAX_SCORED_QUESTIONS) * 100;

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ backgroundColor: ndColors.bg }}
    >
      <header className="relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{roleTitle}</p>
          <p className="text-xs text-muted-foreground">
            Q {scored}/{MAX_SCORED_QUESTIONS} · {formatElapsed(elapsedSeconds)}
          </p>
        </div>
        <div className="hidden w-32 sm:block">
          <Progress value={progress} className="h-1.5" />
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Leave
        </button>
      </header>

      <div className="relative min-h-0 flex-1">{stage}</div>

      {selfPreview}
      {captions}
      {controls}
      {error ? (
        <div className="absolute left-4 right-4 top-16 z-50">{error}</div>
      ) : null}
    </div>
  );
}
