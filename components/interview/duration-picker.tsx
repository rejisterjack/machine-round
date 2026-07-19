"use client";

import { cn } from "@/lib/utils";
import {
  DURATION_PROFILES,
  INTERVIEW_DURATIONS,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";

type DurationPickerProps = {
  selected: InterviewDuration;
  onSelect: (duration: InterviewDuration) => void;
};

export function DurationPicker({ selected, onSelect }: DurationPickerProps) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {INTERVIEW_DURATIONS.map((duration) => {
        const profile = DURATION_PROFILES[duration];
        const isSelected = selected === duration;
        return (
          <button
            key={duration}
            type="button"
            onClick={() => onSelect(duration)}
            className={cn(
              "nd-course-card flex flex-col items-start gap-3 p-5 text-left transition-all",
              isSelected && "ring-2 ring-primary",
            )}
          >
            <div className="flex w-full items-baseline justify-between gap-2">
              <p className="font-medium">{profile.label}</p>
              {duration === "minutes_30" ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Recommended
                </span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-foreground/90">
              {profile.tagline}
            </p>
            <p className="text-sm text-muted-foreground">{profile.description}</p>
          </button>
        );
      })}
    </div>
  );
}
