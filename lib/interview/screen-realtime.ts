import {
  capturePrecisionFrameFromSource,
  captureRealtimeFrameFromSource,
  captureScreenFramesFromSource,
  type ScreenFrameCapture,
  type ScreenSamplerSource,
  type VisionFrameCapture,
  type VisionMimeType,
} from "@/lib/interview/screen-capture";
import {
  detectCenterWeightedChange,
  detectFrameChange,
  shouldRepushStaleFrame,
} from "@/lib/interview/screen-change";
import type { PanelistMode } from "@/lib/ai/personas/panelists";
import {
  SCREEN_ANALYZE_FETCH_TIMEOUT_MS,
  SCREEN_ARCHIVE_INTERVAL_MS,
  SCREEN_FRAME_STALE_REPUSH_MS,
  SCREEN_PRECISION_ANALYZE_TIMEOUT_MS,
  SCREEN_REALTIME_INTERVAL_MS,
  CAMERA_REALTIME_INTERVAL_MS,
} from "@/lib/session/session-limits";

export type ScreenRealtimePushMeta = {
  capturedAt: string;
  sceneChanged?: boolean;
  imageOnly?: boolean;
  forceImage?: boolean;
  mimeType?: VisionMimeType;
  contextLabel?: "screen" | "camera";
};

export type ScreenRealtimeSessionContext = {
  dbSessionId: string;
  roleTitle: string;
  panelistMode?: PanelistMode;
};

export type ScreenFlushOptions = {
  mode?: "hot" | "precision";
  focusQuestion?: string;
};

export type CreateScreenRealtimePusherDeps = {
  getSource: () => ScreenSamplerSource | null;
  getSessionContext: () => ScreenRealtimeSessionContext | null;
  pushToVoice: (
    summary: string | undefined,
    imageBase64?: string,
    meta?: ScreenRealtimePushMeta,
  ) => boolean;
  shouldPushImages?: () => boolean;
  isPaused?: () => boolean;
  enableArchive?: boolean;
  /** Screen frames use hybrid text analyze; camera frames are image-only for the realtime model. */
  visionSource?: "screen" | "camera";
  onArchiveFrame?: (
    frames: ScreenFrameCapture,
    summary: string,
  ) => Promise<void>;
  onArchiveError?: (message: string) => void;
  onHotError?: (message: string) => void;
  captureRealtimeFrame?: (
    source: ScreenSamplerSource,
  ) => Promise<VisionFrameCapture | null>;
  capturePrecisionFrame?: (
    source: ScreenSamplerSource,
  ) => Promise<VisionFrameCapture | null>;
  intervalMs?: number;
  archiveIntervalMs?: number;
  /** When false, a skipped frame is not an error (rate limit / channel busy). */
  reportSkippedFrames?: boolean;
};

function hashSample(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i += 64) {
    hash = (hash * 31 + data.charCodeAt(i)) | 0;
  }
  return String(hash);
}

type AnalyzePurpose = "realtime" | "precision" | "archive";

async function analyzeFrame(input: {
  sessionId: string;
  frame: VisionFrameCapture;
  roleTitle: string;
  panelistMode?: PanelistMode;
  priorSummary?: string;
  purpose: AnalyzePurpose;
  focusQuestion?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<{
  summary?: string;
  site?: string;
  observationStored?: boolean;
  reason?: string;
} | null> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    input.timeoutMs ?? SCREEN_ANALYZE_FETCH_TIMEOUT_MS,
  );
  if (input.signal) {
    if (input.signal.aborted) {
      clearTimeout(timeoutId);
      return null;
    }
    input.signal.addEventListener(
      "abort",
      () => timeoutController.abort(),
      { once: true },
    );
  }

  try {
    const response = await fetch("/api/interview/screen-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: input.sessionId,
        imageBase64: input.frame.analysisBase64,
        mimeType: input.frame.mimeType,
        roleTitle: input.roleTitle,
        panelistMode: input.panelistMode,
        priorSummary: input.priorSummary,
        purpose: input.purpose,
        focusQuestion: input.focusQuestion,
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      try {
        return (await response.json()) as {
          summary?: string;
          reason?: string;
        };
      } catch {
        return null;
      }
    }

    return (await response.json()) as {
      summary?: string;
      site?: string;
      observationStored?: boolean;
      reason?: string;
    };
  } catch (error) {
    if (
      input.signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function withSceneChangedPrefix(summary: string, sceneChanged: boolean): string {
  if (!sceneChanged || !summary.startsWith("[Screen context]")) {
    return summary;
  }
  return summary.replace(
    "[Screen context]",
    "[Screen context]\nScene changed:",
  );
}

function shouldPushFrame(input: {
  force: boolean;
  frameHash: string;
  lastPushedHash: string;
  lastChangeSample: Uint8Array | null;
  changeSample?: Uint8Array;
  lastPushedAt: number;
  now: number;
}): boolean {
  if (input.force) return true;

  const visualChange =
    detectFrameChange(
      input.lastChangeSample,
      input.changeSample,
    ) ||
    detectCenterWeightedChange(
      input.lastChangeSample,
      input.changeSample,
    );
  if (visualChange) return true;
  if (input.frameHash !== input.lastPushedHash) return true;

  return shouldRepushStaleFrame(
    input.lastPushedAt,
    input.now,
    SCREEN_FRAME_STALE_REPUSH_MS,
  );
}

export function createScreenRealtimePusher(deps: CreateScreenRealtimePusherDeps) {
  const captureRealtimeFrame =
    deps.captureRealtimeFrame ?? captureRealtimeFrameFromSource;
  const capturePrecisionFrame =
    deps.capturePrecisionFrame ?? capturePrecisionFrameFromSource;
  const shouldPushImages = deps.shouldPushImages ?? (() => true);
  const isPaused = deps.isPaused ?? (() => false);
  const enableArchive = deps.enableArchive ?? true;
  const visionSource = deps.visionSource ?? "screen";
  const isCameraSource = visionSource === "camera";

  let hotTimer: ReturnType<typeof setInterval> | null = null;
  let coldTimer: ReturnType<typeof setInterval> | null = null;
  let coldStartTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let inFlightGeneration = 0;
  let lastPushedHash = "";
  let lastChangeSample: Uint8Array | null = null;
  let lastPushedAt = 0;
  let lastPushedSite: string | undefined;
  let lastArchiveSummary: string | undefined;
  let lastArchiveAt = 0;
  let coldInFlight = false;
  let hotInFlight = false;
  let stopped = true;
  let hybridAnalyzeGeneration = 0;

  const intervalMs = deps.intervalMs ?? SCREEN_REALTIME_INTERVAL_MS;
  const archiveIntervalMs = deps.archiveIntervalMs ?? SCREEN_ARCHIVE_INTERVAL_MS;

  const markPushed = (
    frameHash: string,
    changeSample: Uint8Array | undefined,
    now: number,
  ) => {
    lastPushedHash = frameHash;
    lastChangeSample = changeSample ?? lastChangeSample;
    lastPushedAt = now;
  };

  const pushHybridAnalyze = (
    frame: VisionFrameCapture,
    ctx: ScreenRealtimeSessionContext,
    focusQuestion?: string,
  ) => {
    const generation = ++hybridAnalyzeGeneration;
    void analyzeFrame({
      sessionId: ctx.dbSessionId,
      frame,
      roleTitle: ctx.roleTitle,
      panelistMode: ctx.panelistMode,
      purpose: "realtime",
      focusQuestion,
    }).then((data) => {
      if (stopped || generation !== hybridAnalyzeGeneration) return;
      if (!data?.summary) return;
      const sceneChanged = Boolean(
        data.site &&
          lastPushedSite &&
          data.site !== lastPushedSite &&
          data.site !== "unknown",
      );
      if (data.site) {
        lastPushedSite = data.site;
      }
      deps.pushToVoice(
        withSceneChangedPrefix(data.summary, sceneChanged),
        undefined,
        {
          capturedAt: new Date().toISOString(),
          sceneChanged,
        },
      );
    }).catch(() => {
      // Best-effort structured context alongside live images.
    });
  };

  const pushHotFrame = async (
    force = false,
    options: ScreenFlushOptions = {},
  ) => {
    if (!force && stopped) return;
    if (!force && isPaused()) return;

    const source = deps.getSource();
    const ctx = deps.getSessionContext();
    if (!source || !ctx) return;

    if (hotInFlight && !force) return;

    const frame = force
      ? await capturePrecisionFrame(source)
      : await captureRealtimeFrame(source);
    if (!frame) {
      if (force && isCameraSource) {
        deps.onHotError?.(
          "Could not capture a camera frame — check camera permissions and lighting.",
        );
      }
      return;
    }

    const now = Date.now();
    const frameHash = hashSample(frame.analysisBase64.slice(0, 2000));
    if (
      !shouldPushFrame({
        force,
        frameHash,
        lastPushedHash,
        lastChangeSample,
        changeSample: frame.changeSample,
        lastPushedAt,
        now,
      })
    ) {
      return;
    }

    if (force) {
      abortController?.abort();
    }

    const imageMode = shouldPushImages();
    const capturedAt = new Date().toISOString();

    if (force) {
      abortController = new AbortController();
      const generation = ++inFlightGeneration;
      const signal = abortController.signal;
      hotInFlight = true;

      try {
        if (imageMode) {
          const imageSent = deps.pushToVoice(undefined, frame.analysisBase64, {
            capturedAt,
            mimeType: frame.mimeType,
            forceImage: true,
            contextLabel: isCameraSource ? "camera" : "screen",
          });
          if (imageSent) {
            markPushed(frameHash, frame.changeSample, now);
          }
        }

        if (isCameraSource) {
          if (options.focusQuestion?.trim()) {
            deps.pushToVoice(
              `Answer from the latest camera image. Question: ${options.focusQuestion.trim()}`,
              undefined,
              { capturedAt, contextLabel: "camera" },
            );
          }
          return;
        }

        const data = await analyzeFrame({
          sessionId: ctx.dbSessionId,
          frame,
          roleTitle: ctx.roleTitle,
          panelistMode: ctx.panelistMode,
          purpose: "precision",
          focusQuestion: options.focusQuestion,
          signal,
          timeoutMs: SCREEN_PRECISION_ANALYZE_TIMEOUT_MS,
        });

        if (signal.aborted || generation !== inFlightGeneration) return;

        if (data?.summary) {
          const sceneChanged = Boolean(
            data.site &&
              lastPushedSite &&
              data.site !== lastPushedSite &&
              data.site !== "unknown",
          );
          if (data.site) {
            lastPushedSite = data.site;
          }
          deps.pushToVoice(
            withSceneChangedPrefix(data.summary, sceneChanged),
            undefined,
            { capturedAt, sceneChanged },
          );
        } else if (!imageMode && data?.reason) {
          deps.onHotError?.(`Screen vision paused — ${data.reason}.`);
        }
      } catch {
        if (!abortController?.signal.aborted) {
          deps.onHotError?.("Screen vision paused — will retry on the next frame.");
        }
      } finally {
        hotInFlight = false;
        if (!imageMode) {
          markPushed(frameHash, frame.changeSample, now);
        }
      }
      return;
    }

    if (imageMode) {
      const pushResult = deps.pushToVoice(undefined, frame.analysisBase64, {
        capturedAt,
        imageOnly: true,
        mimeType: frame.mimeType,
        contextLabel: isCameraSource ? "camera" : "screen",
      });
      if (pushResult) {
        markPushed(frameHash, frame.changeSample, now);
        if (!isCameraSource) {
          pushHybridAnalyze(frame, ctx);
        }
      } else if (deps.reportSkippedFrames !== false) {
        deps.onHotError?.(
          isCameraSource
            ? "Camera frame could not be sent — compressing less and retrying on the next frame."
            : "Screen frame could not be sent — retrying on the next frame.",
        );
      }
      return;
    }

    if (isCameraSource) {
      deps.onHotError?.(
        "Camera vision needs image mode — hand and gesture questions require a live camera frame.",
      );
      return;
    }

    abortController = new AbortController();
    const generation = ++inFlightGeneration;
    const signal = abortController.signal;
    hotInFlight = true;

    try {
      const data = await analyzeFrame({
        sessionId: ctx.dbSessionId,
        frame,
        roleTitle: ctx.roleTitle,
        panelistMode: ctx.panelistMode,
        purpose: "realtime",
        signal,
      });

      if (signal.aborted || generation !== inFlightGeneration) return;
      if (!data?.summary) {
        if (data?.reason) {
          deps.onHotError?.(`Screen vision paused — ${data.reason}.`);
        }
        return;
      }

      const sceneChanged = Boolean(
        data.site &&
          lastPushedSite &&
          data.site !== lastPushedSite &&
          data.site !== "unknown",
      );
      if (data.site) {
        lastPushedSite = data.site;
      }

      const sent = deps.pushToVoice(
        withSceneChangedPrefix(data.summary, sceneChanged),
        frame.analysisBase64,
        { capturedAt, sceneChanged, mimeType: frame.mimeType },
      );
      if (sent) {
        markPushed(frameHash, frame.changeSample, now);
      }
    } catch {
      if (!signal.aborted) {
        deps.onHotError?.("Screen vision paused — will retry on the next frame.");
      }
    } finally {
      hotInFlight = false;
    }
  };

  const runColdArchive = async () => {
    if (stopped || !enableArchive || coldInFlight) return;
    const source = deps.getSource();
    const ctx = deps.getSessionContext();
    if (!source || !ctx) return;

    const now = Date.now();
    if (now - lastArchiveAt < archiveIntervalMs) return;

    coldInFlight = true;
    try {
      const frames = await captureScreenFramesFromSource(source);
      if (!frames) return;

      const data = await analyzeFrame({
        sessionId: ctx.dbSessionId,
        frame: {
          analysisBase64: frames.analysisBase64,
          mimeType: "image/jpeg",
        },
        roleTitle: ctx.roleTitle,
        panelistMode: ctx.panelistMode,
        priorSummary: lastArchiveSummary,
        purpose: "archive",
      });

      if (stopped) return;

      if (!data?.summary) {
        if (data?.reason === "capacity") {
          deps.onArchiveError?.("Screen analysis paused — capacity limit reached.");
        }
        return;
      }

      lastArchiveAt = now;
      lastArchiveSummary = data.summary;
      await deps.onArchiveFrame?.(frames, data.summary);
    } catch {
      deps.onArchiveError?.("Screen archive paused — will retry later.");
    } finally {
      coldInFlight = false;
    }
  };

  const flushNow = (options: ScreenFlushOptions = {}): Promise<void> =>
    pushHotFrame(true, options);

  const start = () => {
    stop();
    stopped = false;
    hotTimer = setInterval(() => {
      void pushHotFrame(false);
    }, intervalMs);
    if (enableArchive) {
      coldTimer = setInterval(() => {
        void runColdArchive();
      }, archiveIntervalMs);
      coldStartTimer = setTimeout(() => {
        void runColdArchive();
      }, archiveIntervalMs);
    }
    setTimeout(() => {
      void pushHotFrame(false);
    }, 500);
  };

  const stop = () => {
    stopped = true;
    hybridAnalyzeGeneration += 1;
    if (hotTimer) clearInterval(hotTimer);
    if (coldTimer) clearInterval(coldTimer);
    if (coldStartTimer) clearTimeout(coldStartTimer);
    hotTimer = null;
    coldTimer = null;
    coldStartTimer = null;
    abortController?.abort();
    abortController = null;
    inFlightGeneration += 1;
    lastPushedHash = "";
    lastChangeSample = null;
    lastPushedAt = 0;
    lastPushedSite = undefined;
    lastArchiveSummary = undefined;
  };

  return { start, stop, flushNow };
}
