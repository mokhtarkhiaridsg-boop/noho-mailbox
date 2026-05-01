"use client";

/**
 * Member dashboard Shipping panel — surfaces the member's recent NOHO labels.
 *
 * Members who buy labels at the storefront (via admin Quick Ship → userId
 * field) see them here with carrier glyph, status pill, tracking, and
 * one-tap copy of the public branded receipt URL (`/r/[id]`).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BRAND } from "./types";
import { IconForward } from "@/components/MemberIcons";

export type MemberShippoLabel = {
  id: string;
  carrier: string;
  servicelevel: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  amountPaid: number;
  status: string;
  toName: string;
  toCity: string;
  toState: string;
  toZip: string;
  createdAt: string; // pre-formatted display string
};

type Props = {
  labels: MemberShippoLabel[];
};

type SortKey = "date" | "amount" | "status";

export default function ShippingPanel({ labels }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? labels
      : labels.filter((l) =>
          `${l.toName} ${l.toCity} ${l.toState} ${l.toZip} ${l.trackingNumber} ${l.carrier} ${l.servicelevel}`.toLowerCase().includes(q),
        );
    // Sort the filtered slice. `date` is the natural order from the server
    // (`createdAt desc`), so it's a no-op copy. Amount sorts high → low.
    // Status puts active labels (anything not "refunded") on top.
    if (sort === "amount") {
      return [...base].sort((a, b) => b.amountPaid - a.amountPaid);
    }
    if (sort === "status") {
      return [...base].sort((a, b) => {
        const aRefund = a.status === "refunded" ? 1 : 0;
        const bRefund = b.status === "refunded" ? 1 : 0;
        if (aRefund !== bRefund) return aRefund - bRefund;
        return 0; // preserve relative date order within each bucket
      });
    }
    return base; // date-desc default (server already sorts that way)
  }, [labels, query, sort]);

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between gap-2.5 flex-wrap"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <IconForward className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h2
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Shipping
          </h2>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
          >
            {query ? `${filtered.length} of ${labels.length}` : `${labels.length} label${labels.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <Link
          href="/shipping"
          className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white transition-all hover:scale-[1.02]"
          style={{ background: BRAND.blue, boxShadow: "0 4px 14px rgba(51,116,133,0.30)" }}
        >
          Get a quote →
        </Link>
      </div>

      {/* Filter + sort — only shows when there are enough labels to bother.
          Same UX pattern as the admin Labels list (search by name / tracking
          / city), plus a sort dropdown for power users. */}
      {labels.length > 4 && (
        <div className="px-6 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: BRAND.border }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient · tracking · city · carrier"
            className="flex-1 min-w-[200px] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              border: `1px solid ${BRAND.border}`,
              background: "#FFF9F3",
              color: BRAND.ink,
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 transition-colors"
            style={{
              border: `1px solid ${BRAND.border}`,
              background: "white",
              color: BRAND.ink,
            }}
            aria-label="Sort shipments"
          >
            <option value="date">Most recent</option>
            <option value="amount">Highest amount</option>
            <option value="status">Active first</option>
          </select>
        </div>
      )}

      {labels.length === 0 ? (
        <div className="p-12 text-center">
          <CarrierGlyphDecorative />
          <h3 className="mt-3 text-sm font-black" style={{ color: BRAND.ink }}>
            No shipping labels yet
          </h3>
          <p className="text-xs mt-1" style={{ color: BRAND.inkSoft }}>
            When we ship something for you at the storefront — or you order a label online — it&apos;ll show up here with live tracking.
          </p>
          <Link
            href="/shipping"
            className="inline-block mt-4 text-[12px] font-black px-4 py-2 rounded-xl text-white"
            style={{ background: BRAND.blue, boxShadow: "0 4px 14px rgba(51,116,133,0.30)" }}
          >
            Get a shipping quote →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
            No shipments match &ldquo;{query}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-[11px] font-bold underline"
            style={{ color: BRAND.blueDeep }}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <ul>
          {filtered.map((l) => (
            <ShippingRow key={l.id} label={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShippingRow({ label: l }: { label: MemberShippoLabel }) {
  const [copied, setCopied] = useState(false);
  const isRefunded = l.status === "refunded";

  function copyPublicLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nohomailbox.org";
    const url = `${origin}/r/${l.id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <li
      className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap"
      style={{ borderBottom: `1px solid ${BRAND.border}` }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <CarrierGlyph carrier={l.carrier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black" style={{ color: BRAND.ink }}>
              {l.toName}
            </p>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: isRefunded ? "rgba(231,0,19,0.10)" : BRAND.blueSoft,
                color: isRefunded ? "#991b1b" : BRAND.blueDeep,
              }}
            >
              {isRefunded ? "Refunded" : `${l.carrier} ${l.servicelevel}`}
            </span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            {l.toCity}, {l.toState} {l.toZip}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <a
              href={l.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] hover:underline"
              style={{ color: BRAND.blue }}
            >
              {l.trackingNumber}
            </a>
            <span style={{ color: BRAND.inkFaint }}>·</span>
            <span className="text-[11px]" style={{ color: BRAND.inkSoft }}>
              ${l.amountPaid.toFixed(2)}
            </span>
            <span style={{ color: BRAND.inkFaint }}>·</span>
            <span className="text-[10px]" style={{ color: BRAND.inkFaint }}>{l.createdAt}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 shrink-0">
        <Link
          href={`/r/${l.id}`}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white transition-colors"
          style={{ background: BRAND.blue }}
        >
          Track
        </Link>
        <button
          type="button"
          onClick={copyPublicLink}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
          style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}
          title="Copy the branded NOHO tracking URL to share"
        >
          {copied ? "Copied ✓" : "Share"}
        </button>
        <a
          href={l.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
          style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}
        >
          Label
        </a>
      </div>
    </li>
  );
}

function CarrierGlyph({ carrier }: { carrier: string }) {
  const c = (carrier || "").toLowerCase();
  let bg = "linear-gradient(135deg, #337485, #23596A)";
  let fg = BRAND.cream;
  let label = carrier.slice(0, 4).toUpperCase();
  if (c.includes("usps")) { bg = "linear-gradient(135deg, #2D5BA8, #1c3f7a)"; fg = "#fff"; label = "USPS"; }
  else if (c.includes("ups")) { bg = "linear-gradient(135deg, #6B3F1A, #3F2410)"; fg = "#FFC107"; label = "UPS"; }
  else if (c.includes("fedex")) { bg = "linear-gradient(135deg, #4D148C, #2E0A57)"; fg = "#FF6600"; label = "FedEx"; }
  else if (c.includes("dhl")) { bg = "#FFCC00"; fg = "#D40511"; label = "DHL"; }
  return (
    <span
      className="shrink-0"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 10,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

function CarrierGlyphDecorative() {
  // Stack of 4 carriers in a fanned layout for the empty state.
  const carriers = ["USPS", "UPS", "FedEx", "DHL"];
  return (
    <div className="inline-flex items-center justify-center gap-1">
      {carriers.map((c, i) => (
        <span
          key={c}
          style={{
            transform: `rotate(${(i - 1.5) * 6}deg) translateY(${Math.abs(i - 1.5) * 2}px)`,
            opacity: 0.65,
          }}
        >
          <CarrierGlyph carrier={c} />
        </span>
      ))}
    </div>
  );
}
