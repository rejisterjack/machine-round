import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { buildCsp } from "@/lib/security/csp";
import { applySecurityHeaders } from "@/lib/security/headers";

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const requestId = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const isDev = process.env.NODE_ENV !== "production";
  response.headers.set("Content-Security-Policy", buildCsp(nonce, isDev));

  return applySecurityHeaders(response, requestId);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|brand/|favicon.ico).*)",
    "/interview/:path*",
    "/history/:path*",
    "/report",
    "/replay/:path*",
  ],
};
