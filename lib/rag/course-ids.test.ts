import { describe, expect, test } from "bun:test";
import { resolveRetrievalCourseIds } from "@/lib/rag/course-ids";

describe("resolveRetrievalCourseIds", () => {
  test("returns undefined when courseId is missing", () => {
    expect(resolveRetrievalCourseIds(undefined)).toBeUndefined();
  });

  test("returns single course id for standalone course", () => {
    expect(resolveRetrievalCourseIds("namaste-dsa")).toEqual(["namaste-dsa"]);
  });

  test("includes child courses for bundles", () => {
    const ids = resolveRetrievalCourseIds("mern-stack-bundle");
    expect(ids).toContain("mern-stack-bundle");
    expect(ids).toContain("namaste-react");
    expect(ids).toContain("namaste-node");
  });

  test("includes all child courses for advanced fullstack bundle", () => {
    const ids = resolveRetrievalCourseIds("advanced-fullstack-bundle");
    expect(ids).toContain("advanced-fullstack-bundle");
    expect(ids).toContain("namaste-react");
    expect(ids).toContain("namaste-node");
    expect(ids).toContain("namaste-frontend-system-design");
  });
});
