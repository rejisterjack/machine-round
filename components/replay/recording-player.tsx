"use client";

import { useCallback, useRef, useState } from "react";
import { Clock, Video } from "lucide-react";

type RecordingPlayerProps = {
  src: string;
  durationMs?: number;
  onTimeUpdate?: (currentTimeMs: number) => void;
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function RecordingPlayer({
  src,
  durationMs,
  onTimeUpdate,
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState(false);

  const handleTimeUpdate = useCallback(() => {
    const current = videoRef.current?.currentTime;
    if (current !== undefined) {
      onTimeUpdate?.(Math.round(current * 1000));
    }
  }, [onTimeUpdate]);

  if (playbackError) {
    return (
      <div className="nd-replay-media-card p-6 text-sm text-muted-foreground">
        Recording is unavailable or could not be loaded.
      </div>
    );
  }

  return (
    <div className="nd-replay-media-card">
      <div className="nd-replay-media-header">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-primary" />
          <span className="text-sm font-medium">Session recording</span>
        </div>
        {durationMs ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatDuration(durationMs)}
          </span>
        ) : null}
      </div>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        onTimeUpdate={handleTimeUpdate}
        onError={() => setPlaybackError(true)}
      />
    </div>
  );
}
