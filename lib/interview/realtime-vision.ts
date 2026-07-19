import {
  CAMERA_FRAME_PUSH_INTERVAL_MS,
  SCREEN_FRAME_PUSH_INTERVAL_MS,
} from "@/lib/session/session-limits";

export type RealtimeVisionMode = "unknown" | "image" | "text";
export type VisionContextSource = "screen" | "camera";

export function formatVisionContextPrefix(
  source: VisionContextSource = "screen",
): string {
  return source === "camera" ? "[Camera context]" : "[Screen context]";
}

export function isRealtimeVisionEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
  if (value === "0" || value === "false") return false;
  return true;
}

export function initialRealtimeVisionMode(): RealtimeVisionMode {
  return isRealtimeVisionEnabled() ? "unknown" : "text";
}

export type FramePushResult =
  | "sent"
  | "rate_limited"
  | "channel_unavailable"
  | "too_large"
  | "disabled";

export function isFramePushFailure(result: FramePushResult): boolean {
  return result === "too_large" || result === "disabled";
}

export function framePushIntervalMs(
  source: VisionContextSource = "screen",
): number {
  return source === "camera"
    ? CAMERA_FRAME_PUSH_INTERVAL_MS
    : SCREEN_FRAME_PUSH_INTERVAL_MS;
}

export function shouldRateLimitFramePush(
  lastPushAt: number,
  now: number,
  intervalMs = SCREEN_FRAME_PUSH_INTERVAL_MS,
  force = false,
): boolean {
  if (force) return false;
  return now - lastPushAt < intervalMs;
}

export function buildScreenFrameImageUrl(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): string {
  return `data:${mimeType};base64,${imageBase64}`;
}
