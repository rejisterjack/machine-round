import { NextResponse } from "next/server";
import { isPanelistId } from "@/lib/ai/personas/panelists";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import {
  getSessionByPublicId,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";

export const GET = withApiHandler(
  async (
    _request: Request,
    context?: { params: Promise<{ publicId: string }> },
  ) => {
    const { publicId } = await context!.params;
    const session = await getSessionByPublicId(publicId);

    if (!session) {
      throw new ApiError("NOT_FOUND", "Session not found.", 404);
    }

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      status: session.status,
      questionCount: session.questionCount,
      topicsCovered: session.topicsCovered,
      weakSignals: session.weakSignals,
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
