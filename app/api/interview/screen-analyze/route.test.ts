import { describe, expect, test } from "bun:test";

function shouldThrottleScreenAnalyze(
  purpose?: "realtime" | "precision" | "archive",
) {
  return (purpose ?? "archive") !== "realtime" && purpose !== "precision";
}

function shouldUseStructuredOutput(
  purpose?: "realtime" | "precision" | "archive",
) {
  return purpose === "realtime" || purpose === "precision";
}

function shouldSendPriorSummary(
  purpose?: "realtime" | "precision" | "archive",
) {
  return purpose === "archive";
}

describe("screen-analyze purpose routing", () => {
  test("realtime purpose skips DB throttle", () => {
    expect(shouldThrottleScreenAnalyze("realtime")).toBe(false);
  });

  test("precision purpose skips DB throttle", () => {
    expect(shouldThrottleScreenAnalyze("precision")).toBe(false);
  });

  test("archive purpose keeps DB throttle", () => {
    expect(shouldThrottleScreenAnalyze("archive")).toBe(true);
    expect(shouldThrottleScreenAnalyze()).toBe(true);
  });

  test("realtime and precision use structured output", () => {
    expect(shouldUseStructuredOutput("realtime")).toBe(true);
    expect(shouldUseStructuredOutput("precision")).toBe(true);
    expect(shouldUseStructuredOutput("archive")).toBe(false);
  });

  test("priorSummary only applies to archive mode", () => {
    expect(shouldSendPriorSummary("archive")).toBe(true);
    expect(shouldSendPriorSummary("realtime")).toBe(false);
    expect(shouldSendPriorSummary("precision")).toBe(false);
  });
});
