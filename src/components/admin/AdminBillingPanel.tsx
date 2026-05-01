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

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_AMBER = "#F5A623";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function huesFor(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const PAIRS: Array<[string, string]> = [
    [NOHO_BLUE, NOHO_BLUE_DEEP],
    [NOHO_INK, "#1F0807"],
    ["#7C3AED", "#5B21B6"],
    ["#B07030", "#8B5A24"],
    ["#16A34A", "#166534"],
    ["#dc2626", "#991b1b"],
  ];
  const [from, to] = PAIRS[h % PAIRS.length];
  return { from, to };
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
  const { from, to } = huesFor(c.name);
  const days = c.planDueDate ? daysUntilDue(c.planDueDate) : null;

  const bucketAccent = bucket === "overdue" ? "#dc2626" : bucket === "warning" ? NOHO_AMBER : "#16A34A";
  const bucketBg =
    bucket === "overdue"
      ? "rgba(220,38,38,0.06)"
      : bucket === "warning"
      ? "rgba(245,166,35,0.06)"
      : "rgba(22,163,74,0.05)";

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
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: "white",
        border: `1px solid ${bucketAccent}22`,
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 10px rgba(45,16,15,0.04)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Monogram avatar */}
        <div
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-black text-sm"
          style={{
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            color: NOHO_CREAM,
            boxShadow: "0 4px 12px rgba(45,16,15,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
            fontFamily: "var(--font-baloo), sans-serif",
          }}
        >
          {initials(c.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-black text-sm truncate" style={{ color: NOHO_INK }}>
                {c.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: "rgba(45,16,15,0.45)" }}>
                {c.email}
              </p>
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0"
              style={{ background: bucketBg, color: bucketAccent }}
            >
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: bucketAccent }} />
              {c.plan ?? "No plan"}
            </span>
          </div>

          {/* Due-date timeline */}
          {c.planDueDate && days !== null && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: bucketAccent }}>
                  {dueLabel(days)}
                </span>
                <span className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.5)" }}>
                  {c.planDueDate}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(232,229,224,0.6)" }}
              >
                {(() => {
                  // Visualize where they sit in the renewal window. Anchor:
                  // -10d (over grace) → 0 → +30d (next month). Clamp to [0,100].
                  const minDays = -10;
                  const maxDays = 30;
                  const pct = Math.max(0, Math.min(100, ((days - minDays) / (maxDays - minDays)) * 100));
                  return (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          days < 0
                            ? "linear-gradient(90deg, #dc2626, #991b1b)"
                            : days <= 14
                            ? `linear-gradient(90deg, ${NOHO_AMBER}, #B07030)`
                            : `linear-gradient(90deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Wallet + auto-renew row */}
          <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-md inline-flex items-center gap-1.5"
                style={{
                  background: c.walletBalanceCents > 0 ? "rgba(22,163,74,0.10)" : "rgba(45,16,15,0.05)",
                  color: c.walletBalanceCents > 0 ? "#15803d" : "rgba(45,16,15,0.55)",
                }}
              >
                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <rect x="2" y="4" width="12" height="9" rx="1" />
                  <path d="M2 7 L14 7" />
                </svg>
                Wallet {fmt(c.walletBalanceCents)}
              </span>
              <button
                onClick={() => toggleAutoRenew(!autoRenew)}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-md transition-colors"
                style={{
                  background: autoRenew ? "rgba(51,116,133,0.10)" : "rgba(232,229,224,0.6)",
                  color: autoRenew ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.55)",
                }}
                aria-pressed={autoRenew}
              >
                <span
                  aria-hidden="true"
                  className="relative w-6 h-3 rounded-full transition-colors"
                  style={{ background: autoRenew ? NOHO_BLUE : "#d1d5db" }}
                >
                  <span
                    className="absolute top-0.5 w-2 h-2 bg-white rounded-full shadow"
                    style={{ transform: autoRenew ? "translateX(13px)" : "translateX(2px)" }}
                  />
                </span>
                Auto-renew {autoRenew ? "on" : "off"}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={pending}
                onClick={() => doAction("Late fee applied", () => applyLateFee(c.id))}
                className="text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-md disabled:opacity-40"
                style={{ background: "rgba(220,38,38,0.08)", color: "#b91c1c" }}
              >
                Late Fee
              </button>
              <button
                disabled={pending}
                onClick={() => doAction("Auto-renewed", () => runAutoRenewal(c.id))}
                className="text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-md text-white disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
                  boxShadow: `0 2px 8px ${NOHO_BLUE}33`,
                }}
              >
                Renew
              </button>
            </div>
          </div>

          {msg && (
            <p
              className="text-[10px] mt-2 font-bold"
              style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}
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
        { key: "uptodate" as const, label: "Up to Date", count: overview.upToDate.length, customers: overview.upToDate, color: "#16a34a" },
      ]
    : [];
  const activeCustomers = sections.find((s) => s.key === activeSection)?.customers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Billing & Renewals
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            Manage plan payments, late fees, and auto-renewals
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={batchPending}
            onClick={() => runBatch("Expiry warnings", sendExpiryWarnings)}
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-2 rounded-xl border disabled:opacity-40 transition-colors"
            style={{ borderColor: "rgba(245,166,35,0.4)", color: "#92400e", background: "rgba(245,166,35,0.04)" }}
          >
            Send expiry warnings
          </button>
          <button
            disabled={batchPending}
            onClick={() => runBatch("Late fees batch", runLateFeesBatch)}
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-2 rounded-xl border disabled:opacity-40 transition-colors"
            style={{ borderColor: "rgba(220,38,38,0.4)", color: "#b91c1c", background: "rgba(220,38,38,0.04)" }}
          >
            Run late-fees batch
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-2 rounded-xl text-white disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
              boxShadow: `0 2px 10px ${NOHO_BLUE}33`,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {batchMsg && (
        <div
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: batchMsg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)",
            color: batchMsg.startsWith("✓") ? "#16a34a" : "#dc2626",
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

      {/* Health distribution bar */}
      {totals && totals.totalCount > 0 && (
        <div
          className="rounded-2xl bg-white p-5"
          style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_INK }}>
              Account health
            </h3>
            <p className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.4)" }}>
              {totals.totalCount} active customers
            </p>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden flex"
            style={{ background: "rgba(232,229,224,0.6)" }}
          >
            {[
              { count: totals.overdueCount, color: "linear-gradient(90deg, #dc2626, #991b1b)", label: "Overdue" },
              { count: totals.warningCount, color: `linear-gradient(90deg, ${NOHO_AMBER}, #B07030)`, label: "Expiring" },
              { count: totals.healthyCount, color: "linear-gradient(90deg, #16A34A, #166534)", label: "Up to date" },
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
          <div className="flex items-center gap-4 mt-3 text-[10px] font-bold flex-wrap">
            <span className="inline-flex items-center gap-1.5" style={{ color: "#b91c1c" }}>
              <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: "#dc2626" }} />
              Overdue {totals.overdueCount}
            </span>
            <span className="inline-flex items-center gap-1.5" style={{ color: "#92400e" }}>
              <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: NOHO_AMBER }} />
              Expiring {totals.warningCount}
            </span>
            <span className="inline-flex items-center gap-1.5" style={{ color: "#15803d" }}>
              <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
              Up to date {totals.healthyCount}
            </span>
          </div>
        </div>
      )}

      {/* Section selector */}
      {overview && (
        <div className="grid grid-cols-3 gap-3">
          {sections.map((s) => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className="rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5"
                style={{
                  background: active ? `${s.color}10` : "white",
                  border: `2px solid ${active ? s.color : "rgba(232,229,224,0.7)"}`,
                  boxShadow: active ? `0 4px 16px ${s.color}33` : "0 1px 3px rgba(26,23,20,0.04)",
                }}
              >
                <p
                  className="text-3xl font-black tracking-tight"
                  style={{
                    color: active ? s.color : NOHO_INK,
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {s.count}
                </p>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.16em] mt-1"
                  style={{ color: active ? s.color : "rgba(45,16,15,0.55)" }}
                >
                  {s.label}
                </p>
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
              className="rounded-2xl bg-white p-10 text-center"
              style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04)" }}
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
        className="rounded-2xl p-4 text-xs space-y-1.5"
        style={{
          background: "rgba(51,116,133,0.04)",
          border: "1px solid rgba(51,116,133,0.12)",
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
  const isAccent = accent && !danger;
  const isDanger = danger;
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: isAccent
          ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
          : isDanger
          ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
          : "white",
        boxShadow: isAccent
          ? `0 8px 24px ${NOHO_BLUE}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : isDanger
          ? "0 8px 24px rgba(220,38,38,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        border: isAccent || isDanger ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.16em]"
        style={{ color: isAccent || isDanger ? "rgba(255,255,255,0.55)" : "rgba(45,16,15,0.45)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
        style={{
          color: isAccent || isDanger ? "white" : NOHO_INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[10px] font-bold mt-1"
          style={{ color: isAccent || isDanger ? "rgba(255,255,255,0.6)" : NOHO_BLUE }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
