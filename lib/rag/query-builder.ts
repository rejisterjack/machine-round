const MAX_ANSWER_SNIPPET = 280;

function truncate(text: string, max = MAX_ANSWER_SNIPPET): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export type BuildRetrievalQueryInput = {
  roleTitle: string;
  topicAreas?: string[];
  lastUserAnswer?: string;
  lastAssistant?: string;
  phase?: "greeting" | "follow_up";
};

export function buildRetrievalQuery(input: BuildRetrievalQueryInput): string {
  const { roleTitle, topicAreas, lastUserAnswer, lastAssistant, phase } = input;
  const topicHint = topicAreas?.length ? topicAreas.join(", ") : undefined;

  if (phase === "greeting" || !lastUserAnswer?.trim()) {
    return topicHint
      ? `${roleTitle} interview opener questions: ${topicHint}`
      : `screening interview questions for ${roleTitle}`;
  }

  const parts = [
    `${roleTitle} interview follow-up question`,
    topicHint ? `topics: ${topicHint}` : undefined,
    lastAssistant ? `after asking: ${truncate(lastAssistant, 120)}` : undefined,
    `candidate said: ${truncate(lastUserAnswer)}`,
  ].filter(Boolean);

  return parts.join(". ");
}
