import type { NextResponse } from "next/server";

export function applySecurityHeaders(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), display-capture=(self)",
  );
  response.headers.set("X-Request-Id", requestId);
  return response;
}
