export function canUseStoredReport(
  stored: { report?: unknown; dbSessionId?: string } | null | undefined,
  sessionIdParam: string | null,
): boolean {
  if (!stored?.report) return false;
  if (!sessionIdParam) return true;
  return sessionIdParam === stored.dbSessionId;
}
