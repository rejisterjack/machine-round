import { describe, expect, test } from "bun:test";
import { buildCsp } from "@/lib/security/csp";

describe("buildCsp", () => {
  test("includes strict-dynamic and upgrade-insecure-requests in production", () => {
    const csp = buildCsp("test-nonce", false);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("'nonce-test-nonce'");
  });

  test("allows unsafe-eval in development", () => {
    const csp = buildCsp("test-nonce", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
