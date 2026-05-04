"use client";

// iter-109 — Tiny IndexedDB queue for offline scans.
//
// Keeps it dependency-free with raw IDBObjectStore access. Each entry is
// the exact arg shape passed to `logScannedInbound`. Sync drains FIFO,
// removing each entry only after a successful server commit. If the
// server returns an error we leave the entry in the queue and stop —
// the caller (a setInterval + online listener) will retry on next tick.

const DB_NAME = "noho-scanner-v1";
const STORE = "scan_queue";
const VERSION = 1;

export type QueuedScan = {
  id?: number;            // auto-incremented by IndexedDB
  enqueuedAtIso: string;
  args: {
    trackingNumber: string;
    carrier: string;
    userId?: string;
    suiteNumber?: string;
    recipientName?: string;
    notes?: string;
    weightOz?: number;
    dimensions?: string;
    exteriorImageUrl?: string;
  };
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueScan(args: QueuedScan["args"]): Promise<number> {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.add({ enqueuedAtIso: new Date().toISOString(), args } satisfies QueuedScan);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function listQueuedScans(): Promise<QueuedScan[]> {
  const db = await openDb();
  return new Promise<QueuedScan[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as QueuedScan[]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedScan(id: number): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function countQueuedScans(): Promise<number> {
  try {
    const rows = await listQueuedScans();
    return rows.length;
  } catch {
    return 0;
  }
}
