"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [error, setError] = useState<string>();
  const micStreamRef = useRef<MediaStream | null>(null);
  const onScreenShareEndRef = useRef(options.onScreenShareEnd);
  onScreenShareEndRef.current = options.onScreenShareEnd;

  const notifyScreenShareEnd = useCallback(() => {
    onScreenShareEndRef.current?.();
  }, []);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = stream;
      setMicStream(stream);
      setError(undefined);
      return stream;
    } catch {
      setError("Microphone permission denied.");
      return null;
    }
  }, []);

  const toggleMic = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      cameraStream?.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setCameraEnabled(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraEnabled(true);
      setError(undefined);
    } catch {
      setError("Camera permission denied.");
    }
  }, [cameraEnabled, cameraStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      track.onended = () => {
        setScreenStream(null);
        setSharingScreen(false);
        notifyScreenShareEnd();
      };
      setScreenStream(stream);
      setSharingScreen(true);
      setError(undefined);
      return stream;
    } catch {
      setError("Screen share was cancelled or denied.");
      return null;
    }
  }, [notifyScreenShareEnd]);

  const stopScreenShare = useCallback(() => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setSharingScreen(false);
    notifyScreenShareEnd();
  }, [notifyScreenShareEnd, screenStream]);

  const cleanup = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicStream(null);
    setCameraStream(null);
    setScreenStream(null);
    setCameraEnabled(false);
    setSharingScreen(false);
  }, [cameraStream, screenStream]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    micStream,
    cameraStream,
    screenStream,
    muted,
    cameraEnabled,
    sharingScreen,
    error,
    requestMic,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
}
