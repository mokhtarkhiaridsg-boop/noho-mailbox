"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  IconMail,
  IconPackage,
  IconForward,
  IconNotary,
  IconSettings,
  IconHome,
  IconBell,
  IconShield,
  IconChevron,
  IconLogout,
  IconSparkle,
  IconWallet,
  IconMessage,
  IconTruck,
  IconReceipt,
  IconCheck,
  IconClose,
  IconAlert,
  IconWarningTriangle,
  IconClock,
  IconUmbrella,
  IconUsers,
  IconBlock,
  IconLock,
  IconScan,
  IconStar,
} from "@/components/MemberIcons";
import { getPlanStatus, planStatusMessage } from "@/lib/plan";
import { BRAND, type DashboardProps } from "./dashboard/types";
import MailPanel from "./dashboard/MailPanel";
import PackagesPanel from "./dashboard/PackagesPanel";
import ForwardingPanel from "./dashboard/ForwardingPanel";
import NotaryPanel from "./dashboard/NotaryPanel";
import SettingsPanel from "./dashboard/SettingsPanel";
import WalletPanel from "./dashboard/WalletPanel";
import MessagesPanel from "./dashboard/MessagesPanel";
import { MemberChatPanel } from "./dashboard/ChatPanel";
import DeliveriesPanel from "./dashboard/DeliveriesPanel";
import InvoicesPanel from "./dashboard/InvoicesPanel";
import ShippingPanel, { type MemberShippoLabel } from "./dashboard/ShippingPanel";
import NotificationBell from "./NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import VaultPanel from "./dashboard/VaultPanel";
import PhotosPanel from "./dashboard/PhotosPanel";
import QRPickupPanel from "./dashboard/QRPickupPanel";
import GuestPickupCard from "./dashboard/GuestPickupCard";
import AnnualSummaryPanel from "./dashboard/AnnualSummaryPanel";
import EmailHistoryPanel from "./dashboard/EmailHistoryPanel";
import ServicesPanel from "./dashboard/ServicesPanel";
import OverviewPanel from "./dashboard/OverviewPanel";
import CommandPalette from "./dashboard/CommandPalette";
import IdExpiringBanner from "./dashboard/IdExpiringBanner";

type NavItem = {
  Icon: (props: import("react").SVGProps<SVGSVGElement>) => import("react").ReactElement;
  label: string;
  id: string;
};
type NavGroup = { label: string; items: NavItem[] };

// Sidebar nav, grouped by domain. Sections render with a tiny uppercase
// header and a tighter line-height inside each group. Total of 16 items
// across 5 groups — same items as before, just organized so the eye can
// land on the right area in 2 hops instead of scanning a flat list.
const sideNavGroups: NavGroup[] = [
  {
    label: "Mailbox",
    items: [
      { Icon: IconHome,    label: "Overview",  id: "overview" },
      { Icon: IconMail,    label: "Mail",      id: "mail" },
      { Icon: IconPackage, label: "Packages",  id: "packages" },
      { Icon: IconForward, label: "Forwarding", id: "forwarding" },
      { Icon: IconNotary,  label: "Notary",    id: "notary" },
      { Icon: IconLock,    label: "Vault",     id: "vault" },
      { Icon: IconScan,    label: "QR Pickup", id: "qrpickup" },
      { Icon: IconStar,    label: "Photos",    id: "photos" },
    ],
  },
  {
    label: "Money",
    items: [
      { Icon: IconWallet,  label: "Wallet",         id: "wallet" },
      { Icon: IconReceipt, label: "Invoices",       id: "invoices" },
      { Icon: IconStar,    label: "Year in Review", id: "annual" },
    ],
  },
  {
    label: "Communications",
    items: [
      { Icon: IconMessage, label: "Messages",   id: "messages" },
      { Icon: IconBell,    label: "Email Logs", id: "emails" },
    ],
  },
  {
    label: "Shipping",
    items: [
      { Icon: IconTruck,   label: "Shipping Labels", id: "shipping" },
      { Icon: IconClock,   label: "Deliveries",      id: "deliveries" },
    ],
  },
  {
    label: "Account",
    items: [
      { Icon: IconSparkle,  label: "Services", id: "services" },
      { Icon: IconSettings, label: "Settings", id: "settings" },
    ],
  },
];

// Flat lookup used by code that doesn't care about grouping (e.g. the
// active-tab class lookup, the URL-sync allow-list).
const sideNav: NavItem[] = sideNavGroups.flatMap((g) => g.items);

// ─── Brand-aligned Button Nav ─────────────────────────────────────────────
// Per the brand brief: cream/blue/brown only, BUTTONS not menus, formal
// + light, framer-motion driven for smoothness. Six primary tabs are
// visible at all times (no overflow menu); everything else is reachable
// via the ⌘K command palette in 0 clicks. Active indicator is a single
// motion.span that slides between buttons via layoutId — no chunky pill,
// no transform on each item.
const PRIMARY_NAV: { id: string; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "mail",       label: "Mail" },
  { id: "packages",   label: "Packages" },
  { id: "wallet",     label: "Wallet" },
  { id: "forwarding", label: "Forwarding" },
  { id: "messages",   label: "Messages" },
];

function DashboardButtonNav({
  activeTab,
  onChange,
  onSearch,
}: {
  activeTab: string;
  onChange: (id: string) => void;
  onSearch: () => void;
}) {
  // Ensure the active tab maps to a primary button — secondary tabs (like
  // settings, vault, qrpickup, etc.) keep the indicator parked under
  // Overview so the bar still feels coherent.
  const activeIsPrimary = PRIMARY_NAV.some((t) => t.id === activeTab);
  const indicatorId = activeIsPrimary ? activeTab : "overview";
  return (
    <nav
      aria-label="Dashboard sections"
      className="mb-8 flex flex-wrap items-center gap-2"
    >
      <div className="flex flex-wrap items-center gap-1 rounded-full p-1"
        style={{
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(45,29,15,0.10)",
          backdropFilter: "blur(8px)",
        }}
      >
        {PRIMARY_NAV.map((tab) => {
          const active = indicatorId === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="relative px-4 py-2 text-[13px] font-semibold tracking-tight rounded-full"
              style={{
                color: active ? "#F7EEC2" : "#2D1D0F",
                fontFamily: "system-ui, -apple-system, 'Segoe UI', Inter, sans-serif",
                letterSpacing: "0.005em",
                zIndex: 1,
              }}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="dash-nav-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "#337485" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
      <motion.button
        type="button"
        onClick={onSearch}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="ml-auto flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium rounded-full"
        style={{
          color: "#2D1D0F",
          background: "white",
          border: "1px solid rgba(45,29,15,0.10)",
        }}
        aria-label="Open command palette"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M14 14L11 11" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search · everything</span>
        <span className="sm:hidden">Search</span>
        <kbd
          className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: "#F7EEC2",
            color: "#2D1D0F",
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            border: "1px solid rgba(45,29,15,0.10)",
          }}
        >
          ⌘K
        </kbd>
      </motion.button>
    </nav>
  );
}

export default function DashboardClient({
  user,
  mailItems,
  addresses,
  bookings,
  stats,
  cards,
  walletTxns,
  invoices,
  deliveries,
  threads,
  keyRequests,
  notifications = [],
  vaultItems = [],
  junkSenders = [],
  vacation = null,
  shippingLabels = [],
}: DashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-synced tab — same pattern we use on the admin sidebar. Reading from
  // ?tab= means deep-links work, refresh preserves view, and browser back/
  // forward step through panel history instead of escaping to /. Hyphenated
  // slugs (qr-pickup, year-in-review) get normalized to the camelcase IDs
  // used internally so old bookmarks still resolve.
  const ALL_TAB_IDS = [
    "overview", "mail", "services", "packages", "wallet", "messages",
    "emails", "deliveries", "shipping", "invoices", "forwarding", "notary", "settings",
    "vault", "qrpickup", "annual", "photos",
  ];
  function normalizeTabSlug(raw: string | null): string {
    if (!raw) return "overview";
    if (ALL_TAB_IDS.includes(raw)) return raw;
    const stripped = raw.replace(/-/g, "").toLowerCase();
    return ALL_TAB_IDS.find((id) => id.toLowerCase() === stripped) ?? "overview";
  }
  const [activeTab, setActiveTabState] = useState(() => normalizeTabSlug(searchParams.get("tab")));
  useEffect(() => {
    const next = normalizeTabSlug(searchParams.get("tab"));
    setActiveTabState((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const [isPending, startTransition] = useTransition();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [profileMenuOpen]);

  useEffect(() => {
    function onNavTab(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setActiveTab(detail);
    }
    window.addEventListener("noho:navTab", onNavTab);
    return () => window.removeEventListener("noho:navTab", onNavTab);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Virtual mailbox plans (Solo / Plus / Pro) read as "Virtual Solo Box — 14 Months"
  // if we naively append " Box". Detect the virtual prefix or any plan name
  // already containing "Virtual" / "Pro" / "Plus" / "Solo" and skip the suffix.
  const planLabel = (() => {
    if (!user.plan) return "Free Member";
    const isVirtual = /^virtual[\s-]/i.test(user.plan) || /^(solo|plus|pro)$/i.test(user.plan);
    const baseName = isVirtual && !/^virtual/i.test(user.plan) ? `Virtual ${user.plan}` : user.plan;
    const suffix = isVirtual ? "" : " Box";
    const term = user.planTerm
      ? ` — ${user.planTerm}${isVirtual ? "" : " Months"}`
      : "";
    return `${baseName}${suffix}${term}`;
  })();

  const planStatus = getPlanStatus(user.planDueDate);
  const planMsg = user.planDueDate && planStatus !== "active"
    ? planStatusMessage(user.planDueDate, planStatus)
    : null;
  const isBlocked = planStatus === "expired";

  const packages = mailItems.filter(
    (m) =>
      m.type === "Package" &&
      (m.status === "Awaiting Pickup" || m.status === "Received")
  );

  // iter-51: Recently picked up — packages that were just handed off in
  // person. We surface them in a "Recently picked up" section so the
  // customer can confirm what happened (matches the email they got).
  // mailItems is already ordered by createdAt desc with take=50, so the
  // first 5 picked-up items in that slice ARE "recently picked up" by
  // any reasonable definition. (MailItem has no updatedAt; the date field
  // is a free-form display string we can't safely parse.)
  const recentlyPickedUp = mailItems
    .filter((m) => m.type === "Package" && m.status === "Picked Up")
    .slice(0, 5);

  function runAction(label: string, fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      setToast(label);
      router.refresh();
    });
  }

  return (
    <div
      className="min-h-screen"
      style={{
        // Light, formal: near-white field with the faintest cream wash —
        // brand colors are accents, not backgrounds. The cream/blue/brown
        // palette belongs on type, borders, and CTAs, not on every pixel.
        background: "#FBFAF6",
        color: "#2D1D0F",
      }}
    >
      {/* Top bar — slim, hairline-bottomed, no shadow drop. The chunky
          drop-shadow + cream wash made the header feel heavy; this version
          is a quiet 56px strip that lets the content breathe. */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-8 h-14 flex items-center justify-between"
        style={{
          background: "rgba(251,250,246,0.85)",
          borderBottom: "1px solid rgba(45,29,15,0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Logo className="h-7 sm:h-8 w-auto" />
          </Link>
          {/* Member badge — refined: smaller, more typographic, no chip bg */}
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(51,116,133,0.85)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#337485" }}
            />
            Member
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-semibold transition-colors"
              style={{
                background: "white",
                color: "#337485",
                border: "1px solid rgba(51,116,133,0.20)",
              }}
            >
              <IconShield className="w-3 h-3" />
              Admin
            </Link>
          )}
          {/* iter-110: language switcher (en/fr/ar with RTL). */}
          <LanguageSwitcher compact />
          <NotificationBell notifications={notifications} />
          <div className="relative" ref={profileRef}>
            <motion.button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full transition-colors hover:bg-[rgba(45,29,15,0.06)]"
              aria-label="Account menu"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: "#337485" }}
              >
                {initials}
              </div>
              <IconChevron
                className="w-3 h-3 transition-transform"
                style={{
                  color: "rgba(45,29,15,0.45)",
                  transform: profileMenuOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
            </motion.button>
            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50 origin-top-right"
                  style={{
                    background: "white",
                    border: "1px solid rgba(45,29,15,0.10)",
                    boxShadow: "0 24px 48px -8px rgba(45,29,15,0.18), 0 4px 12px rgba(45,29,15,0.08)",
                  }}
                >
                  <div className="px-4 py-3.5" style={{ borderBottom: "1px solid rgba(45,29,15,0.08)" }}>
                    <p
                      className="text-[14px] tracking-tight truncate"
                      style={{
                        color: "#2D1D0F",
                        fontFamily: "var(--font-baloo), system-ui, sans-serif",
                        fontWeight: 700,
                      }}
                    >
                      {user.name}
                    </p>
                    <p
                      className="text-[11.5px] truncate mt-0.5"
                      style={{ color: "rgba(45,29,15,0.55)" }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-[rgba(45,29,15,0.03)]"
                    style={{ color: "#2D1D0F" }}
                  >
                    <IconHome className="w-[15px] h-[15px]" style={{ color: "#337485" }} strokeWidth={1.7} />
                    Public site
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-[rgba(45,29,15,0.03)]"
                      style={{ color: "#2D1D0F" }}
                    >
                      <IconShield className="w-[15px] h-[15px]" style={{ color: "#337485" }} strokeWidth={1.7} />
                      Admin console
                    </Link>
                  )}
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-[rgba(231,0,19,0.04)]"
                    style={{
                      color: "#dc2626",
                      borderTop: "1px solid rgba(45,29,15,0.08)",
                    }}
                  >
                    <IconLogout className="w-[15px] h-[15px]" strokeWidth={1.7} />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-28 md:pb-12">
        {/* Sidebar removed — layout is now single-column. The horizontal
            button nav below ((sideNav array) drives navigation. Sidebar
            remnants kept here only as a hidden compatibility shim for the
            JSX expression that follows; rendered as `null` so React doesn't
            render anything but TypeScript is happy with the original struct. */}
        <aside className="hidden">
          {/* Quick search hint — visual marker for the ⌘K command palette
              that already exists. Modern dashboards lead with this. */}
          <button
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              window.dispatchEvent(evt);
            }}
            className="w-full mb-5 flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs text-left transition-colors hover:bg-white/60"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.inkSoft,
              backdropFilter: "blur(6px)",
            }}
            aria-label="Open command palette"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 shrink-0">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M14 14L11 11" strokeLinecap="round" />
            </svg>
            <span className="flex-1 truncate font-medium">Quick search</span>
            <kbd
              className="text-[10px] font-black px-1.5 py-0.5 rounded"
              style={{
                background: BRAND.cream,
                color: BRAND.inkSoft,
                border: `1px solid ${BRAND.border}`,
                fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
              }}
            >
              ⌘K
            </kbd>
          </button>

          <nav className="space-y-5">
            {sideNavGroups.map((group) => (
              <div key={group.label}>
                <div
                  className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: BRAND.inkFaint }}
                >
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(({ Icon, label, id }) => {
                    const active = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className="group relative w-full flex items-center gap-2.5 pl-3 pr-3 h-8 rounded-md text-[13px] text-left transition-colors duration-150"
                        style={{
                          background: active ? "rgba(247,230,194,0.65)" : "transparent",
                          color: active ? BRAND.brown : BRAND.ink,
                          fontWeight: active ? 800 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.7)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Left-rail accent for active item — replaces the
                            heavy chunky pill of the old design with a clean
                            modern indicator.  */}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                            style={{ background: BRAND.brown }}
                          />
                        )}
                        <Icon
                          className="w-[15px] h-[15px] shrink-0"
                          style={{ color: active ? BRAND.brown : BRAND.inkSoft }}
                          strokeWidth={active ? 2.1 : 1.6}
                        />
                        <span className="flex-1 truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Address card — refined. Brand brown still, but cleaner type +
              tighter spacing + a subtle frosted highlight at the top, not a
              big radial blob. The "Your Address" lockup now reads like a
              proper postal label rather than a marketing card. */}
          <div
            className="mt-6 rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(165deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(45,16,15,0.28), 0 1px 2px rgba(0,0,0,0.3)",
              color: BRAND.cream,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(247,230,194,0.18) 0%, transparent 35%)",
              }}
            />
            {user.suiteNumber ? (
              <>
                <div className="flex items-center justify-between mb-3 relative">
                  <span
                    className="text-[9.5px] font-black uppercase tracking-[0.22em]"
                    style={{ color: "rgba(247,230,194,0.55)" }}
                  >
                    Your Address
                  </span>
                  <span
                    className="text-[9.5px] font-black uppercase tracking-[0.22em] px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(247,230,194,0.12)",
                      color: "rgba(247,230,194,0.85)",
                    }}
                  >
                    Suite #{user.suiteNumber}
                  </span>
                </div>
                <p
                  className="text-[15px] font-black leading-tight relative"
                  style={{
                    color: BRAND.cream,
                    fontFamily: "Georgia, serif",
                    letterSpacing: "0.005em",
                  }}
                >
                  5062 Lankershim Blvd
                </p>
                <p
                  className="text-[13px] font-bold leading-tight mt-0.5 relative"
                  style={{ color: "rgba(247,230,194,0.78)" }}
                >
                  Ste {user.suiteNumber} · North Hollywood, CA 91601
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const txt = `5062 Lankershim Blvd Ste ${user.suiteNumber}\nNorth Hollywood, CA 91601`;
                    navigator.clipboard?.writeText(txt).then(() => setToast("Address copied"));
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.14em] relative transition-opacity hover:opacity-100"
                  style={{ color: "rgba(247,230,194,0.7)" }}
                >
                  <IconCheck className="w-3 h-3" />
                  Copy address
                </button>
              </>
            ) : (
              <>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.22em] mb-2 relative"
                  style={{ color: "rgba(247,230,194,0.55)" }}
                >
                  Free Member
                </p>
                <p
                  className="text-[13px] font-bold leading-snug mb-3 relative"
                  style={{ color: BRAND.cream }}
                >
                  Add a mailbox to get a real street address.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-[11px] font-black rounded-md px-2.5 py-1.5 transition-transform hover:-translate-y-0.5 relative"
                  style={{ background: BRAND.cream, color: BRAND.brown }}
                >
                  See Plans
                  <IconChevron className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* Main content — single full-width column. */}
        <div className="min-w-0">
          {/* ─── Top Button Nav (replaces sidebar) ─────────────────────────
              6 primary buttons + a "More" overflow that opens a 12-item
              sheet. Buttons (not menus) per the brand brief. Cream/blue/
              brown only — no gradients, no chunky shadows. Framer Motion
              drives hover scale, active-pill morph, and overflow sheet. */}
          <DashboardButtonNav
            activeTab={activeTab}
            onChange={setActiveTab}
            onSearch={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
          />

          {/* Smooth tab transitions — single AnimatePresence wrapping the
              entire panel area. Each tab change unmounts the old panel and
              fades+slides the new one in. mode="wait" makes the transition
              sequential rather than overlapping. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >

          {/* Welcome lockup — formal, light. Brand script for the friendly
              prefix, brand sans for the name. Address is now an inline
              chip-strip beside the heading, not a chunky sidebar card. */}
          {/* iter-89: Vacation hold banner — top of every tab when active. */}
          {vacation && (
            <div
              className="mb-4 rounded-2xl border-2 px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{
                borderColor: "rgba(245,166,35,0.35)",
                background: "linear-gradient(180deg, rgba(245,166,35,0.10), rgba(245,166,35,0.04))",
              }}
            >
              <span className="inline-block w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0" style={{ background: "#F5A623" }}>✈︎</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#92400e" }}>
                  Vacation hold active
                </p>
                <p className="text-[12px] font-bold mt-0.5" style={{ color: "#2D100F" }}>
                  Through <strong>{vacation.endDate}</strong> — incoming mail goes to the Held shelf and resumes automatically.
                  {vacation.digest && <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>· daily digest on</span>}
                </p>
              </div>
              <a
                href="/dashboard?tab=settings"
                className="px-3 py-1.5 rounded-lg text-[11px] font-black border shrink-0"
                style={{ borderColor: "#F5A623", color: "#92400e", background: "white", textDecoration: "none" }}
              >
                Manage hold →
              </a>
            </div>
          )}
          {activeTab === "overview" ? (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p
                  aria-hidden
                  className="text-base sm:text-lg leading-none mb-2"
                  style={{
                    color: "#337485",
                    fontFamily: "var(--font-pacifico), 'Caveat', 'Brush Script MT', cursive",
                    fontWeight: 400,
                  }}
                >
                  Welcome back,
                </p>
                <h1
                  className="text-3xl sm:text-4xl leading-none tracking-tight"
                  style={{
                    color: "#2D1D0F",
                    fontFamily: "var(--font-baloo), system-ui, sans-serif",
                    fontWeight: 800,
                  }}
                >
                  {user.name.split(" ")[0]}
                </h1>
              </div>
              {user.suiteNumber && (
                <button
                  type="button"
                  onClick={() => {
                    const txt = `5062 Lankershim Blvd Ste ${user.suiteNumber}\nNorth Hollywood, CA 91601`;
                    navigator.clipboard?.writeText(txt).then(() => setToast("Address copied"));
                  }}
                  className="group text-left inline-flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors"
                  style={{
                    background: "white",
                    border: "1px solid rgba(45,29,15,0.10)",
                  }}
                  aria-label="Copy your mailing address"
                >
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-none mb-1"
                      style={{ color: "#337485" }}
                    >
                      Suite {user.suiteNumber}
                    </p>
                    <p
                      className="text-[13px] leading-none"
                      style={{ color: "#2D1D0F", fontWeight: 600 }}
                    >
                      5062 Lankershim Blvd · NoHo CA
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#337485" }}
                  >
                    Copy
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <h1
                className="text-2xl sm:text-3xl leading-none tracking-tight"
                style={{
                  color: "#2D1D0F",
                  fontFamily: "var(--font-baloo), system-ui, sans-serif",
                  fontWeight: 800,
                }}
              >
                {activeTab.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </h1>
              <p className="text-[12px] mt-1.5" style={{ color: "rgba(45,29,15,0.55)" }}>
                {planLabel}
                {user.suiteNumber ? ` · Suite #${user.suiteNumber}` : ""}
                {user.planDueDate && (
                  <span
                    style={{
                      color: planStatus !== "active"
                        ? (isBlocked ? "var(--color-danger)" : "var(--color-warning)")
                        : "rgba(45,29,15,0.45)",
                    }}
                  >
                    {" · Renews "}{user.planDueDate}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Plan expiration banner — refined: lighter ground, accent stripe
              on the left edge, motion entrance, quieter typography */}
          {planMsg && (() => {
            const colorVar = isBlocked ? "var(--color-danger)" : "var(--color-warning)";
            const tintRgb = isBlocked ? "239,68,68" : "245,158,11";
            return (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5 rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start relative overflow-hidden"
                style={{
                  background: "white",
                  border: `1px solid rgba(${tintRgb},0.20)`,
                }}
              >
                {/* 3px accent stripe on the left edge */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: colorVar }}
                />
                <span
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `rgba(${tintRgb},0.10)`, color: colorVar }}
                >
                  {isBlocked ? (
                    <IconAlert className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  ) : planStatus === "grace" ? (
                    <IconWarningTriangle className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  ) : (
                    <IconClock className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] tracking-tight"
                    style={{
                      color: "#2D1D0F",
                      fontFamily: "var(--font-baloo), system-ui, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    {isBlocked
                      ? "Service suspended"
                      : planStatus === "grace"
                      ? "Grace period active"
                      : "Plan renewing soon"}
                  </p>
                  <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: "rgba(45,29,15,0.65)" }}>
                    {planMsg}
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
                    style={{ color: colorVar }}
                  >
                    Contact us to renew
                    <IconChevron className="w-3 h-3" strokeWidth={2} />
                  </Link>
                </div>
              </motion.div>
            );
          })()}

          {/* iter-102 — ID expiring banner. Mounts on every tab. */}
          <IdExpiringBanner />

          {/* Panel routing */}
          {activeTab === "overview" && (
            <OverviewPanel
              user={user}
              mailItems={mailItems}
              threads={threads}
              stats={stats}
              walletTxns={walletTxns}
              setActiveTab={setActiveTab}
              shippingLabels={shippingLabels as MemberShippoLabel[]}
            />
          )}

          {activeTab === "mail" && (
            <>
              {/* Quick discovery row — modernized: motion stagger entrance,
                  refined hover-lift (whileHover y:-2 instead of scale), no
                  drop shadow on idle, brand-blue icon chip pattern */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
                {[
                  { Icon: IconUmbrella, title: "Vacation Hold",    sub: "Pause mail while away",   target: "settings" },
                  { Icon: IconUsers,    title: "Family Access",    sub: "Share your mailbox",      target: "settings" },
                  { Icon: IconForward,  title: "Forward Anywhere", sub: "Send mail to any address", target: "forwarding" },
                  { Icon: IconBlock,    title: "Block Junk Mail",  sub: "Auto-reject senders",     target: "settings" },
                ].map((q, idx) => (
                  <motion.button
                    key={q.title}
                    onClick={() => setActiveTab(q.target)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.04 * idx, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group text-left rounded-2xl p-4 transition-colors"
                    style={{
                      background: "white",
                      border: "1px solid rgba(45,29,15,0.08)",
                    }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3"
                      style={{ background: "rgba(51,116,133,0.08)" }}
                    >
                      <q.Icon className="w-[16px] h-[16px]" style={{ color: "#337485" }} strokeWidth={1.7} />
                    </span>
                    <p
                      className="text-[13px] tracking-tight leading-tight"
                      style={{ color: "#2D1D0F", fontWeight: 700 }}
                    >
                      {q.title}
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5 leading-tight"
                      style={{ color: "rgba(45,29,15,0.55)" }}
                    >
                      {q.sub}
                    </p>
                  </motion.button>
                ))}
              </div>

              <MailPanel
                mailItems={mailItems}
                isPending={isPending}
                runAction={runAction}
                setScanPreview={setScanPreview}
              />
            </>
          )}

          {activeTab === "packages" && (
            <PackagesPanel
              packages={packages}
              recentlyPickedUp={recentlyPickedUp}
              isPending={isPending}
              runAction={runAction}
            />
          )}

          {activeTab === "wallet" && (
            <WalletPanel
              user={user}
              cards={cards}
              walletTxns={walletTxns}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {activeTab === "messages" && (
            <MemberChatPanel meId={user.id} />
          )}
          {false && (
            <MessagesPanel
              threads={threads}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {activeTab === "deliveries" && (
            <DeliveriesPanel
              deliveries={deliveries}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {activeTab === "invoices" && (
            <InvoicesPanel
              invoices={invoices}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {activeTab === "shipping" && (
            <ShippingPanel labels={shippingLabels as MemberShippoLabel[]} />
          )}

          {activeTab === "forwarding" && (
            <ForwardingPanel
              addresses={addresses}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
              showAddAddress={showAddAddress}
              setShowAddAddress={setShowAddAddress}
              runAction={runAction}
            />
          )}

          {activeTab === "notary" && (
            <NotaryPanel bookings={bookings} />
          )}

          {activeTab === "settings" && (
            <SettingsPanel
              user={user}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
              editingField={editingField}
              setEditingField={setEditingField}
              editValue={editValue}
              setEditValue={setEditValue}
              planLabel={planLabel}
              planStatus={planStatus}
              isBlocked={isBlocked}
              keyRequests={keyRequests}
              addresses={addresses}
              runAction={runAction}
            />
          )}
          {activeTab === "photos" && <PhotosPanel />}
          {activeTab === "vault" && (
            <VaultPanel vaultItems={vaultItems} />
          )}
          {activeTab === "qrpickup" && (
            <div className="space-y-3">
              <QRPickupPanel />
              <GuestPickupCard />
            </div>
          )}
          {activeTab === "annual" && <AnnualSummaryPanel />}
          {activeTab === "emails" && <EmailHistoryPanel />}
          {activeTab === "services" && (
            <ServicesPanel
              user={user}
              junkSenders={junkSenders}
              vacation={vacation}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scan Preview Modal */}
      {scanPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(45,16,15,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setScanPreview(null)}
        >
          <div
            className="rounded-3xl p-4 max-w-lg w-full max-h-[80vh] overflow-auto"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              boxShadow: "0 24px 60px rgba(45,16,15,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="font-black text-xs uppercase tracking-[0.16em]"
                style={{ color: BRAND.ink }}
              >
                Scanned Document
              </h3>
              <button
                onClick={() => setScanPreview(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#337485]/10"
                style={{ color: BRAND.inkSoft }}
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scanPreview} alt="Scanned mail" className="w-full rounded-2xl" />
          </div>
        </div>
      )}

      {/* ─── Command Palette (⌘K) — universal launcher ─── */}
      <CommandPalette
        user={user}
        mailItems={mailItems}
        threads={threads}
        setActiveTab={setActiveTab}
      />

      {/* ─── Mobile Bottom Tab Bar ────────────────────────────────────────
          Light + formal: a thin off-white bar with hairline top border, no
          drop shadow, no chunky capsule. Active item: solid blue (#337485)
          background — same brand-blue as the desktop nav active pill, so
          the two viewports feel like the same product. Framer Motion
          shared-element pill morphs between buttons. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around"
        style={{
          background: "rgba(251,250,246,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(45,29,15,0.10)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { Icon: IconHome, label: "Home", id: "overview" },
          { Icon: IconMail, label: "Mail", id: "mail" },
          { Icon: IconPackage, label: "Pkgs", id: "packages" },
          { Icon: IconWallet, label: "Wallet", id: "wallet" },
          { Icon: IconMessage, label: "Msgs", id: "messages" },
        ].map(({ Icon, label, id }) => {
          const active = activeTab === id;
          return (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[54px]"
              style={{ color: active ? "#337485" : "rgba(45,29,15,0.55)" }}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="dash-mobile-pill"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full"
                  style={{ background: "#337485", width: 24 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.6} />
              <span
                className="text-[10px] tracking-wide"
                style={{ fontWeight: active ? 700 : 500 }}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Toast — refined: framer motion entrance/exit, lighter chrome,
          brand-blue success check, raised above mobile bottom bar */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{
              background: "#2D1D0F",
              color: "#F7EEC2",
              boxShadow:
                "0 16px 36px -8px rgba(45,29,15,0.45), 0 4px 12px rgba(45,29,15,0.18)",
            }}
            role="status"
            aria-live="polite"
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(247,238,194,0.18)" }}
            >
              <IconCheck className="w-3 h-3" style={{ color: "#F7EEC2" }} strokeWidth={2.4} />
            </span>
            <span className="text-[12.5px] font-medium tracking-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 12px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
