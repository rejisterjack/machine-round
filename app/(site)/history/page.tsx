import { redirect } from "next/navigation";
import { HistoryPageContent } from "@/components/history/history-page-content";
import { auth } from "@/lib/auth/auth";
import { isDbReady } from "@/lib/db/ready";
import { HistoryPageClient } from "@/components/history/history-page-client";


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

  return <HistoryPageContent userId={session.user.id} />;
}
