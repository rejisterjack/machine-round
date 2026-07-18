import { prisma } from "@/lib/prisma";

let dbReadyCache: { value: boolean; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function isDbReady(): Promise<boolean> {
  const now = Date.now();
  if (dbReadyCache && now - dbReadyCache.checkedAt < CACHE_TTL_MS) {
    return dbReadyCache.value;
  }

  try {
    const roleCount = await prisma.role.count({ where: { isActive: true } });
    const ready = roleCount > 0;
    dbReadyCache = { value: ready, checkedAt: now };
    if (!ready) {
      console.warn("Database not seeded: no active roles found.");
    }
    return ready;
  } catch (error) {
    console.warn("Database unavailable:", error);
    dbReadyCache = { value: false, checkedAt: now };
    return false;
  }
}

export function isAzureConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT?.trim() &&
      process.env.AZURE_OPENAI_API_KEY?.trim() &&
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim(),
  );
}
