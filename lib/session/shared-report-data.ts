import {
  getReportByShareToken,
  reportToEvaluateResponse,
} from "@/lib/session/report-queries";
import type { EvaluateResponse } from "@/lib/session/interview-store";

export type SharedReportData = EvaluateResponse & {
  roleTitle: string;
  publicId: string;
  generatedAt: string;
  shareToken: string;
};

export async function loadSharedReportData(
  token: string,
): Promise<SharedReportData | null> {
  const report = await getReportByShareToken(token);
  if (!report) return null;

  const payload = reportToEvaluateResponse(report);
  if (!payload) return null;

  return {
    ...payload,
    roleTitle: report.session.role.title,
    publicId: report.session.publicId,
    generatedAt: report.generatedAt.toISOString(),
    shareToken: token,
  };
}
