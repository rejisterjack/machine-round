import { describe, expect, test } from "bun:test";
import {
  countScoredQuestions,
  GREETING_WARMUP_TURNS,
  getMaxScoredQuestions,
  hasClosingIntent,
  MAX_SCORED_QUESTIONS,
  needsClosingGoodbye,
  needsClosingGoodbyeByTime,
  shouldEndByDuration,
  shouldEndInterview,
  shouldScheduleInterviewEnd,
  shouldScheduleInterviewEndByTime,
  shouldWarnDurationWrapUp,
} from "@/lib/ai/question-cap";
import { getMaxQuestionsForDuration } from "@/lib/interview/duration-profiles";

describe("question-cap", () => {
  test("greeting and warmup do not count as scored questions", () => {
    expect(countScoredQuestions(0)).toBe(0);
    expect(countScoredQuestions(1)).toBe(0);
    expect(countScoredQuestions(2)).toBe(0);
    expect(countScoredQuestions(3)).toBe(1);
  });

  test("ends interview after scored cap", () => {
    const endAt = GREETING_WARMUP_TURNS + MAX_SCORED_QUESTIONS;
    expect(shouldEndInterview(endAt - 1)).toBe(false);
    expect(shouldEndInterview(endAt)).toBe(true);
  });

  test("detects closing intent", () => {
    expect(hasClosingIntent("Thank you for your time today.")).toBe(true);
    expect(hasClosingIntent("What is your approach?")).toBe(false);
  });

  test("shouldScheduleInterviewEnd requires cap and closing signal", () => {
    const endAt = GREETING_WARMUP_TURNS + MAX_SCORED_QUESTIONS;
    expect(
      shouldScheduleInterviewEnd(endAt, "What tradeoffs did you consider?"),
    ).toBe(false);
    expect(
      shouldScheduleInterviewEnd(
        endAt,
        "Thank you — your readiness report is next.",
      ),
    ).toBe(true);
  });

  test("needsClosingGoodbye when cap reached without closing line", () => {
    const endAt = GREETING_WARMUP_TURNS + MAX_SCORED_QUESTIONS;
    expect(needsClosingGoodbye(endAt, "One more thing about caching.")).toBe(
      true,
    );
    expect(
      needsClosingGoodbye(endAt, "Thanks — your readiness report is next."),
    ).toBe(false);
  });

  test("15 min profile ends earlier than default", () => {
    const maxQuestions = getMaxQuestionsForDuration("minutes_15");
    const endAt = GREETING_WARMUP_TURNS + getMaxScoredQuestions(maxQuestions);
    expect(shouldEndInterview(endAt - 1, maxQuestions)).toBe(false);
    expect(shouldEndInterview(endAt, maxQuestions)).toBe(true);
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
});
