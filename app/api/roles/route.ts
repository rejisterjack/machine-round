import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { listRoles } from "@/lib/session/roles";

export const GET = withApiHandler(async () => {
  const roles = await listRoles();
  return NextResponse.json({ roles });
});
