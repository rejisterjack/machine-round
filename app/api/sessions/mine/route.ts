import { NextResponse } from "next/server";
import type { SessionStatus } from "@/generated/client";
import { requireAuth } from "@/lib/auth/require-auth";
import { withApiHandler } from "@/lib/api/handler";
import { serializeHistorySession } from "@/lib/session/history-serialization";
import { getUserSessions } from "@/lib/session/media-queries";
import { countPendingReports, resetStaleThinkingSessions } from "@/lib/session/session-maintenance";
import { roleIdToSlug } from "@/lib/session/role-slug";

const SESSION_STATUSES = new Set<SessionStatus>([
  "active",
  "thinking",
  "completed",
  "abandoned",
  "error",
]);

export const GET = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const statusParam = url.searchParams.get("status");
  const roleId = url.searchParams.get("roleId");
  const q = url.searchParams.get("q") ?? undefined;

  const safeLimit = Number.isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 50);
  const safeOffset = Number.isNaN(offset) ? 0 : Math.max(offset, 0);

  await resetStaleThinkingSessions(authSession.user.id);

  const status =
    statusParam && SESSION_STATUSES.has(statusParam as SessionStatus)
      ? (statusParam as SessionStatus)
      : undefined;

  const roleSlug = roleId ? roleIdToSlug(roleId) : null;
  if (roleId && !roleSlug) {
    return NextResponse.json({ sessions: [], total: 0, limit: safeLimit, offset: safeOffset });
  }

  const { sessions, total } = await getUserSessions(authSession.user.id, {
    limit: safeLimit,
    offset: safeOffset,
    status,
    roleSlug: roleSlug ?? undefined,
    q,
  });

  const pendingReportCount = await countPendingReports(authSession.user.id);

  return NextResponse.json({
    sessions: sessions.map(serializeHistorySession),
    total,
    pendingReportCount,
    limit: safeLimit,
    offset: safeOffset,
  });
});
