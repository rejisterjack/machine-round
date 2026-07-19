import { getLastAssistantMessage } from "@/lib/ai/conversation-phases";
import {
  GREETING_WARMUP_TURNS,
  hasClosingIntent,
} from "@/lib/ai/question-cap";
import type { InterviewMessage } from "@/lib/session/interview-store";

const SYSTEM_MESSAGE_PATTERN = /^\[System\]/i;

const FOLLOW_UP_PATTERN =
  /\b(tell me more|can you elaborate|elaborate on|you mentioned|going back|what about|dig deeper|clarify|can you explain (?:that|this|further)|walk me through (?:that|this)|how (?:exactly|specifically))\b/i;

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

function isLikelyFollowUp(
  priorAssistant: InterviewMessage | undefined,
  newContent: string,
): boolean {
  if (!priorAssistant) return false;

  const trimmed = newContent.trim();
  if (NEW_TOPIC_PATTERN.test(trimmed)) return false;
  if (!looksLikeQuestion(trimmed)) return true;

  if (FOLLOW_UP_PATTERN.test(trimmed)) return true;

  return false;
}

function countAssistantIncrements(messages: InterviewMessage[]): number {
  let count = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const before = messages.slice(0, index);
    if (shouldIncrementQuestionCount(before, message)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Whether an incoming assistant message should advance questionCount.
 */
export function shouldIncrementQuestionCount(
  messagesBefore: InterviewMessage[],
  newAssistantMessage: Pick<InterviewMessage, "role" | "content">,
): boolean {
  if (newAssistantMessage.role !== "assistant") return false;

  const content = newAssistantMessage.content.trim();
  if (!content || isSystemMessage(content)) return false;
  if (hasClosingIntent(content)) return false;

  const lastMessage = messagesBefore.at(-1);
  if (lastMessage?.role === "assistant") return false;

  const priorCount = countAssistantIncrements(messagesBefore);

  if (priorCount < GREETING_WARMUP_TURNS) {
    if (priorCount === 0) return true;
    const hasUserMessage = messagesBefore.some((m) => m.role === "user");
    return hasUserMessage;
  }

  const lastUserIndex = messagesBefore.findLastIndex((m) => m.role === "user");
  if (lastUserIndex === -1) return false;

  const priorAssistant = getLastAssistantMessage(
    messagesBefore.slice(0, lastUserIndex + 1),
  );
  if (priorAssistant && isLikelyFollowUp(priorAssistant, content)) {
    return false;
  }

  return looksLikeQuestion(content);
}

/** Recompute questionCount from the full transcript. */
export function computeQuestionCount(messages: InterviewMessage[]): number {
  return countAssistantIncrements(messages);
}
