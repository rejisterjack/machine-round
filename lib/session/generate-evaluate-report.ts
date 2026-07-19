import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ApiError } from "@/lib/api/errors";
import { getAzureEvaluatorModel, getAzureConfig } from "@/lib/ai";
import { formatMessageSpeaker } from "@/lib/ai/personas/panelists";
import { buildEvaluatorPrompt } from "@/lib/ai/prompts/evaluator";
import { withRetry } from "@/lib/api/handler";
import { buildInterviewScopeBlock } from "@/lib/courses/interview-scope";
import { getGroundedQuestionsStructured } from "@/lib/rag/vector-store";
import { isDbReady } from "@/lib/db/ready";
import {
  canGenerateEvaluateReport,
  evaluateIneligibleMessage,
} from "@/lib/session/evaluate-eligibility";
import { buildEvaluatePayloadFromSavedReport } from "@/lib/session/evaluate-cache";
import { shouldReturnCachedReport } from "@/lib/session/evaluate-idempotency";
import type { InterviewMessage } from "@/lib/session/interview-store";
import { evaluateResponseSchema } from "@/lib/session/interview-store";
import { getScreenObservations } from "@/lib/session/media-queries";
import {
  getInterviewSessionById,
  saveReadinessReport,
} from "@/lib/session/persistence";
import { resolveRoleFromSession } from "@/lib/session/session-role-binding";
import { reconcileSessionTranscript } from "@/lib/session/transcript-reconcile";

function normalizeImprovements(improvements: string[]) {
  const unique = improvements.filter(Boolean).slice(0, 3);
  while (unique.length < 2) {
    unique.push(
      "Lead with a concrete example, metric, and tradeoff in your next answer.",
    );
  }
  return unique;
}

export async function generateEvaluateReport(input: {
  sessionId: string;
  userId: string;
  messages: InterviewMessage[];
  weakSignals?: string[];
}) {
  const { role, bound } = await resolveRoleFromSession(
    input.sessionId,
    input.userId,
  );

  let sessionWeakSignals = bound?.weakSignals ?? input.weakSignals ?? [];
  let dbSession = null;

  if (await isDbReady()) {
    await reconcileSessionTranscript(input.sessionId, input.messages);
    dbSession = await getInterviewSessionById(input.sessionId);

    if (dbSession) {
      sessionWeakSignals = dbSession.weakSignals;

      if (shouldReturnCachedReport(Boolean(dbSession.report)) && dbSession.report) {
        return buildEvaluatePayloadFromSavedReport(dbSession.report);
      }
    }
  }

  if (!canGenerateEvaluateReport(input.messages)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      evaluateIneligibleMessage(input.messages),
      400,
    );
  }

  const transcript = input.messages.map(formatMessageSpeaker).join("\n");
  const screenObservations =
    (await isDbReady())
      ? (await getScreenObservations(input.sessionId)).map((observation) => ({
          timestamp: observation.timestamp.toISOString(),
          summary: observation.summary,
        }))
      : [];

  const courseId = role.id !== "job-custom" ? role.id : undefined;
  const scopeBlock = buildInterviewScopeBlock(
    courseId,
    bound?.promptContext ?? dbSession?.promptContext ?? undefined,
  );

  const weakSignalHint = sessionWeakSignals.slice(0, 4).join(", ");
  const practiceQuestions = await getGroundedQuestionsStructured(
    role.title,
    3,
    courseId,
    {
      topicAreas: weakSignalHint ? weakSignalHint.split(/,\s*/) : undefined,
      lastUserAnswer: weakSignalHint || undefined,
      phase: "follow_up",
    },
  ).then((questions) => questions.map((question) => question.content));

  const model = getAzureEvaluatorModel();
  const screenNotes = screenObservations.map((observation) => observation.summary);
  const response = await withRetry(() =>
    model.invoke([
      new SystemMessage(
        buildEvaluatorPrompt(
          role.title,
          transcript,
          screenNotes,
          scopeBlock,
          practiceQuestions,
        ),
      ),
      new HumanMessage("Return the readiness report JSON."),
    ]),
  );

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = evaluateResponseSchema.parse(
    JSON.parse(jsonMatch ? jsonMatch[0] : content),
  );
  parsed.improvements = normalizeImprovements(parsed.improvements);

  if (await isDbReady()) {
    const saved = await saveReadinessReport(
      input.sessionId,
      parsed,
      getAzureConfig().chatDeployment,
      sessionWeakSignals,
      parsed.screenReviewNotes ?? [],
    );

    return buildEvaluatePayloadFromSavedReport(saved);
  }

  return parsed;
}
