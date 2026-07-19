const MEDIA_ROOT = "machine-round";

export function extractSessionIdFromPublicId(publicId: string): string | null {
  const parts = publicId.split("/");
  if (parts[0] !== MEDIA_ROOT || parts.length < 3) return null;
  return parts[2] ?? null;
}

export const MACHINE_ROUND_MEDIA_ROOT = MEDIA_ROOT;
