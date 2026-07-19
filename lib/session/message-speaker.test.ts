import { describe, expect, test } from "bun:test";
import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";

describe("normalizeInterviewMessageSpeaker", () => {
  test("returns undefined for null, undefined, and empty string", () => {
    expect(normalizeInterviewMessageSpeaker(null)).toBeUndefined();
    expect(normalizeInterviewMessageSpeaker(undefined)).toBeUndefined();
    expect(normalizeInterviewMessageSpeaker("")).toBeUndefined();
  });

  test("returns undefined for unknown speaker values", () => {
    expect(normalizeInterviewMessageSpeaker("unknown")).toBeUndefined();
  });

  test("returns panelist id for valid speakers", () => {
    expect(normalizeInterviewMessageSpeaker("akshay")).toBe("akshay");
    expect(normalizeInterviewMessageSpeaker("archy")).toBe("archy");
  });
});
