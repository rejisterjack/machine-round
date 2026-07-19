import {
  RECORDING_FPS,
  RECORDING_MAX_HEIGHT,
  RECORDING_MAX_WIDTH,
} from "@/lib/media/media-optimization";

export type RecordingVideoPipeline = {
  stream: MediaStream;
  stop: () => void;
};

function scaledRecordingDimensions(
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  const scale = Math.min(
    1,
    RECORDING_MAX_WIDTH / videoWidth,
    RECORDING_MAX_HEIGHT / videoHeight,
  );
  return {
    width: Math.max(1, Math.round(videoWidth * scale)),
    height: Math.max(1, Math.round(videoHeight * scale)),
  };
}

function stopClonedSource(
  video: HTMLVideoElement,
  clonedStream: MediaStream,
) {
  clonedStream.getTracks().forEach((track) => track.stop());
  video.pause();
  video.srcObject = null;
}

export async function createRecordingVideoPipeline(
  sourceStream: MediaStream,
): Promise<RecordingVideoPipeline> {
  const sourceTrack = sourceStream.getVideoTracks()[0];
  if (!sourceTrack) {
    throw new Error("Recording video pipeline requires a video track.");
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  const clonedStream = new MediaStream([sourceTrack.clone()]);
  video.srcObject = clonedStream;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      stopClonedSource(video, clonedStream);
      reject(new Error("Could not prepare recording video source."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
    void video.play().catch(onError);
  });

  const { width, height } = scaledRecordingDimensions(
    video.videoWidth,
    video.videoHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    stopClonedSource(video, clonedStream);
    throw new Error("Could not create recording canvas.");
  }

  const frameIntervalMs = 1000 / RECORDING_FPS;
  let lastFrameAt = 0;
  let rafId = 0;

  const drawFrame = (timestamp: number) => {
    if (timestamp - lastFrameAt >= frameIntervalMs) {
      lastFrameAt = timestamp;
      ctx.drawImage(video, 0, 0, width, height);
    }
    rafId = requestAnimationFrame(drawFrame);
  };

  rafId = requestAnimationFrame(drawFrame);
  const stream = canvas.captureStream(RECORDING_FPS);

  const stop = () => {
    cancelAnimationFrame(rafId);
    stream.getTracks().forEach((track) => track.stop());
    stopClonedSource(video, clonedStream);
  };

  return { stream, stop };
}
