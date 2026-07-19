import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { ReportPdfDocument } from "@/components/report/report-pdf-document";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import {
  getReportByShareToken,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";

const SHARE_PDF_LIMIT = Number(process.env.SHARE_PDF_RATE_LIMIT ?? 20);
const SHARE_PDF_WINDOW_MS = Number(process.env.SHARE_PDF_RATE_WINDOW_MS ?? 60_000);

export const GET = withApiHandler(
  async (
    request: Request,
    context?: { params: Promise<{ token: string }> },
  ) => {
    const { token } = await context!.params;

    const rateLimit = checkRateLimit(
      `share-pdf:${getClientIp(request)}:${token}`,
      { limit: SHARE_PDF_LIMIT, windowMs: SHARE_PDF_WINDOW_MS },
    );
    if (!rateLimit.ok) {
      throw new ApiError(
        "UPSTREAM_ERROR",
        "Too many PDF downloads. Please try again shortly.",
        429,
      );
    }

    const report = await getReportByShareToken(token);

    if (!report) {
      throw new ApiError("NOT_FOUND", "Report not found.", 404);
    }

    const evaluateResponse = reportToEvaluateResponse(report);
    if (!evaluateResponse) {
      throw new ApiError("NOT_FOUND", "Report not found.", 404);
    }

    const buffer = await renderToBuffer(
      <ReportPdfDocument
        report={evaluateResponse}
        roleTitle={report.session.role.title}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="namaste-machine-round-report.pdf"',
      },
    });
  },
);
