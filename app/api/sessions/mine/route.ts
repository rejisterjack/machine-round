import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { withApiHandler } from "@/lib/api/handler";
import { getUserSessions } from "@/lib/session/media-queries";
import { roleSlugToId } from "@/lib/session/role-slug";

export const GET = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);

  const safeLimit = Number.isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 50);
  const safeOffset = Number.isNaN(offset) ? 0 : Math.max(offset, 0);

  const { sessions, total } = await getUserSessions(authSession.user.id, {
    limit: safeLimit,
    offset: safeOffset,
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      roleId: roleSlugToId(session.role.slug),
      panelistMode: session.panelistMode,
      status: session.status,
      questionCount: session.questionCount,
      overallScore: session.report?.overallScore ?? null,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      hasRecording: session.recordingStatus === "uploaded" && Boolean(session.audioRecordingUrl),
      recordingStatus: session.recordingStatus,
      snapshotCount: session._count.screenCaptures,
    })),
    total,
    limit: safeLimit,
    offset: safeOffset,
  });
});
