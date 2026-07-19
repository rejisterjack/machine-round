"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearFailedRecording,
  loadFailedRecording,
} from "@/lib/media/failed-recording-store";

export function useFailedRecordingRetry(
  sessionId: string,
  hasRecording: boolean,
  recordingStatus: string | null,
  onSuccess?: () => void,
) {
  const [hasLocalRecording, setHasLocalRecording] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void loadFailedRecording(sessionId).then((stored) => {
      if (!cancelled) {
        setHasLocalRecording(Boolean(stored));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const showRetry =
    recordingStatus === "failed" || (!hasRecording && hasLocalRecording);

  const retryUpload = useCallback(async () => {
    setRetrying(true);
    setRetryError(undefined);
    try {
      const stored = await loadFailedRecording(sessionId);
      if (!stored) {
        setRetryError("Recording is no longer available on this device.");
        return;
      }

      const formData = new FormData();
      formData.append("sessionId", sessionId);
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

      await clearFailedRecording(sessionId);
      setHasLocalRecording(false);
      onSuccess?.();
    } catch {
      setRetryError("Could not upload recording. Try again later.");
    } finally {
      setRetrying(false);
    }
  }, [onSuccess, sessionId]);

  return {
    showRetry,
    retrying,
    retryError,
    retryUpload,
  };
}
