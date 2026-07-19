import { NextResponse } from "next/server";

export function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

export function assertCronAuthorized(request: Request): NextResponse | null {
  const secret = getCronSecret();
  if (!secret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
