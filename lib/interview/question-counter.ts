import { getLastAssistantMessage } from "@/lib/ai/conversation-phases";
import {
  GREETING_WARMUP_TURNS,
  hasClosingIntent,
} from "@/lib/ai/question-cap";
import type { InterviewMessage } from "@/lib/session/interview-store";

const SYSTEM_MESSAGE_PATTERN = /^\[System\]/i;

const NEW_TOPIC_PATTERN =
  /\b(moving on|next topic|let(?:'s| us) (?:move|switch|talk about)|different topic|another (?:question|topic)|now (?:let|tell))\b/i;

const QUESTION_PROBE_PATTERN =
  /\?|(?:walk me through|explain|describe|what happens when|how would you|why (?:does|do|is|are)|what is the difference|can you (?:tell|share|walk))/i;

function isSystemMessage(content: string): boolean {
  return SYSTEM_MESSAGE_PATTERN.test(content.trim());
}

function looksLikeQuestion(content: string): boolean {
  return QUESTION_PROBE_PATTERN.test(content);
}

function computeIncrementFlags(messages: InterviewMessage[]): boolean[] {
  const increments = new Array<boolean>(messages.length).fill(false);

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const content = message.content.trim();
    if (!content || isSystemMessage(content) || hasClosingIntent(content)) {
      continue;
    }

    if (index > 0 && messages[index - 1]?.role === "assistant") {
      continue;
    }

    let priorCount = 0;
    for (let i = 0; i < index; i += 1) {
      if (increments[i]) priorCount += 1;
    }

    if (priorCount < GREETING_WARMUP_TURNS) {
      if (priorCount === 0) {
        increments[index] = true;
        continue;
      }
      const hasUserMessage = messages
        .slice(0, index)
        .some((entry) => entry.role === "user");
      if (hasUserMessage) increments[index] = true;
      continue;
    }

    const lastUserIndex = messages
      .slice(0, index)
      .findLastIndex((entry) => entry.role === "user");
    if (lastUserIndex === -1) continue;

    if (NEW_TOPIC_PATTERN.test(content)) {
      increments[index] = true;
      continue;
    }

    let incrementCount = 0;
    let lastScoredTopicOpenerIndex = -1;
    for (let i = 0; i < index; i += 1) {
      if (!increments[i]) continue;
      incrementCount += 1;
      if (incrementCount > GREETING_WARMUP_TURNS) {
        lastScoredTopicOpenerIndex = i;
      }
    }

    if (
      lastScoredTopicOpenerIndex >= 0 &&
      lastUserIndex > lastScoredTopicOpenerIndex
    ) {
      continue;
    }

    if (looksLikeQuestion(content)) {
      increments[index] = true;
    }
  }

  return increments;
}

/**
 * Whether an incoming assistant message should advance questionCount.
 * Used for analytics (topics discussed) — not for session termination.
 */
export function shouldIncrementQuestionCount(
  messagesBefore: InterviewMessage[],
  newAssistantMessage: Pick<InterviewMessage, "role" | "content">,
): boolean {
  const messages = [
    ...messagesBefore,
    { ...newAssistantMessage, role: "assistant" as const },
  ];
  const flags = computeIncrementFlags(messages);
  return flags.at(-1) ?? false;
}

/** Recompute questionCount from the full transcript. */
export function computeQuestionCount(messages: InterviewMessage[]): number {
  return computeIncrementFlags(messages).filter(Boolean).length;
}

export { getLastAssistantMessage };
