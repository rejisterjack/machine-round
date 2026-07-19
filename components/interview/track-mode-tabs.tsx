"use client";

import { cn } from "@/lib/utils";

export type InterviewTrackMode = "course" | "job_description";

type TrackModeTabsProps = {
  mode: InterviewTrackMode;
  onChange: (mode: InterviewTrackMode) => void;
};

export function TrackModeTabs({ mode, onChange }: TrackModeTabsProps) {
  return (
    <div className="mt-8 inline-flex rounded-lg border border-border bg-secondary p-1">
      {(
        [
          { id: "course" as const, label: "NamasteDev courses" },
          { id: "job_description" as const, label: "From job description" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-4 py-2 text-sm transition-colors",
            mode === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
