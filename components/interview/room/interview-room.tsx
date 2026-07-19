"use client";

import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import {
  countScoredQuestions,
  getMaxScoredQuestions,
  scoredProgress,
} from "@/lib/ai/question-cap";
import {
  getDurationProfile,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import { ndColors } from "@/lib/design/tokens";

type InterviewRoomProps = {
  roleTitle: string;
  questionCount: number;
  interviewDuration: InterviewDuration;
  elapsedSeconds: number;
  onLeave: () => void;
  stage: ReactNode;
  captions: ReactNode;
  controls: ReactNode;
  selfPreview?: ReactNode;
  statusChip?: ReactNode;
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
  interviewDuration,
  elapsedSeconds,
  onLeave,
  stage,
  captions,
  controls,
  selfPreview,
  statusChip,
  error,
}: InterviewRoomProps) {
  const profile = getDurationProfile(interviewDuration);
  const maxScored = getMaxScoredQuestions(profile.maxQuestions);
  const scored = countScoredQuestions(questionCount);
  const progress = scoredProgress(questionCount, profile.maxQuestions);
  const totalSeconds = profile.minutes * 60;

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ backgroundColor: ndColors.bg }}
    >
      <header className="relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{roleTitle}</p>
          <p className="text-xs text-muted-foreground">
            Q {scored}/{maxScored} · {formatElapsed(elapsedSeconds)} /{" "}
            {formatElapsed(totalSeconds)}
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

      {statusChip ? (
        <div className="absolute left-1/2 top-14 z-40 -translate-x-1/2">
          {statusChip}
        </div>
      ) : null}

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
