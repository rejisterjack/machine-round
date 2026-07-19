import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { assertRateLimit, rateLimitKey } from "@/lib/api/assert-rate-limit";
import { ReportPdfDocument } from "@/components/report/report-pdf-document";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";
import { assertSessionOwner } from "@/lib/session/session-access";

const pdfRequestSchema = z.object({
  sessionId: z.string(),
  roleTitle: z.string().optional(),
});


export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  assertRateLimit(
    request,
    rateLimitKey(request, ["pdf", authSession.user.id]),
    { limit: 20, windowMs: 60_000 },
  );

  const body = pdfRequestSchema.parse(await request.json());
  await assertSessionOwner(body.sessionId, authSession.user.id);

  const session = await getInterviewSessionById(body.sessionId);
  if (!session?.report) {
    throw new ApiError(
      "NOT_FOUND",
      "No saved report found for this session.",
      404,
    );
  }

  const report = reportToEvaluateResponse(session.report);
  if (!report) {
    throw new ApiError(
      "NOT_FOUND",
      "Could not load report for PDF export.",
      404,
    );
  }

  const buffer = await renderToBuffer(
    <ReportPdfDocument
      report={report}
      roleTitle={body.roleTitle ?? session.role.title}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="namaste-machine-round-report.pdf"',
    },
  });
});
