import { deleteAsset, isCloudinaryConfigured } from "@/lib/media/cloudinary";
import { prisma } from "@/lib/prisma";

export type SessionMediaCleanupResult = {
  attempted: number;
  deleted: number;
  failed: number;
  skipped: boolean;
};

async function safeDeleteAsset(
  publicId: string,
  resourceType: "image" | "video",
): Promise<boolean> {
  try {
    await deleteAsset(publicId, resourceType);
    return true;
  } catch (error) {
    console.warn("Cloudinary asset delete failed:", publicId, error);
    return false;
  }
}

/**
 * Best-effort delete of Cloudinary media linked to a session.
 * Call before removing the session row from the database.
 */
export async function deleteSessionCloudinaryAssets(
  sessionId: string,
): Promise<SessionMediaCleanupResult> {
  if (!isCloudinaryConfigured()) {
    return { attempted: 0, deleted: 0, failed: 0, skipped: true };
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      audioRecordingId: true,
      screenCaptures: { select: { cloudinaryPublicId: true } },
    },
  });

  if (!session) {
    return { attempted: 0, deleted: 0, failed: 0, skipped: false };
  }

  const jobs: Array<{ publicId: string; resourceType: "image" | "video" }> = [];

  if (session.audioRecordingId) {
    jobs.push({
      publicId: session.audioRecordingId,
      resourceType: "video",
    });
  }

  for (const capture of session.screenCaptures) {
    if (capture.cloudinaryPublicId) {
      jobs.push({
        publicId: capture.cloudinaryPublicId,
        resourceType: "image",
      });
    }
  }

  if (jobs.length === 0) {
    return { attempted: 0, deleted: 0, failed: 0, skipped: false };
  }

  const results = await Promise.all(
    jobs.map((job) => safeDeleteAsset(job.publicId, job.resourceType)),
  );

  const deleted = results.filter(Boolean).length;
  return {
    attempted: jobs.length,
    deleted,
    failed: jobs.length - deleted,
    skipped: false,
  };
}
