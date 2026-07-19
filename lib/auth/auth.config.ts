import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
        pathname.startsWith("/report/share/");

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
