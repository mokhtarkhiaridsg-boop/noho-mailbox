"use client";

/**
 * iter-147 — Door-access keypad codes panel (Tier 9 #57).
 *
 * Two stacks side-by-side:
 *   Left:  Active codes — one per customer, with stale-soon flag + Rotate/Retire
 *   Right: Recent entries — last 100 keypad attempts (granted/denied)
 *
 * "Issue code" button opens a modal to assign a fresh 4-digit code to a
 * customer (with rotation cadence + admin notes). Reused customer-search
 * pattern from the label printer (iter-128).
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listActiveDoorCodes,
  listRecentDoorEntries,
  issueDoorCode,
  retireDoorCode,
  rotateDoorCode,
  type DoorCodeRow,
  type DoorEntryRow,
} from "@/app/actions/doorAccess";
import { searchCustomersForLabel } from "@/app/actions/labelPrinter";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const RESULT_STYLE: Record<DoorEntryRow["result"], { bg: string; fg: string; label: string; emoji: string }> = {
  granted:         { bg: "rgba(34,197,94,0.10)", fg: "#15803d", label: "Granted",       emoji: "✓" },
  denied:          { bg: "rgba(231,0,19,0.08)",  fg: "#991b1b", label: "Denied",        emoji: "✕" },
  denied_retired:  { bg: "rgba(245,158,11,0.10)", fg: "#92400e", label: "Retired code", emoji: "⏱" },
  denied_unknown:  { bg: "rgba(231,0,19,0.08)",  fg: "#991b1b", label: "Unknown code",  emoji: "?" },
};

export default function AdminDoorAccessPanel() {
  const [codes, setCodes] = useState<DoorCodeRow[] | null>(null);
  const [entries, setEntries] = useState<DoorEntryRow[] | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void listActiveDoorCodes().then(setCodes).catch(() => setCodes([]));
    void listRecentDoorEntries(80).then(setEntries).catch(() => setEntries([]));
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  function onRotate(row: DoorCodeRow) {
    if (!confirm(`Rotate code for ${row.customerName ?? row.customerEmail}? The current code will be retired and a new 4-digit code generated. Customer will need the new code at the keypad.`)) return;
    startTransition(async () => {
      const res = await rotateDoorCode({ userId: row.userId });
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  function onRetire(row: DoorCodeRow) {
    const reason = window.prompt(`Retire the active code for ${row.customerName ?? row.customerEmail}? Type a reason for the audit log:`, "");
    if (reason === null) return;
    startTransition(async () => {
      const res = await retireDoorCode({ codeId: row.id, reason });
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  const stale = useMemo(() => (codes ?? []).filter((c) => c.isStale), [codes]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Door access
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          After-hours keypad codes
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          One active 4-digit code per customer. Default rotation 90 days. Every keypad attempt logged. {stale.length > 0 && (
            <span className="font-bold" style={{ color: T.warning }}>
              {" "}· {stale.length} code{stale.length === 1 ? "" : "s"} overdue for rotation
            </span>
          )}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowIssue(true)}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white"
          style={{ background: T.blue }}
        >
          + Issue new code
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
        {/* Active codes */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
            Active codes ({codes?.length ?? "—"})
          </div>
          {codes == null ? (
            <p className="p-4 text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : codes.length === 0 ? (
            <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>
              No active codes — issue one to get started.
            </div>
          ) : (
            <ul>
              {codes.map((c) => (
                <li key={c.id} className="px-4 py-3" style={{ borderTop: `1px solid ${T.border}` }}>
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 px-3 py-2 rounded-lg text-center font-mono"
                      style={{
                        background: c.isStale ? "rgba(245,158,11,0.10)" : "rgba(51,116,133,0.08)",
                        color: c.isStale ? "#92400e" : T.blueDeep,
                        border: `1px solid ${c.isStale ? "rgba(245,158,11,0.30)" : "rgba(51,116,133,0.20)"}`,
                      }}
                    >
                      <p className="text-[18px] font-black tracking-[0.1em]">{c.code}</p>
                      <p className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: c.isStale ? "#92400e" : T.blueDeep, opacity: 0.8 }}>
                        {c.isStale ? `OVERDUE ${Math.abs(c.daysUntilRotation)}d` : `${c.daysUntilRotation}d left`}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold truncate" style={{ color: T.ink }}>
                        {c.customerName ?? c.customerEmail}
                        {c.suiteNumber && (
                          <span className="ml-2 text-[10px] font-mono" style={{ color: T.inkFaint }}>
                            #{c.suiteNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                        Issued {new Date(c.issuedAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {c.entryCount > 0 && ` · ${c.entryCount} entr${c.entryCount === 1 ? "y" : "ies"}`}
                        {c.lastEntryAtIso && ` · last ${new Date(c.lastEntryAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </p>
                      {c.notes && (
                        <p className="text-[10px] mt-0.5 italic" style={{ color: T.inkSoft }}>
                          {c.notes}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRotate(c)}
                        className="text-[10.5px] font-black px-2 py-1 rounded-md text-white disabled:opacity-50"
                        style={{ background: c.isStale ? T.warning : T.blue }}
                      >
                        {c.isStale ? "Rotate now" : "Rotate"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRetire(c)}
                        className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
                      >
                        Retire
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent entries */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
            Recent keypad entries
          </div>
          {entries == null ? (
            <p className="p-4 text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>
              No entries yet.
            </div>
          ) : (
            <ul>
              {entries.map((e) => {
                const r = RESULT_STYLE[e.result];
                const at = new Date(e.attemptedAtIso);
                return (
                  <li key={e.id} className="px-4 py-2 flex items-center gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: r.bg, color: r.fg }}>
                      {r.emoji} {r.label}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: T.inkSoft }}>
                      {e.enteredCode}
                    </span>
                    {e.customerName && (
                      <span className="text-[10.5px] truncate" style={{ color: T.inkFaint }}>
                        · {e.customerName}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color: T.inkFaint }}>
                      {at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showIssue && (
        <IssueCodeModal onClose={() => setShowIssue(false)} onIssued={() => { setShowIssue(false); refresh(); }} />
      )}
    </div>
  );
}

function IssueCodeModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; email: string; suiteNumber: string | null }>>([]);
  const [picked, setPicked] = useState<{ id: string; name: string; suiteNumber: string | null } | null>(null);
  const [rotationDays, setRotationDays] = useState(90);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      void searchCustomersForLabel({ query }).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onIssue() {
    if (!picked) { setErrorMsg("Pick a customer first"); return; }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await issueDoorCode({
        userId: picked.id,
        rotationDays,
        notes: notes.trim() || undefined,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      setIssuedCode(res.code ?? null);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Issue door code
            </p>
            <h3 className="text-lg font-black" style={{ color: T.ink }}>
              {issuedCode ? "Code generated" : "New 4-digit pickup code"}
            </h3>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7] disabled:opacity-40" style={{ color: T.inkSoft }}>
            ✕
          </button>
        </div>

        {issuedCode ? (
          <div className="p-5 text-center space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              New code
            </p>
            <p className="text-[60px] font-black tabular-nums tracking-[0.1em]" style={{ color: T.blueDeep }}>
              {issuedCode}
            </p>
            <p className="text-[12px]" style={{ color: T.inkFaint }}>
              Hand this to <strong style={{ color: T.ink }}>{picked?.name}</strong>
              {picked?.suiteNumber && <span> (suite #{picked.suiteNumber})</span>}
              .<br/>
              They keypad-enter it for after-hours pickup. Rotates in {rotationDays} days.
            </p>
            <button
              type="button"
              onClick={onIssued}
              className="px-4 py-2 rounded-lg text-[12.5px] font-black text-white"
              style={{ background: T.blue }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                Customer
              </label>
              {picked ? (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                  <span className="text-[12.5px] font-bold flex-1" style={{ color: T.ink }}>
                    {picked.name}
                    {picked.suiteNumber && <span className="ml-1.5 text-[10px] font-mono" style={{ color: T.inkFaint }}>#{picked.suiteNumber}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPicked(null); setQuery(""); }}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                    style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, email, or suite #"
                    className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
                    style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
                  />
                  {results.length > 0 && (
                    <ul className="mt-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                      {results.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setPicked(r)}
                            className="w-full text-left px-3 py-2 hover:bg-[#F4F5F7] flex items-center justify-between"
                          >
                            <span className="text-[12px] font-bold" style={{ color: T.ink }}>
                              {r.name}
                              <span className="ml-1.5 text-[10px]" style={{ color: T.inkFaint }}>{r.email}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>
                              #{r.suiteNumber ?? "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                Rotation cadence
              </label>
              <div className="mt-1 flex gap-1.5">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRotationDays(d)}
                    className="flex-1 text-[11.5px] font-bold px-2 py-1.5 rounded-lg"
                    style={{
                      background: rotationDays === d ? T.blue : "white",
                      color: rotationDays === d ? "white" : T.inkSoft,
                      border: `1px solid ${rotationDays === d ? T.blue : T.border}`,
                    }}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. issued in person at the counter"
                maxLength={200}
                className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
                style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
              />
            </div>

            {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={pending} className="text-[11.5px] font-bold px-3 py-2 rounded-lg disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                Cancel
              </button>
              <button type="button" onClick={onIssue} disabled={pending || !picked} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                {pending ? "Issuing…" : "Generate code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
