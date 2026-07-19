"use client";

import { useEffect, useRef } from "react";
import { SpeakerStage } from "@/components/interview/room/speaker-stage";
import { Button } from "@/components/ui/button";
import type { PanelistId, PanelistMode } from "@/lib/ai/personas/panelists";
import { bindVideoElement } from "@/lib/media/bind-video-element";
import type { RealtimeVoiceState } from "@/lib/voice/realtime-webrtc";

type ScreenShareStageProps = {
  screenStream: MediaStream;
  activePanelist: PanelistId;
  speakingPanelist?: PanelistId;
  panelistMode: PanelistMode;
  voiceState: RealtimeVoiceState;
  connecting?: boolean;
  handoffPanelist?: PanelistId;
  screenShareWarning?: string;
  onRetryScreenShare?: () => void;
  onVideoReady?: (video: HTMLVideoElement, track?: MediaStreamTrack) => void;
};

export function ScreenShareStage({
  screenStream,
  activePanelist,
  speakingPanelist,
  panelistMode,
  voiceState,
  connecting,
  handoffPanelist,
  screenShareWarning,
  onRetryScreenShare,
  onVideoReady,
}: ScreenShareStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onVideoReadyRef = useRef(onVideoReady);
  useEffect(() => {
    onVideoReadyRef.current = onVideoReady;
  }, [onVideoReady]);

  const screenTrack = screenStream.getVideoTracks()[0] ?? undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    return bindVideoElement(video, screenStream, (readyVideo) => {
      onVideoReadyRef.current?.(readyVideo, screenTrack);
    });
  }, [screenStream, screenTrack]);

  return (
    <div className="relative flex h-full w-full flex-col">
      {screenShareWarning ? (
        <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-xs text-amber-100 backdrop-blur-sm">
          <p className="max-w-3xl">{screenShareWarning}</p>
          {onRetryScreenShare ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-500/40 bg-black/30 text-amber-50 hover:bg-black/50"
              onClick={() => void onRetryScreenShare()}
            >
              Re-share screen
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-foreground backdrop-blur-sm">
          You&apos;re sharing your screen — panelists can reference your code
        </div>
      )}
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
          speakingPanelist={speakingPanelist}
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
