import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  assertRecordingUploadAllowed,
  updateSessionRecording,
} from "@/lib/session/media-queries";
import { assertSessionOwner } from "@/lib/session/session-access";

export const maxDuration = 60;

const confirmSchema = z.object({
  sessionId: z.string(),
  publicId: z.string(),
  recordingUrl: z.string().url(),
  durationMs: z.number().int().min(0).optional(),
  mimeType: z.string().optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = confirmSchema.parse(await request.json());
  await assertSessionOwner(body.sessionId, authSession.user.id);

  const uploadState = await assertRecordingUploadAllowed(body.sessionId);
  if (uploadState.alreadyUploaded) {
    return NextResponse.json({
      recordingUrl: uploadState.recordingUrl,
      durationMs: uploadState.durationMs,
      deduplicated: true,
    });
  }

  await updateSessionRecording(body.sessionId, {
    audioRecordingUrl: body.recordingUrl,
    audioRecordingId: body.publicId,
    recordingDurationMs: body.durationMs,
    recordingMimeType: body.mimeType ?? "video/webm",
    recordingStatus: "uploaded",
  });

  return NextResponse.json({
    recordingUrl: body.recordingUrl,
    publicId: body.publicId,
    durationMs: body.durationMs,
  });
}, { timeoutMs: 60_000 });
