import { describe, expect, test } from "bun:test";
import {
  getDisplaySurface,
  getScreenShareWarning,
  isMonitorCapture,
  type DisplaySurface,
} from "@/lib/media/display-capture";

function mockTrack(displaySurface?: DisplaySurface): MediaStreamTrack {
  return {
    getSettings: () =>
      displaySurface ? { displaySurface } : ({} as MediaTrackSettings),
  } as MediaStreamTrack;
}

describe("getDisplaySurface", () => {
  test("reads monitor surface from track settings", () => {
    expect(getDisplaySurface(mockTrack("monitor"))).toBe("monitor");
  });

  test("reads browser surface from track settings", () => {
    expect(getDisplaySurface(mockTrack("browser"))).toBe("browser");
  });

  test("reads window surface from track settings", () => {
    expect(getDisplaySurface(mockTrack("window"))).toBe("window");
  });

  test("returns undefined for unknown surface", () => {
    expect(getDisplaySurface(mockTrack())).toBeUndefined();
  });
});

describe("isMonitorCapture", () => {
  test("is true only for monitor", () => {
    expect(isMonitorCapture("monitor")).toBe(true);
    expect(isMonitorCapture("browser")).toBe(false);
    expect(isMonitorCapture("window")).toBe(false);
    expect(isMonitorCapture(undefined)).toBe(false);
  });
});

describe("getScreenShareWarning", () => {
  test("returns undefined for monitor capture", () => {
    expect(getScreenShareWarning("monitor")).toBeUndefined();
  });

  test("returns tab-specific warning for browser surface", () => {
    expect(getScreenShareWarning("browser")).toContain("browser tab");
  });

  test("returns window-specific warning for window surface", () => {
    expect(getScreenShareWarning("window")).toContain("single window");
  });
});
