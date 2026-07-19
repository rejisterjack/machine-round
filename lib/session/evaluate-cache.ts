import type { EvaluateResponse } from "@/lib/session/interview-store";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";

export type SavedReadinessReport = {
  overallScore: number;
  summary: string;
  shareToken: string | null;
  answerEvaluations: Array<{
    question: string;
    answer: string;
    clarity: number;
    structure: number;
    technicalSignal: number;
    redFlags: Array<{ label: string }>;
  }>;
  improvements: Array<{ content: string }>;
  weakTopicTags: Array<{ label: string; weight: number | null }>;
  screenReviewNotes?: string[];
};

type CachedSession = {
  report: SavedReadinessReport | null;
};

export type EvaluatePayload = EvaluateResponse & {
  shareToken?: string | null;
};

function mapWeakTopics(
  tags: SavedReadinessReport["weakTopicTags"] | undefined,
) {
  return (tags ?? []).map((tag) => ({
    label: tag.label,
    weight: tag.weight ?? undefined,
  }));
}

export function buildCachedEvaluatePayload(
  session: CachedSession,
): EvaluatePayload | null {
  if (!session.report) {
    return null;
  }

  const cached = reportToEvaluateResponse(session.report);
  if (!cached) {
    return null;
  }

  return {
    ...cached,
    shareToken: session.report.shareToken,
    weakTopics: mapWeakTopics(session.report.weakTopicTags),
  };
}

/** Build API payload from a persisted report — always includes shareToken. */
export function buildEvaluatePayloadFromSavedReport(
  report: SavedReadinessReport,
): EvaluatePayload {
  const payload = buildCachedEvaluatePayload({ report });
  if (payload) {
    return payload;
  }

  const fallback = reportToEvaluateResponse(report);
  if (!fallback) {
    throw new Error("Saved readiness report could not be serialized.");
  }

  return {
    ...fallback,
    shareToken: report.shareToken,
    weakTopics: mapWeakTopics(report.weakTopicTags),
  };
}
