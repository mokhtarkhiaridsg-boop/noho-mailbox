"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  syncSquareCustomers,
  syncSquarePayments,
  syncSquareCatalog,
  syncAll,
  type SyncResult,
} from "@/app/actions/square";
import { updateMailStatus, logMail, fulfillMailRequest, setScanImage } from "@/app/actions/mail";
import { updateNotaryStatus } from "@/app/actions/notary";
import {
  createCustomer,
  assignMailbox,
  reviewKyc,
  issueNewKey,
  updateSecurityDeposit,
  updateCustomerSuite,
  updateCustomerPlanDueDate,
  updateMailboxStatus,
  updateCustomerPlan,
  suspendCustomer,
  reactivateCustomer,
  updateCustomerDetails,
  updateDeliveryStatus,
} from "@/app/actions/admin";
import { logout } from "@/app/actions/auth";
import { setSiteConfigs } from "@/app/actions/site-config";

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
  siteSettings?: Record<string, string>;
};

const sideNav = [
  { icon: "📊", label: "Overview", id: "overview" },
  { icon: "👥", label: "Customers", id: "customers" },
  { icon: "🛡️", label: "Compliance", id: "compliance" },
  { icon: "📬", label: "Mail & Packages", id: "mail" },
  { icon: "📋", label: "Mail Requests", id: "requests" },
  { icon: "🔑", label: "Key Requests", id: "keys" },
  { icon: "💬", label: "Messages", id: "messages" },
  { icon: "🚚", label: "Deliveries", id: "deliveries" },
  { icon: "🛒", label: "Shop Orders", id: "shop" },
  { icon: "✍️", label: "Notary", id: "notary" },
  { icon: "💰", label: "Revenue", id: "revenue" },
  { icon: "🏢", label: "Business Solutions", id: "business" },
  { icon: "🟪", label: "Square", id: "square" },
  { icon: "⚙️", label: "Settings", id: "settings" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Active: { bg: "rgba(34,139,34,0.12)", color: "#1a8a1a" },
    Expired: { bg: "rgba(200,50,50,0.1)", color: "#c03030" },
    Scanned: { bg: "rgba(51,116,181,0.08)", color: "#1A1714" },
    "Awaiting Pickup": { bg: "rgba(51,116,181,0.15)", color: "#3374B5" },
    Forwarded: { bg: "rgba(26,23,20,0.06)", color: "rgba(26,23,20,0.5)" },
    "Picked Up": { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Held: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Confirmed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Pending: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    "In Transit": { bg: "rgba(51,116,181,0.15)", color: "#3374B5" },
    Delivered: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Ready: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Completed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    "Scan Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
    "Forward Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
    "Discard Requested": { bg: "rgba(200,50,50,0.15)", color: "#c03030" },
    "Pickup Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
  };
  const c = colors[status] || { bg: "rgba(26,23,20,0.06)", color: "rgba(26,23,20,0.5)" };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-black/5"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white"
          style={{ background: "linear-gradient(135deg, #3374B5, #1a3f7a)" }}
        >
          NM
        </div>
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[#162d3a]/50" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l4 4 4-4"/></svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden z-[100]"
          style={{ background: "white", border: "1px solid rgba(22,45,58,0.12)", boxShadow: "0 12px 40px rgba(22,45,58,0.18)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(22,45,58,0.08)" }}>
            <p className="text-xs font-black text-[#162d3a]">Admin · NOHO Mailbox</p>
            <p className="text-[10px] text-[#162d3a]/55 mt-0.5">Signed in as administrator</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#162d3a] hover:bg-[#f4f6f8] transition-colors">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3 3-5 6-5s6 2 6 5"/></svg>
            Switch to Member View
          </Link>
          <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#162d3a] hover:bg-[#f4f6f8] transition-colors">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8 L8 2 L14 8 M4 7 L4 14 L12 14 L12 7"/></svg>
            View Public Site
          </Link>
          <div style={{ borderTop: "1px solid rgba(22,45,58,0.08)" }}>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 14 L2 14 L2 2 L7 2 M10 5l3 3-3 3 M5 8 L13 8"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardClient({ customers, recentMail, notaryQueue, deliveryOrders, shopOrders, stats, squareStatus, recentPayments, complianceQueue = [], mailRequests = [], keyRequests = [], messageThreads = [], contactSubmissions = [], siteSettings = {} }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  // Modal and filter state
  const [mailFilter, setMailFilter] = useState("All");
  const [showLogMailModal, setShowLogMailModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [logMailForm, setLogMailForm] = useState({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
  const [logMailPhotoUploading, setLogMailPhotoUploading] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({ name: "", email: "", plan: "Basic", suite: "" });

  // View / Edit Customer modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "",
    suiteNumber: "", plan: "", planTerm: "",
    mailboxStatus: "", planDueDate: "",
    depositCents: 0, kycStatus: "",
    cardLast4: "", cardBrand: "", cardExpiry: "", cardholderName: "", cardDiscountPct: 0,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

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
    { key: "store.name",  label: "Store Name", value: siteSettings["store.name"]  ?? "NOHO Mailbox" },
    { key: "store.address", label: "Address", value: siteSettings["store.address"] ?? "5062 Lankershim Blvd, North Hollywood, CA 91601" },
    { key: "store.phone", label: "Phone",    value: siteSettings["store.phone"]  ?? "(818) 765-1539" },
    { key: "store.email", label: "Email",    value: siteSettings["store.email"]  ?? "nohomailbox@gmail.com" },
    { key: "store.hours", label: "Hours",    value: siteSettings["store.hours"]  ?? "Mon–Fri 9:30am–5:30pm (break 1:30–2pm) · Sat 10am–1:30pm" },
  ]);

  // Notification toggles — seeded from DB
  const [notifications, setNotifications] = useState([
    { key: "notif.mailArrived",       label: "Email alerts for new mail",       on: siteSettings["notif.mailArrived"]       !== "false" },
    { key: "notif.smsPackages",       label: "SMS alerts for packages",          on: siteSettings["notif.smsPackages"]       !== "false" },
    { key: "notif.dailySummary",      label: "Daily summary email",             on: siteSettings["notif.dailySummary"]      === "true" },
    { key: "notif.notaryReminders",   label: "Notary appointment reminders",    on: siteSettings["notif.notaryReminders"]   !== "false" },
  ]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.suiteNumber.includes(searchQuery)
  );

  const filteredMail = mailFilter === "All"
    ? recentMail
    : recentMail.filter((m) => m.status === mailFilter);

  const totalPlan = stats.planDistribution.basic + stats.planDistribution.business + stats.planDistribution.premium;
  const basicPct = totalPlan > 0 ? Math.round((stats.planDistribution.basic / totalPlan) * 100) : 0;
  const businessPct = totalPlan > 0 ? Math.round((stats.planDistribution.business / totalPlan) * 100) : 0;
  const premiumPct = totalPlan > 0 ? Math.round((stats.planDistribution.premium / totalPlan) * 100) : 0;

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
    startTransition(async () => {
      const result = await logMail(fd);
      if (!result?.error) {
        setShowLogMailModal(false);
        setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
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

  function handleAddCustomerSubmit() {
    const fd = new FormData();
    fd.append("name", addCustomerForm.name);
    fd.append("email", addCustomerForm.email);
    fd.append("plan", addCustomerForm.plan);
    fd.append("suite", addCustomerForm.suite);
    startTransition(async () => {
      await createCustomer(fd);
      setShowAddCustomerModal(false);
      setAddCustomerForm({ name: "", email: "", plan: "Basic", suite: "" });
      router.refresh();
    });
  }

  function handleNotaryAction(bookingId: string, status: string) {
    startTransition(async () => {
      await updateNotaryStatus(bookingId, status);
      router.refresh();
    });
  }

  const currentTab = sideNav.find((s) => s.id === tab);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#162d3a]">
      {/* Wix-style top bar — white with logo, search, profile */}
      <header
        className="sticky top-0 z-50 px-5 h-14 flex items-center justify-between bg-white"
        style={{
          borderBottom: "1px solid rgba(22,45,58,0.1)",
          boxShadow: "0 1px 0 rgba(22,45,58,0.04)",
        }}
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-[#162d3a]">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 1 L13 4 L13 9 C13 12 8 15 8 15 C8 15 3 12 3 9 L3 4 Z" />
            </svg>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Admin Console</span>
          </div>
          <span className="hidden md:block text-[11px] text-[#162d3a]/55 font-semibold">
            <span className="text-[#162d3a]/55">Dashboard</span> <span className="mx-1.5 text-[#162d3a]/30">/</span> <span className="text-[#162d3a] font-bold">{currentTab?.label ?? "Overview"}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#f4f6f8] border border-[#162d3a]/10">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[#162d3a]/45" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M11 11 L14 14"/></svg>
            <input
              type="text"
              placeholder="Search customers, mail, suites…"
              className="bg-transparent text-xs text-[#162d3a] placeholder-[#162d3a]/40 focus:outline-none w-48"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (tab !== "customers") setTab("customers"); }}
            />
          </div>
          <Link href="/dashboard" className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-[#162d3a]/60 hover:text-[#162d3a] transition-colors px-2.5 py-1.5 rounded-md hover:bg-[#f4f6f8]">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12 M10 4l4 4-4 4"/></svg>
            Member View
          </Link>

          {/* Profile dropdown */}
          <ProfileDropdown />
        </div>
      </header>

      <div className="flex">
        {/* Wix-style dark navy sidebar — fixed left column, full height */}
        <aside
          className="hidden lg:flex flex-col w-60 shrink-0 sticky top-14 self-start"
          style={{
            height: "calc(100vh - 56px)",
            background: "#162d3a",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-4 pt-5 pb-3">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">Workspace</p>
          </div>
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {sideNav.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 text-left relative group hover:bg-white/5"
                  style={{
                    background: active ? "rgba(51,116,181,0.22)" : "transparent",
                    color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
                  }}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" />}
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="rounded-xl p-3" style={{ background: "rgba(51,116,181,0.18)", border: "1px solid rgba(51,116,181,0.35)" }}>
              <p className="text-[10px] font-black text-[#7eb3e8] uppercase tracking-widest mb-1">Live Status</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <p className="text-xs font-bold text-white">All systems operational</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content area — Wix-style light gray canvas */}
        <div className="flex-1 min-w-0 bg-[#f4f6f8] text-[#162d3a] min-h-[calc(100vh-56px)] px-5 py-6">
          {/* Mobile tabs */}
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-4 -mx-1 px-1">
            {sideNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: tab === item.id ? "#162d3a" : "white",
                  color: tab === item.id ? "white" : "rgba(22,45,58,0.65)",
                  boxShadow: "0 1px 4px rgba(22,45,58,0.06)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* ─── Overview ─── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Active Customers", value: String(stats.activeCustomers), change: "+8 this month", accent: false },
                  { label: "Mail Today", value: String(stats.mailToday), change: "12 packages", accent: true },
                  { label: "Awaiting Pickup", value: String(stats.awaitingPickup), change: "8 packages", accent: false },
                  { label: "Revenue (Mar)", value: "$12,840", change: "+14% vs Feb", accent: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl p-5"
                    style={{
                      background: s.accent ? "linear-gradient(135deg, #3374B5, #1a3f7a)" : "white",
                      boxShadow: s.accent ? "0 4px 20px rgba(51,116,181,0.3)" : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
                    }}
                  >
                    <p className="text-3xl font-black" style={{ color: s.accent ? "white" : "#1A1714" }}>{s.value}</p>
                    <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: s.accent ? "rgba(255,255,255,0.5)" : "rgba(26,23,20,0.35)" }}>
                      {s.label}
                    </p>
                    <p className="text-[10px] mt-2 font-semibold" style={{ color: s.accent ? "rgba(255,255,255,0.4)" : "#3374B5" }}>
                      {s.change}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: "📬", label: "Log Incoming Mail", action: () => setTab("mail") },
                  { icon: "📦", label: "Log Package", action: () => setTab("mail") },
                  { icon: "👤", label: "New Customer", action: () => setTab("customers") },
                  { icon: "📸", label: "Scan Mail", action: () => setTab("mail") },
                  { icon: "🚚", label: "New Delivery", action: () => setTab("deliveries") },
                  { icon: "🛒", label: "Shop Order", action: () => setTab("shop") },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-white text-left transition-all duration-200 hover:-translate-y-1"
                    style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "1px solid rgba(232,229,224,0.6)" }}
                  >
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs font-bold text-text-light">{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent mail + Notary side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent mail */}
                <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                    <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Recent Mail</h3>
                    <button onClick={() => setTab("mail")} className="text-xs font-bold text-accent hover:underline">View All</button>
                  </div>
                  {recentMail.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-light/15 transition-colors"
                      style={{ borderBottom: i < 4 ? "1px solid rgba(232,229,224,0.35)" : "none" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #EBF2FA, #D4E4F4)" }}
                        >
                          {m.type === "Package" ? "📦" : "✉️"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-light truncate">{m.from} → #{m.suiteNumber} ({m.customerName.split(" ")[0]})</p>
                          <p className="text-[10px] text-text-light/35">{m.date}</p>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>

                {/* Notary today */}
                <div className="lg:col-span-2 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Notary Queue</h3>
                    <button onClick={() => setTab("notary")} className="text-xs font-bold text-accent hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    {notaryQueue.map((n) => (
                      <div key={n.id} className="p-3.5 rounded-xl" style={{ background: "rgba(232,229,224,0.3)", border: "1px solid rgba(232,229,224,0.5)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-text-light">{n.customerName}</p>
                          <StatusBadge status={n.status} />
                        </div>
                        <p className="text-[10px] text-text-light/40">{n.date} at {n.time} — {n.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan distribution */}
              <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-text-light mb-4">Plan Distribution</h3>
                <div className="flex gap-3">
                  {[
                    { name: "Basic", count: stats.planDistribution.basic, pct: basicPct, color: "#EBF2FA" },
                    { name: "Business", count: stats.planDistribution.business, pct: businessPct, color: "#3374B5" },
                    { name: "Premium", count: stats.planDistribution.premium, pct: premiumPct, color: "#1A1714" },
                  ].map((p) => (
                    <div key={p.name} className="flex-1">
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-black text-text-light">{p.count}</span>
                        <span className="text-xs font-bold text-text-light/35 mb-1">{p.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-bg-light/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, background: p.color }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/40 mt-1.5">{p.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Customers ─── */}
          {tab === "customers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Customers</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search name, email, suite..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white"
                    style={{ borderColor: "rgba(232,229,224,0.7)" }}
                  />
                  <button
                    onClick={() => setShowAddCustomerModal(true)}
                    className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                  >
                    + Add Customer
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(232,229,224,0.4)", borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                        <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Customer</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Suite</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Plan</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Status</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Mail</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Joined</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c, i) => (
                        <tr key={c.id} className="hover:bg-bg-light/10 transition-colors" style={{ borderBottom: i < filteredCustomers.length - 1 ? "1px solid rgba(232,229,224,0.3)" : "none" }}>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-text-light">{c.name}</p>
                            <p className="text-[10px] text-text-light/35">{c.email}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-text-light">#{c.suiteNumber}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{
                                background: c.plan === "Premium" ? "rgba(26,23,20,0.08)" : c.plan === "Business" ? "rgba(51,116,181,0.1)" : "rgba(232,229,224,0.5)",
                                color: c.plan === "Premium" ? "#1A1714" : c.plan === "Business" ? "#3374B5" : "#1A1714",
                              }}
                            >
                              {c.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusBadge status={c.status} />
                              {(c.securityDepositCents ?? 0) === 0 && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">DEPOSIT REQ</span>
                              )}
                              {c.planDueDate && new Date(c.planDueDate) < new Date() && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">OVERDUE</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-text-light/50">{c.mailCount} mail · {c.packageCount} pkg</td>
                          <td className="px-4 py-3.5 text-xs text-text-light/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openCustomer(c)} className="text-xs font-bold text-accent hover:underline">View</button>
                              <span className="text-text-light/20">|</span>
                              <button
                                onClick={() => openCustomer(c)}
                                className="text-xs font-bold text-white bg-[#3374B5] hover:bg-[#2960a0] px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Compliance / KYC Review ─── */}
          {tab === "compliance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
                  KYC & Onboarding Queue
                </h2>
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-[#162d3a]/8 text-[#162d3a]">
                  {complianceQueue.length} PENDING
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
                {complianceQueue.length === 0 ? (
                  <p className="p-10 text-center text-sm text-[#162d3a]/60">
                    No pending KYC submissions.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#162d3a]/8">
                    {complianceQueue.map((row) => (
                      <li key={row.id} className="p-5">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div>
                            <p className="text-sm font-black text-[#162d3a]">
                              {row.name}
                            </p>
                            <p className="text-xs text-[#162d3a]/60">{row.email}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                              <span className="px-2 py-1 rounded-full bg-[#162d3a]/6">
                                Plan: {row.plan ?? "Free"}
                              </span>
                              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                                KYC: {row.kycStatus}
                              </span>
                              <span className="px-2 py-1 rounded-full bg-[#162d3a]/6">
                                Mailbox: {row.mailboxStatus}
                              </span>
                              {row.suiteNumber && (
                                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                  Suite #{row.suiteNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {row.kycForm1583Url && (
                              <a
                                href={row.kycForm1583Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-black px-3 py-1.5 rounded-full bg-[#162d3a]/8 text-[#162d3a] hover:bg-[#162d3a]/15"
                              >
                                Form 1583
                              </a>
                            )}
                            {row.kycIdImageUrl && (
                              <a
                                href={row.kycIdImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-black px-3 py-1.5 rounded-full bg-[#162d3a]/8 text-[#162d3a] hover:bg-[#162d3a]/15"
                              >
                                ID Image
                              </a>
                            )}
                            <button
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  await reviewKyc(row.id, "Approved");
                                  router.refresh();
                                })
                              }
                              className="text-[11px] font-black px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => {
                                const note = window.prompt("Reason for rejection:") ?? undefined;
                                startTransition(async () => {
                                  await reviewKyc(row.id, "Rejected", note);
                                  router.refresh();
                                });
                              }}
                              className="text-[11px] font-black px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => {
                                const suite = window.prompt(
                                  "Assign suite number:",
                                  row.suiteNumber ?? ""
                                );
                                if (!suite) return;
                                startTransition(async () => {
                                  const res = await assignMailbox(row.id, suite);
                                  if (res?.error) alert(res.error);
                                  router.refresh();
                                });
                              }}
                              className="text-[11px] font-black px-3 py-1.5 rounded-full bg-accent text-white hover:bg-[#1e4d8c] disabled:opacity-50"
                            >
                              Assign Mailbox
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ─── Mail Requests Queue ─── */}
          {tab === "requests" && (
            <div className="space-y-4">
              <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
                Mail Request Queue
              </h2>
              <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
                {mailRequests.length === 0 ? (
                  <p className="p-10 text-center text-sm text-[#162d3a]/60">
                    No pending mail requests.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#162d3a]/8">
                    {mailRequests.map((r) => (
                      <li
                        key={r.id}
                        className="p-5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-black text-[#162d3a]">
                            {r.kind} request — {r.mailFrom}
                          </p>
                          <p className="text-xs text-[#162d3a]/60">
                            {r.userName}
                            {r.suiteNumber ? ` · Suite #${r.suiteNumber}` : ""} ·{" "}
                            {new Date(r.createdAt).toLocaleString()}
                          </p>
                          {r.notes && (
                            <p className="text-[11px] text-[#162d3a]/50 mt-1">
                              {r.notes}
                            </p>
                          )}
                        </div>
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await fulfillMailRequest(r.id);
                              router.refresh();
                            })
                          }
                          className="text-[11px] font-black px-4 py-2 rounded-full bg-accent text-white hover:bg-[#1e4d8c] disabled:opacity-50"
                        >
                          Fulfill
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ─── Key Requests ─── */}
          {tab === "keys" && (
            <div className="space-y-4">
              <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
                Mailbox Key Replacement Requests
              </h2>
              <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
                {keyRequests.length === 0 ? (
                  <p className="p-10 text-center text-sm text-[#162d3a]/60">
                    No pending key requests.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#162d3a]/8">
                    {keyRequests.map((r) => (
                      <li
                        key={r.id}
                        className="p-5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-black text-[#162d3a]">
                            {r.userName}
                          </p>
                          <p className="text-xs text-[#162d3a]/60 mt-0.5">
                            {r.reason}
                          </p>
                          <p className="text-[10px] text-[#162d3a]/40 mt-1">
                            ${(r.feeCents / 100).toFixed(2)} · {r.status} ·{" "}
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {r.status === "Pending" && (
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                await issueNewKey(r.userId, r.id);
                                router.refresh();
                              })
                            }
                            className="text-[11px] font-black px-4 py-2 rounded-full bg-accent text-white hover:bg-[#1e4d8c] disabled:opacity-50"
                          >
                            Issue Key (−$25)
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ─── Mail & Packages ─── */}
          {tab === "mail" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Mail & Packages</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
                      setShowLogMailModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                  >
                    + Log Mail
                  </button>
                  <button
                    onClick={() => {
                      setLogMailForm({ suite: "", from: "", type: "Package", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
                      setShowLogMailModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-text-light bg-white"
                    style={{ border: "1px solid rgba(232,229,224,0.7)" }}
                  >
                    + Log Package
                  </button>
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 flex-wrap">
                {["All", "Scan Requested", "Forward Requested", "Discard Requested", "Pickup Requested", "Awaiting Pickup", "Scanned", "Forwarded", "Held"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setMailFilter(f)}
                    className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: mailFilter === f ? "#1A1714" : "white",
                      color: mailFilter === f ? "#FAFAF8" : "rgba(26,23,20,0.6)",
                      boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                {filteredMail.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-bg-light/15 transition-colors"
                    style={{ borderBottom: i < filteredMail.length - 1 ? "1px solid rgba(232,229,224,0.35)" : "none" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #EBF2FA, #D4E4F4)" }}
                      >
                        {m.type === "Package" ? "📦" : "✉️"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-light">{m.from}</p>
                        <p className="text-xs text-text-light/40">To: {m.customerName} (Suite #{m.suiteNumber}) · {m.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={m.status} />
                      <div className="flex gap-1">
                        {m.status.includes("Requested") && (
                          <button
                            onClick={() => {
                              const target =
                                m.status === "Scan Requested"
                                  ? "Scanned"
                                  : m.status === "Forward Requested"
                                  ? "Forwarded"
                                  : m.status === "Discard Requested"
                                  ? "Picked Up"
                                  : "Awaiting Pickup";
                              handleMailAction(m.id, target);
                            }}
                            disabled={isPending}
                            className="px-3 h-8 rounded-lg text-[10px] font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg, #3374B5, #1e4d8c)" }}
                            title="Fulfill request"
                          >
                            FULFILL
                          </button>
                        )}
                        <label
                          title="Upload scan image"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-[#3374B5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanUpload(m.id, f); }} />
                        </label>
                        <button
                          onClick={() => handleMailAction(m.id, "Scanned")}
                          disabled={isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                          title="Mark Scanned"
                        >SCN</button>
                        <button
                          onClick={() => handleMailAction(m.id, "Forwarded")}
                          disabled={isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                          title="Mark Forwarded"
                        >FWD</button>
                        <button
                          onClick={() => handleMailAction(m.id, "Picked Up")}
                          disabled={isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                          title="Mark Picked Up"
                        >✓</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Deliveries ─── */}
          {tab === "deliveries" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "TOTAL DELIVERIES", value: String(deliveryOrders.length), sub: `${deliveryOrders.filter(d => d.status === "Pending").length} pending` },
                  { label: "IN TRANSIT", value: String(deliveryOrders.filter(d => d.status === "In Transit").length), sub: "Active" },
                  { label: "COMPLETED", value: String(deliveryOrders.filter(d => d.status === "Delivered").length), sub: "Delivered" },
                  { label: "DELIVERY REVENUE", value: `$${deliveryOrders.reduce((sum, d) => sum + d.price, 0).toFixed(2)}`, sub: "All time" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
                    <p className="text-2xl font-black text-text-light">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/40 mt-1">{s.label}</p>
                    <p className="text-xs text-accent mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
                <div className="px-5 py-4 border-b border-border-light">
                  <h3 className="font-black text-sm uppercase text-text-light">Delivery Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF7] text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Destination</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Zone</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Price</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Courier</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryOrders.map((d) => (
                        <tr key={d.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-bold text-text-light">{d.customerName}</span>
                            <span className="text-text-light/40 ml-1">#{d.suiteNumber}</span>
                          </td>
                          <td className="px-5 py-3 text-text-light/70 text-xs">{d.destination}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold ${d.zone === "NoHo" ? "text-accent" : "text-text-light/60"}`}>{d.zone}</span>
                          </td>
                          <td className="px-5 py-3 font-bold text-text-light">${d.price.toFixed(2)}</td>
                          <td className="px-5 py-3 text-xs text-text-light/60">{d.courier}</td>
                          <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                          <td className="px-5 py-3 text-xs text-text-light/40">{d.date}</td>
                          <td className="px-5 py-3">
                            <select
                              value={d.status}
                              onChange={(e) => handleDeliveryStatus(d.id, e.target.value)}
                              disabled={isPending}
                              className="text-[10px] font-bold rounded-lg px-2 py-1 border border-[#e8e5e0] bg-white focus:outline-none focus:ring-1 focus:ring-[#3374B5]"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Picked Up">Picked Up</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Shop Orders ─── */}
          {tab === "shop" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "TOTAL ORDERS", value: String(shopOrders.length), sub: `${shopOrders.filter(o => o.status === "Pending").length} pending` },
                  { label: "PENDING PICKUP", value: String(shopOrders.filter(o => o.status === "Ready").length), sub: "Ready" },
                  { label: "COMPLETED", value: String(shopOrders.filter(o => o.status === "Completed").length), sub: "Fulfilled" },
                  { label: "SHOP REVENUE", value: `$${shopOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}`, sub: "All time" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
                    <p className="text-2xl font-black text-text-light">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/40 mt-1">{s.label}</p>
                    <p className="text-xs text-accent mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
                <div className="px-5 py-4 border-b border-border-light">
                  <h3 className="font-black text-sm uppercase text-text-light">Shop Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF7] text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Items</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Total</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopOrders.map((o) => (
                        <tr key={o.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                          <td className="px-5 py-3 font-bold text-text-light">{o.customerName}</td>
                          <td className="px-5 py-3 text-text-light/70 text-xs">{o.items}</td>
                          <td className="px-5 py-3 font-bold text-text-light">${o.total.toFixed(2)}</td>
                          <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                          <td className="px-5 py-3 text-xs text-text-light/40">{o.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Notary ─── */}
          {tab === "notary" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Notary Appointments</h2>
                <button
                  onClick={() => setShowNewApptModal(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                >
                  + New Appointment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notaryQueue.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl p-6 bg-white"
                    style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "1px solid rgba(232,229,224,0.5)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-black text-text-light">{n.customerName}</p>
                      <StatusBadge status={n.status} />
                    </div>
                    <div className="space-y-1.5 text-sm text-text-light/55">
                      <p>📅 {n.date} at {n.time}</p>
                      <p>📋 {n.type}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleNotaryAction(n.id, "Completed")}
                        disabled={isPending}
                        className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-white disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleNotaryAction(n.id, "Cancelled")}
                        disabled={isPending}
                        className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-text-light disabled:opacity-40"
                        style={{ border: "1px solid rgba(232,229,224,0.7)" }}
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Messages & Contact ─── */}
          {tab === "messages" && (
            <div className="space-y-6">
              <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Messages & Contact Submissions</h2>

              {/* Contact form submissions */}
              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Contact Form Submissions</h3>
                </div>
                {contactSubmissions.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-text-light/40">No contact submissions yet.</div>
                ) : (
                  <ul className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
                    {contactSubmissions.map((c) => (
                      <li key={c.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-sm font-black text-text-light">{c.name}</p>
                            <p className="text-xs text-text-light/50">{c.email} · {c.service ?? "General"} · {new Date(c.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-text-light/70 mt-1.5 max-w-lg leading-relaxed">{c.message}</p>
                          </div>
                          <a
                            href={`mailto:${c.email}?subject=Re: Your NOHO Mailbox inquiry`}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", whiteSpace: "nowrap" }}
                          >
                            Reply
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Message threads */}
              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">In-App Message Threads</h3>
                </div>
                {messageThreads.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-text-light/40">No message threads yet.</div>
                ) : (
                  <ul className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
                    {messageThreads.map((t) => {
                      const unread = t.unreadForUserIds ? JSON.parse(t.unreadForUserIds).length > 0 : false;
                      return (
                        <li key={t.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-text-light truncate">{t.subject}</p>
                                {unread && <span className="w-2 h-2 rounded-full bg-[#3374B5] shrink-0" />}
                              </div>
                              <p className="text-xs text-text-light/50 mt-0.5 truncate">{t.preview || "(no message)"}</p>
                            </div>
                            <p className="text-[10px] text-text-light/35 shrink-0">{new Date(t.lastMessageAt).toLocaleDateString()}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ─── Revenue (Square-powered) ─── */}
          {tab === "revenue" && (
            <div className="space-y-6">
              <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Revenue</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Total Revenue (Square)", value: `$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, sub: `${squareStatus.totalPayments} payments synced` },
                  { label: "Linked Customers", value: String(squareStatus.linkedCustomers), sub: `of ${customers.length} total` },
                  { label: "Avg Per Payment", value: squareStatus.totalPayments > 0 ? `$${(squareStatus.totalRevenue / squareStatus.totalPayments / 100).toFixed(2)}` : "$0.00", sub: "Per transaction" },
                ].map((r) => (
                  <div key={r.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-light/35 mb-2">{r.label}</p>
                    <p className="text-3xl font-black text-text-light">{r.value}</p>
                    <p className="text-xs text-accent font-semibold mt-1">{r.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent payments from Square */}
              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Recent Payments</h3>
                </div>
                {recentPayments.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm text-text-light/40">{squareStatus.configured ? "No payments synced yet. Go to the Square tab to sync." : "Connect Square to see payment data."}</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
                    {recentPayments.map((p) => (
                      <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-text-light">{p.userName ?? "Guest"}</p>
                          <p className="text-[10px] text-text-light/40">{p.sourceType ?? "N/A"} &middot; {new Date(p.squareCreatedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-text-light">${(p.amount / 100).toFixed(2)}</p>
                          <StatusBadge status={p.status === "COMPLETED" ? "Completed" : p.status === "PENDING" ? "Pending" : p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Business Solutions ─── */}
          {tab === "business" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Business Solutions</h2>
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
                >
                  + New Client
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Active Projects", value: "3", color: "#3374B5" },
                  { label: "Completed", value: "12", color: "#1A1714" },
                  { label: "Total Revenue", value: "$30,000", color: "#3374B5" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                    <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-light/35 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Active Projects</h3>
                </div>
                {[
                  { name: "Alex Chen — Startup.io", stage: "Website Build", progress: 70 },
                  { name: "David Kim — Kim Law", stage: "LLC Filing", progress: 30 },
                  { name: "Lisa Wang — Wang Design", stage: "Brand Book", progress: 85 },
                ].map((p, i) => (
                  <div key={p.name} className="px-5 py-4" style={{ borderBottom: i < 2 ? "1px solid rgba(232,229,224,0.35)" : "none" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-text-light">{p.name}</p>
                      <span className="text-xs font-bold text-accent">{p.progress}%</span>
                    </div>
                    <p className="text-xs text-text-light/40 mb-2">{p.stage}</p>
                    <div className="w-full h-1.5 rounded-full bg-bg-light/50 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, #3374B5, #2055A0)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Square Integration ─── */}
          {tab === "square" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Square Integration</h2>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: squareStatus.configured ? "#22c55e" : "#ef4444" }}
                  />
                  <span className="text-xs font-bold text-text-light/50">
                    {squareStatus.configured ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              {!squareStatus.configured && (
                <div
                  className="rounded-2xl p-6 bg-white"
                  style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "2px dashed rgba(239,68,68,0.3)" }}
                >
                  <h3 className="font-black text-sm text-text-light mb-2">Setup Required</h3>
                  <ol className="text-sm text-text-light/60 space-y-1 list-decimal list-inside">
                    <li>Go to <span className="font-mono text-xs text-accent">developer.squareup.com/apps</span></li>
                    <li>Create or select your application</li>
                    <li>Copy your Access Token from the Credentials tab</li>
                    <li>Add it as <span className="font-mono text-xs">SQUARE_ACCESS_TOKEN</span> in your Vercel environment variables</li>
                  </ol>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Linked Customers", value: squareStatus.linkedCustomers },
                  { label: "Payments Synced", value: squareStatus.totalPayments },
                  { label: "Catalog Items", value: squareStatus.catalogItems },
                  { label: "Total Revenue", value: `$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl p-5 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                    <p className="text-2xl font-black text-text-light">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/35 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Sync buttons */}
              <div className="rounded-2xl p-6 bg-white space-y-4" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Sync Data</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Customers", action: () => startTransition(async () => { const r = await syncSquareCustomers(); setSyncResults([r]); }) },
                    { label: "Payments", action: () => startTransition(async () => { const r = await syncSquarePayments(); setSyncResults([r]); }) },
                    { label: "Catalog", action: () => startTransition(async () => { const r = await syncSquareCatalog(); setSyncResults([r]); }) },
                    { label: "Sync All", action: () => startTransition(async () => { const r = await syncAll(); setSyncResults(r); }) },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.action}
                      disabled={isPending || !squareStatus.configured}
                      className="px-4 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-opacity"
                      style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                    >
                      {isPending ? "Syncing..." : btn.label}
                    </button>
                  ))}
                </div>

                {syncResults && (
                  <div className="mt-4 space-y-2">
                    {syncResults.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-4 rounded-xl text-sm"
                        style={{ background: r.success ? "rgba(34,139,34,0.08)" : "rgba(200,50,50,0.08)" }}
                      >
                        <span className="font-bold text-text-light">{r.syncType}</span>
                        <span style={{ color: r.success ? "#1a8a1a" : "#c03030" }}>
                          {r.success ? `${r.itemsSynced} synced` : r.error}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync history */}
              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Sync History</h3>
                </div>
                {squareStatus.recentLogs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-text-light/40">No syncs performed yet</div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
                    {squareStatus.recentLogs.map((log) => (
                      <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-text-light capitalize">{log.syncType}</p>
                          <p className="text-[10px] text-text-light/40">
                            {new Date(log.startedAt).toLocaleString()} &middot; {log.itemsSynced} items
                          </p>
                        </div>
                        <StatusBadge status={log.status === "completed" ? "Completed" : log.status === "failed" ? "Expired" : "Pending"} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Settings ─── */}
          {tab === "settings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Settings</h2>
                {settingsSaved && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                    ✓ Saved to database
                  </span>
                )}
              </div>

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
                          className="text-sm font-semibold text-text-light bg-white border border-[#3374B5] rounded-lg px-2 py-1 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
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
                  className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 4px 14px rgba(51,116,181,0.3)" }}
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
                      style={{ background: n.on ? "#3374B5" : "rgba(26,23,20,0.12)" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                        style={{ left: n.on ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Log Mail Modal ─── */}
      {showLogMailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
              <h3 className="font-black text-base uppercase tracking-wide text-text-light">Log Incoming Mail</h3>
              <button onClick={() => setShowLogMailModal(false)} className="text-text-light/30 hover:text-text-light text-xl">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Type selector — big buttons */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-2 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Letter", "Package"].map((t) => (
                    <button key={t} type="button"
                      onClick={() => setLogMailForm((p) => ({ ...p, type: t }))}
                      className={`py-3 rounded-xl text-sm font-black border transition-colors ${logMailForm.type === t ? "bg-[#3374B5] text-white border-[#3374B5]" : "border-[#e8e5e0] text-text-light hover:border-[#3374B5]"}`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Customer selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Customer / Suite *</label>
                <select value={logMailForm.suite}
                  onChange={(e) => setLogMailForm((p) => ({ ...p, suite: e.target.value }))}
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                >
                  <option value="">— Select customer —</option>
                  {customers
                    .filter((c) => c.suiteNumber)
                    .sort((a, b) => {
                      const n1 = parseInt(a.suiteNumber) || 0;
                      const n2 = parseInt(b.suiteNumber) || 0;
                      return n1 - n2;
                    })
                    .map((c) => (
                      <option key={c.id} value={c.suiteNumber}>
                        Suite #{c.suiteNumber} — {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* From */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">From / Sender *</label>
                <input type="text" value={logMailForm.from}
                  onChange={(e) => setLogMailForm((p) => ({ ...p, from: e.target.value }))}
                  placeholder="e.g. Amazon, IRS, Bank of America"
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                />
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Addressed To</label>
                  <input type="text" value={logMailForm.recipientName}
                    onChange={(e) => setLogMailForm((p) => ({ ...p, recipientName: e.target.value }))}
                    placeholder="Name on label"
                    className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Recipient Phone</label>
                  <input type="tel" value={logMailForm.recipientPhone}
                    onChange={(e) => setLogMailForm((p) => ({ ...p, recipientPhone: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Photo of Mail</label>
                {logMailForm.exteriorImageUrl ? (
                  <div className="relative">
                    <img src={logMailForm.exteriorImageUrl} alt="Mail photo" className="w-full rounded-xl object-cover max-h-48" />
                    <button
                      onClick={() => setLogMailForm((p) => ({ ...p, exteriorImageUrl: "" }))}
                      className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-red-500 shadow text-xs font-bold"
                    >✕</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-[#e8e5e0] cursor-pointer hover:border-[#3374B5] transition-colors bg-[#f8f9fa]">
                    <svg className="w-6 h-6 text-text-light/30 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <span className="text-xs text-text-light/40">{logMailPhotoUploading ? "Uploading…" : "Tap to add photo"}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogMailPhotoUpload(f); }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleLogMailSubmit}
                disabled={isPending || !logMailForm.suite || !logMailForm.from}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
              >
                {isPending ? "Saving…" : `Log ${logMailForm.type} & Notify Customer`}
              </button>
              <button onClick={() => setShowLogMailModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-bold text-text-light border border-[#e8e5e0] hover:bg-[#f5f3f0]"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Customer Modal ─── */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
            <h3 className="font-black text-lg uppercase tracking-wide text-text-light">Add Customer</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Name</label>
                <input
                  type="text"
                  value={addCustomerForm.name}
                  onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Email</label>
                <input
                  type="email"
                  value={addCustomerForm.email}
                  onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Plan</label>
                <select
                  value={addCustomerForm.plan}
                  onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, plan: e.target.value }))}
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white"
                >
                  <option value="Basic">Basic</option>
                  <option value="Business">Business</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Suite Number</label>
                <input
                  type="text"
                  value={addCustomerForm.suite}
                  onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, suite: e.target.value }))}
                  placeholder="e.g. 205"
                  className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddCustomerSubmit}
                disabled={isPending || !addCustomerForm.name || !addCustomerForm.email || !addCustomerForm.suite}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
              >
                {isPending ? "Creating..." : "Add Customer"}
              </button>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light"
                style={{ border: "1px solid rgba(232,229,224,0.7)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Customer Modal ─── */}
      {viewCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setViewCustomer(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.22)" }} onClick={(e) => e.stopPropagation()}>
            {/* ── Header ── */}
            <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-text-light">Edit Customer</h3>
                <p className="text-[11px] text-text-light/40 mt-0.5">#{viewCustomer.suiteNumber || "—"} · joined {viewCustomer.createdAt} · {viewCustomer.mailCount} mail · {viewCustomer.packageCount} pkgs</p>
              </div>
              <button onClick={() => setViewCustomer(null)} className="text-text-light/30 hover:text-text-light text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Error / success */}
              {editError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{editError}</div>}
              {editSuccess && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-semibold">✓ Saved successfully</div>}

              {/* ── Personal Info ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Personal Info</p>
                {[
                  { label: "Full Name", key: "name", type: "text", placeholder: "Jane Smith" },
                  { label: "Email", key: "email", type: "email", placeholder: "jane@example.com" },
                  { label: "Phone", key: "phone", type: "tel", placeholder: "(818) 765-1539" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                    <input
                      type={type}
                      value={editForm[key as keyof typeof editForm] as string}
                      onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                ))}
              </div>

              {/* ── Mailbox ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Mailbox</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Box Number</label>
                    <input
                      type="text"
                      value={editForm.suiteNumber}
                      onChange={(e) => setEditForm((p) => ({ ...p, suiteNumber: e.target.value }))}
                      placeholder="e.g. 24"
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Mailbox Status</label>
                    <select
                      value={editForm.mailboxStatus}
                      onChange={(e) => setEditForm((p) => ({ ...p, mailboxStatus: e.target.value }))}
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Plan ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Plan</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Plan Tier</label>
                    <select
                      value={editForm.plan}
                      onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value }))}
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    >
                      <option value="">— None —</option>
                      <option value="Basic">Basic</option>
                      <option value="Business">Business</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Term (months)</label>
                    <select
                      value={editForm.planTerm}
                      onChange={(e) => setEditForm((p) => ({ ...p, planTerm: e.target.value }))}
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    >
                      <option value="">No term</option>
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="14">14 months</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Renewal Date ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Renewal / Due Date</p>
                  {editForm.planDueDate && new Date(editForm.planDueDate) < new Date() && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OVERDUE</span>
                  )}
                </div>
                <input
                  type="date"
                  value={editForm.planDueDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, planDueDate: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[{ label: "+1 mo", m: 1 }, { label: "+3 mo", m: 3 }, { label: "+6 mo", m: 6 }, { label: "+1 yr", m: 12 }].map(({ label, m }) => (
                    <button key={label} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, planDueDate: addMonths(p.planDueDate, m) }))}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"
                    >{label}</button>
                  ))}
                  <button type="button"
                    onClick={() => setEditForm((p) => ({ ...p, planDueDate: "" }))}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#e8e5e0] text-text-light/40 hover:text-red-500 hover:border-red-300"
                  >Clear</button>
                </div>
              </div>

              {/* ── Security Deposit ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Security Deposit</p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-light/40">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={(editForm.depositCents / 100).toFixed(0)}
                      onChange={(e) => setEditForm((p) => ({ ...p, depositCents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                      className="w-full rounded-xl border border-[#e8e5e0] pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                  <button type="button"
                    onClick={() => setEditForm((p) => ({ ...p, depositCents: 5000 }))}
                    className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100"
                  >Mark Paid ($50)</button>
                  <button type="button"
                    onClick={() => setEditForm((p) => ({ ...p, depositCents: 0 }))}
                    className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100"
                  >Required</button>
                </div>
              </div>

              {/* ── KYC ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">KYC / Identity</p>
                <div className="flex gap-2 flex-wrap">
                  {["Pending", "Submitted", "Approved", "Rejected"].map((s) => (
                    <button key={s} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, kycStatus: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${editForm.kycStatus === s ? "bg-[#3374B5] text-white border-[#3374B5]" : "border-[#e8e5e0] text-text-light hover:border-[#3374B5]"}`}
                    >{s}</button>
                  ))}
                </div>
                {(viewCustomer.kycForm1583Url || viewCustomer.kycIdImageUrl || viewCustomer.kycIdImage2Url) && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {viewCustomer.kycForm1583Url && <a href={viewCustomer.kycForm1583Url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">📄 Form 1583</a>}
                    {viewCustomer.kycIdImageUrl && <a href={viewCustomer.kycIdImageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">🪪 Primary ID</a>}
                    {viewCustomer.kycIdImage2Url && <a href={viewCustomer.kycIdImage2Url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">🪪 Second ID</a>}
                  </div>
                )}
              </div>

              {/* ── Card on File ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Card on File</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Cardholder Name</label>
                    <input type="text" value={editForm.cardholderName}
                      onChange={(e) => setEditForm((p) => ({ ...p, cardholderName: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Card Brand</label>
                    <select value={editForm.cardBrand}
                      onChange={(e) => setEditForm((p) => ({ ...p, cardBrand: e.target.value }))}
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    >
                      <option value="">— None —</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Amex">Amex</option>
                      <option value="Discover">Discover</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Last 4 Digits</label>
                    <input type="text" value={editForm.cardLast4} maxLength={4}
                      onChange={(e) => setEditForm((p) => ({ ...p, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      placeholder="4242"
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Expiry (MM/YY)</label>
                    <input type="text" value={editForm.cardExpiry} maxLength={5}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                        setEditForm((p) => ({ ...p, cardExpiry: v }));
                      }}
                      placeholder="09/27"
                      className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Discount % (applied to this customer)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} max={100} value={editForm.cardDiscountPct}
                      onChange={(e) => setEditForm((p) => ({ ...p, cardDiscountPct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-24 rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                    />
                    <span className="text-sm font-bold text-text-light/50">%</span>
                    <div className="flex gap-1.5">
                      {[0, 10, 15, 20, 25].map((pct) => (
                        <button key={pct} type="button"
                          onClick={() => setEditForm((p) => ({ ...p, cardDiscountPct: pct }))}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${editForm.cardDiscountPct === pct ? "bg-[#3374B5] text-white" : "bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"}`}
                        >{pct}%</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Save All ── */}
              <button
                disabled={isPending}
                onClick={() => {
                  setEditError(null);
                  setEditSuccess(false);
                  startTransition(async () => {
                    const result = await updateCustomerDetails(viewCustomer.id, {
                      name: editForm.name,
                      email: editForm.email,
                      phone: editForm.phone,
                      suiteNumber: editForm.suiteNumber,
                      plan: editForm.plan,
                      planTerm: editForm.planTerm || null,
                      mailboxStatus: editForm.mailboxStatus,
                      planDueDate: editForm.planDueDate || null,
                      securityDepositCents: editForm.depositCents,
                      kycStatus: editForm.kycStatus,
                      cardLast4: editForm.cardLast4 || null,
                      cardBrand: editForm.cardBrand || null,
                      cardExpiry: editForm.cardExpiry || null,
                      cardholderName: editForm.cardholderName || null,
                      cardDiscountPct: editForm.cardDiscountPct,
                    });
                    if (result.error) {
                      setEditError(result.error);
                    } else {
                      setEditSuccess(true);
                      router.refresh();
                    }
                  });
                }}
                className="w-full py-3 rounded-xl bg-[#3374B5] text-white font-black text-sm hover:bg-[#2960a0] disabled:opacity-50 transition-colors"
              >
                {isPending ? "Saving…" : "Save All Changes"}
              </button>

              {/* ── Danger Zone ── */}
              <div className="rounded-xl border border-red-200/60 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-red-400">Danger Zone</p>
                <div className="flex gap-2">
                  <button disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Suspend ${viewCustomer.name}? They lose mailbox access immediately.`)) return;
                      startTransition(async () => { await suspendCustomer(viewCustomer.id); setViewCustomer(null); router.refresh(); });
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                  >⛔ Suspend Account</button>
                  <button disabled={isPending}
                    onClick={() => startTransition(async () => { await reactivateCustomer(viewCustomer.id); setViewCustomer(null); router.refresh(); })}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 disabled:opacity-50"
                  >✓ Reactivate</button>
                </div>
              </div>

            </div>

            <div className="px-6 pb-6">
              <button onClick={() => setViewCustomer(null)} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-text-light border border-[#e8e5e0] hover:bg-[#f5f3f0]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Appointment Modal ─── */}
      {showNewApptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
            <h3 className="font-black text-lg uppercase tracking-wide text-text-light">New Notary Appointment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Customer Name</label>
                <input type="text" value={apptForm.customer} onChange={(e) => setApptForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Full name" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Date</label>
                  <input type="date" value={apptForm.date} onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Time</label>
                  <input type="time" value={apptForm.time} onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Document Type</label>
                <select value={apptForm.type} onChange={(e) => setApptForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white">
                  <option value="Acknowledgment">Acknowledgment</option>
                  <option value="Jurat">Jurat</option>
                  <option value="Power of Attorney">Power of Attorney</option>
                  <option value="Deed">Deed</option>
                  <option value="Affidavit">Affidavit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNewApptModal(false); setApptForm({ customer: "", date: "", time: "", type: "Acknowledgment" }); }}
                disabled={!apptForm.customer || !apptForm.date || !apptForm.time}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
              >
                Schedule Appointment
              </button>
              <button onClick={() => setShowNewApptModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light" style={{ border: "1px solid rgba(232,229,224,0.7)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Business Client Modal ─── */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
            <h3 className="font-black text-lg uppercase tracking-wide text-text-light">New Business Client</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Business / Client Name</label>
                <input type="text" value={clientForm.name} onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sunrise Bakery" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Email</label>
                <input type="email" value={clientForm.email} onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@business.com" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Phone</label>
                <input type="tel" value={clientForm.phone} onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(818) 555-0000" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Package</label>
                <select value={clientForm.package} onChange={(e) => setClientForm((p) => ({ ...p, package: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white">
                  <option value="Full Package">Full Package ($2,000)</option>
                  <option value="Formation Only">Business Formation</option>
                  <option value="Branding Only">Brand Identity & Design</option>
                  <option value="Website Only">Website Development</option>
                  <option value="Brand Management">Brand Management</option>
                  <option value="Custom">Custom Package</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNewClientModal(false); setClientForm({ name: "", email: "", phone: "", package: "Full Package" }); }}
                disabled={!clientForm.name || !clientForm.email}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
              >
                Add Client
              </button>
              <button onClick={() => setShowNewClientModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light" style={{ border: "1px solid rgba(232,229,224,0.7)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
