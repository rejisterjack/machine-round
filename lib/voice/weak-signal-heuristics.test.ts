import { describe, expect, test } from "bun:test";
import {
  detectWeakSignalsFromAnswer,
  mergeWeakSignals,
} from "@/lib/voice/weak-signal-heuristics";

describe("weak-signal-heuristics", () => {
  test("detects vague and short answers", () => {
    const signals = detectWeakSignalsFromAnswer("I think maybe it was fine.");
    expect(signals).toContain("vague claims");
    expect(signals).toContain("short answer");
  });

  test("merges without duplicates", () => {
    expect(
      mergeWeakSignals(["rambling"], ["rambling", "no concrete metrics"]),
    ).toEqual(["rambling", "no concrete metrics"]);
  });
});
