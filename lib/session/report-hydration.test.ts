import { describe, expect, test } from "bun:test";
import { canUseStoredReport } from "@/lib/session/report-hydration";

describe("canUseStoredReport", () => {
  test("returns false when no stored report", () => {
    expect(canUseStoredReport(null, "abc")).toBe(false);
    expect(canUseStoredReport({ dbSessionId: "abc" }, "abc")).toBe(false);
  });

  test("returns false when no session param", () => {
    expect(
      canUseStoredReport({ report: {}, dbSessionId: "abc" }, null),
    ).toBe(false);
  });

  test("returns true when param matches stored session id", () => {
    expect(
      canUseStoredReport({ report: {}, dbSessionId: "abc" }, "abc"),
    ).toBe(true);
  });

  test("returns false when param mismatches stored session id", () => {
    expect(
      canUseStoredReport({ report: {}, dbSessionId: "abc" }, "xyz"),
    ).toBe(false);
  });
});
