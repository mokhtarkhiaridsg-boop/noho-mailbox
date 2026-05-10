"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getBillingOverview,
  applyLateFee,
  runAutoRenewal,
  sendExpiryWarnings,
  runLateFeesBatch,
  setAutoRenewal,
} from "@/app/actions/billing";
import AdminInvoiceBuilder from "./AdminInvoiceBuilder";

type BillingCustomer = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  planDueDate: string | null;
  planAutoRenew: boolean | null;
  walletBalanceCents: number;
  status: string;
};

type Overview = {
  overdue: BillingCustomer[];
  warning: BillingCustomer[];
  upToDate: BillingCustomer[];
};

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const NOHO_CREAM = "#EBF2FF";
const NOHO_AMBER = "#F5A623";

// Shared formal hairline tokens (mirrors AdminCashRegister / AdminMailPanel).
const T = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  accent: NOHO_INK,
  blue: NOHO_BLUE,
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysUntilDue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

function CustomerCard({
  c,
  bucket,
  onAction,
}: {
  c: BillingCustomer;
  bucket: "overdue" | "warning" | "uptodate";
  onAction: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [autoRenew, setAutoRenewState] = useState(c.planAutoRenew ?? false);
  const days = c.planDueDate ? daysUntilDue(c.planDueDate) : null;

  // One bucket dot color — the row itself stays neutral hairline.
  const bucketDot =
    bucket === "overdue" ? T.danger : bucket === "warning" ? T.warning : T.success;

  function doAction(label: string, fn: () => Promise<{ success?: boolean; error?: string; [k: string]: unknown }>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) setMsg(`✗ ${res.error}`);
      else {
        setMsg(`✓ ${label}`);
        onAction();
      }
    });
  }

  function toggleAutoRenew(enabled: boolean) {
    setAutoRenewState(enabled);
    startTransition(async () => {
      await setAutoRenewal(c.id, enabled);
      onAction();
    });
  }

  return (
    <div
      className="rounded-md p-3 transition-colors"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
      }}
    >
      <div className="flex items-start gap-3">
        {/* Monogram avatar — neutral surface, no rainbow gradient. */}
        <div
          className="w-10 h-10 shrink-0 rounded flex items-center justify-center font-bold text-[12px] relative"
          style={{
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            color: T.ink,
          }}
        >
          {initials(c.name)}
          {/* Bucket dot on top-right corner. */}
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{
              background: bucketDot,
              border: `1.5px solid ${T.surface}`,
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p
                className="font-bold text-[13px] truncate"
                style={{ color: T.ink }}
              >
                {c.name}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: T.inkFaint }}
              >
                {c.email}
              </p>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-6 rounded inline-flex items-center gap-1.5 shrink-0"
              style={{
                background: T.surfaceAlt,
                color: T.inkSoft,
                border: `1px solid ${T.border}`,
              }}
            >
              {c.plan ?? "No plan"}
            </span>
          </div>

          {/* Due-date timeline */}
          {c.planDueDate && days !== null && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.10em]"
                  style={{ color: bucketDot, ...TAB_NUM }}
                >
                  {dueLabel(days)}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: T.inkFaint, ...TAB_NUM }}
                >
                  {c.planDueDate}
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: T.surfaceAlt }}
              >
                {(() => {
                  const minDays = -10;
                  const maxDays = 30;
                  const pct = Math.max(
                    0,
                    Math.min(
                      100,
                      ((days - minDays) / (maxDays - minDays)) * 100,
                    ),
                  );
                  return (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: bucketDot,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Wallet + auto-renew row */}
          <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-6 rounded inline-flex items-center gap-1.5"
                style={{
                  background: T.surfaceAlt,
                  color: c.walletBalanceCents > 0 ? T.success : T.inkFaint,
                  border: `1px solid ${T.border}`,
                  ...TAB_NUM,
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="12" height="9" rx="1" />
                  <path d="M2 7 L14 7" />
                </svg>
                {fmt(c.walletBalanceCents)}
              </span>
              <button
                onClick={() => toggleAutoRenew(!autoRenew)}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-6 rounded transition-colors"
                style={{
                  background: T.surface,
                  color: autoRenew ? T.blue : T.inkFaint,
                  border: `1px solid ${T.border}`,
                }}
                aria-pressed={autoRenew}
              >
                <span
                  aria-hidden="true"
                  className="relative w-5 h-2.5 rounded-full transition-colors"
                  style={{ background: autoRenew ? T.blue : T.border }}
                >
                  <span
                    className="absolute top-0.5 w-1.5 h-1.5 rounded-full transition-transform"
                    style={{
                      background: T.surface,
                      transform: autoRenew
                        ? "translateX(11px)"
                        : "translateX(2px)",
                    }}
                  />
                </span>
                Auto {autoRenew ? "on" : "off"}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={pending}
                onClick={() =>
                  doAction("Late fee applied", () => applyLateFee(c.id))
                }
                className="text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-6 rounded disabled:opacity-40 transition-colors"
                style={{
                  background: T.surface,
                  color: T.danger,
                  border: `1px solid ${T.border}`,
                }}
              >
                Late fee
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  doAction("Auto-renewed", () => runAutoRenewal(c.id))
                }
                className="text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-6 rounded disabled:opacity-40 transition-colors"
                style={{
                  background: T.accent,
                  color: "#FFFFFF",
                  border: `1px solid ${T.accent}`,
                }}
              >
                Renew
              </button>
            </div>
          </div>

          {msg && (
            <p
              className="text-[10px] mt-2 font-bold"
              style={{
                color: msg.startsWith("✓") ? T.success : T.danger,
              }}
            >
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBillingPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchPending, startBatch] = useTransition();
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overdue" | "warning" | "uptodate">("overdue");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [invoiceBuilderOpen, setInvoiceBuilderOpen] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getBillingOverview();
    setOverview(data);
    setLoading(false);
    setLoadedOnce(true);
  }

  useEffect(() => {
    if (!loadedOnce) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runBatch(label: string, fn: () => Promise<{ success?: boolean; notified?: number; feesApplied?: number; errors?: string[] }>) {
    setBatchMsg(null);
    startBatch(async () => {
      const res = await fn();
      if (res.notified !== undefined) setBatchMsg(`✓ ${label}: ${res.notified} notified`);
      else if (res.feesApplied !== undefined) {
        const errStr = res.errors?.length ? ` (${res.errors.length} errors)` : "";
        setBatchMsg(`✓ ${label}: ${res.feesApplied} fees applied${errStr}`);
      } else {
        setBatchMsg(`✓ ${label}`);
      }
      load();
    });
  }

  // Aggregate KPIs
  const totals = useMemo(() => {
    if (!overview) return null;
    const all = [...overview.overdue, ...overview.warning, ...overview.upToDate];
    const totalWalletCents = all.reduce((sum, c) => sum + c.walletBalanceCents, 0);
    const autoRenewOn = all.filter((c) => c.planAutoRenew).length;
    return {
      totalCount: all.length,
      overdueCount: overview.overdue.length,
      warningCount: overview.warning.length,
      healthyCount: overview.upToDate.length,
      totalWalletCents,
      autoRenewOn,
      autoRenewPct: all.length > 0 ? Math.round((autoRenewOn / all.length) * 100) : 0,
    };
  }, [overview]);

  const sections = overview
    ? [
        { key: "overdue" as const, label: "Overdue", count: overview.overdue.length, customers: overview.overdue, color: "#dc2626" },
        { key: "warning" as const, label: "Expiring Soon", count: overview.warning.length, customers: overview.warning, color: NOHO_AMBER },
        { key: "uptodate" as const, label: "Up to Date", count: overview.upToDate.length, customers: overview.upToDate, color: "#22C55E" },
      ]
    : [];
  const activeCustomers = sections.find((s) => s.key === activeSection)?.customers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2
            className="text-2xl font-bold"
            style={{
              color: "#1A1D23",
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
            }}
          >
            Billing
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
            renewals &amp; receivables
          </span>
          <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
            · {overview ? `${overview.overdue.length} overdue · ${overview.warning.length} expiring · ${overview.upToDate.length} up to date` : "loading"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            disabled={batchPending}
            onClick={() => runBatch("Expiry warnings", sendExpiryWarnings)}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-8 rounded-md disabled:opacity-40 transition-colors"
            style={{
              background: T.surface,
              color: T.warning,
              border: `1px solid ${T.border}`,
            }}
          >
            Send expiry warnings
          </button>
          <button
            disabled={batchPending}
            onClick={() => runBatch("Late fees batch", runLateFeesBatch)}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-8 rounded-md disabled:opacity-40 transition-colors"
            style={{
              background: T.surface,
              color: T.danger,
              border: `1px solid ${T.border}`,
            }}
          >
            Run late-fees batch
          </button>
          <button
            onClick={() => setInvoiceBuilderOpen(true)}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-8 rounded-md transition-colors"
            style={{
              background: T.accent,
              color: "#FFFFFF",
              border: `1px solid ${T.accent}`,
            }}
          >
            + New invoice
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-8 rounded-md disabled:opacity-40 transition-colors"
            style={{
              background: T.surface,
              color: T.blue,
              border: `1px solid ${T.border}`,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Invoice Builder modal */}
      {invoiceBuilderOpen && (
        <AdminInvoiceBuilder
          onClose={() => setInvoiceBuilderOpen(false)}
          onSaved={(_id, num) => setBatchMsg(`✓ Invoice ${num} saved`)}
        />
      )}

      {batchMsg && (
        <div
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: batchMsg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)",
            color: batchMsg.startsWith("✓") ? "#22C55E" : "#dc2626",
            border: `1px solid ${batchMsg.startsWith("✓") ? "rgba(22,163,74,0.18)" : "rgba(220,38,38,0.18)"}`,
          }}
        >
          {batchMsg}
        </div>
      )}

      {/* KPI tiles */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiTile
            label="Wallet held"
            value={fmt(totals.totalWalletCents)}
            sub={`${totals.totalCount} customers`}
            accent
          />
          <KpiTile
            label="Overdue"
            value={String(totals.overdueCount)}
            sub={totals.overdueCount > 0 ? "Action needed" : "All clear"}
            danger={totals.overdueCount > 0}
          />
          <KpiTile
            label="Expiring 14d"
            value={String(totals.warningCount)}
            sub="Next renewal cycle"
          />
          <KpiTile
            label="Up to date"
            value={String(totals.healthyCount)}
            sub="Healthy accounts"
          />
          <KpiTile
            label="Auto-renew"
            value={`${totals.autoRenewPct}%`}
            sub={`${totals.autoRenewOn} of ${totals.totalCount}`}
          />
        </div>
      )}

      {/* Health distribution bar — solid colors, hairline border, no shadow */}
      {totals && totals.totalCount > 0 && (
        <div
          className="rounded-md p-4"
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: T.ink }}
            >
              Account health
            </h3>
            <p
              className="text-[10px]"
              style={{ color: T.inkFaint, ...TAB_NUM }}
            >
              {totals.totalCount} active
            </p>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden flex"
            style={{ background: T.surfaceAlt }}
          >
            {[
              {
                count: totals.overdueCount,
                color: T.danger,
                label: "Overdue",
              },
              {
                count: totals.warningCount,
                color: T.warning,
                label: "Expiring",
              },
              {
                count: totals.healthyCount,
                color: T.success,
                label: "Up to date",
              },
            ].map((seg) => {
              const pct = (seg.count / totals.totalCount) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={seg.label}
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: seg.color }}
                  title={`${seg.label}: ${seg.count}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2.5 text-[10px] font-bold flex-wrap">
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: T.inkSoft, ...TAB_NUM }}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: T.danger }}
              />
              Overdue {totals.overdueCount}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: T.inkSoft, ...TAB_NUM }}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: T.warning }}
              />
              Expiring {totals.warningCount}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: T.inkSoft, ...TAB_NUM }}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: T.success }}
              />
              Up to date {totals.healthyCount}
            </span>
          </div>
        </div>
      )}

      {/* Section selector — minimal segmented control. */}
      {overview && (
        <div
          className="inline-flex p-0.5 rounded-md"
          style={{ background: "#F4F5F7", border: "1px solid #ECEEF1" }}
        >
          {sections.map((s) => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className="px-3 h-8 rounded text-[11px] font-bold uppercase tracking-[0.10em] inline-flex items-center gap-1.5 transition-colors"
                style={{
                  background: active ? "#FFFFFF" : "transparent",
                  color: active ? "#1A1D23" : "#3B4252",
                  boxShadow: active ? "0 1px 0 rgba(45,16,15,0.06)" : "none",
                }}
              >
                {s.label}
                <span
                  className="px-1 h-4 rounded inline-flex items-center text-[10px]"
                  style={{
                    background: active ? "#F4F5F7" : "transparent",
                    color: active ? "#1A1D23" : "#7A8290",
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Customer cards */}
      {loading && (
        <div className="text-center py-12 text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
          Loading billing data…
        </div>
      )}

      {overview && !loading && (
        <div className="space-y-3">
          {activeCustomers.length === 0 ? (
            <div
              className="rounded-md bg-white p-8 text-center"
              style={{ border: "1px solid #ECEEF1" }}
            >
              <p className="text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
                No customers in this category.
              </p>
            </div>
          ) : (
            activeCustomers.map((c) => (
              <CustomerCard key={c.id} c={c} bucket={activeSection} onAction={load} />
            ))
          )}
        </div>
      )}

      {/* Info card */}
      <div
        className="rounded-md p-4 text-xs space-y-1.5"
        style={{
          background: "rgba(51,116,133,0.04)",
          border: "1px solid rgba(51,116,133,0.30)",
        }}
      >
        <p className="font-black uppercase tracking-[0.16em]" style={{ color: NOHO_BLUE_DEEP }}>
          How billing works
        </p>
        <ul className="list-disc pl-4 space-y-1" style={{ color: "rgba(45,16,15,0.6)" }}>
          <li><strong style={{ color: NOHO_INK }}>Grace period:</strong> 10 days past due before late fee is applied</li>
          <li><strong style={{ color: NOHO_INK }}>Late fee:</strong> $15 deducted from wallet, account status set to Expired</li>
          <li><strong style={{ color: NOHO_INK }}>Auto-renewal:</strong> Charges wallet on due date, extends by plan term</li>
          <li><strong style={{ color: NOHO_INK }}>Expiry warnings:</strong> Sent at 14, 7, and 3 days before due date</li>
        </ul>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  // Polished: hairline borders, single dark accent for the primary tile,
  // muted danger outline (no full red gradient). Tabular monospace numerals.
  const isAccent = accent && !danger;
  const isDanger = danger;
  return (
    <div
      className="p-4 rounded-md"
      style={{
        background: isAccent ? "#1A1D23" : "#FFFFFF",
        border: `1px solid ${isAccent ? "#1A1D23" : isDanger ? "#EF4444" : "#ECEEF1"}`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{
          color: isAccent
            ? "rgba(255,255,255,0.65)"
            : isDanger
            ? "#EF4444"
            : "#7A8290",
        }}
      >
        {label}
      </p>
      <p
        className="text-[28px] font-bold leading-none mt-2"
        style={{
          color: isAccent ? "#FFFFFF" : "#1A1D23",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: "'tnum' 1",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[11px] mt-2"
          style={{
            color: isAccent
              ? "rgba(255,255,255,0.6)"
              : isDanger
              ? "#7F1D1D"
              : "#3B4252",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
