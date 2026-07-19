import { describe, expect, test } from "bun:test";
import { detectWeakSignalsFromAnswer } from "@/lib/voice/weak-signal-heuristics";

describe("weak-signal-heuristics extended", () => {
  test("flags rambling on long answers", () => {
    const longAnswer = "word ".repeat(100);
    expect(detectWeakSignalsFromAnswer(longAnswer)).toContain("rambling");
  });

  test("flags vague claims", () => {
    expect(
      detectWeakSignalsFromAnswer(
        "I think we probably improved things and maybe users were kind of happier after the change overall.",
      ),
    ).toContain("vague claims");
  });

  test("returns empty for strong concise answers", () => {
    expect(
      detectWeakSignalsFromAnswer(
        "We cut checkout latency from 900ms to 320ms over six weeks by caching inventory lookups and added dashboards for p95 latency across 12 regions.",
      ),
    ).toEqual([]);
  });
});
