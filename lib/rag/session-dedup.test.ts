import { describe, expect, test } from "bun:test";
import {
  extractAskedQuestionTexts,
  filterAlreadyAsked,
} from "@/lib/rag/session-dedup";
import type { GroundedQuestion } from "@/lib/rag/types";

function makeCandidate(content: string): GroundedQuestion {
  return {
    id: content,
    content,
    category: "technical",
    difficulty: 2,
    courseId: "namaste-dsa",
    distance: 0.1,
  };
}

describe("extractAskedQuestionTexts", () => {
  test("returns assistant messages only", () => {
    const asked = extractAskedQuestionTexts([
      { role: "assistant", content: "Explain closures." },
      { role: "user", content: "Sure." },
      { role: "assistant", content: "How does the event loop work?" },
    ]);
    expect(asked).toEqual([
      "Explain closures.",
      "How does the event loop work?",
    ]);
  });
});

describe("filterAlreadyAsked", () => {
  test("excludes candidates that overlap with prior assistant questions", () => {
    const candidates = [
      makeCandidate("Explain closures and scope in JavaScript."),
      makeCandidate("Design a rate limiter for an API gateway."),
    ];
    const { filtered, excludedCount } = filterAlreadyAsked(candidates, [
      "Walk me through closures and how scope works in JavaScript.",
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.content).toContain("rate limiter");
    expect(excludedCount).toBe(1);
  });

  test("returns all candidates when nothing was asked yet", () => {
    const candidates = [makeCandidate("Question A"), makeCandidate("Question B")];
    const { filtered, excludedCount } = filterAlreadyAsked(candidates, []);
    expect(filtered).toHaveLength(2);
    expect(excludedCount).toBe(0);
  });
});
