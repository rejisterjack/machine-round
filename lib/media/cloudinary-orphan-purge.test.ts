import { describe, expect, test } from "bun:test";
import { extractSessionIdFromPublicId } from "@/lib/media/cloudinary-paths";

describe("extractSessionIdFromPublicId", () => {
  test("parses session id from nested public id", () => {
    expect(
      extractSessionIdFromPublicId(
        "machine-round/user-1/cm123abc/session-recording",
      ),
    ).toBe("cm123abc");
    expect(
      extractSessionIdFromPublicId(
        "machine-round/user-1/cm123abc/snap-001",
      ),
    ).toBe("cm123abc");
  });

  test("returns null for unrelated paths", () => {
    expect(extractSessionIdFromPublicId("other-folder/asset")).toBeNull();
  });
});
