import { describe, expect, test } from "bun:test";
import { getConversationPhase } from "@/lib/ai/conversation-phases";

describe("getConversationPhase", () => {
  test("starts in greeting and warmup", () => {
    expect(getConversationPhase(0, 0, "minutes_15")).toBe("greeting");
    expect(getConversationPhase(1, 60, "minutes_15")).toBe("warmup");
  });

  test("explores during mid-session", () => {
    expect(getConversationPhase(3, 600, "minutes_15")).toBe("explore");
  });

  test("enters closing in final 2 minutes", () => {
    expect(getConversationPhase(3, 780, "minutes_15")).toBe("closing");
    expect(getConversationPhase(3, 900, "minutes_15")).toBe("closing");
  });
});
