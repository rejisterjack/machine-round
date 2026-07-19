"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPanelist, type PanelistId } from "@/lib/ai/personas/panelists";
import type { RealtimeVoiceState } from "@/lib/voice/realtime-webrtc";

type VoiceControlsProps = {
  active: boolean;
  connecting?: boolean;
  handoffPanelist?: PanelistId;
  voiceState?: RealtimeVoiceState;
  activePanelist?: PanelistId;
  supported: boolean;
  error?: string;
  onToggle: () => void;
};

const BAR_HEIGHTS = ["h-5", "h-6", "h-7", "h-8", "h-6", "h-7", "h-5", "h-8", "h-6", "h-7", "h-5", "h-6"] as const;

function voiceStateLabel(
  voiceState: RealtimeVoiceState,
  activePanelist?: PanelistId,
) {
  const name = activePanelist
    ? getPanelist(activePanelist).shortName
    : "Panelist";

  switch (voiceState) {
    case "speaking":
      return `${name} speaking`;
    case "listening":
      return "Your turn — type or speak your answer";
    default:
      return "Voice session active";
  }
}

export function VoiceControls({
  active,
  connecting = false,
  handoffPanelist,
  voiceState = "idle",
  activePanelist,
  supported,
  error,
  onToggle,
}: VoiceControlsProps) {
  const handoffName = handoffPanelist
    ? getPanelist(handoffPanelist).shortName
    : null;

  return (
    <div className="nd-course-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Voice mode</p>
          <p className="text-xs text-muted-foreground">
            {!supported
              ? "Voice unavailable in this browser"
              : connecting
                ? handoffName
                  ? `${handoffName} is joining…`
                  : "Connecting WebRTC session..."
                : active
                  ? voiceStateLabel(voiceState, activePanelist)
                  : "Akshay & Archy speak via Azure Realtime — you answer below"}
          </p>
        </div>
        <Button
          type="button"
          variant={active ? "ndBadgeLive" : "outline"}
          size="icon-lg"
          disabled={!supported || connecting}
          onClick={onToggle}
          className={cn(active && "ring-2 ring-primary/40")}
        >
          {connecting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : active ? (
            <Mic className="size-5" />
          ) : (
            <MicOff className="size-5" />
          )}
        </Button>
      </div>
      {active && !connecting ? (
        <div className="mt-4 flex h-10 items-end gap-1">
          {BAR_HEIGHTS.map((heightClass, index) => (
            <span
              key={index}
              className={cn(
                "w-1 rounded-full bg-primary",
                heightClass,
                voiceState !== "idle" && "animate-pulse",
              )}
              style={{ animationDelay: `${index * 0.08}s` }}
            />
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
