import "dotenv/config";

import pgvector from "pgvector/pg";
import { QuestionCategory } from "@/generated/client";
import { getAzureEmbeddings } from "@/lib/ai";
import { roles } from "@/lib/design/tokens";
import { prisma } from "@/lib/prisma";
import { roleIdToSlug } from "@/lib/session/role-slug";

type SeedQuestion = {
  roleId: (typeof roles)[number]["id"];
  content: string;
  category?: QuestionCategory;
};

const seedQuestionItems: SeedQuestion[] = [
  {
    roleId: "full-stack",
    content:
      "Tell me about a feature you shipped end-to-end. What tradeoff did you make between frontend speed and backend correctness?",
    category: "behavioral",
  },
  {
    roleId: "full-stack",
    content:
      "How would you design a REST API for a collaborative document editor with real-time updates?",
    category: "system_design",
  },
  {
    roleId: "full-stack",
    content:
      "Describe how you would debug a slow page that only happens in production.",
    category: "technical",
  },
  {
    roleId: "full-stack",
    content:
      "Walk me through how you decide between server-side rendering and client-side rendering for a new page.",
    category: "technical",
  },
  {
    roleId: "backend",
    content:
      "Describe a production incident you resolved. What signal told you the root cause was in the data layer?",
    category: "behavioral",
  },
  {
    roleId: "backend",
    content:
      "How would you design idempotent payment webhooks at scale?",
    category: "system_design",
  },
  {
    roleId: "backend",
    content:
      "Explain your approach to database indexing when query patterns evolve over time.",
    category: "technical",
  },
  {
    roleId: "backend",
    content:
      "How do you balance caching with data consistency in a high-traffic service?",
    category: "technical",
  },
  {
    roleId: "frontend",
    content:
      "Walk me through a UI performance issue you fixed. What metric moved and how did you measure it?",
    category: "behavioral",
  },
  {
    roleId: "frontend",
    content:
      "How would you structure state in a complex dashboard with filters, charts, and live updates?",
    category: "technical",
  },
  {
    roleId: "frontend",
    content:
      "Describe your approach to accessibility when shipping under tight deadlines.",
    category: "behavioral",
  },
  {
    roleId: "frontend",
    content:
      "What tradeoffs do you consider when choosing between CSS modules, Tailwind, and component libraries?",
    category: "technical",
  },
  {
    roleId: "product-minded",
    content:
      "Tell me about a time you cut scope to ship faster. How did you decide what not to build?",
    category: "behavioral",
  },
  {
    roleId: "product-minded",
    content:
      "How do you validate whether a technical refactor is worth the product delay?",
    category: "mixed",
  },
  {
    roleId: "product-minded",
    content:
      "Describe a feature you shipped where user metrics disagreed with stakeholder expectations.",
    category: "behavioral",
  },
  {
    roleId: "product-minded",
    content:
      "How would you prioritize reliability work versus new feature requests on a small team?",
    category: "mixed",
  },
];

async function seedRoles() {
  for (const [index, role] of roles.entries()) {
    const slug = roleIdToSlug(role.id);
    if (!slug) continue;

    await prisma.role.upsert({
      where: { slug },
      create: {
        slug,
        title: role.title,
        description: role.description,
        icon: role.icon,
        imageUrl: role.imageUrl,
        rating: role.rating,
        language: role.language,
        sortOrder: index,
      },
      update: {
        title: role.title,
        description: role.description,
        icon: role.icon,
        imageUrl: role.imageUrl,
        rating: role.rating,
        language: role.language,
        sortOrder: index,
        isActive: true,
      },
    });
  }
}

async function seedQuestions() {
  const roleRecords = await prisma.role.findMany();
  const roleBySlug = new Map(roleRecords.map((role) => [role.slug, role.id]));

  let embeddings: Awaited<ReturnType<typeof getAzureEmbeddings>> | null = null;
  try {
    embeddings = getAzureEmbeddings();
  } catch {
    console.warn("Azure embeddings unavailable; seeding questions without vectors.");
  }

  for (const item of seedQuestionItems) {
    const slug = roleIdToSlug(item.roleId);
    if (!slug) continue;

    const roleId = roleBySlug.get(slug);
    const metadata = { role: item.roleId, source: "seed" };

    const existing = await prisma.interviewQuestion.findFirst({
      where: {
        roleId,
        content: item.content,
      },
      select: { id: true },
    });

    const question =
      existing ??
      (await prisma.interviewQuestion.create({
        data: {
          roleId,
          content: item.content,
          category: item.category ?? "mixed",
          metadata,
        },
        select: { id: true },
      }));

    if (!embeddings) continue;

    const vector = await embeddings.embedQuery(item.content);
    const vectorSql = pgvector.toSql(vector);
    await prisma.$executeRawUnsafe(
      `UPDATE interview_questions SET embedding = $1::vector, "updatedAt" = NOW() WHERE id = $2`,
      vectorSql,
      question.id,
    );
  }
}

async function main() {
  await seedRoles();
  await seedQuestions();
  console.log("Seeded roles and interview questions.");
}

export async function seedQuestionBank() {
  await main();
}
