import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { isAzureConfigured, isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";

export const GET = withApiHandler(async () => {
  let db = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = await isDbReady();
  } catch {
    db = false;
  }

  const azureConfigured = isAzureConfigured();

  return NextResponse.json({
    ok: azureConfigured,
    db,
    azureConfigured,
  });
});
