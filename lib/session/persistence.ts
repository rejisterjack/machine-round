import type {
  InputMode,
  InterviewDuration,
  MessageRole,
  PanelistMode,
  SessionStatus,
  TrackMode,
  WeakSignalType,
} from "@/generated/client";
import { Prisma } from "@/generated/client";
import type {
  EvaluateResponse,
  InterviewMessage,
  WeakTopic,
} from "@/lib/session/interview-store";
import { computeQuestionCount } from "@/lib/interview/question-counter";
import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";
import { ApiError } from "@/lib/api/errors";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";
import { findRoleRecordBySlug } from "@/lib/session/find-role-record";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";
import { roleIdToSlug } from "@/lib/session/role-slug";

export { reportToEvaluateResponse };

function mapWeakSignalType(label: string): WeakSignalType {
  const normalized = label.toLowerCase();
  if (normalized.includes("rambl")) return "rambling";
  if (normalized.includes("vague")) return "vague_claim";
  if (normalized.includes("example")) return "no_example";
  if (normalized.includes("topic")) return "off_topic";
  return "other";
}

function buildWeakTopics(
  report: EvaluateResponse,
  sessionWeakSignals: string[] = [],
): WeakTopic[] {
  if (report.weakTopics?.length) {
    return report.weakTopics;
  }

  const labels = new Set<string>();
  for (const signal of sessionWeakSignals) {
    if (signal.trim()) labels.add(signal.trim());
  }
  for (const answer of report.answers) {
    for (const flag of answer.redFlags) {
      if (flag.trim()) labels.add(flag.trim());
    }
  }

  return Array.from(labels).map((label, index) => ({
    label,
    weight: Math.max(0.3, 1 - index * 0.15),
  }));
}

export async function createInterviewSession(input: {
  roleId: string;
  inputMode?: InputMode;
  panelistMode?: PanelistMode;
  interviewDuration?: InterviewDuration;
  trackMode?: TrackMode;
  promptContext?: string;
  jobDescriptionSummary?: string;
  interviewRoundId?: string;
  interviewRoundTitle?: string;
  userId?: string;
}) {
  if (!(await isDbReady())) {
    return null;
  }

  const slug = roleIdToSlug(input.roleId);
  if (!slug) {
    throw new ApiError("VALIDATION_ERROR", `Unknown role: ${input.roleId}`, 400);
  }

  const role = await findRoleRecordBySlug(slug);
  if (!role) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Role "${input.roleId}" is not in the database. Run: bun run db:seed`,
      400,
    );
  }

  const trackMode = input.trackMode ?? "namaste_course";

  try {
    return await prisma.interviewSession.create({
      data: {
        roleId: role.id,
        inputMode: input.inputMode ?? "voice",
        panelistMode: input.panelistMode ?? "both",
        interviewDuration: input.interviewDuration ?? "minutes_30",
        trackMode,
        promptContext: input.promptContext,
        jobDescriptionSummary: input.jobDescriptionSummary,
        interviewRoundId: input.interviewRoundId,
        interviewRoundTitle: input.interviewRoundTitle,
        status: "active",
        userId: input.userId,
      },
      include: { role: true },
    });
  } catch (error) {
    if (
      trackMode !== "namaste_course" &&
      error instanceof Error &&
      error.message.includes("trackMode")
    ) {
      const session = await prisma.interviewSession.create({
        data: {
          roleId: role.id,
          inputMode: input.inputMode ?? "voice",
          panelistMode: input.panelistMode ?? "both",
          interviewDuration: input.interviewDuration ?? "minutes_30",
          trackMode: "namaste_course",
          promptContext: input.promptContext,
          jobDescriptionSummary: input.jobDescriptionSummary,
          interviewRoundId: input.interviewRoundId,
          interviewRoundTitle: input.interviewRoundTitle,
          status: "active",
          userId: input.userId,
        },
        include: { role: true },
      });

      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE interview_sessions
          SET "trackMode" = ${trackMode}::"TrackMode"
          WHERE id = ${session.id}
        `,
      );

      return prisma.interviewSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { role: true },
      });
    }

    throw error;
  }
}

export async function getInterviewSessionById(sessionId: string) {
  if (!(await isDbReady())) return null;

  return prisma.interviewSession.findUnique({
    where: { id: sessionId },
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

export async function appendInterviewMessages(
  sessionId: string,
  messages: InterviewMessage[],
  options?: {
    referencedAnswer?: string;
    clientSyncId?: string;
    questionCount?: number;
    topicsCovered?: string[];
    weakSignals?: string[];
    status?: SessionStatus;
    lastError?: string | null;
    completedAt?: Date | null;
    inputMode?: InputMode;
  },
) {
  if (!(await isDbReady())) return;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      messages: {
        select: { sequence: true },
        orderBy: { sequence: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const startSequence = session.messages[0]?.sequence ?? -1;
  const data = messages.map((message, index) => ({
    sessionId,
    role: message.role as MessageRole,
    content: message.content,
    sequence: startSequence + index + 1,
    speakerName: message.speaker,
    clientSyncId:
      index === messages.length - 1 ? options?.clientSyncId : undefined,
    referencedAnswer:
      index === messages.length - 1 && message.role === "assistant"
        ? options?.referencedAnswer
        : undefined,
  }));

  const updateData: {
    questionCount?: number;
    topicsCovered?: string[];
    weakSignals?: string[];
    status?: SessionStatus;
    lastError?: string | null;
    completedAt?: Date | null;
    inputMode?: InputMode;
  } = {};

  if (options?.questionCount !== undefined) {
    updateData.questionCount = options.questionCount;
  }
  if (options?.topicsCovered !== undefined) {
    updateData.topicsCovered = options.topicsCovered;
  }
  if (options?.weakSignals !== undefined) {
    updateData.weakSignals = options.weakSignals;
  }
  if (options?.status !== undefined) {
    updateData.status = options.status;
  }
  if (options?.lastError !== undefined) {
    updateData.lastError = options.lastError;
  }
  if (options?.completedAt !== undefined) {
    updateData.completedAt = options.completedAt;
  }
  if (options?.inputMode !== undefined) {
    updateData.inputMode = options.inputMode;
  }

  await prisma.$transaction([
    prisma.interviewMessage.createMany({ data }),
    prisma.interviewSession.update({
      where: { id: sessionId },
      data: updateData,
    }),
  ]);
}

export async function recomputeSessionQuestionCount(sessionId: string) {
  if (!(await isDbReady())) return 0;

  const messages = await prisma.interviewMessage.findMany({
    where: { sessionId },
    orderBy: { sequence: "asc" },
    select: { role: true, content: true, speakerName: true },
  });

  const questionCount = computeQuestionCount(
    messages.map((message) => ({
      role: message.role as InterviewMessage["role"],
      content: message.content,
      speaker: normalizeInterviewMessageSpeaker(message.speakerName),
    })),
  );

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { questionCount },
  });

  return questionCount;
}

export async function saveReadinessReport(
  sessionId: string,
  report: EvaluateResponse,
  modelDeployment?: string,
  sessionWeakSignals: string[] = [],
  screenReviewNotes: string[] = [],
) {
  if (!(await isDbReady())) {
    throw new Error("Database not ready.");
  }

  const existing = await prisma.readinessReport.findUnique({
    where: { sessionId },
    include: {
      answerEvaluations: { include: { redFlags: true } },
      improvements: true,
      weakTopicTags: true,
    },
  });

  if (existing) {
    return existing;
  }

  const weakTopics = buildWeakTopics(report, sessionWeakSignals);

  return prisma.$transaction(async (tx) => {
    const saved = await tx.readinessReport.create({
      data: {
        sessionId,
        overallScore: report.overallScore,
        summary: report.summary,
        modelDeployment,
        shareToken: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
        screenReviewNotes:
          screenReviewNotes.length > 0
            ? screenReviewNotes
            : (report.screenReviewNotes ?? []),
        answerEvaluations: {
          create: report.answers.map((answer, sequence) => ({
            sequence,
            question: answer.question,
            answer: answer.answer,
            clarity: answer.clarity,
            structure: answer.structure,
            technicalSignal: answer.technicalSignal,
            redFlags: {
              create: answer.redFlags.map((label) => ({
                label,
                signalType: mapWeakSignalType(label),
              })),
            },
          })),
        },
        improvements: {
          create: report.improvements.map((content, sequence) => ({
            sequence,
            content,
          })),
        },
        weakTopicTags: {
          create: weakTopics.map((topic) => ({
            label: topic.label,
            weight: topic.weight ?? null,
          })),
        },
      },
      include: {
        answerEvaluations: { include: { redFlags: true } },
        improvements: true,
        weakTopicTags: true,
      },
    });

    await tx.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return saved;
  });
}
