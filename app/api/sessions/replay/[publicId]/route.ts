import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSessionMediaForReplay } from "@/lib/session/media-queries";
import { buildReplayPayload } from "@/lib/session/replay-payload";
import {
  getReportByShareToken,
  getSessionByPublicId,
} from "@/lib/session/report-queries";
import { assertSessionOwnerByPublicId } from "@/lib/session/session-access";

export const GET = withApiHandler(
  async (
    request: Request,
    context?: { params: Promise<{ publicId: string }> },
  ) => {
    const { publicId } = await context!.params;
    const shareToken = new URL(request.url).searchParams.get("shareToken");

    let authorizedByShare = false;
    if (shareToken) {
      const report = await getReportByShareToken(shareToken);
      if (report?.session.publicId === publicId) {
        authorizedByShare = true;
      }
    }

    if (!authorizedByShare) {
      const authSession = await requireAuth();
      await assertSessionOwnerByPublicId(publicId, authSession.user.id);
    }

    const session = await getSessionByPublicId(publicId);

    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    const media = await getSessionMediaForReplay(session.id);

    return NextResponse.json(buildReplayPayload(session, media));
  },
);
