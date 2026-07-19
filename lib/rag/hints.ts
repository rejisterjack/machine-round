import type { GroundedQuestion } from "@/lib/rag/types";

export type RagHintOptions = {
  forVoice?: boolean;
};

export function buildRagGroundingBlock(
  questions: GroundedQuestion[] | string[],
  options: RagHintOptions = {},
): string {
  if (questions.length === 0) return "";

  const lines = questions.map((question, index) => {
    const content = typeof question === "string" ? question : question.content;
    return `${index + 1}. ${content}`;
  });

  const usageRules = options.forVoice
    ? `- Weave one bank question naturally when it fits the conversation — do not read it verbatim.
- Do not repeat a question already asked in this session.
- Prefer follow-ups on the candidate's latest answer before switching to a new bank topic.`
    : `- Ground at most one question from the bank per turn when relevant.
- Do not repeat questions already asked in this session.
- Adapt bank wording to the conversation — do not copy verbatim.`;

  return `QUESTION BANK (role-specific grounding):
${lines.join("\n")}

Usage:
${usageRules}`;
}

/** Legacy string[] helper for callers that only need content lines. */
export function groundedQuestionsToStrings(
  questions: GroundedQuestion[],
): string[] {
  return questions.map((question) => question.content);
}
