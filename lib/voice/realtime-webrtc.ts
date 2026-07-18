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
  onEvent?: (event: RealtimeEvent) => void;
  onStateChange?: (state: RealtimeConnectionState) => void;
  onVoiceStateChange?: (state: RealtimeVoiceState) => void;
  onError?: (message: string) => void;
};

export type RealtimeConnection = {
  close: () => void;
  sendEvent: (event: Record<string, unknown>) => void;
  dataChannel: RTCDataChannel | null;
};

function withWebrtcFilter(callsUrl: string) {
  const url = new URL(callsUrl);
  url.searchParams.set("webrtcfilter", "on");
  return url.toString();
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

  let localStream: MediaStream | null = null;
  let dataChannel: RTCDataChannel | null = null;

  const close = () => {
    dataChannel?.close();
    peerConnection.close();
    localStream?.getTracks().forEach((track) => track.stop());
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

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of localStream.getAudioTracks()) {
      peerConnection.addTrack(track, localStream);
    }

    dataChannel = peerConnection.createDataChannel("realtime-channel");
    dataChannel.addEventListener("open", () => {
      onStateChange?.("active");
      const responseEvent = { type: "response.create" };
      dataChannel?.send(JSON.stringify(responseEvent));
    });

    dataChannel.addEventListener("message", (messageEvent) => {
      try {
        const event = JSON.parse(String(messageEvent.data)) as RealtimeEvent;
        onEvent?.(event);
        const voiceState = deriveVoiceState(event);
        if (voiceState) {
          onVoiceStateChange?.(voiceState);
        }
      } catch {
        // Ignore malformed events.
      }
    });

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "failed") {
        onError?.("Voice connection failed.");
        onStateChange?.("error");
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

    return {
      close,
      dataChannel,
      sendEvent: (event) => {
        if (dataChannel?.readyState === "open") {
          dataChannel.send(JSON.stringify(event));
        }
      },
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
