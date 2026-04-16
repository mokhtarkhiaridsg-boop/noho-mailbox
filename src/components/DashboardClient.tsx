"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  updateMailStatus,
  requestForward,
  requestScan,
  requestDiscard,
  requestPickup,
} from "@/app/actions/mail";
import {
  updateProfile,
  addForwardingAddress,
  deleteForwardingAddress,
} from "@/app/actions/user";
import {
  IconMail,
  IconPackage,
  IconForward,
  IconNotary,
  IconSettings,
  IconScan,
  IconEye,
  IconTrash,
  IconHome,
  IconBell,
  IconShield,
  IconPlus,
  IconCheck,
  IconClose,
  IconChevron,
  IconClock,
  IconLogout,
  IconSparkle,
  IconWallet,
  IconCard,
  IconMessage,
  IconKey,
  IconLock,
  IconTruck,
  IconReceipt,
} from "@/components/MemberIcons";
import {
  addCard,
  removeCard,
  setDefaultCard,
  topUpWallet,
  requestDepositRefund,
} from "@/app/actions/wallet";
import { sendMessage } from "@/app/actions/messages";
import { scheduleDelivery } from "@/app/actions/delivery";
import { payInvoice } from "@/app/actions/invoices";
import { requestNewKey } from "@/app/actions/keys";
import { enable2FA, confirm2FA, disable2FA } from "@/app/actions/security";

type MailItem = {
  id: string;
  from: string;
  date: string;
  type: string;
  status: string;
  scanned: boolean;
  scanImageUrl: string | null;
  label: string | null;
};

type ForwardingAddress = { id: string; label: string; address: string };

type NotaryBooking = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

type Card = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

type WalletTxn = {
  id: string;
  kind: string;
  amountCents: number;
  description: string;
  balanceAfterCents: number;
  createdAt: string;
};

type Invoice = {
  id: string;
  number: string;
  kind: string;
  description: string;
  totalCents: number;
  status: string;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

type Delivery = {
  id: string;
  destination: string;
  tier: string;
  status: string;
  price: number;
  date: string;
  pickedUpAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  podPhotoUrl: string | null;
};

type Thread = {
  id: string;
  subject: string;
  lastMessageAt: string;
  preview: string;
  attachmentCount: number;
  unread: boolean;
};

type KeyReq = {
  id: string;
  status: string;
  feeCents: number;
  createdAt: string;
};

type DashboardProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
    plan: string | null;
    planTerm: string | null;
    suiteNumber: string | null;
    role: string;
    securityDepositCents: number;
    securityDepositTotalCents: number;
    walletBalanceCents: number;
    defaultCardId: string | null;
    totpEnabled: boolean;
    mailboxStatus: string;
    kycStatus: string;
  };
  mailItems: MailItem[];
  addresses: ForwardingAddress[];
  bookings: NotaryBooking[];
  stats: { totalMail: number; unread: number; packages: number; forwarded: number };
  cards: Card[];
  walletTxns: WalletTxn[];
  invoices: Invoice[];
  deliveries: Delivery[];
  threads: Thread[];
  keyRequests: KeyReq[];
};

// Brand palette — blue-forward
const BRAND = {
  bg: "#FAFAF8",
  bgDeep: "#F0EDE8",
  card: "#FFFFFF",
  ink: "#1A1714",
  inkSoft: "#6B6560",
  inkFaint: "#A89F94",
  blue: "#3374B5",
  blueDeep: "#2960A0",
  blueSoft: "rgba(51,116,181,0.08)",
  border: "#E8E5E0",
};

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

function statusColor(status: string) {
  if (status === "Awaiting Pickup" || status === "Ready for Pickup")
    return { bg: "rgba(51,116,181,0.14)", fg: "#1e4d8c", dot: "#3374B5" };
  if (status === "Forwarded" || status === "Picked Up")
    return { bg: "rgba(34,139,34,0.12)", fg: "#1a8a1a", dot: "#1a8a1a" };
  if (status.includes("Requested"))
    return { bg: "rgba(200,150,0,0.15)", fg: "#a07800", dot: "#e0a800" };
  if (status === "Scanned")
    return { bg: "rgba(120,90,200,0.14)", fg: "#5a3fa0", dot: "#7956d8" };
  if (status === "Held")
    return { bg: "rgba(200,50,50,0.12)", fg: "#c03030", dot: "#c03030" };
  return { bg: "rgba(14,34,64,0.06)", fg: BRAND.inkSoft, dot: BRAND.inkFaint };
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
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#3374B5]/8"
            aria-label="Notifications"
          >
            <IconBell className="w-4 h-4" style={{ color: BRAND.blueDeep }} />
            {stats.unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#e0a800" }}
              />
            )}
          </button>
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
            </p>
          </div>

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

          {/* Mail tab */}
          {activeTab === "mail" && (
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "white",
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
              }}
            >
              <div
                className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${BRAND.border}` }}
              >
                <div className="flex items-center gap-2.5">
                  <IconMail className="w-4 h-4" style={{ color: BRAND.blue }} />
                  <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
                    Incoming Mail
                  </h2>
                </div>
                <span
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
                >
                  {mailItems.length} ITEMS
                </span>
              </div>
              <div>
                {mailItems.length === 0 ? (
                  <div className="p-12 text-center">
                    <IconMail
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: BRAND.inkFaint }}
                      strokeWidth={1.2}
                    />
                    <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
                      No mail items yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: BRAND.inkFaint }}>
                      We&apos;ll log your mail as it arrives.
                    </p>
                  </div>
                ) : (
                  mailItems.map((item, i) => {
                    const c = statusColor(item.status);
                    const ItemIcon = item.type === "Package" ? IconPackage : IconMail;
                    return (
                      <div
                        key={item.id}
                        className="group px-4 sm:px-6 py-3 sm:py-4 transition-colors hover:bg-[#3374B5]/4"
                        style={{
                          borderBottom: i < mailItems.length - 1 ? `1px solid ${BRAND.border}` : "none",
                        }}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
                            style={{
                              background:
                                item.type === "Package"
                                  ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                                  : `linear-gradient(135deg, ${BRAND.blueSoft}, rgba(51,116,181,0.18))`,
                              boxShadow:
                                item.type === "Package"
                                  ? "0 4px 14px rgba(51,116,181,0.32)"
                                  : "none",
                            }}
                          >
                            <ItemIcon
                              className="w-5 h-5"
                              style={{
                                color: item.type === "Package" ? "white" : BRAND.blueDeep,
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black truncate" style={{ color: BRAND.ink }}>
                                {item.from}
                              </p>
                              {/* Mobile status dot */}
                              <span
                                className="sm:hidden w-2 h-2 rounded-full shrink-0"
                                style={{ background: c.dot }}
                                title={item.status}
                              />
                            </div>
                            <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>
                              {item.date} · {item.type}
                              {item.label ? ` · ${item.label}` : ""}
                            </p>
                            {/* Mobile status text */}
                            <span
                              className="sm:hidden inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider mt-1"
                              style={{ color: c.fg }}
                            >
                              {item.status}
                            </span>
                          </div>
                          {/* Desktop status badge */}
                          <span
                            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0"
                            style={{ background: c.bg, color: c.fg }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: c.dot }}
                            />
                            {item.status}
                          </span>
                        </div>
                        {/* Action buttons — grid on mobile for bigger touch targets */}
                        <div className="flex gap-1.5 mt-2 sm:mt-0 ml-[52px] sm:ml-0">
                          {item.scanned && item.scanImageUrl && (
                            <button
                              onClick={() => setScanPreview(item.scanImageUrl)}
                              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5"
                              style={{
                                background: BRAND.blueSoft,
                                color: BRAND.blueDeep,
                              }}
                              title="View Scan"
                            >
                              <IconEye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            disabled={isPending}
                            onClick={() => runAction("Scan requested", () => requestScan(item.id))}
                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            style={{
                              background: BRAND.blueSoft,
                              color: BRAND.blueDeep,
                            }}
                            title="Request Scan"
                          >
                            <IconScan className="w-4 h-4" />
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => runAction("Forward requested", () => requestForward(item.id))}
                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            style={{
                              background: BRAND.blueSoft,
                              color: BRAND.blueDeep,
                            }}
                            title="Request Forward"
                          >
                            <IconForward className="w-4 h-4" />
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => runAction("Discard requested", () => requestDiscard(item.id))}
                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            style={{
                              background: "rgba(200,50,50,0.08)",
                              color: "#c03030",
                            }}
                            title="Request Discard"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Packages tab */}
          {activeTab === "packages" && (
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "white",
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
              }}
            >
              <div
                className="px-6 py-4 flex items-center gap-2.5"
                style={{ borderBottom: `1px solid ${BRAND.border}` }}
              >
                <IconPackage className="w-4 h-4" style={{ color: BRAND.blue }} />
                <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
                  Packages Awaiting You
                </h2>
              </div>
              {packages.length === 0 ? (
                <div className="p-12 text-center">
                  <IconPackage
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: BRAND.inkFaint }}
                    strokeWidth={1.2}
                  />
                  <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
                    No packages waiting
                  </p>
                </div>
              ) : (
                packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group p-4 sm:p-6 transition-colors hover:bg-[#3374B5]/4"
                    style={{ borderBottom: `1px solid ${BRAND.border}` }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                          boxShadow: "0 6px 18px rgba(51,116,181,0.32)",
                        }}
                      >
                        <IconPackage className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-black truncate" style={{ color: BRAND.ink }}>
                          {pkg.from}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: BRAND.inkSoft }}>
                          Arrived {pkg.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 ml-[60px] sm:ml-[72px]">
                      <button
                        disabled={isPending}
                        onClick={() => runAction("Pickup requested", () => requestPickup(pkg.id))}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                          boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
                        }}
                      >
                        Request Pickup
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => runAction("Forward requested", () => requestForward(pkg.id))}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        style={{
                          background: BRAND.blueSoft,
                          color: BRAND.blueDeep,
                          border: `1px solid ${BRAND.border}`,
                        }}
                      >
                        Forward
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Wallet tab */}
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

          {/* Messages tab */}
          {activeTab === "messages" && (
            <MessagesPanel
              threads={threads}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {/* Deliveries tab */}
          {activeTab === "deliveries" && (
            <DeliveriesPanel
              deliveries={deliveries}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {/* Invoices tab */}
          {activeTab === "invoices" && (
            <InvoicesPanel
              invoices={invoices}
              isPending={isPending}
              startTransition={startTransition}
              setToast={setToast}
              router={router}
            />
          )}

          {/* Forwarding tab */}
          {activeTab === "forwarding" && (
            <div
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-6"
              style={{
                background: "white",
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <IconForward className="w-4 h-4" style={{ color: BRAND.blue }} />
                <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
                  Saved Addresses
                </h3>
              </div>
              <div className="space-y-3 mb-6">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="group flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                    style={{
                      background: BRAND.blueSoft,
                      border: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "white" }}
                      >
                        <IconHome className="w-4 h-4" style={{ color: BRAND.blue }} />
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                          {addr.label}
                        </p>
                        <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                          {addr.address}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        runAction("Address removed", async () => {
                          await deleteForwardingAddress(addr.id);
                        })
                      }
                      disabled={isPending}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50 disabled:opacity-40"
                      style={{ color: "#c03030" }}
                      aria-label="Remove address"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {addresses.length === 0 && (
                  <p
                    className="text-sm text-center py-6"
                    style={{ color: BRAND.inkFaint }}
                  >
                    No saved addresses yet.
                  </p>
                )}
              </div>

              {showAddAddress ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    startTransition(async () => {
                      await addForwardingAddress({}, form);
                      setShowAddAddress(false);
                      setToast("Address added");
                      router.refresh();
                    });
                  }}
                  className="space-y-3 p-4 rounded-2xl"
                  style={{
                    background: BRAND.blueSoft,
                    border: `1px dashed ${BRAND.blue}`,
                  }}
                >
                  <input
                    name="label"
                    required
                    placeholder="Label (e.g. Home, Office)"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: "white",
                      border: `1px solid ${BRAND.border}`,
                      color: BRAND.ink,
                    }}
                  />
                  <input
                    name="address"
                    required
                    placeholder="Full address"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: "white",
                      border: `1px solid ${BRAND.border}`,
                      color: BRAND.ink,
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                        boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
                      }}
                    >
                      {isPending ? "Adding..." : "Add Address"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors hover:bg-white"
                      style={{
                        background: "transparent",
                        border: `1px solid ${BRAND.border}`,
                        color: BRAND.ink,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddAddress(true)}
                  className="w-full font-black py-3 rounded-2xl text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  style={{
                    color: BRAND.blueDeep,
                    border: `1px dashed ${BRAND.blue}`,
                    background: "rgba(51,116,181,0.04)",
                  }}
                >
                  <IconPlus className="w-4 h-4" />
                  Add New Address
                </button>
              )}
            </div>
          )}

          {/* Notary tab */}
          {activeTab === "notary" && (
            <div
              className="rounded-3xl p-8 text-center relative overflow-hidden"
              style={{
                background: "white",
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
              }}
            >
              <div
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${BRAND.blue}, transparent 70%)` }}
              />
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 8px 24px rgba(51,116,181,0.32)",
                }}
              >
                <IconNotary className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-black text-lg" style={{ color: BRAND.ink }}>
                Book a Notary
              </h3>
              <p
                className="text-sm mt-2 mb-6 max-w-xs mx-auto"
                style={{ color: BRAND.inkSoft }}
              >
                Schedule a certified in-store notary appointment. Premium members get a discount.
              </p>
              {bookings.length > 0 && (
                <div className="mb-6 space-y-2">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="text-left p-4 rounded-2xl flex items-center justify-between"
                      style={{
                        background: BRAND.blueSoft,
                        border: `1px solid ${BRAND.border}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <IconClock className="w-4 h-4" style={{ color: BRAND.blue }} />
                        <div>
                          <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                            {b.type}
                          </p>
                          <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                            {b.date} at {b.time}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-full"
                        style={{ background: "white", color: BRAND.blueDeep }}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-black px-6 py-3 rounded-2xl text-sm text-white transition-transform hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 6px 20px rgba(51,116,181,0.32)",
                }}
              >
                Book Appointment
                <IconChevron className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Settings tab */}
          {activeTab === "settings" && (
            <div
              className="rounded-3xl p-6"
              style={{
                background: "white",
                border: `1px solid ${BRAND.border}`,
                boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <IconSettings className="w-4 h-4" style={{ color: BRAND.blue }} />
                <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
                  Account Settings
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Name", key: "name", value: user.name, editable: true },
                  { label: "Email", key: "email", value: user.email, editable: true },
                  { label: "Phone", key: "phone", value: user.phone || "Not set", editable: true },
                  { label: "Plan", key: "plan", value: planLabel, editable: false },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                    style={{
                      background: BRAND.blueSoft,
                      border: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.16em]"
                        style={{ color: BRAND.inkFaint }}
                      >
                        {field.label}
                      </p>
                      {editingField === field.key ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="rounded-xl px-3 py-1.5 text-sm flex-1"
                            style={{
                              background: "white",
                              border: `1px solid ${BRAND.border}`,
                              color: BRAND.ink,
                            }}
                            autoFocus
                          />
                          <button
                            disabled={isPending}
                            onClick={() => {
                              const form = new FormData();
                              form.set("name", field.key === "name" ? editValue : user.name);
                              form.set("email", field.key === "email" ? editValue : user.email);
                              form.set("phone", field.key === "phone" ? editValue : user.phone || "");
                              startTransition(async () => {
                                await updateProfile({}, form);
                                setEditingField(null);
                                setToast("Profile updated");
                                router.refresh();
                              });
                            }}
                            className="text-xs font-black text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
                            style={{ background: BRAND.blue }}
                          >
                            {isPending ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="text-xs font-bold"
                            style={{ color: BRAND.inkFaint }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p
                          className="text-sm font-bold mt-0.5 truncate"
                          style={{ color: BRAND.ink }}
                        >
                          {field.value}
                        </p>
                      )}
                    </div>
                    {field.editable && editingField !== field.key && (
                      <button
                        onClick={() => {
                          setEditingField(field.key);
                          setEditValue(field.key === "phone" ? user.phone || "" : field.value);
                        }}
                        className="text-xs font-black ml-3 px-3 py-1.5 rounded-lg transition-colors hover:bg-white"
                        style={{ color: BRAND.blueDeep }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 space-y-4" style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <div
                  className="rounded-2xl p-4"
                  style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <IconKey className="w-4 h-4" style={{ color: BRAND.blueDeep }} />
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.16em]"
                      style={{ color: BRAND.blueDeep }}
                    >
                      Mailbox Key
                    </p>
                  </div>
                  <p className="text-xs mb-3" style={{ color: BRAND.inkSoft }}>
                    Lost or damaged your key? Request a replacement. A $25 fee will be
                    deducted from your security deposit upon issuance.
                  </p>
                  {keyRequests.length > 0 && (
                    <p className="text-[11px] mb-3" style={{ color: BRAND.inkFaint }}>
                      Latest request: <strong>{keyRequests[0].status}</strong>
                    </p>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => {
                      const reason = window.prompt(
                        "Briefly describe why you need a new key:",
                        "Lost key"
                      );
                      if (!reason) return;
                      runAction("Key request submitted", () => requestNewKey(reason));
                    }}
                    className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                      boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
                    }}
                  >
                    Request New Key
                  </button>
                </div>

                <TwoFactorPanel enabled={user.totpEnabled} />


                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 text-xs font-black text-red-600 hover:underline"
                >
                  <IconLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
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

// ================================================================
// Wallet panel
// ================================================================

type PanelCommon = {
  isPending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startTransition: (cb: () => void) => void;
  setToast: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
};

function WalletPanel({
  user,
  cards,
  walletTxns,
  isPending,
  startTransition,
  setToast,
  router,
}: PanelCommon & {
  user: DashboardProps["user"];
  cards: Card[];
  walletTxns: WalletTxn[];
}) {
  const [showAddCard, setShowAddCard] = useState(false);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  const depositPct = Math.round(
    (user.securityDepositCents / Math.max(1, user.securityDepositTotalCents)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Security Deposit */}
      <section
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
          color: "white",
          boxShadow: "0 20px 50px rgba(51,116,181,0.32)",
        }}
      >
        <IconShield className="absolute -top-6 -right-6 w-36 h-36 opacity-15" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Security Deposit
        </p>
        <p className="text-4xl font-black mt-2">
          ${(user.securityDepositCents / 100).toFixed(2)}
        </p>
        <p className="text-xs mt-1 text-white/80">
          of ${(user.securityDepositTotalCents / 100).toFixed(2)} on file
        </p>
        <div className="mt-4 h-2 w-full max-w-xs rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white"
            style={{ width: `${depositPct}%` }}
          />
        </div>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await requestDepositRefund();
              refresh("Refund request submitted");
            })
          }
          className="mt-5 inline-flex items-center gap-2 text-[11px] font-black px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50"
        >
          Request Refund
        </button>
      </section>

      {/* Wallet balance */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconWallet className="w-4 h-4" style={{ color: BRAND.blue }} />
            <h3
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Wallet Balance
            </h3>
          </div>
          <span className="text-2xl font-black" style={{ color: BRAND.ink }}>
            ${(user.walletBalanceCents / 100).toFixed(2)}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[2500, 5000, 10000, 25000].map((amt) => (
            <button
              key={amt}
              disabled={isPending || cards.length === 0}
              onClick={() =>
                startTransition(async () => {
                  const res = await topUpWallet(amt);
                  if (res?.error) {
                    refresh(res.error);
                    return;
                  }
                  refresh(`Added $${amt / 100} to wallet`);
                })
              }
              className="px-4 py-2.5 rounded-xl text-xs font-black disabled:opacity-50 transition-all hover:-translate-y-0.5"
              style={{
                background: BRAND.blueSoft,
                color: BRAND.blueDeep,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              +${amt / 100}
            </button>
          ))}
        </div>
        {cards.length === 0 && (
          <p className="mt-3 text-[11px]" style={{ color: BRAND.inkFaint }}>
            Add a card below to enable wallet top-ups.
          </p>
        )}

        {walletTxns.length > 0 && (
          <div className="mt-6">
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em] mb-2"
              style={{ color: BRAND.inkFaint }}
            >
              Recent transactions
            </p>
            <ul className="divide-y" style={{ borderColor: BRAND.border }}>
              {walletTxns.map((t) => (
                <li
                  key={t.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span style={{ color: BRAND.inkSoft }}>{t.description}</span>
                  <span
                    className="font-black"
                    style={{
                      color:
                        t.amountCents >= 0 ? "#1a8a1a" : "#c03030",
                    }}
                  >
                    {t.amountCents >= 0 ? "+" : "−"}$
                    {(Math.abs(t.amountCents) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Saved cards */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <IconCard className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h3
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Saved Cards
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: BRAND.blueSoft,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <div>
                <p className="text-xs font-black" style={{ color: BRAND.ink }}>
                  {c.brand} •••• {c.last4}
                </p>
                <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                  Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.isDefault ? (
                  <span
                    className="text-[10px] font-black px-2 py-1 rounded-full text-white"
                    style={{ background: BRAND.blue }}
                  >
                    DEFAULT
                  </span>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setDefaultCard(c.id);
                        refresh("Default card set");
                      })
                    }
                    className="text-[10px] font-black px-2 py-1 rounded-full"
                    style={{ color: BRAND.blueDeep, background: "white" }}
                  >
                    SET DEFAULT
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeCard(c.id);
                      refresh("Card removed");
                    })
                  }
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: "#c03030" }}
                  aria-label="Remove card"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddCard ? (
          <form
            className="mt-4 grid grid-cols-2 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                await addCard({
                  brand: (fd.get("brand") as string) || "VISA",
                  last4: (fd.get("last4") as string) || "0000",
                  expMonth: Number(fd.get("expMonth") || 12),
                  expYear: Number(fd.get("expYear") || 2030),
                });
                setShowAddCard(false);
                refresh("Card added");
              });
            }}
          >
            <input
              name="brand"
              placeholder="Brand (VISA, MC...)"
              className="rounded-xl px-3 py-2 text-sm col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              required
            />
            <input
              name="last4"
              placeholder="Last 4"
              maxLength={4}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="expMonth"
                placeholder="MM"
                type="number"
                min="1"
                max="12"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                required
              />
              <input
                name="expYear"
                placeholder="YYYY"
                type="number"
                min="2025"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                required
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                }}
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="mt-4 w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2"
            style={{
              color: BRAND.blueDeep,
              border: `1px dashed ${BRAND.blue}`,
              background: "rgba(51,116,181,0.04)",
            }}
          >
            <IconPlus className="w-4 h-4" />
            Add a Card
          </button>
        )}

        <p className="mt-3 text-[10px]" style={{ color: BRAND.inkFaint }}>
          Cards are securely stored via Square Cards on File. We never see the full
          number.
        </p>
      </section>
    </div>
  );
}

// ================================================================
// Messages panel
// ================================================================

function MessagesPanel({
  threads,
  isPending,
  startTransition,
  setToast,
  router,
}: PanelCommon & { threads: Thread[] }) {
  const [composing, setComposing] = useState(false);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <IconMessage className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h2
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Internal Messages
          </h2>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
          style={{
            background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
          }}
        >
          Compose
        </button>
      </div>

      {composing && (
        <form
          className="p-6 space-y-3"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await sendMessage({
                subject: (fd.get("subject") as string) || "(no subject)",
                body: (fd.get("body") as string) || "",
              });
              if (res?.error) {
                refresh(res.error);
                return;
              }
              setComposing(false);
              refresh("Message sent");
            });
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkFaint }}>
            New message to NOHO Mailbox staff
          </p>
          <input
            name="subject"
            placeholder="Subject"
            required
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
          />
          <textarea
            name="body"
            required
            rows={5}
            placeholder="Your message…"
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
          />
          <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>
            Attach images, videos, or PDFs by uploading after sending — feature
            available shortly.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              Send to staff
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 ? (
        <div className="p-12 text-center">
          <IconMessage
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: BRAND.inkFaint }}
            strokeWidth={1.2}
          />
          <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
            No messages yet
          </p>
          <p className="text-xs mt-1" style={{ color: BRAND.inkFaint }}>
            Click Compose to start a conversation with our staff.
          </p>
        </div>
      ) : (
        <ul>
          {threads.map((t, i) => (
            <li
              key={t.id}
              className="px-6 py-4 hover:bg-[#3374B5]/4 transition-colors flex items-start justify-between gap-4"
              style={{
                borderBottom:
                  i < threads.length - 1 ? `1px solid ${BRAND.border}` : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.unread && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: BRAND.blue }}
                    />
                  )}
                  <p
                    className="text-sm font-black truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {t.subject}
                  </p>
                </div>
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: BRAND.inkSoft }}
                >
                  {t.preview}
                </p>
              </div>
              <span
                className="text-[10px] font-bold whitespace-nowrap"
                style={{ color: BRAND.inkFaint }}
              >
                {new Date(t.lastMessageAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================================================================
// Deliveries panel
// ================================================================

function DeliveriesPanel({
  deliveries,
  isPending,
  startTransition,
  setToast,
  router,
}: PanelCommon & { deliveries: Delivery[] }) {
  const [showForm, setShowForm] = useState(false);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  function timelineStep(d: Delivery) {
    const steps: { label: string; done: boolean }[] = [
      { label: "Pending", done: true },
      { label: "Picked Up", done: !!d.pickedUpAt || ["In Transit", "Delivered"].includes(d.status) },
      { label: "In Transit", done: !!d.inTransitAt || d.status === "Delivered" },
      { label: "Delivered", done: !!d.deliveredAt || d.status === "Delivered" },
    ];
    return steps;
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconTruck className="w-4 h-4" style={{ color: BRAND.blue }} />
            <h2
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Schedule Same-Day Delivery
            </h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            {showForm ? "Close" : "New Delivery"}
          </button>
        </div>

        {showForm && (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await scheduleDelivery({
                  destination: fd.get("destination") as string,
                  zip: fd.get("zip") as string,
                  itemType: fd.get("itemType") as string,
                  tier: (fd.get("tier") as "Standard" | "Rush" | "WhiteGlove") ?? "Standard",
                  recipientName: fd.get("recipientName") as string,
                  recipientPhone: fd.get("recipientPhone") as string,
                  instructions: (fd.get("instructions") as string) || undefined,
                });
                if (res?.error) {
                  refresh(res.error);
                  return;
                }
                setShowForm(false);
                refresh("Delivery scheduled");
              });
            }}
          >
            <input
              name="destination"
              placeholder="Destination address"
              required
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="zip"
              placeholder="ZIP"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="itemType"
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option>Documents</option>
              <option>Letter</option>
              <option>Package</option>
              <option>Other</option>
            </select>
            <input
              name="recipientName"
              placeholder="Recipient name"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="recipientPhone"
              placeholder="Recipient phone"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="tier"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option value="Standard">Standard — same day</option>
              <option value="Rush">Rush — within 2 hours (+60%)</option>
              <option value="WhiteGlove">White-Glove — door-to-door (+150%)</option>
            </select>
            <textarea
              name="instructions"
              rows={2}
              placeholder="Driver instructions (optional)"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              Schedule Delivery
            </button>
          </form>
        )}
      </section>

      {/* History */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div
          className="px-6 py-4 flex items-center gap-2.5"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
        >
          <IconClock className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h3
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Delivery History
          </h3>
        </div>
        {deliveries.length === 0 ? (
          <p className="p-12 text-center text-sm" style={{ color: BRAND.inkSoft }}>
            No deliveries yet.
          </p>
        ) : (
          <ul>
            {deliveries.map((d, i) => (
              <li
                key={d.id}
                className="px-6 py-4"
                style={{
                  borderBottom:
                    i < deliveries.length - 1
                      ? `1px solid ${BRAND.border}`
                      : "none",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                      {d.destination}
                    </p>
                    <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                      {d.tier} · {d.date} · ${d.price.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        d.status === "Delivered"
                          ? "rgba(34,139,34,0.12)"
                          : BRAND.blueSoft,
                      color: d.status === "Delivered" ? "#1a8a1a" : BRAND.blueDeep,
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {timelineStep(d).map((s, idx) => (
                    <div
                      key={s.label}
                      className="flex-1 flex items-center"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: s.done ? BRAND.blue : "rgba(14,34,64,0.15)",
                        }}
                      />
                      {idx < 3 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            background: s.done
                              ? BRAND.blue
                              : "rgba(14,34,64,0.1)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {timelineStep(d).map((s) => (
                    <span
                      key={s.label}
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: s.done ? BRAND.blueDeep : BRAND.inkFaint }}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ================================================================
// Invoices panel
// ================================================================

function InvoicesPanel({
  invoices,
  isPending,
  startTransition,
  setToast,
  router,
}: PanelCommon & { invoices: Invoice[] }) {
  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2.5"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <IconReceipt className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h2
          className="font-black text-xs uppercase tracking-[0.16em]"
          style={{ color: BRAND.ink }}
        >
          Invoices
        </h2>
      </div>
      {invoices.length === 0 ? (
        <p className="p-12 text-center text-sm" style={{ color: BRAND.inkSoft }}>
          No invoices yet.
        </p>
      ) : (
        <ul>
          {invoices.map((inv, i) => (
            <li
              key={inv.id}
              className="px-6 py-4 flex items-center justify-between"
              style={{
                borderBottom:
                  i < invoices.length - 1 ? `1px solid ${BRAND.border}` : "none",
              }}
            >
              <div>
                <p
                  className="text-sm font-black"
                  style={{ color: BRAND.ink }}
                >
                  {inv.number} · {inv.kind}
                </p>
                <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                  {inv.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-black"
                  style={{ color: BRAND.ink }}
                >
                  ${(inv.totalCents / 100).toFixed(2)}
                </span>
                <span
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      inv.status === "Paid"
                        ? "rgba(34,139,34,0.12)"
                        : BRAND.blueSoft,
                    color:
                      inv.status === "Paid" ? "#1a8a1a" : BRAND.blueDeep,
                  }}
                >
                  {inv.status}
                </span>
                {inv.status === "Sent" && (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await payInvoice(inv.id);
                        if (res?.error) {
                          refresh(res.error);
                          return;
                        }
                        refresh("Invoice paid");
                      })
                    }
                    className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                    }}
                  >
                    Pay
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const router = useRouter();

  const startSetup = () =>
    startTransition(async () => {
      setMessage(null);
      const res = await enable2FA();
      if (res.success) setSetup({ secret: res.secret, uri: res.uri });
      else setMessage("Failed to start setup");
    });

  const confirmSetup = () =>
    startTransition(async () => {
      const res = await confirm2FA(token);
      if (res.success) {
        setIsEnabled(true);
        setSetup(null);
        setToken("");
        setMessage("2FA enabled ✓");
        router.refresh();
      } else {
        setMessage(res.error ?? "Invalid code");
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      const res = await disable2FA(token);
      if (res.success) {
        setIsEnabled(false);
        setToken("");
        setMessage("2FA disabled");
        router.refresh();
      } else {
        setMessage(res.error ?? "Invalid code");
      }
    });

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5">
          <IconLock className="w-4 h-4" style={{ color: BRAND.blueDeep }} />
          <p
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: BRAND.blueDeep }}
          >
            Two-Factor Authentication
          </p>
        </div>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{
            background: isEnabled ? "#dcfce7" : "rgba(14,34,64,0.08)",
            color: isEnabled ? "#166534" : BRAND.inkSoft,
          }}
        >
          {isEnabled ? "Enabled" : "Off"}
        </span>
      </div>

      {!isEnabled && !setup && (
        <>
          <p className="text-xs mb-3" style={{ color: BRAND.inkSoft }}>
            Add a 6-digit code from an authenticator app on every sign-in.
          </p>
          <button
            disabled={pending}
            onClick={startSetup}
            className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
            }}
          >
            Enable 2FA
          </button>
        </>
      )}

      {setup && (
        <div className="space-y-3">
          <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
            Scan this URI with Google Authenticator, 1Password, Authy, etc., then enter the code.
          </p>
          <code
            className="block text-[10px] break-all rounded-lg p-2"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.inkSoft }}
          >
            {setup.uri}
          </code>
          <p className="text-[10px]" style={{ color: BRAND.inkSoft }}>
            Manual key: <strong>{setup.secret}</strong>
          </p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="flex-1 rounded-xl px-3 py-2 text-sm tracking-[0.4em] text-center"
              style={{ background: "white", border: `1px solid ${BRAND.border}` }}
            />
            <button
              disabled={pending || token.length !== 6}
              onClick={confirmSetup}
              className="text-xs font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ background: BRAND.blue }}
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>
            Enter a current code to disable 2FA.
          </p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="flex-1 rounded-xl px-3 py-2 text-sm tracking-[0.4em] text-center"
              style={{ background: "white", border: `1px solid ${BRAND.border}` }}
            />
            <button
              disabled={pending || token.length !== 6}
              onClick={turnOff}
              className="text-xs font-black px-4 py-2 rounded-xl text-red-600 disabled:opacity-50"
              style={{ background: "white", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              Disable
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-2 text-[11px] font-bold" style={{ color: BRAND.inkSoft }}>
          {message}
        </p>
      )}
    </div>
  );
}
