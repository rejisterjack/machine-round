import { describe, expect, test } from "bun:test";
import { shouldReturnCachedReport } from "@/lib/session/evaluate-idempotency";

describe("shouldReturnCachedReport", () => {
  test("returns true only when fully synced and report exists", () => {
    expect(shouldReturnCachedReport(true, true)).toBe(true);
    expect(shouldReturnCachedReport(false, true)).toBe(false);
    expect(shouldReturnCachedReport(true, false)).toBe(false);
  });
});
