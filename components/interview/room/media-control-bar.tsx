"use client";

import {
  Captions,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MediaControlBarProps = {
  muted: boolean;
  cameraEnabled: boolean;
  sharingScreen: boolean;
  captionsOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleCaptions: () => void;
  onEndCall: () => void;
};

function ControlButton({
  active,
  danger,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      title={label}
      className={cn(
        "rounded-full",
        active && "bg-white/15 text-foreground",
        danger && "bg-red-600 text-white hover:bg-red-700 hover:text-white",
      )}
    >
      {children}
    </Button>
  );
}

export function MediaControlBar({
  muted,
  cameraEnabled,
  sharingScreen,
  captionsOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleCaptions,
  onEndCall,
}: MediaControlBarProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center pb-6 pt-4">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#171717]/95 px-4 py-2 shadow-2xl backdrop-blur-md sm:gap-3 sm:px-6">
        <ControlButton
          label={muted ? "Unmute" : "Mute"}
          active={muted}
          onClick={onToggleMic}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </ControlButton>

        <ControlButton
          label={cameraEnabled ? "Turn off camera" : "Turn on camera"}
          active={cameraEnabled}
          onClick={onToggleCamera}
        >
          {cameraEnabled ? (
            <Video className="size-5" />
          ) : (
            <VideoOff className="size-5" />
          )}
        </ControlButton>

        <ControlButton
          label={sharingScreen ? "Stop sharing" : "Share screen"}
          active={sharingScreen}
          onClick={onToggleScreenShare}
        >
          <MonitorUp className="size-5" />
        </ControlButton>

        <ControlButton
          label={captionsOpen ? "Hide captions" : "Show captions"}
          active={captionsOpen}
          onClick={onToggleCaptions}
        >
          <Captions className="size-5" />
        </ControlButton>

        <ControlButton label="End interview" danger onClick={onEndCall}>
          <PhoneOff className="size-5" />
        </ControlButton>
      </div>
    </div>
  );
}
