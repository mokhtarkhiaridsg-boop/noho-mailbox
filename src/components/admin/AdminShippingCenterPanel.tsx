"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShippoPanel } from "./AdminShippoPanel";
import { AdminLabelOrdersPanel, type LabelOrderRow, isStuckOrder, STUCK_ORDER_HOURS } from "./AdminLabelOrdersPanel";
import { AdminEmbeddedPortal } from "./AdminEmbeddedPortal";
import { AdminInboundScanPanel } from "./AdminInboundScanPanel";
import { IconBox, IconUps, IconStamp, IconDhl } from "./AdminIcons";
import { priceWithMargin } from "@/lib/label-orders";
import { getShippingCenterHealth, type HealthItem } from "@/app/actions/shippo";

type SubviewId = "quickship" | "prepaid" | "scan" | "ups" | "stamps" | "dhl";

type LabelRow = {
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
  createdAt: string;
  userName?: string | null;
  suiteNumber?: string | null;
};

type Props = {
  shippoConfigured: boolean;
  recentShippoLabels: LabelRow[];
  labelOrders: LabelOrderRow[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_RED = "#E70013";

const SUBVIEWS: Array<{
  id: SubviewId;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  hint: string;
}> = [
  { id: "quickship", label: "Quick Ship",       Icon: IconShipFleet,  hint: "Live rates · Buy labels" },
  { id: "prepaid",   label: "Pre-paid Labels",  Icon: IconBox,        hint: "Customer-paid orders" },
  { id: "scan",      label: "Scan Inbound",     Icon: IconScanBeam,   hint: "Receive · print pickup stub" },
  { id: "ups",       label: "UPS",              Icon: IconUps,        hint: "Access Point retail portal" },
  { id: "stamps",    label: "Stamps.com",       Icon: IconStamp,      hint: "USPS postage console" },
  { id: "dhl",       label: "DHL Express",      Icon: IconDhl,        hint: "International shipping" },
];

function IconScanBeam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7 V4 H7 M17 4 H20 V7 M20 17 V20 H17 M7 20 H4 V17" />
      <path d="M3 12 H21" />
      <path d="M8 9 V15 M11 9 V15 M14 9 V15 M17 9 V15" opacity="0.7" />
    </svg>
  );
}

function IconShipFleet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18 L9 18" />
      <rect x="2" y="11" width="11" height="7" rx="1" />
      <path d="M13 14 L17 14 L19 16 L19 18 L13 18" />
      <circle cx="6" cy="20" r="1.5" />
      <circle cx="16" cy="20" r="1.5" />
      <path d="M14 11 L17 8 L20 11" />
    </svg>
  );
}

export function AdminShippingCenterPanel({
  shippoConfigured,
  recentShippoLabels,
  labelOrders,
}: Props) {
  const [subview, setSubview] = useState<SubviewId>("quickship");

  // Hero stats — derive from the same data the panes use so the strip is
  // never out of sync with the workspace below it. Computed local-time so
  // the storefront register day and the OS day match.
  const heroStats = useMemo(() => {
    const today = new Date().toDateString();
    let todayCount = 0;
    let todayCostCents = 0;
    let todayRevenueCents = 0;
    const todayByCarrier = new Map<SubviewId, number>();
    for (const l of recentShippoLabels) {
      if (l.status === "refunded") continue;
      const d = new Date(l.createdAt);
      if (d.toDateString() !== today) continue;
      const cost = Math.round(l.amountPaid * 100);
      const { customerPriceCents } = priceWithMargin(cost);
      todayCount += 1;
      todayCostCents += cost;
      todayRevenueCents += customerPriceCents;
      const k = carrierToSubview(l.carrier);
      if (k) todayByCarrier.set(k, (todayByCarrier.get(k) ?? 0) + 1);
    }
    return {
      count: todayCount,
      revenueCents: todayRevenueCents,
      marginCents: todayRevenueCents - todayCostCents,
      byCarrier: todayByCarrier,
    };
  }, [recentShippoLabels]);

  const openOrderCount = labelOrders.filter((o) => o.status !== "Printed" && o.status !== "Cancelled").length;
  const stuckOrderCount = labelOrders.filter((o) => isStuckOrder(o)).length;

  // Health card — refetched whenever stuck count changes (cheap; one Prisma
  // read for sender + presets + carrier list).
  const [health, setHealth] = useState<HealthItem[] | null>(null);
  const [healthOpen, setHealthOpen] = useState(true);
  useEffect(() => {
    getShippingCenterHealth({ stuckOrderCount }).then(setHealth).catch(() => setHealth(null));
  }, [stuckOrderCount]);

  // Map fixTab from health items → Shipping-Center subview or AdminShippoPanel
  // workspace tab. AdminShippoPanel reads `?tab=...` of its parent panel; we
  // use a small custom event so the parent doesn't need to wire callback chain.
  function jumpFromHealth(item: HealthItem) {
    if (!item.fixTab) return;
    if (item.fixTab === "prepaid") {
      setSubview("prepaid");
    } else {
      setSubview("quickship");
      // Tell AdminShippoPanel which inner tab to land on
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("noho-shipping-jump", { detail: { tab: item.fixTab } }));
      }
    }
  }

  // External callers (the MailOS dock, future deep links) can dispatch a
  // `noho-shipping-subview` event with `{ subview: "scan" | ... }` to
  // switch the top-level Shipping Center subview from outside this panel.
  // The companion `noho-shipping-jump` event (handled inside AdminShippoPanel)
  // covers inner Quick-Ship workspace tabs.
  useEffect(() => {
    function onJump(e: Event) {
      const detail = (e as CustomEvent).detail as { subview?: SubviewId } | undefined;
      if (!detail?.subview) return;
      const allowed: SubviewId[] = ["quickship", "prepaid", "scan", "ups", "stamps", "dhl"];
      if (allowed.includes(detail.subview)) setSubview(detail.subview);
    }
    window.addEventListener("noho-shipping-subview", onJump);
    return () => window.removeEventListener("noho-shipping-subview", onJump);
  }, []);

  // Power-user shortcut: press "/" anywhere in the Shipping Center to focus
  // the active subview's search input, "?" to open the shortcut help overlay.
  // Skips when the user is already typing somewhere — never steals focus from
  // a real input.
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tgt?.isContentEditable;
      if (e.key === "Escape" && helpOpen) {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }
      if (isInput) return;
      if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>("[data-quick-search]:not([disabled])");
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  return (
    // ─── UNIFIED 3D COCKPIT ──────────────────────────────────────────────
    // Per user feedback: "ideally everything is in that 3d container not
    // under it it's less confusing." The hero scene + health card +
    // subview workspace all live INSIDE one continuous dark gradient
    // frame so it reads as a single cinematic console rather than three
    // disjoint cards stacked vertically.
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at top, #1A2E3A 0%, #0E1820 60%, #0A1218 100%)",
        boxShadow: "0 30px 80px rgba(10,18,24,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Floor grid (perspective) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(147,196,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(147,196,255,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          transform: "perspective(800px) rotateX(58deg) translateY(20%) scale(1.4)",
          transformOrigin: "center bottom",
        }}
      />
      {/* Glow orbs */}
      <div aria-hidden="true" className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: NOHO_BLUE }} />
      <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-12 blur-3xl pointer-events-none" style={{ background: NOHO_RED }} />

      <div className="relative z-10 p-5 sm:p-7 space-y-5">
        {/* ─── HERO HEADER + FleetScene ─── */}
        <ShippingCenterHero
          activeSubview={subview}
          onPick={setSubview}
          todayCount={heroStats.count}
          todayRevenueCents={heroStats.revenueCents}
          todayMarginCents={heroStats.marginCents}
          openOrderCount={openOrderCount}
          stuckOrderCount={stuckOrderCount}
          carrierTodayCounts={heroStats.byCarrier}
          embedded
        />

        {/* Health checklist — translucent so it reads as part of the cockpit. */}
        {health && (
          <HealthCard
            items={health}
            open={healthOpen}
            onToggle={() => setHealthOpen((v) => !v)}
            onJump={jumpFromHealth}
            translucent
          />
        )}

        {/* Subview content — cream/white inner card so the workspace is
            legible against the dark cockpit, but the card sits INSIDE the
            same outer dark frame so visually the whole thing is one
            connected surface. */}
        <div
          className="rounded-2xl bg-white p-5 sm:p-6"
          style={{
            boxShadow: "0 8px 28px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.6) inset",
            border: "1px solid rgba(147,196,255,0.10)",
          }}
        >
          {subview === "quickship" && (
            <AdminShippoPanel isConfigured={shippoConfigured} recentLabels={recentShippoLabels} />
          )}
          {subview === "prepaid" && (
            <AdminLabelOrdersPanel orders={labelOrders} />
          )}
          {subview === "scan" && (
            <AdminInboundScanPanel />
          )}
          {subview === "ups" && (
            <AdminEmbeddedPortal
              title="UPS Access Point"
              subtitle="REAP retail portal — sign in to scan, hold, and process UPS Access Point packages."
              url="https://ap.ups.com/REAP/retail.htm"
            />
          )}
          {subview === "stamps" && (
            <AdminEmbeddedPortal
              title="Stamps.com"
              subtitle="Print postage, manage shipments, and reconcile your Stamps.com account."
              url="https://login.stamps.com/u/login"
            />
          )}
          {subview === "dhl" && (
            <AdminEmbeddedPortal
              title="DHL Express"
              subtitle="Schedule pickups, track shipments, and manage your DHL Express account."
              url="https://mydhl.express.dhl/us/en/schedule-pickup.html"
            />
          )}
        </div>
      </div>

      {/* Floating "?" hint chip — bottom-right, gives admin a discoverable
          surface for the keyboard shortcuts. Click to open the overlay too. */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-20 right-5 z-40 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white border border-[#e8e5e0] text-[#2D100F] hover:bg-[#FAF6F0] hover:border-[#337485] transition-colors shadow-md"
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <kbd style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: NOHO_INK, color: NOHO_CREAM }}>?</kbd>
        Shortcuts
      </button>

      {helpOpen && <ShortcutHelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

/* ─── Health card ────────────────────────────────────────────────────────── */
// Compact "are we good?" checklist surfaced under the hero. Items are loaded
// asynchronously from a single server action that aggregates: Shippo
// configured, carrier accounts pinned, sender complete, parcel presets, and
// stuck-order count. Each item carries a fixTab + fixCta when actionable.

function HealthCard({
  items, open, onToggle, onJump, translucent = false,
}: {
  items: HealthItem[];
  open: boolean;
  onToggle: () => void;
  onJump: (item: HealthItem) => void;
  /** When the card is rendered inside the dark cockpit, swap to a frosted
   *  translucent surface so it reads as a layer of the cockpit, not a
   *  pasted-on white card. */
  translucent?: boolean;
}) {
  const counts = items.reduce(
    (acc, i) => {
      acc[i.severity] += 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0 } as Record<string, number>,
  );
  const headlineSeverity = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "ok";

  // Pre-compute color tokens so the card can swap surfaces between
  // free-standing white (legacy) and frosted translucent (cockpit) without
  // duplicating the JSX tree.
  const surface = translucent
    ? {
        bg: "rgba(255,255,255,0.06)",
        border: headlineSeverity === "fail"
          ? "rgba(231,0,19,0.45)"
          : headlineSeverity === "warn"
            ? "rgba(245,166,35,0.45)"
            : "rgba(22,163,74,0.40)",
        headerBg: headlineSeverity === "fail"
          ? "linear-gradient(90deg, rgba(231,0,19,0.16), rgba(231,0,19,0.02))"
          : headlineSeverity === "warn"
            ? "linear-gradient(90deg, rgba(245,166,35,0.14), rgba(245,166,35,0.02))"
            : "linear-gradient(90deg, rgba(22,163,74,0.12), rgba(22,163,74,0.02))",
        title: NOHO_CREAM,
        subtle: "rgba(247,230,194,0.65)",
        rowTitle: NOHO_CREAM,
        rowDetail: "rgba(247,230,194,0.62)",
        divider: "rgba(147,196,255,0.10)",
      }
    : {
        bg: "white",
        border: headlineSeverity === "fail"
          ? "rgba(231,0,19,0.30)"
          : headlineSeverity === "warn"
            ? "rgba(245,166,35,0.32)"
            : "rgba(22,163,74,0.25)",
        headerBg: headlineSeverity === "fail"
          ? "linear-gradient(90deg, rgba(231,0,19,0.10), rgba(231,0,19,0.02))"
          : headlineSeverity === "warn"
            ? "linear-gradient(90deg, rgba(245,166,35,0.10), rgba(245,166,35,0.02))"
            : "linear-gradient(90deg, rgba(22,163,74,0.08), rgba(22,163,74,0.02))",
        title: NOHO_INK,
        subtle: "rgba(45,16,15,0.55)",
        rowTitle: NOHO_INK,
        rowDetail: "rgba(45,16,15,0.55)",
        divider: "rgba(45,16,15,0.08)",
      };

  return (
    <div
      className="rounded-2xl border"
      style={{
        background: surface.bg,
        borderColor: surface.border,
        backdropFilter: translucent ? "blur(8px) saturate(140%)" : undefined,
        WebkitBackdropFilter: translucent ? "blur(8px) saturate(140%)" : undefined,
        boxShadow: translucent
          ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 22px rgba(0,0,0,0.18)"
          : "0 1px 3px rgba(45,16,15,0.04), 0 6px 18px rgba(45,16,15,0.05)",
      }}
    >
      {/* Header strip */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl"
        style={{ background: surface.headerBg }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <SeverityDot severity={headlineSeverity as any} pulse={headlineSeverity === "fail"} />
          <p className="text-[12.5px] font-black tracking-tight" style={{ color: surface.title }}>
            {headlineSeverity === "fail"
              ? `${counts.fail} blocking issue${counts.fail === 1 ? "" : "s"} · ${counts.warn} warning${counts.warn === 1 ? "" : "s"}`
              : headlineSeverity === "warn"
                ? `${counts.warn} thing${counts.warn === 1 ? "" : "s"} to clean up`
                : "All systems go"}
          </p>
          <span className="hidden sm:inline text-[10px]" style={{ color: surface.subtle }}>
            · {counts.ok} OK / {counts.warn} warn / {counts.fail} fail
          </span>
        </div>
        <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: surface.subtle }}>
          {open ? "Hide" : "Show"} checks
          <span style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 200ms" }}>▾</span>
        </span>
      </button>

      {open && (
        <ul style={{ borderTop: `1px solid ${surface.divider}` }}>
          {items.map((it, i) => (
            <li
              key={it.id}
              className="px-4 py-2.5 flex items-start gap-3"
              style={i > 0 ? { borderTop: `1px solid ${surface.divider}` } : undefined}
            >
              <SeverityDot severity={it.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black" style={{ color: surface.rowTitle }}>{it.label}</p>
                <p className="text-[10.5px] leading-snug" style={{ color: surface.rowDetail }}>{it.detail}</p>
              </div>
              {it.fixCta && (
                <button
                  type="button"
                  onClick={() => onJump(it)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-black border-2 transition-colors"
                  style={{
                    borderColor: translucent ? NOHO_CREAM : NOHO_BLUE,
                    color: translucent ? NOHO_CREAM : NOHO_BLUE,
                    background: translucent ? "transparent" : undefined,
                  }}
                >
                  {it.fixCta} →
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeverityDot({ severity, pulse }: { severity: "ok" | "warn" | "fail"; pulse?: boolean }) {
  const map = {
    ok: { bg: "#16a34a", glow: "rgba(22,163,74,0.45)" },
    warn: { bg: "#F5A623", glow: "rgba(245,166,35,0.45)" },
    fail: { bg: "#E70013", glow: "rgba(231,0,19,0.55)" },
  };
  const c = map[severity];
  return (
    <span
      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
      style={{
        background: c.bg,
        boxShadow: `0 0 8px ${c.glow}`,
        animation: pulse ? "noho-stuck-pulse 2.4s ease-in-out infinite" : undefined,
      }}
      aria-label={severity}
    />
  );
}

/* ─── Keyboard shortcut help overlay ─────────────────────────────────────── */
// Press "?" anywhere in the Shipping Center to open. Esc to close.
// Backdrop dims the workspace; modal is brand-cream with ink chrome.

function ShortcutHelpOverlay({ onClose }: { onClose: () => void }) {
  const sections: Array<{ title: string; rows: Array<{ key: string; what: string }> }> = [
    {
      title: "Shipping Center",
      rows: [
        { key: "/", what: "Focus the active panel's search input" },
        { key: "?", what: "Open this shortcuts help" },
        { key: "Esc", what: "Close overlays / cancel inputs" },
      ],
    },
    {
      title: "Quick Ship — Recipient autocomplete",
      rows: [
        { key: "↑ ↓", what: "Navigate saved recipients" },
        { key: "Enter", what: "Fill all address fields" },
        { key: "Esc", what: "Dismiss the dropdown" },
      ],
    },
    {
      title: "Labels list",
      rows: [
        { key: "click checkbox", what: "Multi-select rows for bulk actions" },
        { key: "drag handle", what: "Reorder parcel presets in Box Presets" },
      ],
    },
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(20,15,10,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-md bg-white border overflow-hidden"
        style={{
          borderColor: "rgba(45,16,15,0.18)",
          boxShadow: "0 24px 60px rgba(45,16,15,0.30)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(180deg, #FAF6F0, #fff)", borderBottom: `1px solid rgba(45,16,15,0.10)` }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#337485]">MailOS</p>
            <p className="text-sm font-black text-[#2D100F]">Keyboard shortcuts</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8]"
            aria-label="Close"
          >
            Esc
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {sections.map((sec) => (
            <div key={sec.title}>
              <p className="text-[9.5px] font-black uppercase tracking-wider text-[#2D100F]/45 mb-1.5">{sec.title}</p>
              <ul className="space-y-1">
                {sec.rows.map((r) => (
                  <li key={r.key + r.what} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-[#2D100F]/80 min-w-0 flex-1">{r.what}</span>
                    <kbd
                      className="shrink-0 text-[10.5px] font-black px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(51,116,133,0.10)",
                        color: NOHO_BLUE_DEEP,
                        border: "1px solid rgba(51,116,133,0.25)",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      {r.key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 text-[10.5px] text-[#2D100F]/50 border-t border-[#e8e5e0]">
          Tip: every Shipping Center search input is `/`-jumpable.
        </div>
      </div>
    </div>
  );
}

/* ─── Engine-level command-center hero ──────────────────────────────────── */

// Per-carrier today-mix mini-bar. Single horizontal stacked bar with one
// segment per active carrier today, each colored by the carrier's brand
// (USPS navy / UPS bronze / DHL yellow / FedEx purple), plus a tiny legend
// underneath. Renders inline in the hero header so admin sees the day's
// channel mix at a glance.
const CARRIER_MIX_COLOR: Record<string, string> = {
  quickship: "#337485", // generic / FedEx fallback
  prepaid: "#23596A",
  ups: "#6B3F1A",
  stamps: "#2D5BA8", // USPS via Stamps.com
  dhl: "#FFCC00",
};
const CARRIER_MIX_LABEL: Record<string, string> = {
  quickship: "Other",
  prepaid: "Pre-paid",
  ups: "UPS",
  stamps: "USPS",
  dhl: "DHL",
};

function CarrierTodayMix({ counts, total }: { counts: Map<SubviewId, number>; total: number }) {
  if (total === 0) return null;
  const entries = Array.from(counts.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <div className="mt-2.5 max-w-[420px]">
      <div
        className="h-2 rounded-full overflow-hidden flex"
        style={{ background: "rgba(247,230,194,0.10)", border: "1px solid rgba(247,230,194,0.16)" }}
      >
        {entries.map(([id, n]) => (
          <span
            key={id}
            className="block h-full"
            style={{
              width: `${(n / total) * 100}%`,
              background: CARRIER_MIX_COLOR[id] ?? NOHO_BLUE,
            }}
            title={`${CARRIER_MIX_LABEL[id] ?? id}: ${n}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {entries.map(([id, n]) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 text-[9.5px] font-bold"
            style={{ color: "rgba(247,230,194,0.75)" }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: CARRIER_MIX_COLOR[id] ?? NOHO_BLUE }} />
            {CARRIER_MIX_LABEL[id] ?? id}
            <span className="text-[#F7E6C2] font-black">·{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Tiny NPC courier silhouette. Drawn around (0,0) so animateMotion translates
// it cleanly. About 14px wide; the rotate="auto" on the parent group makes
// the figure face the direction of travel along the route. Brand-cream body,
// ink outline, carrier-color shoulder bag.
function NpcCourier({ color }: { color: string }) {
  return (
    <g transform="translate(-7 -7)">
      {/* shadow */}
      <ellipse cx="7" cy="14" rx="4.5" ry="1.2" fill="rgba(0,0,0,0.25)" />
      {/* body */}
      <rect x="3.5" y="6.5" width="7" height="6" rx="1.6" fill={NOHO_CREAM} stroke={NOHO_INK} strokeWidth="0.8" />
      {/* head */}
      <circle cx="7" cy="4.5" r="2.2" fill={NOHO_CREAM} stroke={NOHO_INK} strokeWidth="0.8" />
      {/* shoulder bag — carrier color */}
      <rect x="9" y="8" width="3" height="3.5" rx="0.6" fill={color} stroke={NOHO_INK} strokeWidth="0.6" />
      <path d="M5 7 Q9 6 11 9" fill="none" stroke={NOHO_INK} strokeWidth="0.5" strokeLinecap="round" />
    </g>
  );
}

// Map a Shippo `carrier` string ("USPS", "UPSDAP", "fedex_smartpost", etc.)
// to one of our hub endpoints. Returns null for unknown carriers — they
// still ship, but their puck doesn't pulse.
function carrierToSubview(carrier: string): SubviewId | null {
  const c = (carrier || "").toLowerCase();
  if (c.includes("usps") || c.includes("stamps")) return "stamps";
  if (c.includes("ups")) return "ups";
  if (c.includes("dhl")) return "dhl";
  // No FedEx puck on the hero — quickship covers it. Letting it land on
  // the quickship puck so the activity dot shows life on FedEx labels too.
  if (c.includes("fedex")) return "quickship";
  return null;
}

function fmtMoneyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ShippingCenterHero({
  activeSubview,
  onPick,
  todayCount,
  todayRevenueCents,
  todayMarginCents,
  openOrderCount,
  stuckOrderCount,
  carrierTodayCounts,
  embedded = false,
}: {
  activeSubview: SubviewId;
  onPick: (id: SubviewId) => void;
  todayCount: number;
  todayRevenueCents: number;
  todayMarginCents: number;
  openOrderCount: number;
  stuckOrderCount: number;
  carrierTodayCounts: Map<SubviewId, number>;
  /** When the hero is rendered inside the unified cockpit container, skip
   *  its own outer dark gradient + grid + glow (the parent paints those).
   *  Default false to preserve standalone behavior elsewhere. */
  embedded?: boolean;
}) {
  // When embedded, render the inner content directly without its own
  // outer dark frame — the parent ShippingCenterPanel now provides that.
  if (embedded) {
    return <div className="relative z-10"><HeroBody activeSubview={activeSubview} onPick={onPick} todayCount={todayCount} todayRevenueCents={todayRevenueCents} todayMarginCents={todayMarginCents} openOrderCount={openOrderCount} stuckOrderCount={stuckOrderCount} carrierTodayCounts={carrierTodayCounts} /></div>;
  }
  return (
    <div
      className="relative rounded-3xl overflow-hidden p-5 sm:p-7"
      style={{
        background: "radial-gradient(ellipse at top, #1A2E3A 0%, #0E1820 60%, #0A1218 100%)",
        boxShadow: "0 30px 80px rgba(10,18,24,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Floor grid (perspective) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(147,196,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(147,196,255,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          transform: "perspective(800px) rotateX(58deg) translateY(20%) scale(1.4)",
          transformOrigin: "center bottom",
        }}
      />

      {/* Glow orbs */}
      <div aria-hidden="true" className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: NOHO_BLUE }} />
      <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: NOHO_RED }} />

      <div className="relative z-10"><HeroBody activeSubview={activeSubview} onPick={onPick} todayCount={todayCount} todayRevenueCents={todayRevenueCents} todayMarginCents={todayMarginCents} openOrderCount={openOrderCount} stuckOrderCount={stuckOrderCount} carrierTodayCounts={carrierTodayCounts} /></div>
    </div>
  );
}

// Hero body — extracted so the embedded + standalone variants both share it.
function HeroBody({
  activeSubview, onPick, todayCount, todayRevenueCents, todayMarginCents,
  openOrderCount, stuckOrderCount, carrierTodayCounts,
}: {
  activeSubview: SubviewId;
  onPick: (id: SubviewId) => void;
  todayCount: number;
  todayRevenueCents: number;
  todayMarginCents: number;
  openOrderCount: number;
  stuckOrderCount: number;
  carrierTodayCounts: Map<SubviewId, number>;
}) {
  return (
    <>
        {/* Header strip */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] mb-1" style={{ color: "rgba(147,196,255,0.6)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_RED, boxShadow: `0 0 8px ${NOHO_RED}` }} />
              FLEET OPERATIONS · LIVE
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: NOHO_CREAM, fontFamily: "var(--font-baloo), sans-serif" }}>
              Shipping Center
            </h2>
            <p className="text-xs mt-1" style={{ color: "rgba(247,230,194,0.55)" }}>
              Five carriers. One console. Every label lands here.
            </p>
            {/* Per-carrier today-mix mini-bar — at-a-glance stacked
                segments of today's labels by carrier (USPS / UPS / DHL).
                Only renders when there's >0 activity today. */}
            {todayCount > 0 && <CarrierTodayMix counts={carrierTodayCounts} total={todayCount} />}
          </div>

          <div className="flex gap-2 flex-wrap items-start">
            <StatTile label="Today" value={String(todayCount)} suffix="labels" />
            <StatTile label="Revenue" value={fmtMoneyCents(todayRevenueCents)} suffix="today" revenue />
            <StatTile label="Margin" value={`+${fmtMoneyCents(todayMarginCents)}`} suffix="today" margin />
            <StatTile label="Queue" value={String(openOrderCount)} suffix="orders" accent />
            {stuckOrderCount > 0 && (
              <StatTile
                label="Stuck"
                value={String(stuckOrderCount)}
                suffix={`paid >${STUCK_ORDER_HOURS}h`}
                stuck
                title={`${stuckOrderCount} pre-paid order${stuckOrderCount === 1 ? "" : "s"} marked Paid more than ${STUCK_ORDER_HOURS} hours ago without a Shippo label purchased. Customer is waiting.`}
              />
            )}
            {/* Run sheet — printable courier-handoff list, opens a new tab. */}
            <a
              href="/admin/shipping/runsheet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-stretch px-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(247,230,194,0.10)",
                color: NOHO_CREAM,
                border: `1px solid ${NOHO_CREAM}40`,
              }}
              title="Open today's printable run sheet"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9 V3 H18 V9" />
                <rect x="6" y="9" width="12" height="9" rx="1" />
                <path d="M6 13 H18 M6 16 H14" />
              </svg>
              Run sheet
            </a>
          </div>
        </div>

        {/* Isometric scene with carrier route endpoints */}
        <FleetScene activeSubview={activeSubview} onPick={onPick} carrierTodayCounts={carrierTodayCounts} />

        {/* Mobile fallback button list (engine scene is desktop-friendly) */}
        <div className="md:hidden mt-5 grid grid-cols-2 gap-2">
          {SUBVIEWS.map((s) => {
            const active = activeSubview === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: active ? NOHO_BLUE : "rgba(255,255,255,0.06)",
                  border: `1px solid ${active ? NOHO_BLUE : "rgba(255,255,255,0.08)"}`,
                  color: active ? "#fff" : "rgba(247,230,194,0.85)",
                }}
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? "rgba(255,255,255,0.15)" : "rgba(147,196,255,0.08)" }}>
                  <s.Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black truncate">{s.label}</p>
                  <p className="text-[9px] truncate" style={{ color: active ? "rgba(255,255,255,0.7)" : "rgba(247,230,194,0.5)" }}>{s.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
    </>
  );
}

function StatTile({
  label, value, suffix, accent, revenue, margin, stuck, title,
}: {
  label: string;
  value: string;
  suffix: string;
  accent?: boolean;
  revenue?: boolean;
  margin?: boolean;
  stuck?: boolean;
  title?: string;
}) {
  // Tile palette stays inside the dark-cinematic hero — cyan for neutral,
  // teal for revenue, green for margin, NOHO red for queue/urgent. Stuck
  // gets a deeper red gradient + halo + subtle pulse so the eye snaps to it.
  const palette = stuck
    ? { bg: "linear-gradient(135deg, rgba(231,0,19,0.30), rgba(231,0,19,0.18))", border: "rgba(231,0,19,0.65)", labelC: "rgba(255,200,200,0.95)", valueC: "#FFD0D5", subC: "rgba(255,200,200,0.85)" }
    : revenue
    ? { bg: "rgba(51,116,133,0.20)", border: "rgba(51,116,133,0.45)", labelC: "rgba(180,221,232,0.85)", valueC: "#CBE7EF", subC: "rgba(180,221,232,0.6)" }
    : margin
      ? { bg: "rgba(22,163,74,0.18)", border: "rgba(22,163,74,0.40)", labelC: "rgba(180,232,196,0.85)", valueC: "#B7F0CB", subC: "rgba(180,232,196,0.55)" }
      : accent
        ? { bg: "rgba(231,0,19,0.15)", border: "rgba(231,0,19,0.35)", labelC: "rgba(255,180,187,0.85)", valueC: "#FFB4BB", subC: "rgba(255,180,187,0.6)" }
        : { bg: "rgba(147,196,255,0.08)", border: "rgba(147,196,255,0.16)", labelC: "rgba(147,196,255,0.7)", valueC: NOHO_CREAM, subC: "rgba(247,230,194,0.5)" };
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 min-w-[112px]"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: stuck ? "0 0 18px rgba(231,0,19,0.35)" : undefined,
        animation: stuck ? "noho-stuck-pulse 2.4s ease-in-out infinite" : undefined,
      }}
      title={title}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: palette.labelC }}>
        {label}
      </p>
      <p className="text-xl font-extrabold tracking-tight tabular-nums" style={{ color: palette.valueC }}>
        {value}
      </p>
      <p className="text-[9px]" style={{ color: palette.subC }}>{suffix}</p>
    </div>
  );
}

function FleetScene({
  activeSubview,
  onPick,
  carrierTodayCounts,
}: {
  activeSubview: SubviewId;
  onPick: (id: SubviewId) => void;
  carrierTodayCounts: Map<SubviewId, number>;
}) {
  // 5 endpoints arranged around a central hub. SVG coords 800×360.
  const endpoints: Array<{
    id: SubviewId;
    x: number;
    y: number;
    label: string;
    color: string;
  }> = [
    { id: "quickship", x: 140, y: 80,  label: "QUICK SHIP", color: NOHO_BLUE },
    { id: "prepaid",   x: 140, y: 180, label: "PRE-PAID",   color: NOHO_BLUE_DEEP },
    { id: "scan",      x: 140, y: 280, label: "SCAN INBOUND", color: "#16A34A" },
    { id: "ups",       x: 660, y: 90,  label: "UPS",        color: "#6B3F1A" },
    { id: "stamps",    x: 660, y: 200, label: "STAMPS.COM", color: NOHO_BLUE },
    { id: "dhl",       x: 660, y: 290, label: "DHL",        color: "#FFCC00" },
  ];
  const hub = { x: 400, y: 180 };

  return (
    <div className="relative hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(10,18,24,0.4)", border: "1px solid rgba(147,196,255,0.08)" }}>
      <svg viewBox="0 0 800 360" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Defs */}
        <defs>
          <radialGradient id="hub-glow" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor={NOHO_BLUE} stopOpacity="0.55" />
            <stop offset="60%" stopColor={NOHO_BLUE} stopOpacity="0.1" />
            <stop offset="100%" stopColor={NOHO_BLUE} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="route-active" x1="0" x2="1">
            <stop offset="0%"  stopColor={NOHO_BLUE} stopOpacity="0.05" />
            <stop offset="50%" stopColor={NOHO_BLUE} stopOpacity="0.95" />
            <stop offset="100%" stopColor={NOHO_BLUE} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background scan rings */}
        {[60, 110, 160, 210].map((r, i) => (
          <circle key={r} cx={hub.x} cy={hub.y} r={r} fill="none" stroke="rgba(147,196,255,0.08)" strokeWidth="1" strokeDasharray="2 5" style={{ animation: `scan-rotate ${20 + i * 6}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }} />
        ))}
        {/* Hub glow */}
        <circle cx={hub.x} cy={hub.y} r="100" fill="url(#hub-glow)" />

        {/* Routes */}
        {endpoints.map((e) => {
          const active = activeSubview === e.id;
          return (
            <g key={`route-${e.id}`}>
              <line
                x1={hub.x} y1={hub.y} x2={e.x} y2={e.y}
                stroke={active ? "url(#route-active)" : "rgba(147,196,255,0.18)"}
                strokeWidth={active ? 2 : 1.2}
                strokeDasharray={active ? "none" : "4 6"}
              />
              {active && (
                <>
                  {/* Existing data-packet dot — fast loop. */}
                  <circle r="3.5" fill={NOHO_CREAM}>
                    <animateMotion dur="2.4s" repeatCount="indefinite" path={`M${hub.x} ${hub.y} L${e.x} ${e.y}`} />
                  </circle>
                  {/* NPC courier — slow walk hub → puck. Tiny SVG silhouette
                      with a brand-cream body, brown trim, and a parcel under
                      one arm. Pure delight; signals "active work" inside the
                      cinematic hero. */}
                  <g>
                    <NpcCourier color={e.color} />
                    <animateMotion
                      dur="6s"
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      path={`M${hub.x} ${hub.y} L${e.x} ${e.y}`}
                      rotate="auto"
                    />
                  </g>
                </>
              )}
            </g>
          );
        })}

        {/* Hub — NOHO Mailbox storefront iconography */}
        <g transform={`translate(${hub.x - 56} ${hub.y - 56})`}>
          {/* Awning */}
          <path d="M6 24 L14 10 L98 10 L106 24" fill={NOHO_CREAM} stroke={NOHO_INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 24 L106 24" stroke={NOHO_RED} strokeWidth="2.5" />
          {/* Building */}
          <rect x="10" y="24" width="92" height="78" fill="#FFF9F3" stroke={NOHO_INK} strokeWidth="2" />
          {/* Sign */}
          <rect x="22" y="32" width="68" height="14" rx="2" fill={NOHO_BLUE} stroke={NOHO_INK} strokeWidth="1.5" />
          <text x="56" y="42" textAnchor="middle" fill={NOHO_CREAM} fontSize="8" fontWeight="900" fontFamily="system-ui">NOHO MAILBOX</text>
          {/* Windows */}
          <rect x="20" y="54" width="20" height="24" fill="#EBF2FA" stroke={NOHO_INK} strokeWidth="1.2" />
          <rect x="72" y="54" width="20" height="24" fill="#EBF2FA" stroke={NOHO_INK} strokeWidth="1.2" />
          {/* Door */}
          <rect x="46" y="62" width="20" height="40" fill={NOHO_BLUE} stroke={NOHO_INK} strokeWidth="1.5" />
          <circle cx="61" cy="82" r="1.2" fill={NOHO_CREAM} />
          {/* Star pulse atop */}
          <g style={{ animation: "hub-pulse 3.5s ease-in-out infinite" }}>
            <circle cx="56" cy="6" r="3.5" fill={NOHO_RED} stroke={NOHO_INK} strokeWidth="1.2" />
          </g>
        </g>

        {/* Carrier endpoint pucks (clickable) */}
        {endpoints.map((e) => {
          const active = activeSubview === e.id;
          // Widened from 134 → 170 so STAMPS.COM, DHL EXPRESS, and the
          // "Live rates · Buy labels" hints fit without ellipsis truncation.
          const w = 170, h = 60;
          const x = e.x - w / 2;
          const y = e.y - h / 2;
          const sub = SUBVIEWS.find((s) => s.id === e.id)!;
          return (
            <g key={e.id} style={{ cursor: "pointer" }} onClick={() => onPick(e.id)}>
              <rect
                x={x} y={y} width={w} height={h} rx="14"
                fill={active ? e.color : "rgba(255,255,255,0.04)"}
                stroke={active ? e.color : "rgba(147,196,255,0.22)"}
                strokeWidth={active ? 2 : 1.2}
                style={{
                  filter: active ? `drop-shadow(0 6px 22px ${e.color}AA)` : "drop-shadow(0 2px 10px rgba(0,0,0,0.35))",
                  transition: "all 250ms",
                }}
              />
              <foreignObject x={x + 10} y={y + 10} width={w - 20} height={h - 20}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "system-ui", height: "100%" }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: active ? "rgba(255,255,255,0.18)" : "rgba(147,196,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      color: active ? "#fff" : "rgba(247,230,194,0.85)",
                    }}
                  >
                    <sub.Icon className="w-4 h-4" />
                  </div>
                  <div style={{ minWidth: 0, lineHeight: 1.15 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.04em", color: active ? "#fff" : NOHO_CREAM, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {sub.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 9, color: active ? "rgba(255,255,255,0.85)" : "rgba(247,230,194,0.5)", lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {sub.hint}
                    </div>
                  </div>
                </div>
              </foreignObject>
              {/* Status dot */}
              <circle cx={x + w - 10} cy={y + 10} r="3" fill={active ? "#fff" : "rgba(147,196,255,0.5)"} />
              {/* Today's count badge — pulses when there's recent activity. */}
              {(() => {
                const cnt = carrierTodayCounts.get(e.id) ?? 0;
                if (cnt === 0) return null;
                return (
                  <g>
                    <circle
                      cx={x + w - 14} cy={y + h - 12} r="11"
                      fill={NOHO_RED}
                      stroke={NOHO_CREAM}
                      strokeWidth="1.5"
                      style={{ animation: "noho-puck-pulse 2.6s ease-in-out infinite", filter: "drop-shadow(0 0 8px rgba(231,0,19,0.55))" }}
                    />
                    <text
                      x={x + w - 14} y={y + h - 9}
                      textAnchor="middle"
                      fill={NOHO_CREAM}
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="system-ui"
                    >
                      {cnt > 99 ? "99+" : cnt}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      <style jsx>{`
        @keyframes scan-rotate {
          to { transform: rotate(360deg); transform-origin: 400px 180px; }
        }
        @keyframes hub-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes noho-puck-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          svg circle, svg g { animation: none !important; }
        }
      `}</style>
      <style jsx global>{`
        @keyframes noho-stuck-pulse {
          0%, 100% { box-shadow: 0 0 18px rgba(231,0,19,0.35); }
          50% { box-shadow: 0 0 28px rgba(231,0,19,0.65); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes noho-stuck-pulse { from { } to { } }
        }
      `}</style>
    </div>
  );
}
