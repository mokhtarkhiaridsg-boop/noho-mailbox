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
import { motion, AnimatePresence } from "motion/react";
import { BRAND } from "./types";
import { IconForward } from "@/components/MemberIcons";
import { EmptyState } from "./ui";

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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid rgba(45,29,15,0.08)",
      }}
    >
      <div
        className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: "1px solid rgba(45,29,15,0.06)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(51,116,133,0.10)" }}
          >
            <IconForward className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
          </span>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(45,29,15,0.55)" }}
          >
            Shipping labels
          </p>
          {labels.length > 0 && (
            <span
              className="text-[10.5px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
              style={{ background: "rgba(45,29,15,0.05)", color: "rgba(45,29,15,0.65)" }}
            >
              {query ? `${filtered.length}/${labels.length}` : labels.length}
            </span>
          )}
        </div>
        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/shipping"
            className="text-[11.5px] font-semibold px-3.5 h-8 rounded-full inline-flex items-center gap-1 transition-colors"
            style={{
              background: "#337485",
              color: "#F7EEC2",
            }}
          >
            Get a quote
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6 L9 6 M6 3 L9 6 L6 9" />
            </svg>
          </Link>
        </motion.div>
      </div>

      {/* Filter + sort — refined hairline inputs, only shows when worth it */}
      {labels.length > 4 && (
        <div
          className="px-5 py-3 flex items-center gap-2 flex-wrap"
          style={{ borderBottom: "1px solid rgba(45,29,15,0.06)" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient · tracking · city · carrier"
            className="flex-1 min-w-[200px] rounded-lg px-3.5 h-9 text-[12.5px] focus:outline-none focus:border-[#337485] transition-colors"
            style={{
              border: "1px solid rgba(45,29,15,0.10)",
              background: "white",
              color: "#2D1D0F",
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg px-3 h-9 text-[12.5px] font-medium focus:outline-none focus:border-[#337485] transition-colors"
            style={{
              border: "1px solid rgba(45,29,15,0.10)",
              background: "white",
              color: "#2D1D0F",
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
        <EmptyState
          tone="calm"
          title="No shipping labels yet"
          body="When we ship something at the storefront — or you order a label online — it'll show up here with live tracking."
          action={
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/shipping"
                className="text-[12.5px] font-semibold px-4 h-10 rounded-full inline-flex items-center gap-1.5 transition-colors"
                style={{
                  background: "#337485",
                  color: "#F7EEC2",
                }}
              >
                Get a shipping quote
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6 L9 6 M6 3 L9 6 L6 9" />
                </svg>
              </Link>
            </motion.div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          tone="neutral"
          title="No matches"
          body={`No shipments match "${query}".`}
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center px-4 h-9 rounded-full text-[12px] font-semibold transition-colors"
              style={{ background: "#337485", color: "#F7EEC2" }}
            >
              Clear filter
            </button>
          }
        />
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {filtered.map((l, idx) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.26, delay: 0.04 * idx, ease: [0.22, 1, 0.36, 1] }}
              >
                <ShippingRow label={l} />
              </motion.div>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
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
      className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap transition-colors hover:bg-[rgba(45,29,15,0.02)]"
      style={{ borderBottom: "1px solid rgba(45,29,15,0.05)" }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <CarrierGlyph carrier={l.carrier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[13.5px] tracking-tight"
              style={{ color: "#2D1D0F", fontWeight: 700 }}
            >
              {l.toName}
            </p>
            <span
              className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
              style={{
                background: isRefunded ? "rgba(231,0,19,0.08)" : "rgba(51,116,133,0.10)",
                color: isRefunded ? "#991b1b" : "#337485",
              }}
            >
              {isRefunded ? "Refunded" : `${l.carrier} ${l.servicelevel}`}
            </span>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: "rgba(45,29,15,0.55)" }}>
            {l.toCity}, {l.toState} {l.toZip}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <a
              href={l.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11.5px] hover:underline"
              style={{ color: "#337485" }}
            >
              {l.trackingNumber}
            </a>
            <span style={{ color: "rgba(45,29,15,0.30)" }}>·</span>
            <span className="text-[11.5px] tabular-nums" style={{ color: "rgba(45,29,15,0.55)", fontWeight: 600 }}>
              ${l.amountPaid.toFixed(2)}
            </span>
            <span style={{ color: "rgba(45,29,15,0.30)" }}>·</span>
            <span className="text-[10.5px]" style={{ color: "rgba(45,29,15,0.45)" }}>{l.createdAt}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 shrink-0">
        <Link
          href={`/r/${l.id}`}
          className="px-3 h-8 rounded-full text-[11.5px] font-semibold inline-flex items-center transition-colors"
          style={{ background: "#337485", color: "#F7EEC2" }}
        >
          Track
        </Link>
        <button
          type="button"
          onClick={copyPublicLink}
          className="px-3 h-8 rounded-full text-[11.5px] font-semibold transition-colors inline-flex items-center"
          style={{
            background: "white",
            color: copied ? "#15803d" : "#337485",
            border: copied ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(51,116,133,0.20)",
          }}
          title="Copy the branded NOHO tracking URL to share"
        >
          {copied ? "Copied" : "Share"}
        </button>
        <a
          href={l.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 h-8 rounded-full text-[11.5px] font-semibold inline-flex items-center transition-colors"
          style={{
            background: "white",
            color: "rgba(45,29,15,0.65)",
            border: "1px solid rgba(45,29,15,0.10)",
          }}
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
