import { prisma } from "@/lib/prisma";
import {
  JOB_CUSTOM_COURSE,
  NAMASTE_COURSES,
} from "@/lib/courses/namaste-courses";
import { QUESTION_BANK } from "@/lib/rag/question-bank-data";

const TRACK_COURSE_IDS = [
  ...NAMASTE_COURSES.map((course) => course.id),
  JOB_CUSTOM_COURSE.id,
];

export type RagCorpusStat = {
  courseId: string;
  total: number;
  embedded: number;
};

export async function getRagCorpusStats(): Promise<RagCorpusStat[]> {
  const rows = await prisma.$queryRaw<
    Array<{ courseId: string | null; total: bigint; embedded: bigint }>
  >`
    SELECT
      metadata->>'courseId' AS "courseId",
      COUNT(*)::bigint AS total,
      COUNT(embedding)::bigint AS embedded
    FROM interview_questions
    WHERE "isActive" = true
    GROUP BY metadata->>'courseId'
  `;

  const statsByCourse = new Map<string, RagCorpusStat>();
  for (const row of rows) {
    if (!row.courseId) continue;
    statsByCourse.set(row.courseId, {
      courseId: row.courseId,
      total: Number(row.total),
      embedded: Number(row.embedded),
    });
  }

  for (const courseId of TRACK_COURSE_IDS) {
    if (!statsByCourse.has(courseId)) {
      statsByCourse.set(courseId, {
        courseId,
        total: 0,
        embedded: 0,
      });
    }
  }

  return [...statsByCourse.values()].sort((a, b) =>
    a.courseId.localeCompare(b.courseId),
  );
}

export async function isRagReady(minPerCourse = 8): Promise<boolean> {
  const stats = await getRagCorpusStats();
  return stats.every(
    (stat) =>
      TRACK_COURSE_IDS.includes(
        stat.courseId as (typeof TRACK_COURSE_IDS)[number],
      ) && stat.embedded >= minPerCourse,
  );
}

export function getExpectedQuestionBankSize(): number {
  return QUESTION_BANK.length;
}
