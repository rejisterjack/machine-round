import type { NextResponse } from "next/server";

export function applySecurityHeaders(
  response: NextResponse,
  requestId: string,
  options: { isProduction?: boolean } = {},
): NextResponse {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
  );
  response.headers.set("X-Request-Id", requestId);

  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}
