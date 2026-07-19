import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function SharedReportLoading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-8 h-10 w-72" />
        <div className="mt-10 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
