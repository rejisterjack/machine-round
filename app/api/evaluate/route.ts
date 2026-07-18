import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { getAzureEvaluatorModel } from "@/lib/ai";
import { buildEvaluatorPrompt } from "@/lib/ai/prompts/evaluator";
import {
  evaluateRequestSchema,
  evaluateResponseSchema,
} from "@/lib/session/interview-store";

export async function POST(request: Request) {
  try {
    const body = evaluateRequestSchema.parse(await request.json());
    const transcript = body.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Evaluate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate readiness report." },
      { status: 500 },
    );
  }
}
