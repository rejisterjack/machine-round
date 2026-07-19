import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { parseJson } from "@/lib/api/validate";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAzureChatModel } from "@/lib/ai";
import {
  formatScreenContextForVoice,
  parseScreenVisionResponse,
  screenVisionMiniSchema,
  screenVisionSchema,
} from "@/lib/interview/screen-vision-schema";
import { isAnalysisImageWithinLimit } from "@/lib/media/image-payload";
import { ANALYSIS_MAX_BASE64_CHARS } from "@/lib/media/media-optimization";
import {
  assertScreenObservationCapacity,
  createScreenObservationIfUnderLimit,
  tryAcquireScreenAnalyzeSlot,
} from "@/lib/session/media-queries";
import { assertSessionOwner } from "@/lib/session/session-access";
import {
  MAX_OBSERVATION_SUMMARY_CHARS,
  MAX_REALTIME_OBSERVATION_SUMMARY_CHARS,
} from "@/lib/session/session-limits";

const screenAnalyzeSchema = z.object({
  sessionId: z.string(),
  imageBase64: z.string().min(100).max(ANALYSIS_MAX_BASE64_CHARS),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  roleTitle: z.string(),
  panelistMode: z.enum(["akshay", "archy", "both"]).optional(),
  priorSummary: z.string().optional(),
  purpose: z.enum(["realtime", "precision", "archive"]).optional(),
  focusQuestion: z.string().optional(),
});

const STRUCTURED_OUTPUT_INSTRUCTIONS = `Return ONLY valid JSON with these fields:
{
  "site": "readable site/app name or unknown",
  "urlHint": "readable URL/path if legible, else omit",
  "windowTitle": "browser/window title if legible, else omit",
  "theme": "light|dark|mixed|unknown",
  "primaryContent": "one sentence about the main visible content",
  "overlays": ["modal/dialog/popup names or descriptions, empty array if none"],
  "cursor": "visible near <location> OR not visible in capture",
  "visibleText": ["up to 8 short text snippets you can actually read"],
  "confidence": "high|medium|low"
}
Rules: only cite text you can read; use "unknown" instead of guessing from layout; never reuse a prior site unless still visible.`;

const REALTIME_SYSTEM_PROMPT = `You assist a live technical interviewer watching a candidate's shared screen. Read browser chrome, tab title, and URL bar when visible. ${STRUCTURED_OUTPUT_INSTRUCTIONS}`;

const PRECISION_SYSTEM_PROMPT = `You assist a live technical interviewer answering a specific screen question. Inspect browser chrome, tab title, URL bar, dialogs/modals/popups, dropdowns, and cursor if visible. ${STRUCTURED_OUTPUT_INSTRUCTIONS}`;

function buildArchiveSystemPrompt(panelistMode?: "akshay" | "archy" | "both") {
  const focusHint =
    panelistMode === "akshay"
      ? "Focus on how they explain approach, tradeoffs, and clarity."
      : panelistMode === "archy"
        ? "Focus on code structure, algorithms, bugs, and technical depth."
        : "Cover both communication and technical depth.";

  return `You assist a technical interviewer reviewing a candidate's shared screen. ${focusHint} Describe visible code, language, logic, bugs, and what they appear to be working on. Max 120 words. Be specific.`;
}

function buildImageContent(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
  useHighDetail: boolean,
) {
  return {
    type: "image_url" as const,
    image_url: {
      url: `data:${mimeType};base64,${imageBase64}`,
      ...(useHighDetail ? { detail: "high" as const } : {}),
    },
  };
}

export const POST = withApiHandler(async (request: Request) => {
  const authSession = await requireAuth();
  const body = await parseJson(request, screenAnalyzeSchema);
  const purpose = body.purpose ?? "archive";
  const isRealtime = purpose === "realtime";
  const isPrecision = purpose === "precision";
  const isStructured = isRealtime || isPrecision;
  const mimeType = body.mimeType ?? "image/jpeg";

  if (!isAnalysisImageWithinLimit(body.imageBase64)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Image payload exceeds maximum allowed size.",
      400,
    );
  }

  await assertSessionOwner(body.sessionId, authSession.user.id);

  if (!isStructured) {
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
  }

  const model = getAzureChatModel();
  const userText = isPrecision
    ? `Role: ${body.roleTitle}\nCandidate question: ${body.focusQuestion ?? "What is on screen right now?"}\nAnswer using the JSON schema.`
    : isRealtime
      ? `Role: ${body.roleTitle}\nWhat is on screen right now? Return the JSON schema.`
      : `Role: ${body.roleTitle}${body.priorSummary ? `\nPrior context: ${body.priorSummary}` : ""}\nDescribe what you see on screen.`;

  const response = await model.invoke([
    new SystemMessage(
      isPrecision
        ? PRECISION_SYSTEM_PROMPT
        : isRealtime
          ? REALTIME_SYSTEM_PROMPT
          : buildArchiveSystemPrompt(body.panelistMode),
    ),
    new HumanMessage({
      content: [
        { type: "text", text: userText },
        buildImageContent(body.imageBase64, mimeType, isStructured),
      ],
    }),
  ]);

  const rawContent =
    typeof response.content === "string"
      ? response.content.trim()
      : JSON.stringify(response.content);

  const timestamp = new Date();

  if (isStructured) {
    const parsed = parseScreenVisionResponse(
      rawContent,
      isPrecision ? "full" : "mini",
    );
    const fallbackSummary = rawContent.slice(
      0,
      MAX_REALTIME_OBSERVATION_SUMMARY_CHARS,
    );
    const summary = parsed
      ? formatScreenContextForVoice(parsed)
      : fallbackSummary;

    const structured = parsed
      ? isPrecision
        ? screenVisionSchema.parse(parsed)
        : screenVisionMiniSchema.parse(parsed)
      : undefined;

    return NextResponse.json({
      summary,
      structured,
      site: structured?.site,
      confidence: structured?.confidence ?? (summary.length > 20 ? "medium" : "low"),
      observationStored: false,
      purpose,
      timestamp: timestamp.toISOString(),
    });
  }

  const trimmedSummary = rawContent.slice(0, MAX_OBSERVATION_SUMMARY_CHARS);

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
        purpose: "archive",
        timestamp: timestamp.toISOString(),
      });
    }
    throw error;
  }

  return NextResponse.json({
    summary: trimmedSummary,
    confidence: trimmedSummary.length > 40 ? "high" : "low",
    observationStored: true,
    purpose: "archive",
    timestamp: timestamp.toISOString(),
  });
}, {
  timeoutMs: API_TIMEOUTS.interview,
});
