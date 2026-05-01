"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { DeliveryOrder } from "./types";

type Props = {
  deliveryOrders: DeliveryOrder[];
  isPending: boolean;
  handleDeliveryStatus: (orderId: string, status: string, courier?: string) => void;
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

type StatusBucket = "pending" | "transit" | "delivered";

function bucketFor(status: string): StatusBucket {
  if (status === "Delivered" || status === "Completed") return "delivered";
  if (status === "Pending") return "pending";
  return "transit"; // Picked Up, In Transit, On the Way, etc.
}

const BUCKET_META: Record<StatusBucket, { title: string; sub: string; accent: string; bg: string; iconStroke: string; iconPath: React.ReactNode }> = {
  pending: {
    title: "Pending",
    sub: "Booked · awaiting pickup",
    accent: NOHO_AMBER,
    bg: "linear-gradient(180deg, rgba(245,166,35,0.10) 0%, rgba(245,166,35,0.02) 60%, transparent 100%)",
    iconStroke: NOHO_AMBER,
    iconPath: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7 L12 12 L15.5 14" strokeLinecap="round" />
      </>
    ),
  },
  transit: {
    title: "In Transit",
    sub: "Picked up · en route",
    accent: NOHO_BLUE,
    bg: "linear-gradient(180deg, rgba(51,116,133,0.10) 0%, rgba(51,116,133,0.02) 60%, transparent 100%)",
    iconStroke: NOHO_BLUE,
    iconPath: (
      <>
        <rect x="2" y="9" width="13" height="9" rx="1" />
        <path d="M15 12 L19 12 L21 14 L21 18 L15 18" />
        <circle cx="6" cy="19" r="1.5" fill={NOHO_BLUE} />
        <circle cx="18" cy="19" r="1.5" fill={NOHO_BLUE} />
      </>
    ),
  },
  delivered: {
    title: "Delivered",
    sub: "Completed today",
    accent: "#16A34A",
    bg: "linear-gradient(180deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.02) 60%, transparent 100%)",
    iconStroke: "#16A34A",
    iconPath: <path d="M5 12 L10 17 L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

function DeliveryCard({
  d,
  isPending,
  onStatus,
}: {
  d: DeliveryOrder;
  isPending: boolean;
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: "white",
        border: "1px solid rgba(232,229,224,0.7)",
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 10px rgba(45,16,15,0.03)",
      }}
    >
      {/* Customer + suite */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-black truncate" style={{ color: NOHO_INK }}>
            {d.customerName}
          </p>
          {d.suiteNumber && (
            <p className="text-[10px]" style={{ color: "rgba(45,16,15,0.5)" }}>
              Suite #{d.suiteNumber}
            </p>
          )}
        </div>
        <span
          className="text-[11px] font-black tabular-nums px-2 py-0.5 rounded-md shrink-0"
          style={{
            background: d.zone === "NoHo" ? "rgba(51,116,133,0.10)" : "rgba(232,229,224,0.7)",
            color: d.zone === "NoHo" ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.6)",
          }}
        >
          ${d.price.toFixed(2)}
        </span>
      </div>

      {/* Route — origin → destination, with a thin animated track */}
      <div
        className="rounded-lg p-2.5 my-2"
        style={{
          background: "rgba(248,242,234,0.7)",
          border: "1px dashed rgba(45,16,15,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: NOHO_INK, boxShadow: "0 0 0 2px rgba(247,230,194,0.6)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(45,16,15,0.4)" }}>
              From · NOHO
            </p>
            <p className="text-[10px] truncate" style={{ color: "rgba(45,16,15,0.65)" }}>
              5062 Lankershim Blvd
            </p>
          </div>
        </div>
        {/* Connector line + courier badge */}
        <div className="flex items-center gap-2 my-1">
          <span aria-hidden="true" className="w-2.5 flex justify-center shrink-0">
            <span
              className="w-0.5 h-3"
              style={{ background: "linear-gradient(180deg, rgba(45,16,15,0.3), rgba(51,116,133,0.6))" }}
            />
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-[0.16em]"
            style={{ color: "rgba(45,16,15,0.4)" }}
          >
            {d.courier && d.courier !== "TBD" ? `via ${d.courier}` : "Courier TBD"}
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-[0.16em]"
            style={{ color: d.zone === "NoHo" ? NOHO_BLUE : "rgba(45,16,15,0.4)" }}
          >
            · {d.zone}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: NOHO_BLUE,
              boxShadow: `0 0 0 2px rgba(247,230,194,0.6), 0 0 8px ${NOHO_BLUE}55`,
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(45,16,15,0.4)" }}>
              To
            </p>
            <p className="text-[10px] truncate" style={{ color: NOHO_INK }}>
              {d.destination}
            </p>
          </div>
        </div>
      </div>

      {/* Status + date + actions */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusBadge status={d.status} />
          <span className="text-[9px]" style={{ color: "rgba(45,16,15,0.4)" }}>
            {d.date}
          </span>
        </div>
        <select
          value={d.status}
          onChange={(e) => onStatus(d.id, e.target.value)}
          disabled={isPending}
          className="text-[9px] font-black rounded-md px-1.5 py-0.5 bg-white"
          style={{ border: "1px solid rgba(232,229,224,0.7)" }}
          aria-label={`Update status for ${d.customerName}`}
        >
          <option value="Pending">Pending</option>
          <option value="Picked Up">Picked Up</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>
    </div>
  );
}

export function AdminDeliveriesPanel({ deliveryOrders, isPending, handleDeliveryStatus }: Props) {
  const [view, setView] = useState<"board" | "table">("board");

  const buckets: Record<StatusBucket, DeliveryOrder[]> = { pending: [], transit: [], delivered: [] };
  for (const d of deliveryOrders) buckets[bucketFor(d.status)].push(d);

  const totalRev = deliveryOrders.reduce((sum, d) => sum + d.price, 0);
  const inTransit = buckets.transit.length;
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayDelivered = buckets.delivered.filter((d) => d.date === today).length;
  const nohoCount = deliveryOrders.filter((d) => d.zone === "NoHo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Deliveries
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            {deliveryOrders.length} orders · {inTransit} in transit · {todayDelivered} delivered today
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
          label="Total"
          value={String(deliveryOrders.length)}
          sub={`${buckets.pending.length} pending`}
        />
        <KpiTile
          label="In Transit"
          value={String(inTransit)}
          sub="Active"
          accent
        />
        <KpiTile
          label="Delivered today"
          value={String(todayDelivered)}
          sub={`${buckets.delivered.length} all-time`}
        />
        <KpiTile
          label="Revenue"
          value={`$${totalRev.toFixed(0)}`}
          sub={`${nohoCount} NoHo · $5 flat`}
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
                aria-labelledby={`del-col-${b}`}
              >
                <header className="flex items-center justify-between gap-2 mb-3 px-1.5">
                  <div className="flex items-center gap-2">
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
                        id={`del-col-${b}`}
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
                    items.map((d) => (
                      <DeliveryCard key={d.id} d={d} isPending={isPending} onStatus={handleDeliveryStatus} />
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
            <h3 className="font-black text-sm uppercase text-text-light">Delivery Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF7] text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Destination</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Zone</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Price</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Courier</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Update</th>
                </tr>
              </thead>
              <tbody>
                {deliveryOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-text-light/50">
                      No delivery orders yet — they&apos;ll appear here as customers book same-day pickup or out-of-zone deliveries.
                    </td>
                  </tr>
                )}
                {deliveryOrders.map((d) => (
                  <tr key={d.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-bold text-text-light">{d.customerName}</span>
                      <span className="text-text-light/40 ml-1">#{d.suiteNumber}</span>
                    </td>
                    <td className="px-5 py-3 text-text-light/70 text-xs">{d.destination}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold ${d.zone === "NoHo" ? "text-accent" : "text-text-light/60"}`}>{d.zone}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-text-light">${d.price.toFixed(2)}</td>
                    <td className="px-5 py-3 text-xs text-text-light/60">{d.courier}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 text-xs text-text-light/40">{d.date}</td>
                    <td className="px-5 py-3">
                      <select
                        value={d.status}
                        onChange={(e) => handleDeliveryStatus(d.id, e.target.value)}
                        disabled={isPending}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border border-[#e8e5e0] bg-white focus:outline-none focus:ring-1 focus:ring-[#337485]"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Picked Up">Picked Up</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))}
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
