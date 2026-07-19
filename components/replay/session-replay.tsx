"use client";

import Link from "next/link";
import { FileText, Monitor } from "lucide-react";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { ReadinessReport } from "@/components/report/readiness-report";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import { RecordingPlayer } from "@/components/replay/recording-player";
import { ReplayHero } from "@/components/replay/replay-hero";
import { ReplaySectionNav } from "@/components/replay/replay-section-nav";
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
  questionCount?: number;
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

function countQuestions(messages: InterviewMessage[]) {
  return messages.filter((message) => message.role === "assistant").length;
}

export function SessionReplay({
  sessionId,
  roleTitle,
  messages,
  report,
  shareToken,
  publicId,
  panelistMode,
  questionCount,
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

  const scoredQuestions = questionCount ?? countQuestions(messages);
  let questionTurn = 0;

  return (
    <div className="space-y-8">
      <ReplaySectionNav
        hasRecording={Boolean(playbackUrl)}
        hasScreen={screenCaptures.length > 0 || reviewNotes.length > 0}
        hasReport={Boolean(report)}
      />

      <ReplayHero
        roleTitle={roleTitle}
        publicId={publicId}
        panelistLabel={panelistLabel(panelistMode)}
        questionCount={scoredQuestions}
        messageCount={messages.length}
        hasRecording={Boolean(playbackUrl)}
        snapshotCount={screenCaptures.length}
        overallScore={report?.overallScore}
        readOnly={readOnly}
      />

      {playbackUrl ? (
        <section id="recording" className="scroll-mt-28">
          <RecordingPlayer
            src={playbackUrl}
            durationMs={recordingDurationMs}
          />
        </section>
      ) : null}

      {sessionId && showRetry && !readOnly ? (
        <div className="nd-course-card flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Recording upload did not finish. Retry to attach media to this
            replay.
          </p>
          <Button
            variant="ndPrimary"
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
        <section className="nd-course-card scroll-mt-28 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Monitor className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-medium">
                Screen review notes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI observations from your shared screen during the session.
              </p>
              <ul className="mt-4 space-y-3">
                {reviewNotes.map((note, index) => (
                  <li
                    key={`${index}-${note.slice(0, 24)}`}
                    className="flex gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section id="transcript" className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-medium">Session transcript</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Full conversation replay with panelist attribution.
          </p>
        </div>
        <CodexTerminal title="Namaste Machine Round · transcript">
          <div className="space-y-4">
            {messages.map((message, index) => {
              if (message.role === "assistant") {
                questionTurn += 1;
              }

              return message.role === "assistant" ? (
                <div
                  key={`${message.role}-${index}`}
                  className="nd-replay-transcript-turn"
                >
                  <div className="flex gap-3">
                    <PanelistAvatar
                      panelistId={message.speaker ?? "akshay"}
                      className="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {getPanelist(message.speaker ?? "akshay").name}
                        </p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Q{questionTurn}
                        </span>
                      </div>
                      <div className="nd-message-assistant">{message.content}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={`${message.role}-${index}`} className="nd-replay-transcript-turn">
                  <p className="mb-2 text-right text-xs font-medium text-muted-foreground">
                    You
                  </p>
                  <div className="nd-message-user">{message.content}</div>
                </div>
              );
            })}
          </div>
        </CodexTerminal>
      </section>

      {report ? (
        <section id="report" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-medium">
                Readiness report
              </h2>
              <p className="text-sm text-muted-foreground">
                Evaluator scores and improvement actions from this session.
              </p>
            </div>
          </div>
          <ReadinessReport
            report={{ ...report, shareToken: shareToken ?? report.shareToken }}
            roleTitle={roleTitle}
            sessionId={sessionId}
            showShareActions={Boolean(shareToken ?? report.shareToken) && !readOnly}
          />
        </section>
      ) : null}

      {shareToken ? (
        <div className="nd-report-replay-banner">
          <div>
            <p className="font-heading text-base font-medium">
              Shared readiness report
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open the public report view for scores and export options.
            </p>
          </div>
          <Button
            variant="ndPrimary"
            render={<Link href={`/report/share/${shareToken}`} />}
          >
            <FileText className="size-4" />
            Open shared report
          </Button>
        </div>
      ) : null}
    </div>
  );
}
