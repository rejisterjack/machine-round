import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { assertCronAuthorized } from "@/lib/cron/auth";
import { purgeOrphanedCloudinaryAssets } from "@/lib/media/cloudinary-orphan-purge";

export const GET = withApiHandler(async (request: Request) => {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const result = await purgeOrphanedCloudinaryAssets({ dryRun: false });

  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    orphaned: result.orphaned,
    deleted: result.deleted,
    failed: result.failed,
  });
});
