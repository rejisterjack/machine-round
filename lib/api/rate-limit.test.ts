import { describe, expect, test } from "bun:test";
import { checkRateLimit } from "@/lib/api/rate-limit";

describe("checkRateLimit", () => {
  test("allows requests under the limit", () => {
    const key = `test-${Date.now()}`;
    const first = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    const second = checkRateLimit(key, { limit: 2, windowMs: 60_000 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);
  });

  test("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, { limit: 1, windowMs: 60_000 });
    const blocked = checkRateLimit(key, { limit: 1, windowMs: 60_000 });

    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
