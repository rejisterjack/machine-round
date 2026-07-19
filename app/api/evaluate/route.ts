import { NextResponse } from "next/server";
import { after } from "next/server";
import { assertRateLimit, rateLimitKey } from "@/lib/api/assert-rate-limit";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";
import { generateEvaluateReport } from "@/lib/session/generate-evaluate-report";
import { evaluateRequestSchema } from "@/lib/session/interview-store";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { buildCachedEvaluatePayload } from "@/lib/session/evaluate-cache";
import { shouldReturnCachedReport } from "@/lib/session/evaluate-idempotency";
import { assertSessionOwnerIfPresent } from "@/lib/session/session-access";

export const maxDuration = 60;

const EVALUATE_LIMIT = 10;
const EVALUATE_WINDOW_MS = 60_000;

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  assertRateLimit(
    request,
    rateLimitKey(request, ["evaluate", authSession.user.id]),
    { limit: EVALUATE_LIMIT, windowMs: EVALUATE_WINDOW_MS },
    "Too many report generations. Please wait a minute.",
  );

  const body = evaluateRequestSchema.parse(await request.json());
  if (!body.sessionId) {
    throw new ApiError("VALIDATION_ERROR", "sessionId is required.", 400);
  }
  await assertSessionOwnerIfPresent(body.sessionId, authSession.user.id);

  const sync = new URL(request.url).searchParams.get("sync") === "1";

  if (await isDbReady()) {
    const dbSession = await getInterviewSessionById(body.sessionId);
    if (dbSession && shouldReturnCachedReport(Boolean(dbSession.report))) {
      const cached = buildCachedEvaluatePayload(dbSession);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    if (
      !sync &&
      dbSession?.status === "thinking" &&
      Date.now() - dbSession.updatedAt.getTime() < 120_000
    ) {
      return NextResponse.json(
        { jobId: body.sessionId, status: "thinking" },
        { status: 202 },
      );
    }
  }

  if (!sync && (await isDbReady())) {
    await prisma.interviewSession.update({
      where: { id: body.sessionId },
      data: { status: "thinking", lastError: null },
    });

    after(async () => {
      try {
        await generateEvaluateReport({
          sessionId: body.sessionId!,
          userId: authSession.user.id,
          messages: body.messages,
          weakSignals: body.weakSignals,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Evaluate failed.";
        await prisma.interviewSession.update({
          where: { id: body.sessionId! },
          data: { status: "error", lastError: message.slice(0, 500) },
        });
      }
    });

    return NextResponse.json(
      { jobId: body.sessionId, status: "thinking" },
      { status: 202 },
    );
  }

  const report = await generateEvaluateReport({
    sessionId: body.sessionId,
    userId: authSession.user.id,
    messages: body.messages,
    weakSignals: body.weakSignals,
  });

  return NextResponse.json(report);
}, { timeoutMs: API_TIMEOUTS.evaluate });
