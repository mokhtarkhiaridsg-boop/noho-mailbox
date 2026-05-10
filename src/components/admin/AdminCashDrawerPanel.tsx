"use client";

/**
 * iter-229 — Cash-drawer reconciliation admin panel (Tier 17 #138).
 *
 * One-drawer-at-a-time daily session: Open with counted starting float
 * → live "expected" tile updates as cash POS sales accumulate → log
 * paid-in/paid-out adjustments → Close with counted ending float → see
 * signed variance + flag if outside tolerance → admin signs off with a
 * reason memo to clear flagged sessions.
 */

import { useEffect, useState, useTransition } from "react";
import {
  openCashDrawerSession,
  closeCashDrawerSession,
  addCashDrawerAdjustment,
  signOffCashDrawerVariance,
  listCashDrawerSessions,
  getCurrentOpenSession,
  getCashDrawerSummary,
  type CashDrawerSessionRow,
} from "@/app/actions/cashDrawer";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

const ADJ_CATEGORIES = [
  { id: "petty_cash", label: "Petty cash" },
  { id: "supply_run", label: "Supply run" },
  { id: "refund_external", label: "External refund" },
  { id: "deposit", label: "Bank deposit" },
  { id: "other", label: "Other" },
];

function dollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const sign = cents < 0 ? "−" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function signedDollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  if (cents === 0) return "$0.00";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function AdminCashDrawerPanel() {
  const [open, setOpen] = useState<CashDrawerSessionRow | null | undefined>(undefined);
  const [history, setHistory] = useState<CashDrawerSessionRow[] | null>(null);
  const [summary, setSummary] = useState<{ openCount: number; flaggedCount: number; last7Variance: number; last7AbsVariance: number; last7Sessions: number } | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Open form
  const [newOpening, setNewOpening] = useState("");
  const [newStation, setNewStation] = useState("");
  const [newTolerance, setNewTolerance] = useState("5.00");

  // Adjustment form
  const [adjKind, setAdjKind] = useState<"paid_in" | "paid_out">("paid_out");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjCategory, setAdjCategory] = useState<string>("petty_cash");
  const [adjReceipt, setAdjReceipt] = useState("");

  // Close form
  const [closeAmount, setCloseAmount] = useState("");
  const [closeNote, setCloseNote] = useState("");

  function refresh() {
    void getCurrentOpenSession().then((s) => setOpen(s)).catch(() => setOpen(null));
    void listCashDrawerSessions({ limit: 30 }).then(setHistory).catch(() => setHistory([]));
    void getCashDrawerSummary().then(setSummary).catch(() => setSummary(null));
  }

  useEffect(refresh, []);

  function dollarsToCents(v: string): number {
    const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ""));
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function onOpen() {
    const cents = dollarsToCents(newOpening);
    if (!Number.isFinite(cents) || cents < 0) { setError("Enter a valid opening float (e.g. 200.00)."); return; }
    const tolCents = dollarsToCents(newTolerance);
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await openCashDrawerSession({
        openingCents: cents,
        stationLabel: newStation.trim() || undefined,
        varianceTolerance: Number.isFinite(tolCents) ? tolCents : 500,
      });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Drawer #${res.session?.number} opened at ${dollars(cents)}.`); setNewOpening(""); setNewStation(""); refresh(); }
    });
  }

  function onAdj() {
    if (!open) return;
    const cents = dollarsToCents(adjAmount);
    if (!Number.isFinite(cents) || cents <= 0) { setError("Enter a valid amount."); return; }
    if (!adjReason.trim()) { setError("Reason is required."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await addCashDrawerAdjustment({
        sessionId: open.id, kind: adjKind, amountCents: cents,
        reason: adjReason, category: adjCategory, receiptRef: adjReceipt.trim() || undefined,
      });
      if (res.error) setError(res.error);
      else { setInfo(`✓ ${adjKind === "paid_in" ? "Paid in" : "Paid out"} ${dollars(cents)}.`); setAdjAmount(""); setAdjReason(""); setAdjReceipt(""); refresh(); }
    });
  }

  function onClose() {
    if (!open) return;
    const cents = dollarsToCents(closeAmount);
    if (!Number.isFinite(cents) || cents < 0) { setError("Enter a valid counted ending amount."); return; }
    if (!confirm(`Close drawer #${open.number} with counted ${dollars(cents)}?`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await closeCashDrawerSession({ id: open.id, closingCents: cents, closeNote: closeNote.trim() || undefined });
      if (res.error) setError(res.error);
      else {
        const v = res.session?.varianceCents ?? 0;
        setInfo(res.session?.varianceFlagged ? `⚠️ Closed with variance ${signedDollars(v)} — needs sign-off.` : `✓ Closed clean (variance ${signedDollars(v)}).`);
        setCloseAmount(""); setCloseNote(""); refresh();
      }
    });
  }

  function onSignOff(s: CashDrawerSessionRow) {
    const reason = prompt(`Sign off variance ${signedDollars(s.varianceCents)} on drawer #${s.number}? Explain why (≥4 chars):`);
    if (!reason || reason.trim().length < 4) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await signOffCashDrawerVariance({ id: s.id, reason });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Signed off drawer #${s.number}.`); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Cash Drawer
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          count it daily
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {summary ? `${summary.openCount} open · ${summary.flaggedCount} flagged` : "loading"}
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        Daily start/end cash count. System pulls iter-130 cash POS sales + your logged paid-in/paid-out adjustments to compute expected drawer total. Counted vs expected → variance. Sessions outside the tolerance band get flagged for sign-off.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Open drawer" value={summary ? (summary.openCount > 0 ? "1" : "0") : "—"} accent={summary && summary.openCount > 0 ? T.green : T.inkFaint} />
        <Tile label="Flagged" value={summary ? String(summary.flaggedCount) : "—"} accent={summary && summary.flaggedCount > 0 ? T.red : T.inkFaint} />
        <Tile label="7d sessions" value={summary ? String(summary.last7Sessions) : "—"} accent={T.inkSoft} />
        <Tile label="7d variance |Σ|" value={summary ? `$${(summary.last7AbsVariance / 100).toFixed(2)}` : "—"} accent={summary && summary.last7AbsVariance > 2000 ? T.amber : T.inkSoft} />
      </div>

      {/* Open / Active drawer */}
      {open === undefined ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading drawer…</p>
      ) : open === null ? (
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>+ Open new drawer session</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={newOpening} onChange={(e) => setNewOpening(e.target.value)} placeholder="Starting float ($)"
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={newStation} onChange={(e) => setNewStation(e.target.value)} placeholder="Station label (optional)"
              className="px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={newTolerance} onChange={(e) => setNewTolerance(e.target.value)} placeholder="Variance tolerance ($)"
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <button type="button" onClick={onOpen} disabled={busy || !newOpening.trim()}
            className="mt-2 text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ background: T.green }}>
            {busy ? "Opening…" : "Open drawer"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.green}55`, boxShadow: `0 4px 16px ${T.green}1A` }}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.green }}>● Open · Drawer #{open.number}</p>
              <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
                Opened {new Date(open.openedAtIso).toLocaleString()} by {open.openedByName ?? "—"}{open.stationLabel && ` · ${open.stationLabel}`}
              </p>
            </div>
            <p className="text-[24px] font-mono font-black tabular-nums" style={{ color: T.ink }}>{dollars(open.expectedClosingCents)}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Opening" value={dollars(open.openingCents)} accent={T.inkSoft} compact />
            <Tile label="Cash sales" value={dollars(open.cashSalesCents)} accent={T.green} compact />
            <Tile label="Cash refunds" value={dollars(open.cashRefundsCents)} accent={open.cashRefundsCents > 0 ? T.red : T.inkFaint} compact />
            <Tile label="Adjustments" value={signedDollars(open.adjustmentsCents)} accent={open.adjustmentsCents !== 0 ? T.amber : T.inkFaint} compact />
          </div>

          {/* Adjustment form */}
          <div className="rounded-xl p-3" style={{ background: T.surfaceAlt }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>+ Log cash adjustment</p>
            <div className="flex gap-1.5 mb-2">
              <button type="button" onClick={() => setAdjKind("paid_out")}
                className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                style={{
                  background: adjKind === "paid_out" ? T.red : T.surface,
                  color: adjKind === "paid_out" ? "white" : T.inkSoft,
                  border: `1px solid ${adjKind === "paid_out" ? T.red : T.border}`,
                }}>
                ↓ Paid out
              </button>
              <button type="button" onClick={() => setAdjKind("paid_in")}
                className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                style={{
                  background: adjKind === "paid_in" ? T.green : T.surface,
                  color: adjKind === "paid_in" ? "white" : T.inkSoft,
                  border: `1px solid ${adjKind === "paid_in" ? T.green : T.border}`,
                }}>
                ↑ Paid in
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="Amount ($)"
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
              <select value={adjCategory} onChange={(e) => setAdjCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-[12.5px]"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }}>
                {ADJ_CATEGORIES.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
              </select>
            </div>
            <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Reason (required, e.g. 'paper from Office Depot')" maxLength={200}
              className="w-full mt-2 px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={adjReceipt} onChange={(e) => setAdjReceipt(e.target.value)} placeholder="Receipt # (optional)" maxLength={80}
              className="w-full mt-2 px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
            <button type="button" onClick={onAdj} disabled={busy || !adjAmount.trim() || !adjReason.trim()}
              className="mt-2 text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: adjKind === "paid_in" ? T.green : T.red }}>
              {busy ? "Logging…" : `Log ${adjKind === "paid_in" ? "paid-in" : "paid-out"}`}
            </button>
          </div>

          {open.adjustments.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: T.inkFaint }}>Adjustments this session ({open.adjustments.length})</p>
              <ul className="space-y-1">
                {open.adjustments.map((a) => (
                  <li key={a.id} className="text-[11px] flex items-center justify-between gap-2 py-1 px-2 rounded-md" style={{ background: T.surfaceAlt }}>
                    <span style={{ color: T.inkSoft }}>
                      <span className="font-mono font-bold" style={{ color: a.kind === "paid_in" ? T.green : T.red }}>{signedDollars(a.signedCents)}</span>
                      {a.category && <span style={{ color: T.inkFaint }}> · {a.category.replace(/_/g, " ")}</span>}
                      {" · "}{a.reason}
                      {a.receiptRef && <span style={{ color: T.inkFaint }}> · {a.receiptRef}</span>}
                    </span>
                    <span className="text-[10px]" style={{ color: T.inkFaint }}>{new Date(a.createdAtIso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close form */}
          <div className="rounded-xl p-3" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}40` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: "#b45309" }}>Close drawer</p>
            <p className="text-[10.5px] mb-2" style={{ color: T.inkSoft }}>
              Count the cash physically in the drawer right now. Expected total: <span className="font-mono font-bold" style={{ color: T.ink }}>{dollars(open.expectedClosingCents)}</span> · tolerance ±{dollars(open.varianceTolerance)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={closeAmount} onChange={(e) => setCloseAmount(e.target.value)} placeholder="Counted closing ($)"
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
              <input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Note (optional)" maxLength={500}
                className="px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
            <button type="button" onClick={onClose} disabled={busy || !closeAmount.trim()}
              className="mt-2 text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: T.amber }}>
              {busy ? "Closing…" : "Count + close"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Recent sessions</p>
        {!history ? (
          <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
        ) : history.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
            No sessions yet. Open one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((s) => {
              const flag = s.varianceFlagged;
              const closed = s.status !== "Open";
              const v = s.varianceCents ?? 0;
              return (
                <li key={s.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${flag ? `${T.red}55` : T.border}` }}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-mono font-black" style={{ color: flag ? T.red : T.ink }}>#{s.number}</span>
                        <StatusPill status={s.status} flag={flag} />
                        {s.stationLabel && <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· {s.stationLabel}</span>}
                      </div>
                      <p className="text-[10.5px] mt-1" style={{ color: T.inkFaint }}>
                        Opened {new Date(s.openedAtIso).toLocaleString()} by {s.openedByName ?? "—"}
                        {s.closedAtIso && ` · Closed ${new Date(s.closedAtIso).toLocaleString()} by ${s.closedByName ?? "—"}`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] font-mono" style={{ color: T.inkSoft }}>
                        <span>Open {dollars(s.openingCents)}</span>
                        <span>Sales {dollars(s.cashSalesCents)}</span>
                        {s.cashRefundsCents > 0 && <span>Refunds {dollars(s.cashRefundsCents)}</span>}
                        {s.adjustmentsCents !== 0 && <span>Adj {signedDollars(s.adjustmentsCents)}</span>}
                        <span>Expected {dollars(s.expectedClosingCents)}</span>
                        {closed && <span>Counted {dollars(s.closingCents)}</span>}
                      </div>
                      {closed && (
                        <p className="text-[11.5px] font-mono font-black mt-1" style={{ color: flag ? T.red : v === 0 ? T.green : T.amber }}>
                          Variance {signedDollars(v)}
                          {flag && <span className="ml-2 text-[9.5px] font-black uppercase tracking-wide" style={{ color: T.red }}>· flagged</span>}
                          {!flag && s.signedOffAtIso && <span className="ml-2 text-[9.5px] font-black uppercase tracking-wide" style={{ color: T.inkFaint }}>· signed off by {s.signedOffByName ?? "—"}</span>}
                        </p>
                      )}
                      {s.signOffReason && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkSoft }}>📝 sign-off: {s.signOffReason}</p>}
                      {s.closeNote && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkSoft }}>📝 close: {s.closeNote}</p>}
                    </div>
                    {flag && (
                      <button type="button" onClick={() => onSignOff(s)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50 shrink-0"
                        style={{ background: T.red, color: "white" }}>
                        Sign off
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent, compact }: { label: string; value: string; accent: string; compact?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className={`font-mono font-black tabular-nums ${compact ? "text-[14px]" : "text-[18px]"} mt-0.5`} style={{ color: accent }}>{value}</p>
    </div>
  );
}

function StatusPill({ status, flag }: { status: "Open" | "Closed" | "Variance"; flag: boolean }) {
  if (flag) return (
    <span className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: `${T.red}1A`, color: T.red, border: `1px solid ${T.red}40` }}>
      ⚠ Variance
    </span>
  );
  if (status === "Open") return (
    <span className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: `${T.green}1A`, color: "#15803d", border: `1px solid ${T.green}40` }}>
      ● Open
    </span>
  );
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
      ✓ Closed
    </span>
  );
}
