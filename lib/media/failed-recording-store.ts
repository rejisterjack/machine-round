const DB_NAME = "machine-round-media";
const STORE_NAME = "failed-recordings";

type StoredRecording = {
  sessionId: string;
  blob: Blob;
  durationMs: number;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
      }
    };
  });
}

export async function saveFailedRecording(
  sessionId: string,
  blob: Blob,
  durationMs: number,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put({
      sessionId,
      blob,
      durationMs,
      savedAt: Date.now(),
    } satisfies StoredRecording);
  });
}

export async function loadFailedRecording(
  sessionId: string,
): Promise<{ blob: Blob; durationMs: number } | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_NAME).get(sessionId);
    request.onsuccess = () => {
      db.close();
      const record = request.result as StoredRecording | undefined;
      if (!record?.blob) {
        resolve(null);
        return;
      }
      resolve({ blob: record.blob, durationMs: record.durationMs });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearFailedRecording(sessionId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).delete(sessionId);
  });
}
