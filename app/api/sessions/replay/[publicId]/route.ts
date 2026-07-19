import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { loadReplayPayload } from "@/lib/queries/replay";


export const GET = withApiHandler(
  async (
    request: Request,
    context?: { params: Promise<{ publicId: string }> },
  ) => {
    const { publicId } = await context!.params;
    const shareToken = new URL(request.url).searchParams.get("shareToken");

    let userId: string | undefined;
    if (!shareToken) {
      const authSession = await requireAuth();
      userId = authSession.user.id;
    }

    const payload = await loadReplayPayload({
      publicId,
      shareToken,
      userId,
    });

    if (!payload) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    return NextResponse.json(payload);
  },
);
