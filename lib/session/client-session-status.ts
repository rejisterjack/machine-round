import type { SessionStatus } from "@/generated/client";
import type { InterviewSession } from "@/lib/session/interview-store";

/** Client-side session status, including DB-aligned values after hydration. */
export type ClientSessionStatus = InterviewSession["status"];

const DB_SESSION_STATUSES = new Set<SessionStatus>([
  "active",
  "thinking",
  "completed",
  "abandoned",
  "error",
]);

export function isDbSessionStatus(value: string): value is SessionStatus {
  return DB_SESSION_STATUSES.has(value as SessionStatus);
}

/** Map persisted DB session status to client session status without losing state. */
export function mapDbSessionStatusToClient(
  dbStatus?: string,
): ClientSessionStatus {
  switch (dbStatus) {
    case "completed":
      return "complete";
    case "thinking":
    case "error":
    case "active":
    case "abandoned":
      return dbStatus;
    default:
      return "idle";
  }
}
