import { MAX_QUESTIONS } from "@/lib/design/tokens";

/** Greeting + warmup assistant turns before scored interview questions. */
export const GREETING_WARMUP_TURNS = 2;

/** PRD targets 5–7 scored questions; cap explore phase after warmup. */
export const MAX_SCORED_QUESTIONS = MAX_QUESTIONS - GREETING_WARMUP_TURNS;

export function countScoredQuestions(questionCount: number) {
  return Math.max(0, questionCount - GREETING_WARMUP_TURNS);
}

export function shouldEndInterview(questionCount: number) {
  return countScoredQuestions(questionCount) >= MAX_SCORED_QUESTIONS;
}

export function scoredProgress(questionCount: number) {
  return Math.min(
    100,
    (countScoredQuestions(questionCount) / MAX_SCORED_QUESTIONS) * 100,
  );
}
