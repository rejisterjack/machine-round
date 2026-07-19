import { describe, expect, test } from "bun:test";
import {
  buildInterviewScopeBlock,
  getCourseInterviewScope,
} from "@/lib/courses/interview-scope";

describe("getCourseInterviewScope", () => {
  test("namaste-javascript is strict and syllabus-bound", () => {
    const scope = getCourseInterviewScope("namaste-javascript");
    expect(scope?.strictCourseMode).toBe(true);
    expect(scope?.allowsBehavioral).toBe(false);
    expect(scope?.allowedTopics).toContain("closures");
    expect(scope?.forbiddenTopics.length).toBeGreaterThan(0);
    expect(scope?.focusBlock).toMatch(/ONLY ask core JavaScript/i);
  });

  test("namaste-interview allows behavioral mix", () => {
    const scope = getCourseInterviewScope("namaste-interview");
    expect(scope?.allowsBehavioral).toBe(true);
    expect(scope?.strictCourseMode).toBe(false);
  });

  test("mern bundle merges child courses", () => {
    const scope = getCourseInterviewScope("mern-stack-bundle");
    expect(scope?.strictCourseMode).toBe(true);
    expect(scope?.allowedTopics).toEqual(
      expect.arrayContaining(["React", "Node", "MongoDB"]),
    );
    expect(scope?.focusBlock).toMatch(/Namaste React/i);
    expect(scope?.focusBlock).toMatch(/Namaste Node/i);
  });

  test("JD promptContext becomes strict round scope", () => {
    const scope = getCourseInterviewScope(undefined, "ONLY system design APIs");
    expect(scope?.strictCourseMode).toBe(true);
    expect(scope?.focusBlock).toBe("ONLY system design APIs");
  });
});

describe("buildInterviewScopeBlock", () => {
  test("includes forbidden topics for strict courses", () => {
    const block = buildInterviewScopeBlock("namaste-javascript");
    expect(block).toMatch(/STRICT INTERVIEW SCOPE/);
    expect(block).toMatch(/FORBIDDEN/);
    expect(block).toMatch(/closures/i);
  });
});
