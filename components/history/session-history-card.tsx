"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearFailedRecording,
  loadFailedRecording,
} from "@/lib/media/failed-recording-store";

type SessionHistoryCardProps = {
  id: string;
  publicId: string;
  roleTitle: string;
  panelistMode: string;
  status: string;
  questionCount: number;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
  hasRecording: boolean;
  recordingStatus: string | null;
  snapshotCount: number;
  onRecordingRetry?: () => void;
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
  status,
  questionCount,
  overallScore,
  startedAt,
  completedAt,
  hasRecording,
  recordingStatus,
  snapshotCount,
  onRecordingRetry,
}: SessionHistoryCardProps) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string>();
  const panelLabel =
    panelistMode === "both"
      ? "Akshay & Archy"
      : panelistMode === "archy"
        ? "Archy"
        : "Akshay";

  async function handleRetryUpload() {
    setRetrying(true);
    setRetryError(undefined);
    try {
      const stored = await loadFailedRecording(id);
      if (!stored) {
        setRetryError("Recording is no longer available on this device.");
        return;
      }

      const formData = new FormData();
      formData.append("sessionId", id);
      formData.append("recording", stored.blob, "session-recording.webm");
      formData.append("durationMs", String(stored.durationMs));
      formData.append("mimeType", stored.blob.type || "video/webm");

      const response = await fetch("/api/media/session-recording", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      await clearFailedRecording(id);
      onRecordingRetry?.();
    } catch {
      setRetryError("Could not upload recording. Try again later.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <article className="nd-course-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-medium">{roleTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(completedAt ?? startedAt)} · {panelLabel}
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
        ) : (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            {status}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{questionCount} questions</span>
        {snapshotCount > 0 ? <span>· {snapshotCount} snapshots</span> : null}
        {hasRecording ? (
          <span>· Recording</span>
        ) : recordingStatus === "failed" ? (
          <span className="text-amber-400">· Recording upload failed</span>
        ) : (
          <span>· Transcript only</span>
        )}
      </div>

      {retryError ? (
        <p className="text-xs text-red-400">{retryError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="ndPrimary" className="w-full sm:w-auto" render={<Link href={`/replay/${publicId}`} />}>
          Replay
        </Button>
        {recordingStatus === "failed" ? (
          <Button
            variant="ndGhost"
            className="w-full sm:w-auto"
            disabled={retrying}
            onClick={() => void handleRetryUpload()}
          >
            {retrying ? "Retrying upload..." : "Retry recording upload"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
