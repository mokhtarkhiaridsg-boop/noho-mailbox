"use client";

import { useState, useEffect, useTransition } from "react";
import { getMailHoldReport, runMailHoldCheck, releaseHeldItem } from "@/app/actions/mailHold";

type HeldItem = {
  id: string;
  userId: string;
  from: string;
  type: string;
  status: string;
  daysHeld: number;
  urgency: "low" | "medium" | "high" | "overdue";
  createdAt: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
};

const URGENCY_STYLES = {
  low: { bg: "rgba(22,163,74,0.1)", color: "#15803d", label: "OK" },
  medium: { bg: "rgba(234,179,8,0.1)", color: "#92400e", label: "7d+" },
  high: { bg: "rgba(249,115,22,0.1)", color: "#9a3412", label: "14d+" },
  overdue: { bg: "rgba(220,38,38,0.12)", color: "#b91c1c", label: "OVERDUE" },
};

function UrgencyBadge({ urgency }: { urgency: HeldItem["urgency"] }) {
  const s = URGENCY_STYLES[urgency];
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function AdminMailHoldPanel() {
  const [items, setItems] = useState<HeldItem[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [batchPending, startBatch] = useTransition();
  const [batchMsg, setBatchMsg] = useState<string | null>(null);

  async function load() {
    const data = await getMailHoldReport();
    setItems(data as HeldItem[]);
  }

  useEffect(() => { load(); }, []);

  function runBatch() {
    setBatchMsg(null);
    startBatch(async () => {
      const res = await runMailHoldCheck();
      setBatchMsg(
        `✓ Checked ${res.totalChecked} items — warned ${res.warned} users, flagged ${res.flagged} items${res.errors.length ? ` (${res.errors.length} errors)` : ""}`
      );
      load();
    });
  }

  const filtered = items
    ? filter === "all"
      ? items
      : items.filter((i) => i.urgency === filter)
    : [];

  const counts = items
    ? {
        all: items.length,
        overdue: items.filter((i) => i.urgency === "overdue").length,
        high: items.filter((i) => i.urgency === "high").length,
        medium: items.filter((i) => i.urgency === "medium").length,
        low: items.filter((i) => i.urgency === "low").length,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Mail Hold Enforcement</h2>
          <p className="text-xs text-gray-500">Items held 7+ days need attention. 30-day max hold.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="text-xs font-black px-3 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            disabled={batchPending}
            onClick={runBatch}
            className="text-xs font-black px-3 py-2 rounded-xl text-white disabled:opacity-40"
            style={{ background: "#3374B5" }}
          >
            {batchPending ? "Running…" : "Run Hold Check + Notify"}
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

      {/* Summary pills */}
      {counts && (
        <div className="flex gap-2 flex-wrap">
          {(["all", "overdue", "high", "medium", "low"] as const).map((key) => {
            const label = key === "all" ? "All" : URGENCY_STYLES[key as keyof typeof URGENCY_STYLES]?.label ?? key;
            const count = counts[key as keyof typeof counts];
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="text-xs font-black px-3 py-1.5 rounded-xl transition-colors"
                style={{
                  background: isActive ? "#3374B5" : "rgba(51,116,181,0.08)",
                  color: isActive ? "white" : "#3374B5",
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      {items === null && (
        <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>
      )}

      {items !== null && filtered.length === 0 && (
        <p className="text-center py-10 text-gray-400 text-sm">No items in this category</p>
      )}

      {filtered.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAFC" }} className="border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Item</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Days Held</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((item) => (
                <HeldRow key={item.id} item={item} onRefresh={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl p-4 text-xs space-y-1.5" style={{ background: "rgba(51,116,181,0.06)", border: "1px solid rgba(51,116,181,0.15)" }}>
        <p className="font-black text-blue-900">Hold policy</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li><strong>7 days</strong> — first warning notification sent</li>
          <li><strong>14 days</strong> — second warning notification sent</li>
          <li><strong>30 days</strong> — item flagged as overdue, urgent notification sent</li>
          <li>Admin can manually release items by marking as forwarded or return-to-sender</li>
        </ul>
      </div>
    </div>
  );
}

function HeldRow({ item, onRefresh }: { item: HeldItem; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function release(action: "return" | "forward") {
    setMsg(null);
    startTransition(async () => {
      const res = await releaseHeldItem(item.id, action);
      if ("error" in res) setMsg(`✗ ${(res as any).error}`);
      else {
        setMsg("✓ Released");
        onRefresh();
      }
    });
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-3">
        <div className="font-semibold text-gray-900">{item.userName}</div>
        <div className="text-[11px] text-gray-500">{item.suiteNumber ? `Suite ${item.suiteNumber}` : item.userEmail}</div>
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-700">{item.type}</div>
        <div className="text-[11px] text-gray-500 truncate max-w-[160px]">From: {item.from}</div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="font-black text-gray-900">{item.daysHeld}d</span>
          <UrgencyBadge urgency={item.urgency} />
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="text-[11px] text-gray-600">{item.status}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            disabled={pending}
            onClick={() => release("forward")}
            className="text-[11px] font-black px-2 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40"
          >
            Forward
          </button>
          <button
            disabled={pending}
            onClick={() => release("return")}
            className="text-[11px] font-black px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Return
          </button>
        </div>
        {msg && (
          <p className="text-[10px] mt-1 font-bold" style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>
            {msg}
          </p>
        )}
      </td>
    </tr>
  );
}
