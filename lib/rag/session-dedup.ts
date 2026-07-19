import type { InterviewMessage } from "@/lib/session/interview-store";
import type { GroundedQuestion } from "@/lib/rag/types";

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeQuestionText(text)
      .split(" ")
      .filter((token) => token.length > 3),
  );
}

function overlapRatio(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap += 1;
  }

  return overlap / Math.min(setA.size, setB.size);
}

/** Extract prior assistant question texts from the transcript. */
export function extractAskedQuestionTexts(messages: InterviewMessage[]): string[] {
  return messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content.trim())
    .filter(Boolean);
}

/** Drop candidates that overlap heavily with questions already asked this session. */
export function filterAlreadyAsked(
  candidates: GroundedQuestion[],
  asked: string[],
  overlapThreshold = 0.55,
): { filtered: GroundedQuestion[]; excludedCount: number } {
  if (asked.length === 0) {
    return { filtered: candidates, excludedCount: 0 };
  }

  const filtered: GroundedQuestion[] = [];
  let excludedCount = 0;

  for (const candidate of candidates) {
    const isDuplicate = asked.some(
      (askedText) => overlapRatio(candidate.content, askedText) >= overlapThreshold,
    );
    if (isDuplicate) {
      excludedCount += 1;
      continue;
    }
    filtered.push(candidate);
  }

  return { filtered, excludedCount };
}
