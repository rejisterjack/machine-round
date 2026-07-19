import { describe, expect, test } from "bun:test";
import {
  findTranscriptMismatchIndex,
  transcriptsMatch,
} from "@/lib/session/transcript-reconcile";
import type { InterviewMessage } from "@/lib/session/interview-store";

const assistant = (content: string): InterviewMessage => ({
  role: "assistant",
  content,
});

const user = (content: string): InterviewMessage => ({
  role: "user",
  content,
});

describe("transcript-reconcile", () => {
  test("transcriptsMatch returns true for identical messages", () => {
    const messages = [assistant("Hello"), user("Hi")];
    expect(transcriptsMatch(messages, messages)).toBe(true);
  });

  test("findTranscriptMismatchIndex finds first divergence", () => {
    const db = [assistant("Hello"), user("Hi")];
    const client = [assistant("Hello"), user("Hey")];
    expect(findTranscriptMismatchIndex(db, client)).toBe(1);
  });

  test("findTranscriptMismatchIndex detects length mismatch", () => {
    const db = [assistant("Hello")];
    const client = [assistant("Hello"), user("Hi")];
    expect(findTranscriptMismatchIndex(db, client)).toBe(1);
  });

  test("findTranscriptMismatchIndex treats empty client as mismatch at 0", () => {
    const db = [assistant("Hello"), user("Hi")];
    expect(findTranscriptMismatchIndex(db, [])).toBe(0);
  });
});
