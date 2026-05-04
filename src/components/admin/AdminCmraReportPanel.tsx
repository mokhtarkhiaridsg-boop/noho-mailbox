"use client";

// iter-107 — CMRA quarterly compliance roster + change report admin panel.
//
// Pick a quarter (defaults to current) → see summary tiles → download
// the roster CSV (every active customer) and the change CSV (signups,
// deactivations, ID renewals, Form 1583 re-uploads, etc. that happened
// during that quarter). All exports are audit-logged in cmraReport.ts.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getCmraSummary,
  exportCmraRosterCsv,
  exportCmraChangesCsv,
  type CmraSummary,
} from "@/app/actions/cmraReport";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

function currentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

function downloadFile(filename: string, body: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export default function AdminCmraReportPanel() {
  const initial = useMemo(currentQuarter, []);
  const [year, setYear] = useState(initial.year);
  const [quarter, setQuarter] = useState(initial.quarter);
  const [summary, setSummary] = useState<CmraSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    startTransition(async () => {
      try {
        const s = await getCmraSummary({ year, quarter });
        setSummary(s);
      } catch (e) {
        setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [year, quarter]);

  async function downloadRoster() {
    setBusyKey("roster"); setMsg(null);
    try {
      const r = await exportCmraRosterCsv({ year, quarter });
      downloadFile(`noho-cmra-roster-${year}-Q${quarter}.csv`, r.csv, "text/csv;charset=utf-8");
      setMsg(`✓ Roster · ${r.rows} active customer${r.rows === 1 ? "" : "s"} for ${r.periodLabel}`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusyKey(null); }
  }
  async function downloadChanges() {
    setBusyKey("changes"); setMsg(null);
    try {
      const r = await exportCmraChangesCsv({ year, quarter });
      downloadFile(`noho-cmra-changes-${year}-Q${quarter}.csv`, r.csv, "text/csv;charset=utf-8");
      setMsg(`✓ Change log · ${r.rows} change${r.rows === 1 ? "" : "s"} for ${r.periodLabel}`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusyKey(null); }
  }

  // Year picker spans current ±2 years.
  const years: number[] = [];
  for (let y = initial.year - 2; y <= initial.year; y += 1) years.push(y);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Compliance · CMRA quarterly report
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>USPS CMRA quarterly report</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Master customer roster + change log for any quarter. Hand the CSVs to your USPS contact (or your accountant) — meets the 1583 quarterly reporting requirement for CMRAs.
        </p>
      </div>

      {msg && (
        <div className="rounded-xl px-3 py-2 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      <div className="rounded-2xl bg-white border p-4 space-y-3" style={{ borderColor: "#e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Quarter
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((q) => (
              <button key={q} type="button" onClick={() => setQuarter(q)}
                className="px-3 py-2 rounded-lg text-[12px] font-black"
                style={{
                  background: quarter === q ? NOHO_BLUE : "white",
                  color: quarter === q ? "white" : NOHO_INK,
                  border: `1px solid ${quarter === q ? NOHO_BLUE : "#e8e5e0"}`,
                }}>
                Q{q}
              </button>
            ))}
          </div>
          {summary && (
            <span className="text-[11px] font-mono ml-2" style={{ color: "rgba(45,16,15,0.55)" }}>
              {summary.periodStartIso} → {summary.periodEndIso}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Active customers" value={summary?.totalActive ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Form 1583 on file" value={summary?.withForm1583 ?? 0} accent="#15803d" />
        <Tile label="Missing Form 1583" value={summary?.missingForm1583 ?? 0} accent={(summary?.missingForm1583 ?? 0) > 0 ? "#991b1b" : "#15803d"} />
        <Tile label="KYC approved" value={summary?.kycApproved ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Personal boxes" value={summary?.personalBoxes ?? 0} accent={NOHO_INK} />
        <Tile label="Business boxes" value={summary?.businessBoxes ?? 0} accent={NOHO_INK} />
        <Tile label="KYC pending" value={summary?.kycPending ?? 0} accent={(summary?.kycPending ?? 0) > 0 ? "#92400e" : "#15803d"} />
      </div>

      <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Changes this quarter
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          <ChangeChip label="Added" value={summary?.changes.added ?? 0} accent="#15803d" />
          <ChangeChip label="Deactivated" value={summary?.changes.deactivated ?? 0} accent="#991b1b" />
          <ChangeChip label="Form 1583 re-up" value={summary?.changes.form1583Uploaded ?? 0} accent={NOHO_BLUE_DEEP} />
          <ChangeChip label="ID renewed" value={summary?.changes.idRenewed ?? 0} accent={NOHO_BLUE_DEEP} />
          <ChangeChip label="ID expired" value={summary?.changes.idExpiredInQuarter ?? 0} accent="#92400e" />
          <ChangeChip label="Key replaced" value={summary?.changes.keyReplaced ?? 0} accent={NOHO_INK} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Roster export</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: NOHO_INK }}>
            One row per active customer at quarter-end. Contains suite, name, plan, KYC status, ID expiry — everything USPS asks for in the 1583 packet.
          </p>
          <button type="button" onClick={downloadRoster} disabled={busyKey !== null || !summary}
            className="mt-2.5 w-full py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
            {busyKey === "roster" ? "Building…" : `↓ Download ${year}-Q${quarter} roster CSV`}
          </button>
        </div>
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Change log export</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: NOHO_INK }}>
            Every CMRA-relevant event during the quarter: signups, deactivations, Form 1583 re-uploads, ID renewals, ID expirations, key replacements.
          </p>
          <button type="button" onClick={downloadChanges} disabled={busyKey !== null || !summary}
            className="mt-2.5 w-full py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, #92400e, #7c2d12)` }}>
            {busyKey === "changes" ? "Building…" : `↓ Download ${year}-Q${quarter} changes CSV`}
          </button>
        </div>
      </div>

      <p className="text-[10.5px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
        Both exports are audit-logged with row counts and the exact quarter range. Per-customer quarterly statements (one PDF/print per customer) live under the existing "Quarterly" admin tab.
      </p>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #ECEEF1" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#7A8290" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function ChangeChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5" style={{ background: "rgba(45,16,15,0.04)", border: "1px solid #e8e5e0" }}>
      <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>{label}</p>
      <p className="text-base font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
