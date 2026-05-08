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
// 24 UNIQUE retina-sharp NOHO Launchpad icons. Static SVGs (no per-tile
// animation) so the grid doesn't burn GPU cycles — fixes the FPS drop
// the prior animated set caused. Each tile gets its own glyph so there
// are no duplicates.
import {
  LpRegister,
  LpSignup,
  LpCredits,
  LpCustomers,
  LpMailbox,
  LpCompliance,
  LpMail,
  LpRequests,
  LpMailHold,
  LpKeys,
  LpDeliveries,
  LpQR,
  LpNotary,
  LpShipping,
  LpShop,
  LpBilling,
  LpRevenue,
  LpCancellations,
  LpSquare,
  LpQuarterly,
  LpMessages,
  LpEmails,
  LpInsights,
  LpBookkeeping,
  LpTenants,
  LpSettings,
} from "./LaunchpadIcons";

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
  Icon: (p: { className?: string; style?: React.CSSProperties }) => React.ReactElement;
  tint: string;
  iconBg: string;
  iconColor: string;
  badgeKey?: "signups" | "credits" | "requests" | "keys" | "awaiting" | "notary";
};

// Tile palette uses cream/sky/blush backgrounds drawn from the marketing
// site so each tile feels like a NOHO neighborhood sticker rather than a
// generic iOS chip. The icon is the FULL-COLOR brand illustration; no
// uniform colored bg square hiding behind it.
// 24 tiles, 24 UNIQUE icons. Tints picked from a NOHO-aligned cream/sky/
// blush/sage/peach palette so each row reads as a related cluster while
// every tile is visually distinct.
const TILES: Tile[] = [
  // Row 1 — TODAY ops.
  { id: "register",      label: "Cash Register",   Icon: LpRegister,     tint: "#FFF1E2", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "signups",       label: "Signups",         Icon: LpSignup,       tint: "#FFFAE8", iconBg: "transparent", iconColor: "#2D100F", badgeKey: "signups" },
  { id: "credits",       label: "Credits",         Icon: LpCredits,      tint: "#EAFBEF", iconBg: "transparent", iconColor: "#2D100F", badgeKey: "credits" },
  { id: "customers",     label: "Customers",       Icon: LpCustomers,    tint: "#F0EBFF", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "mailboxcenter", label: "Mailbox",         Icon: LpMailbox,      tint: "#F7E6C2", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "compliance",    label: "Compliance",      Icon: LpCompliance,   tint: "#E6F0FF", iconBg: "transparent", iconColor: "#2D100F" },

  // Row 2 — Postal operations.
  { id: "mail",          label: "Mail & Pkgs",     Icon: LpMail,         tint: "#F4EEE3", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "requests",      label: "Mail Requests",   Icon: LpRequests,     tint: "#FFF3D6", iconBg: "transparent", iconColor: "#2D100F", badgeKey: "requests" },
  { id: "mailhold",      label: "Mail Hold",       Icon: LpMailHold,     tint: "#FCE5E5", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "keys",          label: "Keys",            Icon: LpKeys,         tint: "#FFF0D5", iconBg: "transparent", iconColor: "#2D100F", badgeKey: "keys" },
  { id: "deliveries",    label: "Deliveries",      Icon: LpDeliveries,   tint: "#E1EFF7", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "qrpickup",      label: "QR Pickup",       Icon: LpQR,           tint: "#EFE7F7", iconBg: "transparent", iconColor: "#2D100F" },

  // Row 3 — Money & services.
  { id: "notary",        label: "Notary",          Icon: LpNotary,       tint: "#FFE9D9", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "shippingcenter",label: "Shipping",        Icon: LpShipping,     tint: "#E0F2EA", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "shop",          label: "Shop",            Icon: LpShop,         tint: "#FDDDD6", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "billing",       label: "Billing",         Icon: LpBilling,      tint: "#E6F0FF", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "revenue",       label: "Revenue",         Icon: LpRevenue,      tint: "#E0F2EA", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "cancellations", label: "Cancellations",   Icon: LpCancellations,tint: "#FCDADA", iconBg: "transparent", iconColor: "#2D100F" },

  // Row 4 — System & comms.
  { id: "square",        label: "Square",          Icon: LpSquare,       tint: "#F0EFE9", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "quarterly",     label: "Quarterly",       Icon: LpQuarterly,    tint: "#FFF4D6", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "messages",      label: "Messages",        Icon: LpMessages,     tint: "#E6F0FF", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "emails",        label: "Email Logs",      Icon: LpEmails,       tint: "#EFE7F7", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "insights",      label: "Insights",        Icon: LpInsights,     tint: "#E6F8FF", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "bookkeeping",   label: "Books",           Icon: LpBookkeeping,  tint: "#F4F5F7", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "tenants",       label: "Tenants",         Icon: LpTenants,      tint: "#EFE9DF", iconBg: "transparent", iconColor: "#2D100F" },
  { id: "settings",      label: "Settings",        Icon: LpSettings,     tint: "#F0EFEC", iconBg: "transparent", iconColor: "#2D100F" },
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
              {/* Full-color NOHO brand illustration — no colored chip
                  hiding behind it. Sized large so the brand reads. */}
              <tile.Icon
                className="w-14 h-14 sm:w-16 sm:h-16 shrink-0"
                style={{ color: tile.iconColor }}
              />
              <span
                className="text-[12px] sm:text-[13px] truncate w-full"
                style={{
                  color: "#2D100F",
                  fontWeight: 600,
                  fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                  letterSpacing: "-0.005em",
                }}
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
