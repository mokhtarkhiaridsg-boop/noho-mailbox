"use client";

/**
 * iter-191 — Bulk renewal sweep admin panel (Tier 13 #100).
 */

import { useEffect, useState, useTransition } from "react";
import {
  previewBulkRenewal,
  runBulkRenewal,
  type BulkRenewalPreview,
  type BulkRenewalRunResult,
} from "@/app/actions/bulkRenewal";

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

export default function AdminBulkRenewalPanel() {
  const [windowDays, setWindowDays] = useState(14);
  const [preview, setPreview] = useState<BulkRenewalPreview | null>(null);
  const [result, setResult] = useState<BulkRenewalRunResult | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    startTransition(async () => {
      try { setPreview(await previewBulkRenewal({ windowDays })); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [windowDays]);

  function onRun() {
    if (!preview || preview.willSucceed === 0) {
      setError("No candidates would succeed. Refresh preview or pick a wider window.");
      return;
    }
    if (!confirm(`Charge ${preview.willSucceed} member${preview.willSucceed === 1 ? "" : "s"} a total of $${(preview.totalChargeIfRunCents / 100).toFixed(2)} from their wallets right now? This is a real charge.`)) return;
    setError(null); setResult(null);
    startTransition(async () => {
      try { setResult(await runBulkRenewal({ windowDays })); refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
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
          Bulk Renewal
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
          sweep them home
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {preview ? `${preview.willSucceed} ready` : "loading"}
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        Charge every auto-renewing member due in the next N days right now. Preview shows who would succeed + who&apos;s blocked (insufficient wallet, no plan). Each successful charge writes a real MailboxRenewal + WalletTransaction + audit row.
      </p>

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: T.inkSoft }}>
            Window:
            {[7, 14, 30, 60].map((d) => (
              <button key={d} type="button" onClick={() => setWindowDays(d)} className="text-[11px] font-bold px-2 py-1 rounded-md" style={{
                background: windowDays === d ? T.blue : "white",
                color: windowDays === d ? "white" : T.inkSoft,
                border: `1px solid ${windowDays === d ? T.blue : T.border}`,
              }}>
                {d}d
              </button>
            ))}
          </label>
          <button type="button" onClick={refresh} disabled={busy} className="ml-auto text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
            ↻ Refresh
          </button>
        </div>

        {preview && (
          <>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Tile label="Candidates" value={preview.totalCandidates} accent={T.blueDeep} />
              <Tile label="Will succeed" value={preview.willSucceed} accent={T.success} />
              <Tile label="Wallet short" value={preview.insufficientWallet} accent={T.warning} />
              <Tile label="Total charge" value={`$${(preview.totalChargeIfRunCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent={T.ink} />
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button type="button" onClick={onRun} disabled={busy || preview.willSucceed === 0} className="text-[12.5px] font-black px-4 py-2.5 rounded-lg text-white disabled:opacity-50" style={{ background: preview.willSucceed > 0 ? "linear-gradient(135deg, #22C55E, #15803d)" : T.inkFaint }}>
                {busy ? "Running…" : preview.willSucceed > 0 ? `🔁 Charge ${preview.willSucceed} now · $${(preview.totalChargeIfRunCents / 100).toFixed(2)}` : "Nothing to charge"}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {/* Run result (post-fire) */}
      {result && (
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `2px solid ${result.failed === 0 ? T.success : T.warning}` }}>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: result.failed === 0 ? T.success : T.warning }}>
              Sweep result · {new Date(result.ranAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            <span className="text-[10.5px]" style={{ color: T.inkSoft }}>· {result.windowDays}d window · ${((result.totalChargedCents) / 100).toFixed(2)} total</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Tile label="Attempted" value={result.attempted} accent={T.blueDeep} />
            <Tile label="Succeeded" value={result.succeeded} accent={T.success} />
            <Tile label="Failed" value={result.failed} accent={result.failed > 0 ? T.danger : T.inkFaint} />
          </div>
          <ul className="space-y-1 max-h-[300px] overflow-y-auto">
            {result.rows.map((r) => (
              <li key={r.userId} className="text-[11px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: r.ok ? T.success : T.danger, fontWeight: 900, minWidth: 14 }}>{r.ok ? "✓" : "✕"}</span>
                <span className="font-bold" style={{ color: T.ink }}>{r.userName}</span>
                {r.ok ? (
                  <>
                    <span className="ml-auto tabular-nums" style={{ color: T.success }}>${((r.chargedCents ?? 0) / 100).toFixed(2)}</span>
                    {r.newDueDate && <span style={{ color: T.inkFaint }}>→ {r.newDueDate}</span>}
                  </>
                ) : (
                  <span className="ml-auto" style={{ color: T.danger }}>{r.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview candidate list (pre-fire) */}
      {preview && preview.candidates.length > 0 && !result && (
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Candidate preview</p>
          <ul className="space-y-1 max-h-[420px] overflow-y-auto">
            {preview.candidates.map((c) => (
              <li key={c.userId} className="text-[11px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: c.willSucceed ? T.success : T.warning, fontWeight: 900 }}>{c.willSucceed ? "✓" : "•"}</span>
                <span className="font-mono tabular-nums" style={{ color: T.blueDeep, minWidth: 70 }}>{c.planDueDate}</span>
                <span className="font-bold truncate flex-1" style={{ color: T.ink }}>{c.userName}</span>
                {c.suiteNumber && <span className="font-mono" style={{ color: T.inkFaint }}>#{c.suiteNumber}</span>}
                <span className="text-[10px]" style={{ color: T.inkSoft }}>{c.plan}·{c.planTerm ?? "1"}mo</span>
                <span className="font-black tabular-nums" style={{ color: T.ink, minWidth: 60, textAlign: "right" }}>${(c.chargeCents / 100).toFixed(2)}</span>
                {c.blocker && <span className="text-[9.5px] font-bold" style={{ color: T.warning }}>{c.blocker}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
