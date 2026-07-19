import { describe, expect, test } from "bun:test";
import type { InterviewMessage } from "@/lib/session/interview-store";
import {
  createAssistantDedupState,
  extractResponseId,
  getAssistantDedupKey,
  normalizeTranscriptContent,
  shouldAcceptAssistantTranscriptEvent,
  shouldSkipDuplicateAssistantMessage,
} from "@/lib/voice/transcript-dedup";

describe("transcript-dedup", () => {
  test("extracts response_id from event", () => {
    expect(
      extractResponseId({ type: "response.output_audio_transcript.done", response_id: "resp_1" }),
    ).toBe("resp_1");
  });

  test("dedupes audio and text for same response_id", () => {
    const state = createAssistantDedupState();
    const messages: InterviewMessage[] = [];

    const audioEvent = {
      type: "response.output_audio_transcript.done",
      response_id: "resp_1",
      transcript: "Hello there",
    };
    const textEvent = {
      type: "response.output_text.done",
      response_id: "resp_1",
      text: "Hello there",
    };

    expect(
      shouldAcceptAssistantTranscriptEvent(
        state,
        audioEvent,
        "Hello there",
        messages,
      ),
    ).toBe(true);
    expect(
      shouldAcceptAssistantTranscriptEvent(
        state,
        textEvent,
        "Hello there",
        messages,
      ),
    ).toBe(false);
  });

  test("skips fuzzy duplicate assistant content", () => {
    const messages: InterviewMessage[] = [
      { role: "assistant", content: "Tell me about your project." },
    ];
    expect(
      shouldSkipDuplicateAssistantMessage(
        messages,
        "Tell me about your project.",
      ),
    ).toBe(true);
  });

  test("normalizes transcript content", () => {
    expect(normalizeTranscriptContent("  Hello   World  ")).toBe("hello world");
  });

  test("builds stable dedup keys", () => {
    expect(
      getAssistantDedupKey(
        { type: "response.output_audio_transcript.done", response_id: "abc" },
        "Hi",
      ),
    ).toBe("response:abc");
  });
});
