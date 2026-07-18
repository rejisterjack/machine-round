import type { EvaluateResponse, WeakTopic } from "@/lib/session/interview-store";
import { prisma } from "@/lib/prisma";

export const reportInclude = {
  answerEvaluations: {
    orderBy: { sequence: "asc" as const },
    include: { redFlags: true },
  },
  improvements: { orderBy: { sequence: "asc" as const } },
  weakTopicTags: true,
  session: {
    include: {
      role: true,
      messages: { orderBy: { sequence: "asc" as const } },
    },
  },
};

export async function getReportByShareToken(shareToken: string) {
  return prisma.readinessReport.findUnique({
    where: { shareToken },
    include: reportInclude,
  });
}

export async function getSessionByPublicId(publicId: string) {
  return prisma.interviewSession.findUnique({
    where: { publicId },
    include: {
      role: true,
      messages: { orderBy: { sequence: "asc" } },
      report: {
        include: {
          answerEvaluations: {
            orderBy: { sequence: "asc" },
            include: { redFlags: true },
          },
          improvements: { orderBy: { sequence: "asc" } },
          weakTopicTags: true,
        },
      },
    },
  });
}

export function reportToEvaluateResponse(
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
  } | null | undefined,
): (EvaluateResponse & {
  shareToken?: string | null;
  weakTopics?: WeakTopic[];
}) | undefined {
  if (!report) return undefined;

  return {
    overallScore: report.overallScore,
    summary: report.summary,
    shareToken: report.shareToken,
    answers: report.answerEvaluations.map((answer) => ({
      question: answer.question,
      answer: answer.answer,
      clarity: answer.clarity,
      structure: answer.structure,
      technicalSignal: answer.technicalSignal,
      redFlags: answer.redFlags.map((flag) => flag.label),
    })),
    improvements: report.improvements.map((item) => item.content),
    weakTopics: report.weakTopicTags.map((tag) => ({
      label: tag.label,
      weight: tag.weight ?? undefined,
    })),
  };
}
