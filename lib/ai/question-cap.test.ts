import { describe, expect, test } from "bun:test";
import {
  countTopicsDiscussed,
  durationProgress,
  getInstructionPhaseBucket,
  GREETING_WARMUP_TURNS,
  hasClosingIntent,
  needsClosingGoodbyeByTime,
  shouldEndByDuration,
  shouldScheduleInterviewEndByTime,
  shouldWarnDurationWrapUp,
} from "@/lib/ai/question-cap";

describe("question-cap", () => {
  test("greeting and warmup do not count as topics discussed", () => {
    expect(countTopicsDiscussed(0)).toBe(0);
    expect(countTopicsDiscussed(1)).toBe(0);
    expect(countTopicsDiscussed(2)).toBe(0);
    expect(countTopicsDiscussed(3)).toBe(1);
  });

  test("detects closing intent", () => {
    expect(hasClosingIntent("Thank you for your time today.")).toBe(true);
    expect(hasClosingIntent("What is your approach?")).toBe(false);
  });

  test("duration timeout helpers", () => {
    expect(shouldEndByDuration(899, "minutes_15")).toBe(false);
    expect(shouldEndByDuration(900, "minutes_15")).toBe(true);
    expect(shouldWarnDurationWrapUp(780, "minutes_15")).toBe(true);
    expect(shouldWarnDurationWrapUp(900, "minutes_15")).toBe(false);
  });

  test("time-based completion requires closing intent", () => {
    expect(
      shouldScheduleInterviewEndByTime(900, "Let's keep going.", "minutes_15"),
    ).toBe(false);
    expect(
      shouldScheduleInterviewEndByTime(
        900,
        "Thank you — your readiness report is next.",
        "minutes_15",
      ),
    ).toBe(true);
    expect(
      needsClosingGoodbyeByTime(900, "One more follow-up.", "minutes_15"),
    ).toBe(true);
  });

  test("durationProgress tracks elapsed time", () => {
    expect(durationProgress(450, "minutes_15")).toBe(50);
    expect(durationProgress(900, "minutes_15")).toBe(100);
    expect(durationProgress(1200, "minutes_15")).toBe(100);
  });

  test("instruction phase bucket switches in wrap-up window", () => {
    expect(getInstructionPhaseBucket(600, "minutes_15")).toBe(0);
    expect(getInstructionPhaseBucket(780, "minutes_15")).toBe(1);
    expect(getInstructionPhaseBucket(900, "minutes_15")).toBe(1);
  });

  test("GREETING_WARMUP_TURNS is 2", () => {
    expect(GREETING_WARMUP_TURNS).toBe(2);
  });
});
