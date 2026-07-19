"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ScreenCaptureItem = {
  url: string;
  summary?: string | null;
  capturedAt: string;
  questionSequence?: number | null;
};

type ScreenTimelineProps = {
  captures: ScreenCaptureItem[];
  className?: string;
};

export function ScreenTimeline({ captures, className }: ScreenTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!captures.length) {
    return null;
  }

  const selected = captures[selectedIndex] ?? captures[0];

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="font-heading text-xl font-medium">Screen timeline</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {captures.map((capture, index) => (
          <button
            key={`${capture.url}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
              index === selectedIndex
                ? "border-primary"
                : "border-transparent opacity-80 hover:opacity-100",
            )}
          >
            <Image
              src={capture.url}
              alt={
                capture.questionSequence
                  ? `Screen at question ${capture.questionSequence}`
                  : "Screen snapshot"
              }
              fill
              className="object-cover"
              sizes="128px"
              unoptimized
            />
          </button>
        ))}
      </div>
      <div className="nd-course-card p-4">
        <p className="text-xs text-muted-foreground">
          {new Date(selected.capturedAt).toLocaleString()}
          {selected.questionSequence
            ? ` · Question ${selected.questionSequence}`
            : null}
        </p>
        {selected.summary ? (
          <p className="mt-2 text-sm">{selected.summary}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No vision summary for this snapshot.
          </p>
        )}
      </div>
    </div>
  );
}
