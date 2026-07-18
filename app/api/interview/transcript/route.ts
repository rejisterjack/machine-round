import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { isDbReady } from "@/lib/db/ready";
import { appendInterviewMessages } from "@/lib/session/persistence";
import { transcriptRequestSchema } from "@/lib/session/interview-store";

export const POST = withApiHandler(async (request: Request) => {
  const body = transcriptRequestSchema.parse(await request.json());

  if (await isDbReady()) {
    await appendInterviewMessages(
      body.sessionId,
      [{ role: "user", content: body.content.trim() }],
      { inputMode: "voice" },
    );
  }

  return NextResponse.json({ ok: true });
});
