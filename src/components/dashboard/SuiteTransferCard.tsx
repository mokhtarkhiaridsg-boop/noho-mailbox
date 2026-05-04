"use client";

// iter-122 — Member-side suite transfer request card.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMySuiteTransfer,
  getVacantSuiteNumbers,
  requestSuiteTransfer,
  cancelMySuiteTransfer,
} from "@/app/actions/suiteTransfer";

type Status = Awaited<ReturnType<typeof getMySuiteTransfer>>;

export default function SuiteTransferCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [vacant, setVacant] = useState<{ suite: string; rank: number }[] | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void getMySuiteTransfer().then(setStatus).catch(() => setStatus({ pending: null, history: [] }));
    void getVacantSuiteNumbers().then(setVacant).catch(() => setVacant([]));
  }
  useEffect(() => { refresh(); }, []);

  function file() {
    setMsg(null);
    startTransition(async () => {
      const res = await requestSuiteTransfer({ toSuite: target, reason });
      if (res.error) { setMsg(res.error); return; }
      setMsg("✓ Request filed — admin reviews within 1 business day");
      setTarget(""); setReason("");
      refresh();
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel your pending transfer request?")) return;
    startTransition(async () => {
      const res = await cancelMySuiteTransfer(id);
      if (res.error) { setMsg(res.error); return; }
      setMsg("Request cancelled");
      refresh();
    });
  }

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Move to a different suite
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Want a more memorable number, or one that matches your business name? Pick from any vacant suite — admin reviews + approves within 1 business day.
      </p>

      {msg && (
        <div className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : msg.startsWith("Request") ? "rgba(245,166,35,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : msg.startsWith("Request") ? "#92400e" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      {status?.pending ? (
        <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border, background: "rgba(245,166,35,0.06)" }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#92400e" }}>
            Pending review
          </p>
          <p className="text-[13px] font-black mt-1" style={{ color: BRAND.ink }}>
            #{status.pending.fromSuite} → #{status.pending.toSuite}
          </p>
          <p className="text-[11.5px] mt-1 italic" style={{ color: BRAND.inkSoft }}>
            "{status.pending.reason}"
          </p>
          <p className="text-[10.5px] mt-1.5" style={{ color: BRAND.inkFaint }}>
            Filed {new Date(status.pending.createdAtIso).toLocaleDateString()}
          </p>
          <button type="button" onClick={() => cancel(status.pending!.id)} disabled={pending}
            className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
            style={{ borderColor: "#dc2626", color: "#991b1b", background: "white" }}>
            Cancel request
          </button>
        </div>
      ) : (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
              Pick a vacant suite ({vacant?.length ?? 0} available)
            </label>
            {!vacant ? (
              <p className="text-[11.5px] italic mt-1" style={{ color: BRAND.inkFaint }}>Loading…</p>
            ) : vacant.length === 0 ? (
              <p className="text-[11.5px] italic mt-1" style={{ color: BRAND.inkFaint }}>
                No vacancies in the current range. Check back later or call (818) 506-7744 to request expansion.
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {vacant.map((v) => (
                  <button key={v.suite} type="button" onClick={() => setTarget(v.suite)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black"
                    style={{
                      background: target === v.suite ? BRAND.blue : "white",
                      color: target === v.suite ? "white" : BRAND.ink,
                      border: `1px solid ${target === v.suite ? BRAND.blue : BRAND.border}`,
                    }}>
                    #{v.suite}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
              Why this suite?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Easier for clients to remember, or matches my LLC name…"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
            />
            <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkFaint }}>
              {reason.length}/500 · minimum 10
            </p>
          </div>
          <button type="button" onClick={file} disabled={pending || !target || reason.trim().length < 10}
            className="w-full py-2.5 rounded-lg text-white font-black text-[12px] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            {pending ? "Filing…" : target ? `File transfer request → #${target}` : "Pick a suite first"}
          </button>
        </div>
      )}

      {status && status.history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.inkSoft }}>
            History · {status.history.length}
          </summary>
          <ul className="mt-1.5 space-y-1">
            {status.history.map((h) => (
              <li key={h.id} className="rounded-md px-2 py-1.5" style={{ background: "rgba(45,16,15,0.04)" }}>
                <p className="text-[11px] font-black" style={{ color: BRAND.ink }}>
                  #{h.fromSuite} → #{h.toSuite}
                  <span className={"ml-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"}
                    style={{
                      background: h.status === "Approved" ? "rgba(22,163,74,0.14)" : "rgba(231,0,19,0.10)",
                      color: h.status === "Approved" ? "#15803d" : "#991b1b",
                    }}>
                    {h.status}
                  </span>
                </p>
                {h.decisionNote && (
                  <p className="text-[10.5px] mt-0.5 italic" style={{ color: BRAND.inkSoft }}>"{h.decisionNote}"</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
