"use client";

import Link from "next/link";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { ReadinessReport } from "@/components/report/readiness-report";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import { RecordingPlayer } from "@/components/replay/recording-player";
import {
  ScreenTimeline,
  type ScreenCaptureItem,
} from "@/components/replay/screen-timeline";
import { Button } from "@/components/ui/button";
import { getPanelist } from "@/lib/ai/personas/panelists";
import { useFailedRecordingRetry } from "@/hooks/use-failed-recording-retry";
import { optimizedVideoUrl } from "@/lib/media/cloudinary-url";
import type { EvaluateResponse, InterviewMessage } from "@/lib/session/interview-store";

type SessionReplayProps = {
  sessionId?: string;
  roleTitle: string;
  messages: InterviewMessage[];
  report?: EvaluateResponse & { shareToken?: string | null };
  shareToken?: string | null;
  publicId: string;
  panelistMode?: string;
  audioRecordingUrl?: string;
  recordingDurationMs?: number;
  recordingStatus?: string | null;
  hasRecording?: boolean;
  screenCaptures?: ScreenCaptureItem[];
  screenReviewNotes?: string[];
  onRecordingRetry?: () => void;
  /** When true, hides owner-only actions (e.g. recording retry). */
  readOnly?: boolean;
};

function panelistLabel(mode?: string) {
  if (mode === "archy") return "Archy Gupta";
  if (mode === "akshay") return "Akshay Saini";
  return "Akshay Saini & Archy Gupta";
}

export function SessionReplay({
  sessionId,
  roleTitle,
  messages,
  report,
  shareToken,
  publicId,
  panelistMode,
  audioRecordingUrl,
  recordingDurationMs,
  recordingStatus = null,
  hasRecording = Boolean(audioRecordingUrl),
  screenCaptures = [],
  screenReviewNotes = [],
  onRecordingRetry,
  readOnly = false,
}: SessionReplayProps) {
  const { showRetry, retrying, retryError, retryUpload } =
    useFailedRecordingRetry(
      sessionId ?? "",
      hasRecording,
      recordingStatus,
      onRecordingRetry,
    );

  const reviewNotes =
    screenReviewNotes.length > 0
      ? screenReviewNotes
      : (report?.screenReviewNotes ?? []);

  const playbackUrl = audioRecordingUrl
    ? optimizedVideoUrl(audioRecordingUrl)
    : undefined;

  return (
    <div className="space-y-8">
      <div className="nd-course-card p-4">
        <p className="text-sm text-muted-foreground">Replay ID</p>
        <p className="mt-1 font-mono text-sm">{publicId}</p>
        <p className="mt-3 text-sm text-muted-foreground">{roleTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Panel: {panelistLabel(panelistMode)}
        </p>
      </div>

      {playbackUrl ? (
        <div>
          <h2 className="mb-4 font-heading text-xl font-medium">
            Session recording
          </h2>
          <RecordingPlayer
            src={playbackUrl}
            durationMs={recordingDurationMs}
          />
        </div>
      ) : null}

      {sessionId && showRetry && !readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ndGhost"
            disabled={retrying}
            onClick={() => void retryUpload()}
          >
            {retrying ? "Retrying upload..." : "Retry recording upload"}
          </Button>
          {retryError ? (
            <p className="text-xs text-red-400">{retryError}</p>
          ) : null}
        </div>
      ) : null}

      {screenCaptures.length > 0 ? (
        <ScreenTimeline captures={screenCaptures} />
      ) : null}

      {reviewNotes.length > 0 ? (
        <div className="nd-course-card p-4">
          <h2 className="mb-3 font-heading text-xl font-medium">
            Screen review notes
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {reviewNotes.map((note, index) => (
              <li key={`${index}-${note.slice(0, 24)}`}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <CodexTerminal title="Session transcript">
        <div className="space-y-4">
          {messages.map((message, index) =>
            message.role === "assistant" ? (
              <div key={`${message.role}-${index}`} className="flex gap-3">
                <PanelistAvatar
                  panelistId={message.speaker ?? "akshay"}
                  className="size-8"
                />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {getPanelist(message.speaker ?? "akshay").name}
                  </p>
                  <div className="nd-message-assistant">{message.content}</div>
                </div>
              </div>
            ) : (
              <div key={`${message.role}-${index}`} className="nd-message-user">
                {message.content}
              </div>
            ),
          )}
        </div>
      </CodexTerminal>

      {report ? (
        <div>
          <h2 className="mb-4 font-heading text-xl font-medium">
            Readiness report
          </h2>
          <ReadinessReport
            report={{ ...report, shareToken: shareToken ?? report.shareToken }}
            roleTitle={roleTitle}
            showShareActions={Boolean(shareToken ?? report.shareToken)}
          />
        </div>
      ) : null}

      {shareToken ? (
        <Button variant="ndPrimary" render={<Link href={`/report/share/${shareToken}`} />}>
          Open shared report
        </Button>
      ) : null}
    </div>
  );
}
