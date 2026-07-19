"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDurationLabel,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import { countScoredQuestions } from "@/lib/ai/question-cap";
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
    <article className="nd-course-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-medium">{roleTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(completedAt ?? startedAt)} · {panelLabel} ·{" "}
            {formatDurationLabel(interviewDuration)}
          </p>
        </div>
        {overallScore !== null ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              overallScore >= 70
                ? "bg-emerald-500/15 text-emerald-400"
                : overallScore >= 50
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-red-500/15 text-red-400",
            )}
          >
            {overallScore}
          </span>
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
        <span>{countScoredQuestions(questionCount)} scored questions</span>
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

      <div className="flex flex-wrap gap-2">
        <Button variant="ndPrimary" className="w-full sm:w-auto" render={<Link href={`/replay/${publicId}`} />}>
          Replay
        </Button>
        {hasReport ? (
          <Button
            variant="ndGhost"
            className="w-full sm:w-auto"
            render={<Link href={`/report?session=${id}`} />}
          >
            Report
          </Button>
        ) : status === "completed" ? (
          <Button
            variant="ndGhost"
            className="w-full sm:w-auto"
            render={<Link href={`/report?session=${id}`} />}
          >
            {overallScore === null ? "Generate report" : "Retry report"}
          </Button>
        ) : null}
        {showRetry ? (
          <Button
            variant="ndGhost"
            className="w-full sm:w-auto"
            disabled={retrying}
            onClick={() => void retryUpload()}
          >
            {retrying ? "Retrying upload..." : "Retry recording upload"}
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ndGhost"
            className="w-full sm:w-auto text-red-400"
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
