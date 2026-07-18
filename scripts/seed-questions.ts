import { getSql } from "@/lib/db";

const seedQuestions = [
  {
    role: "full-stack",
    content:
      "Tell me about a feature you shipped end-to-end. What tradeoff did you make between frontend speed and backend correctness?",
  },
  {
    role: "backend",
    content:
      "Describe a production incident you resolved. What signal told you the root cause was in the data layer?",
  },
  {
    role: "frontend",
    content:
      "Walk me through a UI performance issue you fixed. What metric moved and how did you measure it?",
  },
  {
    role: "product-minded",
    content:
      "Tell me about a time you cut scope to ship faster. How did you decide what not to build?",
  },
];

export async function seedQuestionBank() {
  const sql = getSql();
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`
    CREATE TABLE IF NOT EXISTS interview_questions (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      metadata JSONB,
      embedding vector(1536)
    )
  `;

  for (const item of seedQuestions) {
    await sql`
      INSERT INTO interview_questions (content, metadata)
      VALUES (${item.content}, ${JSON.stringify({ role: item.role })})
      ON CONFLICT DO NOTHING
    `;
  }
}

seedQuestionBank()
  .then(() => {
    console.log("Question bank seeded.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
