import { describe, expect, it } from "bun:test";
import { buildCsp } from "@/lib/security/csp";

describe("buildCsp", () => {
  it("includes nonce in production policy", () => {
    const policy = buildCsp("test-nonce", false);
    expect(policy).toContain("'nonce-test-nonce'");
    expect(policy).toContain("https://www.clarity.ms");
    expect(policy).toContain("wss://*.openai.azure.com");
  });

  it("relaxes script-src in development", () => {
    const policy = buildCsp("test-nonce", true);
    expect(policy).toContain("'unsafe-eval'");
  });
});
