import { describe, expect, test } from "bun:test";
import { getAnnouncementCopy } from "@/lib/voice/realtime-announcements";

describe("realtime-announcements", () => {
  test("provides reconnect copy", () => {
    expect(getAnnouncementCopy("reconnecting")).toContain("reconnecting");
    expect(getAnnouncementCopy("reconnect_failed")).toContain("Retry voice");
  });
});
