import { describe, expect, test } from "bun:test";
import { extractMessageFromRealtimeEvent } from "@/lib/voice/realtime-transcript";

describe("extractMessageFromRealtimeEvent", () => {
  test("prefers audio transcript metadata", () => {
    const message = extractMessageFromRealtimeEvent(
      {
        type: "response.output_audio_transcript.done",
        response_id: "resp_42",
        transcript: "Walk me through your approach.",
      },
      "akshay",
    );

    expect(message?.role).toBe("assistant");
    expect(message?.responseId).toBe("resp_42");
    expect(message?.source).toBe("audio");
  });

  test("extracts text transcript with response id", () => {
    const message = extractMessageFromRealtimeEvent({
      type: "response.output_text.done",
      response_id: "resp_99",
      text: "Thanks for sharing.",
    });

    expect(message?.role).toBe("assistant");
    expect(message?.responseId).toBe("resp_99");
    expect(message?.source).toBe("text");
  });
});
