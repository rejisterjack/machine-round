import type { RecordingStatus, RoleSlug, SessionStatus } from "@/generated/client";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import {
  MAX_SCREEN_OBSERVATIONS,
  MAX_SCREEN_SNAPSHOTS,
  SCREEN_ANALYZE_INTERVAL_MS,
} from "@/lib/session/session-limits";

const STALE_PENDING_RECORDING_MS = 5 * 60 * 1000;

export async function countScreenCaptures(sessionId: string) {
  return prisma.sessionScreenCapture.count({ where: { sessionId } });
}

export async function countScreenObservations(sessionId: string) {
  return prisma.sessionScreenObservation.count({ where: { sessionId } });
}

export async function assertSnapshotSlotAvailable(sessionId: string) {
  const count = await countScreenCaptures(sessionId);
  if (count >= MAX_SCREEN_SNAPSHOTS) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Maximum of ${MAX_SCREEN_SNAPSHOTS} snapshots per session.`,
      400,
    );
  }
}

export async function assertScreenObservationCapacity(sessionId: string) {
  const count = await countScreenObservations(sessionId);
  if (count >= MAX_SCREEN_OBSERVATIONS) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Maximum of ${MAX_SCREEN_OBSERVATIONS} screen observations per session.`,
      400,
    );
  }
}

export async function tryAcquireScreenAnalyzeSlot(sessionId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.interviewSession.findUnique({
      where: { id: sessionId },
      select: { lastScreenAnalyzeAt: true },
    });

    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    const now = new Date();
    if (
      session.lastScreenAnalyzeAt &&
      now.getTime() - session.lastScreenAnalyzeAt.getTime() <
        SCREEN_ANALYZE_INTERVAL_MS
    ) {
      return false;
    }

    await tx.interviewSession.update({
      where: { id: sessionId },
      data: { lastScreenAnalyzeAt: now },
    });

    return true;
  });

  return result;
}

export async function createScreenCaptureIfUnderLimit(input: {
  sessionId: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  summary?: string;
  questionSequence?: number;
  capturedAt?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.sessionScreenCapture.count({
      where: { sessionId: input.sessionId },
    });

    if (count >= MAX_SCREEN_SNAPSHOTS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Maximum of ${MAX_SCREEN_SNAPSHOTS} snapshots per session.`,
        400,
      );
    }

    return tx.sessionScreenCapture.create({ data: input });
  });
}

export async function createScreenCapture(input: {
  sessionId: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  summary?: string;
  questionSequence?: number;
  capturedAt?: Date;
}) {
  return createScreenCaptureIfUnderLimit(input);
}

export async function createScreenObservationIfUnderLimit(input: {
  sessionId: string;
  summary: string;
  timestamp: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.sessionScreenObservation.count({
      where: { sessionId: input.sessionId },
    });

    if (count >= MAX_SCREEN_OBSERVATIONS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Maximum of ${MAX_SCREEN_OBSERVATIONS} screen observations per session.`,
        400,
      );
    }

    return tx.sessionScreenObservation.create({ data: input });
  });
}

export async function createScreenObservation(input: {
  sessionId: string;
  summary: string;
  timestamp: Date;
}) {
  return createScreenObservationIfUnderLimit(input);
}

export async function getScreenObservations(sessionId: string) {
  return prisma.sessionScreenObservation.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });
}

export async function getSessionRecordingState(sessionId: string) {
  return prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      recordingStatus: true,
      audioRecordingUrl: true,
      audioRecordingId: true,
      recordingDurationMs: true,
      updatedAt: true,
    },
  });
}

export async function assertRecordingUploadAllowed(sessionId: string) {
  const session = await getSessionRecordingState(sessionId);

  if (!session) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  if (session.recordingStatus === "uploaded" && session.audioRecordingUrl) {
    return {
      alreadyUploaded: true as const,
      recordingUrl: session.audioRecordingUrl,
      durationMs: session.recordingDurationMs ?? undefined,
    };
  }

  if (session.recordingStatus === "pending") {
    const pendingAgeMs = Date.now() - session.updatedAt.getTime();
    if (pendingAgeMs < STALE_PENDING_RECORDING_MS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Recording upload already in progress.",
        409,
      );
    }
  }

  return { alreadyUploaded: false as const };
}

export async function updateSessionRecording(
  sessionId: string,
  data: {
    audioRecordingUrl?: string;
    audioRecordingId?: string;
    recordingDurationMs?: number;
    recordingMimeType?: string;
    recordingStatus?: RecordingStatus;
  },
) {
  return prisma.interviewSession.update({
    where: { id: sessionId },
    data,
  });
}

export async function getUserSessions(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: SessionStatus;
    roleSlug?: RoleSlug;
    q?: string;
  } = {},
) {
  const limit = options.limit ?? 20;
  const offset = Math.max(0, options.offset ?? 0);

  const where: {
    userId: string;
    status?: SessionStatus;
    role?: { slug?: RoleSlug; title?: { contains: string; mode: "insensitive" } };
  } = { userId };

  if (options.status) {
    where.status = options.status;
  }

  if (options.roleSlug) {
    where.role = { slug: options.roleSlug };
  }

  if (options.q?.trim()) {
    where.role = {
      ...where.role,
      title: { contains: options.q.trim(), mode: "insensitive" },
    };
  }

  const [sessions, total] = await Promise.all([
    prisma.interviewSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        role: true,
        report: { select: { overallScore: true } },
        _count: { select: { screenCaptures: true } },
      },
    }),
    prisma.interviewSession.count({ where }),
  ]);

  return { sessions, total };
}

export async function getSessionMediaForReplay(sessionId: string) {
  const [captures, observations, session] = await Promise.all([
    prisma.sessionScreenCapture.findMany({
      where: { sessionId },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.sessionScreenObservation.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    }),
    prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: {
        audioRecordingUrl: true,
        recordingDurationMs: true,
        recordingStatus: true,
        panelistMode: true,
        report: { select: { screenReviewNotes: true } },
      },
    }),
  ]);

  return { captures, observations, session };
}
