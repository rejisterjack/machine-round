import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { getReadinessStatus } from "@/lib/ops/readiness";

export const GET = withApiHandler(async () => {
  const status = await getReadinessStatus();
  return NextResponse.json(status);
});
