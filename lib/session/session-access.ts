import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export {
  MAX_OBSERVATION_SUMMARY_CHARS,
  MAX_SCREEN_OBSERVATIONS,
  MAX_SCREEN_SNAPSHOTS,
  SCREEN_ANALYZE_INTERVAL_MS,
} from "@/lib/session/session-limits";

export async function assertSessionOwner(sessionId: string, userId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });

  if (!session) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  if (!session.userId || session.userId !== userId) {
    throw new ApiError("UNAUTHORIZED", "You do not have access to this session.", 403);
  }

  return session;
}

export async function assertSessionOwnerByPublicId(
  publicId: string,
  userId: string,
) {
  const session = await prisma.interviewSession.findUnique({
    where: { publicId },
    select: { id: true, userId: true },
  });

  if (!session) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  if (!session.userId || session.userId !== userId) {
    throw new ApiError("UNAUTHORIZED", "You do not have access to this session.", 403);
  }

  return session;
}

export async function assertSessionOwnerIfPresent(
  sessionId: string | undefined,
  userId: string,
) {
  if (!sessionId) return;
  await assertSessionOwner(sessionId, userId);
}

