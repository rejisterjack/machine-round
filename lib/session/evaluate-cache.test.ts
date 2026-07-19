import { describe, expect, test } from "bun:test";
import { buildCachedEvaluatePayload } from "@/lib/session/evaluate-cache";

describe("buildCachedEvaluatePayload", () => {
  test("returns null when session has no report", () => {
    expect(buildCachedEvaluatePayload({ report: null })).toBeNull();
  });

  test("returns cached evaluate payload with weak topics", () => {
    const cached = buildCachedEvaluatePayload({
      report: {
        overallScore: 78,
        summary: "Strong structure with room to add metrics.",
        shareToken: "share-abc",
        answerEvaluations: [
          {
            question: "Tell me about a project.",
            answer: "I built a payments API.",
            clarity: 8,
            structure: 7,
            technicalSignal: 8,
            redFlags: [],
          },
        ],
        improvements: [{ content: "Add latency numbers." }],
        weakTopicTags: [{ label: "rambling", weight: 0.7 }],
        screenReviewNotes: ["Visible React component tree"],
      },
    });

    expect(cached?.overallScore).toBe(78);
    expect(cached?.shareToken).toBe("share-abc");
    expect(cached?.weakTopics).toEqual([{ label: "rambling", weight: 0.7 }]);
  });
});
