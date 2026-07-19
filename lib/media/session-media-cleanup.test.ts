import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/media/cloudinary", () => ({
  isCloudinaryConfigured: () => true,
  deleteAsset: mock(async () => {}),
}));

mock.module("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findUnique: mock(async () => ({
        audioRecordingId: "machine-round/user/session/session-recording",
        screenCaptures: [
          { cloudinaryPublicId: "machine-round/user/session/snap-1" },
          { cloudinaryPublicId: "machine-round/user/session/snap-2" },
        ],
      })),
    },
  },
}));

describe("deleteSessionCloudinaryAssets", () => {
  test("deletes recording and all screen capture assets", async () => {
    const { deleteSessionCloudinaryAssets } = await import(
      "@/lib/media/session-media-cleanup"
    );
    const cloudinary = await import("@/lib/media/cloudinary");

    const result = await deleteSessionCloudinaryAssets("session-1");

    expect(result.skipped).toBe(false);
    expect(result.attempted).toBe(3);
    expect(result.deleted).toBe(3);
    expect(result.failed).toBe(0);
    expect(cloudinary.deleteAsset).toHaveBeenCalledTimes(3);
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith(
      "machine-round/user/session/session-recording",
      "video",
    );
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith(
      "machine-round/user/session/snap-1",
      "image",
    );
  });
});
