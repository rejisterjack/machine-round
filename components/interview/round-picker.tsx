"use client";

import type {
  JobInterviewPlan,
  PlannedInterviewRound,
} from "@/lib/courses/jd-rounds";
import { cn } from "@/lib/utils";

type RoundPickerProps = {
  plan: JobInterviewPlan;
  selectedRoundId: string | null;
  onSelect: (round: PlannedInterviewRound) => void;
};

export function RoundPicker({
  plan,
  selectedRoundId,
  onSelect,
}: RoundPickerProps) {
  return (
    <div className="mt-8">
      <p className="nd-section-heading mb-2">Planned rounds</p>
      <h2 className="font-heading text-2xl font-medium">
        {plan.roleTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {plan.companySummary}
      </p>
      {plan.mustHaveSkills.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {plan.mustHaveSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {plan.rounds.map((round) => {
          const isSelected = selectedRoundId === round.id;
          return (
            <button
              key={round.id}
              type="button"
              onClick={() => onSelect(round)}
              className={cn(
                "nd-course-card flex flex-col items-start gap-2 p-5 text-left transition-all",
                isSelected && "ring-2 ring-primary",
              )}
            >
              <p className="font-medium">{round.title}</p>
              <p className="text-xs text-muted-foreground">
                ~{round.estimatedMinutes} min · {round.recommendedDuration.replace("minutes_", "")} min session
              </p>
              <p className="text-sm text-muted-foreground">{round.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
