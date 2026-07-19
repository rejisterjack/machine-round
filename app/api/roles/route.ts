import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { listRoles } from "@/lib/session/roles";

export const GET = withApiHandler(async () => {
  await requireAuth();
  const roles = await listRoles();
  return NextResponse.json({ roles });
});
