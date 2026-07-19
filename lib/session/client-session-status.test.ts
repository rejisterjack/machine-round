import { describe, expect, test } from "bun:test";
import { mapDbSessionStatusToClient } from "@/lib/session/client-session-status";

describe("mapDbSessionStatusToClient", () => {
  test("maps completed to complete", () => {
    expect(mapDbSessionStatusToClient("completed")).toBe("complete");
  });

  test("preserves in-progress and terminal DB statuses", () => {
    expect(mapDbSessionStatusToClient("thinking")).toBe("thinking");
    expect(mapDbSessionStatusToClient("error")).toBe("error");
    expect(mapDbSessionStatusToClient("active")).toBe("active");
    expect(mapDbSessionStatusToClient("abandoned")).toBe("abandoned");
  });

  test("falls back to idle for unknown values", () => {
    expect(mapDbSessionStatusToClient(undefined)).toBe("idle");
    expect(mapDbSessionStatusToClient("unknown")).toBe("idle");
  });
});
