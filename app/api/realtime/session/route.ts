import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildContinuationPrompt, getPriorAssistantSpeaker } from "@/lib/ai/conversation-phases";
import { isThreadComplete } from "@/lib/ai/panelist-router";
import {
  formatMessageSpeaker,
  getPanelist,
  getPanelistForQuestion,
  isPanelistId,
  PANELIST_IDS,
  PANELIST_MODES,
} from "@/lib/ai/personas/panelists";
import { resolveRealtimeVoice } from "@/lib/voice/panelist-voices";
import { getAzureRealtimeConfig, getAzureRealtimeCredentials } from "@/lib/ai";
import { buildInterviewerPrompt } from "@/lib/ai/prompts/interviewer";
import { getCourseInterviewScope } from "@/lib/courses/interview-scope";
import { getGroundedQuestions } from "@/lib/rag/vector-store";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";
import { resolveRole } from "@/lib/session/roles";
import { assertSessionOwnerIfPresent } from "@/lib/session/session-access";
import { interviewDurationSchema, interviewMessageSchema } from "@/lib/session/interview-store";
import { getMaxQuestionsForDuration } from "@/lib/interview/duration-profiles";

const realtimeSessionSchema = z.object({
  sessionId: z.string(),
  roleId: z.string().optional(),
  roleTitle: z.string().optional(),
  role: z.string().optional(),
  questionCount: z.number().int().min(0).optional(),
  panelistMode: z.enum(PANELIST_MODES).optional(),
  interviewDuration: interviewDurationSchema.optional(),
  promptContext: z.string().max(20_000).optional(),
  courseId: z.string().optional(),
  activePanelist: z.enum(PANELIST_IDS).optional(),
  messages: z.array(interviewMessageSchema).optional(),
  screenReviewEnabled: z.boolean().optional(),
  cameraReviewEnabled: z.boolean().optional(),
  routerReason: z.string().optional(),
});

type TurnDetectionConfig = {
  type: "server_vad";
  threshold?: number;
  silence_duration_ms: number;
  prefix_padding_ms: number;
  create_response: boolean;
};

type RealtimeSessionPayload = {
  type: "realtime";
  model: string;
  instructions: string;
  audio: {
    input?: {
      transcription?: { model: string };
      turn_detection?: TurnDetectionConfig;
    };
    output: {
      voice: string;
    };
  };
};

function withServerVad(
  session: RealtimeSessionPayload,
): RealtimeSessionPayload {
  return {
    ...session,
    audio: {
      ...session.audio,
      input: {
        transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 1000,
          prefix_padding_ms: 300,
          create_response: false,
        },
      },
    },
  };
}

async function createRealtimeSession(
  clientSecretsUrl: string,
  apiKey: string,
  session: RealtimeSessionPayload,
) {
  return fetch(clientSecretsUrl, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session }),
  });
}

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = realtimeSessionSchema.parse(
    await request.json().catch(() => ({})),
  );
  await assertSessionOwnerIfPresent(body.sessionId, authSession.user.id);
  const role = await resolveRole(body);
  const questionCount = body.questionCount ?? 0;
  const panelistMode = body.panelistMode ?? "both";
  const interviewDuration = body.interviewDuration ?? "minutes_30";
  const maxQuestions = getMaxQuestionsForDuration(interviewDuration);
  const activePanelist =
    body.activePanelist ?? getPanelistForQuestion(questionCount, panelistMode).id;
  const panelist = getPanelist(
    isPanelistId(activePanelist) ? activePanelist : "akshay",
  );
  const messages = body.messages ?? [];
  const transcript = messages.map(formatMessageSpeaker).join("\n");
  const courseId =
    body.courseId ??
    (body.roleId && body.roleId !== "job-custom" ? body.roleId : undefined);
  const interviewScope = getCourseInterviewScope(courseId, body.promptContext);
  const priorAssistant = getPriorAssistantSpeaker(messages);
  const threadComplete = isThreadComplete(messages, priorAssistant);
  const includeRagHints = questionCount <= 1 || threadComplete;
  const grounded = includeRagHints
    ? await getGroundedQuestions(role.title, 4, courseId, {
        topicAreas: interviewScope?.allowedTopics,
        strictScope: interviewScope?.strictCourseMode,
      })
    : [];
  const ragHint = grounded.length
    ? `\n\nRole-specific question bank (weave in naturally when relevant): ${grounded.join(" | ")}`
    : "";
  const instructions = buildInterviewerPrompt({
    role: role.title,
    questionCount,
    activePanelist: panelist.id,
    panelistMode,
    forVoice: true,
    screenReviewEnabled: body.screenReviewEnabled,
    cameraReviewEnabled: body.cameraReviewEnabled,
    sessionId: body.sessionId,
    interviewDuration,
    maxQuestions,
    courseId,
    promptContext: body.promptContext,
  });
  const fullInstructions = transcript
    ? `${instructions}\n\n${buildContinuationPrompt({
        role: role.title,
        questionCount,
        panelistMode,
        activePanelist: panelist.id,
        transcript,
        messages,
        routerReason: body.routerReason,
        courseId,
        promptContext: body.promptContext,
      })}${ragHint}`
    : `${instructions}${ragHint}`;
  const realtimeCreds = getAzureRealtimeCredentials();
  const realtime = getAzureRealtimeConfig();
  const realtimeVoice = resolveRealtimeVoice(panelist.id, panelist.voice);

  const baseSession: RealtimeSessionPayload = {
    type: "realtime",
    model: realtime.deployment,
    instructions: fullInstructions,
    audio: {
      output: {
        voice: realtimeVoice,
      },
    },
  };

  let serverVadEnabled = true;
  let response = await createRealtimeSession(
    realtime.clientSecretsUrl,
    realtimeCreds.apiKey,
    withServerVad(baseSession),
  );

  if (!response.ok) {
    const turnDetectionError = await response.text();
    serverVadEnabled = false;
    console.warn(
      "Realtime session with turn_detection failed, retrying without it:",
      turnDetectionError,
    );

    response = await createRealtimeSession(
      realtime.clientSecretsUrl,
      realtimeCreds.apiKey,
      baseSession,
    );
  }

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
    activePanelist: panelist.id,
    voice: realtimeVoice,
    requestedVoice: panelist.voice,
    serverVadEnabled,
  });
}, { timeoutMs: API_TIMEOUTS.default });
