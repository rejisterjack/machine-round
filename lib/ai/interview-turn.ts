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
import { getCourseInterviewScope } from "@/lib/courses/interview-scope";
import {
  buildRagGroundingBlock,
  getGroundedQuestionsStructured,
} from "@/lib/rag/vector-store";
import { withRetry } from "@/lib/api/handler";
import { getMaxQuestionsForDuration } from "@/lib/interview/duration-profiles";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { resolveMaxQuestions } from "@/lib/ai/question-cap";
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

function getLastMessageContent(
  messages: InterviewMessage[],
  role: InterviewMessage["role"],
): string | undefined {
  return messages.filter((message) => message.role === role).at(-1)?.content;
}

export async function runInterviewTurn(input: {
  roleTitle: string;
  roleId?: string;
  messages: InterviewMessage[];
  questionCount: number;
  panelistMode?: PanelistMode;
  promptContext?: string;
  interviewDuration?: InterviewDuration;
}) {
  const panelistMode = input.panelistMode ?? "both";
  const activePanelist = getPanelistForQuestion(
    input.questionCount,
    panelistMode,
  ).id;
  const maxQuestions = resolveMaxQuestions(undefined, input.interviewDuration);

  if (input.questionCount >= maxQuestions) {
    return {
      message:
        "That wraps us up — thanks so much for your time today. We'll pull up your readiness report next.",
      speaker: activePanelist,
      done: true,
    } satisfies InterviewResponse;
  }

  const model = getAzureChatModel();
  const courseId =
    input.roleId && input.roleId !== "job-custom" ? input.roleId : undefined;
  const interviewScope = getCourseInterviewScope(courseId, input.promptContext);
  const lastUserAnswer = getLastMessageContent(input.messages, "user");
  const lastAssistant = getLastMessageContent(input.messages, "assistant");
  const phase = getConversationPhase(input.questionCount, maxQuestions);

  const grounded = await getGroundedQuestionsStructured(
    input.roleTitle,
    3,
    courseId,
    {
      topicAreas: interviewScope?.allowedTopics,
      strictScope: interviewScope?.strictCourseMode,
      lastUserAnswer,
      lastAssistant,
      messages: input.messages,
      phase: input.messages.length === 0 ? "greeting" : "follow_up",
    },
  );
  const ragBlock = buildRagGroundingBlock(grounded);
  const transcript = input.messages.map(formatMessageSpeaker).join("\n");

  const openingHint =
    phase === "greeting"
      ? `Start the interview like a real video call — greet them warmly, introduce yourself${
          panelistMode === "both" ? " and mention your co-panelist" : ""
        }, briefly explain this is a machine round for ${input.roleTitle}, then ease in with a light opener.`
      : "Start the interview with your first question.";

  const invokeModel = async (strictReferencedAnswer = false) => {
    const response = await model.invoke([
      new SystemMessage(
        buildInterviewerPrompt({
          role: input.roleTitle,
          questionCount: input.questionCount,
          activePanelist,
          panelistMode,
          courseId,
          promptContext: input.promptContext,
          interviewDuration: input.interviewDuration,
          maxQuestions,
          ragBlock,
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

  if (input.questionCount + 1 >= maxQuestions) {
    parsed.done = true;
  }

  return parsed;
}
