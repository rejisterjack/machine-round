import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";

const STALE_THINKING_MINUTES = 15;

export async function resetStaleThinkingSessions(userId: string) {
  if (!(await isDbReady())) return 0;

  const cutoff = new Date(Date.now() - STALE_THINKING_MINUTES * 60_000);
  const result = await prisma.interviewSession.updateMany({
    where: {
      userId,
      status: "thinking",
      updatedAt: { lt: cutoff },
    },
    data: { status: "active" },
  });

  return result.count;
}

export async function listPendingReportSessionIds(userId: string) {
  if (!(await isDbReady())) return [];

  return prisma.interviewSession.findMany({
    where: {
      userId,
      status: "completed",
      report: null,
    },
    select: { id: true },
    orderBy: { completedAt: "desc" },
  });
}

export async function countPendingReports(userId: string) {
  if (!(await isDbReady())) return 0;

  return prisma.interviewSession.count({
    where: {
      userId,
      status: "completed",
      report: null,
    },
  });
}
