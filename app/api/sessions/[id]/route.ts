import { NextResponse } from "next/server";
import { z } from "zod";
import type { SessionStatus } from "@/generated/client";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { prisma } from "@/lib/prisma";

const patchSessionSchema = z.object({
  status: z
    .enum(["active", "thinking", "completed", "abandoned", "error"])
    .optional(),
  questionCount: z.number().int().min(0).optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
  lastError: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const session = await getInterviewSessionById(id);
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
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to load interview session." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const body = patchSessionSchema.parse(await request.json());
    const session = await prisma.interviewSession.update({
      where: { id },
      data: {
        status: body.status as SessionStatus | undefined,
        questionCount: body.questionCount,
        topicsCovered: body.topicsCovered,
        weakSignals: body.weakSignals,
        lastError: body.lastError ?? undefined,
      },
    });

    return NextResponse.json({
      id: session.id,
      status: session.status,
      questionCount: session.questionCount,
    });
  } catch (error) {
    console.error("Patch session error:", error);
    return NextResponse.json(
      { error: "Failed to update interview session." },
      { status: 500 },
    );
  }
}
