import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { parseJson } from "@/lib/api/validate";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  buildMediaFolder,
  createDirectUploadSignature,
  isCloudinaryConfigured,
} from "@/lib/media/cloudinary";
import { assertSessionOwner } from "@/lib/session/session-access";


const signatureSchema = z.object({
  sessionId: z.string(),
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

  const body = await parseJson(request, signatureSchema);
  await assertSessionOwner(body.sessionId, authSession.user.id);

  const folder = buildMediaFolder(authSession.user.id, body.sessionId);
  const signature = createDirectUploadSignature(folder);

  return NextResponse.json(signature);
});
