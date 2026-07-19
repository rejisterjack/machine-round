import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import {
  buildMediaFolder,
  isCloudinaryConfigured,
  uploadVideo,
} from "@/lib/media/cloudinary";
import {
  assertRecordingUploadAllowed,
  updateSessionRecording,
} from "@/lib/session/media-queries";
import { assertSessionOwner } from "@/lib/session/session-access";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_RECORDING_TYPES = new Set([
  "video/webm",
  "audio/webm",
  "video/mp4",
  "audio/mp4",
]);

export const POST = withApiHandler(
  async (request: Request) => {
    const authSession = await requireAuth();

    if (!isCloudinaryConfigured()) {
      throw new ApiError(
        "INTERNAL_ERROR",
        "Media storage is not configured.",
        503,
      );
    }

    const formData = await request.formData();
    const sessionId = formData.get("sessionId");
    const file = formData.get("recording");
    const durationMsRaw = formData.get("durationMs");
    const mimeType = formData.get("mimeType");

    if (typeof sessionId !== "string" || !sessionId) {
      throw new ApiError("VALIDATION_ERROR", "sessionId is required.", 400);
    }

    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION_ERROR", "recording file is required.", 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Recording exceeds maximum upload size.",
        400,
      );
    }

    const recordingMimeType =
      typeof mimeType === "string" && mimeType ? mimeType : file.type || "video/webm";

    if (
      recordingMimeType &&
      !ALLOWED_RECORDING_TYPES.has(recordingMimeType) &&
      !recordingMimeType.startsWith("video/") &&
      !recordingMimeType.startsWith("audio/")
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Unsupported recording format.",
        400,
      );
    }

    await assertSessionOwner(sessionId, authSession.user.id);

    const uploadState = await assertRecordingUploadAllowed(sessionId);
    if (uploadState.alreadyUploaded) {
      return NextResponse.json({
        recordingUrl: uploadState.recordingUrl,
        durationMs: uploadState.durationMs,
        deduplicated: true,
      });
    }

    await updateSessionRecording(sessionId, { recordingStatus: "pending" });

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const folder = buildMediaFolder(authSession.user.id, sessionId);
      const uploaded = await uploadVideo(buffer, folder, "session-recording");

      const durationMs =
        typeof durationMsRaw === "string" ? Number.parseInt(durationMsRaw, 10) : undefined;

      await updateSessionRecording(sessionId, {
        audioRecordingUrl: uploaded.url,
        audioRecordingId: uploaded.publicId,
        recordingDurationMs:
          durationMs && !Number.isNaN(durationMs)
            ? durationMs
            : uploaded.duration
              ? Math.round(uploaded.duration * 1000)
              : undefined,
        recordingMimeType,
        recordingStatus: "uploaded",
      });

      return NextResponse.json({
        recordingUrl: uploaded.url,
        publicId: uploaded.publicId,
        durationMs:
          durationMs && !Number.isNaN(durationMs)
            ? durationMs
            : uploaded.duration
              ? Math.round(uploaded.duration * 1000)
              : undefined,
      });
    } catch {
      await updateSessionRecording(sessionId, { recordingStatus: "failed" });
      throw new ApiError(
        "INTERNAL_ERROR",
        "Failed to upload session recording.",
        500,
      );
    }
  },
  { timeoutMs: 60_000 },
);
