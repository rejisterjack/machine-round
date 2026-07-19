export function isSmokeAuthConfigured(): boolean {
  return Boolean(process.env.SMOKE_AUTH_COOKIE?.trim());
}

export function smokeFetchInit(init?: RequestInit): RequestInit {
  const cookie = process.env.SMOKE_AUTH_COOKIE?.trim();
  if (!cookie) {
    return init ?? {};
  }

  const headers = new Headers(init?.headers);
  headers.set("Cookie", cookie);
  return { ...init, headers };
}

export function assertAuthForSmoke(path: string, status: number): void {
  const requireAuth =
    process.env.SMOKE_AUTH_REQUIRED === "1" || isSmokeAuthConfigured();
  if (status === 401 && requireAuth) {
    throw new Error(
      `${path} returned 401 — set SMOKE_AUTH_COOKIE to a valid session cookie.`,
    );
  }
}
