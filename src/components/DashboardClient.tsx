"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import DeliveriesPanel from "./dashboard/DeliveriesPanel";
import InvoicesPanel from "./dashboard/InvoicesPanel";
import NotificationBell from "./NotificationBell";

const sideNav = [
  { Icon: IconMail, label: "Mail", id: "mail" },
  { Icon: IconPackage, label: "Packages", id: "packages" },
  { Icon: IconWallet, label: "Wallet", id: "wallet" },
  { Icon: IconMessage, label: "Messages", id: "messages" },
  { Icon: IconTruck, label: "Deliveries", id: "deliveries" },
  { Icon: IconReceipt, label: "Invoices", id: "invoices" },
  { Icon: IconForward, label: "Forwarding", id: "forwarding" },
  { Icon: IconNotary, label: "Notary", id: "notary" },
  { Icon: IconSettings, label: "Settings", id: "settings" },
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
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState("mail");
  const [isPending, startTransition] = useTransition();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const router = useRouter();
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

  const planLabel = user.plan
    ? `${user.plan} Box${user.planTerm ? ` — ${user.planTerm} Months` : ""}`
    : "Free Member";

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
        background: `radial-gradient(ellipse at top left, ${BRAND.bgDeep} 0%, ${BRAND.bg} 60%, #f4f8fd 100%)`,
        color: BRAND.ink,
      }}
    >
      {/* Top bar — blue-tinted glass */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-6 h-16 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderBottom: `1px solid ${BRAND.border}`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 6px 24px rgba(14,34,64,0.05)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Logo className="h-9 w-auto" />
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
                boxShadow: "0 4px 14px rgba(51,116,181,0.35)",
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
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-all hover:bg-[#3374B5]/8"
              aria-label="Account menu"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 3px 10px rgba(51,116,181,0.4)",
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
                  boxShadow: "0 16px 48px rgba(14,34,64,0.18)",
                  animation: "popIn 160ms ease-out",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.blueSoft}, transparent)`,
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
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors hover:bg-[#3374B5]/8"
                  style={{ color: BRAND.ink }}
                >
                  <IconHome className="w-4 h-4" style={{ color: BRAND.blue }} />
                  Public Site
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold transition-colors hover:bg-[#3374B5]/8"
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
                      ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                      : "rgba(255,255,255,0.6)",
                    color: active ? "white" : BRAND.inkSoft,
                    boxShadow: active
                      ? "0 6px 20px rgba(51,116,181,0.32)"
                      : "0 1px 0 rgba(51,116,181,0.04)",
                    border: active ? "none" : `1px solid ${BRAND.border}`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: active ? "white" : BRAND.blue }}
                    strokeWidth={active ? 2 : 1.7}
                  />
                  {label}
                  {active && (
                    <IconChevron className="w-3 h-3 ml-auto" style={{ color: "white" }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Address card */}
          <div
            className="mt-6 rounded-3xl p-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDeep} 100%)`,
              boxShadow: "0 12px 40px rgba(51,116,181,0.32)",
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
            />
            <IconSparkle
              className="absolute top-4 right-4 w-4 h-4 text-white/40"
              strokeWidth={1.4}
            />
            {user.suiteNumber ? (
              <>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.18em] mb-2">
                  Your Address
                </p>
                <p className="text-sm font-black text-white leading-snug mb-1">
                  NOHO Mailbox
                </p>
                <p className="text-xs font-bold text-white/85 leading-relaxed">
                  Suite #{user.suiteNumber}
                  <br />
                  North Hollywood, CA
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.18em] mb-2">
                  Free Member
                </p>
                <p className="text-sm font-bold text-white leading-snug mb-3">
                  Add a mailbox to get a real street address.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-black bg-white rounded-full px-3 py-1.5 transition-transform hover:-translate-y-0.5"
                  style={{ color: BRAND.blueDeep }}
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
                      ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                      : "white",
                    color: active ? "white" : BRAND.inkSoft,
                    boxShadow: active
                      ? "0 4px 14px rgba(51,116,181,0.32)"
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

          {/* Welcome line */}
          <div className="mb-4 sm:mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.blue }}>
              Welcome back
            </p>
            <h1 className="text-xl sm:text-3xl font-black mt-1" style={{ color: BRAND.ink }}>
              {user.name.split(" ")[0]}
            </h1>
            <p className="text-[11px] mt-0.5 sm:mt-1" style={{ color: BRAND.inkSoft }}>
              {planLabel}
              {user.suiteNumber ? ` · Suite #${user.suiteNumber}` : ""}
              {user.planDueDate && (
                <span style={{ color: planStatus !== "active" ? (isBlocked ? "#b91c1c" : "#c2410c") : BRAND.inkFaint }}>
                  {" · Renews "}{user.planDueDate}
                </span>
              )}
            </p>
          </div>

          {/* Plan expiration banner */}
          {planMsg && (
            <div
              className="mb-5 rounded-2xl p-4 flex gap-3 items-start"
              style={{
                background: isBlocked
                  ? "rgba(200,40,40,0.08)"
                  : planStatus === "grace"
                  ? "rgba(220,100,0,0.08)"
                  : "rgba(200,160,0,0.08)",
                border: `1px solid ${isBlocked ? "rgba(200,40,40,0.22)" : planStatus === "grace" ? "rgba(220,100,0,0.22)" : "rgba(200,160,0,0.22)"}`,
              }}
            >
              <span className="text-lg leading-none mt-0.5">
                {isBlocked ? "🚫" : planStatus === "grace" ? "⚠️" : "⏰"}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold"
                  style={{
                    color: isBlocked ? "#b91c1c" : planStatus === "grace" ? "#c2410c" : "#92400e",
                  }}
                >
                  {isBlocked ? "Service suspended" : planStatus === "grace" ? "Grace period active" : "Plan renewing soon"}
                </p>
                <p
                  className="text-[12px] mt-0.5"
                  style={{
                    color: isBlocked ? "#b91c1c" : planStatus === "grace" ? "#c2410c" : "#92400e",
                    opacity: 0.8,
                  }}
                >
                  {planMsg}
                </p>
                <Link
                  href="/contact"
                  className="inline-block mt-2 text-[11px] font-bold underline underline-offset-2"
                  style={{ color: isBlocked ? "#b91c1c" : "#c2410c" }}
                >
                  Contact us to renew →
                </Link>
              </div>
            </div>
          )}

          {/* Cross-sell upsell grid */}
          <div className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { title: "LLC Formation", desc: "From $99 + state fee", slug: "llc" },
              { title: "Same-Day Delivery", desc: "From $5 in NoHo", slug: "delivery" },
              { title: "Online Notary", desc: "RON appointments", slug: "notary" },
              { title: "Phone & Fax", desc: "Local & toll-free", slug: "phone" },
            ].map((c) => (
              <Link
                key={c.slug}
                href={`/business-solutions#${c.slug}`}
                className="group rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all hover:-translate-y-1"
                style={{
                  background: "white",
                  border: `1px solid ${BRAND.border}`,
                  boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 6px 18px rgba(14,34,64,0.05)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] sm:text-xs font-black" style={{ color: BRAND.ink }}>
                    {c.title}
                  </p>
                  <IconChevron
                    className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                    style={{ color: BRAND.blue }}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
                  {c.desc}
                </p>
              </Link>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {[
              { label: "Total Mail", value: stats.totalMail, Icon: IconMail, accent: false },
              { label: "Unread", value: stats.unread, Icon: IconBell, accent: true },
              { label: "Packages", value: stats.packages, Icon: IconPackage, accent: false },
              { label: "Forwarded", value: stats.forwarded, Icon: IconForward, accent: false },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{
                  background: stat.accent
                    ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                    : "white",
                  color: stat.accent ? "white" : BRAND.ink,
                  border: stat.accent ? "none" : `1px solid ${BRAND.border}`,
                  boxShadow: stat.accent
                    ? "0 8px 28px rgba(51,116,181,0.32)"
                    : "0 1px 0 rgba(51,116,181,0.04), 0 6px 18px rgba(14,34,64,0.05)",
                }}
              >
                <stat.Icon
                  className="absolute -top-2 -right-2 w-16 h-16 opacity-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                  style={{ color: stat.accent ? "white" : BRAND.blue }}
                  strokeWidth={1.2}
                />
                <stat.Icon
                  className="w-5 h-5 mb-3"
                  style={{ color: stat.accent ? "white" : BRAND.blue }}
                />
                <p className="text-2xl sm:text-3xl font-black leading-none">{stat.value}</p>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.16em] mt-2"
                  style={{
                    color: stat.accent
                      ? "rgba(255,255,255,0.7)"
                      : BRAND.inkFaint,
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Panel routing */}
          {activeTab === "mail" && (
            <MailPanel
              mailItems={mailItems}
              isPending={isPending}
              runAction={runAction}
              setScanPreview={setScanPreview}
            />
          )}

          {activeTab === "packages" && (
            <PackagesPanel
              packages={packages}
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
              runAction={runAction}
            />
          )}
        </div>
      </div>

      {/* Scan Preview Modal */}
      {scanPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(14,34,64,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setScanPreview(null)}
        >
          <div
            className="rounded-3xl p-4 max-w-lg w-full max-h-[80vh] overflow-auto"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              boxShadow: "0 24px 60px rgba(14,34,64,0.4)",
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
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#3374B5]/10"
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

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${BRAND.border}`,
          boxShadow: "0 -4px 20px rgba(14,34,64,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { Icon: IconMail, label: "Mail", id: "mail" },
          { Icon: IconPackage, label: "Pkgs", id: "packages" },
          { Icon: IconWallet, label: "Wallet", id: "wallet" },
          { Icon: IconMessage, label: "Msgs", id: "messages" },
          { Icon: IconSettings, label: "More", id: "settings" },
        ].map(({ Icon, label, id }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors"
              style={{ color: active ? BRAND.blue : BRAND.inkFaint }}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6} />
              <span className={`text-[9px] font-bold ${active ? "font-black" : ""}`}>
                {label}
              </span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: BRAND.blue }}
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
            color: "white",
            boxShadow: "0 12px 36px rgba(14,34,64,0.4)",
            animation: "slideUp 220ms ease-out",
          }}
        >
          <IconCheck className="w-4 h-4" style={{ color: "#7eb3e8" }} />
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
