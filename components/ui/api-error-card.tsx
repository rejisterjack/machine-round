import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApiErrorCardProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ApiErrorCard({
  message,
  onRetry,
  retryLabel = "Retry",
  className,
}: ApiErrorCardProps) {
  return (
    <div className={cn("nd-course-card border-destructive/30 p-6", className)}>
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="ndPrimary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
