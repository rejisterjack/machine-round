import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { getAzureRealtimeConfig, getAzureRealtimeCredentials } from "@/lib/ai";
import { buildInterviewerPrompt } from "@/lib/ai/prompts/interviewer";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";
import { resolveRole } from "@/lib/session/roles";

const realtimeSessionSchema = z.object({
  sessionId: z.string().optional(),
  roleId: z.string().optional(),
  roleTitle: z.string().optional(),
  role: z.string().optional(),
  questionCount: z.number().int().min(0).optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  const body = realtimeSessionSchema.parse(
    await request.json().catch(() => ({})),
  );
  const role = await resolveRole(body);
  const questionCount = body.questionCount ?? 0;
  const realtimeCreds = getAzureRealtimeCredentials();
  const realtime = getAzureRealtimeConfig();

  const response = await fetch(realtime.clientSecretsUrl, {
    method: "POST",
    headers: {
      "api-key": realtimeCreds.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: realtime.deployment,
        instructions: buildInterviewerPrompt(role.title, questionCount),
        audio: {
          output: {
            voice: "alloy",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Realtime session error:", errorText);

    if (body.sessionId && (await isDbReady())) {
      await prisma.realtimeSessionLog.create({
        data: {
          interviewSessionId: body.sessionId,
          deployment: realtime.deployment,
          error: errorText.slice(0, 2000),
        },
      });
    }

    throw new ApiError(
      "UPSTREAM_ERROR",
      "Failed to create realtime session.",
      502,
    );
  }

  const data = (await response.json()) as {
    value?: string;
    expires_at?: number;
    client_secret?: { value?: string; expires_at?: number };
    session?: unknown;
  };

  if (body.sessionId && (await isDbReady())) {
    await prisma.realtimeSessionLog.create({
      data: {
        interviewSessionId: body.sessionId,
        deployment: realtime.deployment,
      },
    });

    await prisma.interviewSession.update({
      where: { id: body.sessionId },
      data: { inputMode: "voice" },
    });
  }

  return NextResponse.json({
    ...data,
    client_secret: data.client_secret ?? {
      value: data.value,
      expires_at: data.expires_at,
    },
    callsUrl: realtime.callsUrl,
    deployment: realtime.deployment,
  });
}, { timeoutMs: API_TIMEOUTS.default });
