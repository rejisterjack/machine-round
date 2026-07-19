import { NextResponse } from "next/server";
import { isPanelistId } from "@/lib/ai/personas/panelists";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSessionMediaForReplay } from "@/lib/session/media-queries";
import {
  getSessionByPublicId,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";
import { assertSessionOwnerByPublicId } from "@/lib/session/session-access";

export const GET = withApiHandler(
  async (
    _request: Request,
    context?: { params: Promise<{ publicId: string }> },
  ) => {
    const authSession = await requireAuth();
    const { publicId } = await context!.params;
    await assertSessionOwnerByPublicId(publicId, authSession.user.id);

    const session = await getSessionByPublicId(publicId);

    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    const media = await getSessionMediaForReplay(session.id);

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      status: session.status,
      panelistMode: session.panelistMode,
      questionCount: session.questionCount,
      topicsCovered: session.topicsCovered,
      weakSignals: session.weakSignals,
      audioRecordingUrl: media.session?.audioRecordingUrl ?? undefined,
      recordingDurationMs: media.session?.recordingDurationMs ?? undefined,
      screenCaptures: media.captures.map((capture) => ({
        url: capture.cloudinaryUrl,
        publicId: capture.cloudinaryPublicId,
        summary: capture.summary,
        capturedAt: capture.capturedAt.toISOString(),
        questionSequence: capture.questionSequence,
      })),
      screenReviewNotes:
        media.session?.report?.screenReviewNotes ??
        media.observations.map((observation) => observation.summary),
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        speaker:
          message.speakerName && isPanelistId(message.speakerName)
            ? message.speakerName
            : undefined,
      })),
      report: reportToEvaluateResponse(session.report),
      shareToken: session.report?.shareToken ?? null,
    });
  },
);
