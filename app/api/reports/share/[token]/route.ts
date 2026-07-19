import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import {
  getReportByShareToken,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";

export const GET = withApiHandler(
  async (
    _request: Request,
    context?: { params: Promise<{ token: string }> },
  ) => {
    const { token } = await context!.params;
    const report = await getReportByShareToken(token);

    if (!report) {
      throw new ApiError("NOT_FOUND", "Report not found.", 404);
    }

    return NextResponse.json({
      roleTitle: report.session.role.title,
      publicId: report.session.publicId,
      generatedAt: report.generatedAt,
      ...reportToEvaluateResponse(report),
    });
  },
);
