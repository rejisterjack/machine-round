import { describe, expect, it } from "bun:test";
import {
  computeQuestionCount,
  shouldIncrementQuestionCount,
} from "@/lib/interview/question-counter";
import type { InterviewMessage } from "@/lib/session/interview-store";

function assistant(content: string): InterviewMessage {
  return { role: "assistant", content, speaker: "akshay" };
}

function user(content: string): InterviewMessage {
  return { role: "user", content };
}

describe("shouldIncrementQuestionCount", () => {
  it("counts only the first of consecutive assistant messages", () => {
    const before = [assistant("Hi, welcome to the round.")];
    expect(
      shouldIncrementQuestionCount(before, {
        role: "assistant",
        content: "Let me also mention the format.",
      }),
    ).toBe(false);
  });

  it("does not count closing goodbye", () => {
    expect(
      shouldIncrementQuestionCount([user("answer")], {
        role: "assistant",
        content: "Thank you so much — your readiness report is next.",
      }),
    ).toBe(false);
  });

  it("does not count system messages", () => {
    expect(
      shouldIncrementQuestionCount([], {
        role: "assistant",
        content: "[System] Please wrap up now.",
      }),
    ).toBe(false);
  });

  it("counts greeting then warmup after user responds", () => {
    const greeting = [assistant("Hi, I'm Akshay — ready for your machine round?")];
    expect(computeQuestionCount(greeting)).toBe(1);

    const withUser = [...greeting, user("Yes, ready.")];
    const warmup = assistant(
      "Great — quick warm-up: what is hoisting in JavaScript?",
    );
    expect(shouldIncrementQuestionCount(withUser, warmup)).toBe(true);
    expect(computeQuestionCount([...withUser, warmup])).toBe(2);
  });

  it("treats follow-ups on the same topic as one scored question", () => {
    const thread = [
      assistant("Hi, welcome."),
      user("Ready."),
      assistant("What is a closure in JavaScript?"),
      user("A function that remembers its lexical scope."),
      assistant("Can you elaborate on the lexical environment part?"),
      user("It stores variables from the outer scope."),
    ];
    expect(computeQuestionCount(thread)).toBe(2);

    const newQuestion = assistant(
      "Moving on — how does the event loop handle microtasks?",
    );
    expect(shouldIncrementQuestionCount(thread, newQuestion)).toBe(true);
    expect(computeQuestionCount([...thread, newQuestion])).toBe(3);
  });

  it("collapses three realtime chunks into one question", () => {
    const messages = [
      assistant("Hi, welcome to Namaste Machine Round."),
      user("Hello."),
      assistant("What is the difference between let and var?"),
    ];
    expect(computeQuestionCount(messages)).toBe(2);

    const inflated = [
      ...messages,
      assistant("Also think about temporal dead zone."),
      assistant("And block scope behavior."),
    ];
    expect(computeQuestionCount(inflated)).toBe(2);
  });
});
