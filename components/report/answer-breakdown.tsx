"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, MessageSquareQuote } from "lucide-react";
import { ReportMetricBar } from "@/components/report/report-metric-bar";
import {
  answerCompositeScore,
  scoreBadgeClass,
} from "@/lib/session/score-display";
import type { EvaluateResponse } from "@/lib/session/interview-store";
import { cn } from "@/lib/utils";

type AnswerBreakdownProps = {
  answers: EvaluateResponse["answers"];
};

export function AnswerBreakdown({ answers }: AnswerBreakdownProps) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="answers" className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-medium">Per-answer breakdown</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Expand each question to see your transcript, scores, and flags an AI
          screener would likely catch.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {answers.map((answer, index) => {
          const composite = answerCompositeScore(answer);

          return (
            <button
              key={`overview-${index}`}
              type="button"
              onClick={() => {
                setOpenIndex(index);
                document
                  .getElementById(`answer-detail-${index}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="nd-report-answer-card p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answer {index + 1}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    scoreBadgeClass(composite),
                  )}
                >
                  {composite}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
                {answer.question}
              </p>
              <div className="mt-3 space-y-2">
                <ReportMetricBar label="Clarity" value={answer.clarity} compact />
                <ReportMetricBar
                  label="Structure"
                  value={answer.structure}
                  compact
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {answers.map((answer, index) => {
          const composite = answerCompositeScore(answer);
          const isOpen = openIndex === index;

          return (
            <article
              key={`detail-${index}`}
              id={`answer-detail-${index}`}
              className="nd-report-answer-card scroll-mt-28"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 p-5 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Q{index + 1}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                        scoreBadgeClass(composite),
                      )}
                    >
                      {composite}/100
                    </span>
                    {answer.redFlags.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3" />
                        {answer.redFlags.length} flag
                        {answer.redFlags.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-heading text-base font-medium leading-snug">
                    {answer.question}
                  </h3>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-border px-5 pb-5 pt-4 text-sm">
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <MessageSquareQuote className="size-3.5 text-primary" />
                      Your answer
                    </div>
                    <p className="leading-relaxed text-muted-foreground">
                      {answer.answer}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReportMetricBar label="Clarity" value={answer.clarity} />
                    <ReportMetricBar
                      label="Structure"
                      value={answer.structure}
                    />
                    <ReportMetricBar
                      label="Technical"
                      value={answer.technicalSignal}
                    />
                  </div>

                  {answer.redFlags.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-destructive/90">
                        AI screener flags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {answer.redFlags.map((flag) => (
                          <span
                            key={flag}
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive"
                          >
                            <AlertTriangle className="size-3" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400/90">
                      No major red flags on this answer.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
