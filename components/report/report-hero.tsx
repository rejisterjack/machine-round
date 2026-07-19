import { Badge } from "@/components/ui/badge";
import {
  scoreBadgeClass,
  scoreRingGradient,
  scoreTierDescription,
  scoreTierLabel,
} from "@/lib/session/score-display";
import { cn } from "@/lib/utils";

type ReportHeroProps = {
  overallScore: number;
  summary: string;
  roleTitle?: string;
  generatedAt?: string;
  questionCount: number;
  redFlagCount: number;
};

export function ReportHero({
  overallScore,
  summary,
  roleTitle,
  generatedAt,
  questionCount,
  redFlagCount,
}: ReportHeroProps) {
  return (
    <section id="overview" className="nd-report-hero nd-course-card p-6 sm:p-8">
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="nd-section-pill">Overall readiness</span>
            <Badge
              className={cn(
                "h-6 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide",
                scoreBadgeClass(overallScore),
              )}
            >
              {scoreTierLabel(overallScore)}
            </Badge>
          </div>

          {roleTitle ? (
            <p className="font-heading text-xl font-medium sm:text-2xl">
              {roleTitle}
            </p>
          ) : null}

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>

          <p className="text-xs text-muted-foreground/90">
            {scoreTierDescription(overallScore)}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1">
              {questionCount} answers scored
            </span>
            {redFlagCount > 0 ? (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-destructive">
                {redFlagCount} AI screener flag
                {redFlagCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                No major red flags
              </span>
            )}
            {generatedAt ? (
              <span className="rounded-full border border-border bg-secondary/40 px-3 py-1">
                Generated {new Date(generatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "nd-report-score-ring mx-auto shrink-0 bg-gradient-to-br lg:mx-0",
            scoreRingGradient(overallScore),
          )}
          aria-label={`Overall readiness score ${overallScore} out of 100`}
        >
          <div className="nd-report-score-inner">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Score
            </span>
            <span className="font-heading text-5xl font-medium tabular-nums text-primary sm:text-6xl">
              {overallScore}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>
    </section>
  );
}
