import { describe, expect, test } from "bun:test";
import {
  buildScreenFrameImageUrl,
  shouldRateLimitFramePush,
} from "@/lib/interview/realtime-vision";

describe("useRealtimeVoice screen frame helpers", () => {
  test("rate limits frame pushes unless forced", () => {
    expect(shouldRateLimitFramePush(0, 500, 800)).toBe(true);
    expect(shouldRateLimitFramePush(0, 900, 800)).toBe(false);
    expect(shouldRateLimitFramePush(0, 100, 800, true)).toBe(false);
  });

  test("builds high-detail image payload url", () => {
    expect(buildScreenFrameImageUrl("ZmFrZQ==", "image/jpeg")).toContain(
      "data:image/jpeg;base64,",
    );
  });
});
