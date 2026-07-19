import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler, withRetry } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAzureEvaluatorModel, getAzureConfig } from "@/lib/ai";
import { formatMessageSpeaker } from "@/lib/ai/personas/panelists";
import { buildEvaluatorPrompt } from "@/lib/ai/prompts/evaluator";
import { isDbReady } from "@/lib/db/ready";
import { getScreenObservations } from "@/lib/session/media-queries";
import {
  appendInterviewMessages,
  getInterviewSessionById,
  saveReadinessReport,
} from "@/lib/session/persistence";
import {
  evaluateRequestSchema,
  evaluateResponseSchema,
} from "@/lib/session/interview-store";
import { resolveRole } from "@/lib/session/roles";
import { assertSessionOwnerIfPresent } from "@/lib/session/session-access";

function normalizeImprovements(improvements: string[]) {
  const unique = improvements.filter(Boolean).slice(0, 3);
  while (unique.length < 2) {
    unique.push(
      "Lead with a concrete example, metric, and tradeoff in your next answer.",
    );
  }
  return unique;
}

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = evaluateRequestSchema.parse(await request.json());
  if (!body.sessionId) {
    throw new ApiError("VALIDATION_ERROR", "sessionId is required.", 400);
  }
  await assertSessionOwnerIfPresent(body.sessionId, authSession.user.id);
  const role = await resolveRole(body);
  const transcript = body.messages.map(formatMessageSpeaker).join("\n");

  let sessionWeakSignals = body.weakSignals ?? [];

  if (body.sessionId && (await isDbReady())) {
    const dbSession = await getInterviewSessionById(body.sessionId);
    if (dbSession) {
      sessionWeakSignals = dbSession.weakSignals;
      const unsynced = body.messages.slice(dbSession.messages.length);
      if (unsynced.length > 0) {
        await appendInterviewMessages(body.sessionId, unsynced);
      }
    }
  }

  const screenObservations =
    body.sessionId && (await isDbReady())
      ? (await getScreenObservations(body.sessionId)).map((observation) => ({
          timestamp: observation.timestamp.toISOString(),
          summary: observation.summary,
        }))
      : [];

  const model = getAzureEvaluatorModel();
  const screenNotes = screenObservations.map((o) => o.summary);
  const response = await withRetry(() =>
    model.invoke([
      new SystemMessage(
        buildEvaluatorPrompt(role.title, transcript, screenNotes),
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

  if (body.sessionId && (await isDbReady())) {
    const saved = await saveReadinessReport(
      body.sessionId,
      parsed,
      getAzureConfig().chatDeployment,
      sessionWeakSignals,
      parsed.screenReviewNotes ?? [],
    );

    return NextResponse.json({
      ...parsed,
      shareToken: saved.shareToken,
      weakTopics: saved.weakTopicTags.map((tag) => ({
        label: tag.label,
        weight: tag.weight,
      })),
    });
  }

  return NextResponse.json(parsed);
}, { timeoutMs: API_TIMEOUTS.evaluate });
