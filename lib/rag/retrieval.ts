import pgvector from "pgvector/pg";
import type { QuestionCategory } from "@/generated/client";
import { logInterviewDebug } from "@/lib/interview/debug-log";
import { prisma } from "@/lib/prisma";
import { resolveRetrievalCourseIds } from "@/lib/rag/course-ids";
import { embedQuestionText } from "@/lib/rag/embed-question";
import { buildRetrievalQuery } from "@/lib/rag/query-builder";
import {
  extractAskedQuestionTexts,
  filterAlreadyAsked,
} from "@/lib/rag/session-dedup";
import type {
  GroundedQuestion,
  RetrievalOptions,
  RetrievalResult,
} from "@/lib/rag/types";

type RawQuestionRow = {
  id: string;
  content: string;
  category: QuestionCategory;
  difficulty: number | null;
  courseId: string | null;
  distance: number;
};

const CANDIDATE_MULTIPLIER = 3;

async function fetchCandidates(
  queryVector: number[],
  courseIds: string[] | undefined,
  limit: number,
): Promise<GroundedQuestion[]> {
  const vectorSql = pgvector.toSql(queryVector);
  const fetchLimit = limit * CANDIDATE_MULTIPLIER;

  if (courseIds && courseIds.length > 0) {
    const rows = await prisma.$queryRawUnsafe<RawQuestionRow[]>(
      `SELECT
        id,
        content,
        category::text AS category,
        difficulty,
        metadata->>'courseId' AS "courseId",
        (embedding <=> $1::vector) AS distance
      FROM interview_questions
      WHERE "isActive" = true
        AND embedding IS NOT NULL
        AND metadata->>'courseId' = ANY($2::text[])
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
      vectorSql,
      courseIds,
      fetchLimit,
    );
    return rows.map(mapRow);
  }

  const rows = await prisma.$queryRawUnsafe<RawQuestionRow[]>(
    `SELECT
      id,
      content,
      category::text AS category,
      difficulty,
      metadata->>'courseId' AS "courseId",
      (embedding <=> $1::vector) AS distance
    FROM interview_questions
    WHERE "isActive" = true
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2`,
    vectorSql,
    fetchLimit,
  );
  return rows.map(mapRow);
}

function mapRow(row: RawQuestionRow): GroundedQuestion {
  return {
    id: row.id,
    content: row.content,
    category: row.category,
    difficulty: row.difficulty,
    courseId: row.courseId,
    distance: Number(row.distance),
  };
}

export async function searchInterviewQuestions(
  options: RetrievalOptions,
): Promise<RetrievalResult> {
  const startedAt = Date.now();
  const limit = options.limit ?? 3;
  const phase =
    options.phase ??
    (options.lastUserAnswer?.trim() ? "follow_up" : "greeting");

  const query = buildRetrievalQuery({
    roleTitle: options.roleTitle,
    topicAreas: options.topicAreas,
    lastUserAnswer: options.lastUserAnswer,
    lastAssistant: options.lastAssistant,
    phase,
  });

  const queryVector = await embedQuestionText(query);
  const courseIds = resolveRetrievalCourseIds(options.courseId);

  let candidates = await fetchCandidates(queryVector, courseIds, limit);
  let scoped = Boolean(courseIds?.length);

  if (candidates.length === 0 && courseIds?.length && !options.strictScope) {
    candidates = await fetchCandidates(queryVector, undefined, limit);
    scoped = false;
  }

  const asked = extractAskedQuestionTexts(options.messages ?? []);
  const { filtered, excludedCount } = filterAlreadyAsked(candidates, asked);
  const questions = filtered.slice(0, limit);
  const latencyMs = Date.now() - startedAt;

  logInterviewDebug("rag_retrieval", {
    courseIds,
    hitCount: questions.length,
    queryLength: query.length,
    excludedCount,
    scoped,
    latencyMs,
  });

  return {
    questions,
    query,
    excludedCount,
    scoped,
    latencyMs,
  };
}

/** Backward-compatible string[] retrieval for existing callers. */
export async function getGroundedQuestionTexts(
  roleTitle: string,
  limit = 3,
  courseId?: string,
  options: Omit<RetrievalOptions, "roleTitle" | "limit" | "courseId"> = {},
): Promise<string[]> {
  try {
    const result = await searchInterviewQuestions({
      roleTitle,
      limit,
      courseId,
      ...options,
    });
    return result.questions.map((question) => question.content);
  } catch (error) {
    console.warn("RAG grounding unavailable:", error);
    return [];
  }
}

/** Full structured retrieval — returns GroundedQuestion objects. */
export async function getGroundedQuestionsStructured(
  roleTitle: string,
  limit = 3,
  courseId?: string,
  options: Omit<RetrievalOptions, "roleTitle" | "limit" | "courseId"> = {},
): Promise<GroundedQuestion[]> {
  try {
    const result = await searchInterviewQuestions({
      roleTitle,
      limit,
      courseId,
      ...options,
    });
    return result.questions;
  } catch (error) {
    console.warn("RAG grounding unavailable:", error);
    return [];
  }
}
