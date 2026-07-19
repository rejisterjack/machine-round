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
    <section id="topics" className={cn("scroll-mt-28 nd-course-card p-6", className)}>
      <h2 className="font-heading text-lg font-medium">Weak topic signals</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Topics an AI screener would likely probe again — larger tags were
        flagged more strongly in your session.
      </p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {topics.map((topic) => {
          const weight = topic.weight ?? 1;
          const intensity = 0.35 + (weight / maxWeight) * 0.65;
          const scale = 0.82 + (weight / maxWeight) * 0.38;

          return (
            <span
              key={topic.label}
              className="inline-flex rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-transform hover:scale-[1.02]"
              style={{
                fontSize: `${scale}rem`,
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(intensity * 18)}%, transparent)`,
              }}
            >
              {topic.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
