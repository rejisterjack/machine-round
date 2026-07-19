import { describe, expect, test } from "bun:test";
import { roleIdToSlug, roleSlugToId } from "@/lib/session/role-slug";

describe("role-slug", () => {
  test("maps job-custom id to job_custom slug", () => {
    expect(roleIdToSlug("job-custom")).toBe("job_custom");
  });

  test("maps job_custom slug back to job-custom id", () => {
    expect(roleSlugToId("job_custom")).toBe("job-custom");
  });

  test("maps NamasteDev course ids", () => {
    expect(roleIdToSlug("namaste-react")).toBe("namaste_react");
    expect(roleSlugToId("namaste_react")).toBe("namaste-react");
  });
});
