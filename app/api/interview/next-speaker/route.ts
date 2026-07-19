import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { parseJson } from "@/lib/api/validate";
import { resolveNextSpeaker } from "@/lib/ai/panelist-router";
import { PANELIST_IDS, PANELIST_MODES } from "@/lib/ai/personas/panelists";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertSessionOwnerIfPresent } from "@/lib/session/session-access";
import { interviewMessageSchema } from "@/lib/session/interview-store";

const nextSpeakerSchema = z.object({
  sessionId: z.string(),
  messages: z.array(interviewMessageSchema),
  panelistMode: z.enum(PANELIST_MODES).optional(),
  connectedPanelist: z.enum(PANELIST_IDS),
  roleTitle: z.string(),
});

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = await parseJson(request, nextSpeakerSchema);
  await assertSessionOwnerIfPresent(body.sessionId, authSession.user.id);

  const decision = await resolveNextSpeaker({
    messages: body.messages,
    panelistMode: body.panelistMode ?? "both",
    connectedPanelist: body.connectedPanelist,
    roleTitle: body.roleTitle,
  });

  return NextResponse.json(decision);
}, { timeoutMs: API_TIMEOUTS.default });
