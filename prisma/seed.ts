import "dotenv/config";

import {
  JOB_CUSTOM_COURSE,
  NAMASTE_COURSES,
  RETIRED_COURSE_SLUGS,
} from "@/lib/courses/namaste-courses";
import { embedAndStoreQuestion } from "@/lib/rag/embed-question";
import { QUESTION_BANK } from "@/lib/rag/question-bank-data";
import { prisma } from "@/lib/prisma";

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

  let embeddingsAvailable = true;
  try {
    const { getAzureEmbeddings } = await import("@/lib/ai");
    getAzureEmbeddings();
  } catch {
    embeddingsAvailable = false;
    console.warn("Azure embeddings unavailable; seeding questions without vectors.");
  }

  let embeddedCount = 0;

  for (const item of QUESTION_BANK) {
    const course = [...NAMASTE_COURSES, JOB_CUSTOM_COURSE].find(
      (entry) => entry.id === item.courseId,
    );
    if (!course) continue;

    const roleId = roleBySlug.get(course.slug);
    const metadata = {
      courseId: item.courseId,
      source: "seed" as const,
      topicTags: item.topicTags ?? course.topicAreas,
      difficulty: item.difficulty,
    };

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
          category: item.category,
          difficulty: item.difficulty ?? null,
          metadata,
        },
        select: { id: true },
      }));

    if (!embeddingsAvailable) continue;

    try {
      await embedAndStoreQuestion(question.id, item.content);
      embeddedCount += 1;
    } catch (error) {
      console.warn(`Failed to embed question ${question.id}:`, error);
    }
  }

  console.log(
    `Seeded ${QUESTION_BANK.length} interview questions (${embeddedCount} embedded).`,
  );
}

async function main() {
  await seedRoles();
  await seedQuestions();
  console.log("Seeded NamasteDev course tracks and interview questions.");
}

export async function seedQuestionBank() {
  await main();
}
