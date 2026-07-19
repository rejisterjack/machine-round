import { AlertTriangle, Brain, Layers, Sparkles } from "lucide-react";
import { averageMetric } from "@/lib/session/score-display";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type ReportStatsRowProps = {
  answers: EvaluateResponse["answers"];
  redFlagCount: number;
};

const statIcons = {
  clarity: Sparkles,
  structure: Layers,
  technical: Brain,
  flags: AlertTriangle,
} as const;

export function ReportStatsRow({ answers, redFlagCount }: ReportStatsRowProps) {
  const clarity = averageMetric(answers.map((answer) => answer.clarity));
  const structure = averageMetric(answers.map((answer) => answer.structure));
  const technical = averageMetric(
    answers.map((answer) => answer.technicalSignal),
  );

  const stats = [
    { key: "clarity" as const, label: "Avg clarity", value: clarity },
    { key: "structure" as const, label: "Avg structure", value: structure },
    { key: "technical" as const, label: "Avg technical", value: technical },
    {
      key: "flags" as const,
      label: "Red flags",
      value: redFlagCount,
      suffix: "",
    },
  ];

  return (
    <section
      id="metrics"
      aria-label="Session metrics"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = statIcons[stat.key];
        const isFlagStat = stat.key === "flags";

        return (
          <div key={stat.key} className="nd-report-stat">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 font-heading text-2xl font-medium tabular-nums">
                  {stat.value}
                  {!isFlagStat ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      /100
                    </span>
                  ) : null}
                </p>
              </div>
              <div
                className={
                  isFlagStat && stat.value > 0
                    ? "rounded-lg bg-destructive/10 p-2 text-destructive"
                    : "rounded-lg bg-primary/10 p-2 text-primary"
                }
              >
                <Icon className="size-4" />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
