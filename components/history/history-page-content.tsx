import { Suspense } from "react";
import { HistoryPageClient } from "@/components/history/history-page-client";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInitialHistory } from "@/lib/queries/history";

function HistoryLoading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </PageShell>
  );
}

async function HistoryData({ userId }: { userId: string }) {
  const data = await fetchInitialHistory(userId);

  return (
    <HistoryPageClient
      initialSessions={data.sessions}
      initialTotal={data.total}
      initialPendingReportCount={data.pendingReportCount}
    />
  );
}

export function HistoryPageContent({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<HistoryLoading />}>
      <HistoryData userId={userId} />
    </Suspense>
  );
}
