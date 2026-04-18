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

import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { AdminCustomersPanel } from "@/components/admin/AdminCustomersPanel";
import { AdminCompliancePanel } from "@/components/admin/AdminCompliancePanel";
import { AdminRequestsPanel } from "@/components/admin/AdminRequestsPanel";
import { AdminKeysPanel } from "@/components/admin/AdminKeysPanel";
import { AdminMailPanel } from "@/components/admin/AdminMailPanel";
import { AdminDeliveriesPanel } from "@/components/admin/AdminDeliveriesPanel";
import { AdminShopPanel } from "@/components/admin/AdminShopPanel";
import { AdminNotaryPanel } from "@/components/admin/AdminNotaryPanel";
import { AdminMessagesPanel } from "@/components/admin/AdminMessagesPanel";
import { AdminRevenuePanel } from "@/components/admin/AdminRevenuePanel";
import { AdminBusinessPanel } from "@/components/admin/AdminBusinessPanel";
import { AdminSquarePanel } from "@/components/admin/AdminSquarePanel";
import { AdminShippoPanel } from "@/components/admin/AdminShippoPanel";
import AdminBillingPanel from "@/components/admin/AdminBillingPanel";
import { AdminCancellationsPanel } from "@/components/admin/AdminCancellationsPanel";
import { AdminMailHoldPanel } from "@/components/admin/AdminMailHoldPanel";
import { AdminQRPickupPanel } from "@/components/admin/AdminQRPickupPanel";
import { LogMailModal } from "@/components/admin/LogMailModal";
import { AddCustomerModal } from "@/components/admin/AddCustomerModal";
import { EditCustomerModal } from "@/components/admin/EditCustomerModal";
import { NewApptModal } from "@/components/admin/NewApptModal";
import { NewClientModal } from "@/components/admin/NewClientModal";

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
  { icon: "💳", label: "Billing", id: "billing" },
  { icon: "❌", label: "Cancellations", id: "cancellations" },
  { icon: "📦", label: "Mail Hold", id: "mailhold" },
  { icon: "📱", label: "QR Pickup", id: "qrpickup" },
  { icon: "💰", label: "Revenue", id: "revenue" },
  { icon: "🏢", label: "Business Solutions", id: "business" },
  { icon: "📦", label: "Shipping", id: "shipping" },
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

export default function AdminDashboardClient({ customers, recentMail, notaryQueue, deliveryOrders, shopOrders, stats, squareStatus, recentPayments, complianceQueue = [], mailRequests = [], keyRequests = [], messageThreads = [], contactSubmissions = [], siteSettings = {}, shippoConfigured = false, recentShippoLabels = [] }: Props) {
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
  // AddCustomerModal is now self-contained — no parent state needed

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
    { key: "store.name",    label: "Store Name", value: siteSettings["store.name"]    ?? "NOHO Mailbox" },
    { key: "store.address", label: "Address",    value: siteSettings["store.address"] ?? "5062 Lankershim Blvd, North Hollywood, CA 91601" },
    { key: "store.phone",   label: "Phone",      value: siteSettings["store.phone"]   ?? "(818) 765-1539" },
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


          {/* ─── Tab Panels ─── */}
          {tab === "overview" && (
            <AdminOverviewPanel
              stats={stats}
              recentMail={recentMail}
              notaryQueue={notaryQueue}
              setTab={setTab}
            />
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
          {tab === "requests" && (
            <AdminRequestsPanel mailRequests={mailRequests} />
          )}
          {tab === "keys" && (
            <AdminKeysPanel keyRequests={keyRequests} />
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
            <AdminNotaryPanel
              notaryQueue={notaryQueue}
              isPending={isPending}
              handleNotaryAction={handleNotaryAction}
              setShowNewApptModal={setShowNewApptModal}
            />
          )}
          {tab === "messages" && (
            <AdminMessagesPanel
              messageThreads={messageThreads}
              contactSubmissions={contactSubmissions}
            />
          )}
          {tab === "billing" && <AdminBillingPanel />}
          {tab === "cancellations" && <AdminCancellationsPanel />}
          {tab === "mailhold" && <AdminMailHoldPanel />}
          {tab === "qrpickup" && <AdminQRPickupPanel />}
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
          {tab === "shipping" && (
            <AdminShippoPanel
              isConfigured={shippoConfigured}
              recentLabels={recentShippoLabels}
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
                          className="text-sm font-semibold text-text-light bg-white border border-[#3374B5] rounded-lg px-2 py-1 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
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
                  className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 4px 14px rgba(51,116,181,0.3)" }}
                >
                  {isPending ? "Saving…" : "Save Carrier Times"}
                </button>
              </div>
            </div>
          )}
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
    </div>
  );
}
