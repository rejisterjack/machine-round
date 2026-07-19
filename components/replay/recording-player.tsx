"use client";

import { useCallback, useRef, useState } from "react";

type RecordingPlayerProps = {
  src: string;
  durationMs?: number;
  onTimeUpdate?: (currentTimeMs: number) => void;
};

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
      <div className="nd-course-card p-4 text-sm text-muted-foreground">
        Recording is unavailable or could not be loaded.
      </div>
    );
  }

  return (
    <div className="nd-course-card overflow-hidden p-0">
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
      {durationMs ? (
        <p className="px-4 py-2 text-xs text-muted-foreground">
          Duration: {Math.round(durationMs / 1000 / 60)}m{" "}
          {Math.round((durationMs / 1000) % 60)}s
        </p>
      ) : null}
    </div>
  );
}
