import type { WeakTopic } from "@/lib/session/interview-store";
import { cn } from "@/lib/utils";

type WeakTopicsCloudProps = {
  topics: WeakTopic[];
  className?: string;
};

export function WeakTopicsCloud({ topics, className }: WeakTopicsCloudProps) {
  if (!topics.length) return null;

  const maxWeight = Math.max(...topics.map((topic) => topic.weight ?? 1), 1);

  return (
    <div className={cn("nd-course-card p-6", className)}>
      <h2 className="font-heading text-lg font-medium">Weak topic signals</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Topics the AI screener would likely probe again based on your session.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => {
          const weight = topic.weight ?? 1;
          const scale = 0.85 + (weight / maxWeight) * 0.35;
          return (
            <span
              key={topic.label}
              className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              style={{ fontSize: `${scale}rem` }}
            >
              {topic.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
