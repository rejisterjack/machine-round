const PRECISION_PATTERNS = [
  /\bcursor\b/i,
  /\bmodal\b/i,
  /\bpopup\b/i,
  /\bpop-up\b/i,
  /\bdialog\b/i,
  /\bwhat do you see\b/i,
  /\bwhat can you see\b/i,
  /\bwhat page\b/i,
  /\bwhat site\b/i,
  /\bwhat window\b/i,
  /\bwhat app\b/i,
  /\bwhere am i\b/i,
  /\bon (my |the )?screen\b/i,
  /\bwhat(?:'s| is) (?:on|open on)\b/i,
  /\bwhich (?:page|site|tab|window)\b/i,
  /\bcan you see\b/i,
  /\bwhat changed\b/i,
  /\bwhat(?:'s| is) (?:this|that) (?:error|warning)\b/i,
  /\bsettings\b/i,
  /\bcode editor\b/i,
  /\beditor\b/i,
  /\blive code\b/i,
  /\bwhat(?:'s| is) (?:the )?code\b/i,
  /\boverlay\b/i,
  /\btoast\b/i,
  /\bnotification\b/i,
];

const CAMERA_PATTERNS = [
  /\bfinger(s)?\b/i,
  /\bhand(s)?\b/i,
  /\bgesture\b/i,
  /\bhow many\b/i,
  /\bshowing\b/i,
  /\bholding up\b/i,
  /\bon (my |the )?camera\b/i,
  /\bin (?:the )?video\b/i,
  /\bwhat am i holding\b/i,
  /\bcan you see me\b/i,
  /\bmy face\b/i,
  /\bwhat do i look like\b/i,
];

export function isPrecisionScreenQuestion(question?: string): boolean {
  if (!question?.trim()) return false;
  return PRECISION_PATTERNS.some((pattern) => pattern.test(question));
}

export function isCameraVisualQuestion(question?: string): boolean {
  if (!question?.trim()) return false;
  return CAMERA_PATTERNS.some((pattern) => pattern.test(question));
}

export function buildVisualFocusQuestion(
  userMessage?: string,
  assistantMessage?: string,
): string | undefined {
  const parts = [assistantMessage, userMessage].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(" | ");
}

export function isVisualFollowUpQuestion(
  userMessage?: string,
  assistantMessage?: string,
): boolean {
  return (
    isPrecisionScreenQuestion(userMessage) ||
    isPrecisionScreenQuestion(assistantMessage) ||
    isCameraVisualQuestion(userMessage) ||
    isCameraVisualQuestion(assistantMessage)
  );
}

export function isScreenPrecisionEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_SCREEN_PRECISION_ENABLED;
  if (value === "0" || value === "false") return false;
  return true;
}
