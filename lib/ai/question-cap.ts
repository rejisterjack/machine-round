import {
  DEFAULT_INTERVIEW_DURATION,
  getDurationSeconds,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";

/** Greeting + warmup assistant turns before scored interview topics. */
export const GREETING_WARMUP_TURNS = 2;

const CLOSING_INTENT_PATTERN =
  /\b(thank you|thanks for|wrap(?:ping)? up|that(?:'s| is) all|readiness report|your report|good luck|great session|end of (?:the )?interview)\b/i;

/** Topics discussed after greeting and warmup (analytics only — not a session cap). */
export function countTopicsDiscussed(questionCount: number) {
  return Math.max(0, questionCount - GREETING_WARMUP_TURNS);
}

/** @deprecated Use countTopicsDiscussed */
export const countScoredQuestions = countTopicsDiscussed;

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

export function durationProgress(
  elapsedSeconds: number,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
) {
  const total = getDurationSeconds(interviewDuration);
  return total > 0 ? Math.min(100, (elapsedSeconds / total) * 100) : 0;
}

/** Bucket for realtime instruction cache — refreshes when entering wrap-up window. */
export function getInstructionPhaseBucket(
  elapsedSeconds: number,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): number {
  if (
    shouldWarnDurationWrapUp(elapsedSeconds, interviewDuration) ||
    shouldEndByDuration(elapsedSeconds, interviewDuration)
  ) {
    return 1;
  }
  return 0;
}
