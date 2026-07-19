import { afterEach, describe, expect, mock, test } from "bun:test";
import { createScreenRealtimePusher } from "@/lib/interview/screen-realtime";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const sampleA = new Uint8Array([10, 20, 30]);
const sampleB = new Uint8Array([200, 210, 220]);

const pushToVoiceMock = () =>
  mock(
    (
      _summary: string | undefined,
      imageBase64?: string,
      _meta?: { imageOnly?: boolean },
    ) => Boolean(imageBase64),
  );

describe("createScreenRealtimePusher", () => {
  test("continuous push sends image and hybrid analyze on hot path", async () => {
    const pushToVoice = pushToVoiceMock();
    const fetchMock = mock(async () =>
      Response.json({
        summary: "[Screen context]\nEditor: VS Code",
        site: "VS Code",
        purpose: "realtime",
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => true,
      captureRealtimeFrame: async () => ({
        analysisBase64: "ZmFrZS1pbWFnZS1kYXRh",
        mimeType: "image/jpeg" as const,
        changeSample: sampleB,
      }),
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    pusher.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    pusher.stop();

    expect(pushToVoice).toHaveBeenCalled();
    expect(pushToVoice.mock.calls[0]?.[0]).toBeUndefined();
    expect(pushToVoice.mock.calls[0]?.[2]?.imageOnly).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as { purpose?: string };
    expect(requestBody.purpose).toBe("realtime");
  });

  test("flushNow pushes image and precision summary on user turn", async () => {
    const pushToVoice = mock(() => true);
    const fetchMock = mock(async () =>
      Response.json({
        summary: "[Screen context]\nSite: Perplexity (high)",
        site: "Perplexity",
        purpose: "precision",
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => true,
      capturePrecisionFrame: async () => ({
        analysisBase64: "precision-frame",
        mimeType: "image/jpeg",
        changeSample: sampleB,
      }),
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    await pusher.flushNow({
      mode: "precision",
      focusQuestion: "What site is this?",
    });

    expect(fetchMock).toHaveBeenCalled();
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as { purpose?: string; priorSummary?: string };
    expect(requestBody.purpose).toBe("precision");
    expect(requestBody.priorSummary).toBeUndefined();
    expect(pushToVoice).toHaveBeenCalled();
    expect(pushToVoice.mock.calls[0]?.[1]).toBe("precision-frame");

    pusher.stop();
  });

  test("change triggers image push without matching hash", async () => {
    const pushToVoice = pushToVoiceMock();
    globalThis.fetch = mock(async () =>
      Response.json({ summary: "unused" }),
    ) as typeof fetch;

    let frameCount = 0;
    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => true,
      captureRealtimeFrame: async () => {
        frameCount += 1;
        return {
          analysisBase64: "same-hash-prefix",
          mimeType: "image/jpeg" as const,
          changeSample: frameCount === 1 ? sampleA : sampleB,
        };
      },
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    pusher.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    pusher.stop();

    expect(pushToVoice.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test("text fallback uses analyze when image push disabled", async () => {
    const pushToVoice = mock(() => true);
    const fetchMock = mock(async () =>
      Response.json({
        summary: "Modal dialog visible",
        purpose: "realtime",
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => false,
      captureRealtimeFrame: async () => ({
        analysisBase64: "ZmFrZS1pbWFnZS1kYXRh",
        mimeType: "image/jpeg" as const,
        changeSample: sampleB,
      }),
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    pusher.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    pusher.stop();

    expect(fetchMock).toHaveBeenCalled();
    expect(pushToVoice).toHaveBeenCalledWith(
      "Modal dialog visible",
      "ZmFrZS1pbWFnZS1kYXRh",
      expect.objectContaining({ mimeType: "image/jpeg" }),
    );
  });

  test("camera path skips hybrid analyze on hot path", async () => {
    const pushToVoice = pushToVoiceMock();
    const fetchMock = mock(async () =>
      Response.json({ summary: "should not run" }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => true,
      visionSource: "camera",
      captureRealtimeFrame: async () => ({
        analysisBase64: "ZmFrZS1pbWFnZS1kYXRh",
        mimeType: "image/jpeg" as const,
        changeSample: sampleB,
      }),
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    pusher.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    pusher.stop();

    expect(pushToVoice).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("camera flush sends image and focus text without screen analyze", async () => {
    const pushToVoice = mock(() => true);
    const fetchMock = mock(async () =>
      Response.json({ summary: "unused" }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const pusher = createScreenRealtimePusher({
      getSource: () => ({ track: {} as MediaStreamTrack }),
      getSessionContext: () => ({
        dbSessionId: "session-1",
        roleTitle: "Full-Stack Engineer",
      }),
      pushToVoice,
      shouldPushImages: () => true,
      visionSource: "camera",
      capturePrecisionFrame: async () => ({
        analysisBase64: "camera-precision",
        mimeType: "image/jpeg",
        changeSample: sampleB,
      }),
      intervalMs: 60_000,
      archiveIntervalMs: 60_000,
    });

    await pusher.flushNow({
      focusQuestion: "How many fingers am I showing?",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushToVoice).toHaveBeenCalled();
    expect(pushToVoice.mock.calls[0]?.[1]).toBe("camera-precision");
    expect(pushToVoice.mock.calls[1]?.[0]).toContain("How many fingers");

    pusher.stop();
  });
});
