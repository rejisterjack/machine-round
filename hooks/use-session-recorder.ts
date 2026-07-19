"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearFailedRecording,
  saveFailedRecording,
} from "@/lib/media/failed-recording-store";
import {
  RECORDING_AUDIO_BPS,
  RECORDING_VIDEO_BPS,
} from "@/lib/media/media-optimization";
import {
  createRecordingVideoPipeline,
  type RecordingVideoPipeline,
} from "@/lib/media/recording-video-pipeline";

const MAX_RECORDING_MS = 15 * 60 * 1000;
const CHUNK_INTERVAL_MS = 30_000;

type SessionRecorderOptions = {
  sessionId?: string;
  micStream: MediaStream | null;
  getRemoteAudioElement: () => HTMLAudioElement | null;
  screenStream?: MediaStream | null;
  cameraStream?: MediaStream | null;
};

type UploadResult = {
  recordingUrl: string;
  durationMs?: number;
};

export type StopUploadResult =
  | { kind: "skipped" }
  | { kind: "uploaded"; result: UploadResult }
  | { kind: "failed" };

function pickMimeType(hasVideo: boolean) {
  const mimeCandidates = hasVideo
    ? [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ]
    : ["audio/webm;codecs=opus", "audio/webm"];

  return (
    mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

export function useSessionRecorder(options: SessionRecorderOptions) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const compositeStreamRef = useRef<MediaStream | null>(null);
  const videoPipelineRef = useRef<RecordingVideoPipeline | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof AudioContext !== "undefined";

  const cleanupStreams = useCallback(() => {
    videoPipelineRef.current?.stop();
    videoPipelineRef.current = null;
    compositeStreamRef.current?.getTracks().forEach((track) => track.stop());
    compositeStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const buildCompositeStream = useCallback(async () => {
    const opts = optionsRef.current;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();

    if (opts.micStream) {
      const micSource = audioContext.createMediaStreamSource(opts.micStream);
      micSource.connect(destination);
    }

    const remoteAudio = opts.getRemoteAudioElement();
    if (remoteAudio) {
      try {
        const captureStream = (
          remoteAudio as HTMLAudioElement & {
            captureStream?: () => MediaStream;
          }
        ).captureStream;
        const remoteStream =
          typeof captureStream === "function" ? captureStream.call(remoteAudio) : null;
        if (remoteStream?.getAudioTracks().length) {
          const panelSource = audioContext.createMediaStreamSource(remoteStream);
          panelSource.connect(destination);
        }
      } catch {
        // Panel audio capture may be unavailable in some browsers.
      }
    }

    const composite = new MediaStream();
    for (const track of destination.stream.getAudioTracks()) {
      composite.addTrack(track);
    }

    const videoStream = opts.screenStream ?? opts.cameraStream;
    if (videoStream?.getVideoTracks().length) {
      videoPipelineRef.current?.stop();
      const pipeline = await createRecordingVideoPipeline(videoStream);
      videoPipelineRef.current = pipeline;
      for (const track of pipeline.stream.getVideoTracks()) {
        composite.addTrack(track);
      }
    }

    compositeStreamRef.current = composite;
    return composite;
  }, []);

  const attachRecorder = useCallback(
    (stream: MediaStream, resetChunks: boolean) => {
      if (resetChunks) {
        chunksRef.current = [];
        startedAtRef.current = Date.now();
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const mimeType = pickMimeType(hasVideo);
      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORDING_AUDIO_BPS,
        ...(hasVideo ? { videoBitsPerSecond: RECORDING_VIDEO_BPS } : {}),
      };

      const recorder = new MediaRecorder(stream, recorderOptions);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(CHUNK_INTERVAL_MS);

      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
          }
        }, MAX_RECORDING_MS);
      }
    },
    [],
  );

  const start = useCallback(async () => {
    if (!supported) return;
    const opts = optionsRef.current;
    if (!opts.micStream && !opts.getRemoteAudioElement()) return;

    setError(undefined);
    cleanupStreams();

    try {
      const stream = await buildCompositeStream();
      attachRecorder(stream, true);
    } catch (startError) {
      cleanupStreams();
      const message =
        startError instanceof Error
          ? startError.message
          : "Could not start session recorder.";
      setError(message);
    }
  }, [supported, buildCompositeStream, attachRecorder, cleanupStreams]);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanupStreams();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        recorderRef.current = null;
        chunksRef.current = [];
        cleanupStreams();
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.stop();
    });
  }, [cleanupStreams]);

  const refreshInFlightRef = useRef(false);

  const refreshTracks = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    try {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          videoPipelineRef.current?.stop();
          videoPipelineRef.current = null;
          compositeStreamRef.current?.getTracks().forEach((track) => track.stop());
          compositeStreamRef.current = null;
          if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            void audioContextRef.current.close();
          }
          audioContextRef.current = null;
          resolve();
        };
        if (recorder.state === "recording") {
          recorder.requestData();
          recorder.stop();
        } else {
          resolve();
        }
      });
      recorderRef.current = null;

      const stream = await buildCompositeStream();
      attachRecorder(stream, false);
    } catch (refreshError) {
      cleanupStreams();
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh session recording.";
      setError(message);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [attachRecorder, buildCompositeStream, cleanupStreams]);

  const uploadRecording = useCallback(
    async (blob: Blob, durationMs: number): Promise<StopUploadResult> => {
      const sessionId = optionsRef.current.sessionId;
      if (!sessionId) return { kind: "skipped" };

      setUploading(true);
      setError(undefined);

      try {
        const formData = new FormData();
        formData.append("sessionId", sessionId);
        formData.append("recording", blob, "session-recording.webm");
        formData.append("durationMs", String(durationMs));
        formData.append("mimeType", blob.type || "video/webm");

        const response = await fetch("/api/media/session-recording", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed.");
        }

        await clearFailedRecording(sessionId);
        return {
          kind: "uploaded",
          result: (await response.json()) as UploadResult,
        };
      } catch (uploadError) {
        await saveFailedRecording(sessionId, blob, durationMs);
        void fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordingStatus: "failed" }),
        });
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload recording.";
        setError(message);
        return { kind: "failed" };
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const stopAndUpload = useCallback(async (): Promise<StopUploadResult> => {
    const blob = await stop();
    const durationMs =
      startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    startedAtRef.current = null;

    if (!blob || !optionsRef.current.sessionId) {
      return { kind: "skipped" };
    }

    return uploadRecording(blob, durationMs);
  }, [stop, uploadRecording]);

  return {
    supported,
    uploading,
    error,
    start,
    stop,
    stopAndUpload,
    refreshTracks,
  };
}
