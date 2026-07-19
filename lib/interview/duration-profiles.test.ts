import { describe, expect, test } from "bun:test";
import {
  DURATION_PROFILES,
  formatDurationLabel,
  getDurationProfile,
  getDurationSeconds,
  isInterviewDuration,
} from "@/lib/interview/duration-profiles";

describe("duration-profiles", () => {
  test("returns profile for each duration", () => {
    expect(getDurationProfile("minutes_15").format).toBe("conversation");
    expect(getDurationProfile("minutes_30").format).toBe("light_coding");
    expect(getDurationProfile("minutes_60").format).toBe("machine_coding");
  });

  test("converts minutes to seconds", () => {
    expect(getDurationSeconds("minutes_15")).toBe(900);
    expect(getDurationSeconds("minutes_60")).toBe(3600);
  });

  test("formats labels with tagline", () => {
    expect(formatDurationLabel("minutes_30")).toBe("30 min · Light coding");
  });

  test("validates duration ids", () => {
    expect(isInterviewDuration("minutes_30")).toBe(true);
    expect(isInterviewDuration("minutes_45")).toBe(false);
  });

  test("every duration has a complete profile", () => {
    for (const profile of Object.values(DURATION_PROFILES)) {
      expect(profile.minutes).toBeGreaterThan(0);
      expect(profile.description.length).toBeGreaterThan(10);
    }
  });
});
