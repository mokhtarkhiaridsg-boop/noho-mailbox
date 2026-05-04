"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

const URGENCY_META: Record<HeldItem["urgency"], { label: string; sub: string; color: string; bg: string }> = {
  low: {
    label: "OK",
    sub: "Within 7 days",
    color: "#16A34A",
    bg: "#FFFFFF",
  },
  medium: {
    label: "7+ days",
    sub: "First warning sent",
    color: NOHO_AMBER,
    bg: "#FFFFFF",
  },
  high: {
    label: "14+ days",
    sub: "Second warning",
    color: "#ea580c",
    bg: "#FFFFFF",
  },
  overdue: {
    label: "Overdue",
    sub: "30+ days · urgent",
    color: "#dc2626",
    bg: "#FFFFFF",
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar — neutral cream surface. Was a 6-tone rainbow palette which
// read as "circus" against the formal admin chrome.
function huesFor(_seed: string): { from: string; to: string } {
  void _seed;
  return { from: "#F4EEE3", to: "#F4EEE3" };
}

function HeldCard({ item, onRefresh }: { item: HeldItem; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const meta = URGENCY_META[item.urgency];
  const { from, to } = huesFor(item.userName);

  // Progress bar maps daysHeld onto 0-30 day axis. Past 30 = full + red.
  const pct = Math.min(100, (item.daysHeld / 30) * 100);

  function release(action: "return" | "forward") {
    setMsg(null);
    startTransition(async () => {
      const res = await releaseHeldItem(item.id, action);
      if ("error" in res) setMsg(`✗ ${(res as { error: string }).error}`);
      else {
        setMsg(`✓ ${action === "forward" ? "Forwarded" : "Returned"}`);
        onRefresh();
      }
    });
  }

  return (
    <div
      className="rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: "white",
        border: `1px solid ${meta.color}22`,
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 10px rgba(45,16,15,0.04)",
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar monogram — neutral cream surface. */}
        <div
          className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center font-bold text-[11px]"
          style={{
            background: "#F4EEE3",
            color: "#1A1614",
            border: "1px solid #E5DACA",
          }}
        >
          {initials(item.userName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-black truncate" style={{ color: NOHO_INK }}>
                {item.userName}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                {item.suiteNumber ? `Suite #${item.suiteNumber}` : item.userEmail}
              </p>
            </div>
            <span
              className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md shrink-0"
              style={{
                background: item.type === "Package" ? "rgba(51,116,133,0.10)" : "rgba(45,16,15,0.06)",
                color: item.type === "Package" ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.6)",
              }}
            >
              {item.type}
            </span>
          </div>

          <p className="text-[11px] truncate mt-1" style={{ color: "rgba(45,16,15,0.6)" }}>
            From: {item.from}
          </p>

          {/* Days-held bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: meta.color }}>
                Held {item.daysHeld} {item.daysHeld === 1 ? "day" : "days"}
              </span>
              <span className="text-[9px] font-bold tabular-nums" style={{ color: "rgba(45,16,15,0.4)" }}>
                of 30
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "#E5DACA" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: meta.color,
                }}
              />
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              disabled={pending}
              onClick={() => release("forward")}
              className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-7 rounded-md text-white disabled:opacity-40 transition-colors"
              style={{
                background: NOHO_INK,
                border: `1px solid ${NOHO_INK}`,
              }}
            >
              Forward
            </button>
            <button
              disabled={pending}
              onClick={() => release("return")}
              className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-7 rounded-md disabled:opacity-40 transition-colors"
              style={{
                background: "#FFFFFF",
                color: "#5C4540",
                border: "1px solid #E5DACA",
              }}
            >
              Return
            </button>
            {msg && (
              <span
                className="ml-auto text-[10px] font-black"
                style={{ color: msg.startsWith("✓") ? "#16A34A" : "#dc2626" }}
              >
                {msg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminMailHoldPanel() {
  const [items, setItems] = useState<HeldItem[] | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [batchPending, startBatch] = useTransition();
  const [batchMsg, setBatchMsg] = useState<string | null>(null);

  async function load() {
    const data = await getMailHoldReport();
    setItems(data as HeldItem[]);
  }

  useEffect(() => {
    load();
  }, []);

  function runBatch() {
    setBatchMsg(null);
    startBatch(async () => {
      const res = await runMailHoldCheck();
      setBatchMsg(
        `✓ Checked ${res.totalChecked} items — warned ${res.warned} users, flagged ${res.flagged} items${res.errors.length ? ` (${res.errors.length} errors)` : ""}`,
      );
      load();
    });
  }

  const counts = useMemo(() => {
    if (!items) return null;
    return {
      total: items.length,
      overdue: items.filter((i) => i.urgency === "overdue").length,
      high: items.filter((i) => i.urgency === "high").length,
      medium: items.filter((i) => i.urgency === "medium").length,
      low: items.filter((i) => i.urgency === "low").length,
    };
  }, [items]);

  // Avg days held — useful KPI
  const avgDays = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.round((items.reduce((s, i) => s + i.daysHeld, 0) / items.length) * 10) / 10;
  }, [items]);

  // Group items into kanban columns by urgency
  const buckets: Record<HeldItem["urgency"], HeldItem[]> = { overdue: [], high: [], medium: [], low: [] };
  if (items) for (const it of items) buckets[it.urgency].push(it);

  const COLUMN_ORDER: HeldItem["urgency"][] = ["overdue", "high", "medium", "low"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Mail Hold Enforcement
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            Items held 7+ days need attention · 30-day max · Auto-warning at 7 / 14 / 30
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: "rgba(232,229,224,0.5)", border: "1px solid rgba(232,229,224,0.7)" }}
          >
            {(["board", "list"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.16em] transition-all"
                  style={{
                    background: active ? "white" : "transparent",
                    color: active ? NOHO_INK : "rgba(45,16,15,0.55)",
                    boxShadow: active ? "0 1px 2px rgba(45,16,15,0.08)" : undefined,
                  }}
                  aria-pressed={active}
                >
                  {v === "board" ? "Board" : "List"}
                </button>
              );
            })}
          </div>
          <button
            onClick={load}
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-2 rounded-xl border"
            style={{ borderColor: "rgba(232,229,224,0.7)", color: "rgba(45,16,15,0.6)" }}
          >
            Refresh
          </button>
          <button
            disabled={batchPending}
            onClick={runBatch}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-3 h-8 rounded-md text-white disabled:opacity-40 transition-colors"
            style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}
          >
            {batchPending ? "Running…" : "Run hold check"}
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
      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiTile label="Total held" value={String(counts.total)} sub={`Avg ${avgDays}d each`} accent />
          <KpiTile label="Overdue 30+" value={String(counts.overdue)} sub="Urgent action" danger={counts.overdue > 0} />
          <KpiTile label="14+ days" value={String(counts.high)} sub="2nd warning" />
          <KpiTile label="7+ days" value={String(counts.medium)} sub="1st warning" />
          <KpiTile label="OK <7d" value={String(counts.low)} sub="Within window" />
        </div>
      )}

      {/* Distribution bar */}
      {counts && counts.total > 0 && (
        <div
          className="rounded-md bg-white p-4"
          style={{ border: "1px solid #E5DACA" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_INK }}>
              Hold-age distribution
            </h3>
            <p className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.4)" }}>
              {counts.total} items
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "#E5DACA" }}>
            {[
              { count: counts.low, color: "#16A34A", label: "OK" },
              { count: counts.medium, color: NOHO_AMBER, label: "7+" },
              { count: counts.high, color: "#ea580c", label: "14+" },
              { count: counts.overdue, color: "#dc2626", label: "Overdue" },
            ].map((seg) => {
              const pct = (seg.count / counts.total) * 100;
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
            <LegendDot color="#16A34A" label={`OK ${counts.low}`} />
            <LegendDot color={NOHO_AMBER} label={`7+ ${counts.medium}`} />
            <LegendDot color="#ea580c" label={`14+ ${counts.high}`} />
            <LegendDot color="#dc2626" label={`Overdue ${counts.overdue}`} />
          </div>
        </div>
      )}

      {/* ─── BOARD VIEW (kanban by urgency) ────────────────────────── */}
      {view === "board" && items && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMN_ORDER.map((u) => {
            const meta = URGENCY_META[u];
            const list = buckets[u];
            return (
              <section
                key={u}
                className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.color}33`,
                  minHeight: 240,
                }}
              >
                <header className="flex items-center justify-between gap-2 mb-3 px-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "white", boxShadow: `0 1px 2px ${meta.color}33` }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={meta.color} strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7 L12 12 L15.5 14" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: NOHO_INK }}>
                        {meta.label}
                      </p>
                      <p className="text-[9px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                        {meta.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: list.length > 0 ? meta.color : "rgba(232,229,224,0.7)",
                      color: list.length > 0 ? "white" : "rgba(45,16,15,0.55)",
                      boxShadow: list.length > 0 ? `0 0 10px ${meta.color}55` : undefined,
                    }}
                  >
                    {list.length}
                  </span>
                </header>
                <div className="space-y-2 flex-1">
                  {list.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-center text-[11px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.5)",
                        border: "1px dashed rgba(45,16,15,0.15)",
                        color: "rgba(45,16,15,0.4)",
                      }}
                    >
                      Nothing here.
                    </div>
                  ) : (
                    list.map((it) => <HeldCard key={it.id} item={it} onRefresh={load} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW (sorted by daysHeld desc) ──────────────────── */}
      {view === "list" && items && items.length > 0 && (
        <div className="space-y-2">
          {[...items]
            .sort((a, b) => b.daysHeld - a.daysHeld)
            .map((it) => (
              <HeldCard key={it.id} item={it} onRefresh={load} />
            ))}
        </div>
      )}

      {items === null && (
        <p className="text-center py-10 text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
          Loading hold report…
        </p>
      )}

      {items !== null && items.length === 0 && (
        <div
          className="rounded-md bg-white p-8 text-center"
          style={{ border: "1px solid #E5DACA" }}
        >
          <p className="text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
            No items currently held.
          </p>
        </div>
      )}

      {/* Hold policy info */}
      <div
        className="rounded-2xl p-4 text-xs space-y-1.5"
        style={{
          background: "rgba(51,116,133,0.04)",
          border: "1px solid rgba(51,116,133,0.12)",
        }}
      >
        <p className="font-black uppercase tracking-[0.16em]" style={{ color: NOHO_BLUE_DEEP }}>
          Hold policy
        </p>
        <ul className="list-disc pl-4 space-y-1" style={{ color: "rgba(45,16,15,0.6)" }}>
          <li><strong style={{ color: NOHO_INK }}>7 days</strong> — first warning notification sent</li>
          <li><strong style={{ color: NOHO_INK }}>14 days</strong> — second warning notification sent</li>
          <li><strong style={{ color: NOHO_INK }}>30 days</strong> — item flagged as overdue, urgent notification sent</li>
          <li>Admin can manually release items by marking as forwarded or return-to-sender</li>
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
  const bg = isAccent ? NOHO_INK : isDanger ? "#B91C1C" : "#FFFFFF";
  return (
    <div
      className="rounded-md p-4 transition-colors"
      style={{
        background: bg,
        border: `1px solid ${isAccent ? NOHO_INK : isDanger ? "#B91C1C" : "#E5DACA"}`,
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: NOHO_INK }}>
      <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
