"use client";

// iter-109 — Bureau scanner PWA client.
//
// Tablet-friendly intake form that works offline. The "Log scan" button:
//  1. If online → calls logScannedInbound directly + flashes a toast.
//  2. If offline → enqueues to IndexedDB. A drainer auto-flushes the
//     queue when navigator.onLine flips true OR every 15s.
//
// Status strip at the top shows online/offline + the pending-sync count.

import { useEffect, useRef, useState, useTransition } from "react";
import { logScannedInbound } from "@/app/actions/mail";
import { enqueueScan, listQueuedScans, removeQueuedScan, countQueuedScans, type QueuedScan } from "./offlineQueue";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Amazon", "Other"] as const;

type Toast = { kind: "ok" | "queued" | "err"; text: string };

export function ScannerClient() {
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState<typeof CARRIERS[number]>("UPS");
  const [suiteNumber, setSuiteNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [pending, startTransition] = useTransition();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [drainBusy, setDrainBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Online/offline tracking.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    function onOnline() { setOnline(true); void drain(); }
    function onOffline() { setOnline(false); }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial pending-count + 15s drain heartbeat.
  useEffect(() => {
    void countQueuedScans().then(setPendingCount);
    const id = setInterval(() => {
      void countQueuedScans().then(setPendingCount);
      if (typeof navigator !== "undefined" && navigator.onLine) void drain();
    }, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  async function drain() {
    if (drainBusy) return;
    setDrainBusy(true);
    try {
      const queue: QueuedScan[] = await listQueuedScans();
      let drained = 0;
      for (const item of queue) {
        try {
          const res = await logScannedInbound(item.args);
          if ((res as { error?: string }).error) {
            console.warn("[scanner drain] server error:", (res as { error?: string }).error);
            break;
          }
          if (item.id != null) await removeQueuedScan(item.id);
          drained += 1;
        } catch (e) {
          console.warn("[scanner drain] failed:", e);
          break;
        }
      }
      const after = await countQueuedScans();
      setPendingCount(after);
      if (drained > 0) flash({ kind: "ok", text: `✓ Synced ${drained} scan${drained === 1 ? "" : "s"} from queue` });
    } finally {
      setDrainBusy(false);
    }
  }

  function clearForm() {
    setTracking("");
    setSuiteNumber("");
    setRecipientName("");
    inputRef.current?.focus();
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (tracking.trim().length < 6) {
      flash({ kind: "err", text: "Tracking number must be ≥6 chars" });
      return;
    }
    if (!suiteNumber.trim()) {
      flash({ kind: "err", text: "Suite number required" });
      return;
    }

    const payload = {
      trackingNumber: tracking.trim(),
      carrier,
      suiteNumber: suiteNumber.trim(),
      recipientName: recipientName.trim() || undefined,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      void enqueueScan(payload).then(async () => {
        const c = await countQueuedScans();
        setPendingCount(c);
        flash({ kind: "queued", text: `📥 Queued offline · ${c} pending` });
        clearForm();
      }).catch((err) => {
        flash({ kind: "err", text: `Queue failed: ${err instanceof Error ? err.message : String(err)}` });
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await logScannedInbound(payload);
        if ((res as { error?: string }).error) {
          flash({ kind: "err", text: (res as { error?: string }).error || "Server rejected" });
          return;
        }
        flash({ kind: "ok", text: `✓ Logged ${payload.trackingNumber.slice(-6)} → suite #${payload.suiteNumber}` });
        clearForm();
      } catch {
        await enqueueScan(payload);
        const c = await countQueuedScans();
        setPendingCount(c);
        flash({ kind: "queued", text: `📥 Network blip · queued · ${c} pending` });
        clearForm();
      }
    });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#F8F2EA", color: NOHO_INK }}>
      {/* Status strip */}
      <header className="px-5 py-3 flex items-center justify-between" style={{ background: NOHO_BLUE_DEEP, color: "white" }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: online ? "#22c55e" : NOHO_AMBER, boxShadow: `0 0 6px ${online ? "#22c55e" : NOHO_AMBER}` }} />
          <p className="text-[13px] font-black tracking-tight">NOHO Scanner</p>
          <p className="text-[11px] opacity-80">{online ? "Online" : "Offline · queueing"}</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[11px] font-black px-2 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
              {pendingCount} pending sync
            </span>
          )}
          <button type="button" onClick={() => void drain()} disabled={drainBusy || pendingCount === 0}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md disabled:opacity-40"
            style={{ background: "white", color: NOHO_BLUE_DEEP }}>
            {drainBusy ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="mx-5 mt-3 rounded-xl px-3 py-2 text-[12.5px] font-bold"
          style={{
            background: toast.kind === "ok"     ? "rgba(22,163,74,0.10)"
                      : toast.kind === "queued" ? "rgba(245,166,35,0.12)"
                      :                           "rgba(231,0,19,0.10)",
            color:      toast.kind === "ok"     ? "#15803d"
                      : toast.kind === "queued" ? "#92400e"
                      :                           "#991b1b",
          }}>
          {toast.text}
        </div>
      )}

      {/* Intake form */}
      <main className="flex-1 px-5 py-5 max-w-2xl w-full mx-auto">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Tracking number
            </label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Scan or type…"
              className="mt-1 w-full rounded-xl border px-4 py-4 text-xl font-mono"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Carrier
            </label>
            <div className="mt-1 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {CARRIERS.map((c) => (
                <button key={c} type="button" onClick={() => setCarrier(c)}
                  className="py-2.5 rounded-lg text-[12px] font-black"
                  style={{
                    background: carrier === c ? NOHO_BLUE : "white",
                    color: carrier === c ? "white" : NOHO_INK,
                    border: `1px solid ${carrier === c ? NOHO_BLUE : "#e8e5e0"}`,
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
                Suite #
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={suiteNumber}
                onChange={(e) => setSuiteNumber(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
                placeholder="042"
                className="mt-1 w-full rounded-xl border px-4 py-3 text-lg font-mono"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
                Recipient (optional)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name on label if different"
                className="mt-1 w-full rounded-xl border px-4 py-3 text-base"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={pending}
              className="flex-1 py-4 rounded-xl text-white text-[14px] font-black uppercase tracking-[0.10em] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
              {pending ? "Logging…" : online ? "Log scan" : "Queue scan (offline)"}
            </button>
            <button type="button" onClick={clearForm}
              className="px-4 py-4 rounded-xl text-[12px] font-bold border"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
              Clear
            </button>
          </div>
        </form>

        <details className="mt-6">
          <summary className="cursor-pointer text-[11px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            How offline mode works
          </summary>
          <ul className="mt-2 text-[12px] space-y-1 list-disc pl-5" style={{ color: NOHO_INK }}>
            <li>When the wifi blips, every scan is saved on the device in IndexedDB.</li>
            <li>The status strip shows <strong>Offline · queueing</strong> + a count.</li>
            <li>When the wifi comes back the queue auto-drains (also every 15 seconds).</li>
            <li>Each pending scan only commits once the server confirms — no duplicates.</li>
            <li>Tap <strong>Sync now</strong> to drain manually.</li>
          </ul>
        </details>
      </main>

      <footer className="px-5 py-3 text-center text-[10.5px]" style={{ color: "rgba(45,16,15,0.45)" }}>
        Install via your browser's "Add to Home Screen" for full-screen mode.
      </footer>
    </div>
  );
}

export default ScannerClient;
