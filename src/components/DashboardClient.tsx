"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef, useCallback } from "react";
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
import VaultPanel from "./dashboard/VaultPanel";
import QRPickupPanel from "./dashboard/QRPickupPanel";
import AnnualSummaryPanel from "./dashboard/AnnualSummaryPanel";
import EmailHistoryPanel from "./dashboard/EmailHistoryPanel";
import ServicesPanel from "./dashboard/ServicesPanel";
import OverviewPanel from "./dashboard/OverviewPanel";
import CommandPalette from "./dashboard/CommandPalette";

const sideNav = [
  { Icon: IconHome, label: "Overview", id: "overview" },
  { Icon: IconMail, label: "Mail", id: "mail" },
  { Icon: IconSparkle, label: "Services", id: "services" },
  { Icon: IconPackage, label: "Packages", id: "packages" },
  { Icon: IconWallet, label: "Wallet", id: "wallet" },
  { Icon: IconMessage, label: "Messages", id: "messages" },
  { Icon: IconBell, label: "Emails", id: "emails" },
  { Icon: IconTruck, label: "Deliveries", id: "deliveries" },
  { Icon: IconForward, label: "Shipping", id: "shipping" },
  { Icon: IconReceipt, label: "Invoices", id: "invoices" },
  { Icon: IconForward, label: "Forwarding", id: "forwarding" },
  { Icon: IconNotary, label: "Notary", id: "notary" },
  { Icon: IconSettings, label: "Settings", id: "settings" },
  { Icon: IconShield, label: "Vault", id: "vault" },
  { Icon: IconSparkle, label: "QR Pickup", id: "qrpickup" },
  { Icon: IconReceipt, label: "Year in Review", id: "annual" },
];

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
    "vault", "qrpickup", "annual",
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
        background: `radial-gradient(ellipse at top left, ${BRAND.creamDeep} 0%, ${BRAND.bg} 55%, #FFF9F3 100%)`,
        color: BRAND.ink,
      }}
    >
      {/* Top bar — solid cream chrome, brand-aligned */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-6 h-16 flex items-center justify-between"
        style={{
          background: BRAND.cream,
          borderBottom: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(45,16,15,0.04), 0 6px 24px rgba(45,16,15,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Logo className="h-7 sm:h-8 w-auto" />
          </Link>
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: BRAND.blueSoft,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            <IconShield className="w-3 h-3" style={{ color: BRAND.blue }} />
            <span
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: BRAND.blueDeep }}
            >
              Member
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black text-white transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                boxShadow: "0 4px 14px rgba(51,116,133,0.35)",
              }}
            >
              <IconShield className="w-3 h-3" />
              Admin Panel
            </Link>
          )}
          <NotificationBell notifications={notifications} />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-all hover:bg-[#337485]/8"
              aria-label="Account menu"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 3px 10px rgba(51,116,133,0.4)",
                }}
              >
                {initials}
              </div>
              <IconChevron
                className={`w-3 h-3 transition-transform ${profileMenuOpen ? "rotate-90" : ""}`}
                style={{ color: BRAND.inkFaint }}
              />
            </button>
            {profileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50 origin-top-right"
                style={{
                  background: "white",
                  border: `1px solid ${BRAND.border}`,
                  boxShadow: "0 16px 48px rgba(45,16,15,0.18)",
                  animation: "popIn 160ms ease-out",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.bgDeep}, transparent)`,
                    borderBottom: `1px solid ${BRAND.border}`,
                  }}
                >
                  <p
                    className="text-sm font-black truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: BRAND.inkSoft }}
                  >
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors hover:bg-[#337485]/8"
                  style={{ color: BRAND.ink }}
                >
                  <IconHome className="w-4 h-4" style={{ color: BRAND.blue }} />
                  Public Site
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors hover:bg-[#337485]/8"
                    style={{ color: BRAND.ink }}
                  >
                    <IconShield className="w-4 h-4" style={{ color: BRAND.blue }} />
                    Admin Console
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                  style={{ borderTop: `1px solid ${BRAND.border}` }}
                >
                  <IconLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 flex gap-8 pb-24 md:pb-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <nav className="space-y-1.5">
            {sideNav.map(({ Icon, label, id }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="group w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-left relative transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${BRAND.brown}, ${BRAND.brownDeep})`
                      : "rgba(255,255,255,0.7)",
                    color: active ? BRAND.cream : BRAND.ink,
                    boxShadow: active
                      ? "0 6px 20px rgba(45,16,15,0.28)"
                      : "0 1px 0 rgba(45,16,15,0.04)",
                    border: active ? "none" : `1px solid ${BRAND.border}`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: active ? BRAND.cream : BRAND.blue }}
                    strokeWidth={active ? 2 : 1.7}
                  />
                  {label}
                  {active && (
                    <IconChevron className="w-3 h-3 ml-auto" style={{ color: BRAND.cream }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Address card — brand brown, cream ink */}
          <div
            className="mt-6 rounded-3xl p-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
              boxShadow: "0 12px 40px rgba(45,16,15,0.32)",
              color: BRAND.cream,
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-25"
              style={{
                background: `radial-gradient(circle, ${BRAND.cream} 0%, transparent 70%)`,
              }}
            />
            <IconSparkle
              className="absolute top-4 right-4 w-4 h-4"
              style={{ color: "rgba(247,230,194,0.55)" }}
              strokeWidth={1.4}
            />
            {user.suiteNumber ? (
              <>
                <p
                  className="text-[11px] font-black uppercase tracking-[0.18em] mb-2"
                  style={{ color: "rgba(247,230,194,0.65)" }}
                >
                  Your Address
                </p>
                <p
                  className="text-sm font-black leading-snug mb-1"
                  style={{ color: BRAND.cream }}
                >
                  NOHO Mailbox
                </p>
                <p
                  className="text-xs font-bold leading-relaxed"
                  style={{ color: "rgba(247,230,194,0.88)" }}
                >
                  Suite #{user.suiteNumber}
                  <br />
                  North Hollywood, CA
                </p>
              </>
            ) : (
              <>
                <p
                  className="text-[11px] font-black uppercase tracking-[0.18em] mb-2"
                  style={{ color: "rgba(247,230,194,0.65)" }}
                >
                  Free Member
                </p>
                <p
                  className="text-sm font-bold leading-snug mb-3"
                  style={{ color: BRAND.cream }}
                >
                  Add a mailbox to get a real street address.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-black rounded-full px-3 py-1.5 transition-transform hover:-translate-y-0.5"
                  style={{ background: BRAND.cream, color: BRAND.brown }}
                >
                  See Plans
                  <IconChevron className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile top tab selector — compact row for quick context */}
          <div className="md:hidden flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none">
            {sideNav.map(({ Icon, label, id }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-black transition-all"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${BRAND.brown}, ${BRAND.brownDeep})`
                      : "white",
                    color: active ? BRAND.cream : BRAND.ink,
                    boxShadow: active
                      ? "0 4px 14px rgba(45,16,15,0.28)"
                      : `0 1px 0 ${BRAND.border}`,
                    border: active ? "none" : `1px solid ${BRAND.border}`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Welcome line — full size on Overview, compact breadcrumb on
              every other panel. The audit flagged this as repeating
              identical 80px-tall hero content across all 15 panels. */}
          {activeTab === "overview" ? (
            <div className="mb-4 sm:mb-6">
              <p
                aria-hidden
                className="text-base sm:text-lg leading-none"
                style={{
                  color: BRAND.blue,
                  fontFamily: "var(--font-pacifico), cursive",
                }}
              >
                Welcome back,
              </p>
              <h1
                className="text-2xl sm:text-3xl font-black mt-1"
                style={{ color: BRAND.ink, fontFamily: "var(--font-baloo), sans-serif" }}
              >
                {user.name.split(" ")[0]}
              </h1>
              <p className="text-[12px] mt-1" style={{ color: BRAND.inkSoft }}>
                {planLabel}
                {user.suiteNumber ? ` · Suite #${user.suiteNumber}` : ""}
                {user.planDueDate && (
                  <span
                    style={{
                      color: planStatus !== "active"
                        ? (isBlocked ? "var(--color-danger)" : "var(--color-warning)")
                        : BRAND.inkFaint,
                    }}
                  >
                    {" · Renews "}{user.planDueDate}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div
              className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: BRAND.inkFaint }}
            >
              <button
                onClick={() => setActiveTab("overview")}
                className="hover:underline"
                style={{ color: BRAND.blue }}
                aria-label="Back to dashboard overview"
              >
                Dashboard
              </button>
              <span aria-hidden>›</span>
              <span style={{ color: BRAND.inkSoft }}>
                {activeTab.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          )}

          {/* Plan expiration banner */}
          {planMsg && (() => {
            const tone = isBlocked ? "danger" : planStatus === "grace" ? "warning" : "warning";
            const colorVar = tone === "danger" ? "var(--color-danger)" : "var(--color-warning)";
            const bgVar = tone === "danger" ? "var(--color-danger-soft)" : "var(--color-warning-soft)";
            const borderVar = tone === "danger" ? "rgba(239,68,68,0.30)" : "rgba(245,158,11,0.30)";
            return (
              <div
                role="alert"
                className="mb-5 rounded-2xl p-4 flex gap-3 items-start"
                style={{ background: bgVar, border: `1px solid ${borderVar}` }}
              >
                <span className="leading-none mt-0.5 shrink-0">
                  {isBlocked ? (
                    <IconAlert className="w-5 h-5" style={{ color: colorVar }} />
                  ) : planStatus === "grace" ? (
                    <IconWarningTriangle className="w-5 h-5" style={{ color: colorVar }} />
                  ) : (
                    <IconClock className="w-5 h-5" style={{ color: colorVar }} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: BRAND.ink }}>
                    {isBlocked
                      ? "Service suspended"
                      : planStatus === "grace"
                      ? "Grace period active"
                      : "Plan renewing soon"}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                    {planMsg}
                  </p>
                  <Link
                    href="/contact"
                    className="inline-block mt-2 text-[12px] font-bold underline underline-offset-2"
                    style={{ color: colorVar }}
                  >
                    Contact us to renew →
                  </Link>
                </div>
              </div>
            );
          })()}

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
              {/* Quick discovery row — surface vacation, shared access, forwarding */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
                {[
                  { Icon: IconUmbrella, title: "Vacation Hold", sub: "Pause mail while away", target: "settings" },
                  { Icon: IconUsers,    title: "Add Family Member", sub: "Share your mailbox", target: "settings" },
                  { Icon: IconForward,  title: "Forward Anywhere",  sub: "Send mail to any address", target: "forwarding" },
                  { Icon: IconBlock,    title: "Block Junk Mail",   sub: "Auto-reject senders", target: "settings" },
                ].map((q) => (
                  <button
                    key={q.title}
                    onClick={() => setActiveTab(q.target)}
                    className="group text-left rounded-2xl p-3.5 transition-all hover:scale-[1.02]"
                    style={{
                      background: "white",
                      border: `1px solid ${BRAND.border}`,
                      boxShadow: "var(--shadow-cream-sm)",
                    }}
                  >
                    <q.Icon className="w-6 h-6 mb-1.5 transition-transform duration-300 group-hover:scale-110" style={{ color: BRAND.blue }} />
                    <p className="text-[12px] font-black leading-tight" style={{ color: BRAND.ink }}>{q.title}</p>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ color: BRAND.inkSoft }}>{q.sub}</p>
                  </button>
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
          {activeTab === "vault" && (
            <VaultPanel vaultItems={vaultItems} />
          )}
          {activeTab === "qrpickup" && <QRPickupPanel />}
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

      {/* ─── Mobile Bottom Tab Bar — cream chrome, brown active ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around"
        style={{
          background: BRAND.cream,
          borderTop: `1px solid ${BRAND.border}`,
          boxShadow: "0 -4px 20px rgba(45,16,15,0.08)",
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
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors"
              style={{ color: active ? BRAND.brown : BRAND.inkSoft }}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6} />
              <span className={`text-[10px] font-bold ${active ? "font-black" : ""}`}>
                {label}
              </span>
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: BRAND.brown }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Toast — raised above bottom bar on mobile */}
      {toast && (
        <div
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl"
          style={{
            background: BRAND.ink,
            color: BRAND.cream,
            boxShadow: "0 12px 36px rgba(45,16,15,0.4)",
            animation: "slideUp 220ms ease-out",
          }}
        >
          <IconCheck className="w-4 h-4" style={{ color: "var(--color-success)" }} />
          <span className="text-xs font-black">{toast}</span>
        </div>
      )}

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
