import { isDbReady } from "@/lib/db/ready";
import { getUserSessions } from "@/lib/session/media-queries";
import {
  serializeHistorySession,
  type HistorySessionDto,
} from "@/lib/session/history-serialization";
import {
  countPendingReports,
  resetStaleThinkingSessions,
} from "@/lib/session/session-maintenance";

export type InitialHistoryData = {
  sessions: HistorySessionDto[];
  total: number;
  pendingReportCount: number;
};

export async function fetchInitialHistory(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<InitialHistoryData> {
  if (!(await isDbReady())) {
    return { sessions: [], total: 0, pendingReportCount: 0 };
  }

  await resetStaleThinkingSessions(userId);

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const [{ sessions, total }, pendingReportCount] = await Promise.all([
    getUserSessions(userId, { limit, offset }),
    countPendingReports(userId),
  ]);

  return {
    sessions: sessions.map(serializeHistorySession),
    total,
    pendingReportCount,
  };
}
