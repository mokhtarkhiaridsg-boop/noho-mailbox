"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type SyncResult } from "@/app/actions/square";
import { updateMailStatus, logMail, setScanImage } from "@/app/actions/mail";
import { updateNotaryStatus } from "@/app/actions/notary";
import { updateDeliveryStatus } from "@/app/actions/admin";
import { logout } from "@/app/actions/auth";
import { setSiteConfigs } from "@/app/actions/site-config";

import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { AdminCustomersPanel } from "@/components/admin/AdminCustomersPanel";
import { AdminCompliancePanel } from "@/components/admin/AdminCompliancePanel";
import { AdminRequestsPanel } from "@/components/admin/AdminRequestsPanel";
import { AdminSignupRequestsPanel } from "@/components/admin/AdminSignupRequestsPanel";
import { AdminCreditRequestsPanel, type CreditRequestRow } from "@/components/admin/AdminCreditRequestsPanel";
import { AdminLabelOrdersPanel, type LabelOrderRow } from "@/components/admin/AdminLabelOrdersPanel";
import { AdminShippingCenterPanel } from "@/components/admin/AdminShippingCenterPanel";
import {
  AdminMailboxCenterPanel,
  type MailboxRenewalRow,
  type RenewalCustomer,
  type CustomerNoteRow,
  type MailboxKeyRow,
  type WalkInTodayStat,
} from "@/components/admin/AdminMailboxCenterPanel";
import { AdminPlanPricingCard } from "@/components/admin/AdminPlanPricingCard";
import { AdminPricingEditor } from "@/components/admin/AdminPricingEditor";
import AdminPromoBannerEditor from "@/components/admin/AdminPromoBannerEditor";
import AdminVirtualMailboxEditor from "@/components/admin/AdminVirtualMailboxEditor";
import {
  IconOverview, IconSignup, IconCredit, IconCustomers, IconCompliance,
  IconMail, IconClipboard, IconKey, IconBox, IconHold, IconQR, IconTruck,
  IconNotary, IconShop, IconReceipt, IconCancel, IconChat, IconEmail,
  IconRevenue, IconBuilding, IconShipping, IconSquare, IconSettings,
  IconLogout, IconExternal, IconCalendar, IconReport, IconRegister,
  IconUps, IconStamp, IconDhl,
} from "@/components/admin/AdminIcons";
import { AdminQuarterlyReportPanel } from "@/components/admin/AdminQuarterlyReportPanel";
import { AdminEmbeddedPortal } from "@/components/admin/AdminEmbeddedPortal";
import AdminMailerPanel from "@/components/admin/AdminMailerPanel";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminChatPanel } from "@/components/admin/AdminChatPanel";
import AdminCashRegister from "@/components/admin/AdminCashRegister";
import AdminDailyZReport from "@/components/admin/AdminDailyZReport";

type NavItem = { id: string; label: string; Icon: (p: { className?: string }) => React.ReactElement };
type NavGroup = { label: string; items: NavItem[] };

// Condensed admin nav — 4 sections instead of 8. Items that need urgent
// attention bubble to the "Today" group; everything else is grouped by
// domain. Total: 19 items (down from 27). Items that were redundant or
// rarely-used got folded into a single section header.
const navGroups: NavGroup[] = [
  {
    label: "Today",
    items: [
      { id: "overview",  label: "Overview",      Icon: IconOverview },
      { id: "register",  label: "Cash Register", Icon: IconRegister },
      { id: "zreport",   label: "Daily Report",  Icon: IconReport },
      { id: "signups",   label: "Signups",       Icon: IconSignup },
      { id: "credits",   label: "Credits",       Icon: IconCredit },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customers",      label: "Customers",      Icon: IconCustomers },
      { id: "mailboxcenter",  label: "Mailbox Center", Icon: IconBox },
      { id: "compliance",     label: "Compliance",     Icon: IconCompliance },
      // ID Expirations / CMRA Report / Bulk Onboard are reachable as
      // sub-tool buttons inside Mailbox Center — removed from the
      // sidebar to cut nav noise. Tabs themselves still resolve via URL.
    ],
  },
  {
    label: "Operations",
    items: [
      // Trimmed from 15 → 8. Mail Hold / Vacation Holds / Sticky Notes /
      // Occupancy Map / Suite Transfers fold into Mail & Packages or
      // Mailbox Center as sub-tool buttons. Key Ledger folds into Keys.
      // Pickup Queue folds into QR Pickup.
      { id: "mail",            label: "Mail & Packages", Icon: IconMail },
      { id: "requests",        label: "Mail Requests",   Icon: IconClipboard },
      { id: "keys",            label: "Keys",            Icon: IconKey },
      { id: "deliveries",      label: "Deliveries",      Icon: IconTruck },
      { id: "qrpickup",        label: "QR Pickup",       Icon: IconQR },
      { id: "lockboxboard",    label: "Lockbox Board",   Icon: IconBox },
      { id: "carrierpickup",   label: "Carrier Pickups", Icon: IconTruck },
      { id: "dropoffscan",     label: "Dropoff Scan",    Icon: IconQR },
      { id: "suitepins",       label: "Suite Pins",      Icon: IconClipboard },
      { id: "labelprinter",    label: "Label Printer",   Icon: IconReceipt },
      { id: "pickupvelocity",  label: "Pickup Velocity", Icon: IconCalendar },
      { id: "bulkforward",     label: "Bulk Forward",    Icon: IconShipping },
      { id: "notary",          label: "Notary",          Icon: IconNotary },
      { id: "shippingcenter",  label: "Shipping",        Icon: IconShipping },
      { id: "rateshop",        label: "Rate Shop",       Icon: IconReceipt },
      { id: "reshelf",         label: "Re-shelving",     Icon: IconBox },
      { id: "shop",            label: "Shop",            Icon: IconShop },
    ],
  },
  {
    label: "Money & Comms",
    items: [
      // Trimmed from 14 → 6. Cancellations / Disputes / Quarterly fold
      // into Billing. Daily Digest / Referrals / Affiliates fold into
      // Insights. Bulk Mailer + Email Logs fold into Messages.
      { id: "billing",        label: "Billing",       Icon: IconReceipt },
      { id: "revenue",        label: "Revenue",       Icon: IconReport },
      { id: "forecast",       label: "Forecast",      Icon: IconReport },
      { id: "bulkrenew",      label: "Bulk Renew",    Icon: IconCredit },
      { id: "square",         label: "Square",        Icon: IconSquare },
      { id: "messages",       label: "Messages",      Icon: IconChat },
      { id: "insights",       label: "Insights",      Icon: IconReport },
      { id: "bookkeeping",    label: "Bookkeeping",   Icon: IconReport },
    ],
  },
  {
    label: "System",
    items: [
      // Trimmed from 6 → 2. Partners / Tenants / Operating Hours /
      // Webhooks fold into Settings as sub-tool buttons.
      { id: "business",  label: "Business Solutions", Icon: IconBuilding },
      { id: "settings",  label: "Settings",           Icon: IconSettings },
    ],
  },
];

// Hidden nav items — reachable via URL or panel buttons but not shown
// in the sidebar. Kept here so getNavItem() can resolve labels/icons for
// the live breadcrumb when those tabs are active. Goal: shrink visible
// sidebar from 30+ items down to ~14 by folding rarely-used sub-tools
// into their parent panels (Apple HIG: ≤2 levels of hierarchy).
const hiddenNav: NavItem[] = [
  // Customers fold-ins
  { id: "idexpiring",      label: "ID Expirations",  Icon: IconCompliance },
  { id: "cmrareport",      label: "CMRA Report",     Icon: IconCompliance },
  { id: "kyctrust",        label: "KYC Trust",       Icon: IconCompliance },
  { id: "csvonboard",      label: "Bulk Onboard",    Icon: IconCustomers },
  // Operations fold-ins
  { id: "notarycheckin",   label: "Notary Check-in", Icon: IconNotary },
  { id: "mailhold",        label: "Mail Hold",       Icon: IconHold },
  { id: "vacationholds",   label: "Vacation Holds",  Icon: IconHold },
  { id: "keyledger",       label: "Key Ledger",      Icon: IconKey },
  { id: "pickupqueue",     label: "Pickup Queue",    Icon: IconCalendar },
  { id: "occupancy",       label: "Occupancy Map",   Icon: IconBox },
  { id: "mailboxtags",     label: "Mailbox Tags",    Icon: IconClipboard },
  { id: "insclaims",       label: "Insurance Claims", Icon: IconReceipt },
  { id: "carriermismatch", label: "Carrier Mismatch", Icon: IconCompliance },
  { id: "supplyforecast",  label: "Supply Forecast",  Icon: IconBox },
  { id: "gbphours",        label: "Google Hours",     Icon: IconBuilding },
  { id: "lobbywall",       label: "Lobby Wall",       Icon: IconClipboard },
  { id: "stickynotes",     label: "Sticky Notes",    Icon: IconClipboard },
  { id: "suitetransfers",  label: "Suite Transfers", Icon: IconBox },
  // Money & Comms fold-ins
  { id: "cancellations",   label: "Cancellations",   Icon: IconCancel },
  { id: "quarterly",       label: "Quarterly",       Icon: IconCalendar },
  { id: "emails",          label: "Email Logs",      Icon: IconEmail },
  { id: "mailer",          label: "Bulk Mailer",     Icon: IconEmail },
  { id: "kpidigest",       label: "Daily Digest",    Icon: IconReport },
  { id: "disputes",        label: "Disputes",        Icon: IconReceipt },
  { id: "referrals",       label: "Referrals",       Icon: IconReport },
  { id: "affiliates",      label: "Affiliates",      Icon: IconReport },
  // System fold-ins
  { id: "partners",        label: "Partners",        Icon: IconReport },
  { id: "tenants",         label: "Tenants",         Icon: IconBuilding },
  { id: "operatinghours",  label: "Operating Hours", Icon: IconCalendar },
  { id: "webhooks",        label: "Webhooks",        Icon: IconReport },
  { id: "deferredemails",  label: "Deferred Emails", Icon: IconEmail },
  { id: "backuphealth",    label: "Backup Health",   Icon: IconCompliance },
  { id: "mailerautoreply", label: "Auto-replies",    Icon: IconEmail },
  { id: "suitemaint",      label: "Suite Maintenance", Icon: IconBox },
  { id: "equipment",       label: "Equipment",       Icon: IconReport },
  { id: "dooraccess",      label: "Door Access",     Icon: IconKey },
  { id: "onboardvideo",    label: "Welcome Videos",  Icon: IconChat },
  { id: "supplies",        label: "Supplies",        Icon: IconShop },
  { id: "emaildeliv",      label: "Email Health",    Icon: IconEmail },
  { id: "cotm",            label: "Customer of Month", Icon: IconReport },
  { id: "cotmspotlight",   label: "CotM Spotlights",  Icon: IconReport },
  { id: "renewaloffers",   label: "Renewal Offers",  Icon: IconCredit },
  { id: "referralleader",  label: "Referral Leaderboard", Icon: IconReport },
  { id: "marketingflyer",  label: "Marketing Flyer", Icon: IconReport },
  { id: "mailboxtours",    label: "Tour Bookings",   Icon: IconCalendar },
  { id: "weeklynewsletter", label: "Weekly Newsletter", Icon: IconEmail },
  { id: "bulksms",          label: "Bulk SMS",          Icon: IconChat },
  { id: "espsync",          label: "Mailing-list export", Icon: IconEmail },
];

// Flat list for mobile pills + label lookup. Includes hidden items so
// the breadcrumb still renders correctly when their tabs are active.
const flatNav: NavItem[] = [
  ...navGroups.flatMap((g) => g.items),
  ...hiddenNav,
];
// Visible-only flat nav for the mobile pill nav row — keeps the row
// short by excluding hidden tabs.
const visibleFlatNav: NavItem[] = navGroups.flatMap((g) => g.items);
function getNavItem(id: string) {
  return flatNav.find((i) => i.id === id);
}
// Find which group label contains the given tab id (for default-expand state).
function groupLabelForTab(id: string): string {
  for (const g of navGroups) {
    if (g.items.some((it) => it.id === id)) return g.label;
  }
  return navGroups[0]?.label ?? "Today";
}

// ─── Unified Command Bar ────────────────────────────────────────────────
//
// Clean white top bar — iPad-OS aesthetic. Avatar + name dropdown on the
// left, Quick search input centered on the right. The cream gradient and
// brand chrome are GONE; this bar prioritizes calm whitespace and single
// blue accent (#1976FF) for primary affordances. No more stacked breadcrumb
// or tiny todo-chip clutter — those move into the search palette and the
// profile menu.
function MailOsCommandBar(props: {
  signupCount: number;
  creditCount: number;
  mailRequestCount: number;
  keyRequestCount: number;
  currentTabLabel: string;
  onOpenPalette: () => void;
  sidebarHidden: boolean;
  onToggleSidebar: () => void;
  /** "Owner" or "Admin" — shown as a small badge before the profile menu. */
  roleLabel: string;
}) {
  void props.signupCount;
  void props.creditCount;
  void props.mailRequestCount;
  void props.keyRequestCount;
  void props.currentTabLabel;

  return (
    <header
      className="sticky top-0 z-50 h-14 px-4 sm:px-6 flex items-center gap-3 select-none"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #ECEEF1",
      }}
      role="banner"
      aria-label="Admin command bar"
    >
      {/* Sidebar toggle — Apple HIG: let people hide the sidebar to
          reduce distraction or reclaim space. Visible only on lg+ where
          the sidebar lives; mobile uses the pill nav so toggle is N/A. */}
      <button
        type="button"
        onClick={props.onToggleSidebar}
        className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors"
        style={{ background: "transparent", color: "#3B4252" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#F4F5F7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        aria-label={props.sidebarHidden ? "Show sidebar" : "Hide sidebar"}
        title={props.sidebarHidden ? "Show sidebar (⌘.)" : "Hide sidebar (⌘.)"}
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4 V20" />
          {!props.sidebarHidden && <path d="M5.5 8 H7 M5.5 12 H7 M5.5 16 H7" />}
        </svg>
      </button>

      {/* Left: logo + live breadcrumb. The Admin Console pill + redundant
          breadcrumb from the old 64px header are gone — the breadcrumb
          here updates live with the current tab. */}
      <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Home">
        <Logo className="h-7 w-auto transition-transform duration-200 group-hover:scale-[1.04]" />
      </Link>

      {/* Live breadcrumb — when sidebar is hidden, this is the only
          orientation cue the operator has. Always shown. */}
      <span
        className="hidden md:inline-flex items-center gap-2 ml-1 text-[13px]"
        style={{ color: "#3B4252" }}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 6 L15 12 L9 18" />
        </svg>
        <span style={{ fontWeight: 500 }}>{props.currentTabLabel}</span>
      </span>

      <span className="flex-1" />

      {/* Center-right: Quick search input — iPad-OS style with subtle
          background. Click anywhere on it to open the command palette. */}
      <button
        type="button"
        onClick={props.onOpenPalette}
        className="hidden md:inline-flex items-center gap-2.5 h-9 px-3.5 rounded-full text-[13px] transition-colors"
        style={{
          background: "#F4F5F7",
          color: "#7A8290",
          border: "1px solid transparent",
          minWidth: 280,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#EDEFF2"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#F4F5F7"; }}
        aria-label="Quick search (⌘K)"
        title="Search · jump · run actions"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#1976FF" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m17 17 4 4" />
        </svg>
        <span className="flex-1 text-left">Quick search</span>
        <kbd
          className="text-[10px] font-mono px-1.5 h-5 rounded inline-flex items-center"
          style={{ background: "#FFFFFF", color: "#9AA1AC", border: "1px solid #E4E6EA" }}
        >
          ⌘K
        </kbd>
      </button>

      <Link
        href="/dashboard"
        className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium px-3 h-9 rounded-full transition-colors"
        style={{ color: "#3B4252", background: "transparent" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#F4F5F7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        title="Switch to member view"
      >
        <IconExternal className="w-3.5 h-3.5" />
        Member view
      </Link>
      {/* Role badge — small pill before the profile avatar so the bureau
          owner always sees their title (Owner) and a regular admin sees
          theirs (Admin). Cosmetic only; permissions are identical. */}
      <span
        className="hidden md:inline-flex items-center h-7 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.10em]"
        style={{
          background: props.roleLabel === "Owner" ? "rgba(25,118,255,0.10)" : "#F4F5F7",
          color: props.roleLabel === "Owner" ? "#1976FF" : "#7A8290",
        }}
        title={props.roleLabel === "Owner" ? "Bureau owner" : "Admin"}
      >
        {props.roleLabel}
      </span>
      <ProfileDropdown />
    </header>
  );
}

// ─── Command Palette (⌘K) ───────────────────────────────────────────────
//
// Modal overlay opened from MailOsCommandBar's center pill or by ⌘K /
// Ctrl+K. Filters across all 19 nav items + quick actions. Up/Down to
// navigate, Enter to execute, Esc to close. Input auto-focuses on open.
type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  Icon?: (p: { className?: string }) => React.ReactElement;
  run: () => void;
};
function CommandPalette(props: {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset on open + focus the input.
  useEffect(() => {
    if (props.open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [props.open]);

  // Filter — substring match across label + group + hint, simple and
  // fast. Group order is preserved.
  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.actions;
    return props.actions.filter((a) => {
      const hay = `${a.label} ${a.group} ${a.hint ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  })();

  // Clamp cursor to filtered length whenever filter changes.
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(Math.max(0, filtered.length - 1));
  }, [filtered.length, cursor]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[cursor];
      if (pick) {
        pick.run();
        props.onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  }

  if (!props.open) return null;

  // Group rendering — collapse into sections with a small label header.
  const grouped: Record<string, PaletteAction[]> = {};
  for (const a of filtered) {
    if (!grouped[a.group]) grouped[a.group] = [];
    grouped[a.group].push(a);
  }

  let runningIndex = 0;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-20 sm:pt-24"
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={props.onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.12)",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.7) inset",
          maxHeight: "min(72vh, 560px)",
        }}
      >
        {/* Search input row */}
        <div
          className="flex items-center gap-3 px-4 h-12 shrink-0"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" style={{ color: "rgba(0,0,0,0.5)" }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6" />
            <path d="m17 17 4 4" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a panel, run an action…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-[14px] font-semibold focus:outline-none"
            style={{ color: "#2D100F" }}
          />
          <kbd
            className="text-[10px] font-mono px-1.5 h-5 rounded inline-flex items-center shrink-0"
            style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,0,0,0.1)" }}
          >
            Esc
          </kbd>
        </div>

        {/* Filtered results */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-[12px]" style={{ color: "rgba(0,0,0,0.5)" }}>
              No matches for &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="py-1">
              <div
                className="px-4 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                {groupName}
              </div>
              <ul>
                {items.map((a) => {
                  const idx = runningIndex++;
                  const active = idx === cursor;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => { a.run(); props.onClose(); }}
                        className="w-full flex items-center gap-3 px-4 h-10 text-left transition-colors"
                        style={{
                          background: active ? "rgba(51,116,133,0.08)" : "transparent",
                          color: "#2D100F",
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            background: active ? "#337485" : "rgba(0,0,0,0.05)",
                            color: active ? "#fff" : "rgba(0,0,0,0.7)",
                            transition: "all 150ms",
                          }}
                        >
                          {a.Icon ? <a.Icon className="w-3.5 h-3.5" /> : (
                            <svg viewBox="0 0 12 12" className="w-2 h-2" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-bold truncate">{a.label}</span>
                          {a.hint && (
                            <span className="block text-[10px] truncate" style={{ color: "rgba(0,0,0,0.5)" }}>{a.hint}</span>
                          )}
                        </span>
                        {active && (
                          <kbd
                            className="text-[10px] font-mono px-1.5 h-5 rounded inline-flex items-center shrink-0"
                            style={{ background: "#337485", color: "#fff" }}
                          >
                            ↵
                          </kbd>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div
          className="flex items-center gap-3 px-4 h-8 text-[10px] font-semibold shrink-0"
          style={{
            background: "rgba(247,230,194,0.4)",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            color: "rgba(0,0,0,0.55)",
          }}
        >
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono text-[9px] px-1 h-4 rounded inline-flex items-center" style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)" }}>↑↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono text-[9px] px-1 h-4 rounded inline-flex items-center" style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)" }}>↵</kbd>
            run
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono text-[9px] px-1 h-4 rounded inline-flex items-center" style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)" }}>esc</kbd>
            close
          </span>
          <span className="ml-auto opacity-60">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
import { AdminKeysPanel } from "@/components/admin/AdminKeysPanel";
import { AdminMailPanel } from "@/components/admin/AdminMailPanel";
import { AdminDeliveriesPanel } from "@/components/admin/AdminDeliveriesPanel";
import { AdminShopPanel } from "@/components/admin/AdminShopPanel";
import { AdminNotaryPanel } from "@/components/admin/AdminNotaryPanel";
import { AdminMessagesPanel } from "@/components/admin/AdminMessagesPanel";
import { AdminEmailLogsPanel } from "@/components/admin/AdminEmailLogsPanel";
import { AdminRevenuePanel } from "@/components/admin/AdminRevenuePanel";
import { AdminBusinessPanel } from "@/components/admin/AdminBusinessPanel";
import { AdminSquarePanel } from "@/components/admin/AdminSquarePanel";
import { AdminShippoPanel } from "@/components/admin/AdminShippoPanel";
import AdminBillingPanel from "@/components/admin/AdminBillingPanel";
import { AdminCancellationsPanel } from "@/components/admin/AdminCancellationsPanel";
import { AdminPartnersPanel, type PartnerRow } from "@/components/admin/AdminPartnersPanel";
import { AdminTenantsPanel, type TenantRow } from "@/components/admin/AdminTenantsPanel";
import { AdminMailHoldPanel } from "@/components/admin/AdminMailHoldPanel";
import AdminVacationHoldPanel from "@/components/admin/AdminVacationHoldPanel";
import AdminOperatingHoursPanel from "@/components/admin/AdminOperatingHoursPanel";
import AdminInsightsPanel from "@/components/admin/AdminInsightsPanel";
import AdminKeyLedgerPanel from "@/components/admin/AdminKeyLedgerPanel";
import AdminReferralsPanel from "@/components/admin/AdminReferralsPanel";
import AdminCsvOnboardPanel from "@/components/admin/AdminCsvOnboardPanel";
import AdminPickupAppointmentsPanel from "@/components/admin/AdminPickupAppointmentsPanel";
import AdminIdExpiringPanel from "@/components/admin/AdminIdExpiringPanel";
import AdminWebhooksPanel from "@/components/admin/AdminWebhooksPanel";
import AdminKpiDigestPanel from "@/components/admin/AdminKpiDigestPanel";
import AdminStorageDisputesPanel from "@/components/admin/AdminStorageDisputesPanel";
import AdminBookkeepingPanel from "@/components/admin/AdminBookkeepingPanel";
import AdminCmraReportPanel from "@/components/admin/AdminCmraReportPanel";
import AdminSuiteOccupancyPanel from "@/components/admin/AdminSuiteOccupancyPanel";
import AdminPinnedNotesPanel from "@/components/admin/AdminPinnedNotesPanel";
import AdminAffiliateEarningsPanel from "@/components/admin/AdminAffiliateEarningsPanel";
import AdminSuiteTransfersPanel from "@/components/admin/AdminSuiteTransfersPanel";
import AdminLabelPrinterPanel from "@/components/admin/AdminLabelPrinterPanel";
import AdminPickupVelocityPanel from "@/components/admin/AdminPickupVelocityPanel";
import AdminBulkForwardPanel from "@/components/admin/AdminBulkForwardPanel";
import AdminDeferredEmailsPanel from "@/components/admin/AdminDeferredEmailsPanel";
import AdminBackupHealthPanel from "@/components/admin/AdminBackupHealthPanel";
import AdminMailerAutoReplyPanel from "@/components/admin/AdminMailerAutoReplyPanel";
import AdminSuiteMaintenancePanel from "@/components/admin/AdminSuiteMaintenancePanel";
import AdminEquipmentPanel from "@/components/admin/AdminEquipmentPanel";
import AdminDoorAccessPanel from "@/components/admin/AdminDoorAccessPanel";
import AdminOnboardingVideosPanel from "@/components/admin/AdminOnboardingVideosPanel";
import AdminSuppliesPanel from "@/components/admin/AdminSuppliesPanel";
import AdminEmailDeliverabilityPanel from "@/components/admin/AdminEmailDeliverabilityPanel";
import AdminCustomerOfMonthPanel from "@/components/admin/AdminCustomerOfMonthPanel";
import AdminRenewalOffersPanel from "@/components/admin/AdminRenewalOffersPanel";
import AdminPrintStationPicker from "@/components/admin/AdminPrintStationPicker";
import AdminReferralLeaderboardPanel from "@/components/admin/AdminReferralLeaderboardPanel";
import AdminMarketingFlyerPanel from "@/components/admin/AdminMarketingFlyerPanel";
import AdminWeeklyNewsletterPanel from "@/components/admin/AdminWeeklyNewsletterPanel";
import AdminBulkSmsPanel from "@/components/admin/AdminBulkSmsPanel";
import AdminCotmSpotlightPanel from "@/components/admin/AdminCotmSpotlightPanel";
import AdminLockboxBoardPanel from "@/components/admin/AdminLockboxBoardPanel";
import AdminEspSyncPanel from "@/components/admin/AdminEspSyncPanel";
import AdminCarrierPickupPanel from "@/components/admin/AdminCarrierPickupPanel";
import AdminNotaryCheckInPanel from "@/components/admin/AdminNotaryCheckInPanel";
import AdminDropoffBarcodePanel from "@/components/admin/AdminDropoffBarcodePanel";
import AdminMailboxToursPanel from "@/components/admin/AdminMailboxToursPanel";
import AdminSuitePinsPanel from "@/components/admin/AdminSuitePinsPanel";
import AdminRateShopPanel from "@/components/admin/AdminRateShopPanel";
import AdminReshelfPanel from "@/components/admin/AdminReshelfPanel";
import AdminKycTrustPanel from "@/components/admin/AdminKycTrustPanel";
import AdminRevenueForecastPanel from "@/components/admin/AdminRevenueForecastPanel";
import AdminBulkRenewalPanel from "@/components/admin/AdminBulkRenewalPanel";
import AdminMailboxTagsPanel from "@/components/admin/AdminMailboxTagsPanel";
import AdminInsuranceClaimsPanel from "@/components/admin/AdminInsuranceClaimsPanel";
import AdminCarrierMismatchPanel from "@/components/admin/AdminCarrierMismatchPanel";
import AdminSupplyForecastPanel from "@/components/admin/AdminSupplyForecastPanel";
import AdminGbpHoursPanel from "@/components/admin/AdminGbpHoursPanel";
import AdminLobbyWallPanel from "@/components/admin/AdminLobbyWallPanel";
import { AdminQRPickupPanel } from "@/components/admin/AdminQRPickupPanel";
import { LogMailModal } from "@/components/admin/LogMailModal";
import { AddCustomerModal } from "@/components/admin/AddCustomerModal";
import { EditCustomerModal } from "@/components/admin/EditCustomerModal";
import { NewApptModal } from "@/components/admin/NewApptModal";
import { NewClientModal } from "@/components/admin/NewClientModal";
import { SubToolButton } from "@/components/admin/SubToolButton";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  plan: string;
  planTerm?: string | null;
  suiteNumber: string;
  status: string;
  createdAt: string;
  mailCount: number;
  packageCount: number;
  mailboxStatus?: string;
  kycStatus?: string;
  kycForm1583Url?: string | null;
  kycIdImageUrl?: string | null;
  kycIdImage2Url?: string | null;
  securityDepositCents?: number;
  planDueDate?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  cardExpiry?: string | null;
  cardholderName?: string | null;
  cardDiscountPct?: number;
  // CMRA / ID details
  idPrimaryType?: string | null;
  idSecondaryType?: string | null;
  idPrimaryExpDate?: string | null;
  idSecondaryExpDate?: string | null;
  idPrimaryNumber?: string | null;
  idSecondaryNumber?: string | null;
  idPrimaryIssuer?: string | null;
  idSecondaryIssuer?: string | null;
  // Box ownership
  boxType?: string | null;
  businessName?: string | null;
  businessOwnerName?: string | null;
  businessOwnerRelation?: string | null;
  businessOwnerPhone?: string | null;
};

type ComplianceRow = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  kycStatus: string;
  kycForm1583Url: string | null;
  kycIdImageUrl: string | null;
  mailboxStatus: string;
  suiteNumber: string | null;
  createdAt: string;
};

type MailRequestRow = {
  id: string;
  kind: string;
  status: string;
  notes: string | null;
  createdAt: string;
  userName: string;
  suiteNumber: string | null;
  mailFrom: string;
};

type KeyRequestRow = {
  id: string;
  status: string;
  reason: string;
  feeCents: number;
  createdAt: string;
  userId: string;
  userName: string;
};

type MessageThreadRow = {
  id: string;
  subject: string;
  lastMessageAt: string;
  preview: string;
  senderId: string | null;
  participantIds: string;
  unreadForUserIds: string;
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  createdAt: string;
};

type MailItem = {
  id: string;
  customerName: string;
  suiteNumber: string;
  from: string;
  type: string;
  date: string;
  status: string;
};

type NotaryItem = {
  id: string;
  customerName: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

type DeliveryOrder = {
  id: string;
  customerName: string;
  suiteNumber: string;
  destination: string;
  zone: string;
  price: number;
  itemType: string;
  courier: string;
  status: string;
  date: string;
};

type ShopOrder = {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: string;
  date: string;
};

type SyncLogEntry = {
  id: string;
  syncType: string;
  status: string;
  itemsSynced: number;
  errors: string | null;
  startedAt: string;
  completedAt: string | null;
};

type SquareStatus = {
  configured: boolean;
  environment: "production" | "sandbox";
  linkedCustomers: number;
  totalPayments: number;
  catalogItems: number;
  totalRevenue: number;
  recentLogs: SyncLogEntry[];
};

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  sourceType: string | null;
  note: string | null;
  squareCreatedAt: string;
  userName: string | null;
};

type Stats = {
  activeCustomers: number;
  mailToday: number;
  awaitingPickup: number;
  planDistribution: {
    basic: number;
    business: number;
    premium: number;
  };
};

type Props = {
  customers: Customer[];
  recentMail: MailItem[];
  notaryQueue: NotaryItem[];
  deliveryOrders: DeliveryOrder[];
  shopOrders: ShopOrder[];
  stats: Stats;
  squareStatus: SquareStatus;
  complianceQueue?: ComplianceRow[];
  mailRequests?: MailRequestRow[];
  keyRequests?: KeyRequestRow[];
  recentPayments: PaymentRow[];
  messageThreads?: MessageThreadRow[];
  contactSubmissions?: ContactRow[];
  partners?: PartnerRow[];
  tenants?: TenantRow[];
  siteSettings?: Record<string, string>;
  shippoConfigured?: boolean;
  recentShippoLabels?: Array<{
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
  }>;
  creditRequests?: CreditRequestRow[];
  labelOrders?: LabelOrderRow[];
  mailboxRenewals?: MailboxRenewalRow[];
  customerNotes?: CustomerNoteRow[];
  mailboxKeys?: MailboxKeyRow[];
  walkInToday?: WalkInTodayStat;
  mrrCents?: number;
  dormantCount?: number;
  planDistribution?: Record<string, number>;
  tillWeek?: {
    completedCents: number;
    refundedCents: number;
    cashCents: number;
    cardCents: number;
    squareCents: number;
    count: number;
    refundCount: number;
  };
  churn30dCount?: number;
  churnAnnualizedPct?: number;
  forwardingByState?: Record<string, number>;
  adminId?: string;
  /** Role label shown in the top-bar profile area. "Owner" for emails
   *  in OWNER_EMAILS, otherwise "Admin". Defaults to "Admin". */
  roleLabel?: string;
};

function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", escape);
    }
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  // ─── Brand-consistent palette ─── kills the legacy #162d3a slate-blue
  // that was bleeding into the dropdown chrome.
  const INK = "#2D100F";
  const CREAM = "#F7E6C2";
  const SURFACE = "#FFFFFF";
  const BORDER = "#ECEEF1";
  const BLUE = "#337485";
  const RED = "#E70013";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 pl-0.5 pr-2 h-8 rounded-full transition-all"
        style={{
          background: open ? "rgba(0,0,0,0.06)" : "transparent",
          border: `1px solid ${open ? "rgba(0,0,0,0.10)" : "transparent"}`,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{
            background: INK,
            color: CREAM,
            border: `1px solid ${INK}`,
          }}
        >
          NM
        </span>
        <svg
          viewBox="0 0 12 12"
          className="w-2.5 h-2.5 transition-transform duration-150"
          style={{ color: "rgba(0,0,0,0.5)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-64 rounded-md overflow-hidden z-[100] origin-top-right"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
            animation: "profile-pop 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Header — admin identity card */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              borderBottom: `1px solid ${BORDER}`,
              background: "linear-gradient(180deg, #FFFCF7 0%, #FFFFFF 100%)",
            }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
              style={{
                background: `linear-gradient(135deg, ${INK} 0%, #4A1F1C 100%)`,
                color: CREAM,
                boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 4px rgba(0,0,0,0.18)",
              }}
            >
              NM
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black truncate" style={{ color: INK }}>Admin · NOHO Mailbox</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.5)" }}>
                Signed in as administrator
              </p>
            </div>
          </div>

          {/* Section: Quick switches */}
          <DropdownSection label="Switch to">
            <DropdownLink href="/dashboard" icon={(
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="6" r="2.6" />
                <path d="M2.5 14c0-3 3-5 5.5-5s5.5 2 5.5 5" />
              </svg>
            )}>
              Member view
            </DropdownLink>
            <DropdownLink href="/" icon={(
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8 L8 2 L14 8 M4 7 L4 14 L12 14 L12 7" />
              </svg>
            )}>
              Public site
            </DropdownLink>
          </DropdownSection>

          {/* Section: Session */}
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              role="menuitem"
              onClick={() => logout()}
              className="w-full flex items-center gap-2.5 px-4 h-10 text-xs font-bold transition-colors text-left"
              style={{ color: RED }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(231,0,19,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 14 L2 14 L2 2 L7 2 M10 5l3 3-3 3 M5 8 L13 8" />
              </svg>
              Sign out
            </button>
          </div>
          <style>{`
            @keyframes profile-pop {
              0%   { opacity: 0; transform: translateY(-4px) scale(0.96); }
              100% { opacity: 1; transform: translateY(0)    scale(1);    }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// PanelWithTools — wraps any admin panel with a row of sub-tool jump
// buttons at the top. Apple HIG: keep nav ≤2 levels; sub-tools belong
// with their parent panel, not at top level. The wrapper itself is a
// flex column so the wrapped panel scrolls inside its own pane.
function PanelWithTools({
  tools,
  setTab,
  children,
}: {
  tools: Array<{ label: string; id: string; count?: number; danger?: boolean }>;
  setTab: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    // iter-144 — natural page flow.
    <div className="flex flex-col gap-3">
      <div className="shrink-0 flex flex-wrap gap-2">
        {tools.map((t) => (
          <SubToolButton
            key={t.id}
            icon={
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12 H19" />
                <path d="M13 6 L19 12 L13 18" />
              </svg>
            }
            label={t.label}
            count={t.count}
            danger={t.danger}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>
      {/* iter-144 — natural page flow, no internal scroll region. */}
      <div className="-mx-1 px-1 pb-2">
        {children}
      </div>
    </div>
  );
}

function DropdownSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p
        className="px-4 pt-1.5 pb-0.5 text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: "rgba(0,0,0,0.42)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function DropdownLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 h-9 text-xs font-bold transition-colors"
      style={{ color: "#2D100F" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(247,230,194,0.55)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span className="w-5 h-5 inline-flex items-center justify-center" style={{ color: "rgba(0,0,0,0.65)" }}>
        {icon}
      </span>
      {children}
    </Link>
  );
}

export default function AdminDashboardClient({ customers, recentMail, notaryQueue, deliveryOrders, shopOrders, stats, squareStatus, recentPayments, complianceQueue = [], mailRequests = [], keyRequests = [], messageThreads = [], contactSubmissions = [], partners = [], tenants = [], siteSettings = {}, shippoConfigured = false, recentShippoLabels = [], creditRequests = [], labelOrders = [], mailboxRenewals = [], customerNotes = [], mailboxKeys = [], walkInToday, mrrCents = 0, dormantCount = 0, planDistribution, tillWeek, churn30dCount = 0, churnAnnualizedPct = 0, forwardingByState, adminId = "", roleLabel = "Admin" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab is URL-synced: ?tab=mailboxcenter — so deep-links work, refresh
  // preserves the panel, and the browser back/forward buttons step through
  // panel history instead of escaping to /. Initial value reads from the URL.
  // Normalize hyphenated slugs (`mailbox-center`) to the camelcase IDs used
  // internally (`mailboxcenter`) so old bookmarks / external links resolve.
  // Hidden tab IDs — reachable via URL or via sub-tool buttons inside
  // other panels (e.g. Mailbox Center → ID Expirations) but NOT shown in
  // the sidebar to keep the nav clean. Mirrors the hiddenNav array
  // declared at module scope (kept in sync by hand — small enough list).
  const HIDDEN_TAB_IDS = hiddenNav.map((n) => n.id);
  const ALL_TAB_IDS = [
    ...navGroups.flatMap((g) => g.items.map((i) => i.id)),
    ...HIDDEN_TAB_IDS,
  ];
  function normalizeTabSlug(raw: string | null): string {
    if (!raw) return "overview";
    if (ALL_TAB_IDS.includes(raw)) return raw;
    const stripped = raw.replace(/-/g, "").toLowerCase();
    const match = ALL_TAB_IDS.find((id) => id.toLowerCase() === stripped);
    return match ?? "overview";
  }
  const [tab, setTabState] = useState(() => normalizeTabSlug(searchParams.get("tab")));

  // Which sidebar group is expanded — accordion-style, single open at a time.
  // Defaults to the group containing the active tab so users see siblings.
  const [expandedGroup, setExpandedGroup] = useState<string>(() => groupLabelForTab(normalizeTabSlug(searchParams.get("tab"))));

  // Sidebar visibility — Apple HIG: "Consider letting people hide the
  // sidebar. People sometimes want to hide the sidebar to create more
  // room for content details or to reduce distraction." Persisted in
  // localStorage so the choice survives reloads. Always defaults to
  // visible to keep the sidebar discoverable.
  const [sidebarHidden, setSidebarHidden] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("noho-admin-sidebar-hidden");
      if (stored === "true") setSidebarHidden(true);
    } catch { /* localStorage unavailable */ }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("noho-admin-sidebar-hidden", sidebarHidden ? "true" : "false");
    } catch { /* localStorage unavailable */ }
  }, [sidebarHidden]);

  // When the URL changes (back/forward/external link), pull the tab back in.
  useEffect(() => {
    const next = normalizeTabSlug(searchParams.get("tab"));
    setTabState((prev) => (prev === next ? prev : next));
    setExpandedGroup(groupLabelForTab(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  // iter-86: Find-anything admin omnibox. Cmd+K is already owned by the
  // legacy nav-only CommandPalette below; this one searches across
  // entities (customers, packages, dropoffs, labels) and lives behind
  // Cmd+Shift+F (or just "/" when no input has focus).
  const [omniOpen, setOmniOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+Shift+F — "Find anything" everywhere.
      if (meta && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setOmniOpen((v) => !v);
        return;
      }
      // "/" opens it too (when not focused in an input/textarea).
      if (e.key === "/" && !omniOpen) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        setOmniOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [omniOpen]);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  // Modal and filter state
  const [mailFilter, setMailFilter] = useState("All");
  const [showLogMailModal, setShowLogMailModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [logMailForm, setLogMailForm] = useState({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
  const [logMailPhotoUploading, setLogMailPhotoUploading] = useState(false);
  // AddCustomerModal is now self-contained — no parent state needed

  // View / Edit Customer modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "",
    suiteNumber: "", plan: "", planTerm: "",
    mailboxStatus: "", planDueDate: "",
    depositCents: 0, kycStatus: "",
    cardLast4: "", cardBrand: "", cardExpiry: "", cardholderName: "", cardDiscountPct: 0,
    kycForm1583Url: null as string | null,
    kycIdImageUrl: null as string | null,
    kycIdImage2Url: null as string | null,
    idPrimaryType: "",
    idSecondaryType: "",
    idPrimaryExpDate: "",
    idSecondaryExpDate: "",
    idPrimaryNumber: "",
    idSecondaryNumber: "",
    idPrimaryIssuer: "",
    idSecondaryIssuer: "",
    boxType: "Personal",
    businessName: "",
    businessOwnerName: "",
    businessOwnerRelation: "",
    businessOwnerPhone: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Wrapper for tab changes — updates URL (so back-button works), closes the
  // customer modal (so it doesn't bleed across panels), and clears any local
  // search query. Use this everywhere instead of raw setTabState.
  const setTab = useCallback(
    (id: string) => {
      setTabState(id);
      setViewCustomer(null);
      // Auto-expand the sidebar group containing this tab so siblings
      // are immediately visible. Hidden-tab IDs return their visible
      // parent label via groupLabelForTab — we leave the group as-is
      // since hidden tabs don't appear in the sidebar anyway.
      setExpandedGroup(groupLabelForTab(id));
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Esc closes the customer modal — basic web a11y expectation. We attach the
  // listener only while the modal is mounted so it doesn't fight other dialogs.
  useEffect(() => {
    if (!viewCustomer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewCustomer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewCustomer]);

  function openCustomer(c: Customer) {
    setViewCustomer(c);
    setEditError(null);
    setEditSuccess(false);
    setEditForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      suiteNumber: c.suiteNumber ?? "",
      plan: c.plan ?? "",
      planTerm: c.planTerm ?? "",
      mailboxStatus: c.mailboxStatus ?? "Pending",
      planDueDate: c.planDueDate ?? "",
      depositCents: c.securityDepositCents ?? 0,
      kycStatus: c.kycStatus ?? "Pending",
      cardLast4: c.cardLast4 ?? "",
      cardBrand: c.cardBrand ?? "",
      cardExpiry: c.cardExpiry ?? "",
      cardholderName: c.cardholderName ?? "",
      cardDiscountPct: c.cardDiscountPct ?? 0,
      kycForm1583Url: c.kycForm1583Url ?? null,
      kycIdImageUrl: c.kycIdImageUrl ?? null,
      kycIdImage2Url: c.kycIdImage2Url ?? null,
      idPrimaryType: c.idPrimaryType ?? "",
      idSecondaryType: c.idSecondaryType ?? "",
      idPrimaryExpDate: c.idPrimaryExpDate ?? "",
      idSecondaryExpDate: c.idSecondaryExpDate ?? "",
      idPrimaryNumber: c.idPrimaryNumber ?? "",
      idSecondaryNumber: c.idSecondaryNumber ?? "",
      idPrimaryIssuer: c.idPrimaryIssuer ?? "",
      idSecondaryIssuer: c.idSecondaryIssuer ?? "",
      boxType: c.boxType ?? "Personal",
      businessName: c.businessName ?? "",
      businessOwnerName: c.businessOwnerName ?? "",
      businessOwnerRelation: c.businessOwnerRelation ?? "",
      businessOwnerPhone: c.businessOwnerPhone ?? "",
    });
  }

  function addMonths(dateStr: string, months: number): string {
    const base = dateStr && new Date(dateStr) > new Date() ? new Date(dateStr) : new Date();
    base.setMonth(base.getMonth() + months);
    return base.toISOString().slice(0, 10);
  }

  // New Appointment modal
  const [showNewApptModal, setShowNewApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({ customer: "", date: "", time: "", type: "Acknowledgment" });

  // New Business Client modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", package: "Full Package" });

  // Inline edit for store settings — seeded from DB, saved back to DB
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editSettingValue, setEditSettingValue] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [storeInfo, setStoreInfo] = useState([
    { key: "store.name",    label: "Store Name", value: siteSettings["store.name"]    ?? "NOHO Mailbox" },
    { key: "store.address", label: "Address",    value: siteSettings["store.address"] ?? "5062 Lankershim Blvd, North Hollywood, CA 91601" },
    { key: "store.phone",   label: "Phone",      value: siteSettings["store.phone"]   ?? "(818) 506-7744" },
    { key: "store.email",   label: "Email",      value: siteSettings["store.email"]   ?? "nohomailbox@gmail.com" },
    { key: "store.hours",   label: "Hours",      value: siteSettings["store.hours"]   ?? "Mon–Fri 9:30am–5:30pm (break 1:30–2pm) · Sat 10am–1:30pm" },
  ]);

  const [carrierTimes, setCarrierTimes] = useState([
    { key: "carrier.usps",  label: "USPS Pickup",  value: siteSettings["carrier.usps"]  ?? "Mon–Sat ~4:00 PM" },
    { key: "carrier.ups",   label: "UPS Pickup",   value: siteSettings["carrier.ups"]   ?? "Mon–Fri ~5:00 PM" },
    { key: "carrier.fedex", label: "FedEx Pickup", value: siteSettings["carrier.fedex"] ?? "Mon–Fri ~4:30 PM" },
    { key: "carrier.dhl",   label: "DHL Pickup",   value: siteSettings["carrier.dhl"]   ?? "Mon–Fri ~3:30 PM" },
  ]);

  // Notification toggles — seeded from DB
  const [notifications, setNotifications] = useState([
    { key: "notif.mailArrived",       label: "Email alerts for new mail",       on: siteSettings["notif.mailArrived"]       !== "false" },
    { key: "notif.smsPackages",       label: "SMS alerts for packages",          on: siteSettings["notif.smsPackages"]       !== "false" },
    { key: "notif.dailySummary",      label: "Daily summary email",             on: siteSettings["notif.dailySummary"]      === "true" },
    { key: "notif.notaryReminders",   label: "Notary appointment reminders",    on: siteSettings["notif.notaryReminders"]   !== "false" },
  ]);

  const filteredMail = mailFilter === "All"
    ? recentMail
    : recentMail.filter((m) => m.status === mailFilter);

  function handleMailAction(itemId: string, newStatus: string) {
    startTransition(async () => {
      await updateMailStatus(itemId, newStatus);
      router.refresh();
    });
  }

  function handleLogMailSubmit() {
    const fd = new FormData();
    fd.append("suite", logMailForm.suite);
    fd.append("from", logMailForm.from);
    fd.append("type", logMailForm.type);
    if (logMailForm.recipientName) fd.append("recipientName", logMailForm.recipientName);
    if (logMailForm.recipientPhone) fd.append("recipientPhone", logMailForm.recipientPhone);
    if (logMailForm.exteriorImageUrl) fd.append("exteriorImageUrl", logMailForm.exteriorImageUrl);
    if (logMailForm.weightOz) fd.append("weightOz", logMailForm.weightOz);
    if (logMailForm.dimensions) fd.append("dimensions", logMailForm.dimensions);
    startTransition(async () => {
      const result = await logMail(fd);
      if (!result?.error) {
        setShowLogMailModal(false);
        setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
        router.refresh();
      }
    });
  }

  async function handleLogMailPhotoUpload(file: File) {
    setLogMailPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setLogMailForm((prev) => ({ ...prev, exteriorImageUrl: data.url }));
    } catch { /* ignore */ } finally {
      setLogMailPhotoUploading(false);
    }
  }

  async function handleScanUpload(mailItemId: string, file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        startTransition(async () => {
          await setScanImage(mailItemId, data.url);
          router.refresh();
        });
      }
    } catch { /* ignore */ }
  }

  function handleDeliveryStatus(orderId: string, status: string, courier?: string) {
    startTransition(async () => {
      await updateDeliveryStatus(orderId, status, courier);
      router.refresh();
    });
  }

  function handleNotaryAction(bookingId: string, status: string) {
    startTransition(async () => {
      await updateNotaryStatus(bookingId, status);
      router.refresh();
    });
  }

  const currentTab = getNavItem(tab);

  // Badge counts for unread / pending items
  const pendingSignups = customers.filter((c) => c.mailboxStatus === "Pending" && !c.suiteNumber).length;
  const badgeFor = (id: string): number => {
    if (id === "signups") return pendingSignups;
    if (id === "credits") return creditRequests.filter((r) => r.status === "Pending" || r.status === "LinkSent").length;
    if (id === "requests") return mailRequests.length;
    if (id === "keys") return keyRequests.length;
    return 0;
  };

  // ─── Command palette state + global ⌘K / Ctrl+K opener ────────────────
  // Combined the old MailOsStatusStrip (28px) and the chunky 64px header
  // into one 44px MailOsCommandBar — recovers 48px of vertical space, no
  // duplicated breadcrumb, no marketing pill, no unused branding chrome.
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      // ⌘K / Ctrl+K → open. ⌘P / Ctrl+P also opens (familiar from Linear/VSCode).
      if (cmd && (e.key === "k" || e.key === "K" || e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      // ⌘. / Ctrl+. → toggle sidebar (mirrors macOS Mail / Notes / Finder).
      if (cmd && e.key === ".") {
        e.preventDefault();
        setSidebarHidden((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Build the palette action list — nav items first (each grouped), then
  // quick-launch actions. The label match is fuzzy by substring, so the
  // user can type "renew" and find "Mailbox Center" via its hint.
  const paletteActions: PaletteAction[] = [
    ...navGroups.flatMap((g) => g.items.map((it) => ({
      id: `nav:${it.id}`,
      label: it.label,
      hint: g.label,
      group: g.label,
      Icon: it.Icon,
      run: () => setTab(it.id),
    }))),
    {
      id: "action:logmail", label: "Log mail", hint: "Open the log-mail intake modal",
      group: "Quick Actions",
      run: () => {
        setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
        setShowLogMailModal(true);
      },
    },
    {
      id: "action:logpkg", label: "Log package", hint: "Open the log-package intake modal",
      group: "Quick Actions",
      run: () => {
        setLogMailForm({ suite: "", from: "", type: "Package", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
        setShowLogMailModal(true);
      },
    },
    {
      id: "action:newcustomer", label: "Add customer", hint: "Open the new-customer modal",
      group: "Quick Actions",
      run: () => setShowAddCustomerModal(true),
    },
    {
      id: "action:scaninbound", label: "Scan inbound", hint: "Jump to scan workspace in Shipping Center",
      group: "Quick Actions",
      run: () => {
        setTab("shippingcenter");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("noho-shipping-subview", { detail: { subview: "scan" } }));
        }
      },
    },
    {
      id: "action:runsheet", label: "Today's run sheet", hint: "Open the print run-sheet in a new tab",
      group: "Quick Actions",
      run: () => {
        if (typeof window !== "undefined") window.open("/admin/shipping/runsheet", "_blank", "noopener,noreferrer");
      },
    },
    {
      id: "action:memberview", label: "Switch to member view", hint: "Go to /dashboard",
      group: "Quick Actions",
      run: () => router.push("/dashboard"),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF", color: "#1A1D23" }}>
      {/* ─── Single 44px command bar (replaces 28px status strip + 64px
          header — net +48px reclaimed). Logo · breadcrumb · ⌘K · clock ·
          to-do · member-view · profile, all in one row. */}
      <MailOsCommandBar
        signupCount={pendingSignups}
        creditCount={creditRequests.filter((r) => r.status === "Pending" || r.status === "LinkSent").length}
        mailRequestCount={mailRequests.length}
        keyRequestCount={keyRequests.length}
        currentTabLabel={currentTab?.label ?? "Overview"}
        onOpenPalette={() => setPaletteOpen(true)}
        sidebarHidden={sidebarHidden}
        onToggleSidebar={() => setSidebarHidden((v) => !v)}
        roleLabel={roleLabel}
      />

      {/* ⌘K command palette — opens from the bar pill or ⌘K / ⌘P. */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />

      {/* iter-86: Find-anything omnibox — Cmd+Shift+F or "/". Searches
          customers, mail items, dropoffs, label orders, Shippo labels. */}
      <AdminCommandPalette
        open={omniOpen}
        onClose={() => setOmniOpen(false)}
      />

      <div className="flex" style={{ background: "#F4F5F7" }}>
        {/* ─── Sidebar — iPad-OS aesthetic, accordion groups so the whole
            list fits in one viewport with NO scroll. Active group is auto-
            expanded; clicking another group header expands it and collapses
            the rest. Group headers carry a sum of badge counts across
            their children so urgent things bubble even when collapsed. */}
        <aside
          className={`${sidebarHidden ? "hidden" : "hidden lg:flex"} flex-col shrink-0 sticky top-14 self-start`}
          style={{
            height: "calc(100vh - 56px)",
            width: 232,
            background: "#FFFFFF",
            borderRight: "1px solid #ECEEF1",
          }}
        >
          <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-hidden">
            {navGroups.map((group) => {
              const isExpanded = expandedGroup === group.label;
              const groupHasActive = group.items.some((it) => it.id === tab);
              const groupBadgeSum = group.items.reduce((acc, it) => acc + badgeFor(it.id), 0);
              return (
                <div key={group.label} className="flex flex-col">
                  {/* Group header — click to toggle. Always visible. */}
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? "" : group.label)}
                    className="w-full h-8 flex items-center gap-2 px-2 rounded-md text-left transition-colors"
                    style={{
                      background: "transparent",
                      color: groupHasActive ? "#1976FF" : "#7A8290",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F4F5F7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    aria-expanded={isExpanded}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3 h-3 shrink-0 transition-transform"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                    <span
                      className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] truncate"
                    >
                      {group.label}
                    </span>
                    {!isExpanded && groupBadgeSum > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 h-[16px] rounded-full inline-flex items-center justify-center"
                        style={{
                          background: "#FF3B30",
                          color: "#FFFFFF",
                          minWidth: 16,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {groupBadgeSum > 99 ? "99+" : groupBadgeSum}
                      </span>
                    )}
                  </button>

                  {/* Group items — render only when expanded. */}
                  {isExpanded && (
                    <ul className="flex flex-col gap-px py-0.5 mb-1">
                      {group.items.map((item) => {
                        const active = tab === item.id;
                        const badge = badgeFor(item.id);
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => setTab(item.id)}
                              className="relative w-full h-8 flex items-center gap-2.5 rounded-md pl-5 pr-2 text-left transition-colors"
                              style={{
                                background: active ? "#EBF2FF" : "transparent",
                                color: active ? "#1976FF" : "#3B4252",
                              }}
                              onMouseEnter={(e) => {
                                if (!active) e.currentTarget.style.background = "#F4F5F7";
                              }}
                              onMouseLeave={(e) => {
                                if (!active) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <item.Icon className="w-[15px] h-[15px] shrink-0" />
                              <span
                                className="text-[13px] flex-1 truncate"
                                style={{ fontWeight: active ? 600 : 500 }}
                              >
                                {item.label}
                              </span>
                              {badge > 0 && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 h-[16px] rounded-full inline-flex items-center justify-center"
                                  style={{
                                    background: active ? "#1976FF" : "#FF3B30",
                                    color: "#FFFFFF",
                                    minWidth: 16,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {badge > 99 ? "99+" : badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ─── Main content area — soft gray canvas with subtle pastel
            polygon decorations in corners. Single big focal card per
            tab, lots of whitespace, no nested cards. */}
        <div
          className="flex-1 min-w-0 px-6 sm:px-8 py-6 sm:py-8 relative"
          style={{ minHeight: "calc(100vh - 56px)", background: "#F4F5F7", color: "#3B4252" }}
        >
          {/* Decorative pastel polygons — purely visual, position absolute
              behind everything. Subtle, soft, iPad-OS feel. */}
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-32 pointer-events-none"
            style={{
              width: 480,
              height: 480,
              background: "linear-gradient(135deg, rgba(255,182,193,0.18), rgba(255,182,193,0.06))",
              clipPath: "polygon(0 30%, 60% 0, 100% 50%, 70% 100%, 20% 90%)",
              zIndex: 0,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/3 -left-24 pointer-events-none"
            style={{
              width: 380,
              height: 380,
              background: "linear-gradient(135deg, rgba(186,225,255,0.20), rgba(186,225,255,0.06))",
              clipPath: "polygon(40% 0, 100% 30%, 80% 100%, 0 80%, 10% 30%)",
              zIndex: 0,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 right-1/4 pointer-events-none"
            style={{
              width: 420,
              height: 420,
              background: "linear-gradient(135deg, rgba(204,229,210,0.18), rgba(204,229,210,0.05))",
              clipPath: "polygon(20% 0, 100% 20%, 90% 90%, 30% 100%, 0 50%)",
              zIndex: 0,
            }}
          />

          {/* iter-144 — Hot fix for "pages cut off" UX regression. The
              panel wrapper now establishes (1) a flex-column context AND
              (2) min-height = viewport minus the topbar. Panels written
              with `flex flex-col h-full` resolve correctly; panels with
              natural height grow past the min and the OUTER page scrolls
              normally so admin always sees everything. */}
          <div className="relative" style={{ zIndex: 1 }}>
          <div className="mx-auto max-w-[1400px]">
            <div
              className="px-1 sm:px-2 py-1 sm:py-2 flex flex-col"
              style={{ minHeight: "calc(100vh - 100px)" }}
            >
          {/* Mobile pill nav — clean iPad-OS white/blue */}
          <div className="lg:hidden mb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {visibleFlatNav.map((item) => {
                const active = tab === item.id;
                const badge = badgeFor(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors snap-start"
                    style={{
                      background: active ? "#EBF2FF" : "#FFFFFF",
                      color: active ? "#1976FF" : "#3B4252",
                      border: active ? "1px solid #1976FF" : "1px solid #ECEEF1",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <item.Icon className="w-3.5 h-3.5" />
                    {item.label}
                    {badge > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 min-w-[16px] h-4 rounded-full inline-flex items-center justify-center"
                        style={{
                          background: active ? "#1976FF" : "#FF3B30",
                          color: "#FFFFFF",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Tab Panels ─── */}
          {tab === "overview" && (
            <AdminOverviewPanel
              stats={stats}
              recentMail={recentMail}
              notaryQueue={notaryQueue}
              setTab={setTab}
              pendingSignupCount={customers.filter((c) => c.mailboxStatus === "Pending" && !c.suiteNumber).length}
            />
          )}
          {tab === "register" && (
            <AdminCashRegister />
          )}
          {tab === "zreport" && (
            <AdminDailyZReport />
          )}
          {tab === "customers" && (
            <AdminCustomersPanel
              customers={customers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setShowAddCustomerModal={setShowAddCustomerModal}
              openCustomer={openCustomer}
            />
          )}
          {tab === "compliance" && (
            <AdminCompliancePanel complianceQueue={complianceQueue} />
          )}
          {tab === "signups" && (
            <AdminSignupRequestsPanel customers={customers} />
          )}
          {tab === "credits" && (
            <AdminCreditRequestsPanel requests={creditRequests} />
          )}
          {tab === "requests" && (
            <AdminRequestsPanel mailRequests={mailRequests} />
          )}
          {tab === "mail" && (
            <AdminMailPanel
              recentMail={filteredMail}
              customers={customers}
              mailFilter={mailFilter}
              setMailFilter={setMailFilter}
              setShowLogMailModal={setShowLogMailModal}
              setLogMailForm={setLogMailForm}
              isPending={isPending}
              handleMailAction={handleMailAction}
              handleScanUpload={handleScanUpload}
            />
          )}
          {tab === "deliveries" && (
            <AdminDeliveriesPanel
              deliveryOrders={deliveryOrders}
              isPending={isPending}
              handleDeliveryStatus={handleDeliveryStatus}
            />
          )}
          {tab === "shop" && (
            <AdminShopPanel shopOrders={shopOrders} />
          )}
          {tab === "notary" && (
            <PanelWithTools
              tools={[{ label: "Check-in counter", id: "notarycheckin" }]}
              setTab={setTab}
            >
              <AdminNotaryPanel
                notaryQueue={notaryQueue}
                isPending={isPending}
                handleNotaryAction={handleNotaryAction}
                setShowNewApptModal={setShowNewApptModal}
              />
            </PanelWithTools>
          )}
          {tab === "notarycheckin" && <AdminNotaryCheckInPanel />}
          {tab === "dropoffscan" && <AdminDropoffBarcodePanel />}
          {tab === "messages" && (
            <PanelWithTools
              tools={[
                { label: "Email Logs",  id: "emails" },
                { label: "Bulk Mailer", id: "mailer" },
                { label: "Bulk SMS",    id: "bulksms" },
              ]}
              setTab={setTab}
            >
              <AdminChatPanel meId={adminId} customers={customers} />
            </PanelWithTools>
          )}
          {tab === "emails" && <AdminEmailLogsPanel />}
          {tab === "mailer" && <AdminMailerPanel />}
          {tab === "bulksms" && <AdminBulkSmsPanel />}
          {tab === "billing" && (
            <PanelWithTools
              tools={[
                { label: "Cancellations", id: "cancellations" },
                { label: "Disputes",      id: "disputes"     },
                { label: "Quarterly",     id: "quarterly"    },
              ]}
              setTab={setTab}
            >
              <AdminBillingPanel />
            </PanelWithTools>
          )}
          {tab === "cancellations" && <AdminCancellationsPanel />}
          {tab === "partners" && <AdminPartnersPanel partners={partners} />}
          {tab === "tenants" && <AdminTenantsPanel tenants={tenants} />}
          {tab === "mailhold" && <AdminMailHoldPanel />}
          {tab === "vacationholds" && <AdminVacationHoldPanel />}
          {tab === "operatinghours" && <AdminOperatingHoursPanel />}
          {tab === "insights" && (
            <PanelWithTools
              tools={[
                { label: "Daily Digest", id: "kpidigest"  },
                { label: "Referrals",    id: "referrals"  },
                { label: "Affiliates",   id: "affiliates" },
              ]}
              setTab={setTab}
            >
              <AdminInsightsPanel />
            </PanelWithTools>
          )}
          {tab === "keys" && (
            <PanelWithTools
              tools={[{ label: "Key Ledger", id: "keyledger" }]}
              setTab={setTab}
            >
              <AdminKeysPanel keyRequests={keyRequests} />
            </PanelWithTools>
          )}
          {tab === "keyledger" && <AdminKeyLedgerPanel />}
          {tab === "referrals" && <AdminReferralsPanel />}
          {tab === "csvonboard" && <AdminCsvOnboardPanel />}
          {tab === "qrpickup" && (
            <PanelWithTools
              tools={[{ label: "Pickup Queue", id: "pickupqueue" }]}
              setTab={setTab}
            >
              <AdminQRPickupPanel />
            </PanelWithTools>
          )}
          {tab === "pickupqueue" && <AdminPickupAppointmentsPanel />}
          {tab === "occupancy" && <AdminSuiteOccupancyPanel />}
          {tab === "stickynotes" && <AdminPinnedNotesPanel />}
          {tab === "suitetransfers" && <AdminSuiteTransfersPanel />}
          {tab === "labelprinter" && <AdminLabelPrinterPanel />}
          {tab === "pickupvelocity" && <AdminPickupVelocityPanel />}
          {tab === "bulkforward" && <AdminBulkForwardPanel />}
          {tab === "deferredemails" && <AdminDeferredEmailsPanel />}
          {tab === "backuphealth" && <AdminBackupHealthPanel />}
          {tab === "mailerautoreply" && <AdminMailerAutoReplyPanel />}
          {tab === "suitemaint" && <AdminSuiteMaintenancePanel />}
          {tab === "equipment" && <AdminEquipmentPanel />}
          {tab === "dooraccess" && <AdminDoorAccessPanel />}
          {tab === "onboardvideo" && <AdminOnboardingVideosPanel />}
          {tab === "supplies" && <AdminSuppliesPanel />}
          {tab === "emaildeliv" && <AdminEmailDeliverabilityPanel />}
          {tab === "cotm" && <AdminCustomerOfMonthPanel />}
          {tab === "cotmspotlight" && <AdminCotmSpotlightPanel />}
          {tab === "mailboxtours" && <AdminMailboxToursPanel />}
          {tab === "suitepins" && <AdminSuitePinsPanel />}
          {tab === "rateshop" && <AdminRateShopPanel />}
          {tab === "reshelf" && <AdminReshelfPanel />}
          {tab === "kyctrust" && <AdminKycTrustPanel />}
          {tab === "forecast" && <AdminRevenueForecastPanel />}
          {tab === "bulkrenew" && <AdminBulkRenewalPanel />}
          {tab === "mailboxtags" && <AdminMailboxTagsPanel />}
          {tab === "insclaims" && <AdminInsuranceClaimsPanel />}
          {tab === "carriermismatch" && <AdminCarrierMismatchPanel />}
          {tab === "supplyforecast" && <AdminSupplyForecastPanel />}
          {tab === "gbphours" && <AdminGbpHoursPanel />}
          {tab === "lobbywall" && <AdminLobbyWallPanel />}
          {tab === "lockboxboard" && <AdminLockboxBoardPanel />}
          {tab === "espsync" && <AdminEspSyncPanel />}
          {tab === "carrierpickup" && <AdminCarrierPickupPanel />}
          {tab === "renewaloffers" && <AdminRenewalOffersPanel />}
          {tab === "referralleader" && <AdminReferralLeaderboardPanel />}
          {tab === "marketingflyer" && <AdminMarketingFlyerPanel />}
          {tab === "weeklynewsletter" && <AdminWeeklyNewsletterPanel />}
          {tab === "affiliates" && <AdminAffiliateEarningsPanel />}
          {tab === "idexpiring" && <AdminIdExpiringPanel />}
          {tab === "webhooks" && <AdminWebhooksPanel />}
          {tab === "kpidigest" && <AdminKpiDigestPanel />}
          {tab === "disputes" && <AdminStorageDisputesPanel />}
          {tab === "bookkeeping" && <AdminBookkeepingPanel />}
          {tab === "cmrareport" && <AdminCmraReportPanel />}
          {tab === "quarterly" && <AdminQuarterlyReportPanel />}
          {tab === "revenue" && (
            <AdminRevenuePanel
              squareStatus={squareStatus}
              recentPayments={recentPayments}
              customers={customers}
            />
          )}
          {tab === "business" && (
            <AdminBusinessPanel setShowNewClientModal={setShowNewClientModal} />
          )}
          {tab === "shippingcenter" && (
            <AdminShippingCenterPanel
              shippoConfigured={shippoConfigured}
              recentShippoLabels={recentShippoLabels}
              labelOrders={labelOrders}
            />
          )}
          {tab === "mailboxcenter" && (
            <AdminMailboxCenterPanel
              customers={customers as unknown as RenewalCustomer[]}
              renewals={mailboxRenewals}
              notes={customerNotes}
              keys={mailboxKeys}
              walkInToday={walkInToday}
              mrrCents={mrrCents}
              dormantCount={dormantCount}
              planDistribution={planDistribution}
              tillWeek={tillWeek}
              churn30dCount={churn30dCount}
              churnAnnualizedPct={churnAnnualizedPct}
              forwardingByState={forwardingByState}
              setTab={setTab}
            />
          )}
          {tab === "square" && (
            <AdminSquarePanel
              squareStatus={squareStatus}
              syncResults={syncResults}
              setSyncResults={setSyncResults}
            />
          )}
          {tab === "settings" && (
            // iter-144 — natural page flow.
            <div className="flex flex-col gap-3">
              {/* Settings sub-tools — fold the 4 system sub-pages here so
                  they live one click away inside Settings, not as
                  separate sidebar entries. */}
              <div className="shrink-0 flex flex-wrap gap-2">
                <SubToolButton
                  icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7 V12 L15 14"/></svg>}
                  label="Operating Hours"
                  onClick={() => setTab("operatinghours")}
                />
                <SubToolButton
                  icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 12 H10 M14 12 H21"/><circle cx="12" cy="12" r="2"/></svg>}
                  label="Webhooks"
                  onClick={() => setTab("webhooks")}
                />
                <SubToolButton
                  icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 21 V8 H10 V21 M14 21 V3 H21 V21"/></svg>}
                  label="Tenants"
                  onClick={() => setTab("tenants")}
                />
                <SubToolButton
                  icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 20 a6 6 0 0 1 12 0 M11 20 a6 6 0 0 1 10 0"/></svg>}
                  label="Partners"
                  onClick={() => setTab("partners")}
                />
                <SubToolButton
                  icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6 V12 a8 3 0 0 0 16 0 V6 M4 12 V18 a8 3 0 0 0 16 0 V12"/></svg>}
                  label="Backup Health"
                  onClick={() => setTab("backuphealth")}
                />
              </div>
              {/* iter-144 — natural page flow. */}
              <div className="-mx-1 px-1 pb-2 space-y-4">
              {/* iter-155 — Per-station printer prefs (this device only). */}
              <AdminPrintStationPicker />
              {/* iPad-OS title row — Baloo + Pacifico script accent. */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2
                  className="text-2xl font-bold"
                  style={{
                    color: "#1A1D23",
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                  }}
                >
                  Settings
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
                  store configuration
                </span>
                <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
                  · pricing · mailbox tiers · promo banner · store info — all persisted to SiteConfig
                </span>
                {settingsSaved && (
                  <span
                    className="ml-auto text-[10px] font-bold uppercase tracking-[0.10em] px-2.5 h-7 rounded-md inline-flex items-center"
                    style={{
                      background: "rgba(34,197,94,0.10)",
                      color: "#16A34A",
                      border: "1px solid rgba(34,197,94,0.30)",
                    }}
                  >
                    ✓ Saved to database
                  </span>
                )}
              </div>

              <AdminPricingEditor />

              <AdminVirtualMailboxEditor />

              <AdminPromoBannerEditor />

              {/* Store Information — persists to SiteConfig DB */}
              <div className="rounded-2xl p-6 bg-white space-y-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Store Information</h3>
                  <span className="text-[10px] text-text-light/40 font-semibold">Persisted to database</span>
                </div>
                {storeInfo.map((f) => (
                  <div key={f.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(232,229,224,0.25)", border: "1px solid rgba(232,229,224,0.5)" }}>
                    <div className="flex-1 mr-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/35">{f.label}</p>
                      {editingSetting === f.key ? (
                        <input
                          type="text"
                          value={editSettingValue}
                          onChange={(e) => setEditSettingValue(e.target.value)}
                          className="text-sm font-semibold text-text-light bg-white border border-[#337485] rounded-lg px-2 py-1 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-[#337485]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newValue = editSettingValue;
                              setStoreInfo((prev) => prev.map((s) => s.key === f.key ? { ...s, value: newValue } : s));
                              setEditingSetting(null);
                            } else if (e.key === "Escape") {
                              setEditingSetting(null);
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm font-semibold text-text-light">{f.value}</p>
                      )}
                    </div>
                    {editingSetting === f.key ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newValue = editSettingValue;
                            setStoreInfo((prev) => prev.map((s) => s.key === f.key ? { ...s, value: newValue } : s));
                            setEditingSetting(null);
                          }}
                          className="text-xs font-bold text-green-600 hover:underline"
                        >
                          OK
                        </button>
                        <button onClick={() => setEditingSetting(null)} className="text-xs font-bold text-text-light/40 hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingSetting(f.key); setEditSettingValue(f.value); }}
                        className="text-xs font-bold text-accent hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
                <button
                  disabled={isPending}
                  onClick={() => {
                    const entries = Object.fromEntries(storeInfo.map((f) => [f.key, f.value]));
                    startTransition(async () => {
                      await setSiteConfigs(entries);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 3000);
                      router.refresh();
                    });
                  }}
                  className="w-full h-10 rounded-md text-[12px] font-bold uppercase tracking-[0.10em] text-white disabled:opacity-40 transition-colors"
                  style={{ background: "#2D100F", border: "1px solid #2D100F" }}
                >
                  {isPending ? "Saving…" : "Save Store Info to Database"}
                </button>
              </div>

              {/* Notification toggles — persists to SiteConfig DB */}
              <div className="rounded-2xl p-6 bg-white space-y-4" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Notifications</h3>
                  <span className="text-[10px] text-text-light/40 font-semibold">Persisted to database</span>
                </div>
                {notifications.map((n, idx) => (
                  <div key={n.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-light/70">{n.label}</span>
                    <div
                      onClick={() => {
                        const updated = notifications.map((item, i) => i === idx ? { ...item, on: !item.on } : item);
                        setNotifications(updated);
                        // Auto-save toggle immediately
                        const entries = Object.fromEntries(updated.map((item) => [item.key, item.on ? "true" : "false"]));
                        startTransition(async () => {
                          await setSiteConfigs(entries);
                        });
                      }}
                      className="w-10 h-6 rounded-full relative cursor-pointer transition-colors"
                      style={{ background: n.on ? "#337485" : "rgba(26,23,20,0.12)" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                        style={{ left: n.on ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Carrier Pickup Times — persists to SiteConfig DB */}
              <div className="rounded-2xl p-6 bg-white space-y-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Carrier Pickup Times</h3>
                  <span className="text-[10px] text-text-light/40 font-semibold">Shown on FAQ page</span>
                </div>
                {carrierTimes.map((f) => (
                  <div key={f.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(232,229,224,0.25)", border: "1px solid rgba(232,229,224,0.5)" }}>
                    <div className="flex-1 mr-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/35">{f.label}</p>
                      {editingSetting === f.key ? (
                        <input
                          type="text"
                          value={editSettingValue}
                          onChange={(e) => setEditSettingValue(e.target.value)}
                          className="text-sm font-semibold text-text-light bg-white border border-[#337485] rounded-lg px-2 py-1 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-[#337485]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = editSettingValue;
                              setCarrierTimes((prev) => prev.map((s) => s.key === f.key ? { ...s, value: v } : s));
                              setEditingSetting(null);
                            } else if (e.key === "Escape") {
                              setEditingSetting(null);
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm font-semibold text-text-light">{f.value}</p>
                      )}
                    </div>
                    {editingSetting === f.key ? (
                      <div className="flex gap-2">
                        <button onClick={() => { const v = editSettingValue; setCarrierTimes((prev) => prev.map((s) => s.key === f.key ? { ...s, value: v } : s)); setEditingSetting(null); }} className="text-xs font-bold text-green-600 hover:underline">OK</button>
                        <button onClick={() => setEditingSetting(null)} className="text-xs font-bold text-text-light/40 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingSetting(f.key); setEditSettingValue(f.value); }} className="text-xs font-bold text-accent hover:underline">Edit</button>
                    )}
                  </div>
                ))}
                <button
                  disabled={isPending}
                  onClick={() => {
                    const entries = Object.fromEntries(carrierTimes.map((f) => [f.key, f.value]));
                    startTransition(async () => {
                      await setSiteConfigs(entries);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 3000);
                    });
                  }}
                  className="w-full h-10 rounded-md text-[12px] font-bold uppercase tracking-[0.10em] text-white disabled:opacity-40 transition-colors"
                  style={{ background: "#2D100F", border: "1px solid #2D100F" }}
                >
                  {isPending ? "Saving…" : "Save Carrier Times"}
                </button>
              </div>
            </div>
            </div>
          )}
          </div>
          </div>
          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}
      {showLogMailModal && (
        <LogMailModal
          customers={customers}
          logMailForm={logMailForm}
          setLogMailForm={setLogMailForm}
          logMailPhotoUploading={logMailPhotoUploading}
          handleLogMailPhotoUpload={handleLogMailPhotoUpload}
          handleLogMailSubmit={handleLogMailSubmit}
          isPending={isPending}
          onClose={() => setShowLogMailModal(false)}
        />
      )}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
        />
      )}
      {viewCustomer && (
        <EditCustomerModal
          viewCustomer={viewCustomer}
          editForm={editForm}
          setEditForm={setEditForm}
          editError={editError}
          setEditError={setEditError}
          editSuccess={editSuccess}
          setEditSuccess={setEditSuccess}
          addMonths={addMonths}
          onClose={() => setViewCustomer(null)}
        />
      )}
      {showNewApptModal && (
        <NewApptModal
          apptForm={apptForm}
          setApptForm={setApptForm}
          onClose={() => setShowNewApptModal(false)}
        />
      )}
      {showNewClientModal && (
        <NewClientModal
          clientForm={clientForm}
          setClientForm={setClientForm}
          onClose={() => setShowNewClientModal(false)}
        />
      )}

      {/* MailOsDock removed — the slim left icon dock + Quick Actions
          panel on Overview already cover quick-launch. A second floating
          bar at the bottom was duplicate navigation and pure visual
          noise. The "+" buttons inside each panel handle in-context
          creates (Log Mail, Log Package, Add Customer). */}
    </div>
  );
}

