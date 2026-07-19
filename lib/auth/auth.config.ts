import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getServerEnv } from "@/lib/env/server";

function getAuthEnv() {
  try {
    return getServerEnv();
  } catch {
    return {
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    };
  }
}

const authEnv = getAuthEnv();

export const authConfig = {
  providers: [
    Google({
      clientId: authEnv.AUTH_GOOGLE_ID,
      clientSecret: authEnv.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isPublicPage =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/demo-video" ||
        pathname.startsWith("/report/share/") ||
        (pathname.startsWith("/replay/") &&
          nextUrl.searchParams.has("shareToken"));

      if (isPublicPage) {
        return true;
      }

      const isProtectedPage =
        pathname.startsWith("/interview") ||
        pathname.startsWith("/history") ||
        pathname === "/report" ||
        pathname.startsWith("/replay");

      if (isProtectedPage) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
