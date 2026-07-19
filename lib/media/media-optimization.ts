function readNumber(
  primary: string | undefined,
  fallback: string | undefined,
  defaultValue: number,
): number {
  const raw = primary ?? fallback;
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

/** Vision model capture — readable text/UI without full display resolution. */
export const ANALYSIS_MAX_WIDTH = 960;
export const ANALYSIS_JPEG_QUALITY = 0.62;

/** Fast realtime screen context — balanced for accuracy vs latency. */
export const REALTIME_MAX_WIDTH = 960;
export const REALTIME_JPEG_QUALITY = 0.78;

/** High-detail capture for user-turn precision questions. */
export const PRECISION_MAX_WIDTH = 1024;
export const PRECISION_JPEG_QUALITY = 0.85;

/** Camera frames for gesture / hand questions. */
export const CAMERA_MAX_WIDTH = 768;
export const CAMERA_JPEG_QUALITY = 0.9;
export const CAMERA_PRECISION_MAX_WIDTH = 960;
export const CAMERA_PRECISION_JPEG_QUALITY = 0.92;

/** WebRTC data channel safe payload (SCTP max message ~64KB). */
export const REALTIME_CHANNEL_MAX_BASE64_CHARS = 48_000;
export const PRECISION_LUMINANCE_THRESHOLD = 0.35;
export const PRECISION_BRIGHTNESS_BOOST = 0.15;

/** Cloudinary archive — replay thumbnails and detail view. */
export const ARCHIVE_MAX_WIDTH = 640;
export const ARCHIVE_WEBP_QUALITY = 0.55;
export const ARCHIVE_TARGET_BYTES =
  readNumber(
    process.env.NEXT_PUBLIC_MEDIA_ARCHIVE_TARGET_KB,
    process.env.MEDIA_ARCHIVE_TARGET_KB,
    120,
  ) * 1024;
export const ARCHIVE_MAX_BASE64_CHARS = 200_000;

/** Analysis payloads may be larger than archive (sent to vision model only). */
export const ANALYSIS_MAX_BASE64_CHARS = 1_200_000;

/** Session recording — downscaled screen recap for Cloudinary. */
export const RECORDING_MAX_WIDTH = 854;
export const RECORDING_MAX_HEIGHT = readNumber(
  process.env.NEXT_PUBLIC_MEDIA_RECORDING_MAX_HEIGHT,
  process.env.MEDIA_RECORDING_MAX_HEIGHT,
  480,
);
export const RECORDING_FPS = 12;
export const RECORDING_VIDEO_BPS =
  readNumber(
    process.env.NEXT_PUBLIC_MEDIA_RECORDING_VIDEO_KBPS,
    process.env.MEDIA_RECORDING_VIDEO_KBPS,
    250,
  ) * 1000;
export const RECORDING_AUDIO_BPS = 48_000;

export const MAX_RECORDING_UPLOAD_BYTES = 25 * 1024 * 1024;
