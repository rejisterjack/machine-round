import { describe, expect, it } from "bun:test";
import { authConfig } from "@/lib/auth/auth.config";
import { config as proxyConfig } from "@/proxy";

function isProtectedPath(pathname: string, searchParams = new URLSearchParams()) {
  const nextUrl = {
    pathname,
    searchParams,
  };

  return authConfig.callbacks.authorized({
    auth: null,
    request: { nextUrl },
  } as Parameters<typeof authConfig.callbacks.authorized>[0]);
}

describe("proxy matcher vs auth policy", () => {
  it("requires auth for protected app routes", () => {
    expect(isProtectedPath("/interview")).toBe(false);
    expect(isProtectedPath("/history")).toBe(false);
    expect(isProtectedPath("/report")).toBe(false);
    expect(isProtectedPath("/replay/demo-id")).toBe(false);
  });

  it("allows public share and tokenized replay paths", () => {
    expect(isProtectedPath("/report/share/abc123")).toBe(true);
    expect(
      isProtectedPath("/replay/demo-id", new URLSearchParams("shareToken=abc")),
    ).toBe(true);
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/login")).toBe(true);
  });

  it("includes primary protected routes in proxy matcher", () => {
    const matchers = proxyConfig.matcher;
    expect(matchers.some((entry) => entry.includes("/interview"))).toBe(true);
    expect(matchers.some((entry) => entry.includes("/history"))).toBe(true);
    expect(matchers.some((entry) => entry === "/report")).toBe(true);
    expect(matchers.some((entry) => entry.includes("/replay"))).toBe(true);
  });
});
