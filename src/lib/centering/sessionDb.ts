import type { CardSideState, PerspectiveQuad } from "@/lib/centering/types";

export const CENTERING_SESSION_VERSION = 1;

const DB_NAME = "poke-center-centering";
const DB_VERSION = 1;
const STORE_NAME = "session";
const RECORD_KEY = "current";

export type CenteringSessionPayload = {
  v: number;
  front: CardSideState;
  back: CardSideState;
};

function isPoint2(v: unknown): v is { x: number; y: number } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === "number" &&
    Number.isFinite(o.x) &&
    typeof o.y === "number" &&
    Number.isFinite(o.y)
  );
}

function isPerspectiveQuad(v: unknown): v is PerspectiveQuad {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return isPoint2(o.tl) && isPoint2(o.tr) && isPoint2(o.br) && isPoint2(o.bl);
}

function isDataUrlOrNull(s: unknown): s is string | null {
  if (s === null) return true;
  return typeof s === "string" && s.startsWith("data:");
}

function isCardSideState(v: unknown): v is CardSideState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!isDataUrlOrNull(o.rawImageSrc) || !isDataUrlOrNull(o.imageSrc)) {
    return false;
  }
  const t = o.transform;
  if (typeof t !== "object" || t === null) return false;
  const tr = t as Record<string, unknown>;
  if (
    typeof tr.scale !== "number" ||
    !Number.isFinite(tr.scale) ||
    typeof tr.offsetX !== "number" ||
    !Number.isFinite(tr.offsetX) ||
    typeof tr.offsetY !== "number" ||
    !Number.isFinite(tr.offsetY)
  ) {
    return false;
  }
  const g = o.guides;
  if (typeof g !== "object" || g === null) return false;
  const gr = g as Record<string, unknown>;
  if (
    typeof gr.left !== "number" ||
    typeof gr.right !== "number" ||
    typeof gr.top !== "number" ||
    typeof gr.bottom !== "number"
  ) {
    return false;
  }
  if (typeof o.guideColor !== "string") return false;
  if (
    o.perspectiveCorners !== null &&
    !isPerspectiveQuad(o.perspectiveCorners)
  ) {
    return false;
  }
  return true;
}

function isSessionPayload(v: unknown): v is CenteringSessionPayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.v !== CENTERING_SESSION_VERSION) return false;
  return isCardSideState(o.front) && isCardSideState(o.back);
}

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
