import { describe, expect, test } from "bun:test";
import {
  countConsecutivePanelistTurns,
  detectAddressedPanelist,
  isThreadComplete,
  parseSpeakerDecision,
  resolveNextSpeaker,
  signalsThreadClosure,
} from "@/lib/ai/panelist-router";

describe("panelist-router", () => {
  test("detects when candidate addresses Archy", () => {
    expect(
      detectAddressedPanelist("Archy, can you ask me a DP question?"),
    ).toBe("archy");
  });

  test("detects when candidate addresses Akshay", () => {
    expect(
      detectAddressedPanelist("Akshay, what do you think about my answer?"),
    ).toBe("akshay");
  });

  test("returns null when no panelist is named", () => {
    expect(
      detectAddressedPanelist("I used React hooks and context for state."),
    ).toBeNull();
  });

  test("parses model JSON speaker decision", () => {
    expect(
      parseSpeakerDecision(
        '{"speaker":"archy","reason":"Technical follow-up on algorithms"}',
      ),
    ).toEqual({
      speaker: "archy",
      reason: "Technical follow-up on algorithms",
      threadComplete: undefined,
    });
  });

  test("rejects invalid speaker in JSON", () => {
    expect(parseSpeakerDecision('{"speaker":"bob","reason":"nope"}')).toBeNull();
  });

  test("resolveNextSpeaker honors solo Akshay mode", async () => {
    const result = await resolveNextSpeaker({
      messages: [],
      panelistMode: "akshay",
      connectedPanelist: "akshay",
      roleTitle: "Frontend Engineer",
    });
    expect(result.speaker).toBe("akshay");
  });

  test("resolveNextSpeaker routes to addressed panelist without LLM", async () => {
    const result = await resolveNextSpeaker({
      messages: [
        { role: "user", content: "Archy, can you ask about binary trees?" },
      ],
      panelistMode: "both",
      connectedPanelist: "akshay",
      roleTitle: "Frontend Engineer",
    });
    expect(result.speaker).toBe("archy");
    expect(result.reason).toContain("Archy");
  });

  test("stays with Archy on first follow-up in a thread", async () => {
    const result = await resolveNextSpeaker({
      messages: [
        {
          role: "assistant",
          content: "Walk me through your approach to binary trees.",
          speaker: "archy",
        },
        {
          role: "user",
          content: "I used recursion with a base case for null nodes.",
        },
      ],
      panelistMode: "both",
      connectedPanelist: "archy",
      roleTitle: "Frontend Engineer",
    });
    expect(result.speaker).toBe("archy");
    expect(result.threadComplete).toBe(false);
    expect(result.reason).toContain("thread");
  });

  test("does not alternate just because Archy spoke last", async () => {
    const messages = [
      {
        role: "assistant" as const,
        content: "How would you optimize that?",
        speaker: "archy" as const,
      },
      {
        role: "user" as const,
        content: "I'd use memoization on overlapping subproblems.",
      },
    ];

    const result = await resolveNextSpeaker({
      messages,
      panelistMode: "both",
      connectedPanelist: "archy",
      roleTitle: "Frontend Engineer",
    });

    expect(result.speaker).toBe("archy");
  });

  test("marks thread complete after two panelist turns", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: "Tell me about trees.",
        speaker: "archy" as const,
      },
      { role: "user" as const, content: "I use BFS for level order." },
      {
        role: "assistant" as const,
        content: "What's the complexity?",
        speaker: "archy" as const,
      },
      { role: "user" as const, content: "O(n) for visiting each node once." },
    ];

    expect(isThreadComplete(messages, "archy")).toBe(true);
    expect(countConsecutivePanelistTurns(messages, "archy")).toBe(2);
  });

  test("detects user thread closure signals", () => {
    expect(signalsThreadClosure("That's all from my side on this topic.")).toBe(
      true,
    );
    expect(signalsThreadClosure("I used a hash map for lookups.")).toBe(false);
  });

  test("allows handoff consideration when thread is complete", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: "How do you handle production incidents?",
        speaker: "archy" as const,
      },
      {
        role: "user" as const,
        content: "We have runbooks and paging.",
      },
      {
        role: "assistant" as const,
        content: "What was your role in the last one?",
        speaker: "archy" as const,
      },
      {
        role: "user" as const,
        content: "That's all — I led the rollback and postmortem.",
      },
    ];

    expect(isThreadComplete(messages, "archy")).toBe(true);
    expect(signalsThreadClosure(messages.at(-1)!.content)).toBe(true);
  });
});
