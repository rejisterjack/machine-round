import { normalizeInterviewMessageSpeaker } from "@/lib/session/message-speaker";
import type { InterviewMessage } from "@/lib/session/interview-store";
import { computeQuestionCount } from "@/lib/interview/question-counter";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";

function messageKey(message: InterviewMessage) {
  return `${message.role}|${message.content.trim()}|${message.speaker ?? ""}`;
}

export function transcriptsMatch(
  dbMessages: InterviewMessage[],
  clientMessages: InterviewMessage[],
): boolean {
  if (dbMessages.length !== clientMessages.length) return false;
  return dbMessages.every(
    (message, index) => messageKey(message) === messageKey(clientMessages[index]!),
  );
}

export function findTranscriptMismatchIndex(
  dbMessages: InterviewMessage[],
  clientMessages: InterviewMessage[],
): number {
  const limit = Math.min(dbMessages.length, clientMessages.length);
  for (let index = 0; index < limit; index += 1) {
    if (messageKey(dbMessages[index]!) !== messageKey(clientMessages[index]!)) {
      return index;
    }
  }
  if (dbMessages.length !== clientMessages.length) {
    return limit;
  }
  return -1;
}

export async function reconcileSessionTranscript(
  sessionId: string,
  clientMessages: InterviewMessage[],
): Promise<{
  fullySynced: boolean;
  messageCount: number;
  questionCount: number;
}> {
  const questionCount = computeQuestionCount(clientMessages);

  if (!(await isDbReady())) {
    return {
      fullySynced: true,
      messageCount: clientMessages.length,
      questionCount,
    };
  }

  const dbRows = await prisma.interviewMessage.findMany({
    where: { sessionId },
    orderBy: { sequence: "asc" },
  });

  const dbMessages: InterviewMessage[] = dbRows.map((row) => ({
    role: row.role as InterviewMessage["role"],
    content: row.content,
    speaker: normalizeInterviewMessageSpeaker(row.speakerName),
  }));

  if (transcriptsMatch(dbMessages, clientMessages)) {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { questionCount },
    });
    return {
      fullySynced: true,
      messageCount: clientMessages.length,
      questionCount,
    };
  }

  const mismatchIndex = findTranscriptMismatchIndex(dbMessages, clientMessages);

  await prisma.$transaction(async (tx) => {
    if (mismatchIndex >= 0) {
      const fromSequence = dbRows[mismatchIndex]!.sequence;
      await tx.interviewMessage.deleteMany({
        where: { sessionId, sequence: { gte: fromSequence } },
      });

      const toInsert = clientMessages.slice(mismatchIndex);
      await tx.interviewMessage.createMany({
        data: toInsert.map((message, offset) => ({
          sessionId,
          role: message.role,
          content: message.content,
          sequence: fromSequence + offset,
          speakerName: message.speaker,
        })),
      });
    } else if (dbMessages.length < clientMessages.length) {
      const startSequence = (dbRows[dbRows.length - 1]?.sequence ?? -1) + 1;
      const toInsert = clientMessages.slice(dbMessages.length);
      await tx.interviewMessage.createMany({
        data: toInsert.map((message, offset) => ({
          sessionId,
          role: message.role,
          content: message.content,
          sequence: startSequence + offset,
          speakerName: message.speaker,
        })),
      });
    } else if (dbMessages.length > clientMessages.length) {
      if (clientMessages.length === 0) {
        await tx.interviewMessage.deleteMany({ where: { sessionId } });
      } else {
        const keepThrough = dbRows[clientMessages.length - 1]!.sequence;
        await tx.interviewMessage.deleteMany({
          where: { sessionId, sequence: { gt: keepThrough } },
        });
      }
    }

    await tx.interviewSession.update({
      where: { id: sessionId },
      data: { questionCount },
    });
  });

  return {
    fullySynced: true,
    messageCount: clientMessages.length,
    questionCount,
  };
}
