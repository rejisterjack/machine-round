"use client";

import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import {
  getActivePanelists,
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import type { RealtimeVoiceState } from "@/lib/voice/realtime-webrtc";
import { cn } from "@/lib/utils";

const BAR_HEIGHTS = ["h-3", "h-5", "h-7", "h-5", "h-8", "h-4", "h-6", "h-5"] as const;

type SpeakerStageProps = {
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
  voiceState: RealtimeVoiceState;
  connecting?: boolean;
  handoffPanelist?: PanelistId;
  compact?: boolean;
};

function statusLabel(voiceState: RealtimeVoiceState, name: string) {
  switch (voiceState) {
    case "speaking":
      return `${name} is speaking`;
    case "listening":
      return "Your turn — speak your answer";
    default:
      return "Connected";
  }
}

export function SpeakerStage({
  activePanelist,
  panelistMode,
  voiceState,
  connecting = false,
  handoffPanelist,
  compact = false,
}: SpeakerStageProps) {
  const panelists = getActivePanelists(panelistMode);
  const active = getPanelist(activePanelist);
  const joining = handoffPanelist ? getPanelist(handoffPanelist) : null;
  const isSpeaking = voiceState === "speaking";
  const isListening = voiceState === "listening";

  const connectionLabel = connecting
    ? joining
      ? `${joining.shortName} is joining the call…`
      : "Connecting…"
    : statusLabel(voiceState, active.shortName);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
        <PanelistAvatar
          panelistId={activePanelist}
          className={cn("size-12", isSpeaking && "ring-2 ring-primary")}
        />
        <div>
          <p className="text-sm font-medium">{active.name}</p>
          <p className="text-xs text-muted-foreground">
            {connectionLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4">
      {panelistMode === "both" ? (
        <div className="absolute right-4 top-4 flex gap-2">
          {panelists
            .filter((id) => id !== activePanelist)
            .map((id) => (
              <div
                key={id}
                className="rounded-xl border border-white/10 bg-black/40 p-2 opacity-60"
              >
                <PanelistAvatar panelistId={id} className="size-10" />
              </div>
            ))}
        </div>
      ) : null}

      <div
        className={cn(
          "relative flex flex-col items-center transition-transform duration-300",
          isSpeaking && "scale-[1.02]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            isSpeaking && "animate-ping bg-primary/20",
          )}
        />
        <div
          className={cn(
            "relative rounded-full p-1",
            isSpeaking && "ring-4 ring-primary/60 ring-offset-4 ring-offset-[#030303]",
            isListening && "ring-2 ring-emerald-500/50 ring-offset-4 ring-offset-[#030303]",
          )}
        >
          <PanelistAvatar
            panelistId={activePanelist}
            className="size-32 sm:size-40 md:size-48"
          />
        </div>

        {isSpeaking ? (
          <div className="mt-6 flex h-8 items-end gap-1">
            {BAR_HEIGHTS.map((heightClass, index) => (
              <span
                key={index}
                className={cn("w-1.5 rounded-full bg-primary", heightClass, "animate-pulse")}
                style={{ animationDelay: `${index * 0.08}s` }}
              />
            ))}
          </div>
        ) : null}

        <p className="mt-4 font-heading text-xl font-medium sm:text-2xl">
          {active.name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {connectionLabel}
        </p>
      </div>
    </div>
  );
}
