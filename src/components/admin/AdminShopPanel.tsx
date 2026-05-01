"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { updateShopOrderStatus } from "@/app/actions/admin";
import type { ShopOrder } from "./types";

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  Pending: [{ label: "Mark Ready", value: "Ready" }],
  Ready: [{ label: "Mark Completed", value: "Completed" }],
  Completed: [],
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

type Props = {
  shopOrders: ShopOrder[];
};

type StatusBucket = "pending" | "ready" | "completed";

function bucketFor(status: string): StatusBucket {
  if (status === "Pending") return "pending";
  if (status === "Ready") return "ready";
  return "completed";
}

const BUCKET_META: Record<StatusBucket, { title: string; sub: string; accent: string; bg: string; iconStroke: string; iconPath: React.ReactNode }> = {
  pending: {
    title: "Pending",
    sub: "Ordered · awaiting prep",
    accent: NOHO_AMBER,
    bg: "linear-gradient(180deg, rgba(245,166,35,0.10) 0%, rgba(245,166,35,0.02) 60%, transparent 100%)",
    iconStroke: NOHO_AMBER,
    iconPath: (
      <>
        <path d="M3 6 L5 6 L7 17 L19 17 L21 9 L8 9" />
        <circle cx="9" cy="21" r="1" fill={NOHO_AMBER} />
        <circle cx="18" cy="21" r="1" fill={NOHO_AMBER} />
      </>
    ),
  },
  ready: {
    title: "Ready for pickup",
    sub: "Packed · waiting for customer",
    accent: NOHO_BLUE,
    bg: "linear-gradient(180deg, rgba(51,116,133,0.10) 0%, rgba(51,116,133,0.02) 60%, transparent 100%)",
    iconStroke: NOHO_BLUE,
    iconPath: (
      <>
        <path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" />
        <path d="M3 7 L12 11 L21 7" />
        <path d="M12 11 L12 21" />
      </>
    ),
  },
  completed: {
    title: "Completed",
    sub: "Picked up by customer",
    accent: "#16A34A",
    bg: "linear-gradient(180deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.02) 60%, transparent 100%)",
    iconStroke: "#16A34A",
    iconPath: <path d="M5 12 L10 17 L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
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

function ShopOrderCard({
  o,
  onAdvance,
  isPending,
}: {
  o: ShopOrder;
  onAdvance: (orderId: string, status: string) => void;
  isPending: boolean;
}) {
  const next = NEXT_STATUS[o.status] ?? [];
  const { from, to } = huesFor(o.customerName);
  const itemCount = (o.items?.match(/,/g) ?? []).length + 1;

  return (
    <div
      className="rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: "white",
        border: "1px solid rgba(232,229,224,0.7)",
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 10px rgba(45,16,15,0.04)",
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Monogram avatar */}
        <div
          className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-black text-[11px]"
          style={{
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            color: "#F7E6C2",
            boxShadow: "0 3px 10px rgba(45,16,15,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
            fontFamily: "var(--font-baloo), sans-serif",
          }}
        >
          {initials(o.customerName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-black truncate" style={{ color: NOHO_INK }}>
                {o.customerName}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                {o.date}
              </p>
            </div>
            <span
              className="text-[12px] font-black tabular-nums px-2 py-0.5 rounded-md shrink-0"
              style={{
                background: "rgba(22,163,74,0.10)",
                color: "#15803d",
                fontFamily: "var(--font-baloo), sans-serif",
              }}
            >
              ${o.total.toFixed(2)}
            </span>
          </div>

          {/* Items list */}
          <div
            className="mt-2 rounded-lg p-2"
            style={{
              background: "rgba(248,242,234,0.5)",
              border: "1px solid rgba(232,229,224,0.6)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" stroke={NOHO_BLUE_DEEP} strokeWidth="1.8" strokeLinejoin="round">
                <rect x="3" y="5" width="10" height="9" rx="1" />
                <path d="M5 5 L5 3 L11 3 L11 5" />
              </svg>
              <span
                className="text-[9px] font-black uppercase tracking-[0.14em]"
                style={{ color: NOHO_BLUE_DEEP }}
              >
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p
              className="text-[11px] leading-snug line-clamp-2"
              style={{ color: "rgba(45,16,15,0.7)" }}
            >
              {o.items}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {next.map((n) => (
              <button
                key={n.value}
                disabled={isPending}
                onClick={() => onAdvance(o.id, n.value)}
                className="text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-md text-white disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
                  boxShadow: `0 2px 8px ${NOHO_BLUE}33`,
                }}
              >
                {n.label}
              </button>
            ))}
            <select
              disabled={isPending}
              value={o.status}
              onChange={(e) => onAdvance(o.id, e.target.value)}
              className="ml-auto text-[10px] font-bold px-2 py-1 rounded-md bg-white disabled:opacity-50"
              style={{ border: "1px solid rgba(232,229,224,0.7)" }}
              aria-label="Override status"
            >
              {["Pending", "Ready", "Completed", "Cancelled"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminShopPanel({ shopOrders }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"board" | "table">("board");

  function advance(orderId: string, status: string) {
    startTransition(async () => {
      await updateShopOrderStatus(orderId, status);
      router.refresh();
    });
  }

  const buckets: Record<StatusBucket, ShopOrder[]> = { pending: [], ready: [], completed: [] };
  for (const o of shopOrders) buckets[bucketFor(o.status)].push(o);

  const totals = useMemo(() => {
    const totalRev = shopOrders.reduce((s, o) => s + o.total, 0);
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const todayCount = shopOrders.filter((o) => o.date === today).length;
    const todayRev = shopOrders.filter((o) => o.date === today).reduce((s, o) => s + o.total, 0);
    const avgTicket = shopOrders.length > 0 ? totalRev / shopOrders.length : 0;
    return { totalRev, todayCount, todayRev, avgTicket };
  }, [shopOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Shop Orders
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            Packing-supply sales · {shopOrders.length} all-time · {buckets.pending.length} pending prep · {buckets.ready.length} ready for pickup
          </p>
        </div>
        <div
          className="inline-flex rounded-xl p-0.5"
          style={{ background: "rgba(232,229,224,0.5)", border: "1px solid rgba(232,229,224,0.7)" }}
        >
          {(["board", "table"] as const).map((v) => {
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
                {v === "board" ? "Board" : "Table"}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Today"
          value={String(totals.todayCount)}
          sub={`$${totals.todayRev.toFixed(0)} sold`}
          accent
        />
        <KpiTile label="Pending" value={String(buckets.pending.length)} sub="Need prep" />
        <KpiTile label="Ready" value={String(buckets.ready.length)} sub="Pickup waiting" />
        <KpiTile
          label="Lifetime"
          value={`$${totals.totalRev.toFixed(0)}`}
          sub={`Avg $${totals.avgTicket.toFixed(2)} / order`}
        />
      </div>

      {/* ─── BOARD VIEW ─────────────────────────────────────────────── */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(BUCKET_META) as StatusBucket[]).map((b) => {
            const meta = BUCKET_META[b];
            const items = buckets[b];
            return (
              <section
                key={b}
                className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.accent}33`,
                  minHeight: 260,
                }}
                aria-labelledby={`shop-col-${b}`}
              >
                <header className="flex items-center justify-between gap-2 mb-3 px-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "white", boxShadow: `0 1px 2px ${meta.accent}33` }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={meta.iconStroke} strokeWidth="2">
                        {meta.iconPath}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p
                        id={`shop-col-${b}`}
                        className="text-[11px] font-black uppercase tracking-[0.14em]"
                        style={{ color: NOHO_INK }}
                      >
                        {meta.title}
                      </p>
                      <p className="text-[9px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                        {meta.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: items.length > 0 ? meta.accent : "rgba(232,229,224,0.7)",
                      color: items.length > 0 ? "white" : "rgba(45,16,15,0.55)",
                      boxShadow: items.length > 0 ? `0 0 10px ${meta.accent}55` : undefined,
                    }}
                  >
                    {items.length}
                  </span>
                </header>

                <div className="space-y-2 flex-1">
                  {items.length === 0 ? (
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
                    items.map((o) => (
                      <ShopOrderCard key={o.id} o={o} onAdvance={advance} isPending={isPending} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── TABLE VIEW ─────────────────────────────────────────────── */}
      {view === "table" && (
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}
        >
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="font-black text-sm uppercase text-text-light">Shop orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF7] text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Items</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Total</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Action</th>
                </tr>
              </thead>
              <tbody>
                {shopOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-text-light/50">
                      No shop orders yet — packing supplies sales will appear here as customers buy from /shop.
                    </td>
                  </tr>
                )}
                {shopOrders.map((o) => {
                  const next = NEXT_STATUS[o.status] ?? [];
                  return (
                    <tr key={o.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                      <td className="px-5 py-3 font-bold text-text-light">{o.customerName}</td>
                      <td className="px-5 py-3 text-text-light/70 text-xs">{o.items}</td>
                      <td className="px-5 py-3 font-bold text-text-light">${o.total.toFixed(2)}</td>
                      <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-5 py-3 text-xs text-text-light/40">{o.date}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {next.map((n) => (
                            <button
                              key={n.value}
                              disabled={isPending}
                              onClick={() => advance(o.id, n.value)}
                              className="text-[10px] font-black px-2.5 py-1 rounded-lg text-white disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg, #337485, #23596A)" }}
                            >
                              {n.label}
                            </button>
                          ))}
                          <select
                            disabled={isPending}
                            value={o.status}
                            onChange={(e) => advance(o.id, e.target.value)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-[#e8e5e0] bg-white disabled:opacity-50"
                            aria-label="Override status"
                          >
                            {["Pending", "Ready", "Completed", "Cancelled"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: accent ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)` : "white",
        boxShadow: accent
          ? `0 8px 24px ${NOHO_BLUE}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        border: accent ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.16em]"
        style={{ color: accent ? "rgba(255,255,255,0.55)" : "rgba(45,16,15,0.45)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
        style={{
          color: accent ? "white" : NOHO_INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-bold mt-1" style={{ color: accent ? "rgba(255,255,255,0.6)" : NOHO_BLUE }}>
          {sub}
        </p>
      )}
    </div>
  );
}
