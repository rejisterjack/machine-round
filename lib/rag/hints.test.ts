import { describe, expect, test } from "bun:test";
import { buildRagGroundingBlock } from "@/lib/rag/hints";

describe("buildRagGroundingBlock", () => {
  test("returns empty string for empty bank", () => {
    expect(buildRagGroundingBlock([])).toBe("");
  });

  test("formats numbered questions with usage rules", () => {
    const block = buildRagGroundingBlock([
      "Explain closures.",
      "Design an LRU cache.",
    ]);
    expect(block).toContain("QUESTION BANK");
    expect(block).toContain("1. Explain closures.");
    expect(block).toContain("2. Design an LRU cache.");
    expect(block).toContain("Do not repeat");
  });

  test("includes voice-specific guidance when forVoice is true", () => {
    const block = buildRagGroundingBlock(["Explain hooks."], { forVoice: true });
    expect(block).toContain("Weave one bank question naturally");
    expect(block).toContain("follow-ups on the candidate's latest answer");
  });
});
