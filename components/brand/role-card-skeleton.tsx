import { Skeleton } from "@/components/ui/skeleton";

export function RoleCardSkeleton() {
  return (
    <div className="nd-course-card overflow-hidden p-2">
      <Skeleton className="aspect-[680/383] w-full rounded-xl" />
      <div className="space-y-3 px-4 py-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}
