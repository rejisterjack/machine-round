import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().min(1),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().min(1),
  AZURE_OPENAI_REALTIME_DEPLOYMENT: z.string().min(1),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().min(1),
  AZURE_OPENAI_REALTIME_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_REALTIME_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_URL: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid server environment: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}

export function resetServerEnvCacheForTests() {
  cached = null;
}
