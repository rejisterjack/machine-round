import { ApiError } from "@/lib/api/errors";
import { getSessionMediaForReplay } from "@/lib/session/media-queries";
import { buildReplayPayload } from "@/lib/session/replay-payload";
import {
  getReportByShareToken,
  getSessionByPublicId,
} from "@/lib/session/report-queries";
import { assertSessionOwnerByPublicId } from "@/lib/session/session-access";

export type ReplayPayload = ReturnType<typeof buildReplayPayload>;

export async function loadReplayPayload(input: {
  publicId: string;
  userId?: string;
  shareToken?: string | null;
}): Promise<ReplayPayload | null> {
  let authorizedByShare = false;

  if (input.shareToken) {
    const report = await getReportByShareToken(input.shareToken);
    if (report?.session.publicId === input.publicId) {
      authorizedByShare = true;
    }
  }

  if (!authorizedByShare) {
    if (!input.userId) {
      throw new ApiError("UNAUTHORIZED", "Sign in required.", 401);
    }
    await assertSessionOwnerByPublicId(input.publicId, input.userId);
  }

  const session = await getSessionByPublicId(input.publicId);
  if (!session) {
    return null;
  }

  const media = await getSessionMediaForReplay(session.id);
  return buildReplayPayload(session, media);
}
