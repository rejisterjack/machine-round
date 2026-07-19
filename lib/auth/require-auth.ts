import { auth } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api/errors";

export type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("UNAUTHORIZED", "Sign in required.", 401);
  }
  return session as AuthSession;
}
