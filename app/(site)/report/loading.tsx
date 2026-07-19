import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <PageShell glow>
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-8 h-10 w-72" />
        <Skeleton className="mt-3 h-4 w-56" />
        <div className="mt-10 space-y-8">
          <Skeleton className="h-52 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </PageShell>
  );
}
