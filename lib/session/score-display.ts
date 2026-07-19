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
