import { describe, expect, test } from "bun:test";
import {
  PANELIST_REALTIME_VOICE,
  resolveRealtimeVoice,
} from "@/lib/voice/panelist-voices";

describe("panelist-voices", () => {
  test("assigns cedar to Akshay and sage to Archy", () => {
    expect(PANELIST_REALTIME_VOICE.akshay).toBe("cedar");
    expect(PANELIST_REALTIME_VOICE.archy).toBe("sage");
  });

  test("passes through supported realtime voice names", () => {
    expect(resolveRealtimeVoice("akshay", "cedar")).toBe("cedar");
    expect(resolveRealtimeVoice("archy", "sage")).toBe("sage");
  });

  test("falls back when voice is unsupported", () => {
    expect(resolveRealtimeVoice("akshay", "arjun")).toBe("cedar");
    expect(resolveRealtimeVoice("archy", "aarti")).toBe("sage");
  });
});
