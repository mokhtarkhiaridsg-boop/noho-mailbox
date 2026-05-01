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
import { AdminChatPanel } from "@/components/admin/AdminChatPanel";
import AdminPOSPanel from "@/components/admin/AdminPOSPanel";

type NavItem = { id: string; label: string; Icon: (p: { className?: string }) => React.ReactElement };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Today",
    items: [
      { id: "overview", label: "Overview", Icon: IconOverview },
      { id: "register", label: "Cash Register", Icon: IconRegister },
      { id: "signups", label: "Signup Requests", Icon: IconSignup },
      { id: "credits", label: "Credit Requests", Icon: IconCredit },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customers", label: "Customers", Icon: IconCustomers },
      { id: "mailboxcenter", label: "Mailbox Center", Icon: IconBox },
      { id: "compliance", label: "Compliance", Icon: IconCompliance },
    ],
  },
  {
    label: "Mail",
    items: [
      { id: "mail", label: "Mail & Packages", Icon: IconMail },
      { id: "requests", label: "Mail Requests", Icon: IconClipboard },
      { id: "mailhold", label: "Mail Hold", Icon: IconHold },
      { id: "keys", label: "Key Requests", Icon: IconKey },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "deliveries", label: "Deliveries", Icon: IconTruck },
      { id: "qrpickup", label: "QR Pickup", Icon: IconQR },
      { id: "notary", label: "Notary", Icon: IconNotary },
      { id: "shippingcenter", label: "Shipping Center", Icon: IconShipping },
      { id: "shop", label: "Shop Orders", Icon: IconShop },
    ],
  },
  {
    label: "Communications",
    items: [
      { id: "messages", label: "Messages", Icon: IconChat },
      { id: "emails", label: "Email Logs", Icon: IconEmail },
    ],
  },
  {
    label: "Reports",
    items: [
      { id: "quarterly", label: "Quarterly Statements", Icon: IconCalendar },
      { id: "revenue", label: "Revenue", Icon: IconReport },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "billing", label: "Billing", Icon: IconReceipt },
      { id: "cancellations", label: "Cancellations", Icon: IconCancel },
      { id: "business", label: "Business Solutions", Icon: IconBuilding },
      { id: "partners", label: "Partner Program", Icon: IconReport },
      { id: "tenants", label: "SaaS Tenants", Icon: IconBuilding },
      { id: "square", label: "Square", Icon: IconSquare },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", Icon: IconSettings }],
  },
];

// Flat list for mobile pills + label lookup.
const flatNav: NavItem[] = navGroups.flatMap((g) => g.items);
function getNavItem(id: string) {
  return flatNav.find((i) => i.id === id);
}

// ─── MailOS status strip ────────────────────────────────────────────────
//
// Ultra-thin (h-7) sticky bar above the main header. Reads as a system
// status line — like a macOS menubar — but in NOHO's cream/ink palette.
// Updates live: clock ticks every second, a subtle pulse signals "system
// online", and "to-do" counters surface the most urgent admin queues.
function MailOsStatusStrip(props: {
  signupCount: number;
  creditCount: number;
  mailRequestCount: number;
  keyRequestCount: number;
  currentTabLabel: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const todoTotal =
    props.signupCount + props.creditCount + props.mailRequestCount + props.keyRequestCount;
  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : "—";
  const dateStr = now
    ? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "—";

  return (
    <div
      className="sticky top-0 z-50 h-7 px-3 sm:px-4 flex items-center justify-between text-[10px] font-bold tracking-wide select-none"
      style={{
        background:
          "linear-gradient(180deg, rgba(247,230,194,0.9) 0%, rgba(244,236,219,0.92) 100%)",
        backdropFilter: "saturate(140%) blur(6px)",
        WebkitBackdropFilter: "saturate(140%) blur(6px)",
        borderBottom: "1px solid rgba(45,16,15,0.12)",
        color: "#2D100F",
      }}
      role="banner"
      aria-label="MailOS status strip"
    >
      {/* Left: brand mark + system menu hint */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden="true"
          className="w-3.5 h-3.5 rounded-md inline-flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
            color: "#F7E6C2",
            fontSize: 8,
            fontWeight: 900,
          }}
        >

        </span>
        <span className="font-black truncate" style={{ letterSpacing: "0.04em" }}>
          MailOS
        </span>
        <span className="hidden sm:inline opacity-50 mx-1">·</span>
        <span className="hidden sm:inline opacity-60 truncate">
          {props.currentTabLabel}
        </span>
      </div>

      {/* Center: live clock */}
      <div className="hidden md:flex items-center gap-2">
        <span
          className="font-black"
          style={{
            fontFamily:
              'ui-monospace, "SF Mono", "Menlo", "Monaco", "Cascadia Code", monospace',
            letterSpacing: "0.04em",
          }}
        >
          {dateStr}
        </span>
        <span className="opacity-30">·</span>
        <span
          className="font-black"
          style={{
            fontFamily:
              'ui-monospace, "SF Mono", "Menlo", "Monaco", "Cascadia Code", monospace',
            letterSpacing: "0.06em",
            minWidth: "5ch",
            textAlign: "center",
          }}
        >
          {timeStr}
        </span>
      </div>

      {/* Right: live pulse + counters */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {todoTotal > 0 && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{
              background: "rgba(231,0,19,0.10)",
              color: "#a51b1b",
              border: "1px solid rgba(231,0,19,0.18)",
            }}
            title={`Action items waiting: ${props.signupCount} signups · ${props.creditCount} credits · ${props.mailRequestCount} mail requests · ${props.keyRequestCount} key requests`}
          >
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor" aria-hidden="true">
              <circle cx="6" cy="6" r="2.5" />
            </svg>
            <span className="font-black">{todoTotal}</span>
            <span className="hidden sm:inline opacity-70">to-do</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#16a34a" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "#16a34a" }}
            />
          </span>
          <span className="hidden sm:inline opacity-70">Online</span>
        </span>
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
};

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
          style={{ background: "linear-gradient(135deg, #337485, #1a3f7a)" }}
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

export default function AdminDashboardClient({ customers, recentMail, notaryQueue, deliveryOrders, shopOrders, stats, squareStatus, recentPayments, complianceQueue = [], mailRequests = [], keyRequests = [], messageThreads = [], contactSubmissions = [], partners = [], tenants = [], siteSettings = {}, shippoConfigured = false, recentShippoLabels = [], creditRequests = [], labelOrders = [], mailboxRenewals = [], customerNotes = [], mailboxKeys = [], walkInToday, mrrCents = 0, dormantCount = 0, planDistribution, tillWeek, churn30dCount = 0, churnAnnualizedPct = 0, forwardingByState, adminId = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab is URL-synced: ?tab=mailboxcenter — so deep-links work, refresh
  // preserves the panel, and the browser back/forward buttons step through
  // panel history instead of escaping to /. Initial value reads from the URL.
  // Normalize hyphenated slugs (`mailbox-center`) to the camelcase IDs used
  // internally (`mailboxcenter`) so old bookmarks / external links resolve.
  const ALL_TAB_IDS = navGroups.flatMap((g) => g.items.map((i) => i.id));
  function normalizeTabSlug(raw: string | null): string {
    if (!raw) return "overview";
    if (ALL_TAB_IDS.includes(raw)) return raw;
    const stripped = raw.replace(/-/g, "").toLowerCase();
    const match = ALL_TAB_IDS.find((id) => id.toLowerCase() === stripped);
    return match ?? "overview";
  }
  const [tab, setTabState] = useState(() => normalizeTabSlug(searchParams.get("tab")));

  // When the URL changes (back/forward/external link), pull the tab back in.
  useEffect(() => {
    const next = normalizeTabSlug(searchParams.get("tab"));
    setTabState((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
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

  return (
    <div className="min-h-screen text-[#2D100F]" style={{ background: "#F7E6C2" }}>
      {/* ─── MailOS status strip — frosted, ultra-thin, sticky on top.
          Gives the admin panel an "operating-system shell" feel: live clock,
          system-state pulse, and at-a-glance counters. Brand stays cream-ink:
          no foreign blue/grey OS chrome. */}
      <MailOsStatusStrip
        signupCount={pendingSignups}
        creditCount={creditRequests.filter((r) => r.status === "Pending" || r.status === "LinkSent").length}
        mailRequestCount={mailRequests.length}
        keyRequestCount={keyRequests.length}
        currentTabLabel={currentTab?.label ?? "Overview"}
      />

      {/* ─── Top bar — branded cream with brown accents ─── */}
      <header
        className="sticky top-7 z-40 px-5 h-16 flex items-center justify-between"
        style={{
          background: "#F7E6C2",
          borderBottom: "1.5px solid rgba(45,16,15,0.12)",
        }}
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo className="h-7 sm:h-8 w-auto transition-transform duration-300 group-hover:scale-[1.03]" />
          </Link>
          <div
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ background: "#2D100F", color: "#F7E6C2" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            Admin Console
          </div>
          <span className="hidden md:block text-[11px] font-semibold" style={{ color: "rgba(45,16,15,0.55)" }}>
            <span style={{ color: "rgba(45,16,15,0.4)" }}>Console</span>
            <span className="mx-1.5" style={{ color: "rgba(45,16,15,0.25)" }}>/</span>
            <span className="font-black" style={{ color: "#2D100F" }}>{currentTab?.label ?? "Overview"}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(45,16,15,0.12)" }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ color: "rgba(45,16,15,0.5)" }} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m17 17 4 4" strokeLinecap="round" /></svg>
            <input
              type="text"
              placeholder="Search customers, mail, suites…"
              className="bg-transparent text-xs font-semibold focus:outline-none w-52"
              style={{ color: "#2D100F" }}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (tab !== "customers") setTab("customers"); }}
            />
          </div>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-colors"
            style={{ color: "rgba(45,16,15,0.65)", background: "rgba(255,255,255,0.5)", border: "1px solid rgba(45,16,15,0.1)" }}
          >
            <IconExternal className="w-3 h-3" />
            Member View
          </Link>
          <ProfileDropdown />
        </div>
      </header>

      <div className="flex">
        {/* ─── Branded sidebar — brown ink with warm cream accents ─── */}
        <aside
          className="hidden lg:flex flex-col w-64 shrink-0 sticky top-16 self-start"
          style={{
            height: "calc(100vh - 64px)",
            background: "#2D100F",
            borderRight: "1px solid rgba(247,230,194,0.05)",
          }}
        >
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p
                  className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.24em] flex items-center gap-2"
                  style={{ color: "rgba(247,230,194,0.4)" }}
                >
                  {/* Soft gradient underline accent — gives each group a
                      subtle visual identity without screaming for attention. */}
                  <span
                    aria-hidden="true"
                    className="inline-block h-px w-3"
                    style={{ background: "linear-gradient(90deg, rgba(51,116,133,0.6), rgba(247,230,194,0.05))" }}
                  />
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = tab === item.id;
                    const badge = badgeFor(item.id);
                    const urgentBadge = item.id === "signups" || item.id === "credits" || item.id === "requests" || item.id === "mailhold";
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setTab(item.id)}
                          className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 text-left relative overflow-hidden"
                          style={{
                            background: active
                              ? "linear-gradient(90deg, rgba(51,116,133,0.32) 0%, rgba(51,116,133,0.18) 50%, rgba(51,116,133,0.08) 100%)"
                              : "transparent",
                            color: active ? "#F7E6C2" : "rgba(247,230,194,0.65)",
                            boxShadow: active
                              ? "inset 0 1px 0 rgba(247,230,194,0.08), 0 1px 14px rgba(51,116,133,0.18)"
                              : undefined,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = "rgba(247,230,194,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {active && (
                            <>
                              {/* Glowing left rail with gradient — replaces
                                  the flat 3px bar with a vertically-fading
                                  teal accent that has a subtle halo. */}
                              <span
                                aria-hidden="true"
                                className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
                                style={{
                                  background: "linear-gradient(180deg, #337485 0%, #4a8ea0 50%, #337485 100%)",
                                  boxShadow: "0 0 10px 1px rgba(51,116,133,0.5)",
                                }}
                              />
                              {/* Soft right-edge fade so the active row looks
                                  recessed rather than pasted on. */}
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 right-0 w-12 pointer-events-none"
                                style={{
                                  background: "linear-gradient(90deg, transparent, rgba(247,230,194,0.04))",
                                }}
                              />
                            </>
                          )}
                          <span
                            aria-hidden="true"
                            className="shrink-0 transition-transform duration-200 group-hover:scale-110 inline-flex"
                            style={{
                              filter: active ? "drop-shadow(0 0 6px rgba(247,230,194,0.35))" : undefined,
                            }}
                          >
                            <item.Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span
                              className="relative text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-all duration-200 group-hover:scale-110"
                              style={{
                                background: urgentBadge ? "#F5A623" : "#337485",
                                color: urgentBadge ? "#2D100F" : "white",
                                boxShadow: urgentBadge ? "0 0 12px rgba(245,166,35,0.45)" : "0 0 8px rgba(51,116,133,0.35)",
                              }}
                            >
                              {/* Animated outer ping ring — visually signals
                                  "fresh attention needed" on urgent badges. */}
                              {urgentBadge && (
                                <span
                                  aria-hidden="true"
                                  className="absolute inset-0 rounded-full animate-ping"
                                  style={{ background: "#F5A623", opacity: 0.4 }}
                                />
                              )}
                              <span className="relative">{badge}</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer status pill */}
          <div className="p-3" style={{ borderTop: "1px solid rgba(247,230,194,0.06)" }}>
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(51,116,133,0.18)",
                border: "1px solid rgba(51,116,133,0.32)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <p className="text-[11px] font-black" style={{ color: "#F7E6C2" }}>
                  All systems operational
                </p>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "rgba(247,230,194,0.55)" }}>
                NOHO Mailbox · Lankershim Blvd
              </p>
            </div>
          </div>
        </aside>

        {/* ─── Main content area — warm cream canvas wrapped in MailOS
            window-chrome (traffic-light dots + panel title in monospace).
            The chrome is purely decorative — no minimize/close behavior —
            but it instantly flips the visual perception from "webapp" to
            "OS workspace" while staying entirely on-brand. */}
        <div
          className="flex-1 min-w-0 min-h-[calc(100vh-92px)] px-3 sm:px-5 py-4 sm:py-5"
          style={{ background: "#FAFAF8", color: "#2D100F" }}
        >
          <div
            className="mx-auto max-w-[1400px] rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(45,16,15,0.08)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 28px rgba(45,16,15,0.06), 0 1px 3px rgba(45,16,15,0.04)",
            }}
          >
            {/* Window title bar — three traffic-light dots in brand colors
                (red Tunisia, cream box, blue brand), then the active-panel
                label in monospace, then a subtle right-side hint. */}
            <div
              className="flex items-center px-4 sm:px-5 h-9 select-none"
              style={{
                background:
                  "linear-gradient(180deg, #F8F2EA 0%, #F4ECDB 100%)",
                borderBottom: "1px solid rgba(45,16,15,0.08)",
              }}
            >
              {/* Traffic lights */}
              <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "#E70013",
                    boxShadow: "inset 0 0 0 1px rgba(45,16,15,0.18), 0 1px 0 rgba(255,255,255,0.4)",
                  }}
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "#F5A623",
                    boxShadow: "inset 0 0 0 1px rgba(45,16,15,0.18), 0 1px 0 rgba(255,255,255,0.4)",
                  }}
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "#337485",
                    boxShadow: "inset 0 0 0 1px rgba(45,16,15,0.18), 0 1px 0 rgba(255,255,255,0.4)",
                  }}
                />
              </div>
              {/* Panel title in monospace */}
              <div className="flex-1 text-center">
                <span
                  className="text-[11px] font-bold tracking-[0.06em]"
                  style={{
                    color: "rgba(45,16,15,0.55)",
                    fontFamily:
                      'ui-monospace, "SF Mono", "Menlo", "Monaco", "Cascadia Code", monospace',
                  }}
                >
                  ~/admin/{tab} · {currentTab?.label ?? "Overview"}
                </span>
              </div>
              {/* Right-side keyboard hint */}
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <kbd
                  className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(45,16,15,0.06)",
                    color: "rgba(45,16,15,0.55)",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  ⌘K
                </kbd>
                <span className="text-[9px]" style={{ color: "rgba(45,16,15,0.4)" }}>
                  search
                </span>
              </div>
            </div>

            {/* Inner content — the original admin canvas */}
            <div className="px-3 sm:px-5 py-4 sm:py-6">
          {/* Mobile pill nav — branded cream/brown */}
          <div className="lg:hidden mb-5">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {flatNav.map((item) => {
                const active = tab === item.id;
                const badge = badgeFor(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200 snap-start"
                    style={{
                      background: active ? "#2D100F" : "white",
                      color: active ? "#F7E6C2" : "rgba(45,16,15,0.7)",
                      border: active ? "1px solid #2D100F" : "1px solid rgba(45,16,15,0.12)",
                      boxShadow: active ? "0 4px 12px rgba(45,16,15,0.18)" : "none",
                    }}
                  >
                    <item.Icon className="w-3.5 h-3.5" />
                    {item.label}
                    {badge > 0 && (
                      <span
                        className="text-[9px] font-black px-1 py-0 rounded-full min-w-[16px] h-4 inline-flex items-center justify-center"
                        style={{
                          background: active ? "#F5A623" : "#337485",
                          color: active ? "#2D100F" : "white",
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
            <AdminPOSPanel />
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
            <AdminChatPanel meId={adminId} customers={customers} />
          )}
          {tab === "emails" && <AdminEmailLogsPanel />}
          {tab === "billing" && <AdminBillingPanel />}
          {tab === "cancellations" && <AdminCancellationsPanel />}
          {tab === "partners" && <AdminPartnersPanel partners={partners} />}
          {tab === "tenants" && <AdminTenantsPanel tenants={tenants} />}
          {tab === "mailhold" && <AdminMailHoldPanel />}
          {tab === "qrpickup" && <AdminQRPickupPanel />}
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
                  className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 4px 14px rgba(51,116,133,0.3)" }}
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
                  className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 4px 14px rgba(51,116,133,0.3)" }}
                >
                  {isPending ? "Saving…" : "Save Carrier Times"}
                </button>
              </div>
            </div>
          )}
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

      {/* ─── MailOS Dock — bottom-anchored quick-launch ─────────────────
          Floats fixed at the bottom of the viewport. Hides on small
          screens (mobile already has the pill nav). Magnetic hover via
          CSS-only scale-on-:hover so it costs zero JS. */}
      <MailOsDock
        onLogMail={() => {
          setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
          setShowLogMailModal(true);
        }}
        onLogPackage={() => {
          setLogMailForm({ suite: "", from: "", type: "Package", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
          setShowLogMailModal(true);
        }}
        onAddCustomer={() => setShowAddCustomerModal(true)}
        onJump={(id) => setTab(id)}
        unreadTotal={pendingSignups + creditRequests.filter((r) => r.status === "Pending" || r.status === "LinkSent").length + mailRequests.length + keyRequests.length}
      />
    </div>
  );
}

// ─── MailOS Dock ────────────────────────────────────────────────────────
//
// Bottom-floating quick-launch bar. Six icon tiles, each with a tooltip
// label that surfaces on hover. Magnetic-style scale on hover (subtle,
// not gimmicky) — adjacent siblings nudge slightly via :has() neighbor
// selectors when supported, otherwise just the hovered item scales.
function MailOsDock(props: {
  onLogMail: () => void;
  onLogPackage: () => void;
  onAddCustomer: () => void;
  onJump: (tabId: string) => void;
  unreadTotal: number;
}) {
  const items: Array<{
    key: string;
    label: string;
    onClick: () => void;
    badge?: number;
    accent: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "mail",
      label: "Log Mail",
      onClick: props.onLogMail,
      accent: "#337485",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 8 L12 14 L21 8" />
        </svg>
      ),
    },
    {
      key: "package",
      label: "Log Package",
      onClick: props.onLogPackage,
      accent: "#23596A",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" />
          <path d="M3 7 L12 11 L21 7" />
          <path d="M12 11 L12 21" />
        </svg>
      ),
    },
    {
      key: "customer",
      label: "New Customer",
      onClick: props.onAddCustomer,
      accent: "#B07030",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 20 C5 15.5 8.5 13 12 13 C15.5 13 19 15.5 19 20" />
          <path d="M18 5 L18 9 M16 7 L20 7" />
        </svg>
      ),
    },
    {
      key: "delivery",
      label: "Deliveries",
      onClick: () => props.onJump("deliveries"),
      accent: "#7C3AED",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <rect x="2" y="9" width="13" height="9" rx="1" />
          <path d="M15 12 L19 12 L21 14 L21 18 L15 18" />
          <circle cx="6" cy="19" r="1.5" />
          <circle cx="18" cy="19" r="1.5" />
        </svg>
      ),
    },
    {
      key: "quickship",
      label: "Quick Ship",
      onClick: () => props.onJump("shipping"),
      accent: "#337485",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 1 L17 5 L11 17 L8 11 L4 8 Z" />
        </svg>
      ),
    },
    {
      key: "runsheet",
      label: "Today's Run Sheet",
      onClick: () => {
        if (typeof window !== "undefined") window.open("/admin/shipping/runsheet", "_blank", "noopener,noreferrer");
      },
      accent: "#16a34a",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9 V3 H18 V9" />
          <rect x="6" y="9" width="12" height="9" rx="1" />
          <path d="M6 13 H18 M6 16 H14" />
        </svg>
      ),
    },
    {
      key: "scan",
      label: "Scan Inbound",
      onClick: () => {
        // Jumps to the Shipping Center, then fires the top-level-subview
        // event listened to by AdminShippingCenterPanel (separate from the
        // `noho-shipping-jump` event used for inner Quick-Ship workspace tabs).
        props.onJump("shipping");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("noho-shipping-subview", { detail: { subview: "scan" } }));
        }
      },
      accent: "#16a34a",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7 V4 H7 M17 4 H20 V7 M20 17 V20 H17 M7 20 H4 V17" />
          <path d="M3 12 H21" />
        </svg>
      ),
    },
    {
      key: "requests",
      label: "Mail Requests",
      onClick: () => props.onJump("requests"),
      accent: "#F5A623",
      badge: props.unreadTotal,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L13 16" />
        </svg>
      ),
    },
    {
      key: "search",
      label: "Search (⌘K)",
      onClick: () => {
        // Focus the existing header search input as a lightweight palette.
        const el = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (el) {
          el.focus();
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      },
      accent: "#2D100F",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m17 17 4 4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      aria-label="MailOS quick launch"
      className="hidden md:flex fixed left-1/2 bottom-4 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div
        className="pointer-events-auto flex items-end gap-2 px-3 py-2 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(247,230,194,0.92) 0%, rgba(244,236,219,0.95) 100%)",
          backdropFilter: "saturate(160%) blur(14px)",
          WebkitBackdropFilter: "saturate(160%) blur(14px)",
          border: "1px solid rgba(45,16,15,0.12)",
          boxShadow:
            "0 12px 36px rgba(45,16,15,0.18), 0 1px 0 rgba(255,255,255,0.7) inset, 0 -1px 0 rgba(45,16,15,0.06) inset",
        }}
      >
        {items.map((it, idx) => (
          <DockItem
            key={it.key}
            label={it.label}
            accent={it.accent}
            badge={it.badge}
            onClick={it.onClick}
            // Visual groupings: [Mail · Pkg · Customer] | [Delivery · Quick
            // Ship · Run Sheet · Scan] | [Requests] | [Search]. Dividers
            // fall AFTER indexes 2, 6, and 7.
            divider={idx === 2 || idx === 6 || idx === 7}
          >
            {it.icon}
          </DockItem>
        ))}
      </div>
    </div>
  );
}

function DockItem(props: {
  label: string;
  accent: string;
  badge?: number;
  divider?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        onClick={props.onClick}
        className="group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-[1.18] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: "white",
          color: props.accent,
          border: `1px solid ${props.accent}33`,
          boxShadow: `0 2px 6px ${props.accent}22, 0 1px 0 rgba(255,255,255,0.6) inset`,
          transformOrigin: "center bottom",
        }}
        aria-label={props.label}
        title={props.label}
      >
        <span className="w-5 h-5 inline-flex items-center justify-center" aria-hidden="true">
          {props.children}
        </span>
        {props.badge != null && props.badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-[9px] font-black flex items-center justify-center px-1"
            style={{
              background: "#E70013",
              color: "#fff",
              boxShadow: "0 0 0 2px rgba(247,230,194,0.95), 0 0 8px rgba(231,0,19,0.45)",
            }}
          >
            {props.badge > 99 ? "99+" : props.badge}
          </span>
        )}
        {/* Tooltip — appears above on hover */}
        <span
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.12em] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
          style={{
            background: "#2D100F",
            color: "#F7E6C2",
            boxShadow: "0 4px 12px rgba(45,16,15,0.3)",
          }}
        >
          {props.label}
        </span>
      </button>
      {props.divider && (
        <span
          aria-hidden="true"
          className="self-center w-px h-7 mx-1"
          style={{ background: "rgba(45,16,15,0.12)" }}
        />
      )}
    </>
  );
}
