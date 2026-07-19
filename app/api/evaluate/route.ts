import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler, withRetry } from "@/lib/api/handler";
import { getAzureEvaluatorModel, getAzureConfig } from "@/lib/ai";
import { formatMessageSpeaker } from "@/lib/ai/personas/panelists";
import { buildEvaluatorPrompt } from "@/lib/ai/prompts/evaluator";
import { isDbReady } from "@/lib/db/ready";
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
  const body = evaluateRequestSchema.parse(await request.json());
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

  const model = getAzureEvaluatorModel();
  const response = await withRetry(() =>
    model.invoke([
      new SystemMessage(buildEvaluatorPrompt(role.title, transcript)),
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
