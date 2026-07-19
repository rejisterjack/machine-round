import type { PanelistId } from "@/lib/ai/personas/panelists";

export type TranscriptSyncPayload = {
  sessionId: string;
  content: string;
  role: "user" | "assistant";
  speaker?: PanelistId;
  clientSyncId?: string;
  questionCount?: number;
  topicsCovered?: string[];
  weakSignals?: string[];
  referencedAnswer?: string;
  status?: "active" | "thinking" | "completed" | "abandoned" | "error";
  completedAt?: string | null;
};

type QueueItem = {
  payload: TranscriptSyncPayload;
  attempts: number;
};

const MAX_ATTEMPTS = 3;

const queue: QueueItem[] = [];
let drainPromise: Promise<void> | null = null;
let syncFailed = false;
const listeners = new Set<(failed: boolean) => void>();

export function onTranscriptSyncStatus(listener: (failed: boolean) => void) {
  listeners.add(listener);
  listener(syncFailed);
  return () => {
    listeners.delete(listener);
  };
}

export function isTranscriptSyncFailing() {
  return syncFailed;
}

export function resetTranscriptQueueForTests() {
  queue.length = 0;
  drainPromise = null;
  syncFailed = false;
  listeners.clear();
}

function notifyListeners() {
  for (const listener of listeners) {
    listener(syncFailed);
  }
}

async function postPayload(payload: TranscriptSyncPayload) {
  const response = await fetch("/api/interview/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Transcript sync failed (${response.status})`);
  }
}

export async function flushTranscriptQueue() {
  await startDrain(true);
}

export function enqueueTranscriptSync(payload: TranscriptSyncPayload) {
  const withId: TranscriptSyncPayload = {
    ...payload,
    clientSyncId: payload.clientSyncId ?? crypto.randomUUID(),
  };
  queue.push({ payload: withId, attempts: 0 });
  void startDrain(false);
}

async function startDrain(flushAll: boolean): Promise<void> {
  if (drainPromise) {
    await drainPromise;
    if (queue.length > 0) {
      return startDrain(flushAll);
    }
    return;
  }

  drainPromise = runDrain(flushAll).finally(() => {
    drainPromise = null;
  });
  await drainPromise;
}

function deadLetterHead() {
  syncFailed = true;
  notifyListeners();
  queue.shift();
}

async function runDrain(flushAll: boolean) {
  while (queue.length > 0) {
    const item = queue[0];

    if (item.attempts >= MAX_ATTEMPTS) {
      deadLetterHead();
      continue;
    }

    try {
      await postPayload(item.payload);
      queue.shift();
      if (syncFailed) {
        syncFailed = false;
        notifyListeners();
      }
    } catch {
      item.attempts += 1;
      if (item.attempts >= MAX_ATTEMPTS) {
        deadLetterHead();
        continue;
      }
      if (!flushAll) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 400 * item.attempts),
      );
    }
  }
}
