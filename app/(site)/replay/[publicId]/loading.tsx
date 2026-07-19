import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReplayLoading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-8 h-10 w-64" />
        <div className="mt-10 space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
