"use client";

import { useState, useTransition } from "react";
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

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysLabel(dueDate: string) {
  const due = new Date(dueDate + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  return `Due in ${diff}d`;
}

function StatusChip({ status, dueDate }: { status: string; dueDate: string | null }) {
  const label = dueDate ? daysLabel(dueDate) : status;
  const isOverdue = dueDate ? new Date(dueDate + "T00:00:00Z") < new Date() : false;
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: isOverdue ? "rgba(220,38,38,0.12)" : "rgba(234,179,8,0.12)",
        color: isOverdue ? "#b91c1c" : "#92400e",
      }}
    >
      {label}
    </span>
  );
}

function CustomerRow({
  c,
  onAction,
}: {
  c: BillingCustomer;
  onAction: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [autoRenew, setAutoRenewState] = useState(c.planAutoRenew ?? false);

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

  async function toggleAutoRenew(enabled: boolean) {
    setAutoRenewState(enabled);
    startTransition(async () => {
      await setAutoRenewal(c.id, enabled);
      onAction();
    });
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-3 py-3">
        <div className="font-semibold text-sm text-gray-900">{c.name}</div>
        <div className="text-[11px] text-gray-500">{c.email}</div>
      </td>
      <td className="px-3 py-3 text-sm text-gray-700">{c.plan ?? "—"}</td>
      <td className="px-3 py-3">
        {c.planDueDate ? (
          <div className="space-y-1">
            <div className="text-[11px] text-gray-500">{c.planDueDate}</div>
            <StatusChip status={c.status} dueDate={c.planDueDate} />
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-mono text-gray-700">{fmt(c.walletBalanceCents)}</td>
      <td className="px-3 py-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div
            onClick={() => toggleAutoRenew(!autoRenew)}
            className="relative w-8 h-4 rounded-full transition-colors cursor-pointer"
            style={{ background: autoRenew ? "#3374B5" : "#d1d5db" }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform"
              style={{ transform: autoRenew ? "translateX(17px)" : "translateX(2px)" }}
            />
          </div>
          <span className="text-[11px] text-gray-500">{autoRenew ? "On" : "Off"}</span>
        </label>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            disabled={pending}
            onClick={() => doAction("Late fee applied", () => applyLateFee(c.id))}
            className="text-[11px] font-black px-2.5 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Late Fee
          </button>
          <button
            disabled={pending}
            onClick={() => doAction("Auto-renewed", () => runAutoRenewal(c.id))}
            className="text-[11px] font-black px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            Renew
          </button>
        </div>
        {msg && (
          <p
            className="text-[10px] mt-1 font-bold"
            style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}
          >
            {msg}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function AdminBillingPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchPending, startBatch] = useTransition();
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overdue" | "warning" | "uptodate">("overdue");

  async function load() {
    setLoading(true);
    const data = await getBillingOverview();
    setOverview(data);
    setLoading(false);
  }

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

  // Auto-load on mount
  if (!overview && !loading) {
    load();
  }

  const sections = overview
    ? [
        { key: "overdue" as const, label: "Overdue", count: overview.overdue.length, customers: overview.overdue, color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
        { key: "warning" as const, label: "Expiring Soon", count: overview.warning.length, customers: overview.warning, color: "#d97706", bg: "rgba(217,119,6,0.08)" },
        { key: "uptodate" as const, label: "Up to Date", count: overview.upToDate.length, customers: overview.upToDate, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
      ]
    : [];

  const activeCustomers = sections.find((s) => s.key === activeSection)?.customers ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Billing & Renewals</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage plan payments, late fees, and auto-renewals</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={batchPending}
            onClick={() => runBatch("Expiry warnings sent", sendExpiryWarnings)}
            className="text-xs font-black px-3 py-2 rounded-xl border border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-40 transition-colors"
          >
            Send Expiry Warnings
          </button>
          <button
            disabled={batchPending}
            onClick={() => runBatch("Late fees batch", runLateFeesBatch)}
            className="text-xs font-black px-3 py-2 rounded-xl border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Run Late Fees Batch
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs font-black px-3 py-2 rounded-xl text-white disabled:opacity-40"
            style={{ background: "#3374B5" }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {batchMsg && (
        <div
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: batchMsg.startsWith("✓") ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
            color: batchMsg.startsWith("✓") ? "#16a34a" : "#dc2626",
          }}
        >
          {batchMsg}
        </div>
      )}

      {/* Summary cards */}
      {overview && (
        <div className="grid grid-cols-3 gap-3">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className="rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5"
              style={{
                background: activeSection === s.key ? s.bg : "white",
                border: `2px solid ${activeSection === s.key ? s.color : "#E8E5E0"}`,
                boxShadow: activeSection === s.key ? `0 4px 16px ${s.bg}` : "none",
              }}
            >
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs font-black text-gray-600 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading billing data…</div>
      )}

      {overview && !loading && (
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200" style={{ background: "#F8FAFC" }}>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Wallet</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Auto-Renew</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {activeCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                      No customers in this category
                    </td>
                  </tr>
                ) : (
                  activeCustomers.map((c) => (
                    <CustomerRow key={c.id} c={c} onAction={load} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-2xl p-4 text-xs space-y-1.5" style={{ background: "rgba(51,116,181,0.06)", border: "1px solid rgba(51,116,181,0.15)" }}>
        <p className="font-black text-blue-900">How billing works</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li><strong>Grace period:</strong> 10 days past due before late fee is applied</li>
          <li><strong>Late fee:</strong> $15 deducted from wallet, account status set to Expired</li>
          <li><strong>Auto-renewal:</strong> Charges wallet on due date, extends by plan term</li>
          <li><strong>Expiry warnings:</strong> Sent at 14, 7, and 3 days before due date</li>
        </ul>
      </div>
    </div>
  );
}
