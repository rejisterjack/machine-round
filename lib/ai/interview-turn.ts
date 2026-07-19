import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getAzureChatModel } from "@/lib/ai";
import {
  formatMessageSpeaker,
  getPanelistForQuestion,
  isPanelistId,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import { buildInterviewerPrompt } from "@/lib/ai/prompts/interviewer";
import { getConversationPhase } from "@/lib/ai/conversation-phases";
import { getGroundedQuestions } from "@/lib/rag/vector-store";
import { withRetry } from "@/lib/api/handler";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import {
  interviewResponseSchema,
  type InterviewMessage,
  type InterviewResponse,
} from "@/lib/session/interview-store";

function parseInterviewResponse(content: string): InterviewResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return interviewResponseSchema.parse(
    JSON.parse(jsonMatch ? jsonMatch[0] : content),
  );
}

function needsReferencedAnswer(questionCount: number, messages: InterviewMessage[]) {
  return questionCount > 0 && messages.some((message) => message.role === "user");
}

function withSpeaker(
  parsed: InterviewResponse,
  activePanelist: PanelistId,
): InterviewResponse {
  const speaker = isPanelistId(parsed.speaker ?? "")
    ? parsed.speaker
    : activePanelist;
  return { ...parsed, speaker };
}

export async function runInterviewTurn(input: {
  roleTitle: string;
  roleId?: string;
  messages: InterviewMessage[];
  questionCount: number;
  panelistMode?: PanelistMode;
}) {
  const panelistMode = input.panelistMode ?? "both";
  const activePanelist = getPanelistForQuestion(
    input.questionCount,
    panelistMode,
  ).id;

  if (input.questionCount >= MAX_QUESTIONS) {
    return {
      message:
        "That wraps us up — thanks so much for your time today. We'll pull up your readiness report next.",
      speaker: activePanelist,
      done: true,
    } satisfies InterviewResponse;
  }

  const model = getAzureChatModel();
  const grounded = await getGroundedQuestions(
    input.roleTitle,
    2,
    input.roleId,
  );
  const transcript = input.messages.map(formatMessageSpeaker).join("\n");

  const phase = getConversationPhase(input.questionCount);
  const openingHint =
    phase === "greeting"
      ? `Start the interview like a real video call — greet them warmly, introduce yourself${
          panelistMode === "both" ? " and mention your co-panelist" : ""
        }, briefly explain this is a machine round for ${input.roleTitle}, then ease in with a light opener.${
          grounded.length
            ? ` You may ground one question in this bank if useful: ${grounded.join(" | ")}`
            : ""
        }`
      : `Start the interview with your first question.${
          grounded.length
            ? ` Ground one question in this bank if useful: ${grounded.join(" | ")}`
            : ""
        }`;

  const invokeModel = async (strictReferencedAnswer = false) => {
    const response = await model.invoke([
      new SystemMessage(
        buildInterviewerPrompt({
          role: input.roleTitle,
          questionCount: input.questionCount,
          activePanelist,
          panelistMode,
        }),
      ),
      new HumanMessage(
        input.messages.length === 0
          ? openingHint
          : `Continue the interview based on this transcript:\n${transcript}${
              strictReferencedAnswer
                ? "\n\nIMPORTANT: You must include referencedAnswer quoting or paraphrasing the candidate's latest answer."
                : ""
            }`,
      ),
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return withSpeaker(parseInterviewResponse(content), activePanelist);
  };

  let parsed = await withRetry(() => invokeModel(false));

  if (
    needsReferencedAnswer(input.questionCount, input.messages) &&
    !parsed.referencedAnswer?.trim()
  ) {
    parsed = await invokeModel(true);
  }

  if (input.questionCount + 1 >= MAX_QUESTIONS) {
    parsed.done = true;
  }

  return parsed;
}
