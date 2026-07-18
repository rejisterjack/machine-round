import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ReportPdfDocument } from "@/components/report/report-pdf-document";
import { withApiHandler } from "@/lib/api/handler";
import {
  evaluateResponseSchema,
  type EvaluateResponse,
} from "@/lib/session/interview-store";

const pdfRequestSchema = evaluateResponseSchema.extend({
  roleTitle: z.string().optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  const body = pdfRequestSchema.parse(await request.json());
  const { roleTitle, ...report } = body as EvaluateResponse & {
    roleTitle?: string;
  };

  const buffer = await renderToBuffer(
    <ReportPdfDocument report={report} roleTitle={roleTitle} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="namaste-machine-round-report.pdf"',
    },
  });
});
