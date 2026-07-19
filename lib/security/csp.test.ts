import { describe, expect, test } from "bun:test";
import { buildCsp } from "@/lib/security/csp";

describe("buildCsp", () => {
  test("allows self-hosted scripts and nonce in production", () => {
    const csp = buildCsp("test-nonce", false);
    expect(csp).toContain("'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("'nonce-test-nonce'");
    expect(csp).not.toContain("'strict-dynamic'");
  });

  test("allows unsafe-eval in development", () => {
    const csp = buildCsp("test-nonce", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
