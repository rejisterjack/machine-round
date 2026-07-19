"use client";

import { useEffect, useRef } from "react";
import { SpeakerStage } from "@/components/interview/room/speaker-stage";
import type { PanelistId, PanelistMode } from "@/lib/ai/personas/panelists";
import type { RealtimeVoiceState } from "@/lib/voice/realtime-webrtc";

type ScreenShareStageProps = {
  screenStream: MediaStream;
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
  voiceState: RealtimeVoiceState;
  connecting?: boolean;
  handoffPanelist?: PanelistId;
  onVideoReady?: (video: HTMLVideoElement) => void;
};

export function ScreenShareStage({
  screenStream,
  activePanelist,
  panelistMode,
  voiceState,
  connecting,
  handoffPanelist,
  onVideoReady,
}: ScreenShareStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onVideoReadyRef = useRef(onVideoReady);
  useEffect(() => {
    onVideoReadyRef.current = onVideoReady;
  }, [onVideoReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = screenStream;
    void video.play().catch(() => {});
    onVideoReadyRef.current?.(video);
  }, [screenStream]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-foreground backdrop-blur-sm">
        You&apos;re sharing your screen — panelists can reference your code
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-contain bg-[#0a0a0a]"
      />
      <div className="absolute bottom-4 left-4 z-10">
        <SpeakerStage
          activePanelist={activePanelist}
          panelistMode={panelistMode}
          voiceState={voiceState}
          connecting={connecting}
          handoffPanelist={handoffPanelist}
          compact
        />
      </div>
    </div>
  );
}
