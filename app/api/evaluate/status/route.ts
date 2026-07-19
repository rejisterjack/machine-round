import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { buildCachedEvaluatePayload } from "@/lib/session/evaluate-cache";
import { shouldReturnCachedReport } from "@/lib/session/evaluate-idempotency";
import { assertSessionOwner } from "@/lib/session/session-access";


export const GET = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  if (!sessionId) {
    throw new ApiError("VALIDATION_ERROR", "sessionId is required.", 400);
  }

  await assertSessionOwner(sessionId, authSession.user.id);

  if (!(await isDbReady())) {
    return NextResponse.json({ status: "pending" });
  }

  const dbSession = await getInterviewSessionById(sessionId);
  if (!dbSession) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  if (shouldReturnCachedReport(Boolean(dbSession.report))) {
    const report = buildCachedEvaluatePayload(dbSession);
    if (report) {
      return NextResponse.json({ status: "completed", report });
    }
  }

  if (dbSession.status === "error") {
    return NextResponse.json({
      status: "error",
      error: dbSession.lastError ?? "Report generation failed.",
    });
  }

  if (dbSession.status === "thinking") {
    return NextResponse.json({ status: "thinking" });
  }

  return NextResponse.json({ status: dbSession.status });
});
