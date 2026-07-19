import { describe, expect, test } from "bun:test";
import {
  buildScreenFrameImageUrl,
  formatVisionContextPrefix,
  initialRealtimeVisionMode,
  isRealtimeVisionEnabled,
  shouldRateLimitFramePush,
} from "@/lib/interview/realtime-vision";

describe("isRealtimeVisionEnabled", () => {
  test("defaults to enabled", () => {
    const original = process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
    delete process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
    try {
      expect(isRealtimeVisionEnabled()).toBe(true);
      expect(initialRealtimeVisionMode()).toBe("unknown");
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
      } else {
        process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED = original;
      }
    }
  });

  test("can be disabled via env", () => {
    const original = process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
    process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED = "0";
    try {
      expect(isRealtimeVisionEnabled()).toBe(false);
      expect(initialRealtimeVisionMode()).toBe("text");
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED;
      } else {
        process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED = original;
      }
    }
  });
});

describe("shouldRateLimitFramePush", () => {
  test("rate limits frequent pushes", () => {
    expect(shouldRateLimitFramePush(1000, 1500, 800)).toBe(true);
    expect(shouldRateLimitFramePush(1000, 2000, 800)).toBe(false);
  });

  test("allows forced pushes through the limiter", () => {
    expect(shouldRateLimitFramePush(1000, 1100, 800, true)).toBe(false);
  });
});

describe("buildScreenFrameImageUrl", () => {
  test("builds data url with mime type", () => {
    expect(buildScreenFrameImageUrl("abc123", "image/png")).toBe(
      "data:image/png;base64,abc123",
    );
  });
});

describe("formatVisionContextPrefix", () => {
  test("labels screen and camera context", () => {
    expect(formatVisionContextPrefix("screen")).toBe("[Screen context]");
    expect(formatVisionContextPrefix("camera")).toBe("[Camera context]");
  });
});
