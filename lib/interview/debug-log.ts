const MAX_DEBUG_ENTRIES = 20;

const debugBuffer: string[] = [];

export function logInterviewDebug(event: string, detail?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW !== "1") return;

  const entry = detail
    ? `${new Date().toISOString()} ${event} ${JSON.stringify(detail)}`
    : `${new Date().toISOString()} ${event}`;

  debugBuffer.push(entry);
  if (debugBuffer.length > MAX_DEBUG_ENTRIES) {
    debugBuffer.shift();
  }

  console.info("[interview]", entry);
}

export function getInterviewDebugLog(): readonly string[] {
  return debugBuffer;
}
