#!/usr/bin/env bun
import "dotenv/config";
import { purgeOrphanedCloudinaryAssets } from "@/lib/media/cloudinary-orphan-purge";

const apply = process.argv.includes("--apply");

async function main() {
  const result = await purgeOrphanedCloudinaryAssets({ dryRun: !apply });

  console.log(
    apply ? "Cloudinary orphan purge (applied)" : "Cloudinary orphan purge (dry run)",
  );
  console.log(`Scanned: ${result.scanned}`);
  console.log(`Orphaned: ${result.orphaned}`);
  if (apply) {
    console.log(`Deleted: ${result.deleted}`);
    console.log(`Failed: ${result.failed}`);
  } else {
    console.log("Run with --apply to delete orphaned assets.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
