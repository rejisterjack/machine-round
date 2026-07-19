import { describe, expect, test } from "bun:test";
import {
  canGenerateEvaluateReport,
  evaluateIneligibleMessage,
} from "@/lib/session/evaluate-eligibility";
import type { InterviewMessage } from "@/lib/session/interview-store";

function msg(role: "user" | "assistant", content: string): InterviewMessage {
  return { role, content };
}

describe("evaluate-eligibility", () => {
  test("requires minimum messages and a user answer", () => {
    expect(canGenerateEvaluateReport([])).toBe(false);
    expect(
      canGenerateEvaluateReport([
        msg("assistant", "Hi"),
        msg("assistant", "Question?"),
      ]),
    ).toBe(false);
    expect(
      canGenerateEvaluateReport([
        msg("assistant", "Hi"),
        msg("user", "Ready"),
        msg("assistant", "What is a closure?"),
        msg("user", "A function remembering scope"),
      ]),
    ).toBe(true);
  });

  test("returns actionable ineligible copy", () => {
    expect(evaluateIneligibleMessage([])).toMatch(/No interview transcript/);
    expect(
      evaluateIneligibleMessage([msg("assistant", "Hello only")]),
    ).toMatch(/no candidate answers/i);
  });
});
