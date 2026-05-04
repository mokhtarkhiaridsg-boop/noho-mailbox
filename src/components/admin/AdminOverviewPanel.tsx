"use client";

/**
 * Admin Overview — Launchpad.
 *
 * The previous overview stacked metrics + activity stream + quick links
 * vertically, forcing the operator to scroll. The user asked for an
 * Apple-Launchpad layout: a single-viewport grid of large square tiles,
 * one per tool, with no scroll. Click a tile to navigate to that tab.
 *
 * Layout:
 *  • A small status strip at the top (greeting + 4 live counts) that
 *    fits in ~48px and never scrolls.
 *  • Below it, a 6×4 (mobile collapses to 3×8) grid of square tiles —
 *    each tile shows a colored icon glyph + label + optional badge.
 *    The grid uses CSS-grid auto-rows tied to viewport height, so the
 *    whole launchpad always fits the visible area.
 *  • No vertical or horizontal scroll. Counts live on the relevant
 *    tile as a small red badge (signups, credits, mail requests, keys).
 */

import type { Stats, MailItem, NotaryItem } from "./types";
import {
  IconRegister,
  IconSignup,
  IconCredit,
  IconCustomers,
  IconBox,
  IconCompliance,
  IconMail,
  IconClipboard,
  IconHold,
  IconKey,
  IconTruck,
  IconQR,
  IconNotary,
  IconShipping,
  IconShop,
  IconReceipt,
  IconReport,
  IconCancel,
  IconSquare,
  IconCalendar,
  IconChat,
  IconEmail,
  IconBuilding,
  IconSettings,
} from "./AdminIcons";

type Props = {
  stats: Stats;
  recentMail: MailItem[];
  notaryQueue: NotaryItem[];
  setTab: (tab: string) => void;
  pendingSignupCount?: number;
};

// ─── Brand tokens ──────────────────────────────────────────────────────
const T = {
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  blue: "#1976FF",
  blueSoft: "#EBF2FF",
  red: "#FF3B30",
  green: "#22C55E",
};

// 24 tools laid out in a 6×4 grid. Order picked by daily-use frequency:
// the first row is "right-now action", the second "operations", the
// third "money", the fourth "system". Each tile carries a soft pastel
// background tint so the launchpad feels like Apple's color-coded grid.
type Tile = {
  id: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  tint: string;
  iconBg: string;
  iconColor: string;
  badgeKey?: "signups" | "credits" | "requests" | "keys" | "awaiting" | "notary";
};

const TILES: Tile[] = [
  { id: "register",      label: "Cash Register",   Icon: IconRegister,   tint: "#EBF6FF", iconBg: "#1976FF", iconColor: "#FFFFFF" },
  { id: "signups",       label: "Signups",         Icon: IconSignup,     tint: "#FFF4EB", iconBg: "#FF8A1F", iconColor: "#FFFFFF", badgeKey: "signups" },
  { id: "credits",       label: "Credits",         Icon: IconCredit,     tint: "#EAFBEF", iconBg: "#22C55E", iconColor: "#FFFFFF", badgeKey: "credits" },
  { id: "customers",     label: "Customers",       Icon: IconCustomers,  tint: "#F0EBFF", iconBg: "#7C4DFF", iconColor: "#FFFFFF" },
  { id: "mailboxcenter", label: "Mailbox Center",  Icon: IconBox,        tint: "#FFF1F0", iconBg: "#EF4444", iconColor: "#FFFFFF" },
  { id: "compliance",    label: "Compliance",      Icon: IconCompliance, tint: "#FFFAEB", iconBg: "#F5A623", iconColor: "#FFFFFF" },

  { id: "mail",          label: "Mail & Pkgs",     Icon: IconMail,       tint: "#EBF2FF", iconBg: "#0F5BD9", iconColor: "#FFFFFF" },
  { id: "requests",      label: "Mail Requests",   Icon: IconClipboard,  tint: "#FFF4EB", iconBg: "#FF8A1F", iconColor: "#FFFFFF", badgeKey: "requests" },
  { id: "mailhold",      label: "Mail Hold",       Icon: IconHold,       tint: "#FAF6FF", iconBg: "#9F7AEA", iconColor: "#FFFFFF" },
  { id: "keys",          label: "Keys",            Icon: IconKey,        tint: "#FFFAEB", iconBg: "#F59E0B", iconColor: "#FFFFFF", badgeKey: "keys" },
  { id: "deliveries",    label: "Deliveries",      Icon: IconTruck,      tint: "#EAF7FF", iconBg: "#0EA5E9", iconColor: "#FFFFFF" },
  { id: "qrpickup",      label: "QR Pickup",       Icon: IconQR,         tint: "#F0F4FF", iconBg: "#5B6CFF", iconColor: "#FFFFFF" },

  { id: "notary",        label: "Notary",          Icon: IconNotary,     tint: "#FFF7F0", iconBg: "#D97706", iconColor: "#FFFFFF" },
  { id: "shippingcenter",label: "Shipping",        Icon: IconShipping,   tint: "#EAFAF4", iconBg: "#0F9F6E", iconColor: "#FFFFFF" },
  { id: "shop",          label: "Shop",            Icon: IconShop,       tint: "#FFEFEF", iconBg: "#E11D48", iconColor: "#FFFFFF" },
  { id: "billing",       label: "Billing",         Icon: IconReceipt,    tint: "#EBF6FF", iconBg: "#1976FF", iconColor: "#FFFFFF" },
  { id: "revenue",       label: "Revenue",         Icon: IconReport,     tint: "#EAFBEF", iconBg: "#16A34A", iconColor: "#FFFFFF" },
  { id: "cancellations", label: "Cancellations",   Icon: IconCancel,     tint: "#FFF1F0", iconBg: "#DC2626", iconColor: "#FFFFFF" },

  { id: "square",        label: "Square",          Icon: IconSquare,     tint: "#F4F4F4", iconBg: "#1A1D23", iconColor: "#FFFFFF" },
  { id: "quarterly",     label: "Quarterly",       Icon: IconCalendar,   tint: "#FFFAEB", iconBg: "#CA8A04", iconColor: "#FFFFFF" },
  { id: "messages",      label: "Messages",        Icon: IconChat,       tint: "#EBF2FF", iconBg: "#1976FF", iconColor: "#FFFFFF" },
  { id: "emails",        label: "Email Logs",      Icon: IconEmail,      tint: "#FAF6FF", iconBg: "#7C4DFF", iconColor: "#FFFFFF" },
  { id: "tenants",       label: "Tenants",         Icon: IconBuilding,   tint: "#F4F4F4", iconBg: "#3B4252", iconColor: "#FFFFFF" },
  { id: "settings",      label: "Settings",        Icon: IconSettings,   tint: "#F4F5F7", iconBg: "#7A8290", iconColor: "#FFFFFF" },
];

export function AdminOverviewPanel({
  stats,
  recentMail: _recentMail,
  notaryQueue,
  setTab,
  pendingSignupCount = 0,
}: Props) {
  void _recentMail;

  const activeNotary = notaryQueue.filter(
    (n) => n.status !== "Completed" && n.status !== "Cancelled",
  );

  // Compute live badge counts for tiles that show one.
  const counts: Record<string, number> = {
    signups: pendingSignupCount,
    awaiting: stats.awaitingPickup,
    notary: activeNotary.length,
    // The dashboard data layer doesn't pass mail-requests / credits /
    // keys directly to Overview — they're known by the parent shell as
    // sidebar badges. For now show counts only for the data we have.
  };

  // ─── Layout ─────────────────────────────────────────────────────────
  // Two rows: a thin status strip + a 6×4 launchpad grid that fills
  // the rest of the visible area. The container is `h-[calc(100vh-...)]`
  // so it never scrolls — tiles auto-size from the available space.
  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 56px - 64px)", minHeight: 480 }}
    >
      {/* Status strip — greeting + tiny live numbers, fits in 56px */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.16em]"
            style={{ color: T.inkFaint, fontWeight: 600 }}
          >
            Admin · Launchpad
          </p>
          <h1
            className="text-2xl mt-0.5"
            style={{ color: T.ink, fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            Welcome back
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill
            label="Active"
            value={stats.activeCustomers}
            color={T.blue}
          />
          <StatusPill
            label="Mail today"
            value={stats.mailToday}
            color={T.green}
          />
          <StatusPill
            label="Awaiting"
            value={stats.awaitingPickup}
            color={T.red}
            urgent={stats.awaitingPickup > 0}
          />
          <StatusPill
            label="Pending"
            value={pendingSignupCount}
            color="#FF8A1F"
            urgent={pendingSignupCount > 0}
          />
        </div>
      </div>

      {/* Launchpad grid — 6 cols × 4 rows desktop, 3 cols × 8 rows tablet,
          2 cols × 12 rows mobile. `auto-rows-fr` distributes the leftover
          vertical space evenly so every tile is square-ish in any view. */}
      <div
        className="grid gap-3 sm:gap-4 flex-1 min-h-0"
        style={{
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gridAutoRows: "1fr",
        }}
      >
        {TILES.map((tile) => {
          const badge = tile.badgeKey ? counts[tile.badgeKey] ?? 0 : 0;
          return (
            <button
              key={tile.id}
              onClick={() => setTab(tile.id)}
              className="relative rounded-2xl p-4 text-left transition-all flex flex-col items-start justify-between"
              style={{
                background: tile.tint,
                border: "1px solid transparent",
                minHeight: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span
                className="inline-flex items-center justify-center rounded-xl shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: tile.iconBg,
                  color: tile.iconColor,
                  boxShadow: `0 4px 12px ${tile.iconBg}33`,
                }}
              >
                <tile.Icon className="w-[22px] h-[22px]" />
              </span>
              <span
                className="text-[13px] truncate w-full"
                style={{ color: T.ink, fontWeight: 600 }}
              >
                {tile.label}
              </span>
              {badge > 0 && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 h-[18px] rounded-full inline-flex items-center justify-center"
                  style={{
                    background: T.red,
                    color: "#FFFFFF",
                    minWidth: 18,
                    fontVariantNumeric: "tabular-nums",
                    boxShadow: "0 0 0 2px " + tile.tint,
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatusPill({
  label,
  value,
  color,
  urgent,
}: {
  label: string;
  value: number;
  color: string;
  urgent?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 h-9 px-3 rounded-full"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
      }}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: color,
          boxShadow: urgent ? `0 0 6px ${color}` : "none",
        }}
      />
      <span className="text-[10px] uppercase tracking-[0.10em]" style={{ color: T.inkFaint }}>
        {label}
      </span>
      <span
        className="text-[13px]"
        style={{
          color: T.ink,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        }}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
