import type { InterviewMessage } from "@/lib/session/interview-store";

/** Minimum transcript messages before generating a readiness report. */
export const MIN_EVALUATE_MESSAGES = 4;

/** Minimum candidate answers required for a meaningful report. */
export const MIN_EVALUATE_USER_MESSAGES = 1;

export type ReportEligibility =
  | { status: "eligible" }
  | { status: "no_transcript" }
  | { status: "no_user_answers" }
  | { status: "too_short" };

export function countUserMessages(messages: InterviewMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function getReportEligibility(
  messages: InterviewMessage[],
): ReportEligibility {
  if (messages.length === 0) {
    return { status: "no_transcript" };
  }
  if (countUserMessages(messages) < MIN_EVALUATE_USER_MESSAGES) {
    return { status: "no_user_answers" };
  }
  if (messages.length < MIN_EVALUATE_MESSAGES) {
    return { status: "too_short" };
  }
  return { status: "eligible" };
}

export function canGenerateEvaluateReport(messages: InterviewMessage[]): boolean {
  return getReportEligibility(messages).status === "eligible";
}

/** Sessions with no candidate speech should not enter the report flow. */
export function shouldSkipReportForEarlyEnd(
  messages: InterviewMessage[],
): boolean {
  const eligibility = getReportEligibility(messages);
  return (
    eligibility.status === "no_transcript" ||
    eligibility.status === "no_user_answers"
  );
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
