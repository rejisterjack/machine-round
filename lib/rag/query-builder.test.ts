import { describe, expect, test } from "bun:test";
import { buildRetrievalQuery } from "@/lib/rag/query-builder";

describe("buildRetrievalQuery", () => {
  test("builds opener query with topic areas", () => {
    const query = buildRetrievalQuery({
      roleTitle: "Namaste DSA",
      topicAreas: ["arrays", "graphs"],
      phase: "greeting",
    });
    expect(query).toContain("Namaste DSA");
    expect(query).toContain("arrays");
    expect(query).toContain("graphs");
  });

  test("builds follow-up query from candidate answer", () => {
    const query = buildRetrievalQuery({
      roleTitle: "Namaste React",
      topicAreas: ["hooks"],
      lastUserAnswer: "I used useMemo to memoize expensive list rendering.",
      lastAssistant: "How do you optimize React lists?",
      phase: "follow_up",
    });
    expect(query).toContain("follow-up");
    expect(query).toContain("useMemo");
    expect(query).toContain("hooks");
  });

  test("defaults to screening query without topics", () => {
    const query = buildRetrievalQuery({
      roleTitle: "Full-Stack Engineer",
      phase: "greeting",
    });
    expect(query).toBe("screening interview questions for Full-Stack Engineer");
  });
});
