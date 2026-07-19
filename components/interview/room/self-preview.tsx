"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SelfPreviewProps = {
  stream: MediaStream | null;
  visible: boolean;
};

export function SelfPreview({ stream, visible }: SelfPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
      void video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  if (!visible || !stream) return null;

  return (
    <div className="absolute bottom-28 right-4 z-30 w-44 overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl sm:w-56">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full object-cover"
      />
      <p className="bg-black/60 px-2 py-1 text-center text-xs text-muted-foreground">
        You
      </p>
    </div>
  );
}
