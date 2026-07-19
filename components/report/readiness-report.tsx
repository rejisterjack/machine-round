import { Monitor, Target } from "lucide-react";
import { AnswerBreakdown } from "@/components/report/answer-breakdown";
import { LazyShareActions } from "@/components/report/lazy-share-actions";
import { ReportHero } from "@/components/report/report-hero";
import { ReportSectionNav } from "@/components/report/report-section-nav";
import { ReportStatsRow } from "@/components/report/report-stats-row";
import { WeakTopicsCloud } from "@/components/report/weak-topics-cloud";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type ReadinessReportProps = {
  report: EvaluateResponse & { shareToken?: string | null };
  roleTitle?: string;
  sessionId?: string;
  generatedAt?: string;
  showShareActions?: boolean;
};

export function ReadinessReport({
  report,
  roleTitle,
  sessionId,
  generatedAt,
  showShareActions = true,
}: ReadinessReportProps) {
  const weakTopics = report.weakTopics ?? [];
  const redFlagCount = report.answers.reduce(
    (count, answer) => count + answer.redFlags.length,
    0,
  );

  return (
    <div className="space-y-8">
      <ReportSectionNav
        hasWeakTopics={weakTopics.length > 0}
        showShare={showShareActions}
      />

      <ReportHero
        overallScore={report.overallScore}
        summary={report.summary}
        roleTitle={roleTitle}
        generatedAt={generatedAt}
        questionCount={report.answers.length}
        redFlagCount={redFlagCount}
      />

      <ReportStatsRow answers={report.answers} redFlagCount={redFlagCount} />

      <section id="improvements" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-medium">
              Improvement actions
            </h2>
            <p className="text-sm text-muted-foreground">
              Concrete next steps before your real AI screening round.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          {report.improvements.map((item, index) => (
            <div key={item} className="nd-report-improvement pl-5">
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WeakTopicsCloud topics={weakTopics} />

      {report.screenReviewNotes && report.screenReviewNotes.length > 0 ? (
        <section
          id="screen-review"
          className="scroll-mt-28 nd-course-card border-primary/20 p-6"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Monitor className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-medium">
                Screen review signals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Observations from when you shared your screen during the
                interview.
              </p>
              <ul className="mt-4 space-y-3">
                {report.screenReviewNotes.map((note) => (
                  <li
                    key={note}
                    className="flex gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <AnswerBreakdown answers={report.answers} />

      {showShareActions ? (
        <div id="share" className="scroll-mt-28">
          <LazyShareActions
            shareToken={report.shareToken}
            report={report}
            roleTitle={roleTitle}
            sessionId={sessionId}
          />
        </div>
      ) : null}
    </div>
  );
}
