import type {
  InputMode,
  MessageRole,
  SessionStatus,
  WeakSignalType,
} from "@/generated/client";
import type {
  EvaluateResponse,
  InterviewMessage,
} from "@/lib/session/interview-store";
import { prisma } from "@/lib/prisma";
import { roleIdToSlug } from "@/lib/session/role-slug";

function mapWeakSignalType(label: string): WeakSignalType {
  const normalized = label.toLowerCase();
  if (normalized.includes("rambl")) return "rambling";
  if (normalized.includes("vague")) return "vague_claim";
  if (normalized.includes("example")) return "no_example";
  if (normalized.includes("topic")) return "off_topic";
  return "other";
}

export async function createInterviewSession(input: {
  roleId: string;
  inputMode?: InputMode;
}) {
  const slug = roleIdToSlug(input.roleId);
  if (!slug) {
    throw new Error(`Unknown role: ${input.roleId}`);
  }

  const role = await prisma.role.findUnique({ where: { slug } });
  if (!role) {
    throw new Error(`Role not seeded: ${input.roleId}`);
  }

  return prisma.interviewSession.create({
    data: {
      roleId: role.id,
      inputMode: input.inputMode ?? "text",
      status: "active",
    },
    include: { role: true },
  });
}

export async function getInterviewSessionById(sessionId: string) {
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
    questionCount?: number;
    topicsCovered?: string[];
    weakSignals?: string[];
    status?: SessionStatus;
    lastError?: string | null;
    completedAt?: Date | null;
  },
) {
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

  await prisma.$transaction([
    prisma.interviewMessage.createMany({ data }),
    prisma.interviewSession.update({
      where: { id: sessionId },
      data: updateData,
    }),
  ]);
}

export async function saveReadinessReport(
  sessionId: string,
  report: EvaluateResponse,
  modelDeployment?: string,
) {
  const existing = await prisma.readinessReport.findUnique({
    where: { sessionId },
    select: { id: true },
  });

  if (existing) {
    return prisma.readinessReport.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        answerEvaluations: { include: { redFlags: true } },
        improvements: true,
        weakTopicTags: true,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const saved = await tx.readinessReport.create({
      data: {
        sessionId,
        overallScore: report.overallScore,
        summary: report.summary,
        modelDeployment,
        shareToken: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
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

export function reportToEvaluateResponse(
  report: NonNullable<
    Awaited<ReturnType<typeof getInterviewSessionById>>
  >["report"],
): EvaluateResponse | undefined {
  if (!report) return undefined;

  return {
    overallScore: report.overallScore,
    summary: report.summary,
    answers: report.answerEvaluations.map((answer) => ({
      question: answer.question,
      answer: answer.answer,
      clarity: answer.clarity,
      structure: answer.structure,
      technicalSignal: answer.technicalSignal,
      redFlags: answer.redFlags.map((flag) => flag.label),
    })),
    improvements: report.improvements.map((item) => item.content),
  };
}
