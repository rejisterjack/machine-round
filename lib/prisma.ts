import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/client";
import { getDatabaseUrl } from "@/lib/db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: getDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
