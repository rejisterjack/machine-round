import Link from "next/link";
import { Clock, MessageCircleOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportEligibility } from "@/lib/session/evaluate-eligibility";
import { cn } from "@/lib/utils";

type EarlySessionStateProps = {
  eligibility: Exclude<ReportEligibility, { status: "eligible" }>;
  roleTitle: string;
  className?: string;
  onTryAgain?: () => void;
};

const COPY: Record<
  Exclude<ReportEligibility["status"], "eligible">,
  {
    title: string;
    description: string;
    icon: typeof Clock;
  }
> = {
  no_transcript: {
    title: "Session ended before it started",
    description:
      "We didn't capture any interview conversation. Join a round and stay on the call long enough to answer at least one question.",
    icon: MessageCircleOff,
  },
  no_user_answers: {
    title: "No answers recorded yet",
    description:
      "The panelists joined, but we didn't hear your responses. Finish at least one answer so we can score clarity, structure, and technical depth.",
    icon: MessageCircleOff,
  },
  too_short: {
    title: "Round too short for a report",
    description:
      "You started answering, but this session ended before we had enough back-and-forth for a meaningful readiness score. Aim for a full 15–30 minute round.",
    icon: Clock,
  },
};

export function EarlySessionState({
  eligibility,
  roleTitle,
  className,
  onTryAgain,
}: EarlySessionStateProps) {
  const content = COPY[eligibility.status];
  const Icon = content.icon;

  return (
    <div
      className={cn(
        "nd-course-card mt-10 overflow-hidden border-amber-500/20 p-0",
        className,
      )}
    >
      <div className="border-b border-amber-500/15 bg-amber-500/5 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-100">
            <Icon className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">
              {roleTitle}
            </p>
            <h2 className="mt-1 font-heading text-xl font-medium sm:text-2xl">
              {content.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {content.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 sm:px-8">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Allow mic access and wait for the panelist to finish their intro.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Answer out loud — reports are built from your spoken transcript.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Use End call when you are done; we generate the report automatically.</span>
          </li>
        </ul>

        <div className="flex flex-wrap gap-3 pt-1">
          {onTryAgain ? (
            <Button variant="ndFilled" onClick={onTryAgain}>
              <RotateCcw className="size-4" />
              Try another round
            </Button>
          ) : (
            <Button variant="ndFilled" render={<Link href="/interview" />}>
              <RotateCcw className="size-4" />
              Try another round
            </Button>
          )}
          <Button variant="ndPrimary" render={<Link href="/history" />}>
            View session history
          </Button>
        </div>
      </div>
    </div>
  );
}
