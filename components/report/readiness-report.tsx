import { AlertTriangle } from "lucide-react";
import { LazyShareActions } from "@/components/report/lazy-share-actions";
import { WeakTopicsCloud } from "@/components/report/weak-topics-cloud";
import { Progress } from "@/components/ui/progress";
import type { EvaluateResponse } from "@/lib/session/interview-store";
import { scoreRingGradient } from "@/lib/session/score-display";
import { cn } from "@/lib/utils";

type ReadinessReportProps = {
  report: EvaluateResponse & { shareToken?: string | null };
  roleTitle?: string;
  sessionId?: string;
  generatedAt?: string;
  showShareActions?: boolean;
};

function MetricBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export function ReadinessReport({
  report,
  roleTitle,
  sessionId,
  generatedAt,
  showShareActions = true,
}: ReadinessReportProps) {
  return (
    <div className="space-y-6">
      <div className="nd-report-hero nd-course-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="nd-section-heading">Overall readiness</p>
            {roleTitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{roleTitle}</p>
            ) : null}
            {generatedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {new Date(generatedAt).toLocaleString()}
              </p>
            ) : null}
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {report.summary}
            </p>
          </div>
          <div
            className={cn(
              "nd-report-score-ring shrink-0 bg-gradient-to-br",
              scoreRingGradient(report.overallScore),
            )}
          >
            <div className="nd-report-score-inner">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Score
              </span>
              <span className="font-heading text-5xl font-medium text-primary">
                {report.overallScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      <WeakTopicsCloud topics={report.weakTopics ?? []} />

      {report.screenReviewNotes && report.screenReviewNotes.length > 0 ? (
        <div className="nd-course-card p-6">
          <h2 className="font-heading text-lg font-medium">Screen review signals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Observations from when you shared your screen during the interview.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {report.screenReviewNotes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showShareActions ? (
        <LazyShareActions
          shareToken={report.shareToken}
          report={report}
          roleTitle={roleTitle}
          sessionId={sessionId}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.answers.map((answer, index) => (
          <div key={index} className="nd-stat-chip text-left">
            <p className="text-xs text-muted-foreground">Answer {index + 1}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">
              {answer.question}
            </p>
            <div className="mt-3 space-y-2">
              <MetricBar label="Clarity" value={answer.clarity} />
              <MetricBar label="Structure" value={answer.structure} />
            </div>
          </div>
        ))}
      </div>

      {report.answers.map((answer, index) => (
        <div key={`detail-${index}`} className="nd-course-card p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-base font-medium">
              {answer.question}
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Q{index + 1}
            </span>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <p className="rounded-lg bg-secondary/40 p-3 text-muted-foreground">
              {answer.answer}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricBar label="Clarity" value={answer.clarity} />
              <MetricBar label="Structure" value={answer.structure} />
              <MetricBar label="Technical" value={answer.technicalSignal} />
            </div>
            {answer.redFlags.length > 0 ? (
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
            ) : null}
          </div>
        </div>
      ))}

      <div className="nd-course-card p-6">
        <h2 className="font-heading text-lg font-medium">Improvement actions</h2>
        <div className="mt-4 grid gap-3">
          {report.improvements.map((item, index) => (
            <div
              key={item}
              className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-4"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <p className="text-sm text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
