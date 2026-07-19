"use client";

import Image from "next/image";
import { useState } from "react";
import { Monitor, ZoomIn } from "lucide-react";
import { optimizedCaptureImageUrl } from "@/lib/media/cloudinary-url";
import { cn } from "@/lib/utils";

export type ScreenCaptureItem = {
  url: string;
  publicId?: string;
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
  const selectedDetailUrl = optimizedCaptureImageUrl(selected, "detail");

  return (
    <section id="screen" className={cn("scroll-mt-28 space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-medium">Screen timeline</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Snapshots captured while you shared your screen during the interview.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {captures.length} shot{captures.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {captures.map((capture, index) => (
          <button
            key={capture.publicId ?? `${capture.url}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
              index === selectedIndex
                ? "border-primary ring-2 ring-primary/20"
                : "border-border/60 opacity-80 hover:opacity-100",
            )}
          >
            <Image
              src={optimizedCaptureImageUrl(capture, "thumb")}
              alt={
                capture.questionSequence
                  ? `Screen at question ${capture.questionSequence}`
                  : "Screen snapshot"
              }
              fill
              className="object-cover"
              sizes="128px"
            />
            {capture.questionSequence ? (
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Q{capture.questionSequence}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="nd-replay-media-card overflow-hidden">
        <div className="relative aspect-video w-full bg-black">
          <Image
            src={selectedDetailUrl}
            alt={
              selected.questionSequence
                ? `Screen detail at question ${selected.questionSequence}`
                : "Screen snapshot detail"
            }
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 960px"
          />
        </div>
        <div className="border-t border-border/60 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ZoomIn className="size-3.5 text-primary" />
            <span>{new Date(selected.capturedAt).toLocaleString()}</span>
            {selected.questionSequence ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                Question {selected.questionSequence}
              </span>
            ) : null}
          </div>
          {selected.summary ? (
            <p className="mt-3 text-sm leading-relaxed">{selected.summary}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No vision summary for this snapshot.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
