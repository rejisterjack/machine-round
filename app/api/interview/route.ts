import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { getAzureChatModel } from "@/lib/ai";
import { buildInterviewerPrompt } from "@/lib/ai/prompts/interviewer";
import { getGroundedQuestions } from "@/lib/rag/vector-store";
import {
  interviewRequestSchema,
  interviewResponseSchema,
} from "@/lib/session/interview-store";
import {
  appendInterviewMessages,
  getInterviewSessionById,
} from "@/lib/session/persistence";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import { prisma } from "@/lib/prisma";

async function syncUnsyncedMessages(sessionId: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const dbSession = await getInterviewSessionById(sessionId);
  if (!dbSession) return;

  const unsynced = messages.slice(dbSession.messages.length);
  if (unsynced.length === 0) return;

  await appendInterviewMessages(sessionId, unsynced, { status: "thinking" });
}

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

    if (body.sessionId) {
      await syncUnsyncedMessages(body.sessionId, body.messages);
      await prisma.interviewSession.update({
        where: { id: body.sessionId },
        data: { status: "thinking", lastError: null },
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

    if (body.sessionId) {
      await appendInterviewMessages(
        body.sessionId,
        [{ role: "assistant", content: parsed.message }],
        {
          referencedAnswer: parsed.referencedAnswer,
          questionCount: body.questionCount + 1,
          topicsCovered: parsed.topicsCovered,
          weakSignals: parsed.weakSignals,
          status: parsed.done ? "completed" : "active",
          completedAt: parsed.done ? new Date() : null,
        },
      );
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
