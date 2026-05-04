"use client";

import { useMemo } from "react";
import { StatusBadge } from "./StatusBadge";
import type { SquareStatus, PaymentRow, Customer } from "./types";

type Props = {
  squareStatus: SquareStatus;
  recentPayments: PaymentRow[];
  customers: Customer[];
};

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const NOHO_CREAM = "#EBF2FF";
const NOHO_RED = "#FF3B30";
const NOHO_AMBER = "#F5A623";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonthShort(key: string): string {
  const [, m] = key.split("-");
  return ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m, 10)] ?? key;
}

export function AdminRevenuePanel({ squareStatus, recentPayments, customers }: Props) {
  // ─── Derive series + KPIs from recentPayments ─────────────────────────
  // We can only chart what we've synced from Square. With limited recent
  // history this looks sparse on day-1 deploys, but it grows as Square sync
  // populates older months.

  const completed = recentPayments.filter((p) => p.status === "COMPLETED");

  // 12-month rolling bar series — value in cents per month.
  const months = useMemo(() => {
    const out: Array<{ key: string; label: string; valueCents: number }> = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push({ key: monthKey(d), label: fmtMonthShort(monthKey(d)), valueCents: 0 });
    }
    for (const p of completed) {
      const d = new Date(p.squareCreatedAt);
      const k = monthKey(d);
      const m = out.find((x) => x.key === k);
      if (m) m.valueCents += p.amount;
    }
    return out;
  }, [completed]);

  const maxBar = Math.max(1, ...months.map((m) => m.valueCents));
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const moDelta = lastMonth && lastMonth.valueCents > 0
    ? Math.round(((thisMonth.valueCents - lastMonth.valueCents) / lastMonth.valueCents) * 100)
    : null;

  // Source-type breakdown for the donut
  const sourceMix = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const p of completed) {
      const k = p.sourceType ?? "Unknown";
      tally[k] = (tally[k] ?? 0) + p.amount;
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(tally)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => ({ label: k, valueCents: v, pct: v / total }));
  }, [completed]);

  // Top customers by lifetime revenue
  const topCustomers = useMemo(() => {
    const tally = new Map<string, number>();
    for (const p of completed) {
      if (!p.userName) continue;
      tally.set(p.userName, (tally.get(p.userName) ?? 0) + p.amount);
    }
    return Array.from(tally.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, cents]) => ({ name, cents }));
  }, [completed]);

  // MRR estimate: active customers × tier average. Rough but useful.
  const mrrCents = useMemo(() => {
    const tierMonthlyCents: Record<string, number> = { Basic: 1667, Business: 2667, Premium: 3167 };
    let total = 0;
    for (const c of customers) {
      if (c.status !== "Active") continue;
      total += tierMonthlyCents[c.plan ?? "Basic"] ?? tierMonthlyCents.Basic;
    }
    return total;
  }, [customers]);

  const SOURCE_COLORS = [NOHO_BLUE, NOHO_INK, NOHO_AMBER, "#7C3AED", NOHO_RED, "#22C55E"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Revenue</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
          {squareStatus.configured
            ? `Live from Square · ${squareStatus.totalPayments} payments synced`
            : "Connect Square to populate live revenue data."}
        </p>
      </div>

      {/* ─── KPI tiles ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="This month"
          value={`$${(thisMonth.valueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          delta={moDelta}
          accent
        />
        <KpiTile
          label="MRR estimate"
          value={`$${(mrrCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}/mo`}
          sub={`${customers.filter((c) => c.status === "Active").length} active`}
        />
        <KpiTile
          label="Lifetime"
          value={`$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          sub={`${squareStatus.totalPayments} payments`}
        />
        <KpiTile
          label="Avg ticket"
          value={
            squareStatus.totalPayments > 0
              ? `$${(squareStatus.totalRevenue / squareStatus.totalPayments / 100).toFixed(2)}`
              : "$0.00"
          }
          sub="Per transaction"
        />
      </div>

      {/* ─── 12-month bar chart ─────────────────────────────────────── */}
      <div
        className="rounded-md bg-white p-4"
        style={{ border: "1px solid #ECEEF1" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-sm uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Last 12 months
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.45)" }}>
            <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
            Completed
          </div>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
          {months.map((m) => {
            const h = Math.max(2, Math.round((m.valueCents / maxBar) * 140));
            const isCurrent = m.key === thisMonth.key;
            return (
              <div key={m.key} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full flex items-end justify-center" style={{ height: 140 }}>
                  <div
                    className="w-full max-w-[28px] rounded-t-sm transition-all duration-700"
                    style={{
                      height: h,
                      background: isCurrent ? NOHO_BLUE : "rgba(51,116,133,0.40)",
                    }}
                    title={`${m.label}: $${(m.valueCents / 100).toFixed(2)}`}
                  />
                </div>
                <p
                  className="text-[9px] font-black tracking-wide"
                  style={{ color: isCurrent ? NOHO_INK : "rgba(45,16,15,0.5)" }}
                >
                  {m.label.toUpperCase()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Source mix donut + Top customers ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-md bg-white p-4"
          style={{ border: "1px solid #ECEEF1" }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide mb-4" style={{ color: NOHO_INK }}>
            Payment sources
          </h3>
          {sourceMix.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(45,16,15,0.4)" }}>
              No data yet.
            </p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart sources={sourceMix} colors={SOURCE_COLORS} />
              <ul className="flex-1 space-y-2">
                {sourceMix.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                    />
                    <span className="text-[12px] font-black truncate flex-1" style={{ color: NOHO_INK }}>
                      {s.label}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: "rgba(45,16,15,0.55)" }}>
                      ${(s.valueCents / 100).toFixed(0)} ·{" "}
                      <span className="font-black" style={{ color: NOHO_INK }}>
                        {(s.pct * 100).toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className="rounded-md bg-white p-4"
          style={{ border: "1px solid #ECEEF1" }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide mb-4" style={{ color: NOHO_INK }}>
            Top customers
          </h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(45,16,15,0.4)" }}>
              No data yet.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {topCustomers.map((c, i) => {
                const max = topCustomers[0].cents;
                const pct = c.cents / max;
                return (
                  <li
                    key={c.name}
                    className="flex items-center gap-3 p-2 rounded-xl"
                    style={{ background: i === 0 ? "rgba(245,166,35,0.06)" : "transparent" }}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: i === 0 ? NOHO_AMBER : "#F4F5F7",
                        color: i === 0 ? "white" : "rgba(45,16,15,0.7)",
                        border: `1px solid ${i === 0 ? NOHO_AMBER : "#ECEEF1"}`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate" style={{ color: NOHO_INK }}>
                        {c.name}
                      </p>
                      <div
                        className="h-1 rounded-full mt-1 overflow-hidden"
                        style={{ background: "#ECEEF1" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct * 100}%`,
                            background: NOHO_BLUE,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[12px] font-black tabular-nums" style={{ color: NOHO_INK }}>
                      ${(c.cents / 100).toFixed(0)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* ─── Recent payments ────────────────────────────────────────── */}
      <div
        className="rounded-md overflow-hidden bg-white"
        style={{ border: "1px solid #ECEEF1" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Recent payments
          </h3>
          <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(45,16,15,0.4)" }}>
            {recentPayments.length} synced
          </span>
        </div>
        {recentPayments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
              {squareStatus.configured ? "No payments synced yet. Go to Square tab to sync." : "Connect Square to see payment data."}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
            {recentPayments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: p.status === "COMPLETED" ? "#22C55E" : p.status === "PENDING" ? NOHO_AMBER : "rgba(45,16,15,0.3)",
                      boxShadow: p.status === "COMPLETED" ? "0 0 6px #22C55E" : undefined,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: NOHO_INK }}>
                      {p.userName ?? "Guest"}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(45,16,15,0.4)" }}>
                      {p.sourceType ?? "N/A"} &middot; {new Date(p.squareCreatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black tabular-nums" style={{ color: NOHO_INK }}>
                    ${(p.amount / 100).toFixed(2)}
                  </p>
                  <StatusBadge status={p.status === "COMPLETED" ? "Completed" : p.status === "PENDING" ? "Pending" : p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  delta,
  sub,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-md p-4 transition-colors"
      style={{
        background: accent ? NOHO_INK : "#FFFFFF",
        border: `1px solid ${accent ? NOHO_INK : "#ECEEF1"}`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: accent ? "rgba(247,230,194,0.6)" : "#7A8290" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-bold tracking-tight mt-1"
        style={{
          color: accent ? "#EBF2FF" : NOHO_INK,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      {delta != null && (
        <div className="flex items-center gap-1 mt-1">
          <svg
            viewBox="0 0 12 12"
            className="w-2.5 h-2.5"
            fill="none"
            stroke={accent ? NOHO_CREAM : delta >= 0 ? "#22C55E" : NOHO_RED}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: delta >= 0 ? undefined : "rotate(180deg)" }}
            aria-hidden="true"
          >
            <path d="M2 8 L6 3 L10 8" />
          </svg>
          <p
            className="text-[10px] font-black"
            style={{ color: accent ? "rgba(255,255,255,0.7)" : delta >= 0 ? "#22C55E" : NOHO_RED }}
          >
            {delta >= 0 ? "+" : ""}{delta}% vs last month
          </p>
        </div>
      )}
      {sub && (
        <p className="text-[10px] font-bold mt-1" style={{ color: accent ? "rgba(255,255,255,0.5)" : NOHO_BLUE }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function DonutChart({
  sources,
  colors,
}: {
  sources: Array<{ label: string; valueCents: number; pct: number }>;
  colors: string[];
}) {
  const size = 120;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-[120px] h-[120px] shrink-0" aria-hidden="true">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(232,229,224,0.5)" strokeWidth="14" />
      {sources.map((s, i) => {
        const len = circumference * s.pct;
        const dash = `${len} ${circumference}`;
        const segOffset = -offset;
        offset += len;
        return (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth="14"
            strokeDasharray={dash}
            strokeDashoffset={segOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Center label */}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fill={NOHO_INK}
        fontFamily="var(--font-baloo), sans-serif"
      >
        {sources.length}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fontSize="6"
        fontWeight="800"
        fill="rgba(45,16,15,0.5)"
        letterSpacing="1"
      >
        SOURCES
      </text>
    </svg>
  );
}
