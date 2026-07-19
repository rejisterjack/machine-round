import { describe, expect, test } from "bun:test";
import {
  isCameraVisualQuestion,
  isPrecisionScreenQuestion,
  buildVisualFocusQuestion,
} from "@/lib/interview/screen-intent";

describe("isPrecisionScreenQuestion", () => {
  test("detects cursor and modal questions", () => {
    expect(isPrecisionScreenQuestion("Where is my cursor?")).toBe(true);
    expect(isPrecisionScreenQuestion("What modal is open?")).toBe(true);
    expect(isPrecisionScreenQuestion("Do you see a popup on screen?")).toBe(true);
  });

  test("detects site and page identification questions", () => {
    expect(isPrecisionScreenQuestion("What site is this?")).toBe(true);
    expect(isPrecisionScreenQuestion("What page am I on?")).toBe(true);
    expect(isPrecisionScreenQuestion("What do you see on my screen?")).toBe(true);
  });

  test("returns false for generic interview questions", () => {
    expect(isPrecisionScreenQuestion("Can you explain your approach?")).toBe(
      false,
    );
    expect(isPrecisionScreenQuestion(undefined)).toBe(false);
    expect(isPrecisionScreenQuestion("")).toBe(false);
  });

  test("detects camera hand and finger questions", () => {
    expect(isCameraVisualQuestion("How many fingers am I showing?")).toBe(true);
    expect(isCameraVisualQuestion("Can you see my hand?")).toBe(true);
  });

  test("builds combined focus question from user and assistant", () => {
    expect(
      buildVisualFocusQuestion(
        "Three",
        "How many fingers are you showing?",
      ),
    ).toContain("How many fingers");
  });
});
