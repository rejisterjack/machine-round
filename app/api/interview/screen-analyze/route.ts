import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAzureChatModel } from "@/lib/ai";
import {
  isImageBase64WithinLimit,
  MAX_IMAGE_BASE64_CHARS,
} from "@/lib/media/image-payload";
import {
  assertScreenObservationCapacity,
  createScreenObservationIfUnderLimit,
  tryAcquireScreenAnalyzeSlot,
} from "@/lib/session/media-queries";
import { assertSessionOwner } from "@/lib/session/session-access";
import { MAX_OBSERVATION_SUMMARY_CHARS } from "@/lib/session/session-limits";

const screenAnalyzeSchema = z.object({
  sessionId: z.string(),
  imageBase64: z.string().min(100).max(MAX_IMAGE_BASE64_CHARS),
  roleTitle: z.string(),
  panelistMode: z.enum(["akshay", "archy", "both"]).optional(),
  priorSummary: z.string().optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = screenAnalyzeSchema.parse(await request.json());

  if (!isImageBase64WithinLimit(body.imageBase64)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Image payload exceeds maximum allowed size.",
      400,
    );
  }

  await assertSessionOwner(body.sessionId, authSession.user.id);

  try {
    await assertScreenObservationCapacity(body.sessionId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return NextResponse.json(
        {
          error: error.message,
          skipped: true,
          reason: "capacity",
          observationStored: false,
        },
        { status: 400 },
      );
    }
    throw error;
  }

  const acquired = await tryAcquireScreenAnalyzeSlot(body.sessionId);
  if (!acquired) {
    return NextResponse.json(
      {
        error: "Screen analysis rate limited.",
        skipped: true,
        reason: "rate_limit",
      },
      { status: 429 },
    );
  }

  const model = getAzureChatModel();
  const focusHint =
    body.panelistMode === "akshay"
      ? "Focus on how they explain approach, tradeoffs, and clarity."
      : body.panelistMode === "archy"
        ? "Focus on code structure, algorithms, bugs, and technical depth."
        : "Cover both communication and technical depth.";

  const response = await model.invoke([
    new SystemMessage(
      `You assist a technical interviewer reviewing a candidate's shared screen. ${focusHint} Describe visible code, language, logic, bugs, and what they appear to be working on. Max 120 words. Be specific.`,
    ),
    new HumanMessage({
      content: [
        {
          type: "text",
          text: `Role: ${body.roleTitle}${body.priorSummary ? `\nPrior context: ${body.priorSummary}` : ""}\nDescribe what you see on screen.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${body.imageBase64}`,
          },
        },
      ],
    }),
  ]);

  const summary =
    typeof response.content === "string"
      ? response.content.trim()
      : JSON.stringify(response.content);

  const trimmedSummary = summary.slice(0, MAX_OBSERVATION_SUMMARY_CHARS);
  const timestamp = new Date();

  try {
    await createScreenObservationIfUnderLimit({
      sessionId: body.sessionId,
      summary: trimmedSummary,
      timestamp,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return NextResponse.json({
        summary: trimmedSummary,
        confidence: trimmedSummary.length > 40 ? "high" : "low",
        observationStored: false,
      });
    }
    throw error;
  }

  return NextResponse.json({
    summary: trimmedSummary,
    confidence: trimmedSummary.length > 40 ? "high" : "low",
    observationStored: true,
    timestamp: timestamp.toISOString(),
  });
}, { timeoutMs: API_TIMEOUTS.interview });
