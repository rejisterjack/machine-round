import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import {
  createInterviewSession,
  getInterviewSessionById,
} from "@/lib/session/persistence";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";
import { resolveRole } from "@/lib/session/roles";
import { roleSlugToId } from "@/lib/session/role-slug";

const createSessionSchema = z.object({
  roleId: z.string(),
  inputMode: z.enum(["text", "voice", "mixed"]).optional(),
});

function serializeSession(
  session: {
    id: string;
    publicId: string;
    status: string;
    inputMode: string;
    questionCount: number;
    topicsCovered: string[];
    weakSignals: string[];
    role: { slug: import("@/generated/client").RoleSlug; title: string };
    messages?: Array<{ role: string; content: string }>;
    report?: Parameters<typeof reportToEvaluateResponse>[0];
  },
) {
  return {
    id: session.id,
    publicId: session.publicId,
    roleId: roleSlugToId(session.role.slug),
    roleTitle: session.role.title,
    status: session.status,
    inputMode: session.inputMode,
    questionCount: session.questionCount,
    topicsCovered: session.topicsCovered,
    weakSignals: session.weakSignals,
    messages:
      session.messages?.map((message) => ({
        role: message.role,
        content: message.content,
      })) ?? [],
    report: reportToEvaluateResponse(session.report),
    shareToken: session.report?.shareToken ?? null,
  };
}

export const POST = withApiHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const body = createSessionSchema.parse(await request.json());
  await resolveRole({ roleId: body.roleId });

  const interviewSession = await createInterviewSession({
    ...body,
    userId: session.user.id,
  });
  if (!interviewSession) {
    return NextResponse.json({
      persisted: false,
      roleId: body.roleId,
    });
  }

  return NextResponse.json({
    persisted: true,
    ...serializeSession(interviewSession),
  });
});

export const GET = withApiHandler(async (request: Request) => {
  const sessionId = new URL(request.url).searchParams.get("id");
  if (!sessionId) {
    throw new ApiError("VALIDATION_ERROR", "Missing session id.", 400);
  }

  const session = await getInterviewSessionById(sessionId);
  if (!session) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  return NextResponse.json(serializeSession(session));
});
