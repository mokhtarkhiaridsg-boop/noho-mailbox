"use client";

// iter-106 — Bookkeeping export admin panel.
//
// Two halves: left = date range + summary preview (counts + gross),
// right = download buttons per format. Generates each export on-demand
// (server action returns the body, client wraps in a Blob and triggers
// download). All exports audit-logged so admin can prove what was
// extracted on tax day.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getBookkeepingSummary,
  exportPaymentsCsv,
  exportPosSalesCsv,
  exportWalletTransactionsCsv,
  exportInvoicesCsv,
  exportRenewalsCsv,
  exportQuickbooksIif,
  type ExportSummary,
} from "@/app/actions/bookkeepingExport";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

// Default = last calendar month (full).
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    from: isoDate(startOfLastMonth),
    to: isoDate(startOfThisMonth),
  };
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function AdminBookkeepingPanel() {
  const initial = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    startTransition(async () => {
      try {
        const s = await getBookkeepingSummary({ from, to });
        setSummary(s);
      } catch (e) {
        setSummary(null);
        setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  function namedFile(prefix: string, ext: string): string {
    const f = from.replace(/-/g, "");
    const t = to.replace(/-/g, "");
    return `noho-${prefix}-${f}-${t}.${ext}`;
  }

  async function downloadCsv(key: string, fn: (i: { from: string; to: string }) => Promise<{ csv: string; rows: number }>, prefix: string) {
    setBusyKey(key); setMsg(null);
    try {
      const r = await fn({ from, to });
      downloadFile(namedFile(prefix, "csv"), r.csv, "text/csv;charset=utf-8");
      setMsg(`✓ Downloaded ${r.rows} ${prefix} row${r.rows === 1 ? "" : "s"}`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyKey(null);
    }
  }

  async function downloadIif() {
    setBusyKey("iif"); setMsg(null);
    try {
      const r = await exportQuickbooksIif({ from, to });
      downloadFile(namedFile("quickbooks", "iif"), r.iif, "text/plain;charset=utf-8");
      setMsg(`✓ Downloaded QuickBooks IIF — ${r.rows} transaction${r.rows === 1 ? "" : "s"}`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyKey(null);
    }
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
          Bookkeeping
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
          ledgers &amp; exports
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {from} → {to}
        </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* Date range + summary */}
        <div className="rounded-2xl bg-white border p-4 space-y-3" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Date range (UTC, half-open)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>To (exclusive)</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RangeChip label="Last month" onClick={() => { const d = defaultRange(); setFrom(d.from); setTo(d.to); }} />
            <RangeChip label="This month" onClick={() => {
              const now = new Date();
              setFrom(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
              setTo(isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)));
            }} />
            <RangeChip label="YTD" onClick={() => {
              const now = new Date();
              setFrom(isoDate(new Date(now.getFullYear(), 0, 1)));
              setTo(isoDate(new Date(now.getFullYear() + (now.getMonth() === 11 ? 1 : 0), now.getMonth() === 11 ? 0 : now.getMonth() + 1, 1)));
            }} />
            <RangeChip label="Last 30d" onClick={() => {
              const t = new Date();
              const f = new Date(t.getTime() - 30 * 24 * 60 * 60 * 1000);
              setFrom(isoDate(f)); setTo(isoDate(t));
            }} />
          </div>

          <div className="rounded-xl border p-3 mt-2" style={{ borderColor: "#e8e5e0", background: "#fafaf7" }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Summary {pending && "· loading…"}
            </p>
            {!summary ? (
              <p className="text-[12px] italic mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>—</p>
            ) : (
              <ul className="text-[12px] mt-1 space-y-0.5" style={{ color: NOHO_INK }}>
                <li className="flex justify-between"><span>Square payments</span><span className="font-black tabular-nums">{summary.payments}</span></li>
                <li className="flex justify-between"><span>POS sales (paid)</span><span className="font-black tabular-nums">{summary.posSales}</span></li>
                <li className="flex justify-between"><span>Invoices (paid)</span><span className="font-black tabular-nums">{summary.invoices}</span></li>
                <li className="flex justify-between"><span>Mailbox renewals</span><span className="font-black tabular-nums">{summary.renewals}</span></li>
                <li className="flex justify-between"><span>Wallet transactions</span><span className="font-black tabular-nums">{summary.walletTransactions}</span></li>
                <li className="flex justify-between"><span>External dropoffs</span><span className="font-black tabular-nums">{summary.dropoffs}</span></li>
                <li className="flex justify-between mt-2 pt-2 border-t" style={{ borderColor: "#e8e5e0" }}>
                  <span className="font-black">Gross income (sum of all)</span>
                  <span className="font-black tabular-nums" style={{ color: "#15803d" }}>{fmt(summary.totalGrossCents)}</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Download buttons */}
        <div className="rounded-2xl bg-white border p-4 space-y-3" style={{ borderColor: "#e8e5e0" }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              QuickBooks Desktop / SMB accounting
            </p>
            <button type="button" onClick={downloadIif} disabled={busyKey !== null || !summary}
              className="mt-1.5 w-full py-3 rounded-lg text-white font-black disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
              {busyKey === "iif" ? "Building IIF…" : "Download QuickBooks IIF"}
            </button>
            <p className="text-[10.5px] mt-1 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
              One file with POS + invoices + renewals as DEPOSIT transactions, posted into a single income account.
            </p>
          </div>

          <div className="border-t pt-3" style={{ borderColor: "#e8e5e0" }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
              Per-table CSV (Excel / Google Sheets)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CsvBtn label="Square payments"      onClick={() => downloadCsv("payments",  exportPaymentsCsv,           "payments")} busy={busyKey === "payments"} />
              <CsvBtn label="POS sales"            onClick={() => downloadCsv("pos",       exportPosSalesCsv,           "pos")} busy={busyKey === "pos"} />
              <CsvBtn label="Invoices (paid)"      onClick={() => downloadCsv("invoices",  exportInvoicesCsv,           "invoices")} busy={busyKey === "invoices"} />
              <CsvBtn label="Mailbox renewals"     onClick={() => downloadCsv("renewals",  exportRenewalsCsv,           "renewals")} busy={busyKey === "renewals"} />
              <CsvBtn label="Wallet transactions"  onClick={() => downloadCsv("wallet",    exportWalletTransactionsCsv, "wallet")} busy={busyKey === "wallet"} />
            </div>
          </div>

          <p className="text-[10.5px] mt-2 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            All downloads are audit-logged with row counts + the exact date range. Square payments overlap POS-with-Square sales; CSVs are kept separate so you can reconcile by hand if needed.
          </p>
        </div>
      </div>
    </div>
  );
}

function RangeChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
      style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}>
      {label}
    </button>
  );
}

function CsvBtn({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="px-3 py-2 rounded-lg text-[11.5px] font-bold border disabled:opacity-50"
      style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}>
      {busy ? "…" : `↓ ${label}`}
    </button>
  );
}
