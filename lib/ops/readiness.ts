import { isAzureConfigured, isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";

export function isCloudinaryConfigured(): boolean {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

export function isRealtimeConfigured(): boolean {
  const endpoint =
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim() ??
    process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey =
    process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim() ??
    process.env.AZURE_OPENAI_API_KEY?.trim();
  return Boolean(
    endpoint &&
      apiKey &&
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim(),
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET?.trim() &&
      process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

export async function getReadinessStatus() {
  let db = false;
  let dbSeeded = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
    dbSeeded = await isDbReady();
  } catch {
    db = false;
    dbSeeded = false;
  }

  const azureChat = isAzureConfigured();
  const azureRealtime = isRealtimeConfigured();
  const cloudinary = isCloudinaryConfigured();
  const auth = isAuthConfigured();

  return {
    ok: azureChat && azureRealtime && auth && db && dbSeeded,
    db,
    dbSeeded,
    azureChat,
    azureRealtime,
    azureConfigured: azureChat,
    cloudinary,
    auth,
  };
}
