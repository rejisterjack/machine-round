import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { interviewMessageSchema } from "@/lib/session/interview-store";
import { assertSessionOwner } from "@/lib/session/session-access";
import { reconcileSessionTranscript } from "@/lib/session/transcript-reconcile";

const reconcileSchema = z.object({
  sessionId: z.string(),
  messages: z.array(interviewMessageSchema),
});

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = reconcileSchema.parse(await request.json());
  await assertSessionOwner(body.sessionId, authSession.user.id);

  if (!(await isDbReady())) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const result = await reconcileSessionTranscript(
    body.sessionId,
    body.messages,
  );

  return NextResponse.json({ ok: true, ...result });
});
