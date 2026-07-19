import { Badge } from "@/components/ui/badge";
import { scoreBadgeClass, scoreTierLabel } from "@/lib/session/score-display";
import { cn } from "@/lib/utils";

type ReplayHeroProps = {
  roleTitle: string;
  publicId: string;
  panelistLabel: string;
  questionCount: number;
  messageCount: number;
  hasRecording: boolean;
  snapshotCount: number;
  overallScore?: number;
  readOnly?: boolean;
};

export function ReplayHero({
  roleTitle,
  publicId,
  panelistLabel,
  questionCount,
  messageCount,
  hasRecording,
  snapshotCount,
  overallScore,
  readOnly = false,
}: ReplayHeroProps) {
  return (
    <section id="overview" className="nd-replay-hero nd-course-card p-6 sm:p-8">
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="nd-section-pill">Session replay</span>
            {readOnly ? (
              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px]">
                Shared view
              </Badge>
            ) : null}
            {overallScore !== undefined ? (
              <Badge
                className={cn(
                  "h-6 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide",
                  scoreBadgeClass(overallScore),
                )}
              >
                {scoreTierLabel(overallScore)}
              </Badge>
            ) : null}
          </div>

          <div>
            <h2 className="font-heading text-xl font-medium sm:text-2xl">
              {roleTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Panel: {panelistLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1">
              {questionCount} questions
            </span>
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1">
              {messageCount} transcript turns
            </span>
            {hasRecording ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                Recording available
              </span>
            ) : (
              <span className="rounded-full border border-border bg-secondary/40 px-3 py-1">
                Transcript only
              </span>
            )}
            {snapshotCount > 0 ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                {snapshotCount} screen snapshot
                {snapshotCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <p className="font-mono text-xs text-muted-foreground/80">
            Replay ID · {publicId}
          </p>
        </div>

        {overallScore !== undefined ? (
          <div
            className={cn(
              "mx-auto flex shrink-0 flex-col items-center rounded-2xl px-5 py-4 lg:mx-0",
              scoreBadgeClass(overallScore),
            )}
          >
            <span className="font-heading text-4xl font-semibold tabular-nums">
              {overallScore}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
              /100 ready
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
