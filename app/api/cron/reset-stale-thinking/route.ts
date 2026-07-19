import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { assertCronAuthorized } from "@/lib/cron/auth";
import { resetAllStaleThinkingSessions } from "@/lib/session/session-maintenance";

export const GET = withApiHandler(async (request: Request) => {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const resetCount = await resetAllStaleThinkingSessions();

  return NextResponse.json({ ok: true, resetCount });
});
