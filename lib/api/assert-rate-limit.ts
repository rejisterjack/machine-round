import { ApiError } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";

export function assertRateLimit(
  request: Request,
  key: string,
  options: { limit: number; windowMs: number },
  message = "Too many requests. Please try again shortly.",
) {
  const result = checkRateLimit(key, options);
  if (!result.ok) {
    throw new ApiError("UPSTREAM_ERROR", message, 429);
  }
}

export function rateLimitKey(
  request: Request,
  parts: Array<string | undefined | null>,
) {
  return `${getClientIp(request)}:${parts.filter(Boolean).join(":")}`;
}
