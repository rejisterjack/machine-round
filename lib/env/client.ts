import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_MICROSOFT_CLARITY_ID: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_REALTIME_VISION_ENABLED: z.string().optional(),
  NEXT_PUBLIC_SCREEN_PRECISION_ENABLED: z.string().optional(),
  NEXT_PUBLIC_DEBUG_INTERVIEW: z.string().optional(),
  NEXT_PUBLIC_MEDIA_ARCHIVE_TARGET_KB: z.string().optional(),
  NEXT_PUBLIC_MEDIA_RECORDING_MAX_HEIGHT: z.string().optional(),
  NEXT_PUBLIC_MEDIA_RECORDING_VIDEO_KBPS: z.string().optional(),
  NEXT_PUBLIC_DEMO_SHARE_TOKEN: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cached: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (cached) return cached;

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_MICROSOFT_CLARITY_ID:
      process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_REALTIME_VISION_ENABLED:
      process.env.NEXT_PUBLIC_REALTIME_VISION_ENABLED,
    NEXT_PUBLIC_SCREEN_PRECISION_ENABLED:
      process.env.NEXT_PUBLIC_SCREEN_PRECISION_ENABLED,
    NEXT_PUBLIC_DEBUG_INTERVIEW: process.env.NEXT_PUBLIC_DEBUG_INTERVIEW,
    NEXT_PUBLIC_MEDIA_ARCHIVE_TARGET_KB:
      process.env.NEXT_PUBLIC_MEDIA_ARCHIVE_TARGET_KB,
    NEXT_PUBLIC_MEDIA_RECORDING_MAX_HEIGHT:
      process.env.NEXT_PUBLIC_MEDIA_RECORDING_MAX_HEIGHT,
    NEXT_PUBLIC_MEDIA_RECORDING_VIDEO_KBPS:
      process.env.NEXT_PUBLIC_MEDIA_RECORDING_VIDEO_KBPS,
    NEXT_PUBLIC_DEMO_SHARE_TOKEN: process.env.NEXT_PUBLIC_DEMO_SHARE_TOKEN,
  });

  cached = parsed.success ? parsed.data : {};
  return cached;
}
