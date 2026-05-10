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

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
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
    bg: "#FFFFFF",
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
    bg: "#FFFFFF",
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
    accent: "#22C55E",
    bg: "#FFFFFF",
    iconStroke: "#22C55E",
    iconPath: <path d="M5 12 L10 17 L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar — neutral cream surface (no rainbow palette).
function huesFor(_seed: string): { from: string; to: string } {
  void _seed;
  return { from: "#F4F5F7", to: "#F4F5F7" };
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
        {/* Monogram avatar — neutral cream surface. */}
        <div
          className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center font-bold text-[11px]"
          style={{
            background: "#F4F5F7",
            color: "#1A1D23",
            border: "1px solid #ECEEF1",
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
                className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-7 rounded-md text-white disabled:opacity-40 transition-colors"
                style={{
                  background: NOHO_INK,
                  border: `1px solid ${NOHO_INK}`,
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
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2
            className="text-2xl font-bold"
            style={{
              color: "#1A1D23",
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
            }}
          >
            Shop
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
            supply orders
          </span>
          <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
            · {buckets.pending.length} pending · {buckets.ready.length} ready · {totals.todayCount} today
          </span>
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
                className="rounded-md p-3 flex flex-col"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.accent}55`,
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
          className="bg-white rounded-md overflow-hidden"
          style={{ border: "1px solid #ECEEF1" }}
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
                              className="text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-7 rounded-md text-white disabled:opacity-50 transition-colors"
                              style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}
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
