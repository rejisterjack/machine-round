import "dotenv/config";

import pgvector from "pgvector/pg";
import { QuestionCategory } from "@/generated/client";
import { getAzureEmbeddings } from "@/lib/ai";
import {
  JOB_CUSTOM_COURSE,
  NAMASTE_COURSES,
  RETIRED_COURSE_SLUGS,
} from "@/lib/courses/namaste-courses";
import { prisma } from "@/lib/prisma";

type SeedQuestion = {
  courseId: string;
  content: string;
  category?: QuestionCategory;
};

const seedQuestionItems: SeedQuestion[] = [
  {
    courseId: "namaste-dsa",
    content: "How would you approach finding the longest substring without repeating characters?",
    category: "technical",
  },
  {
    courseId: "namaste-react",
    content: "Explain when you would lift state up versus use context in a React app.",
    category: "technical",
  },
  {
    courseId: "namaste-node",
    content: "How do you design idempotent payment webhooks at scale?",
    category: "system_design",
  },
  {
    courseId: "namaste-frontend-system-design",
    content: "Design the frontend architecture for a collaborative document editor.",
    category: "system_design",
  },
  {
    courseId: "namaste-javascript",
    content: "Walk me through closures and a real bug they helped you fix.",
    category: "technical",
  },
  {
    courseId: "namaste-interview",
    content: "Tell me about a frontend bug you debugged under time pressure.",
    category: "behavioral",
  },
  {
    courseId: "job-custom",
    content: "Tell me about a project that best matches this role's requirements.",
    category: "behavioral",
  },
];

async function seedRoles() {
  const allCourses = [...NAMASTE_COURSES, JOB_CUSTOM_COURSE];

  for (const [index, course] of allCourses.entries()) {
    await prisma.role.upsert({
      where: { slug: course.slug },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        icon: course.icon,
        imageUrl: course.imageUrl,
        rating: course.rating,
        language: course.language,
        sortOrder: index,
        isActive: true,
      },
      update: {
        title: course.title,
        description: course.description,
        icon: course.icon,
        imageUrl: course.imageUrl,
        rating: course.rating,
        language: course.language,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  for (const slug of RETIRED_COURSE_SLUGS) {
    await prisma.role.updateMany({
      where: { slug },
      data: { isActive: false },
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
    const course = [...NAMASTE_COURSES, JOB_CUSTOM_COURSE].find(
      (entry) => entry.id === item.courseId,
    );
    if (!course) continue;

    const roleId = roleBySlug.get(course.slug);
    const metadata = { courseId: item.courseId, source: "seed" };

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
  console.log("Seeded NamasteDev course tracks and interview questions.");
}

export async function seedQuestionBank() {
  await main();
}
