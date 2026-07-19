import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { generateEvaluateReport } from "@/lib/session/generate-evaluate-report";
import { evaluateRequestSchema } from "@/lib/session/interview-store";

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = evaluateRequestSchema.parse(await request.json());
  if (!body.sessionId) {
    throw new ApiError("VALIDATION_ERROR", "sessionId is required.", 400);
  }

  const report = await generateEvaluateReport({
    sessionId: body.sessionId,
    userId: authSession.user.id,
    messages: body.messages,
    weakSignals: body.weakSignals,
  });

  return NextResponse.json(report);
}, { timeoutMs: API_TIMEOUTS.evaluate });
