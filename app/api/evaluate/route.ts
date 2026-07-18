import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { getAzureEvaluatorModel, getAzureConfig } from "@/lib/ai";
import { buildEvaluatorPrompt } from "@/lib/ai/prompts/evaluator";
import {
  evaluateRequestSchema,
  evaluateResponseSchema,
} from "@/lib/session/interview-store";
import {
  appendInterviewMessages,
  getInterviewSessionById,
  saveReadinessReport,
} from "@/lib/session/persistence";

export async function POST(request: Request) {
  try {
    const body = evaluateRequestSchema.parse(await request.json());
    const transcript = body.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    if (body.sessionId) {
      const dbSession = await getInterviewSessionById(body.sessionId);
      if (dbSession) {
        const unsynced = body.messages.slice(dbSession.messages.length);
        if (unsynced.length > 0) {
          await appendInterviewMessages(body.sessionId, unsynced);
        }
      }
    }

    const model = getAzureEvaluatorModel();
    const response = await model.invoke([
      new SystemMessage(buildEvaluatorPrompt(body.role, transcript)),
      new HumanMessage("Return the readiness report JSON."),
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = evaluateResponseSchema.parse(
      JSON.parse(jsonMatch ? jsonMatch[0] : content),
    );

    if (body.sessionId) {
      const saved = await saveReadinessReport(
        body.sessionId,
        parsed,
        getAzureConfig().chatDeployment,
      );

      return NextResponse.json({
        ...parsed,
        shareToken: saved.shareToken,
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Evaluate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate readiness report." },
      { status: 500 },
    );
  }
}
