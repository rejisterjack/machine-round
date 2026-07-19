import {
  ANALYSIS_JPEG_QUALITY,
  ANALYSIS_MAX_WIDTH,
  ARCHIVE_MAX_BASE64_CHARS,
  ARCHIVE_MAX_WIDTH,
  ARCHIVE_TARGET_BYTES,
  ARCHIVE_WEBP_QUALITY,
  CAMERA_JPEG_QUALITY,
  CAMERA_MAX_WIDTH,
  CAMERA_PRECISION_JPEG_QUALITY,
  CAMERA_PRECISION_MAX_WIDTH,
  PRECISION_BRIGHTNESS_BOOST,
  PRECISION_JPEG_QUALITY,
  PRECISION_LUMINANCE_THRESHOLD,
  PRECISION_MAX_WIDTH,
  REALTIME_CHANNEL_MAX_BASE64_CHARS,
  REALTIME_JPEG_QUALITY,
  REALTIME_MAX_WIDTH,
} from "@/lib/media/media-optimization";
import { SCREEN_ANALYZE_INTERVAL_MS } from "@/lib/session/session-limits";
import { sampleLuminanceGridFromCanvas } from "@/lib/interview/screen-change";

export type ArchiveMimeType = "image/webp" | "image/jpeg";

export type ScreenFrameCapture = {
  analysisBase64: string;
  archiveBase64: string;
  archiveMime: ArchiveMimeType;
};

export type ScreenSamplerSource = {
  videoEl?: HTMLVideoElement | null;
  track?: MediaStreamTrack | null;
};

const ARCHIVE_QUALITY_STEPS = [
  ARCHIVE_WEBP_QUALITY,
  0.45,
  0.35,
  0.28,
  0.22,
] as const;
const ARCHIVE_WIDTH_STEPS = [640, 560, 480] as const;

const videoElementCache = new WeakMap<MediaStreamTrack, HTMLVideoElement>();

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

function drawBitmapFrame(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  if (!sourceWidth || !sourceHeight) return null;

  const { width, height } = scaledDimensions(
    sourceWidth,
    sourceHeight,
    maxWidth,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

function drawVideoFrame(
  videoEl: HTMLVideoElement,
  maxWidth: number,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  if (!videoEl.videoWidth || !videoEl.videoHeight) return null;
  return drawBitmapFrame(
    videoEl,
    videoEl.videoWidth,
    videoEl.videoHeight,
    maxWidth,
  );
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: VisionMimeType,
  quality: number,
): string | null {
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return dataUrl.split(",")[1] ?? null;
}

export function computeAverageLuminanceFromImageData(
  imageData: Uint8ClampedArray,
): number {
  if (imageData.length === 0) return 1;
  let total = 0;
  const pixelCount = imageData.length / 4;
  for (let index = 0; index < imageData.length; index += 4) {
    const r = imageData[index] / 255;
    const g = imageData[index + 1] / 255;
    const b = imageData[index + 2] / 255;
    total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return total / pixelCount;
}

export function shouldBoostFrameLuminance(
  luminance: number,
  luminanceThreshold = PRECISION_LUMINANCE_THRESHOLD,
): boolean {
  return luminance < luminanceThreshold;
}

export function estimateFrameLuminance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 1;

  const sampleWidth = Math.min(canvas.width, 64);
  const sampleHeight = Math.min(canvas.height, 64);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  return computeAverageLuminanceFromImageData(imageData);
}

export function enhanceFrameForVision(
  canvas: HTMLCanvasElement,
  luminanceThreshold = PRECISION_LUMINANCE_THRESHOLD,
  brightnessBoost = PRECISION_BRIGHTNESS_BOOST,
): HTMLCanvasElement {
  const luminance = estimateFrameLuminance(canvas);
  if (!shouldBoostFrameLuminance(luminance, luminanceThreshold)) {
    return canvas;
  }

  const enhanced = document.createElement("canvas");
  enhanced.width = canvas.width;
  enhanced.height = canvas.height;
  const ctx = enhanced.getContext("2d");
  if (!ctx) return canvas;

  ctx.filter = `brightness(${1 + brightnessBoost}) contrast(1.05)`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
  return enhanced;
}

function supportsPngEncoding(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/png").startsWith("data:image/png");
}

function encodeVisionCanvasForChannel(
  canvas: HTMLCanvasElement,
): { base64: string; mimeType: VisionMimeType; changeSample: Uint8Array | null } | null {
  const enhanced = enhanceFrameForVision(canvas);
  const changeSample = sampleLuminanceGridFromCanvas(enhanced);
  const widthSteps = [
    enhanced.width,
    PRECISION_MAX_WIDTH,
    REALTIME_MAX_WIDTH,
    768,
    640,
    480,
  ];
  const qualitySteps = [0.88, 0.78, 0.68, 0.58, 0.48] as const;

  for (const maxWidth of widthSteps) {
    const { width, height } = scaledDimensions(
      enhanced.width,
      enhanced.height,
      maxWidth,
    );
    const target =
      width === enhanced.width && height === enhanced.height
        ? enhanced
        : (() => {
            const scaled = document.createElement("canvas");
            scaled.width = width;
            scaled.height = height;
            const ctx = scaled.getContext("2d");
            if (!ctx) return null;
            ctx.drawImage(enhanced, 0, 0, width, height);
            return scaled;
          })();
    if (!target) continue;

    for (const quality of qualitySteps) {
      const base64 = encodeCanvas(target, "image/jpeg", quality);
      if (
        base64 &&
        base64.length <= REALTIME_CHANNEL_MAX_BASE64_CHARS
      ) {
        return { base64, mimeType: "image/jpeg", changeSample };
      }
    }
  }

  return null;
}

function encodeVisionCanvas(
  canvas: HTMLCanvasElement,
  preferPng: boolean,
  jpegQuality: number,
): { base64: string; mimeType: VisionMimeType; changeSample: Uint8Array | null } | null {
  const channel = encodeVisionCanvasForChannel(canvas);
  if (channel) return channel;

  const enhanced = enhanceFrameForVision(canvas);
  const changeSample = sampleLuminanceGridFromCanvas(enhanced);
  if (preferPng && supportsPngEncoding()) {
    const base64 = encodeCanvas(enhanced, "image/png", 1);
    if (base64) return { base64, mimeType: "image/png", changeSample };
  }
  const base64 = encodeCanvas(enhanced, "image/jpeg", jpegQuality);
  if (!base64) return null;
  return { base64, mimeType: "image/jpeg", changeSample };
}

async function captureVisionFrameFromTrack(
  track: MediaStreamTrack,
  maxWidth: number,
  jpegQuality: number,
  preferPng: boolean,
): Promise<VisionFrameCapture | null> {
  const drawn = await drawTrackFrame(track, maxWidth);
  if (!drawn) return null;
  try {
    const encoded = encodeVisionCanvas(drawn.canvas, preferPng, jpegQuality);
    if (!encoded) return null;
    return {
      analysisBase64: encoded.base64,
      mimeType: encoded.mimeType,
      changeSample: encoded.changeSample ?? undefined,
    };
  } finally {
    drawn.cleanup?.();
  }
}

function captureVisionFrameFromVideo(
  videoEl: HTMLVideoElement,
  maxWidth: number,
  jpegQuality: number,
  preferPng: boolean,
): VisionFrameCapture | null {
  const drawn = drawVideoFrame(videoEl, maxWidth);
  if (!drawn) return null;
  const encoded = encodeVisionCanvas(drawn.canvas, preferPng, jpegQuality);
  if (!encoded) return null;
  return {
    analysisBase64: encoded.base64,
    mimeType: encoded.mimeType,
    changeSample: encoded.changeSample ?? undefined,
  };
}

async function captureVisionFrameFromSource(
  source: ScreenSamplerSource,
  maxWidth: number,
  jpegQuality: number,
  preferPng: boolean,
): Promise<VisionFrameCapture | null> {
  if (source.track?.readyState === "live") {
    const fromTrack = await captureVisionFrameFromTrack(
      source.track,
      maxWidth,
      jpegQuality,
      preferPng,
    );
    if (fromTrack) return fromTrack;
  }

  if (source.videoEl) {
    return captureVisionFrameFromVideo(
      source.videoEl,
      maxWidth,
      jpegQuality,
      preferPng,
    );
  }

  return null;
}

function supportsWebpEncoding(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

async function getVideoElementForTrack(
  track: MediaStreamTrack,
  timeoutMs = 3000,
): Promise<HTMLVideoElement | null> {
  const cached = videoElementCache.get(track);
  if (cached && cached.srcObject) {
    if (cached.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return cached;
    }
    const ready = await Promise.race([
      new Promise<boolean>((resolve) => {
        const onReady = () => {
          cached.removeEventListener("loadeddata", onReady);
          resolve(true);
        };
        cached.addEventListener("loadeddata", onReady, { once: true });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    if (ready) return cached;
    return null;
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  videoElementCache.set(track, video);

  const loaded = await Promise.race([
    new Promise<boolean>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        reject(new Error("Could not prepare screen capture video."));
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
      void video.play().catch(onError);
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);

  if (!loaded) {
    videoElementCache.delete(track);
    video.pause();
    video.srcObject = null;
    return null;
  }

  return video;
}

async function grabTrackBitmap(
  track: MediaStreamTrack,
): Promise<ImageBitmap | null> {
  if (typeof ImageCapture === "undefined") return null;
  if (track.readyState !== "live") return null;

  try {
    const capture = new ImageCapture(track);
    return await capture.grabFrame();
  } catch {
    return null;
  }
}

type DrawnFrame = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cleanup?: () => void;
};

async function drawTrackFrame(
  track: MediaStreamTrack,
  maxWidth: number,
): Promise<DrawnFrame | null> {
  const bitmap = await grabTrackBitmap(track);
  if (bitmap) {
    const drawn = drawBitmapFrame(bitmap, bitmap.width, bitmap.height, maxWidth);
    if (!drawn) {
      bitmap.close();
      return null;
    }
    return {
      ...drawn,
      cleanup: () => bitmap.close(),
    };
  }

  const video = await getVideoElementForTrack(track);
  if (!video) return null;
  const drawn = drawVideoFrame(video, maxWidth);
  return drawn ? { ...drawn } : null;
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

async function captureAnalysisFrameFromTrack(
  track: MediaStreamTrack,
  quality = ANALYSIS_JPEG_QUALITY,
  maxWidth = ANALYSIS_MAX_WIDTH,
): Promise<string | null> {
  const drawn = await drawTrackFrame(track, maxWidth);
  if (!drawn) return null;
  try {
    return encodeCanvas(drawn.canvas, "image/jpeg", quality);
  } finally {
    drawn.cleanup?.();
  }
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
    for (const maxWidth of ARCHIVE_WIDTH_STEPS) {
      const frame =
        maxWidth === ARCHIVE_MAX_WIDTH
          ? drawn
          : drawVideoFrame(videoEl, maxWidth);
      if (!frame) continue;

      for (const quality of ARCHIVE_QUALITY_STEPS) {
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

async function captureArchiveFrameFromTrack(
  track: MediaStreamTrack,
  targetBytes = ARCHIVE_TARGET_BYTES,
): Promise<{ base64: string; mimeType: ArchiveMimeType } | null> {
  const drawn = await drawTrackFrame(track, ARCHIVE_MAX_WIDTH);
  if (!drawn) return null;

  try {
    const mimeCandidates: ArchiveMimeType[] = supportsWebpEncoding()
      ? ["image/webp", "image/jpeg"]
      : ["image/jpeg"];

    for (const mimeType of mimeCandidates) {
      for (const quality of ARCHIVE_QUALITY_STEPS) {
        const base64 = encodeCanvas(drawn.canvas, mimeType, quality);
        if (!base64) continue;
        if (estimateBase64DecodedBytes(base64) <= targetBytes) {
          if (base64.length > ARCHIVE_MAX_BASE64_CHARS) continue;
          return { base64, mimeType };
        }
      }
    }

    for (const quality of [0.2, 0.15, 0.1] as const) {
      const base64 = encodeCanvas(drawn.canvas, "image/jpeg", quality);
      if (!base64) continue;
      if (base64.length <= ARCHIVE_MAX_BASE64_CHARS) {
        return { base64, mimeType: "image/jpeg" };
      }
    }
  } finally {
    drawn.cleanup?.();
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

export async function captureScreenFramesFromTrack(
  track: MediaStreamTrack,
): Promise<ScreenFrameCapture | null> {
  const analysisBase64 = await captureAnalysisFrameFromTrack(track);
  const archive = await captureArchiveFrameFromTrack(track);
  if (!analysisBase64 || !archive) return null;

  return {
    analysisBase64,
    archiveBase64: archive.base64,
    archiveMime: archive.mimeType,
  };
}

export type VisionMimeType = "image/jpeg" | "image/png" | "image/webp";

export type VisionFrameCapture = {
  analysisBase64: string;
  mimeType: VisionMimeType;
  changeSample?: Uint8Array;
};

export async function captureRealtimeFrameFromSource(
  source: ScreenSamplerSource,
): Promise<VisionFrameCapture | null> {
  return captureVisionFrameFromSource(
    source,
    REALTIME_MAX_WIDTH,
    REALTIME_JPEG_QUALITY,
    false,
  );
}

export async function capturePrecisionFrameFromSource(
  source: ScreenSamplerSource,
): Promise<VisionFrameCapture | null> {
  return captureVisionFrameFromSource(
    source,
    PRECISION_MAX_WIDTH,
    PRECISION_JPEG_QUALITY,
    false,
  );
}

export async function captureCameraFrameFromSource(
  source: ScreenSamplerSource,
): Promise<VisionFrameCapture | null> {
  return captureVisionFrameFromSource(
    source,
    CAMERA_MAX_WIDTH,
    CAMERA_JPEG_QUALITY,
    false,
  );
}

export async function captureCameraPrecisionFrameFromSource(
  source: ScreenSamplerSource,
): Promise<VisionFrameCapture | null> {
  return captureVisionFrameFromSource(
    source,
    CAMERA_PRECISION_MAX_WIDTH,
    CAMERA_PRECISION_JPEG_QUALITY,
    false,
  );
}

export async function captureScreenFramesFromSource(
  source: ScreenSamplerSource,
): Promise<ScreenFrameCapture | null> {
  if (source.track?.readyState === "live") {
    const fromTrack = await captureScreenFramesFromTrack(source.track);
    if (fromTrack) return fromTrack;
  }

  if (source.videoEl) {
    return captureScreenFrames(source.videoEl);
  }

  return null;
}

/** @deprecated Use captureAnalysisFrame or captureScreenFrames. */
export function captureFrame(
  videoEl: HTMLVideoElement,
  quality = ANALYSIS_JPEG_QUALITY,
  maxWidth = ANALYSIS_MAX_WIDTH,
): string | null {
  return captureAnalysisFrame(videoEl, quality, maxWidth);
}

export function shouldSampleWhileHidden(): boolean {
  return true;
}

export function startScreenSampler(
  source: ScreenSamplerSource | HTMLVideoElement,
  onFrame: (frames: ScreenFrameCapture) => void,
  intervalMs = SCREEN_ANALYZE_INTERVAL_MS,
) {
  const samplerSource: ScreenSamplerSource =
    source instanceof HTMLVideoElement
      ? { videoEl: source }
      : source;

  let lastHash = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  let sampling = false;

  const sample = () => {
    if (sampling) return;
    sampling = true;
    void captureScreenFramesFromSource(samplerSource)
      .then((frames) => {
        if (!frames) return;
        const frameHash = hashSample(frames.analysisBase64.slice(0, 2000));
        if (frameHash === lastHash) return;
        lastHash = frameHash;
        onFrame(frames);
      })
      .finally(() => {
        sampling = false;
      });
  };

  timer = setInterval(sample, intervalMs);
  sample();

  return () => {
    if (timer) clearInterval(timer);
  };
}
