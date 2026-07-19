export function detectWeakSignalsFromAnswer(content: string): string[] {
  const signals = new Set<string>();
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.length > 450) {
    signals.add("rambling");
  }
  if (!/\d|%|ms|latency|metric|users|percent/i.test(trimmed)) {
    signals.add("no concrete metrics");
  }
  if (/\b(probably|maybe|i think|kind of|sort of|basically)\b/i.test(trimmed)) {
    signals.add("vague claims");
  }
  if (trimmed.split(/\s+/).length < 12) {
    signals.add("short answer");
  }

  return [...signals];
}

export function mergeWeakSignals(
  existing: string[],
  detected: string[],
): string[] {
  return [...new Set([...existing, ...detected])].slice(0, 12);
}
