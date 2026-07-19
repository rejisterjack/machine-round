import { describe, expect, test } from "bun:test";
import {
  countTopicsDiscussed,
  durationProgress,
} from "@/lib/ai/question-cap";

describe("question-cap progress", () => {
  test("durationProgress caps at 100", () => {
    expect(durationProgress(1200, "minutes_15")).toBe(100);
  });

  test("countTopicsDiscussed grows after warmup", () => {
    expect(countTopicsDiscussed(4)).toBe(2);
    expect(countTopicsDiscussed(5)).toBe(3);
  });
});
