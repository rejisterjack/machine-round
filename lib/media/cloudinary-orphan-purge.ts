import {
  deleteAsset,
  isCloudinaryConfigured,
  listResourcesByPrefix,
  type CloudinaryResourceSummary,
} from "@/lib/media/cloudinary";
import {
  extractSessionIdFromPublicId,
  MACHINE_ROUND_MEDIA_ROOT,
} from "@/lib/media/cloudinary-paths";
import { prisma } from "@/lib/prisma";

const MEDIA_ROOT = MACHINE_ROUND_MEDIA_ROOT;

export { extractSessionIdFromPublicId };

export async function listMachineRoundCloudinaryAssets(): Promise<
  CloudinaryResourceSummary[]
> {
  const [images, videos] = await Promise.all([
    listResourcesByPrefix(MEDIA_ROOT, "image"),
    listResourcesByPrefix(MEDIA_ROOT, "video"),
  ]);
  return [...images, ...videos];
}

export type OrphanPurgeResult = {
  scanned: number;
  orphaned: number;
  deleted: number;
  failed: number;
  dryRun: boolean;
};

/**
 * Delete Cloudinary assets whose session folder no longer exists in the database.
 */
export async function purgeOrphanedCloudinaryAssets(options?: {
  dryRun?: boolean;
}): Promise<OrphanPurgeResult> {
  const dryRun = options?.dryRun ?? true;

  if (!isCloudinaryConfigured()) {
    return { scanned: 0, orphaned: 0, deleted: 0, failed: 0, dryRun };
  }

  const assets = await listMachineRoundCloudinaryAssets();
  const sessionIds = [
    ...new Set(
      assets
        .map((asset) => extractSessionIdFromPublicId(asset.publicId))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const existing = await prisma.interviewSession.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((session) => session.id));

  const orphaned = assets.filter((asset) => {
    const sessionId = extractSessionIdFromPublicId(asset.publicId);
    return sessionId ? !existingIds.has(sessionId) : false;
  });

  if (dryRun) {
    return {
      scanned: assets.length,
      orphaned: orphaned.length,
      deleted: 0,
      failed: 0,
      dryRun: true,
    };
  }

  let deleted = 0;
  let failed = 0;

  for (const asset of orphaned) {
    try {
      await deleteAsset(asset.publicId, asset.resourceType);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    scanned: assets.length,
    orphaned: orphaned.length,
    deleted,
    failed,
    dryRun: false,
  };
}
