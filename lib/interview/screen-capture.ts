import {
  ANALYSIS_JPEG_QUALITY,
  ANALYSIS_MAX_WIDTH,
  ARCHIVE_MAX_BASE64_CHARS,
  ARCHIVE_MAX_WIDTH,
  ARCHIVE_TARGET_BYTES,
  ARCHIVE_WEBP_QUALITY,
} from "@/lib/media/media-optimization";
import { SCREEN_ANALYZE_INTERVAL_MS } from "@/lib/session/session-limits";

export type ArchiveMimeType = "image/webp" | "image/jpeg";

export type ScreenFrameCapture = {
  analysisBase64: string;
  archiveBase64: string;
  archiveMime: ArchiveMimeType;
};

const ARCHIVE_QUALITY_STEPS = [
  ARCHIVE_WEBP_QUALITY,
  0.45,
  0.35,
  0.28,
  0.22,
] as const;
const ARCHIVE_WIDTH_STEPS = [640, 560, 480] as const;

export function estimateBase64DecodedBytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function hashSample(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i += 64) {
    hash = (hash * 31 + data.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function scaledDimensions(
  videoWidth: number,
  videoHeight: number,
  maxWidth: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / videoWidth);
  return {
    width: Math.round(videoWidth * scale),
    height: Math.round(videoHeight * scale),
  };
}

function drawVideoFrame(
  videoEl: HTMLVideoElement,
  maxWidth: number,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  if (!videoEl.videoWidth || !videoEl.videoHeight) return null;

  const { width, height } = scaledDimensions(
    videoEl.videoWidth,
    videoEl.videoHeight,
    maxWidth,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(videoEl, 0, 0, width, height);
  return { canvas, width, height };
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: ArchiveMimeType,
  quality: number,
): string | null {
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return dataUrl.split(",")[1] ?? null;
}

function supportsWebpEncoding(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

export function captureAnalysisFrame(
  videoEl: HTMLVideoElement,
  quality = ANALYSIS_JPEG_QUALITY,
  maxWidth = ANALYSIS_MAX_WIDTH,
): string | null {
  const drawn = drawVideoFrame(videoEl, maxWidth);
  if (!drawn) return null;
  return encodeCanvas(drawn.canvas, "image/jpeg", quality);
}

export function captureArchiveFrame(
  videoEl: HTMLVideoElement,
  targetBytes = ARCHIVE_TARGET_BYTES,
): { base64: string; mimeType: ArchiveMimeType } | null {
  const drawn = drawVideoFrame(videoEl, ARCHIVE_MAX_WIDTH);
  if (!drawn) return null;

  const mimeCandidates: ArchiveMimeType[] = supportsWebpEncoding()
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];

  for (const mimeType of mimeCandidates) {
    const qualities = ARCHIVE_QUALITY_STEPS;

    for (const maxWidth of ARCHIVE_WIDTH_STEPS) {
      const frame =
        maxWidth === ARCHIVE_MAX_WIDTH
          ? drawn
          : drawVideoFrame(videoEl, maxWidth);
      if (!frame) continue;

      for (const quality of qualities) {
        const base64 = encodeCanvas(frame.canvas, mimeType, quality);
        if (!base64) continue;
        if (estimateBase64DecodedBytes(base64) <= targetBytes) {
          if (base64.length > ARCHIVE_MAX_BASE64_CHARS) continue;
          return { base64, mimeType };
        }
      }
    }
  }

  for (const maxWidth of [...ARCHIVE_WIDTH_STEPS, 400, 320]) {
    const frame =
      maxWidth === ARCHIVE_MAX_WIDTH ? drawn : drawVideoFrame(videoEl, maxWidth);
    if (!frame) continue;

    for (const quality of [0.2, 0.15, 0.1] as const) {
      const base64 = encodeCanvas(frame.canvas, "image/jpeg", quality);
      if (!base64) continue;
      if (base64.length <= ARCHIVE_MAX_BASE64_CHARS) {
        return { base64, mimeType: "image/jpeg" };
      }
    }
  }

  return null;
}

export function captureScreenFrames(
  videoEl: HTMLVideoElement,
): ScreenFrameCapture | null {
  const analysisBase64 = captureAnalysisFrame(videoEl);
  const archive = captureArchiveFrame(videoEl);
  if (!analysisBase64 || !archive) return null;

  return {
    analysisBase64,
    archiveBase64: archive.base64,
    archiveMime: archive.mimeType,
  };
}

/** @deprecated Use captureAnalysisFrame or captureScreenFrames. */
export function captureFrame(
  videoEl: HTMLVideoElement,
  quality = ANALYSIS_JPEG_QUALITY,
  maxWidth = ANALYSIS_MAX_WIDTH,
): string | null {
  return captureAnalysisFrame(videoEl, quality, maxWidth);
}

export function startScreenSampler(
  videoEl: HTMLVideoElement,
  onFrame: (frames: ScreenFrameCapture) => void,
  intervalMs = SCREEN_ANALYZE_INTERVAL_MS,
) {
  let lastHash = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  const sample = () => {
    if (document.visibilityState !== "visible") return;
    const frames = captureScreenFrames(videoEl);
    if (!frames) return;
    const frameHash = hashSample(frames.analysisBase64.slice(0, 2000));
    if (frameHash === lastHash) return;
    lastHash = frameHash;
    onFrame(frames);
  };

  timer = setInterval(sample, intervalMs);
  sample();

  return () => {
    if (timer) clearInterval(timer);
  };
}
