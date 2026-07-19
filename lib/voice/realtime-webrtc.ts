export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "active"
  | "error";

export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

export type RealtimeVoiceState = "idle" | "listening" | "speaking";

export type CreateRealtimeConnectionOptions = {
  ephemeralKey: string;
  callsUrl: string;
  localAudioStream?: MediaStream;
  serverVadEnabled?: boolean;
  /** When false, wait for server VAD / user speech before the model speaks (panelist handoff). */
  startResponse?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
  onStateChange?: (state: RealtimeConnectionState) => void;
  onVoiceStateChange?: (state: RealtimeVoiceState) => void;
  onError?: (message: string) => void;
};

export type RealtimeConnection = {
  close: () => void;
  sendEvent: (event: Record<string, unknown>) => boolean;
  updateVoice: (voice: string) => void;
  dataChannel: RTCDataChannel | null;
  remoteAudioElement: HTMLAudioElement;
};

function withWebrtcFilter(callsUrl: string) {
  const url = new URL(callsUrl);
  url.searchParams.set("webrtcfilter", "on");
  return url.toString();
}

const SERVER_VAD_SESSION_UPDATE = {
  type: "session.update",
  session: {
    type: "realtime",
    audio: {
      input: {
        transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
          create_response: false,
        },
      },
    },
  },
} as const;

function startClientTurnDetection(
  stream: MediaStream,
  sendEvent: (event: Record<string, unknown>) => void,
  isAssistantSpeaking: () => boolean,
) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let userSpeaking = false;
  let silenceStartedAt: number | null = null;
  let cooldownUntil = 0;

  const interval = window.setInterval(() => {
    const now = Date.now();
    if (now < cooldownUntil || isAssistantSpeaking()) {
      userSpeaking = false;
      silenceStartedAt = null;
      return;
    }

    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = (samples[index] - 128) / 128;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    if (rms > 0.02) {
      userSpeaking = true;
      silenceStartedAt = null;
      return;
    }

    if (!userSpeaking) return;

    if (!silenceStartedAt) {
      silenceStartedAt = now;
      return;
    }

    if (now - silenceStartedAt < 900) return;

    userSpeaking = false;
    silenceStartedAt = null;
    cooldownUntil = now + 1500;
    sendEvent({ type: "input_audio_buffer.commit" });
  }, 100);

  return () => {
    window.clearInterval(interval);
    source.disconnect();
    void audioContext.close();
  };
}

function deriveVoiceState(event: RealtimeEvent): RealtimeVoiceState | null {
  if (
    event.type === "response.audio.delta" ||
    event.type === "response.output_audio.delta" ||
    event.type === "output_audio_buffer.started"
  ) {
    return "speaking";
  }

  if (
    event.type === "input_audio_buffer.speech_started" ||
    event.type === "conversation.item.input_audio_transcription.completed"
  ) {
    return "listening";
  }

  if (
    event.type === "response.done" ||
    event.type === "response.completed" ||
    event.type === "output_audio_buffer.stopped"
  ) {
    return "idle";
  }

  return null;
}

export async function createRealtimeConnection(
  options: CreateRealtimeConnectionOptions,
): Promise<RealtimeConnection> {
  const {
    ephemeralKey,
    callsUrl,
    localAudioStream,
    serverVadEnabled = true,
    startResponse = true,
    onEvent,
    onStateChange,
    onVoiceStateChange,
    onError,
  } = options;

  onStateChange?.("connecting");

  const peerConnection = new RTCPeerConnection();
  const audioElement = document.createElement("audio");
  audioElement.autoplay = true;
  audioElement.setAttribute("playsinline", "true");

  let ownedStream: MediaStream | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let stopClientVad: (() => void) | null = null;
  let assistantSpeaking = false;
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const close = () => {
    closed = true;
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    stopClientVad?.();
    stopClientVad = null;
    dataChannel?.close();
    peerConnection.close();
    ownedStream?.getTracks().forEach((track) => track.stop());
    audioElement.srcObject = null;
    audioElement.remove();
    onStateChange?.("idle");
    onVoiceStateChange?.("idle");
  };

  try {
    peerConnection.ontrack = (event) => {
      if (event.streams[0]) {
        audioElement.srcObject = event.streams[0];
        void audioElement.play().catch(() => {
          // Autoplay may require a user gesture; connection still works.
        });
      }
    };

    const stream =
      localAudioStream ??
      (await navigator.mediaDevices.getUserMedia({ audio: true }));
    if (!localAudioStream) {
      ownedStream = stream;
    }
    for (const track of stream.getAudioTracks()) {
      peerConnection.addTrack(track, stream);
    }

    dataChannel = peerConnection.createDataChannel("realtime-channel");
    dataChannel.addEventListener("open", () => {
      onStateChange?.("active");
      const sendEventOnOpen = (event: Record<string, unknown>) => {
        if (dataChannel?.readyState === "open") {
          dataChannel.send(JSON.stringify(event));
        }
      };

      if (!serverVadEnabled) {
        sendEventOnOpen(SERVER_VAD_SESSION_UPDATE);
        stopClientVad = startClientTurnDetection(
          stream,
          sendEventOnOpen,
          () => assistantSpeaking,
        );
      }

      if (startResponse) {
        sendEventOnOpen({ type: "response.create" });
      }
    });

    dataChannel.addEventListener("error", () => {
      if (!closed) {
        onError?.("Voice data channel error.");
        onStateChange?.("error");
      }
    });

    dataChannel.addEventListener("close", () => {
      if (!closed && peerConnection.connectionState !== "closed") {
        onError?.("Voice data channel closed.");
        onStateChange?.("error");
      }
    });

    dataChannel.addEventListener("message", (messageEvent) => {
      try {
        const event = JSON.parse(String(messageEvent.data)) as RealtimeEvent;
        onEvent?.(event);
        const voiceState = deriveVoiceState(event);
        if (voiceState) {
          assistantSpeaking = voiceState === "speaking";
          onVoiceStateChange?.(voiceState);
        }
        if (
          event.type === "session.updated" &&
          !serverVadEnabled &&
          event.session &&
          typeof event.session === "object"
        ) {
          const sessionAudio = (
            event.session as { audio?: { input?: { turn_detection?: unknown } } }
          ).audio;
          if (sessionAudio?.input?.turn_detection) {
            stopClientVad?.();
            stopClientVad = null;
          }
        }
      } catch {
        // Ignore malformed events.
      }
    });

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === "connected" && disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
      if (state === "failed") {
        onError?.("Voice connection failed.");
        onStateChange?.("error");
        return;
      }
      if (state === "disconnected" && !disconnectTimer) {
        disconnectTimer = setTimeout(() => {
          if (peerConnection.connectionState === "disconnected") {
            try {
              peerConnection.restartIce();
            } catch {
              // Ignore ICE restart failures.
            }
          }
          disconnectTimer = setTimeout(() => {
            if (
              peerConnection.connectionState === "disconnected" ||
              peerConnection.connectionState === "failed"
            ) {
              onError?.("Voice connection lost.");
              onStateChange?.("error");
            }
          }, 8000);
        }, 2000);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const sdpResponse = await fetch(withWebrtcFilter(callsUrl), {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(errorText || "SDP exchange failed.");
    }

    const answerSdp = await sdpResponse.text();
    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });

    const sendEvent = (event: Record<string, unknown>): boolean => {
      if (dataChannel?.readyState !== "open") {
        return false;
      }
      try {
        dataChannel.send(JSON.stringify(event));
        return true;
      } catch {
        return false;
      }
    };

    const updateVoice = (voice: string) => {
      sendEvent({
        type: "session.update",
        session: {
          audio: { output: { voice } },
        },
      });
    };

    return {
      close,
      dataChannel,
      remoteAudioElement: audioElement,
      sendEvent,
      updateVoice,
    };
  } catch (error) {
    close();
    const message =
      error instanceof Error ? error.message : "Voice connection failed.";
    onError?.(message);
    onStateChange?.("error");
    throw error;
  }
}
