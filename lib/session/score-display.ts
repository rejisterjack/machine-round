/** Shared readiness score styling (0–100 scale). */
export function scoreBadgeClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25";
  }
  if (score >= 60) {
    return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25";
  }
  return "bg-red-500/15 text-red-400 ring-1 ring-red-500/25";
}

export function scoreRingGradient(score: number): string {
  if (score >= 80) return "from-primary to-amber-300";
  if (score >= 60) return "from-primary/90 to-orange-400";
  return "from-orange-500 to-red-400";
}

export function scoreTierLabel(score: number): string {
  if (score >= 80) return "Interview ready";
  if (score >= 60) return "Almost there";
  return "Needs prep";
}

export function scoreTierDescription(score: number): string {
  if (score >= 80) {
    return "Your answers show the clarity and structure AI screeners reward.";
  }
  if (score >= 60) {
    return "Solid foundation — tighten specificity and concrete examples.";
  }
  return "Focus on structure, examples, and concise delivery before your real screen.";
}

export function metricBarClass(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-primary";
  return "bg-orange-500";
}

export function averageMetric(
  values: number[],
  fallback = 0,
): number {
  if (!values.length) return fallback;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function answerCompositeScore(answer: {
  clarity: number;
  structure: number;
  technicalSignal: number;
}): number {
  return Math.round(
    (answer.clarity + answer.structure + answer.technicalSignal) / 3,
  );
}
