import { NextResponse } from "next/server";
import { assertRateLimit, rateLimitKey } from "@/lib/api/assert-rate-limit";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { loadSharedReportData } from "@/lib/queries/reports";


export const GET = withApiHandler(
  async (
    request: Request,
    context?: { params: Promise<{ token: string }> },
  ) => {
    const { token } = await context!.params;

    assertRateLimit(request, rateLimitKey(request, ["share-get", token]), {
      limit: 60,
      windowMs: 60_000,
    });

    const report = await loadSharedReportData(token);

    if (!report) {
      throw new ApiError("NOT_FOUND", "Report not found.", 404);
    }

    return NextResponse.json({
      roleTitle: report.roleTitle,
      publicId: report.publicId,
      generatedAt: report.generatedAt,
      overallScore: report.overallScore,
      summary: report.summary,
      answers: report.answers,
      improvements: report.improvements,
      weakTopics: report.weakTopics,
      screenReviewNotes: report.screenReviewNotes,
      shareToken: report.shareToken,
    });
  },
);
