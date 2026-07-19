import type { InterviewMessage } from "@/lib/session/interview-store";

/** Minimum transcript messages before generating a readiness report. */
export const MIN_EVALUATE_MESSAGES = 4;

/** Minimum candidate answers required for a meaningful report. */
export const MIN_EVALUATE_USER_MESSAGES = 1;

export function countUserMessages(messages: InterviewMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function canGenerateEvaluateReport(messages: InterviewMessage[]): boolean {
  if (messages.length < MIN_EVALUATE_MESSAGES) return false;
  return countUserMessages(messages) >= MIN_EVALUATE_USER_MESSAGES;
}

export function evaluateIneligibleMessage(messages: InterviewMessage[]): string {
  if (messages.length === 0) {
    return "No interview transcript found for this session.";
  }
  if (countUserMessages(messages) < MIN_EVALUATE_USER_MESSAGES) {
    return "This session has no candidate answers yet — complete a longer interview to generate a report.";
  }
  if (messages.length < MIN_EVALUATE_MESSAGES) {
    return "This interview was too short to generate a meaningful readiness report. Try a full round.";
  }
  return "This session cannot be evaluated yet.";
}
