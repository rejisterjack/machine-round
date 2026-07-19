"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDisplaySurface,
  getScreenShareWarning,
  isMonitorCapture,
  requestScreenCapture,
  type DisplaySurface,
} from "@/lib/media/display-capture";

type UseMediaDevicesOptions = {
  onScreenShareEnd?: () => void;
};

export function useMediaDevices(options: UseMediaDevicesOptions = {}) {
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [captureSurface, setCaptureSurface] = useState<DisplaySurface>();
  const [screenShareWarning, setScreenShareWarning] = useState<string>();
  const [error, setError] = useState<string>();
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const onScreenShareEndRef = useRef(options.onScreenShareEnd);

  useEffect(() => {
    onScreenShareEndRef.current = options.onScreenShareEnd;
  }, [options.onScreenShareEnd]);

  useEffect(() => {
    micStreamRef.current = micStream;
  }, [micStream]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  const notifyScreenShareEnd = useCallback(() => {
    onScreenShareEndRef.current?.();
  }, []);

  const stopStreamTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const attachTrackEndedHandler = useCallback(
    (track: MediaStreamTrack, onEnded: () => void) => {
      track.onended = onEnded;
    },
    [],
  );

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopStreamTracks(micStreamRef.current);
      micStreamRef.current = stream;
      setMicStream(stream);
      setError(undefined);
      return stream;
    } catch {
      setError("Microphone permission denied.");
      return null;
    }
  }, [stopStreamTracks]);

  const toggleMic = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const ensureCamera = useCallback(async () => {
    const existing = cameraStreamRef.current;
    if (cameraEnabled && existing?.getVideoTracks().some((track) => track.readyState === "live")) {
      return existing;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (track) {
        attachTrackEndedHandler(track, () => {
          if (cameraStreamRef.current === stream) {
            cameraStreamRef.current = null;
            setCameraStream(null);
            setCameraEnabled(false);
          }
        });
      }
      stopStreamTracks(cameraStreamRef.current);
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
      setError(undefined);
      return stream;
    } catch {
      setError("Camera permission denied.");
      return null;
    }
  }, [attachTrackEndedHandler, cameraEnabled, stopStreamTracks]);

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      stopStreamTracks(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraEnabled(false);
      return;
    }

    await ensureCamera();
  }, [cameraEnabled, ensureCamera, stopStreamTracks]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await requestScreenCapture();
      const track = stream.getVideoTracks()[0];
      if (!track) {
        stopStreamTracks(stream);
        setError("Screen share did not return a video track.");
        return null;
      }

      const surface = getDisplaySurface(track);
      setCaptureSurface(surface);
      setScreenShareWarning(
        isMonitorCapture(surface) ? undefined : getScreenShareWarning(surface),
      );

      attachTrackEndedHandler(track, () => {
        if (screenStreamRef.current === stream) {
          screenStreamRef.current = null;
          setScreenStream(null);
          setSharingScreen(false);
          setCaptureSurface(undefined);
          setScreenShareWarning(undefined);
          notifyScreenShareEnd();
        }
      });

      stopStreamTracks(screenStreamRef.current);
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setSharingScreen(true);
      setError(undefined);
      return stream;
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "NotAllowedError"
      ) {
        setError("Screen share was cancelled or denied.");
      } else {
        setError("Could not start screen share.");
      }
      return null;
    }
  }, [attachTrackEndedHandler, notifyScreenShareEnd, stopStreamTracks]);

  const stopScreenShare = useCallback(() => {
    stopStreamTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenStream(null);
    setSharingScreen(false);
    setCaptureSurface(undefined);
    setScreenShareWarning(undefined);
    notifyScreenShareEnd();
  }, [notifyScreenShareEnd, stopStreamTracks]);

  const retryScreenShare = useCallback(async () => {
    stopScreenShare();
    return startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  const cleanup = useCallback(() => {
    stopStreamTracks(micStreamRef.current);
    stopStreamTracks(cameraStreamRef.current);
    stopStreamTracks(screenStreamRef.current);
    micStreamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setMicStream(null);
    setCameraStream(null);
    setScreenStream(null);
    setCameraEnabled(false);
    setSharingScreen(false);
    setCaptureSurface(undefined);
    setScreenShareWarning(undefined);
  }, [stopStreamTracks]);

  useEffect(() => {
    return () => {
      stopStreamTracks(micStreamRef.current);
      stopStreamTracks(cameraStreamRef.current);
      stopStreamTracks(screenStreamRef.current);
    };
  }, [stopStreamTracks]);

  return {
    micStream,
    cameraStream,
    screenStream,
    muted,
    cameraEnabled,
    sharingScreen,
    captureSurface,
    screenShareWarning,
    error,
    requestMic,
    toggleMic,
    toggleCamera,
    ensureCamera,
    startScreenShare,
    stopScreenShare,
    retryScreenShare,
    cleanup,
  };
}
