import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import {
  buildMediaFolder,
  deleteAsset,
  isCloudinaryConfigured,
  uploadImage,
} from "@/lib/media/cloudinary";
import {
  isImageBase64WithinLimit,
  MAX_IMAGE_BASE64_CHARS,
} from "@/lib/media/image-payload";
import {
  assertSnapshotSlotAvailable,
  createScreenCaptureIfUnderLimit,
} from "@/lib/session/media-queries";
import { assertSessionOwner } from "@/lib/session/session-access";

const bodySchema = z.object({
  sessionId: z.string(),
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
  capturedAt: z.string().datetime().optional(),
  questionSequence: z.number().int().min(0).optional(),
  summary: z.string().max(2000).optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();

  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Media storage is not configured.",
      503,
    );
  }

  const body = bodySchema.parse(await request.json());

  if (!isImageBase64WithinLimit(body.imageBase64)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Image payload exceeds maximum allowed size.",
      400,
    );
  }

  await assertSessionOwner(body.sessionId, authSession.user.id);
  await assertSnapshotSlotAvailable(body.sessionId);

  const folder = buildMediaFolder(authSession.user.id, body.sessionId);
  const uploaded = await uploadImage(body.imageBase64, folder);

  try {
    const capture = await createScreenCaptureIfUnderLimit({
      sessionId: body.sessionId,
      cloudinaryUrl: uploaded.url,
      cloudinaryPublicId: uploaded.publicId,
      summary: body.summary,
      questionSequence: body.questionSequence,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : undefined,
    });

    return NextResponse.json({
      id: capture.id,
      url: capture.cloudinaryUrl,
      publicId: capture.cloudinaryPublicId,
    });
  } catch (error) {
    try {
      await deleteAsset(uploaded.publicId, "image");
    } catch {
      // Best-effort cleanup for orphaned uploads.
    }

    if (error instanceof ApiError && error.status === 400) {
      throw error;
    }

    throw new ApiError(
      "INTERNAL_ERROR",
      "Failed to save screen snapshot.",
      500,
    );
  }
});
