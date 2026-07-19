import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { isDbReady } from "@/lib/db/ready";
import { appendInterviewMessages } from "@/lib/session/persistence";
import { transcriptRequestSchema } from "@/lib/session/interview-store";
import { assertSessionOwner } from "@/lib/session/session-access";

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = transcriptRequestSchema.parse(await request.json());
  await assertSessionOwner(body.sessionId, authSession.user.id);

  if (await isDbReady()) {
    await appendInterviewMessages(
      body.sessionId,
      [
        {
          role: body.role,
          content: body.content.trim(),
          speaker: body.speaker,
        },
      ],
      { inputMode: "voice" },
    );
  }

  return NextResponse.json({ ok: true });
});
