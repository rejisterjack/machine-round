import { redirect } from "next/navigation";
import { HistoryPageClient } from "@/components/history/history-page-client";
import { auth } from "@/lib/auth/auth";
import { isDbReady } from "@/lib/db/ready";
import { getUserSessions } from "@/lib/session/media-queries";
import { serializeHistorySession } from "@/lib/session/history-serialization";
import {
  countPendingReports,
  resetStaleThinkingSessions,
} from "@/lib/session/session-maintenance";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/history");
  }

  if (!(await isDbReady())) {
    return (
      <HistoryPageClient
        initialSessions={[]}
        initialTotal={0}
        initialPendingReportCount={0}
      />
    );
  }

  await resetStaleThinkingSessions(session.user.id);

  const [{ sessions, total }, pendingReportCount] = await Promise.all([
    getUserSessions(session.user.id, { limit: 20, offset: 0 }),
    countPendingReports(session.user.id),
  ]);

  return (
    <HistoryPageClient
      initialSessions={sessions.map(serializeHistorySession)}
      initialTotal={total}
      initialPendingReportCount={pendingReportCount}
    />
  );
}
