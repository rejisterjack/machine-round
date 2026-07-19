import { describe, expect, test } from "bun:test";
import {
  assertAuthForSmoke,
  isSmokeAuthConfigured,
  smokeFetchInit,
} from "../scripts/smoke-auth";

describe("smoke-auth", () => {
  test("injects cookie when configured", () => {
    const previous = process.env.SMOKE_AUTH_COOKIE;
    process.env.SMOKE_AUTH_COOKIE = "session=test";
    const init = smokeFetchInit({ method: "GET" });
    const headers = new Headers(init.headers);
    expect(headers.get("Cookie")).toBe("session=test");
    process.env.SMOKE_AUTH_COOKIE = previous;
  });

  test("assertAuthForSmoke throws on 401 when cookie set", () => {
    const previous = process.env.SMOKE_AUTH_COOKIE;
    process.env.SMOKE_AUTH_COOKIE = "session=test";
    expect(() => assertAuthForSmoke("/api/roles", 401)).toThrow();
    process.env.SMOKE_AUTH_COOKIE = previous;
  });

  test("isSmokeAuthConfigured reflects env", () => {
    const previous = process.env.SMOKE_AUTH_COOKIE;
    delete process.env.SMOKE_AUTH_COOKIE;
    expect(isSmokeAuthConfigured()).toBe(false);
    process.env.SMOKE_AUTH_COOKIE = "x";
    expect(isSmokeAuthConfigured()).toBe(true);
    process.env.SMOKE_AUTH_COOKIE = previous;
  });
});
