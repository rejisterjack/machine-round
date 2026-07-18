"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceControlsProps = {
  active: boolean;
  supported: boolean;
  error?: string;
  onToggle: () => void;
};

const BAR_HEIGHTS = ["h-5", "h-6", "h-7", "h-8", "h-6", "h-7", "h-5", "h-8", "h-6", "h-7", "h-5", "h-6"] as const;

export function VoiceControls({
  active,
  supported,
  error,
  onToggle,
}: VoiceControlsProps) {
  return (
    <div className="nd-course-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Voice mode</p>
          <p className="text-xs text-muted-foreground">
            {supported
              ? "WebRTC session via Azure OpenAI Realtime"
              : "Voice unavailable in this browser"}
          </p>
        </div>
        <Button
          type="button"
          variant={active ? "ndBadgeLive" : "outline"}
          size="icon-lg"
          disabled={!supported}
          onClick={onToggle}
          className={cn(active && "ring-2 ring-primary/40")}
        >
          {active ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </Button>
      </div>
      {active ? (
        <div className="mt-4 flex h-10 items-end gap-1">
          {BAR_HEIGHTS.map((heightClass, index) => (
            <span
              key={index}
              className={cn("w-1 animate-pulse rounded-full bg-primary", heightClass)}
              style={{ animationDelay: `${index * 0.08}s` }}
            />
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
