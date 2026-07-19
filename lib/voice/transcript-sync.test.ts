import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  enqueueTranscriptSync,
  flushTranscriptQueue,
  resetTranscriptQueueForTests,
} from "@/lib/voice/transcript-sync";

const originalFetch = globalThis.fetch;

describe("transcript-sync", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetTranscriptQueueForTests();
  });

  test("flushTranscriptQueue waits for in-flight drain", async () => {
    let resolveFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    let callCount = 0;

    globalThis.fetch = mock(async () => {
      callCount += 1;
      if (callCount === 1) {
        await firstGate;
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    enqueueTranscriptSync({
      sessionId: "s1",
      content: "first",
      role: "user",
      clientSyncId: "sync-1",
    });
    enqueueTranscriptSync({
      sessionId: "s1",
      content: "second",
      role: "assistant",
      clientSyncId: "sync-2",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const flushPromise = flushTranscriptQueue();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(callCount).toBe(1);

    resolveFirst?.();
    await flushPromise;
    expect(callCount).toBe(2);
  });

  test("dead-letters after max attempts on flush", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("error", { status: 500 });
    }) as typeof fetch;

    enqueueTranscriptSync({
      sessionId: "s1",
      content: "fail",
      role: "user",
      clientSyncId: "sync-fail",
    });

    await flushTranscriptQueue();

    expect((globalThis.fetch as ReturnType<typeof mock>).mock.calls.length).toBe(
      3,
    );
  });

  test("continues after dead-lettering failed item", async () => {
    globalThis.fetch = mock(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { clientSyncId?: string };
      if (body.clientSyncId === "sync-fail") {
        return new Response("error", { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    enqueueTranscriptSync({
      sessionId: "s1",
      content: "fail",
      role: "user",
      clientSyncId: "sync-fail",
    });
    enqueueTranscriptSync({
      sessionId: "s1",
      content: "ok",
      role: "user",
      clientSyncId: "sync-ok",
    });

    await flushTranscriptQueue();

    const bodies = (
      globalThis.fetch as ReturnType<typeof mock>
    ).mock.calls.map((call) =>
      JSON.parse(String(call[1]?.body)),
    ) as Array<{ clientSyncId?: string }>;
    expect(bodies.filter((b) => b.clientSyncId === "sync-fail").length).toBe(3);
    expect(bodies.filter((b) => b.clientSyncId === "sync-ok").length).toBe(1);
  });

  test("background drain dead-letters and processes next item", async () => {
    globalThis.fetch = mock(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { clientSyncId?: string };
      if (body.clientSyncId === "sync-fail") {
        return new Response("error", { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    enqueueTranscriptSync({
      sessionId: "s1",
      content: "fail",
      role: "user",
      clientSyncId: "sync-fail",
    });
    enqueueTranscriptSync({
      sessionId: "s1",
      content: "trigger",
      role: "user",
      clientSyncId: "sync-trigger",
    });
    enqueueTranscriptSync({
      sessionId: "s1",
      content: "ok",
      role: "user",
      clientSyncId: "sync-ok",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const bodies = (
      globalThis.fetch as ReturnType<typeof mock>
    ).mock.calls.map((call) =>
      JSON.parse(String(call[1]?.body)),
    ) as Array<{ clientSyncId?: string }>;
    expect(bodies.filter((b) => b.clientSyncId === "sync-fail").length).toBe(3);
    expect(bodies.filter((b) => b.clientSyncId === "sync-ok").length).toBe(1);
  });

  test("assigns clientSyncId when missing", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    enqueueTranscriptSync({
      sessionId: "s1",
      content: "hello",
      role: "user",
    });

    await flushTranscriptQueue();

    const body = JSON.parse(
      String(
        (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0]?.[1]?.body,
      ),
    ) as { clientSyncId?: string };
    expect(body.clientSyncId).toBeTruthy();
  });
});
