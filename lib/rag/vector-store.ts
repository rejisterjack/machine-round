import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { getAzureEmbeddings } from "@/lib/ai";
import { getDatabaseUrl } from "@/lib/db";

let vectorStorePromise: Promise<PGVectorStore> | null = null;

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

export async function getGroundedQuestions(role: string, limit = 2) {
  try {
    const store = await getQuestionVectorStore();
    const results = await store.similaritySearch(
      `screening interview questions for ${role}`,
      limit,
    );
    return results.map((result) => result.pageContent);
  } catch (error) {
    console.warn("RAG grounding unavailable:", error);
    return [];
  }
}
