import { describe, expect, test } from "bun:test";
import {
  countScoredQuestions,
  scoredProgress,
  shouldEndInterview,
} from "@/lib/ai/question-cap";

describe("question-cap progress", () => {
  test("scoredProgress caps at 100", () => {
    expect(scoredProgress(20)).toBe(100);
  });

  test("shouldEndInterview is false during warmup", () => {
    expect(shouldEndInterview(1)).toBe(false);
    expect(shouldEndInterview(2)).toBe(false);
  });

  test("countScoredQuestions grows after warmup", () => {
    expect(countScoredQuestions(4)).toBe(2);
    expect(countScoredQuestions(5)).toBe(3);
  });
});
