import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { getAzureChatModel } from "@/lib/ai";
import { buildInterviewerPrompt } from "@/lib/ai/prompts/interviewer";
import { getGroundedQuestions } from "@/lib/rag/vector-store";
import {
  interviewRequestSchema,
  interviewResponseSchema,
} from "@/lib/session/interview-store";
import { MAX_QUESTIONS } from "@/lib/design/tokens";

export async function POST(request: Request) {
  try {
    const body = interviewRequestSchema.parse(await request.json());

    if (body.questionCount >= MAX_QUESTIONS) {
      return NextResponse.json({
        message:
          "That wraps our machine round. Let's generate your readiness report.",
        done: true,
      });
    }

    const model = getAzureChatModel();
    const grounded = await getGroundedQuestions(body.role, 2);
    const transcript = body.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    const response = await model.invoke([
      new SystemMessage(buildInterviewerPrompt(body.role, body.questionCount)),
      new HumanMessage(
        body.messages.length === 0
          ? `Start the interview with your first question.${
              grounded.length
                ? ` Ground one question in this bank if useful: ${grounded.join(" | ")}`
                : ""
            }`
          : `Continue the interview based on this transcript:\n${transcript}`,
      ),
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = interviewResponseSchema.parse(
      JSON.parse(jsonMatch ? jsonMatch[0] : content),
    );

    if (body.questionCount + 1 >= MAX_QUESTIONS) {
      parsed.done = true;
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: "Failed to generate the next interview question." },
      { status: 500 },
    );
  }
}
