"use client";

// iter-132 — Backup verification + DB health admin panel.

import { useEffect, useState, useTransition } from "react";
import {
  runBackupHealthCheck,
  listBackupHealthHistory,
  type BackupHealthReport,
  type CheckResult,
} from "@/app/actions/backupVerification";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

const KIND_COLOR: Record<CheckResult["kind"], { bg: string; fg: string; emoji: string }> = {
  ok:   { bg: "rgba(22,163,74,0.10)", fg: "#15803d", emoji: "✓" },
  warn: { bg: "rgba(245,166,35,0.14)", fg: "#92400e", emoji: "⚠️" },
  fail: { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", emoji: "✗" },
};

const OVERALL_COLOR: Record<BackupHealthReport["overall"], { bg: string; fg: string; label: string }> = {
  ok:   { bg: "linear-gradient(135deg,#16A34A,#15803d)", fg: "white", label: "All systems healthy" },
  warn: { bg: "linear-gradient(135deg,#F5A623,#92400e)", fg: "white", label: "Warnings detected" },
  fail: { bg: "linear-gradient(135deg,#E70013,#991b1b)", fg: "white", label: "Critical issues" },
};

export default function AdminBackupHealthPanel() {
  const [report, setReport] = useState<BackupHealthReport | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof listBackupHealthHistory>>>([]);
  const [pending, startTransition] = useTransition();

  function refreshHistory() {
    void listBackupHealthHistory().then(setHistory).catch(() => setHistory([]));
  }
  function runCheck() {
    startTransition(async () => {
      try {
        const r = await runBackupHealthCheck();
        setReport(r);
        refreshHistory();
      } catch (e) {
        // Construct a synthetic failure report so admin sees what broke.
        setReport({
          generatedAtIso: new Date().toISOString(),
          overall: "fail",
          checks: {
            connectivity: { kind: "fail", durationMs: 0, detail: e instanceof Error ? e.message : String(e) },
            writeProbe: { kind: "fail", durationMs: 0, detail: "skipped — connectivity failed" },
            schemaIntegrity: { kind: "fail", durationMs: 0, detail: "skipped" },
            recency: { kind: "fail", durationMs: 0, detail: "skipped" },
            envConfig: { kind: "fail", durationMs: 0, detail: "skipped" },
          },
          recency: {
            newestUserAtIso: null, newestMailItemAtIso: null,
            newestAuditAtIso: null, newestEmailLogAtIso: null,
            newestPaymentAtIso: null, newestWebhookDeliveryAtIso: null,
          },
          rowCounts: {
            users: 0, mailItems: 0, deliveryOrders: 0, notaryBookings: 0,
            auditLogs: 0, emailLogs: 0, payments: 0, invoices: 0,
            walletTransactions: 0, posSales: 0, mailRequests: 0, mailboxRenewals: 0,
          },
          envFlags: {
            AUTH_URL: false, AUTH_SECRET: false, DATABASE_URL: false,
            RESEND_API_KEY: false, EMAIL_FROM: false, SHIPPO_API_KEY: false,
            SQUARE_ACCESS_TOKEN: false, CRON_SECRET: false, INBOUND_EMAIL_SECRET: false,
            ANTHROPIC_API_KEY: false, BLOB_READ_WRITE_TOKEN: false,
          },
        });
      }
    });
  }

  useEffect(() => {
    runCheck();
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          System · Backup health
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Backup verification + DB health</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          5-check probe: connectivity, write round-trip, schema integrity, write-recency, env-var presence. Plus row counts across every critical table. Re-runs every page open + on demand. Each run is audit-logged.
        </p>
      </div>

      {/* Headline + run-now */}
      {report && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: OVERALL_COLOR[report.overall].bg, color: OVERALL_COLOR[report.overall].fg }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
              Overall status
            </p>
            <p className="text-xl font-black tracking-tight">
              {OVERALL_COLOR[report.overall].label}
            </p>
            <p className="text-[10.5px] opacity-80 mt-0.5">
              Last run: {new Date(report.generatedAtIso).toLocaleString()}
            </p>
          </div>
          <button type="button" onClick={runCheck} disabled={pending}
            className="px-4 py-2 rounded-xl font-black text-[12px] disabled:opacity-50"
            style={{ background: "white", color: NOHO_INK }}>
            {pending ? "Running…" : "Re-run check"}
          </button>
        </div>
      )}

      {/* 5 checks */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <CheckTile name="Connectivity" check={report.checks.connectivity} />
          <CheckTile name="Write probe" check={report.checks.writeProbe} />
          <CheckTile name="Schema integrity" check={report.checks.schemaIntegrity} />
          <CheckTile name="Write recency" check={report.checks.recency} />
          <CheckTile name="Env config" check={report.checks.envConfig} />
        </div>
      )}

      {/* Row counts */}
      {report && (
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(45,16,15,0.55)" }}>
            Row counts · {Object.values(report.rowCounts).reduce((a, b) => a + b, 0).toLocaleString()} total rows
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <Count label="Users" value={report.rowCounts.users} />
            <Count label="Mail items" value={report.rowCounts.mailItems} />
            <Count label="Audit logs" value={report.rowCounts.auditLogs} />
            <Count label="Email logs" value={report.rowCounts.emailLogs} />
            <Count label="Payments" value={report.rowCounts.payments} />
            <Count label="Invoices" value={report.rowCounts.invoices} />
            <Count label="Wallet txns" value={report.rowCounts.walletTransactions} />
            <Count label="POS sales" value={report.rowCounts.posSales} />
            <Count label="Mail requests" value={report.rowCounts.mailRequests} />
            <Count label="Renewals" value={report.rowCounts.mailboxRenewals} />
            <Count label="Deliveries" value={report.rowCounts.deliveryOrders} />
            <Count label="Notary" value={report.rowCounts.notaryBookings} />
          </div>
        </div>
      )}

      {/* Recency timeline */}
      {report && (
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(45,16,15,0.55)" }}>
            Last write per table
          </p>
          <ul className="space-y-1">
            <Recency label="Newest user signup" iso={report.recency.newestUserAtIso} />
            <Recency label="Newest mail intake" iso={report.recency.newestMailItemAtIso} />
            <Recency label="Newest audit row" iso={report.recency.newestAuditAtIso} stale={7} />
            <Recency label="Newest email sent" iso={report.recency.newestEmailLogAtIso} stale={14} />
            <Recency label="Newest Square payment sync" iso={report.recency.newestPaymentAtIso} stale={30} />
            <Recency label="Newest webhook delivery" iso={report.recency.newestWebhookDeliveryAtIso} />
          </ul>
        </div>
      )}

      {/* Env config matrix */}
      {report && (
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(45,16,15,0.55)" }}>
            Environment · presence only (values never exposed)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {Object.entries(report.envFlags).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                style={{ background: v ? "rgba(22,163,74,0.08)" : "rgba(231,0,19,0.06)", border: `1px solid ${v ? "rgba(22,163,74,0.30)" : "rgba(231,0,19,0.20)"}` }}>
                <span style={{ color: v ? "#15803d" : "#991b1b", fontWeight: 800 }}>{v ? "✓" : "✗"}</span>
                <span className="text-[10.5px] font-mono" style={{ color: NOHO_INK }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(45,16,15,0.55)" }}>
            Last 10 runs
          </p>
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 text-[11.5px]"
                style={{ color: NOHO_INK }}>
                <span className="font-mono">{new Date(h.ranAtIso).toLocaleString()}</span>
                <span className="font-black px-1.5 py-0.5 rounded uppercase tracking-wider text-[9.5px]"
                  style={{
                    background: h.overall === "ok" ? "rgba(22,163,74,0.14)" : h.overall === "warn" ? "rgba(245,166,35,0.16)" : "rgba(231,0,19,0.10)",
                    color: h.overall === "ok" ? "#15803d" : h.overall === "warn" ? "#92400e" : "#991b1b",
                  }}>
                  {h.overall}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CheckTile({ name, check }: { name: string; check: CheckResult }) {
  const c = KIND_COLOR[check.kind];
  return (
    <div className="rounded-md bg-white p-3" style={{ border: `1px solid ${check.kind === "ok" ? "#e8e5e0" : check.kind === "warn" ? "rgba(245,166,35,0.40)" : "rgba(231,0,19,0.40)"}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[14px] font-black" style={{ color: c.fg }}>{c.emoji}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{name}</p>
      </div>
      <p className="text-[14px] font-black tabular-nums" style={{ color: c.fg, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
        {check.kind.toUpperCase()}
      </p>
      <p className="text-[10px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
        {check.durationMs > 0 ? `${check.durationMs}ms · ` : ""}{check.detail ?? "—"}
      </p>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md p-2.5" style={{ background: "#fafaf7", border: "1px solid #e8e5e0" }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-lg font-black tabular-nums" style={{ color: NOHO_BLUE_DEEP, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Recency({ label, iso, stale }: { label: string; iso: string | null; stale?: number }) {
  if (!iso) {
    return (
      <li className="flex items-center justify-between gap-2 text-[11.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
        <span>{label}</span>
        <span className="italic">— never written</span>
      </li>
    );
  }
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / (24 * 60 * 60 * 1000);
  const isStale = stale != null && days > stale;
  return (
    <li className="flex items-center justify-between gap-2 text-[11.5px]" style={{ color: NOHO_INK }}>
      <span>{label}</span>
      <span className="font-mono tabular-nums" style={{ color: isStale ? "#92400e" : "rgba(45,16,15,0.55)" }}>
        {d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        {isStale && ` · ${Math.round(days)}d stale`}
      </span>
    </li>
  );
}
