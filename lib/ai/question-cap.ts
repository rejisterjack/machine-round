import { MAX_QUESTIONS } from "@/lib/design/tokens";
import {
  DEFAULT_INTERVIEW_DURATION,
  getMaxQuestionsForDuration,
  getDurationSeconds,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";

/** Greeting + warmup assistant turns before scored interview questions. */
export const GREETING_WARMUP_TURNS = 2;

/** PRD targets 5–7 scored questions for the default 30 min profile. */
export const MAX_SCORED_QUESTIONS = MAX_QUESTIONS - GREETING_WARMUP_TURNS;

const CLOSING_INTENT_PATTERN =
  /\b(thank you|thanks for|wrap(?:ping)? up|that(?:'s| is) all|readiness report|your report|good luck|great session|end of (?:the )?interview)\b/i;

export function resolveMaxQuestions(
  maxQuestions?: number,
  interviewDuration?: InterviewDuration,
): number {
  if (maxQuestions !== undefined) return maxQuestions;
  if (interviewDuration) return getMaxQuestionsForDuration(interviewDuration);
  return MAX_QUESTIONS;
}

export function getMaxScoredQuestions(maxQuestions: number = MAX_QUESTIONS) {
  return maxQuestions - GREETING_WARMUP_TURNS;
}

export function countScoredQuestions(questionCount: number) {
  return Math.max(0, questionCount - GREETING_WARMUP_TURNS);
}

export function shouldEndInterview(
  questionCount: number,
  maxQuestions: number = MAX_QUESTIONS,
) {
  return (
    countScoredQuestions(questionCount) >= getMaxScoredQuestions(maxQuestions)
  );
}

export function shouldEndByDuration(
  elapsedSeconds: number,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
) {
  return elapsedSeconds >= getDurationSeconds(interviewDuration);
}

export function shouldWarnDurationWrapUp(
  elapsedSeconds: number,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
) {
  const totalSeconds = getDurationSeconds(interviewDuration);
  const warningAt = Math.max(0, totalSeconds - 120);
  return elapsedSeconds >= warningAt && elapsedSeconds < totalSeconds;
}

export function hasClosingIntent(message?: string): boolean {
  if (!message?.trim()) return false;
  return CLOSING_INTENT_PATTERN.test(message);
}

export function shouldScheduleInterviewEnd(
  questionCount: number,
  lastAssistantMessage?: string,
  maxQuestions: number = MAX_QUESTIONS,
): boolean {
  return (
    shouldEndInterview(questionCount, maxQuestions) &&
    hasClosingIntent(lastAssistantMessage)
  );
}

export function shouldScheduleInterviewEndByTime(
  elapsedSeconds: number,
  lastAssistantMessage?: string,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): boolean {
  return (
    shouldEndByDuration(elapsedSeconds, interviewDuration) &&
    hasClosingIntent(lastAssistantMessage)
  );
}

export function needsClosingGoodbye(
  questionCount: number,
  lastAssistantMessage?: string,
  maxQuestions: number = MAX_QUESTIONS,
): boolean {
  return (
    shouldEndInterview(questionCount, maxQuestions) &&
    !hasClosingIntent(lastAssistantMessage)
  );
}

export function needsClosingGoodbyeByTime(
  elapsedSeconds: number,
  lastAssistantMessage?: string,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): boolean {
  return (
    shouldEndByDuration(elapsedSeconds, interviewDuration) &&
    !hasClosingIntent(lastAssistantMessage)
  );
}

export function scoredProgress(
  questionCount: number,
  maxQuestions: number = MAX_QUESTIONS,
) {
  const maxScored = getMaxScoredQuestions(maxQuestions);
  return Math.min(100, (countScoredQuestions(questionCount) / maxScored) * 100);
}
