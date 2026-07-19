import pgvector from "pgvector/pg";
import { getAzureEmbeddings } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

/** Embed question text via Azure OpenAI — shared by seed and admin re-embed paths. */
export async function embedQuestionText(text: string): Promise<number[]> {
  const embeddings = getAzureEmbeddings();
  return embeddings.embedQuery(text);
}

/** Persist embedding vector for a question row. */
export async function writeQuestionEmbedding(
  questionId: string,
  vector: number[],
): Promise<void> {
  const vectorSql = pgvector.toSql(vector);
  await prisma.$executeRawUnsafe(
    `UPDATE interview_questions SET embedding = $1::vector, "updatedAt" = NOW() WHERE id = $2`,
    vectorSql,
    questionId,
  );
}

/** Embed and persist in one call. */
export async function embedAndStoreQuestion(
  questionId: string,
  content: string,
): Promise<void> {
  const vector = await embedQuestionText(content);
  await writeQuestionEmbedding(questionId, vector);
}
