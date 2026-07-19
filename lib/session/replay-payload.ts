import { isPanelistId } from "@/lib/ai/personas/panelists";
import type { getSessionMediaForReplay } from "@/lib/session/media-queries";
import { reportToEvaluateResponse } from "@/lib/session/report-queries";

type ReplaySession = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/session/report-queries").getSessionByPublicId>>
>;

type ReplayMedia = Awaited<ReturnType<typeof getSessionMediaForReplay>>;

export function buildReplayPayload(session: ReplaySession, media: ReplayMedia) {
  return {
    id: session.id,
    publicId: session.publicId,
    roleTitle: session.role.title,
    status: session.status,
    panelistMode: session.panelistMode,
    questionCount: session.questionCount,
    topicsCovered: session.topicsCovered,
    weakSignals: session.weakSignals,
    audioRecordingUrl: media.session?.audioRecordingUrl ?? undefined,
    recordingDurationMs: media.session?.recordingDurationMs ?? undefined,
    recordingStatus: media.session?.recordingStatus ?? "none",
    hasRecording:
      media.session?.recordingStatus === "uploaded" &&
      Boolean(media.session?.audioRecordingUrl),
    screenCaptures: media.captures.map((capture) => ({
      url: capture.cloudinaryUrl,
      publicId: capture.cloudinaryPublicId,
      summary: capture.summary,
      capturedAt: capture.capturedAt.toISOString(),
      questionSequence: capture.questionSequence,
    })),
    screenReviewNotes:
      media.session?.report?.screenReviewNotes ??
      media.observations.map((observation) => observation.summary),
    messages: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
      speaker:
        message.speakerName && isPanelistId(message.speakerName)
          ? message.speakerName
          : undefined,
    })),
    report: reportToEvaluateResponse(session.report),
    shareToken: session.report?.shareToken ?? null,
  };
}
