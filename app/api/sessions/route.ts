import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createInterviewSession,
  getInterviewSessionById,
  reportToEvaluateResponse,
} from "@/lib/session/persistence";

const createSessionSchema = z.object({
  roleId: z.string(),
  inputMode: z.enum(["text", "voice", "mixed"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSessionSchema.parse(await request.json());
    const session = await createInterviewSession(body);

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleId: body.roleId,
      roleTitle: session.role.title,
      status: session.status,
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create interview session." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const session = await getInterviewSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      publicId: session.publicId,
      roleTitle: session.role.title,
      status: session.status,
      questionCount: session.questionCount,
      topicsCovered: session.topicsCovered,
      weakSignals: session.weakSignals,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      report: reportToEvaluateResponse(session.report),
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to load interview session." },
      { status: 500 },
    );
  }
}
