import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-8 h-10 w-80" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
