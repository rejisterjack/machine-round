"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { scoreBadgeClass } from "@/lib/session/score-display";
import { cn } from "@/lib/utils";
import {
  formatDurationLabel,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import { countTopicsDiscussed } from "@/lib/ai/question-cap";
import { useFailedRecordingRetry } from "@/hooks/use-failed-recording-retry";

type SessionHistoryCardProps = {
  id: string;
  publicId: string;
  roleTitle: string;
  panelistMode: string;
  interviewDuration?: InterviewDuration;
  status: string;
  questionCount: number;
  overallScore: number | null;
  hasReport?: boolean;
  lastError?: string | null;
  startedAt: string;
  completedAt: string | null;
  hasRecording: boolean;
  recordingStatus: string | null;
  snapshotCount: number;
  onRecordingRetry?: () => void;
  onDelete?: () => Promise<void>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SessionHistoryCard({
  id,
  publicId,
  roleTitle,
  panelistMode,
  interviewDuration = "minutes_30",
  status,
  questionCount,
  overallScore,
  hasReport = overallScore !== null,
  lastError,
  startedAt,
  completedAt,
  hasRecording,
  recordingStatus,
  snapshotCount,
  onRecordingRetry,
  onDelete,
}: SessionHistoryCardProps) {
  const { showRetry, retrying, retryError, retryUpload } =
    useFailedRecordingRetry(id, hasRecording, recordingStatus, onRecordingRetry);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const panelLabel =
    panelistMode === "both"
      ? "Akshay & Archy"
      : panelistMode === "archy"
        ? "Archy"
        : "Akshay";

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Delete this Machine Round? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete();
    } catch {
      setDeleteError("Could not delete this session.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="nd-course-card flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-medium">{roleTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(completedAt ?? startedAt)} · {panelLabel} ·{" "}
            {formatDurationLabel(interviewDuration)}
          </p>
        </div>
        {overallScore !== null ? (
          <div
            className={cn(
              "flex shrink-0 flex-col items-center rounded-full px-3 py-1.5 text-center",
              scoreBadgeClass(overallScore),
            )}
          >
            <span className="font-heading text-lg font-semibold leading-none tabular-nums">
              {overallScore}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
              /100
            </span>
          </div>
        ) : status === "completed" ? (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
            Report pending
          </span>
        ) : (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            {status}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{countTopicsDiscussed(questionCount)} topics discussed</span>
        {snapshotCount > 0 ? <span>· {snapshotCount} snapshots</span> : null}
        {hasRecording ? (
          <span>· Recording</span>
        ) : recordingStatus === "failed" || showRetry ? (
          <span className="text-amber-400">· Recording upload pending</span>
        ) : (
          <span>· Transcript only</span>
        )}
      </div>

      {lastError && status === "completed" && !hasReport ? (
        <p className="text-xs text-amber-300">{lastError}</p>
      ) : null}

      {retryError ? (
        <p className="text-xs text-red-400">{retryError}</p>
      ) : null}

      {deleteError ? (
        <p className="text-xs text-red-400">{deleteError}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="ndPrimary"
          className="!min-h-9 h-9 px-5 py-0"
          render={<Link href={`/replay/${publicId}`} />}
        >
          Replay
        </Button>
        {hasReport ? (
          <Button
            variant="ndGhost"
            className="h-9 px-4"
            render={<Link href={`/report?session=${id}`} />}
          >
            Report
          </Button>
        ) : status === "completed" ? (
          <Button
            variant="ndGhost"
            className="h-9 px-4"
            render={<Link href={`/report?session=${id}`} />}
          >
            {overallScore === null ? "Generate report" : "Retry report"}
          </Button>
        ) : null}
        {showRetry ? (
          <Button
            variant="ndGhost"
            className="h-9 px-4"
            disabled={retrying}
            onClick={() => void retryUpload()}
          >
            {retrying ? "Retrying upload..." : "Retry recording upload"}
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ndGhost"
            className="h-9 px-4 text-red-400 hover:text-red-300"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
