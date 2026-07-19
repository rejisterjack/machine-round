import { describe, expect, test } from "bun:test";
import { shouldReturnCachedReport } from "@/lib/session/evaluate-idempotency";

describe("shouldReturnCachedReport", () => {
  test("returns true when report exists", () => {
    expect(shouldReturnCachedReport(true)).toBe(true);
    expect(shouldReturnCachedReport(false)).toBe(false);
  });
});
