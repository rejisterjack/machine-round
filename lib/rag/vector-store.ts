import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { getAzureEmbeddings } from "@/lib/ai";
import { getDatabaseUrl } from "@/lib/db";

/** LangChain reads the Prisma-managed `interview_questions` table directly. */
let vectorStorePromise: Promise<PGVectorStore> | null = null;

export type GroundedQuestionOptions = {
  topicAreas?: string[];
  strictScope?: boolean;
};

export async function getQuestionVectorStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = PGVectorStore.initialize(getAzureEmbeddings(), {
      postgresConnectionOptions: {
        connectionString: getDatabaseUrl(),
      },
      tableName: "interview_questions",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
    });
  }

  return vectorStorePromise;
}

export async function getGroundedQuestions(
  role: string,
  limit = 2,
  courseId?: string,
  options: GroundedQuestionOptions = {},
) {
  try {
    const store = await getQuestionVectorStore();
    const topicHint = options.topicAreas?.join(", ");
    const query =
      topicHint ?
        `${role} interview questions: ${topicHint}`
      : `screening interview questions for ${role}`;
    const metadataFilter = courseId ? { courseId } : undefined;
    const results = await store.similaritySearch(
      query,
      limit,
      metadataFilter,
    );

    if (results.length > 0) {
      return results.map((result) => result.pageContent);
    }

    if (metadataFilter && !options.strictScope) {
      const fallback = await store.similaritySearch(query, limit);
      return fallback.map((result) => result.pageContent);
    }

    return [];
  } catch (error) {
    console.warn("RAG grounding unavailable:", error);
    return [];
  }
}
