import { reportToEvaluateResponse } from "@/lib/session/report-queries";

type CachedSession = {
  report: {
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
  } | null;
};

export function buildCachedEvaluatePayload(session: CachedSession) {
  const cached = reportToEvaluateResponse(session.report);
  if (!cached || !session.report) {
    return null;
  }

  return {
    ...cached,
    shareToken: session.report.shareToken,
    weakTopics: session.report.weakTopicTags.map((tag) => ({
      label: tag.label,
      weight: tag.weight,
    })),
  };
}
