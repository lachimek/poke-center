import {
  type CenteringSessionPayload,
  isSessionPayload,
} from "@/lib/centering/sessionPayload";

export {
  CENTERING_SESSION_VERSION,
  type CenteringSessionPayload,
} from "@/lib/centering/sessionPayload";

const DB_NAME = "poke-center-centering";
const DB_VERSION = 1;
const STORE_NAME = "session";
const RECORD_KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () =>
      reject(req.error ?? new Error("IndexedDB request failed"));
    req.onsuccess = () => resolve(req.result as T);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function loadCenteringSession(): Promise<CenteringSessionPayload | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(RECORD_KEY);
    const raw = await idbRequest(getReq);
    await transactionDone(tx);
    if (raw === undefined || raw === null) return null;
    if (!isSessionPayload(raw)) return null;
    return raw;
  } finally {
    db.close();
  }
}

export async function saveCenteringSession(
  payload: CenteringSessionPayload,
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(payload, RECORD_KEY);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function clearCenteringSession(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(RECORD_KEY);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}
