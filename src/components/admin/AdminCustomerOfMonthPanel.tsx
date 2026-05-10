"use client";

/**
 * iter-152 — Customer-of-the-month admin (Tier 9 #62).
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listCotmAwards,
  nominateCustomerOfMonth,
  deleteCotmAward,
  type CotmAwardRow,
} from "@/app/actions/customerOfMonth";
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
  gold: "#F5A623",
  goldDeep: "#92400e",
  success: "#22C55E",
  danger: "#EF4444",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminCustomerOfMonthPanel() {
  const [rows, setRows] = useState<CotmAwardRow[] | null>(null);
  const [showNominate, setShowNominate] = useState(false);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void listCotmAwards({ limit: 36 }).then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onDelete(row: CotmAwardRow) {
    if (!confirm(`Revoke ${row.customerName}'s ${row.monthName} ${row.year} award? Audit-logged.`)) return;
    startTransition(async () => {
      const res = await deleteCotmAward(row.id);
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  const grouped = useMemo(() => {
    const byYear = new Map<number, CotmAwardRow[]>();
    for (const r of rows ?? []) {
      const list = byYear.get(r.year) ?? [];
      list.push(r);
      byYear.set(r.year, list);
    }
    return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Customers · Customer of the Month
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Customer of the Month
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          One winner per month. Nominee gets a celebratory email + dashboard badge with your citation.
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowNominate(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          🌟 Nominate
        </button>
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No awards yet. Click 🌟 Nominate to crown the first one.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([year, awards]) => (
            <div key={year}>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>{year}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {awards.map((r) => (
                  <article key={r.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "linear-gradient(135deg,#F5A623,#F5C242)", color: T.goldDeep }}>
                        🌟 {r.monthName}
                      </div>
                      <button type="button" disabled={pending} onClick={() => onDelete(r)} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.20)" }}>
                        Revoke
                      </button>
                    </div>
                    <p className="mt-2 text-[14px] font-black" style={{ color: T.ink }}>
                      {r.customerName}
                    </p>
                    <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                      {r.suiteNumber && <>Suite #{r.suiteNumber} · </>}
                      Awarded {new Date(r.awardedAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.awardedByName && ` by ${r.awardedByName}`}
                    </p>
                    <blockquote className="mt-2 text-[11.5px] italic" style={{ color: T.inkSoft, borderLeft: `3px solid ${T.gold}`, padding: "4px 10px", background: "rgba(245,166,35,0.05)", borderRadius: 4 }}>
                      {r.citation}
                    </blockquote>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNominate && (
        <NominateModal onClose={() => setShowNominate(false)} onNominated={() => { setShowNominate(false); refresh(); }} />
      )}
    </div>
  );
}

function NominateModal({ onClose, onNominated }: { onClose: () => void; onNominated: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [citation, setCitation] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; email: string; suiteNumber: string | null }>>([]);
  const [picked, setPicked] = useState<{ id: string; name: string; suiteNumber: string | null } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function onSave() {
    setErrorMsg(null);
    if (!picked) { setErrorMsg("Pick a customer first"); return; }
    if (citation.trim().length < 10) { setErrorMsg("Write at least 10 characters of citation"); return; }
    startTransition(async () => {
      const res = await nominateCustomerOfMonth({
        userId: picked.id, year, month, citation: citation.trim(),
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onNominated();
    });
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>Nominate</p>
            <h3 className="text-lg font-black" style={{ color: T.ink }}>🌟 Customer of the Month</h3>
            <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
              Sends a celebratory email + adds a badge to their dashboard.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7] disabled:opacity-40" style={{ color: T.inkSoft }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Year</Label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Customer</Label>
            {picked ? (
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <span className="text-[12.5px] font-bold flex-1" style={{ color: T.ink }}>
                  {picked.name}
                  {picked.suiteNumber && <span className="ml-1.5 text-[10px] font-mono" style={{ color: T.inkFaint }}>#{picked.suiteNumber}</span>}
                </span>
                <button type="button" onClick={() => { setPicked(null); setQuery(""); }} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or suite #" className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                {results.length > 0 && (
                  <ul className="mt-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                    {results.map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => setPicked(r)} className="w-full text-left px-3 py-2 hover:bg-[#F4F5F7] flex items-center justify-between">
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
            <Label>Citation (visible to customer)</Label>
            <textarea value={citation} onChange={(e) => setCitation(e.target.value)} rows={4} maxLength={1000} placeholder="Why are they our pick? Mention specific moments — they'll see this in their email + dashboard badge." className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <p className="mt-0.5 text-[10px]" style={{ color: T.inkFaint }}>{citation.length}/1000 · ≥10 required</p>
          </div>

          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSave} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {pending ? "Saving…" : "🌟 Nominate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>{children}</label>;
}
