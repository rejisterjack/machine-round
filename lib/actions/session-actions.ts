"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { auth } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api/errors";
import { isDbReady } from "@/lib/db/ready";
import { deleteSessionCloudinaryAssets } from "@/lib/media/session-media-cleanup";
import { prisma } from "@/lib/prisma";
import { interviewDurationSchema } from "@/lib/session/interview-store";
import { assertSessionOwner } from "@/lib/session/session-access";

const metadataSchema = z.object({
  interviewDuration: interviewDurationSchema.optional(),
});

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("UNAUTHORIZED", "Sign in required.", 401);
  }
  return session.user.id;
}

export async function abandonSessionAction(sessionId: string) {
  const userId = await requireUserId();
  await assertSessionOwner(sessionId, userId);

  if (!(await isDbReady())) {
    return { persisted: false as const };
  }

  const existing = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });

  if (!existing) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  if (existing.status === "completed" || existing.status === "abandoned") {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Cannot abandon a session that is already finished.",
      400,
    );
  }

  await deleteSessionCloudinaryAssets(sessionId);
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status: "abandoned" },
  });

  revalidatePath("/history");
  return { persisted: true as const, status: "abandoned" as const };
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await requireUserId();
  await assertSessionOwner(sessionId, userId);

  if (!(await isDbReady())) {
    throw new ApiError("UPSTREAM_ERROR", "Database is not available.", 503);
  }

  const existing = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  await deleteSessionCloudinaryAssets(sessionId);
  await prisma.interviewSession.delete({ where: { id: sessionId } });

  revalidatePath("/history");
  return { deleted: true as const, id: sessionId };
}

export async function updateSessionMetadataAction(
  sessionId: string,
  input: { interviewDuration?: InterviewDuration },
) {
  const userId = await requireUserId();
  await assertSessionOwner(sessionId, userId);
  const body = metadataSchema.parse(input);

  if (!(await isDbReady())) {
    return { persisted: false as const };
  }

  const session = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      interviewDuration: body.interviewDuration,
    },
    select: { id: true, interviewDuration: true },
  });

  return { persisted: true as const, session };
}
