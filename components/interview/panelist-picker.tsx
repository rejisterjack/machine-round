"use client";

import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import { cn } from "@/lib/utils";

type PanelistOption = {
  mode: PanelistMode;
  title: string;
  description: string;
  panelistIds: PanelistId[];
};

const PANELIST_OPTIONS: PanelistOption[] = [
  {
    mode: "akshay",
    title: "Akshay Saini",
    description:
      "Behavioral depth, communication clarity, ownership, and product impact.",
    panelistIds: ["akshay"],
  },
  {
    mode: "archy",
    title: "Archy Gupta",
    description:
      "DSA rigor, technical depth, structured prep, and concrete examples.",
    panelistIds: ["archy"],
  },
  {
    mode: "both",
    title: "Akshay & Archy",
    description:
      "Full dual-panel experience — they alternate questions like a real screen.",
    panelistIds: ["akshay", "archy"],
  },
];

type PanelistPickerProps = {
  selected: PanelistMode | null;
  onSelect: (mode: PanelistMode) => void;
};

export function PanelistPicker({ selected, onSelect }: PanelistPickerProps) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {PANELIST_OPTIONS.map((option) => {
        const isSelected = selected === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => onSelect(option.mode)}
            className={cn(
              "nd-course-card flex flex-col items-start gap-4 p-5 text-left transition-all",
              isSelected && "ring-2 ring-primary",
            )}
          >
            <div className="flex items-center gap-3">
              {option.panelistIds.map((id) => (
                <PanelistAvatar key={id} panelistId={id} className="size-12" />
              ))}
            </div>
            <div>
              <p className="font-medium">{option.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            {option.mode === "both" ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Recommended
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {getPanelist(option.panelistIds[0]).focus.slice(0, 2).join(" · ")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
