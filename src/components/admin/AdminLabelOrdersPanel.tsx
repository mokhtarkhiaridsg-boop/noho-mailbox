"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminMarkLabelOrderLinkSent,
  adminMarkLabelOrderPaid,
  adminCancelLabelOrder,
  adminPrintLabelOrder,
  bulkCancelStaleLabelOrders,
} from "@/app/actions/labelOrders";
import { trackShippoLabel } from "@/app/actions/shippo";
import { toCsv, downloadCsv, dateStampedName } from "@/lib/csv";

export type LabelOrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  toName: string;
  toCity: string;
  toState: string;
  toZip: string;
  carrier: string;
  servicelevel: string;
  shippoCostCents: number;
  customerPriceCents: number;
  marginCents: number;
  status: string;
  squareLink: string | null;
  notes: string | null;
  createdAt: string;
  estimatedDays: number | null;
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  // After admin clicks "Print label" the LabelOrder gets `shippoLabelId` and
  // these populate from the joined ShippoLabel — surfaced on Printed rows so
  // admin can re-open the label PDF and check live tracking inline.
  shippoLabelId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  labelStatus?: string | null;
  // ISO timestamps so the panel can flag Paid orders that have been sitting
  // unpurchased too long ("stuck"). Customer paid; courier never got label.
  paidAtIso?: string | null;
  printedAtIso?: string | null;
  // Created timestamp — used for the "stale" predicate (Awaiting/LinkSent > 7d).
  createdAtIso?: string | null;
};

// A "stuck" pre-paid order is Paid but not yet Printed for > 4h. That's the
// failure mode where the customer paid Square, expects same-day pickup, and
// nobody on staff bought the Shippo label. Surfaces in red as a real ops
// alert rather than buried in the table.
export const STUCK_ORDER_HOURS = 4;
export function isStuckOrder(o: { status: string; paidAtIso?: string | null }, now = Date.now()): boolean {
  if (o.status !== "Paid") return false;
  if (!o.paidAtIso) return false;
  const paidMs = Date.parse(o.paidAtIso);
  if (Number.isNaN(paidMs)) return false;
  return (now - paidMs) > STUCK_ORDER_HOURS * 60 * 60 * 1000;
}

// A "stale" pre-paid order is one that's been sitting in Awaiting/LinkSent
// for too long without being paid — customer probably abandoned it. Lets
// admin batch-clean the queue periodically without worrying about cancelling
// fresh orders.
export const STALE_ORDER_DAYS = 7;
export function isStaleOrder(o: { status: string; createdAtIso?: string | null }, now = Date.now()): boolean {
  if (o.status !== "AwaitingPayment" && o.status !== "LinkSent") return false;
  if (!o.createdAtIso) return false;
  const createdMs = Date.parse(o.createdAtIso);
  if (Number.isNaN(createdMs)) return false;
  return (now - createdMs) > STALE_ORDER_DAYS * 24 * 60 * 60 * 1000;
}

type Props = {
  orders: LabelOrderRow[];
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Generate the CSV for the Pre-paid orders. Matches the bookkeeping fields
// admin needs at month-end: timestamp, customer contact, destination,
// carrier+service, financials, and the lifecycle status.
function exportOrdersCsv(orders: LabelOrderRow[]) {
  const rows = orders.map((o) => ({
    Submitted: o.createdAt,
    Customer: o.customerName,
    Email: o.customerEmail,
    Phone: o.customerPhone ?? "",
    Recipient: o.toName,
    City: o.toCity,
    State: o.toState,
    Zip: o.toZip,
    Carrier: o.carrier,
    Service: o.servicelevel,
    "Customer paid ($)": (o.customerPriceCents / 100).toFixed(2),
    "Wholesale ($)": (o.shippoCostCents / 100).toFixed(2),
    "Margin ($)": (o.marginCents / 100).toFixed(2),
    Status: o.status,
    "Tracking #": o.trackingNumber ?? "",
    Notes: o.notes ?? "",
  }));
  const csv = toCsv(rows);
  downloadCsv(dateStampedName("noho-prepaid-orders"), csv);
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  AwaitingPayment: { bg: "bg-[#fbbf24]/15", fg: "text-[#92400e]", label: "Awaiting payment" },
  LinkSent:        { bg: "bg-[#337485]/15", fg: "text-[#337485]", label: "Link sent" },
  Paid:            { bg: "bg-[#16a34a]/15", fg: "text-[#15803d]", label: "Paid · ready to print" },
  Printed:         { bg: "bg-[#162d3a]/10", fg: "text-[#162d3a]/70", label: "Printed" },
  Cancelled:       { bg: "bg-red-50", fg: "text-red-700", label: "Cancelled" },
};

export function AdminLabelOrdersPanel({ orders }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  function notify(id: string, msg: string) {
    setFeedback({ id, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleTextSquareLink(o: LabelOrderRow) {
    if (!o.customerPhone) {
      notify(o.id, "No phone on file — can't text them");
      return;
    }
    const url = window.prompt(
      `Paste Square payment link for ${o.customerName} (${fmtMoney(o.customerPriceCents)}):`,
      "https://checkout.square.site/...",
    );
    if (!url || !url.startsWith("http")) return;

    const firstName = o.customerName.split(" ")[0] ?? o.customerName;
    // Branded NOHO order-receipt URL — customer can re-open it anytime to see
    // status as it transitions Awaiting → Paid → Printed (with tracking).
    const origin = typeof window !== "undefined"
      ? window.location.origin
      : "https://nohomailbox.org";
    const orderUrl = `${origin}/r/po/${o.id}`;
    const body =
      `Hi ${firstName}, this is NOHO Mailbox. Here's your secure Square link to pay ${fmtMoney(o.customerPriceCents)} for the ${o.carrier} ${o.servicelevel} label to ${o.toCity}, ${o.toState}:\n${url}\n\n` +
      `Watch your order status: ${orderUrl}\n\n` +
      `Once paid, drop the package off and we'll print the label same-day. Questions? (818) 506-7744.`;
    const phoneDigits = o.customerPhone.replace(/\D/g, "");
    const smsUrl = `sms:+1${phoneDigits}?&body=${encodeURIComponent(body)}`;

    startTransition(async () => {
      const res = await adminMarkLabelOrderLinkSent(o.id, url);
      if ("error" in res && res.error) {
        notify(o.id, `Error: ${res.error}`);
        return;
      }
      window.open(smsUrl, "_self");
      notify(o.id, "Opening Messages — review and send");
      router.refresh();
    });
  }

  function handleMarkPaid(o: LabelOrderRow) {
    if (!confirm(`Mark ${fmtMoney(o.customerPriceCents)} as paid for ${o.customerName}?`)) return;
    startTransition(async () => {
      const res = await adminMarkLabelOrderPaid(o.id);
      if ("error" in res && res.error) {
        notify(o.id, `Error: ${res.error}`);
        return;
      }
      notify(o.id, "Marked paid — ready to print");
      router.refresh();
    });
  }

  function handlePrint(o: LabelOrderRow) {
    if (!confirm(`Print ${o.carrier} ${o.servicelevel} label to ${o.toName}, ${o.toCity}? Shippo will charge our account ${fmtMoney(o.shippoCostCents)}.`)) return;
    startTransition(async () => {
      const res = await adminPrintLabelOrder(o.id);
      if ("error" in res && res.error) {
        notify(o.id, `Error: ${res.error}`);
        return;
      }
      if (res.labelUrl) {
        window.open(res.labelUrl, "_blank");
      }
      notify(o.id, `Label printed · ${res.trackingNumber ?? ""}`);
      router.refresh();
    });
  }

  function handleCancel(o: LabelOrderRow) {
    if (!confirm(`Cancel order from ${o.customerName}?`)) return;
    startTransition(async () => {
      await adminCancelLabelOrder(o.id);
      notify(o.id, "Cancelled");
      router.refresh();
    });
  }

  const totalMargin = orders.reduce((s, o) => s + (o.status !== "Cancelled" ? o.marginCents : 0), 0);

  // Lifecycle stepper counts — gives admin a single visual of where every
  // open pre-paid order is in the four-stage funnel.
  const counts = useMemo(() => {
    const c = { AwaitingPayment: 0, LinkSent: 0, Paid: 0, Printed: 0, Cancelled: 0 };
    for (const o of orders) (c as any)[o.status] = ((c as any)[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  // Search + status filter — same UX pattern as the AdminShippoPanel labels list.
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "paid" | "printed" | "cancelled" | "stuck" | "stale">("open");
  const stuckCount = useMemo(() => orders.filter((o) => isStuckOrder(o)).length, [orders]);
  const staleCount = useMemo(() => orders.filter((o) => isStaleOrder(o)).length, [orders]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === "stuck" && !isStuckOrder(o)) return false;
      if (statusFilter === "stale" && !isStaleOrder(o)) return false;
      if (statusFilter === "open" && (o.status === "Printed" || o.status === "Cancelled")) return false;
      if (statusFilter === "paid" && o.status !== "Paid") return false;
      if (statusFilter === "printed" && o.status !== "Printed") return false;
      if (statusFilter === "cancelled" && o.status !== "Cancelled") return false;
      if (!q) return true;
      const hay =
        `${o.customerName} ${o.customerEmail} ${o.customerPhone ?? ""} ${o.toName} ` +
        `${o.toCity} ${o.toState} ${o.toZip} ${o.carrier} ${o.servicelevel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, statusFilter]);

  function handleBulkClearStale() {
    if (staleCount === 0) return;
    if (!confirm(`Cancel ${staleCount} stale order${staleCount === 1 ? "" : "s"} (Awaiting/LinkSent > ${STALE_ORDER_DAYS} days)? Customers can always re-submit.`)) return;
    startTransition(async () => {
      const res = await bulkCancelStaleLabelOrders(STALE_ORDER_DAYS);
      if ("error" in (res as any)) {
        notify("bulk-stale", `Error: ${(res as any).error}`);
        return;
      }
      const n = (res as any).cancelled ?? 0;
      notify("bulk-stale", n > 0 ? `✓ Cancelled ${n} stale order${n === 1 ? "" : "s"}` : "No stale orders to cancel");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#337485]/70">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle bg-[#337485]" style={{ boxShadow: "0 0 6px #337485" }} />
            Pre-paid orders · Live
          </p>
          <h2 className="text-xl font-black text-[#2D100F] tracking-tight">Label Print Requests</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border border-[#e8e5e0] text-[#2D100F]/65">
            {orders.length} on file
          </span>
          {totalMargin > 0 && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              +{fmtMoney(totalMargin)} pending margin
            </span>
          )}
          {staleCount > 0 && (
            <button
              type="button"
              onClick={handleBulkClearStale}
              disabled={isPending}
              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
              style={{
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.45)",
                color: "#92400e",
                boxShadow: "0 0 6px rgba(245,166,35,0.20)",
              }}
              title={`Cancel all ${staleCount} pre-paid orders sitting unpaid > ${STALE_ORDER_DAYS} days`}
            >
              Clear {staleCount} stale
            </button>
          )}
        </div>
      </div>

      {/* Lifecycle stepper */}
      <LifecycleStepper counts={counts} />

      {/* Filter strip */}
      <div className="rounded-2xl bg-white border border-[#e8e5e0] p-3 flex items-center gap-2 flex-wrap" style={{ boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name · email · destination · carrier   ( / to focus)"
          data-quick-search="prepaid-orders"
          className="flex-1 min-w-[200px] rounded-xl border border-[#e8e5e0] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485] bg-white"
        />
        {([
          { id: "open" as const, label: "Open" },
          { id: "all" as const, label: `All (${orders.length})` },
          ...(stuckCount > 0 ? [{ id: "stuck" as const, label: `Stuck (${stuckCount})` }] : []),
          ...(staleCount > 0 ? [{ id: "stale" as const, label: `Stale (${staleCount})` }] : []),
          { id: "paid" as const, label: `Paid (${counts.Paid})` },
          { id: "printed" as const, label: `Printed (${counts.Printed})` },
          { id: "cancelled" as const, label: `Cancelled (${counts.Cancelled})` },
        ]).map((f) => {
          const active = statusFilter === f.id;
          const isStuck = f.id === "stuck";
          const isStale = f.id === "stale";
          // Stuck = urgent red; Stale = amber warn (less urgent — these are
          // abandoned by customers, not stuck on staff side).
          const tone = isStuck
            ? { active: "#E70013", border: "rgba(231,0,19,0.40)", bg: "rgba(231,0,19,0.10)", fg: "#991b1b", glow: "0 0 8px rgba(231,0,19,0.25)" }
            : isStale
              ? { active: "#F5A623", border: "rgba(245,166,35,0.45)", bg: "rgba(245,166,35,0.10)", fg: "#92400e", glow: "0 0 6px rgba(245,166,35,0.20)" }
              : null;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-colors"
              style={{
                background: active
                  ? (tone?.active ?? "#337485")
                  : (tone?.bg ?? "transparent"),
                color: active ? "#fff" : (tone?.fg ?? "#2D100F"),
                border: active
                  ? `1px solid ${tone?.active ?? "#337485"}`
                  : `1px solid ${tone?.border ?? "#e8e5e0"}`,
                boxShadow: !active && tone?.glow ? tone.glow : undefined,
              }}
            >
              {f.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => exportOrdersCsv(filtered)}
          className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] flex items-center gap-1.5"
          title="Export current filtered orders to a spreadsheet (CSV)"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2 V11 M5 8 L8 11 L11 8 M3 13 H13" />
          </svg>
          CSV
        </button>
      </div>

      <p className="text-xs text-[#2D100F]/55">
        Customers pre-pay through <strong>/shipping</strong>. Tap{" "}
        <strong>Text Square link</strong>, then <strong>Mark paid</strong> after Square confirms,
        then <strong>Print label</strong> — Shippo purchase happens at print time.
      </p>

      <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none">
              <rect x="6" y="14" width="36" height="28" rx="4" fill="#EBF2FA" stroke="#162d3a" strokeWidth="2" />
              <path d="M14 14 L14 8 L34 8 L34 14" stroke="#162d3a" strokeWidth="2" />
            </svg>
            <p className="text-sm font-bold text-[#162d3a]/70">
              {orders.length === 0
                ? "No open label orders"
                : query.trim() ? `No orders match "${query}"` : "No orders match this filter"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#162d3a]/8">
            {filtered.map((o) => {
              const stl = STATUS_STYLE[o.status] ?? STATUS_STYLE.AwaitingPayment;
              return (
                <li key={o.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-[#162d3a]">{o.customerName}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${stl.bg} ${stl.fg}`}>
                          {stl.label}
                        </span>
                        {isStuckOrder(o) && (
                          <span
                            className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(231,0,19,0.14)",
                              color: "#991b1b",
                              border: "1px solid rgba(231,0,19,0.45)",
                              boxShadow: "0 0 6px rgba(231,0,19,0.22)",
                            }}
                            title={(() => {
                              const ms = o.paidAtIso ? Date.now() - Date.parse(o.paidAtIso) : 0;
                              const h = Math.round(ms / (60 * 60 * 1000));
                              return `Paid ${h}h ago — Shippo label not yet purchased.`;
                            })()}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#E70013" }} />
                            STUCK
                          </span>
                        )}
                        {isStaleOrder(o) && (
                          <span
                            className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(245,166,35,0.14)",
                              color: "#92400e",
                              border: "1px solid rgba(245,166,35,0.45)",
                            }}
                            title={(() => {
                              const ms = o.createdAtIso ? Date.now() - Date.parse(o.createdAtIso) : 0;
                              const d = Math.round(ms / (24 * 60 * 60 * 1000));
                              return `Submitted ${d} days ago — never paid. Safe to cancel.`;
                            })()}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#F5A623" }} />
                            STALE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#162d3a]/65 mt-1">
                        <a href={`mailto:${o.customerEmail}`} className="hover:text-[#337485]">
                          {o.customerEmail}
                        </a>
                        {o.customerPhone && (
                          <>
                            {" · "}
                            <a href={`tel:${o.customerPhone}`} className="hover:text-[#337485]">
                              {o.customerPhone}
                            </a>
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-[#162d3a]/40 mt-0.5">Submitted {o.createdAt}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 rounded-xl bg-[#162d3a]/3" style={{ background: "#FAF6F0" }}>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-[#162d3a]/50">To</p>
                          <p className="text-xs text-[#162d3a] font-semibold">{o.toName}</p>
                          <p className="text-[11px] text-[#162d3a]/70">{o.toCity}, {o.toState} {o.toZip}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-[#162d3a]/50">Service</p>
                          <p className="text-xs text-[#162d3a] font-semibold">{o.carrier}</p>
                          <p className="text-[11px] text-[#162d3a]/70">{o.servicelevel}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-[#162d3a]/50">Parcel</p>
                          <p className="text-xs text-[#162d3a] font-semibold">{(o.weightOz / 16).toFixed(2)} lb</p>
                          <p className="text-[11px] text-[#162d3a]/70">{o.lengthIn}&times;{o.widthIn}&times;{o.heightIn}&quot;</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] text-[#92400e] font-bold">
                          Customer pays {fmtMoney(o.customerPriceCents)}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#162d3a]/8 text-[#162d3a]/80 font-bold">
                          Shippo cost {fmtMoney(o.shippoCostCents)}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#16a34a]/15 text-[#15803d] font-bold">
                          +{fmtMoney(o.marginCents)} margin
                        </span>
                      </div>

                      {o.notes && (
                        <p className="text-xs text-[#162d3a]/80 mt-2 italic">&ldquo;{o.notes}&rdquo;</p>
                      )}
                      {o.squareLink && (
                        <p className="text-[10px] text-[#337485] mt-1 break-all">
                          Link sent: <a href={o.squareLink} target="_blank" rel="noreferrer" className="underline">{o.squareLink}</a>
                        </p>
                      )}

                      {/* Public order-receipt copy + open — admin shares one
                          branded NOHO link with the customer at any status. */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <CopyOrderLinkButton orderId={o.id} />
                        <a
                          href={`/r/po/${o.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-[#337485] hover:underline"
                          title="Open the customer-facing order page in a new tab"
                        >
                          Open ↗
                        </a>
                      </div>

                      {/* Printed-order tracking summary — surfaces the linked
                          ShippoLabel so admin doesn't have to dig into the
                          Labels tab to see what shipped or refund the label. */}
                      {o.status === "Printed" && o.trackingNumber && (
                        <PrintedOrderTracking
                          trackingNumber={o.trackingNumber}
                          trackingUrl={o.trackingUrl ?? null}
                          labelUrl={o.labelUrl ?? null}
                          carrier={o.carrier}
                          labelStatus={o.labelStatus ?? null}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:w-56 shrink-0">
                      {o.status === "AwaitingPayment" && (
                        <button
                          onClick={() => handleTextSquareLink(o)}
                          disabled={isPending}
                          className="px-3 py-2 rounded-xl text-xs font-black bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50"
                          title={o.customerPhone ? `Text link to ${o.customerPhone}` : "No phone on file"}
                        >
                          Text Square link
                        </button>
                      )}
                      {o.status === "LinkSent" && (
                        <button
                          onClick={() => handleTextSquareLink(o)}
                          disabled={isPending}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20 disabled:opacity-50"
                        >
                          Re-send link
                        </button>
                      )}
                      {(o.status === "AwaitingPayment" || o.status === "LinkSent") && (
                        <button
                          onClick={() => handleMarkPaid(o)}
                          disabled={isPending}
                          className="px-3 py-2 rounded-xl text-xs font-black bg-[#337485] text-white hover:bg-[#23596A] disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )}
                      {o.status === "Paid" && (
                        <button
                          onClick={() => handlePrint(o)}
                          disabled={isPending}
                          className="px-3 py-2 rounded-xl text-xs font-black bg-[#2D100F] text-[#F7E6C2] hover:bg-[#1a0908] disabled:opacity-50"
                        >
                          Print label
                        </button>
                      )}
                      {o.status === "Printed" && o.labelUrl && (
                        <a
                          href={o.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-black text-center bg-[#337485] text-white hover:bg-[#23596A]"
                        >
                          Open label
                        </a>
                      )}
                      {o.status !== "Printed" && o.status !== "Cancelled" && (
                        <button
                          onClick={() => handleCancel(o)}
                          disabled={isPending}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {feedback?.id === o.id && (
                    <div className="mt-3 text-xs font-bold text-[#337485] bg-[#337485]/8 px-3 py-2 rounded-lg">
                      {feedback.msg}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Printed-order tracking summary ─────────────────────────────────────── */
// Surfaces the linked ShippoLabel data inline on a Printed pre-paid order,
// with a one-click "Refresh" that pings Shippo's tracking endpoint (same
// action the Labels list uses). Refunded labels are flagged in red.

function PrintedOrderTracking({
  trackingNumber, trackingUrl, labelUrl, carrier, labelStatus,
}: {
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  carrier: string;
  labelStatus: string | null;
}) {
  void labelUrl; // surfaced via the action button on the right column
  const [live, setLive] = useState<{ status: string; loc?: string | null } | null>(null);
  const [pending, setPending] = useState(false);
  const isRefunded = labelStatus === "refunded";

  function refresh() {
    setPending(true);
    void trackShippoLabel(carrier, trackingNumber)
      .then((res) => {
        if ("error" in res && res.error) {
          setLive({ status: "ERROR" });
          return;
        }
        const s = (res as any).status;
        setLive({ status: s?.status ?? "UNKNOWN", loc: s?.location ?? null });
      })
      .finally(() => setPending(false));
  }

  return (
    <div
      className="mt-3 rounded-xl px-3 py-2 border flex items-center gap-3 flex-wrap"
      style={{
        background: isRefunded ? "rgba(231,0,19,0.06)" : "rgba(51,116,133,0.06)",
        borderColor: isRefunded ? "rgba(231,0,19,0.25)" : "rgba(51,116,133,0.22)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#2D100F]/55">
          {isRefunded ? "Refunded label" : "Live tracking"}
        </p>
        <a
          href={trackingUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[12px] text-[#337485] hover:underline break-all"
        >
          {trackingNumber}
        </a>
      </div>
      {live && (
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
          style={{
            background: live.status === "DELIVERED" ? "rgba(22,163,74,0.14)"
              : live.status === "TRANSIT" ? "rgba(51,116,133,0.18)"
              : live.status === "PRE_TRANSIT" ? "rgba(245,166,35,0.14)"
              : "rgba(231,0,19,0.14)",
            color: live.status === "DELIVERED" ? "#15803d"
              : live.status === "TRANSIT" ? "#23596A"
              : live.status === "PRE_TRANSIT" ? "#92400e"
              : "#991b1b",
          }}
          title={live.loc ?? undefined}
        >
          {live.status === "DELIVERED" ? "Delivered"
            : live.status === "TRANSIT" ? "In transit"
            : live.status === "PRE_TRANSIT" ? "Awaiting pickup"
            : live.status === "ERROR" ? "Track error"
            : live.status}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] disabled:opacity-50 shrink-0"
      >
        {pending ? "Tracking…" : live ? "Refresh" : "Track"}
      </button>
    </div>
  );
}

/* ─── Copy public order-link button ──────────────────────────────────────── */
// Admin shares the branded NOHO public order-status URL with the customer
// without going through the full Square-link SMS flow. Same UX language as
// the AdminShippoPanel CopyPublicLinkButton.

function CopyOrderLinkButton({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nohomailbox.org";
    const url = `${origin}/r/po/${orderId}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8]"
      title="Copy the customer-facing order-receipt URL to the clipboard"
    >
      {copied ? "Copied ✓" : "Copy public link"}
    </button>
  );
}

/* ─── Lifecycle stepper ─────────────────────────────────────────────────── */
// Three-step funnel `Awaiting → LinkSent → Paid → Printed`. Each step is a
// card with a numbered badge + count. Active steps (count > 0) get a brand
// teal tint + halo so the bottleneck is visually obvious. Cancelled is shown
// as an off-ramp pill on the right.

function LifecycleStepper({ counts }: { counts: { AwaitingPayment: number; LinkSent: number; Paid: number; Printed: number; Cancelled: number } }) {
  const steps = [
    { id: "AwaitingPayment", n: 1, title: "Awaiting", sub: "Submitted · text Square link",  count: counts.AwaitingPayment, color: "#F5A623" },
    { id: "LinkSent",        n: 2, title: "Link sent", sub: "Customer pays via Square",     count: counts.LinkSent,        color: "#337485" },
    { id: "Paid",            n: 3, title: "Paid",      sub: "Ready to print Shippo label",  count: counts.Paid,            color: "#23596A" },
    { id: "Printed",         n: 4, title: "Printed",   sub: "Label purchased · done",       count: counts.Printed,         color: "#16a34a" },
  ] as const;

  return (
    <div className="rounded-2xl bg-white border border-[#e8e5e0] p-4" style={{ boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
      <div className="flex items-stretch gap-2 flex-wrap">
        {steps.map((s, i) => {
          const active = s.count > 0;
          return (
            <div key={s.id} className="flex items-stretch gap-2 flex-1 min-w-[160px]">
              <div
                className="flex-1 rounded-xl px-3 py-2 border transition-all"
                style={{
                  background: active ? `${s.color}1A` : "#fff",
                  borderColor: active ? `${s.color}80` : "#e8e5e0",
                  boxShadow: active ? `0 6px 18px ${s.color}33` : "0 1px 2px rgba(45,16,15,0.04)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{
                        background: active ? s.color : "rgba(45,16,15,0.06)",
                        color: active ? "#fff" : "rgba(45,16,15,0.40)",
                      }}
                    >
                      {s.n}
                    </span>
                    <p className="text-[12px] font-black text-[#2D100F] tracking-tight">{s.title}</p>
                  </div>
                  <span
                    className="text-[14px] font-extrabold tabular-nums"
                    style={{ color: active ? s.color : "rgba(45,16,15,0.30)" }}
                  >
                    {s.count}
                  </span>
                </div>
                <p className="text-[10px] text-[#2D100F]/50 mt-1 leading-snug">{s.sub}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="self-center text-[#2D100F]/25 px-0.5 hidden sm:block">→</div>
              )}
            </div>
          );
        })}
        {counts.Cancelled > 0 && (
          <div
            className="self-center rounded-xl px-3 py-2 border min-w-[140px]"
            style={{ background: "rgba(231,0,19,0.06)", borderColor: "rgba(231,0,19,0.30)" }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#991b1b" }}>Off-ramp</p>
            <p className="text-[12px] font-black text-[#2D100F] mt-0.5">Cancelled <span className="text-[14px] font-extrabold tabular-nums" style={{ color: "#E70013" }}>{counts.Cancelled}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
