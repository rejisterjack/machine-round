import { describe, expect, test } from "bun:test";
import {
  countScoredQuestions,
  GREETING_WARMUP_TURNS,
  MAX_SCORED_QUESTIONS,
  shouldEndInterview,
} from "@/lib/ai/question-cap";

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
});
