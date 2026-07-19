import { afterEach, describe, expect, mock, test } from "bun:test";
import type { GroundedQuestion } from "@/lib/rag/types";

const sampleRows: GroundedQuestion[] = [
  {
    id: "q1",
    content: "Explain closures.",
    category: "technical",
    difficulty: 2,
    courseId: "namaste-javascript",
    distance: 0.12,
  },
  {
    id: "q2",
    content: "Design a rate limiter.",
    category: "system_design",
    difficulty: 3,
    courseId: "namaste-node",
    distance: 0.2,
  },
];

const queryRawMock = mock(async () => sampleRows);
const embedMock = mock(async () => Array.from({ length: 1536 }, (_, index) => index / 1536));

mock.module("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: queryRawMock,
  },
}));

mock.module("@/lib/rag/embed-question", () => ({
  embedQuestionText: embedMock,
}));

const { searchInterviewQuestions } = await import("@/lib/rag/retrieval");

afterEach(() => {
  queryRawMock.mockClear();
  embedMock.mockClear();
});

describe("searchInterviewQuestions", () => {
  test("returns scoped results with dedup metadata", async () => {
    const result = await searchInterviewQuestions({
      roleTitle: "Namaste JavaScript",
      limit: 2,
      courseId: "namaste-javascript",
      messages: [
        { role: "assistant", content: "Explain closures and scope in JavaScript." },
      ],
    });

    expect(result.questions.length).toBeLessThanOrEqual(2);
    expect(result.query).toContain("Namaste JavaScript");
    expect(result.scoped).toBe(true);
    expect(embedMock).toHaveBeenCalled();
    expect(queryRawMock).toHaveBeenCalled();
  });

  test("falls back to global search when strictScope is false and scoped search is empty", async () => {
    queryRawMock.mockImplementationOnce(async () => []);
    queryRawMock.mockImplementationOnce(async () => sampleRows);

    const result = await searchInterviewQuestions({
      roleTitle: "Namaste DSA",
      limit: 2,
      courseId: "namaste-dsa",
      strictScope: false,
    });

    expect(result.scoped).toBe(false);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(queryRawMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("does not fall back when strictScope is true", async () => {
    queryRawMock.mockImplementation(async () => []);

    const result = await searchInterviewQuestions({
      roleTitle: "Namaste JavaScript",
      limit: 2,
      courseId: "namaste-javascript",
      strictScope: true,
    });

    expect(result.questions).toEqual([]);
    expect(result.scoped).toBe(true);
    expect(queryRawMock.mock.calls.length).toBe(1);
  });
});
