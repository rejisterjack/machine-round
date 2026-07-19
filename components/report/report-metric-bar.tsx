import { metricBarClass } from "@/lib/session/score-display";
import { cn } from "@/lib/utils";

type ReportMetricBarProps = {
  label: string;
  value: number;
  compact?: boolean;
};

export function ReportMetricBar({
  label,
  value,
  compact = false,
}: ReportMetricBarProps) {
  return (
    <div>
      <div
        className={cn(
          "mb-1 flex items-center justify-between",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}/100</span>
      </div>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          compact ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", metricBarClass(value))}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
