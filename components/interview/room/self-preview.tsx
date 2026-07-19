"use client";

import { useEffect, useRef } from "react";
import { bindVideoElement } from "@/lib/media/bind-video-element";
import { cn } from "@/lib/utils";

type SelfPreviewProps = {
  stream: MediaStream | null;
  visible: boolean;
  onVideoReady?: (video: HTMLVideoElement, track?: MediaStreamTrack) => void;
};

export function SelfPreview({ stream, visible, onVideoReady }: SelfPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !visible) return;
    return bindVideoElement(video, stream, (readyVideo) => {
      onVideoReady?.(readyVideo, stream?.getVideoTracks()[0]);
    });
  }, [stream, visible, onVideoReady]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-28 right-4 z-30 w-44 overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl sm:w-56">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          "aspect-video w-full scale-x-[-1] object-cover",
          !stream && "opacity-0",
        )}
      />
      {!stream ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-xs text-muted-foreground">
          Camera off
        </div>
      ) : null}
      <p className="bg-black/60 px-2 py-1 text-center text-xs text-muted-foreground">
        You
      </p>
    </div>
  );
}
