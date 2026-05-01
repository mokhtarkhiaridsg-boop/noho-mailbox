"use client";

/**
 * AdminPOSPanel — NOHO Mailbox Cash Register.
 *
 * Visually a counter-top register: heavy brass-trim cabinet, LCD tape,
 * oversized illuminated buttons, drawer-style layout. Supports Cash, Zelle,
 * Square (link), Card-on-file, Wallet, and a custom payment method.
 * Receipts print 4×6 thermal at /admin/pos/receipt/[id].
 */

import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import {
  createSale,
  getPOSCatalog,
  searchPOSCustomers,
  getRecentSales,
  getTodaysTill,
  voidSale,
  getDailyZReport,
  emailPOSReceipt,
  smsPOSReceipt,
  getPOSCustomer,
  getMailboxWall,
  getPOSTickerEvents,
  getRecentSalesDetailed,
  getCustomerVisits,
  getUpcomingRenewals,
} from "@/app/actions/pos";
import { adminAddWalletCredit } from "@/app/actions/customerOps";
import {
  ZELLE_RECIPIENT_EMAIL,
  type POSCatalogEntry,
  type POSSaleRow,
  type POSPaymentMethod,
  type POSCartLine,
  type ZReportData,
  type MailboxWallData,
  type TickerEvent,
  type POSSaleDetailed,
  type UpcomingRenewalDay,
} from "@/lib/pos";
import { MacroToolbar } from "@/components/admin/AdminPOSMacros";

// ─── Brand tokens (mirror globals.css; inline for clarity) ────────────────
const CREAM = "#F7E6C2";
const BLUE = "#337485";
const BROWN = "#2D100F";
const RED = "#E70013";
const GOLD = "#C9A24A";
const GOLD_DARK = "#8C6E27";
const LCD_BG = "#0E1A14";
const LCD_GLOW = "#7CFFB2";

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type CartLineUI = POSCartLine & { _key: string };

type AttachedCustomer = {
  id: string;
  name: string;
  suiteNumber: string | null;
  email: string;
  walletBalanceCents: number;
  plan?: string | null;
  planTerm?: string | null;
  planDueDate?: string | null;
  mailboxStatus?: string | null;
  businessName?: string | null;
  boxType?: string | null;
  phone?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────

export default function AdminPOSPanel() {
  const [catalog, setCatalog] = useState<POSCatalogEntry[]>([]);
  const [recent, setRecent] = useState<POSSaleRow[]>([]);
  const [till, setTill] = useState<{
    cashCents: number;
    zelleCents: number;
    squareCents: number;
    cardCents: number;
    walletCents: number;
    customCents: number;
    totalCents: number;
    tipsCents: number;
    count: number;
    byHour: Array<{ hour: number; cents: number; count: number }>;
    topItems: Array<{ name: string; quantity: number; cents: number }>;
  } | null>(null);

  // Cart
  const [cart, setCart] = useState<CartLineUI[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Mailbox");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [tipInput, setTipInput] = useState<string>("");
  const [taxInput, setTaxInput] = useState<string>(""); // free-form for now (LA county sales tax 9.5% is on supplies; we leave it manual)

  // Customer
  const [customerQuery, setCustomerQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchPOSCustomers>>>([]);
  const [attached, setAttached] = useState<AttachedCustomer | null>(null);

  // Payment
  const [method, setMethod] = useState<POSPaymentMethod>("Cash");
  const [customLabel, setCustomLabel] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [cashTendered, setCashTendered] = useState("");

  // Custom line entry
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Status
  const [confirmation, setConfirmation] = useState<{ saleId: string; saleNumber: number; changeDueCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();
  const drawerRef = useRef<HTMLDivElement>(null);

  // ─── Cash drawer (the marquee iter-2 visual) ───
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellRinging, setBellRinging] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  // ─── Thermal printer (iter-3) ───
  const [printing, setPrinting] = useState(false);

  function flashPrint(ms = 1100) {
    setPrinting(true);
    setTimeout(() => setPrinting(false), ms);
  }

  // ─── PAID stamp + confetti shower (iter-4) ───
  const [paidStamp, setPaidStamp] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  function fireCelebration() {
    setPaidStamp(true);
    setTimeout(() => setPaidStamp(false), 1800);
    setConfettiKey((k) => k + 1);
  }

  // ─── Park Tickets (iter-6) ───
  type ParkedTicket = {
    id: string;
    label: string;
    customer: AttachedCustomer | null;
    cart: CartLineUI[];
    discount: string;
    tax: string;
    tip: string;
    savedAt: number;
  };
  const [parkedTickets, setParkedTickets] = useState<ParkedTicket[]>([]);
  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-parked");
      if (saved) setParkedTickets(JSON.parse(saved));
    } catch {}
  }, []);
  // Persist
  useEffect(() => {
    try {
      localStorage.setItem("noho-pos-parked", JSON.stringify(parkedTickets));
    } catch {}
  }, [parkedTickets]);

  function parkCurrentCart() {
    if (cart.length === 0) {
      setError("Nothing to park — add items first.");
      return;
    }
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const label = attached?.name
      ? `${attached.name}${attached.suiteNumber ? ` · #${attached.suiteNumber}` : ""}`
      : `Walk-in · ${cart.length} item${cart.length === 1 ? "" : "s"}`;
    const ticket: ParkedTicket = {
      id, label,
      customer: attached,
      cart: cart.map(({ ...rest }) => rest),
      discount: discountInput,
      tax: taxInput,
      tip: tipInput,
      savedAt: Date.now(),
    };
    setParkedTickets((prev) => [ticket, ...prev].slice(0, 12));
    // Reset active cart
    setCart([]); setDiscountInput(""); setTipInput(""); setTaxInput("");
    setAttached(null);
    setError(null);
    setConfirmation(null);
    playRustle();
  }

  function recallTicket(id: string) {
    const ticket = parkedTickets.find((t) => t.id === id);
    if (!ticket) return;
    if (cart.length > 0) {
      // Park current first to avoid losing work
      parkCurrentCart();
    }
    setCart(ticket.cart);
    setAttached(ticket.customer);
    setDiscountInput(ticket.discount);
    setTaxInput(ticket.tax);
    setTipInput(ticket.tip);
    setParkedTickets((prev) => prev.filter((t) => t.id !== id));
    setError(null);
    setConfirmation(null);
    playRustle();
  }

  function discardTicket(id: string) {
    setParkedTickets((prev) => prev.filter((t) => t.id !== id));
  }

  // ─── Z-Report (iter-7) ───
  const [zReportOpen, setZReportOpen] = useState(false);
  const [zReportData, setZReportData] = useState<ZReportData | null>(null);
  const [zLoading, setZLoading] = useState(false);
  async function openZReport() {
    setZReportOpen(true);
    setZLoading(true);
    try {
      const r = await getDailyZReport();
      setZReportData(r);
    } finally {
      setZLoading(false);
    }
  }

  // ─── Live polling (iter-7) ───
  // Recent Sales feed auto-refreshes every 30s. Pauses when tab is hidden so
  // backgrounded tabs don't burn API calls. Resumes immediately on visibility
  // return rather than waiting up to 30s.
  useEffect(() => {
    let timer: number | null = null;
    function tick() {
      Promise.all([getRecentSales(8), getTodaysTill()])
        .then(([r, t]) => {
          setRecent(r);
          setTill(t);
        })
        .catch(() => {});
    }
    function start() {
      stop();
      timer = window.setInterval(tick, 30_000);
    }
    function stop() {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
    }
    function onVis() {
      if (document.hidden) {
        stop();
      } else {
        tick();
        start();
      }
    }
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ─── Item search (iter-8) ───
  const [searchInput, setSearchInput] = useState("");
  const [searchHighlight, setSearchHighlight] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── 3D tilt (iter-8) ───
  const tiltRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    // Skip on touch / coarse pointers
    if (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches) return;
    let raf = 0;
    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5..0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-x", `${(-y * 1.6).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(x * 2.2).toFixed(2)}deg`);
        // Cursor-relative spec highlight on the brass top rail
        el.style.setProperty("--tilt-spec", `${((x + 0.5) * 100).toFixed(1)}%`);
      });
    }
    function onLeave() {
      if (!el) return;
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
      el.style.setProperty("--tilt-spec", "50%");
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ─── Hotkey overlay (iter-8) ───
  const [showHotkeys, setShowHotkeys] = useState(false);

  // ─── Daily goal + milestone celebration (iter-12) ───
  const [dailyGoalCents, setDailyGoalCents] = useState<number>(50000); // $500 default
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [milestone, setMilestone] = useState<{ amount: number; label: string; key: number } | null>(null);
  const lastTillRef = useRef<number>(0);
  const milestoneFiredRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-daily-goal");
      if (saved) setDailyGoalCents(Math.max(1, parseInt(saved, 10) || 50000));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-daily-goal", String(dailyGoalCents)); } catch {}
  }, [dailyGoalCents]);

  // Watch till total for crossing milestone thresholds
  useEffect(() => {
    if (!till) return;
    const MILESTONES: Array<{ cents: number; label: string }> = [
      { cents: 10000,  label: "$100 in the till" },
      { cents: 50000,  label: "$500 sold today" },
      { cents: 100000, label: "$1,000 sold today" },
      { cents: 250000, label: "$2,500 sold today" },
      { cents: 500000, label: "$5,000 sold today" },
    ];
    const cur = till.totalCents;
    const prev = lastTillRef.current;
    if (cur > prev) {
      for (const m of MILESTONES) {
        if (prev < m.cents && cur >= m.cents && !milestoneFiredRef.current.has(m.cents)) {
          milestoneFiredRef.current.add(m.cents);
          setMilestone({ amount: m.cents, label: m.label, key: Date.now() });
          // Auto-dismiss
          setTimeout(() => setMilestone((m2) => (m2 && m2.amount === m.cents ? null : m2)), 4000);
          // Bell + confetti
          playBell();
          setConfettiKey((k) => k + 1);
          break;
        }
      }
    }
    lastTillRef.current = cur;
  }, [till]);

  // ─── Gift Card Sell flow (iter-35) ───
  const [giftOpen, setGiftOpen] = useState(false);

  // ─── Daily Streak Counter (iter-34) ───
  // Tracks consecutive days with at least one sale. Persists to localStorage.
  const [streak, setStreak] = useState<{ dateYmd: string; count: number } | null>(null);
  function todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function yesterdayYmd(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem("noho-pos-streak");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.dateYmd === "string" && typeof parsed.count === "number") {
          // Auto-decay: if last sale was 2+ days ago, the streak is broken (still show 0)
          const today = todayYmd();
          const yest = yesterdayYmd();
          if (parsed.dateYmd === today || parsed.dateYmd === yest) {
            setStreak(parsed);
          } else {
            setStreak({ dateYmd: parsed.dateYmd, count: 0 });
          }
        }
      }
    } catch {}
  }, []);
  function bumpStreak() {
    const today = todayYmd();
    const yest = yesterdayYmd();
    setStreak((prev) => {
      let next: { dateYmd: string; count: number };
      if (!prev) {
        next = { dateYmd: today, count: 1 };
      } else if (prev.dateYmd === today) {
        next = prev; // already counted today
      } else if (prev.dateYmd === yest) {
        next = { dateYmd: today, count: prev.count + 1 };
      } else {
        next = { dateYmd: today, count: 1 }; // streak broken, restart
      }
      try { localStorage.setItem("noho-pos-streak", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // ─── Coupon Codes (iter-33) ───
  // Hardcoded coupon set. Future: persist to SiteConfig for admin-edit.
  type CouponDef = { kind: "pct" | "flat"; value: number; label: string };
  const COUPON_CODES: Record<string, CouponDef> = {
    "NOHO10":     { kind: "pct",  value: 10, label: "NOHO neighbor · 10% off" },
    "WELCOME20":  { kind: "pct",  value: 20, label: "First-time welcome · 20% off" },
    "LOCAL15":    { kind: "pct",  value: 15, label: "Local Friends · 15% off" },
    "FRIEND15":   { kind: "flat", value: 15, label: "Friend referral · $15 off" },
    "BIRTHDAY":   { kind: "flat", value: 25, label: "Happy Birthday · $25 off" },
    "TEACHER":    { kind: "pct",  value: 10, label: "Teacher discount · 10% off" },
    "MILITARY":   { kind: "pct",  value: 10, label: "Military discount · 10% off" },
  };
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ kind: "ok" | "err"; text: string; key: number } | null>(null);
  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ kind: "err", text: "Type a code first.", key: Date.now() });
      return;
    }
    const def = COUPON_CODES[code];
    if (!def) {
      setCouponMsg({ kind: "err", text: `"${code}" not recognized.`, key: Date.now() });
      return;
    }
    if (subtotalCents <= 0) {
      setCouponMsg({ kind: "err", text: "Add items first, then apply.", key: Date.now() });
      return;
    }
    const discountCents = def.kind === "pct"
      ? Math.round(subtotalCents * (def.value / 100))
      : Math.min(subtotalCents, def.value * 100);
    addCustomLineNamed(`Coupon ${code}: ${def.label}`, -discountCents);
    setCouponMsg({ kind: "ok", text: `✓ ${def.label}`, key: Date.now() });
    setCouponInput("");
    // Auto-clear message after 3.5s
    setTimeout(() => {
      setCouponMsg((cur) => (cur && cur.key === Date.now() ? null : cur));
    }, 3500);
  }

  // ─── Auto Tax Toggle (iter-32) ───
  const TAX_RATE = 0.095; // LA County 9.5%
  const [autoTax, setAutoTax] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-autotax");
      if (saved === "1") setAutoTax(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-autotax", autoTax ? "1" : "0"); } catch {}
  }, [autoTax]);
  // Auto-tax recompute effect lives after subtotalCents/discountCents are declared (further down)

  // ─── Customer Display Pop-Out (iter-30) ───
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const chargeCounterRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      broadcastRef.current = new BroadcastChannel("noho-pos");
    } catch {}
    return () => { try { broadcastRef.current?.close(); } catch {} };
  }, []);

  function popOutDisplay() {
    if (typeof window === "undefined") return;
    window.open("/admin/pos/display", "noho-pos-display", "width=1280,height=800,popup,toolbar=no,menubar=no");
  }

  // ─── Cashier Identity (iter-29) ───
  type CashierIdentity = { nickname: string; color: string };
  const CASHIER_PALETTE = [
    "#337485", // Brand blue
    "#C9A24A", // Brass gold
    "#E70013", // Tunisian red
    "#4793a6", // Steel blue
    "#7c5e30", // Walnut
    "#8a1010", // Coral red
    "#3d4a1c", // Olive
  ];
  const [cashierIdentity, setCashierIdentity] = useState<CashierIdentity | null>(null);
  const [showCashierEdit, setShowCashierEdit] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("noho-pos-cashier");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.nickname === "string" && typeof parsed.color === "string") {
          setCashierIdentity(parsed);
        }
      }
    } catch {}
  }, []);
  function saveCashier(nickname: string, color: string) {
    const trimmed = nickname.trim().slice(0, 20);
    if (!trimmed) {
      setCashierIdentity(null);
      try { localStorage.removeItem("noho-pos-cashier"); } catch {}
    } else {
      const next = { nickname: trimmed, color };
      setCashierIdentity(next);
      try { localStorage.setItem("noho-pos-cashier", JSON.stringify(next)); } catch {}
    }
    setShowCashierEdit(false);
  }

  // ─── Tip Jar drop (iter-28) ───
  const [tipDropKey, setTipDropKey] = useState(0);
  function fireTipDrop() {
    setTipDropKey((k) => k + 1);
  }

  // ─── Vacuum Tube Flash (iter-38) ───
  // Bumps a key that re-mounts the tube row, retriggering the flash CSS animation.
  // Pulses on cart count change and on sale completion.
  const [tubeFlashKey, setTubeFlashKey] = useState(0);
  function fireTubeFlash() {
    setTubeFlashKey((k) => k + 1);
  }

  // ─── Service Bell Ring (iter-42) ───
  // Bumps a key that re-mounts the bell dome/plunger/glow, retriggering CSS
  // animations. Click → manual ring + sound. Sale completion → auto ring.
  const [serviceBellKey, setServiceBellKey] = useState(0);
  function ringServiceBell() {
    setServiceBellKey((k) => k + 1);
    playBell();
  }

  // ─── Pneumatic Tube Flight (iter-46) ───
  // Bumps a key that re-mounts the capsule, retriggering the flight animation.
  // Sale completion → capsule whooshes from top to bottom and back.
  const [tubeFlightKey, setTubeFlightKey] = useState(0);
  function fireTubeFlight() {
    setTubeFlightKey((k) => k + 1);
  }
  const cartLenForTubes = cart.length;
  useEffect(() => {
    // Skip the initial mount (cart empty) — only flash on real changes.
    if (cartLenForTubes === 0) return;
    setTubeFlashKey((k) => k + 1);
  }, [cartLenForTubes]);

  // ─── Cart-Add Flight (iter-27) ───
  // Each tap on a buyable item launches a ghost chip from the click point that
  // arcs into the LCD total. Auto-removes after the animation completes.
  type FlightToken = {
    id: number;
    fromX: number;
    fromY: number;
    dx: number;
    dy: number;
    label: string;
    color: string;
  };
  const [flightTokens, setFlightTokens] = useState<FlightToken[]>([]);
  const flightIdRef = useRef(0);
  const lcdRef = useRef<HTMLDivElement>(null);
  function launchFlight(label: string, fromX: number, fromY: number, color: string = GOLD) {
    const lcd = lcdRef.current;
    if (!lcd) return;
    const rect = lcd.getBoundingClientRect();
    const toX = rect.left + rect.width / 2;
    const toY = rect.top + rect.height / 2;
    const id = ++flightIdRef.current;
    const dx = toX - fromX;
    const dy = toY - fromY;
    setFlightTokens((prev) => [...prev, { id, fromX, fromY, dx, dy, label, color }]);
    setTimeout(() => {
      setFlightTokens((prev) => prev.filter((t) => t.id !== id));
    }, 750);
  }

  // ─── Customer Signature (iter-26) ───
  const SIGNATURE_THRESHOLD_CENTS = 20000; // $200
  const [signaturePng, setSignaturePng] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // signatureRequired is derived after totalCents is computed (further down)

  // ─── Service Bell (iter-25) ───
  const [bellRings, setBellRings] = useState(0);
  const [bellSwing, setBellSwing] = useState(0); // increments per click to re-trigger animation

  useEffect(() => {
    try {
      const raw = localStorage.getItem("noho-pos-bell");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.dateYmd) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const todayYmd = `${yyyy}-${mm}-${dd}`;
          if (parsed.dateYmd === todayYmd) setBellRings(parsed.count || 0);
          else setBellRings(0); // new day, fresh counter
        }
      }
    } catch {}
  }, []);
  function persistBellRings(count: number) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      localStorage.setItem("noho-pos-bell", JSON.stringify({ dateYmd: `${yyyy}-${mm}-${dd}`, count }));
    } catch {}
  }
  function ringBell() {
    setBellRings((c) => {
      const next = c + 1;
      persistBellRings(next);
      return next;
    });
    setBellSwing((s) => s + 1);
    playBell();
  }

  // ─── Calculator overlay (iter-24) ───
  const [calcOpen, setCalcOpen] = useState(false);

  // ─── Upcoming renewals strip (iter-23) ───
  const [upcoming, setUpcoming] = useState<UpcomingRenewalDay[]>([]);
  useEffect(() => {
    let cancel = false;
    getUpcomingRenewals(14)
      .then((d) => { if (!cancel) setUpcoming(d); })
      .catch(() => {});
    // Refresh every 5 min — schedule changes are slow-moving
    const id = window.setInterval(() => {
      if (document.hidden) return;
      getUpcomingRenewals(14).then(setUpcoming).catch(() => {});
    }, 5 * 60_000);
    return () => { cancel = true; window.clearInterval(id); };
  }, []);

  // ─── Cash Count / Open-Close Shift (iter-20) ───
  type ShiftSnapshot = {
    openedAt: string;             // ISO
    openingCounts: Record<string, number>;  // denom (cents) → count
    openingTotalCents: number;
    closedAt?: string;            // ISO when closed
    closingCounts?: Record<string, number>;
    closingTotalCents?: number;
    expectedCloseCents?: number;
    varianceCents?: number;       // closingTotal - expectedClose (negative = short)
    todaysCashSalesCents?: number;
  };
  const [shift, setShift] = useState<ShiftSnapshot | null>(null);
  const [shiftModal, setShiftModal] = useState<"open" | "close" | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("noho-pos-shift");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setShift(parsed);
      }
    } catch {}
  }, []);
  function persistShift(s: ShiftSnapshot | null) {
    setShift(s);
    try {
      if (s) localStorage.setItem("noho-pos-shift", JSON.stringify(s));
      else localStorage.removeItem("noho-pos-shift");
    } catch {}
  }
  function archiveShift(s: ShiftSnapshot) {
    try {
      const histRaw = localStorage.getItem("noho-pos-shifts") || "[]";
      const hist = JSON.parse(histRaw);
      const next = Array.isArray(hist) ? hist : [];
      next.unshift(s);
      // Keep last 30 shifts
      localStorage.setItem("noho-pos-shifts", JSON.stringify(next.slice(0, 30)));
    } catch {}
  }

  // ─── Returns modal (iter-17) ───
  const [returnsOpen, setReturnsOpen] = useState(false);
  function openReturns() { setReturnsOpen(true); }

  // ─── Live Activity Ticker (iter-16) ───
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>([]);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [eventToast, setEventToast] = useState<TickerEvent | null>(null);
  const tickerSeenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let tick: number | null = null;
    function load(quiet = false) {
      getPOSTickerEvents().then((events) => {
        const next = events;
        // First load: seed seen set without firing toast
        if (tickerSeenRef.current.size === 0 && !quiet) {
          tickerSeenRef.current = new Set(next.map((e) => e.id));
        } else if (!quiet) {
          // Find new events (most recent first; pick the first unseen)
          const fresh = next.find((e) => !tickerSeenRef.current.has(e.id));
          if (fresh) {
            // Update seen + show toast for the freshest one
            for (const e of next) tickerSeenRef.current.add(e.id);
            setEventToast(fresh);
            setTimeout(() => setEventToast((t) => (t && t.id === fresh.id ? null : t)), 4000);
          } else {
            for (const e of next) tickerSeenRef.current.add(e.id);
          }
        }
        setTickerEvents(next);
      }).catch(() => {});
    }
    load(true);
    tick = window.setInterval(() => {
      if (!document.hidden) load();
    }, 30_000);
    function onVis() {
      if (!document.hidden) load();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (tick != null) window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ─── Receipt Preview (iter-15) ───
  const [previewMode, setPreviewMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-preview");
      if (saved !== null) setPreviewMode(saved === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-preview", previewMode ? "1" : "0"); } catch {}
  }, [previewMode]);

  // Keyclick — short percussive tap on keycap presses
  function playClick() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass"; filt.frequency.value = 4500;
      const g = ctx.createGain();
      g.gain.value = 0.06;
      src.connect(filt).connect(g).connect(ctx.destination);
      src.start(t0);
    } catch {}
  }

  // ─── Undo Toast (iter-22) ───
  // Track the most recent reversible cart mutation. After 5 seconds, auto-clears.
  type UndoAction =
    | { kind: "add"; line: CartLineUI; existedBefore: boolean }
    | { kind: "remove"; line: CartLineUI; index: number }
    | { kind: "clearAll"; lines: CartLineUI[]; discount: string; tax: string; tip: string }
    | { kind: "promo"; addedKeys: string[] };
  const [undoAction, setUndoAction] = useState<{ id: number; action: UndoAction; label: string } | null>(null);
  const undoIdRef = useRef(0);
  function pushUndo(action: UndoAction, label: string) {
    const id = ++undoIdRef.current;
    setUndoAction({ id, action, label });
    setTimeout(() => {
      setUndoAction((cur) => (cur && cur.id === id ? null : cur));
    }, 5000);
  }
  function performUndo() {
    if (!undoAction) return;
    const { action } = undoAction;
    if (action.kind === "add") {
      // Reverse add: if it was a fresh add, remove it; if it was a quantity inc on existing, decrement
      if (action.existedBefore) {
        setCart((prev) =>
          prev.map((l) =>
            l.sku === action.line.sku
              ? { ...l, quantity: Math.max(0, l.quantity - 1) }
              : l,
          ).filter((l) => l.quantity > 0),
        );
      } else {
        setCart((prev) => prev.filter((l) => l._key !== action.line._key));
      }
    } else if (action.kind === "remove") {
      setCart((prev) => {
        const next = [...prev];
        next.splice(Math.min(action.index, next.length), 0, action.line);
        return next;
      });
    } else if (action.kind === "clearAll") {
      setCart(action.lines);
      setDiscountInput(action.discount);
      setTaxInput(action.tax);
      setTipInput(action.tip);
    } else if (action.kind === "promo") {
      setCart((prev) => prev.filter((l) => !action.addedKeys.includes(l._key ?? "")));
    }
    setUndoAction(null);
    playClick();
  }

  // ─── Promotions strip (iter-18) ───
  // Static promo set. Admin-editable promos can come later via SiteConfig;
  // this iteration delivers the visual + working "apply promo" interaction.
  type Promo = {
    id: string;
    label: string;            // chip headline
    sub: string;              // chip sub-line
    palette: "rose" | "indigo" | "gold" | "teal" | "ember" | "olive";
    expiresAt: string | null; // ISO; null = ongoing
    apply: () => void;
  };

  const PROMOS: Promo[] = [
    {
      id: "first-timer",
      label: "First-Time Setup",
      sub: "$10 OFF mailbox key + setup",
      palette: "rose",
      expiresAt: null,
      apply: () => {
        addCustomLineNamed("First-Time Setup discount", -1000);
      },
    },
    {
      id: "bulk-mailers",
      label: "Bulk Mailers",
      sub: "Buy 3 bubble mailers · save $1",
      palette: "indigo",
      expiresAt: null,
      apply: () => {
        const bubMd = catalog.find((c) => c.sku === "sup:bub-md");
        if (bubMd) {
          for (let i = 0; i < 3; i++) addLine(bubMd);
          addCustomLineNamed("Bulk Mailers discount", -100);
        }
      },
    },
    {
      id: "notary-bundle",
      label: "Notary + Forward",
      sub: "$5 OFF combo",
      palette: "gold",
      expiresAt: null,
      apply: () => {
        const notary = catalog.find((c) => c.sku === "svc:notary");
        const fwd = catalog.find((c) => c.sku === "svc:fwd-fee");
        if (notary) addLine(notary);
        if (fwd) addLine(fwd);
        addCustomLineNamed("Notary + Forward combo discount", -500);
      },
    },
    {
      id: "summer-renewal",
      label: "Summer Renewal",
      sub: "$15 OFF 14-month",
      palette: "teal",
      expiresAt: "2026-08-31T23:59:59",
      apply: () => {
        addCustomLineNamed("Summer Renewal $15 off", -1500);
      },
    },
    {
      id: "ship-and-go",
      label: "Ship & Go",
      sub: "Box + Tape free w/ shipping label",
      palette: "ember",
      expiresAt: null,
      apply: () => {
        const boxMd = catalog.find((c) => c.sku === "sup:box-md");
        const tape = catalog.find((c) => c.sku === "sup:tape");
        if (boxMd) addLine(boxMd);
        if (tape) addLine(tape);
        addCustomLineNamed("Ship & Go bundle (free w/ label)", -750);
      },
    },
    {
      id: "loyalty-photo",
      label: "Loyalty Photo",
      sub: "Free passport photo · members",
      palette: "olive",
      expiresAt: null,
      apply: () => {
        const photo = catalog.find((c) => c.sku === "svc:photo");
        if (photo) addLine(photo);
        addCustomLineNamed("Loyalty: passport photo free", -1500);
      },
    },
  ];

  function addCustomLineNamed(name: string, priceCents: number) {
    setCart((prev) => [
      ...prev,
      {
        _key: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sku: null,
        name,
        category: "Custom",
        unitPriceCents: priceCents,
        quantity: 1,
      },
    ]);
    setError(null);
    playClick();
  }

  // ─── Macro toolbar (iter-14) ───
  // 8 customizable hot-keys above the LCD. Stores SKUs; resolves to catalog
  // entries at render. Defaults fire on first run if no localStorage value.
  const DEFAULT_MACRO_SKUS: string[] = [
    "svc:notary",
    "svc:scan",
    "sup:bub-md",
    "sup:box-md",
    "svc:fwd-fee",
    "fee:lostkey",
    "svc:photo",
    "svc:delivery",
  ];
  const [macroSkus, setMacroSkus] = useState<string[]>(DEFAULT_MACRO_SKUS);
  const [macroEditing, setMacroEditing] = useState(false);
  const [macroSwapIndex, setMacroSwapIndex] = useState<number | null>(null);
  const [macroSearch, setMacroSearch] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-macros");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          setMacroSkus(parsed.slice(0, 8));
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-macros", JSON.stringify(macroSkus)); } catch {}
  }, [macroSkus]);

  function setMacroSlot(index: number, sku: string | null) {
    setMacroSkus((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push("");
      next[index] = sku ?? "";
      return next.slice(0, 8);
    });
  }

  // ─── Mailbox wall (iter-13) ───
  const [wall, setWall] = useState<MailboxWallData | null>(null);
  const [wallLoading, setWallLoading] = useState(false);
  // Lazy-load when Mailbox category activates; refresh on attach change
  useEffect(() => {
    if (activeCategory !== "Mailbox") return;
    setWallLoading(true);
    getMailboxWall()
      .then(setWall)
      .catch(() => {})
      .finally(() => setWallLoading(false));
  }, [activeCategory, attached?.id]);

  // ─── Theme variants (iter-11) ───
  type Theme = "brass" | "aluminum" | "walnut";
  const [theme, setTheme] = useState<Theme>("brass");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-theme") as Theme | null;
      if (saved === "brass" || saved === "aluminum" || saved === "walnut") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-theme", theme); } catch {}
  }, [theme]);

  // ─── Idle Screensaver (iter-9) ───
  // After 60s of zero user activity, enter idle mode. Any pointer/keyboard
  // action wakes back up. Pauses while a transaction is in flight or the
  // Z-Report / Hotkey overlay is open (those have their own focus).
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timeout: number | null = null;
    function reset() {
      if (timeout != null) window.clearTimeout(timeout);
      if (idle) setIdle(false);
      timeout = window.setTimeout(() => setIdle(true), 60_000);
    }
    function onAct() { reset(); }
    reset();
    window.addEventListener("mousemove", onAct, { passive: true });
    window.addEventListener("mousedown", onAct);
    window.addEventListener("keydown", onAct);
    window.addEventListener("touchstart", onAct, { passive: true });
    document.addEventListener("visibilitychange", reset);
    return () => {
      if (timeout != null) window.clearTimeout(timeout);
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("mousedown", onAct);
      window.removeEventListener("keydown", onAct);
      window.removeEventListener("touchstart", onAct);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [idle]);

  // Tip percentage helpers (iter-9)
  function applyTipPct(pct: number) {
    const tippable = Math.max(0, subtotalCents - discountCents);
    const tipDollars = (tippable * pct / 100 / 100).toFixed(2);
    setTipInput(tipDollars);
  }

  // ─── Counter Mode (iter-5) — kiosk fullscreen ───
  const [counterMode, setCounterMode] = useState(false);
  // ESC exits, body scroll locks while on
  useEffect(() => {
    if (!counterMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCounterMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [counterMode]);

  // ─── Global keyboard shortcuts (iter-8) ───
  // Cmd/Ctrl+K → focus search · Shift+? → reveal hotkey overlay (toggle)
  // 1..6 → set payment method (when not typing in a field)
  useEffect(() => {
    function isTextInput(t: EventTarget | null) {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      // Shift+? → toggle hotkey overlay
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShowHotkeys((s) => !s);
        return;
      }
      // ESC → close overlay if open
      if (e.key === "Escape") {
        setShowHotkeys(false);
      }
      // 1..6 → set payment method (only when no text input is focused)
      if (!isTextInput(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const map: Record<string, POSPaymentMethod> = {
          "1": "Cash", "2": "Zelle", "3": "Square",
          "4": "CardOnFile", "5": "Wallet", "6": "Custom",
        };
        const m = map[e.key];
        if (m) {
          e.preventDefault();
          setMethod(m);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [cashTray, setCashTray] = useState<Record<string, number>>({
    "10000": 5,   // $100 × 5 = $500
    "5000":  4,   // $50  × 4 = $200
    "2000":  10,  // $20  × 10 = $200
    "1000":  10,  // $10  × 10 = $100
    "500":   20,  // $5   × 20 = $100
    "100":   40,  // $1   × 40 = $40
    "25":    40,  // 25¢  × 40 = $10
    "10":    50,  // 10¢  × 50 = $5
    "5":     60,  // 5¢   × 60 = $3
    "1":     200, // 1¢   × 200 = $2
  });

  // Persist cash tray
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noho-pos-tray");
      if (saved) setCashTray(JSON.parse(saved));
    } catch {}
    try {
      const s = localStorage.getItem("noho-pos-sound");
      if (s !== null) setSoundOn(s === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-tray", JSON.stringify(cashTray)); } catch {}
  }, [cashTray]);
  useEffect(() => {
    try { localStorage.setItem("noho-pos-sound", soundOn ? "1" : "0"); } catch {}
  }, [soundOn]);

  const trayTotalCents = useMemo(
    () => Object.entries(cashTray).reduce((s, [v, n]) => s + Number(v) * n, 0),
    [cashTray],
  );

  // Audio context lazy-init
  const audioCtxRef = useRef<AudioContext | null>(null);
  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtxRef.current) {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) audioCtxRef.current = new Ctx();
      } catch {}
    }
    return audioCtxRef.current;
  }

  // Service bell — high steel "ding"
  function playBell() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc.type = "triangle"; osc2.type = "sine";
      osc.frequency.setValueAtTime(2800, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.5);
      osc2.frequency.setValueAtTime(4200, t0);
      osc2.frequency.exponentialRampToValueAtTime(2100, t0 + 0.5);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.45, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
      gain2.gain.setValueAtTime(0.001, t0);
      gain2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc2.connect(gain2).connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.7);
      osc2.start(t0); osc2.stop(t0 + 0.5);
    } catch {}
  }

  // Cha-ching — drawer slide whoosh
  function playKaching() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      // Bell pair (cha-ching)
      [0, 0.18].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(i === 0 ? 1760 : 1320, t0 + delay);
        osc.frequency.exponentialRampToValueAtTime(i === 0 ? 880 : 660, t0 + delay + 0.3);
        g.gain.setValueAtTime(0.001, t0 + delay);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.4);
        osc.connect(g).connect(ctx.destination);
        osc.start(t0 + delay); osc.stop(t0 + delay + 0.45);
      });
      // Drawer mechanical thunk
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
      noise.buffer = buf;
      const noiseG = ctx.createGain();
      noiseG.gain.value = 0.18;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass"; filt.frequency.value = 600;
      noise.connect(filt).connect(noiseG).connect(ctx.destination);
      noise.start(t0 + 0.04);
    } catch {}
  }

  // Thermal printer rasping print sound
  function playPrinter() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
      const data = buf.getChannelData(0);
      // Rasping print sound — modulated white noise stepped at print head rate
      for (let i = 0; i < data.length; i++) {
        const stepRate = 60; // head ticks per second
        const phase = Math.sin((i / ctx.sampleRate) * stepRate * 2 * Math.PI);
        const env = Math.min(1, i / (ctx.sampleRate * 0.05)) *
          Math.max(0, 1 - i / (ctx.sampleRate * 1.0));
        data[i] = (Math.random() * 2 - 1) * 0.4 * (0.6 + 0.4 * Math.abs(phase)) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass"; filt.frequency.value = 1800; filt.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(filt).connect(g).connect(ctx.destination);
      src.start(t0);
    } catch {}
  }

  // Cash bill rustle — for quick-tender chip clicks
  function playRustle() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 1.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass"; filt.frequency.value = 3500;
      const g = ctx.createGain();
      g.gain.value = 0.08;
      src.connect(filt).connect(g).connect(ctx.destination);
      src.start(t0);
    } catch {}
  }

  function adjustTray(denom: string, delta: number) {
    setCashTray((prev) => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] ?? 0) + delta),
    }));
  }
  function openDrawerNow(opts?: { silent?: boolean }) {
    setDrawerOpen(true);
    if (!opts?.silent) playKaching();
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }

  // ─── Load on mount ───
  useEffect(() => {
    Promise.all([getPOSCatalog(), getRecentSales(8), getTodaysTill()])
      .then(([cat, r, t]) => {
        setCatalog(cat);
        setRecent(r);
        setTill(t);
      })
      .catch(() => {});
  }, []);

  // ─── Customer search debounce ───
  useEffect(() => {
    if (!customerQuery.trim() || attached) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchPOSCustomers(customerQuery).then(setSearchResults).catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [customerQuery, attached]);

  // ─── Computed totals ───
  const subtotalCents = useMemo(
    () => cart.reduce((s, l) => s + (l.unitPriceCents * l.quantity - (l.discountCents ?? 0)), 0),
    [cart],
  );
  const discountCents = useMemo(() => Math.max(0, Math.round(parseFloat(discountInput || "0") * 100)) || 0, [discountInput]);
  // Auto-tax recompute (iter-32): when toggle is on, derive 9.5% of (subtotal − discount) into taxInput
  useEffect(() => {
    if (!autoTax) return;
    const taxable = Math.max(0, subtotalCents - discountCents);
    setTaxInput((taxable * TAX_RATE / 100).toFixed(2));
  }, [autoTax, subtotalCents, discountCents]);
  const tipCents = useMemo(() => Math.max(0, Math.round(parseFloat(tipInput || "0") * 100)) || 0, [tipInput]);
  const taxCents = useMemo(() => Math.max(0, Math.round(parseFloat(taxInput || "0") * 100)) || 0, [taxInput]);
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents + tipCents);
  const signatureRequired = totalCents >= SIGNATURE_THRESHOLD_CENTS;
  const cashTenderedCents = Math.round(parseFloat(cashTendered || "0") * 100) || 0;
  const changeDueCents = method === "Cash" ? Math.max(0, cashTenderedCents - totalCents) : 0;

  // Broadcast state to popped-out customer display (iter-30)
  useEffect(() => {
    const bc = broadcastRef.current;
    if (!bc) return;
    const memo = `NOHO-${String((recent[0]?.number ?? 1000) + 1).padStart(5, "0")}`;
    bc.postMessage({
      type: "state",
      payload: {
        cart: cart.map((l) => ({
          name: l.name,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          discountCents: l.discountCents,
        })),
        subtotalCents,
        discountCents,
        taxCents,
        tipCents,
        totalCents,
        method,
        customLabel,
        paymentRef,
        cashTenderedCents,
        changeDueCents,
        customer: attached ? { name: attached.name, suiteNumber: attached.suiteNumber } : null,
        zelleMemo: memo,
        saleNumber: confirmation?.saleNumber ?? 0,
        charged: chargeCounterRef.current,
        theme,
      },
    });
  }, [
    cart, subtotalCents, discountCents, taxCents, tipCents, totalCents,
    method, customLabel, paymentRef, cashTenderedCents, changeDueCents,
    attached, recent, confirmation, theme,
  ]);

  // ─── Categories ───
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => set.add(c.category));
    set.add("Custom");
    return Array.from(set);
  }, [catalog]);

  const visibleItems = useMemo(
    () => catalog.filter((c) => c.category === activeCategory),
    [catalog, activeCategory],
  );

  // Search results (across the entire catalog) — when search has 2+ chars, this
  // overrides the category-tab grid.
  const searchResultsCatalog = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return catalog
      .filter((c) => {
        const hay = `${c.name} ${c.category} ${c.hint ?? ""} ${c.sku}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 16);
  }, [catalog, searchInput]);

  // Reset highlight when search results change shape
  useEffect(() => {
    setSearchHighlight(0);
  }, [searchInput]);

  // ─── Add to cart ───
  function addLine(entry: POSCatalogEntry, e?: React.MouseEvent | React.PointerEvent) {
    if (e && "clientX" in e) {
      const color =
        entry.category === "Service" ? BLUE :
        entry.category === "Supplies" ? GOLD :
        entry.category === "Fees" ? RED :
        entry.category === "Mailbox" ? GOLD :
        BROWN;
      launchFlight(entry.name, e.clientX, e.clientY, color);
    }
    let existedBefore = false;
    let newLineRef: CartLineUI | null = null;
    setCart((prev) => {
      const existing = prev.find((l) => l.sku === entry.sku);
      if (existing) {
        existedBefore = true;
        newLineRef = existing;
        return prev.map((l) =>
          l.sku === entry.sku ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      const fresh: CartLineUI = {
        _key: `${entry.sku}-${Date.now()}`,
        sku: entry.sku,
        name: entry.name,
        category: entry.category,
        unitPriceCents: entry.priceCents,
        quantity: 1,
      };
      newLineRef = fresh;
      return [...prev, fresh];
    });
    setError(null);
    playClick();
    if (newLineRef) {
      pushUndo(
        { kind: "add", line: newLineRef, existedBefore },
        existedBefore ? `+1 ${entry.name}` : `Added ${entry.name}`,
      );
    }
  }
  function addCustomLine() {
    const name = customName.trim();
    const price = Math.round(parseFloat(customPrice) * 100);
    if (!name || !Number.isFinite(price) || price <= 0) {
      setError("Custom line needs a name and price.");
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        _key: `custom-${Date.now()}`,
        sku: null,
        name,
        category: "Custom",
        unitPriceCents: price,
        quantity: 1,
      },
    ]);
    setCustomName("");
    setCustomPrice("");
    setError(null);
  }
  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l._key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(key: string) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l._key === key);
      if (idx >= 0) {
        const removed = prev[idx];
        pushUndo(
          { kind: "remove", line: removed, index: idx },
          `Removed ${removed.name}`,
        );
      }
      return prev.filter((l) => l._key !== key);
    });
  }

  // ─── Submit ───
  function submit() {
    setError(null);
    if (cart.length === 0) {
      setError("Add at least one item to ring up.");
      return;
    }
    if (method === "Custom" && !customLabel.trim()) {
      setError("Type a label for the custom payment method.");
      return;
    }
    if (method === "Cash" && cashTenderedCents < totalCents) {
      setError(`Cash short — tendered ${fmt(cashTenderedCents)} but total is ${fmt(totalCents)}.`);
      return;
    }
    // High-value signature gate: if threshold met and no signature yet, capture first.
    if (signatureRequired && !signaturePng && !showSignaturePad) {
      setShowSignaturePad(true);
      return;
    }
    // Preview mode: show 4×6 receipt preview, wait for confirm
    if (previewMode && !showPreview) {
      setShowPreview(true);
      return;
    }
    setShowPreview(false);
    actuallyChargeNow();
  }

  function actuallyChargeNow() {
    startTx(async () => {
      const r = await createSale({
        cart: cart.map(({ _key, ...rest }) => rest),
        customerId: attached?.id ?? null,
        discountCents,
        taxCents,
        tipCents,
        paymentMethod: method,
        customMethodLabel: method === "Custom" ? customLabel.trim() : null,
        paymentRef: paymentRef.trim() || null,
        cashTenderedCents: method === "Cash" ? cashTenderedCents : null,
        notes: signaturePng ? `SIGNATURE:${signaturePng}` : null,
        cashierLabel: cashierIdentity?.nickname ?? null,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setConfirmation({ saleId: r.saleId, saleNumber: r.saleNumber, changeDueCents: r.changeDueCents });
      // Increment charge counter so the popped display fires its thanks splash
      chargeCounterRef.current = chargeCounterRef.current + 1;
      // Bump the daily streak counter
      bumpStreak();
      // Cabinet bounce + bell + cha-ching + drawer slide-out
      drawerRef.current?.classList.remove("drawer-pop");
      void drawerRef.current?.offsetHeight;
      drawerRef.current?.classList.add("drawer-pop");
      setBellRinging(true);
      setTimeout(() => setBellRinging(false), 700);
      playBell();
      setTimeout(playKaching, 250);
      // Printer spins up — paper feeds out for the receipt
      flashPrint(1400);
      playPrinter();
      // PAID stamp slams the tape + confetti coins shower
      fireCelebration();
      // Vacuum tubes flash on sale completion (iter-38)
      fireTubeFlash();
      // Service bell auto-rings on sale completion (iter-42)
      // (small delay so it lands after the existing playBell call rather than doubling up)
      setTimeout(() => setServiceBellKey((k) => k + 1), 180);
      // Pneumatic tube capsule whooshes on sale completion (iter-46)
      fireTubeFlight();
      // Tip jar drop if a tip was rung
      if (tipCents > 0) {
        setTimeout(() => fireTipDrop(), 320);
      }
      // Cash sale → drawer pops open so cashier can deposit + make change
      if (method === "Cash") {
        setTimeout(() => setDrawerOpen(true), 120);
      }
      // Reset cart but keep customer
      setCart([]);
      setDiscountInput("");
      setTipInput("");
      setTaxInput("");
      setCashTendered("");
      setPaymentRef("");
      setCustomLabel("");
      setSignaturePng(null);
      setShowSignaturePad(false);
      // Refresh recent + till
      Promise.all([getRecentSales(8), getTodaysTill()]).then(([r2, t2]) => {
        setRecent(r2);
        setTill(t2);
      });
    });
  }

  function clearAll() {
    if (cart.length > 0 || discountInput || tipInput || taxInput) {
      pushUndo(
        { kind: "clearAll", lines: cart, discount: discountInput, tax: taxInput, tip: tipInput },
        cart.length > 0 ? `Cleared ${cart.length} item${cart.length === 1 ? "" : "s"}` : "Cleared adjustments",
      );
    }
    setCart([]);
    setDiscountInput("");
    setTipInput("");
    setTaxInput("");
    setCashTendered("");
    setPaymentRef("");
    setCustomLabel("");
    setCustomName("");
    setCustomPrice("");
    setError(null);
    setConfirmation(null);
  }

  function attach(c: { id: string; name: string; suiteNumber: string | null; email: string; walletBalanceCents: number }) {
    setAttached(c);
    setCustomerQuery("");
    setSearchResults([]);
  }

  function detach() {
    setAttached(null);
    if (method === "Wallet") setMethod("Cash");
  }

  return (
    <div className={`pos-root pos-theme-${theme} ${counterMode ? "pos-kiosk" : ""} ${idle ? "pos-idle" : ""}`}>
      <style jsx global>{`
        @keyframes drawerPop {
          0% { transform: translateY(0); }
          15% { transform: translateY(-14px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
        .drawer-pop { animation: drawerPop 700ms cubic-bezier(.34,1.56,.64,1); }

        @keyframes lcdScan {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.06; }
        }
        @keyframes lcdBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.35; }
        }
        @keyframes brassShine {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }
        @keyframes ringingBell {
          0%, 100% { transform: rotate(0); }
          20%  { transform: rotate(-12deg); }
          40%  { transform: rotate(10deg); }
          60%  { transform: rotate(-8deg); }
          80%  { transform: rotate(6deg); }
        }
        .ring-bell { animation: ringingBell 600ms ease-in-out; }

        .pos-root { color: ${BROWN}; }

        /* ── Theme palettes (iter-11) ──────────────────────────── */
        .pos-theme-brass {
          --cab-from: #4a2a1a;
          --cab-mid:  #3a1f12;
          --cab-to:   #2a160c;
          --cab-trim: ${GOLD_DARK};
          --cab-trim-hi: rgba(201,162,74,0.4);
          --bezel-from: #c9a24a;
          --bezel-to:   #8c6e27;
          --bezel-border: ${GOLD_DARK};
          --rail-text: ${GOLD};
          --lcd-glow: ${LCD_GLOW};
          --lcd-bg-from: #0a160e;
          --lcd-bg-mid:  #0e1a14;
          --lcd-bg-to:   #0a1410;
          --keycap-from: ${CREAM};
          --keycap-mid:  #ebd4a8;
          --keycap-to:   #d4ba88;
          --keycap-border: #6b4a26;
          --keycap-shadow: #5a3d20;
        }
        .pos-theme-aluminum {
          --cab-from: #2e3338;
          --cab-mid:  #232830;
          --cab-to:   #161a1f;
          --cab-trim: #888d96;
          --cab-trim-hi: rgba(200,210,220,0.45);
          --bezel-from: #c5cdd5;
          --bezel-to:   #6f7780;
          --bezel-border: #4a5058;
          --rail-text: #cfd5dc;
          --lcd-glow: #82c8ff;
          --lcd-bg-from: #07101a;
          --lcd-bg-mid:  #0c1822;
          --lcd-bg-to:   #07101a;
          --keycap-from: #f4f5f7;
          --keycap-mid:  #d8dde2;
          --keycap-to:   #b6bdc6;
          --keycap-border: #4a5058;
          --keycap-shadow: #3a3f48;
        }
        .pos-theme-walnut {
          --cab-from: #5b3a25;
          --cab-mid:  #432712;
          --cab-to:   #1f1107;
          --cab-trim: #b88c4a;
          --cab-trim-hi: rgba(184, 140, 74, 0.5);
          --bezel-from: #e2bb70;
          --bezel-to:   #936018;
          --bezel-border: #5d3c12;
          --rail-text: #f5d690;
          --lcd-glow: #ffc06e;
          --lcd-bg-from: #170805;
          --lcd-bg-mid:  #1f0d06;
          --lcd-bg-to:   #170805;
          --keycap-from: #fdf3dc;
          --keycap-mid:  #ddc596;
          --keycap-to:   #b8975a;
          --keycap-border: #6e4c1c;
          --keycap-shadow: #4d3010;
        }

        .pos-cabinet {
          background:
            linear-gradient(180deg, var(--cab-from, #4a2a1a) 0%, var(--cab-mid, #3a1f12) 35%, var(--cab-to, #2a160c) 100%),
            radial-gradient(ellipse at top, rgba(255,255,255,0.06), transparent 60%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 30px 60px -20px rgba(0,0,0,0.45),
            0 8px 18px -10px rgba(0,0,0,0.5);
          position: relative;
          transition: background 320ms ease, border-color 320ms ease;
        }
        .pos-cabinet::before {
          content: "";
          position: absolute;
          inset: 6px;
          border-radius: 14px;
          border: 1px solid var(--cab-trim-hi, rgba(201,162,74,0.4));
          pointer-events: none;
          transition: border-color 320ms ease;
        }
        .pos-bezel {
          background:
            radial-gradient(ellipse at top, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%),
            linear-gradient(180deg, var(--bezel-from, #c9a24a) 0%, var(--bezel-to, #8c6e27) 100%);
          border: 1px solid var(--bezel-border, ${GOLD_DARK});
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -2px 0 rgba(0,0,0,0.3),
            0 4px 10px -4px rgba(0,0,0,0.4);
          transition: background 320ms ease, border-color 320ms ease;
        }
        .lcd {
          background:
            linear-gradient(180deg, var(--lcd-bg-from, #0a160e) 0%, var(--lcd-bg-mid, #0e1a14) 50%, var(--lcd-bg-to, #0a1410) 100%);
          color: var(--lcd-glow, ${LCD_GLOW});
          font-family: "Courier New", ui-monospace, "SF Mono", Menlo, monospace;
          letter-spacing: 0.04em;
          text-shadow:
            0 0 4px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 45%, transparent),
            0 0 12px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 25%, transparent);
          border: 2px solid #061008;
          box-shadow:
            inset 0 0 24px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 18%, transparent),
            inset 0 0 80px rgba(0, 0, 0, 0.6),
            0 2px 6px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
          transition: background 320ms ease, color 320ms ease;
        }
        .lcd::before {
          content: "";
          position: absolute; inset: 0;
          background:
            repeating-linear-gradient(0deg, color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 8%, transparent) 0, color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 8%, transparent) 1px, transparent 1px, transparent 2.4px);
          pointer-events: none;
          mix-blend-mode: screen;
          animation: crtScanlineFlicker 4.7s ease-in-out infinite;
        }
        .lcd::after {
          content: "";
          position: absolute; inset: -10% -50%;
          background: linear-gradient(110deg, transparent 30%, color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 18%, transparent) 50%, transparent 70%);
          animation: lcdScan 4s ease-in-out infinite;
          pointer-events: none;
        }
        .lcd-cursor::after {
          content: "▮";
          margin-left: 6px;
          color: var(--lcd-glow, ${LCD_GLOW});
          animation: lcdBlink 1.1s steps(2) infinite;
        }

        /* ── CRT effects layered on top of the LCD (iter-39) ───────────── */
        .crt-vertical-sweep {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 2;
          mix-blend-mode: screen;
        }
        .crt-vertical-sweep::after {
          content: "";
          position: absolute;
          left: -6%;
          right: -6%;
          height: 9%;
          background:
            linear-gradient(180deg,
              transparent 0%,
              color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 8%, transparent) 30%,
              color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 28%, transparent) 50%,
              color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 8%, transparent) 70%,
              transparent 100%);
          animation: crtVerticalSweep 7s linear infinite;
          filter: blur(1px);
        }
        @keyframes crtVerticalSweep {
          0%   { top: -12%; opacity: 0; }
          5%   { opacity: 0.95; }
          92%  { opacity: 0.95; }
          100% { top: 110%; opacity: 0; }
        }
        .crt-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 110% 95% at 50% 50%, transparent 38%, rgba(0,0,0,0.20) 75%, rgba(0,0,0,0.55) 100%),
            radial-gradient(ellipse 70% 50% at 50% 30%, color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 5%, transparent), transparent 80%);
          mix-blend-mode: multiply;
          z-index: 1;
          border-radius: inherit;
        }
        .crt-hum {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          pointer-events: none;
          z-index: 3;
          background:
            linear-gradient(90deg,
              transparent 0%,
              color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 38%, transparent) 50%,
              transparent 100%);
          animation: crtHum 3.3s ease-in-out infinite;
          mix-blend-mode: screen;
          filter: blur(0.5px);
        }
        @keyframes crtHum {
          0%   { top: 8%;  opacity: 0; }
          10%  { opacity: 0.5; }
          50%  { top: 64%; opacity: 0.7; }
          90%  { opacity: 0.5; }
          100% { top: 92%; opacity: 0; }
        }
        @keyframes crtScanlineFlicker {
          0%, 100% { opacity: 1; }
          3%       { opacity: 0.78; }
          6%       { opacity: 1; }
          47%      { opacity: 1; }
          50%      { opacity: 0.84; }
          53%      { opacity: 1; }
          78%      { opacity: 1; }
          81%      { opacity: 0.92; }
          84%      { opacity: 1; }
        }
        /* CRT corner radius enhancement — slight curvature beyond rounded-xl */
        .lcd { border-radius: 14px; }
        /* Make sure inner content sits above the overlay layers */
        .lcd > div:not(.crt-vertical-sweep):not(.crt-vignette):not(.crt-hum) {
          position: relative;
          z-index: 4;
        }

        .keycap {
          background:
            linear-gradient(180deg, var(--keycap-from, ${CREAM}) 0%, var(--keycap-mid, #ebd4a8) 60%, var(--keycap-to, #d4ba88) 100%);
          border: 1.5px solid var(--keycap-border, #6b4a26);
          color: ${BROWN};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -2px 0 rgba(0,0,0,0.18),
            0 3px 0 var(--keycap-shadow, #5a3d20),
            0 6px 10px -3px rgba(0,0,0,0.4);
          transition: transform 80ms ease, box-shadow 80ms ease, filter 120ms ease, background 320ms ease;
          font-weight: 800;
          letter-spacing: -0.01em;
          cursor: pointer;
          position: relative;
        }
        .keycap:hover { filter: brightness(1.06); }
        .keycap:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            0 1px 0 #5a3d20,
            0 2px 4px -1px rgba(0,0,0,0.3);
        }
        .keycap[disabled] { opacity: 0.45; cursor: not-allowed; }

        .keycap-blue { background: linear-gradient(180deg, #4793a6 0%, ${BLUE} 60%, #245765 100%); color: ${CREAM}; border-color: #1a3e48; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #1a3e48, 0 6px 10px -3px rgba(0,0,0,0.4); }
        .keycap-red  { background: linear-gradient(180deg, #f24739 0%, ${RED} 60%, #a40010 100%); color: ${CREAM}; border-color: #780009; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #780009, 0 6px 10px -3px rgba(0,0,0,0.4); }
        .keycap-gold { background: linear-gradient(180deg, #f0c878 0%, ${GOLD} 60%, ${GOLD_DARK} 100%); color: ${BROWN}; border-color: #5a4318; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.25), 0 3px 0 #5a4318, 0 6px 10px -3px rgba(0,0,0,0.4); }
        .keycap-dark { background: linear-gradient(180deg, #4a2d22 0%, #2a160c 100%); color: ${CREAM}; border-color: #18090b; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.4), 0 3px 0 #18090b, 0 6px 10px -3px rgba(0,0,0,0.5); }

        .tape {
          background:
            repeating-linear-gradient(0deg, #fdf7e6 0, #fdf7e6 22px, #f5edd2 22px, #f5edd2 23px),
            #fdf7e6;
          color: ${BROWN};
          font-family: "Courier New", ui-monospace, monospace;
          border: 1px solid #d8c89a;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 4px rgba(0,0,0,0.06);
          position: relative;
        }
        .tape::before {
          content: "";
          position: absolute; left: 0; right: 0; top: -10px; height: 12px;
          background: repeating-linear-gradient(90deg, #c9a24a 0 10px, transparent 10px 20px);
          opacity: 0.7;
          border-radius: 2px;
        }

        .badge-method {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 2px 7px; border-radius: 4px;
          background: ${CREAM}; color: ${BROWN}; border: 1px solid rgba(45,16,15,0.18);
        }
        .badge-method.cash    { background: #d3f0d3; color: #1a4a1a; border-color: #2a8a2a; }
        .badge-method.zelle   { background: #d8e6f8; color: #1a3a6a; border-color: #6a9bd8; }
        .badge-method.square  { background: #1f1f1f; color: #fff; border-color: #000; }
        .badge-method.card    { background: #f4e1d8; color: #6a3a1a; border-color: #b8794a; }
        .badge-method.wallet  { background: #f3e7c4; color: ${BROWN}; border-color: #8c6e27; }
        .badge-method.custom  { background: #fbe1a3; color: ${BROWN}; border-color: ${GOLD_DARK}; }

        .brass-rivet {
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #f4d27a, var(--cab-trim, ${GOLD}) 60%, var(--keycap-shadow, ${GOLD_DARK}));
          box-shadow: 0 1px 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.6);
          animation: brassShine 5s ease-in-out infinite;
        }
        .rail-engrave {
          color: var(--rail-text, ${GOLD});
          transition: color 320ms ease;
        }

        /* ── Theme switcher segmented control (iter-11) ────────── */
        .theme-seg {
          display: inline-flex;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(45,16,15,0.3);
          border-radius: 6px;
          padding: 2px;
          gap: 1px;
        }
        .theme-seg-btn {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 4px;
          background: transparent;
          color: ${BROWN};
          opacity: 0.55;
          transition: all 140ms ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .theme-seg-btn:hover { opacity: 0.85; }
        .theme-seg-btn.active {
          background: ${BROWN};
          color: ${CREAM};
          opacity: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .theme-swatch {
          width: 10px; height: 10px; border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0,0,0,0.4);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }

        /* Customer-facing display — narrow amber LCD */
        .cust-display {
          background:
            linear-gradient(180deg, #1a0d05 0%, #281206 100%);
          border: 1px solid #5a3318;
          box-shadow:
            inset 0 0 12px rgba(255,176,74,0.18),
            inset 0 0 60px rgba(0,0,0,0.6);
          position: relative;
        }
        .cust-display::before {
          content: "";
          position: absolute; inset: 0;
          background: repeating-linear-gradient(0deg, rgba(255,176,74,0.06) 0, rgba(255,176,74,0.06) 1px, transparent 1px, transparent 2px);
          pointer-events: none;
        }
        @keyframes custMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .cust-marquee {
          display: inline-block;
          padding-right: 50%;
          animation: custMarquee 26s linear infinite;
          text-shadow: 0 0 6px rgba(255,176,74,0.55);
        }

        /* ── Cash drawer — hardware ─────────────────────────────────── */
        .drawer-housing {
          background:
            linear-gradient(180deg, #4a2a1a 0%, #3a1f12 35%, #1f0e07 100%);
          border: 2px solid ${GOLD_DARK};
          border-top: 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 30px 60px -20px rgba(0,0,0,0.45);
          position: relative;
          overflow: hidden;
        }
        .drawer-housing::before {
          content: "";
          position: absolute;
          inset: 6px;
          border-radius: 14px;
          border: 1px solid rgba(201,162,74,0.35);
          pointer-events: none;
          z-index: 1;
        }
        .drawer-tray {
          background:
            linear-gradient(180deg, #c2a36b 0%, #a78048 60%, #7c5e30 100%);
          border-radius: 8px;
          box-shadow:
            inset 0 2px 6px rgba(255,255,255,0.5),
            inset 0 -3px 8px rgba(0,0,0,0.35),
            0 6px 14px rgba(0,0,0,0.5);
        }
        .bill-slot {
          background: linear-gradient(180deg, #6e521b 0%, #4a3613 100%);
          border-radius: 4px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.18);
          border: 1px solid #2a1d09;
        }
        .bill {
          background:
            linear-gradient(180deg, var(--bill-from) 0%, var(--bill-to) 100%);
          border: 1px solid var(--bill-border);
          color: var(--bill-ink);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06) inset;
          font-family: "Times New Roman", "Georgia", serif;
          letter-spacing: 0.02em;
          position: relative;
        }
        .bill::after {
          content: "";
          position: absolute; inset: 1px;
          border: 1px solid color-mix(in srgb, var(--bill-ink) 30%, transparent);
          border-radius: 1px;
          pointer-events: none;
        }
        @keyframes drawerSlide {
          0%   { transform: translateY(-30%) scaleY(0.05); opacity: 0; max-height: 0; }
          25%  { transform: translateY(-15%) scaleY(0.4); opacity: 0.6; max-height: 720px; }
          70%  { transform: translateY(6px) scaleY(1.04); opacity: 1; max-height: 720px; }
          100% { transform: translateY(0) scaleY(1); opacity: 1; max-height: 720px; }
        }
        @keyframes drawerRetract {
          0%   { transform: translateY(0) scaleY(1); opacity: 1; max-height: 720px; }
          100% { transform: translateY(-30%) scaleY(0.05); opacity: 0; max-height: 0; }
        }
        .drawer-anim-open  { animation: drawerSlide 480ms cubic-bezier(.34,1.56,.64,1) both; transform-origin: top center; }
        .drawer-anim-close { animation: drawerRetract 320ms ease-in both; transform-origin: top center; }

        @keyframes coinSpin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .coin {
          background:
            radial-gradient(circle at 30% 30%, #fff8d8 0%, #d4a73a 35%, #8a6e1a 100%);
          border: 1px solid #6c4f0e;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 1px 2px rgba(0,0,0,0.4);
          color: #4a3508;
          font-weight: 900;
          font-family: serif;
          transform-style: preserve-3d;
        }
        .coin-silver {
          background:
            radial-gradient(circle at 30% 30%, #ffffff 0%, #c0c5cc 35%, #5a6068 100%);
          border-color: #2e3338;
          color: #1a1d22;
        }
        .coin-copper {
          background:
            radial-gradient(circle at 30% 30%, #ffd9a8 0%, #b66e2c 50%, #5a3210 100%);
          border-color: #3a210a;
          color: #2a1808;
        }

        /* ── Thermal printer (iter-3) ──────────────────────────────── */
        .printer-shell {
          background:
            linear-gradient(180deg, #4a2a1a 0%, #3a1f12 100%);
          border: 1.5px solid ${GOLD_DARK};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4);
          position: relative;
        }
        .printer-shell::before {
          content: "";
          position: absolute; left: 8px; right: 8px; top: 6px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,162,74,0.5), transparent);
          pointer-events: none;
        }
        .printer-head {
          background:
            linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #5a4318;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.55),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }
        .printer-led {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block;
          box-shadow: inset 0 -1px 1px rgba(0,0,0,0.3);
        }
        .led-ready {
          background: radial-gradient(circle at 35% 30%, #c1ffd6, #4dca7a 60%, #1f5a2e);
          box-shadow: 0 0 6px rgba(77, 202, 122, 0.7), inset 0 -1px 1px rgba(0,0,0,0.4);
        }
        @keyframes ledFlash {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        .led-print {
          background: radial-gradient(circle at 35% 30%, #ffd9a0, #ff8a3a 60%, #6a2810);
          box-shadow: 0 0 8px rgba(255, 138, 58, 0.85), inset 0 -1px 1px rgba(0,0,0,0.4);
          animation: ledFlash 480ms steps(2, end) infinite;
        }

        @keyframes spoolSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .printer-spool {
          width: 16px; height: 16px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, #fdf7e6 0 4px, #d8c89a 4px 6px, #8c6e27 6px 7px, #fdf7e6 7px 8px);
          border: 1px solid #5a4318;
          box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
          display: inline-block;
          animation: spoolSpin 12s linear infinite;
        }
        .printer-shell.printing .printer-spool { animation: spoolSpin 0.6s linear infinite; }

        .printer-body {
          background:
            linear-gradient(180deg, #1a0d05 0%, #281206 100%);
          padding: 6px 6px 0;
          border: 1px solid #2a160c;
          overflow: hidden;
        }

        @keyframes printHead {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(calc(100% - 32px)); }
          100% { transform: translateX(0); }
        }
        .print-head-arm {
          position: absolute;
          top: 0; left: 6px;
          width: 32px; height: 6px;
          background: linear-gradient(180deg, #fffdf2 0%, #c9a24a 60%, #5a4318 100%);
          border: 1px solid #5a4318;
          box-shadow: 0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(255,255,255,0.4);
          border-radius: 1px;
          animation: printHead 280ms ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }

        @keyframes paperFeed {
          0%   { padding-top: 6px; }
          50%  { padding-top: 18px; }
          100% { padding-top: 6px; }
        }
        .tape-feed { animation: none; }
        .printer-shell.printing .tape {
          animation: paperFeed 1400ms cubic-bezier(.5,.2,.4,.95) both;
        }

        /* Tear-off perforation strip */
        .tear-bar {
          height: 12px;
          background:
            linear-gradient(180deg, #f5edd2 0%, #d8c89a 50%, transparent 100%),
            radial-gradient(circle at 4px 6px, transparent 0 1.5px, #d8c89a 1.6px 1.8px, transparent 1.9px) 0 0 / 8px 12px repeat-x,
            linear-gradient(180deg, #f5edd2, #d8c89a);
          border-top: 1px dashed #8c6e27;
          margin-top: -1px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.35);
          position: relative;
        }
        .tear-bar::after {
          content: "";
          position: absolute; left: 0; right: 0; bottom: 0; height: 4px;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 100%);
        }

        /* Quick-tender bill chips */
        .tender-chip {
          background:
            linear-gradient(180deg, #d2c4ad 0%, #a89e85 100%);
          border: 1.5px solid #594a30;
          color: #221b10;
          font-family: "Times New Roman", serif;
          font-weight: 900;
          letter-spacing: 0.02em;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.55),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 2px 0 rgba(45,16,15,0.5),
            0 4px 8px -2px rgba(0,0,0,0.35);
          transition: transform 100ms ease, box-shadow 100ms ease;
          cursor: pointer;
          position: relative;
        }
        .tender-chip:hover { transform: translateY(-1px); }
        .tender-chip:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            0 0 0 rgba(0,0,0,0),
            0 1px 2px rgba(0,0,0,0.35);
        }
        .tender-chip[data-exact="true"] {
          background: linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          color: ${BROWN};
        }
        @keyframes billFly {
          0%   { transform: translate(0,0) scale(1) rotate(0); opacity: 1; }
          100% { transform: translate(0, -36px) scale(0.5) rotate(8deg); opacity: 0; }
        }
        .bill-fly { animation: billFly 380ms ease-in forwards; }

        /* ── PAID stamp (iter-4) ──────────────────────────────────── */
        @keyframes stampSlam {
          0%   { transform: translate(-50%, -200%) rotate(-30deg) scale(2.4); opacity: 0; }
          55%  { transform: translate(-50%, -50%) rotate(-12deg) scale(1.05); opacity: 1; }
          70%  { transform: translate(-50%, -50%) rotate(-12deg) scale(0.94); }
          85%  { transform: translate(-50%, -50%) rotate(-12deg) scale(1.02); }
          100% { transform: translate(-50%, -50%) rotate(-12deg) scale(1); opacity: 1; }
        }
        @keyframes stampShake {
          0%,100% { transform: translate(0,0); }
          20%     { transform: translate(-2px, 1px); }
          40%     { transform: translate(2px, -1px); }
          60%     { transform: translate(-1px, -1px); }
          80%     { transform: translate(1px, 1px); }
        }
        .paid-stamp {
          position: absolute;
          left: 50%; top: 55%;
          transform: translate(-50%, -50%) rotate(-12deg) scale(1);
          z-index: 30;
          animation: stampSlam 700ms cubic-bezier(.5,2,.4,.8) forwards;
          pointer-events: none;
        }
        .paid-stamp-ring {
          padding: 6px 26px;
          border: 4px double #c01818;
          color: #c01818;
          background: rgba(255,255,255,0.05);
          font-family: "Courier New", monospace;
          letter-spacing: 0.25em;
          text-align: center;
          mix-blend-mode: multiply;
          opacity: 0.92;
          box-shadow: inset 0 0 8px rgba(192, 24, 24, 0.28);
        }
        .paid-stamp-ring::before {
          content: "★";
          position: absolute; left: -2px; top: 50%;
          transform: translateY(-50%);
          color: #c01818;
          font-size: 10px;
        }
        .paid-stamp-ring::after {
          content: "★";
          position: absolute; right: -2px; top: 50%;
          transform: translateY(-50%);
          color: #c01818;
          font-size: 10px;
        }
        .paid-stamp-text {
          font-size: 36px;
          font-weight: 900;
          line-height: 1;
          /* Spotty ink-stamp imperfection: */
          text-shadow:
            -1px 0 0 rgba(192,24,24,0.7),
             1px 1px 0 rgba(192,24,24,0.5),
             0 0 1px rgba(255,255,255,0.4) inset;
          filter: contrast(1.1);
        }
        .paid-stamp-sub {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.3em;
          margin-top: 2px;
        }
        .tape:has(.paid-stamp) { animation: stampShake 380ms ease-out 80ms; }

        /* ── Confetti coin shower (iter-4) ───────────────────────── */
        @keyframes coinFall {
          0%   { transform: translate3d(var(--x-start, 0), -10vh, 0) rotateY(0deg) rotateZ(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(var(--x-end, 0), 60vh, 0) rotateY(1080deg) rotateZ(var(--rot, 360deg)); opacity: 0; }
        }
        .confetti-coin {
          position: absolute;
          top: 0;
          width: var(--size, 18px);
          height: var(--size, 18px);
          border-radius: 50%;
          animation: coinFall var(--dur, 1500ms) ease-in forwards;
          animation-delay: var(--delay, 0ms);
          pointer-events: none;
          will-change: transform, opacity;
        }
        .confetti-gold {
          background: radial-gradient(circle at 35% 30%, #fff3c0 0%, #d4a73a 35%, #8a6e1a 100%);
          box-shadow: inset 0 0 0 1px rgba(255,243,192,0.6), 0 1px 2px rgba(0,0,0,0.4);
        }
        .confetti-silver {
          background: radial-gradient(circle at 35% 30%, #ffffff 0%, #c0c5cc 35%, #5a6068 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.4);
        }
        .confetti-copper {
          background: radial-gradient(circle at 35% 30%, #ffd9a8 0%, #b66e2c 50%, #5a3210 100%);
          box-shadow: inset 0 0 0 1px rgba(255,217,168,0.6), 0 1px 2px rgba(0,0,0,0.4);
        }
        .confetti-bill {
          width: 22px; height: 12px;
          border-radius: 1px;
          background: linear-gradient(180deg, #b8c8a8 0%, #6f8866 100%);
          box-shadow: inset 0 0 0 1px #3f5230, 0 1px 2px rgba(0,0,0,0.4);
        }

        /* ── Zelle pane upgrade (iter-4) ─────────────────────────── */
        .zelle-card {
          background:
            linear-gradient(140deg, #6c46e6 0%, #4d2bb7 100%),
            radial-gradient(circle at 0 0, rgba(255,255,255,0.18), transparent 60%);
          color: #ffffff;
          border: 1px solid #2a1465;
          box-shadow: 0 6px 20px -6px rgba(45, 16, 90, 0.45);
          position: relative;
          overflow: hidden;
        }
        .zelle-card::before {
          content: "";
          position: absolute;
          right: -40px; bottom: -40px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
          pointer-events: none;
        }
        .zelle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
          background: rgba(255,255,255,0.09);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          padding: 6px 10px;
          font-family: "Courier New", monospace;
          font-size: 12px;
          letter-spacing: 0.04em;
        }
        .zelle-copy-btn {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.95);
          color: #4d2bb7;
          border: none;
          cursor: pointer;
          transition: transform 100ms ease;
        }
        .zelle-copy-btn:hover { transform: translateY(-1px); }
        .zelle-copy-btn:active { transform: translateY(0); }
        .zelle-copy-btn.copied { background: #c0fbd0; color: #0e5f2e; }

        /* ── Counter Mode (iter-5) — kiosk fullscreen ──────────── */
        .pos-kiosk {
          position: fixed;
          inset: 0;
          z-index: 80;
          background:
            radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%);
          padding: clamp(12px, 2vw, 32px);
          overflow-y: auto;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        @keyframes kioskFade {
          0%   { opacity: 0; transform: scale(0.985); }
          100% { opacity: 1; transform: scale(1); }
        }
        .pos-kiosk > * { animation: kioskFade 380ms cubic-bezier(.34,1.56,.64,1); }
        .pos-kiosk .pos-cabinet {
          max-width: 1600px;
          margin: 0 auto;
        }
        .pos-kiosk .pos-cabinet .lcd {
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .pos-kiosk .lcd .text-3xl,
        .pos-kiosk .lcd .text-5xl,
        .pos-kiosk .lcd-cursor {
          font-size: clamp(48px, 7vw, 84px) !important;
        }
        .pos-kiosk .pos-bezel,
        .pos-kiosk .keycap,
        .pos-kiosk .keycap-blue,
        .pos-kiosk .keycap-red,
        .pos-kiosk .keycap-gold,
        .pos-kiosk .keycap-dark {
          /* Slightly larger touch targets */
        }
        .pos-kiosk-hint {
          position: fixed;
          right: 16px; bottom: 16px;
          background: rgba(45,16,15,0.85);
          color: ${CREAM};
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid ${GOLD_DARK};
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 90;
          text-transform: uppercase;
          pointer-events: none;
        }

        /* ── Plan picker grid (iter-5) ─────────────────────────── */
        .plan-grid {
          background:
            linear-gradient(180deg,#fff5dd 0%,#fae9c0 100%);
          border: 1px solid rgba(45,16,15,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          border-radius: 12px;
          padding: 10px;
        }
        .plan-cell {
          background:
            linear-gradient(180deg, #fdf7e6 0%, #ebd4a8 100%);
          border: 1.5px solid #6b4a26;
          border-radius: 10px;
          padding: 10px;
          color: ${BROWN};
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, filter 160ms ease;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 3px 0 #5a3d20,
            0 6px 12px -3px rgba(0,0,0,0.3);
          position: relative;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .plan-cell:hover { transform: translateY(-2px); filter: brightness(1.04); }
        .plan-cell:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 #5a3d20, 0 2px 4px rgba(0,0,0,0.2); }
        .plan-cell-pop {
          background: linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          border-color: #5a4318;
          color: ${BROWN};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.55),
            0 3px 0 #5a4318,
            0 6px 14px -3px rgba(0,0,0,0.35);
        }
        .plan-cell-pop::before {
          content: "POPULAR";
          position: absolute; right: 8px; top: -8px;
          background: ${RED}; color: ${CREAM};
          font-size: 8px; font-weight: 900;
          letter-spacing: 0.16em;
          padding: 2px 6px; border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        .plan-cell-best {
          background: linear-gradient(180deg, #c9e3ec 0%, #4793a6 70%, ${BLUE} 100%);
          border-color: #1a3e48;
          color: ${CREAM};
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 0 #1a3e48, 0 6px 14px -3px rgba(0,0,0,0.4);
        }
        .plan-cell-best::before {
          content: "BEST VALUE";
          position: absolute; right: 8px; top: -8px;
          background: ${GOLD}; color: ${BROWN};
          font-size: 8px; font-weight: 900;
          letter-spacing: 0.16em;
          padding: 2px 6px; border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        .plan-cell .plan-cell-name { font-size: 13px; font-weight: 900; line-height: 1.05; letter-spacing: -0.01em; }
        .plan-cell .plan-cell-term { font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; }
        .plan-cell .plan-cell-price { font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .plan-cell .plan-cell-permo { font-size: 10px; font-weight: 700; opacity: 0.7; }
        .plan-cell .plan-cell-saving {
          font-size: 9px; font-weight: 900; letter-spacing: 0.06em;
          padding: 2px 6px; border-radius: 3px; align-self: flex-start;
          background: ${RED}; color: ${CREAM};
          box-shadow: 0 1px 2px rgba(0,0,0,0.25);
        }
        .plan-cell-best .plan-cell-saving { background: ${GOLD}; color: ${BROWN}; }

        /* ── Parked-ticket clothesline rail (iter-6) ─────────────── */
        .park-rail {
          position: relative;
          padding: 18px 14px 8px;
          margin-bottom: -8px; /* Tucks just above the cabinet */
        }
        .park-rail-wire {
          position: absolute;
          left: 8px; right: 8px; top: 16px;
          height: 2px;
          background: linear-gradient(90deg, transparent 0, ${GOLD_DARK} 4%, ${GOLD} 50%, ${GOLD_DARK} 96%, transparent 100%);
          box-shadow: 0 1px 1px rgba(0,0,0,0.35);
          pointer-events: none;
          border-radius: 1px;
        }
        .park-rail-wire::before,
        .park-rail-wire::after {
          content: "";
          position: absolute; top: -3px;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #f4d27a, ${GOLD} 60%, ${GOLD_DARK});
          box-shadow: 0 1px 1px rgba(0,0,0,0.4);
        }
        .park-rail-wire::before { left: -4px; }
        .park-rail-wire::after  { right: -4px; }

        @keyframes ticketDrop {
          0%   { transform: translate(0, -28px) rotate(var(--rot, -3deg)) scale(0.92); opacity: 0; }
          70%  { transform: translate(0, 4px)   rotate(var(--rot, -3deg)) scale(1.02); opacity: 1; }
          100% { transform: translate(0, 0)     rotate(var(--rot, -3deg)) scale(1); opacity: 1; }
        }
        @keyframes ticketSway {
          0%, 100% { transform: rotate(var(--rot, -3deg)); }
          50%      { transform: rotate(calc(var(--rot, -3deg) + 1deg)); }
        }
        .park-ticket {
          position: relative;
          width: 150px;
          background:
            linear-gradient(180deg, #fdf8e7 0%, #f3e6c4 60%, #e6d4a4 100%),
            radial-gradient(circle at 100% 0%, rgba(255,255,255,0.4), transparent 60%);
          border: 1px solid #b69256;
          border-radius: 4px;
          padding: 22px 8px 8px;
          color: ${BROWN};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 4px 8px rgba(0,0,0,0.3),
            0 1px 0 rgba(0,0,0,0.2);
          cursor: pointer;
          flex-shrink: 0;
          animation: ticketDrop 480ms cubic-bezier(.34,1.56,.64,1) both,
                     ticketSway 6s ease-in-out infinite 480ms;
          transform-origin: 50% -10px;
          /* Top-left clipped corner — invoice-style */
          clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px);
        }
        .park-ticket:hover {
          filter: brightness(1.04);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 6px 12px rgba(0,0,0,0.4),
            0 1px 0 rgba(0,0,0,0.2);
        }
        .park-ticket-clip {
          position: absolute;
          left: 50%; top: -14px;
          width: 22px; height: 26px;
          transform: translateX(-50%);
          z-index: 5;
          pointer-events: none;
        }
        .park-ticket-discard {
          position: absolute;
          right: -4px; top: -4px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${RED}; color: ${CREAM};
          font-size: 10px;
          font-weight: 900;
          line-height: 18px;
          text-align: center;
          border: 1.5px solid #780009;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          cursor: pointer;
          z-index: 6;
        }
        .park-ticket-discard:hover { transform: scale(1.1); }

        .park-empty {
          padding: 12px 14px;
          background: rgba(45,16,15,0.04);
          border: 1px dashed rgba(45,16,15,0.18);
          border-radius: 8px;
          color: ${BROWN};
          opacity: 0.5;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-align: center;
        }

        /* ── REFUND stamp (iter-6) ────────────────────────────── */
        @keyframes refundStamp {
          0%   { transform: translate(-50%, -150%) rotate(20deg) scale(2.2); opacity: 0; }
          55%  { transform: translate(-50%, -50%)  rotate(8deg)  scale(1.05); opacity: 1; }
          75%  { transform: translate(-50%, -50%)  rotate(8deg)  scale(0.95); }
          100% { transform: translate(-50%, -50%)  rotate(8deg)  scale(1); opacity: 1; }
        }
        .refund-stamp {
          position: absolute;
          left: 50%; top: 55%;
          z-index: 8;
          pointer-events: none;
          animation: refundStamp 600ms cubic-bezier(.5,2,.4,.8) forwards;
          font-family: "Courier New", monospace;
          color: #c01818;
          mix-blend-mode: multiply;
          opacity: 0.9;
        }
        .refund-stamp-ring {
          padding: 4px 14px;
          border: 3px double #c01818;
          letter-spacing: 0.2em;
          text-align: center;
          font-size: 22px;
          font-weight: 900;
          background: rgba(255,255,255,0.05);
          box-shadow: inset 0 0 6px rgba(192,24,24,0.25);
        }

        /* ── LIVE pulse (iter-7) ──────────────────────────────── */
        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.55; }
        }
        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #e2483d;
          box-shadow: 0 0 6px rgba(226,72,61,0.7);
          animation: livePulse 1.4s ease-in-out infinite;
          display: inline-block;
        }

        /* ── Z-Report modal (iter-7) ───────────────────────────── */
        @keyframes zEnter {
          0%   { opacity: 0; transform: translate(0, 16px) scale(0.97); }
          100% { opacity: 1; transform: translate(0, 0) scale(1); }
        }
        @keyframes barGrow {
          0%   { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes barGrowH {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .z-overlay {
          position: fixed; inset: 0;
          z-index: 95;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.98) 70%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: clamp(12px, 2vw, 28px);
          overflow-y: auto;
          animation: zEnter 320ms cubic-bezier(.34,1.56,.64,1);
        }
        .z-card {
          max-width: 1200px;
          margin: 0 auto;
          background:
            linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 2px solid ${GOLD_DARK};
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${BROWN};
        }
        .z-bar-vert {
          background: linear-gradient(180deg, ${BLUE} 0%, #23596A 100%);
          border-radius: 4px 4px 0 0;
          width: 100%;
          transform-origin: bottom center;
          animation: barGrow 600ms cubic-bezier(.34,1.56,.64,1) forwards;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .z-bar-horz {
          background: linear-gradient(90deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          height: 100%;
          border-radius: 0 4px 4px 0;
          transform-origin: left center;
          animation: barGrowH 600ms cubic-bezier(.34,1.56,.64,1) forwards;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .z-totals-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        @media (min-width: 640px) {
          .z-totals-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* ── 3D Cabinet tilt (iter-8) ────────────────────────────── */
        .pos-tilt-stage {
          perspective: 1500px;
          perspective-origin: 50% 30%;
          transform-style: preserve-3d;
        }
        .pos-tilt {
          transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
          transform-style: preserve-3d;
          transition: transform 220ms cubic-bezier(.2,.7,.3,1);
          will-change: transform;
        }
        @media (hover: none) {
          .pos-tilt { transform: none !important; transition: none; }
        }
        /* Cursor-following spec highlight on the brass top-rail */
        .pos-tilt::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50px;
          background: radial-gradient(ellipse 40% 60% at var(--tilt-spec, 50%) 0%, rgba(255,235,180,0.22) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 16px 16px 0 0;
          z-index: 4;
          mix-blend-mode: screen;
        }

        /* ── Hotkey pill / overlay (iter-8) ────────────────────── */
        .hk-pill {
          position: fixed;
          right: 14px; bottom: 14px;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: ${BROWN}; color: ${CREAM};
          font-size: 14px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid ${GOLD_DARK};
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 160ms ease, transform 160ms ease;
          z-index: 70;
        }
        .hk-pill:hover { opacity: 1; transform: scale(1.08); }

        @keyframes hkEnter {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .hk-overlay {
          position: fixed; inset: 0;
          z-index: 100;
          background: rgba(15,5,4,0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .hk-card {
          position: relative;
          background: linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 2px solid ${GOLD_DARK};
          border-radius: 18px;
          color: ${BROWN};
          max-width: 700px;
          width: 100%;
          padding: 24px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 30px 60px -20px rgba(0,0,0,0.7);
          animation: hkEnter 220ms cubic-bezier(.34,1.56,.64,1);
          transform: translate(-50%, -50%) scale(1);
          left: 50%; top: 50%;
          position: absolute;
        }
        .kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          background: linear-gradient(180deg, #fff8e6 0%, #ebd4a8 100%);
          border: 1.5px solid #6b4a26;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 900;
          color: ${BROWN};
          font-family: ui-monospace, "SF Mono", "Menlo", monospace;
          letter-spacing: 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 1px 0 #5a3d20,
            0 2px 4px -1px rgba(0,0,0,0.3);
        }

        /* ── Tip-percent chips (iter-9) ───────────────────────── */
        .tip-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 14px;
          background: linear-gradient(180deg, #fff8e6 0%, #ebd4a8 100%);
          border: 1px solid #8c6e27;
          color: ${BROWN};
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 1px 0 rgba(45,16,15,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);
          transition: transform 100ms ease, filter 120ms ease;
        }
        .tip-chip:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .tip-chip-pct {
          background: ${BLUE};
          color: ${CREAM};
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 10px;
          letter-spacing: 0.04em;
        }
        .tip-chip-amt { font-variant-numeric: tabular-nums; }
        .tip-chip-clear {
          padding: 3px 10px;
          border-radius: 14px;
          background: rgba(45,16,15,0.06);
          border: 1px dashed rgba(45,16,15,0.3);
          color: ${BROWN};
          font-size: 10px;
          font-weight: 700;
          opacity: 0.7;
          cursor: pointer;
        }
        .tip-chip-clear:hover { opacity: 1; }

        /* ── Idle screensaver (iter-9) ────────────────────────── */
        @keyframes idleFade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes idleSpotlight {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%      { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes idleCoinFloat {
          0%   { transform: translate3d(0, 100%, 0) rotate(0deg); opacity: 0; }
          15%  { opacity: 0.65; }
          85%  { opacity: 0.65; }
          100% { transform: translate3d(0, -120%, 0) rotate(var(--rot, 360deg)); opacity: 0; }
        }
        @keyframes idleTagline {
          0%, 18% { opacity: 0; transform: translateY(8px); }
          22%, 78% { opacity: 1; transform: translateY(0); }
          82%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes idleTapBlink {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .idle-overlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          background:
            radial-gradient(ellipse at center, rgba(45,16,15,0.65) 0%, rgba(15,5,4,0.95) 70%);
          backdrop-filter: saturate(80%) blur(2px);
          animation: idleFade 720ms ease both;
          color: ${CREAM};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
        }
        .idle-spotlight {
          position: absolute;
          left: 50%; top: 50%;
          width: 720px; height: 720px;
          transform: translate(-50%, -50%);
          background:
            radial-gradient(circle, rgba(255,228,168,0.32) 0%, rgba(255,228,168,0.15) 25%, transparent 60%);
          animation: idleSpotlight 6s ease-in-out infinite;
          pointer-events: none;
        }
        .idle-tap {
          animation: idleTapBlink 1.6s ease-in-out infinite;
        }
        .idle-tagline {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.02em;
          opacity: 0.85;
          font-style: italic;
          font-family: "Pacifico", "Brush Script MT", cursive;
          color: ${GOLD};
          animation: idleTagline 6s ease-in-out infinite;
        }
        .idle-coin {
          position: absolute;
          width: var(--size, 14px);
          height: var(--size, 14px);
          border-radius: 50%;
          left: var(--x, 50%);
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, #fff3c0 0%, #d4a73a 35%, #8a6e1a 100%);
          box-shadow: 0 0 6px rgba(212,167,58,0.5), inset 0 0 0 1px rgba(255,243,192,0.5);
          animation: idleCoinFloat var(--dur, 8s) ease-in infinite;
          animation-delay: var(--delay, 0s);
          pointer-events: none;
        }

        /* When idle, fade the cabinet contents behind the overlay */
        .pos-idle .pos-cabinet > *:not(.idle-overlay) {
          filter: brightness(0.45) saturate(0.8);
          transition: filter 720ms ease;
        }

        /* ── Customer Presence Card (iter-10) ──────────────────── */
        @keyframes presenceSlide {
          0%   { opacity: 0; transform: translateY(-8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .presence-card {
          background:
            linear-gradient(180deg, #fdf7e6 0%, #f3e6c4 100%);
          border: 1px solid #b69256;
          border-radius: 12px;
          padding: 12px;
          color: ${BROWN};
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 12px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.65),
            0 4px 10px -4px rgba(0,0,0,0.2);
          animation: presenceSlide 320ms cubic-bezier(.34,1.56,.64,1);
        }
        .presence-avatar {
          width: 56px; height: 56px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 900; color: ${CREAM};
          letter-spacing: -0.02em;
          font-family: "Baloo 2", system-ui, sans-serif;
          box-shadow:
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 2px 4px rgba(255,255,255,0.35),
            0 4px 8px -2px rgba(0,0,0,0.3);
          position: relative;
        }
        .presence-avatar::after {
          content: "";
          position: absolute; inset: 2px;
          border-radius: 50%;
          border: 1.5px solid rgba(247, 230, 194, 0.55);
          pointer-events: none;
        }
        .presence-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .presence-pill.green  { background: #d3f0d3; color: #1a4a1a; border: 1px solid #2a8a2a; }
        .presence-pill.amber  { background: #fbe1a3; color: #6b4a18; border: 1px solid ${GOLD_DARK}; }
        .presence-pill.red    { background: #f5d3d0; color: #8a1010; border: 1px solid #b8606a; }
        .presence-pill.blue   { background: #d8e6f8; color: #1a3a6a; border: 1px solid #6a9bd8; }
        .presence-stat {
          font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(45,16,15,0.6);
        }

        /* ── Email/SMS chips (iter-10) ─────────────────────────── */
        @keyframes chipSent {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .deliver-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          background: rgba(255,255,255,0.08);
          color: ${CREAM};
          border: 1px solid rgba(255,255,255,0.3);
          cursor: pointer;
          transition: filter 120ms ease, transform 120ms ease;
        }
        .deliver-chip:hover { filter: brightness(1.1); }
        .deliver-chip.sending { opacity: 0.65; cursor: progress; }
        .deliver-chip.sent {
          background: rgba(195, 246, 195, 0.92);
          color: #0e5f2e;
          border-color: #2a8a2a;
          animation: chipSent 360ms ease-out;
        }
        .deliver-chip.failed {
          background: rgba(245, 211, 208, 0.92);
          color: #8a1010;
          border-color: #b8606a;
        }
        .deliver-chip[disabled] { opacity: 0.4; cursor: not-allowed; }

        /* ── Daily Goal progress ring (iter-12) ───────────────── */
        @keyframes ringFill {
          0% { stroke-dashoffset: var(--from, 360); }
          100% { stroke-dashoffset: var(--to, 0); }
        }
        .goal-ring-stage {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        .goal-ring {
          position: relative;
          width: 84px; height: 84px;
          flex-shrink: 0;
        }
        .goal-ring-inner {
          position: absolute; inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: ${BROWN};
        }
        @keyframes goalSparkle {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          40%      { opacity: 1; transform: scale(1.1); }
          70%      { opacity: 0.9; transform: scale(1); }
        }
        .goal-sparkle {
          position: absolute;
          font-size: 12px;
          color: ${GOLD};
          animation: goalSparkle 1.6s ease-in-out infinite;
          pointer-events: none;
          text-shadow: 0 0 4px rgba(255,215,124,0.8);
        }

        /* ── Milestone celebration (iter-12) ──────────────────── */
        @keyframes milestoneEnter {
          0%   { transform: translate(-50%, -120%) scale(0.85); opacity: 0; }
          50%  { transform: translate(-50%, 4px)   scale(1.04); opacity: 1; }
          75%  { transform: translate(-50%, -2px)  scale(0.99); }
          100% { transform: translate(-50%, 0)     scale(1); opacity: 1; }
        }
        @keyframes milestoneExit {
          0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -120%) scale(0.92); opacity: 0; }
        }
        @keyframes milestoneShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .milestone-banner {
          position: fixed;
          top: 16px;
          left: 50%;
          z-index: 110;
          width: min(640px, calc(100% - 24px));
          pointer-events: none;
          animation:
            milestoneEnter 700ms cubic-bezier(.34,1.56,.64,1) forwards,
            milestoneExit 480ms ease-in 3.4s forwards;
        }
        .milestone-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          background:
            linear-gradient(120deg,
              ${GOLD_DARK} 0%,
              ${GOLD} 25%,
              #fff3c0 50%,
              ${GOLD} 75%,
              ${GOLD_DARK} 100%);
          background-size: 200% 100%;
          animation: milestoneShimmer 2.5s linear infinite;
          color: ${BROWN};
          border-radius: 16px;
          border: 2px solid ${BROWN};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 12px 30px -8px rgba(45,16,15,0.55);
        }
        .milestone-icon {
          font-size: 28px;
          color: ${BROWN};
          text-shadow: 0 0 6px rgba(255,255,255,0.6);
        }

        /* ── Mailbox wall (iter-13) ───────────────────────────── */
        .wall-frame {
          background:
            linear-gradient(180deg, var(--cab-from, #4a2a1a) 0%, var(--cab-to, #2a160c) 100%),
            radial-gradient(ellipse at top, rgba(255,255,255,0.06), transparent 60%);
          border: 1.5px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 10px;
          padding: 12px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4);
          position: relative;
        }
        .wall-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 4px;
        }
        @media (min-width: 1024px) {
          .wall-grid { grid-template-columns: repeat(16, minmax(0, 1fr)); }
        }

        @keyframes doorEnter {
          0%   { transform: translateY(-4px) scale(0.94); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .door {
          position: relative;
          aspect-ratio: 1 / 1.15;
          border-radius: 3px;
          padding: 3px 3px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          font-size: 8px;
          font-weight: 900;
          color: ${BROWN};
          background:
            linear-gradient(180deg, var(--door-from, #fdf7e6) 0%, var(--door-to, #ebd4a8) 100%);
          border: 1px solid var(--door-border, #6b4a26);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            0 1px 0 rgba(0,0,0,0.25);
          cursor: pointer;
          animation: doorEnter 320ms cubic-bezier(.34,1.56,.64,1) both;
          transition: filter 120ms ease, transform 120ms ease;
        }
        .door:hover { filter: brightness(1.1); transform: translateY(-1px); z-index: 3; }
        .door[disabled], .door.vacant { cursor: default; }
        .door .door-num {
          font-size: 8px;
          line-height: 1;
          letter-spacing: 0.04em;
          opacity: 0.8;
        }
        .door .door-initials {
          font-size: 11px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.02em;
          font-family: "Baloo 2", system-ui, sans-serif;
        }
        .door .door-pill {
          width: 6px; height: 6px; border-radius: 50%;
          margin-top: 1px;
        }
        .door.active   { --door-from: #fdf7e6; --door-to: #ebd4a8; --door-border: #6b4a26; }
        .door.due_soon { --door-from: #fbe1a3; --door-to: #f0c878; --door-border: ${GOLD_DARK}; }
        .door.overdue  { --door-from: #f5d3d0; --door-to: #f0a7a0; --door-border: #a40010; color: #6a0010; }
        .door.suspended{ --door-from: #d8d8d8; --door-to: #b0b0b0; --door-border: #4a4a4a; color: #1f1f1f; }
        .door.held     { --door-from: #d8e6f8; --door-to: #b0c8e8; --door-border: #5e8bc4; color: #1a3a6a; }
        .door.vacant {
          --door-from: rgba(45,16,15,0.18);
          --door-to: rgba(45,16,15,0.32);
          --door-border: rgba(201,162,74,0.4);
          color: rgba(247,230,194,0.5);
          box-shadow:
            inset 0 1px 0 rgba(0,0,0,0.18),
            inset 0 -1px 0 rgba(255,255,255,0.06);
        }
        /* Brass slot at the bottom of each door */
        .door::after {
          content: "";
          position: absolute;
          left: 18%; right: 18%;
          bottom: 2px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, var(--door-border, #6b4a26) 20%, var(--door-border, #6b4a26) 80%, transparent);
          opacity: 0.55;
        }
        /* Tooltip */
        .door-tip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: ${BROWN};
          color: ${CREAM};
          padding: 5px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 120ms ease;
          z-index: 5;
          box-shadow: 0 4px 8px rgba(0,0,0,0.35);
        }
        .door:hover .door-tip { opacity: 1; }
        .door-tip::after {
          content: "";
          position: absolute;
          top: 100%; left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: ${BROWN};
        }

        .wall-legend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--rail-text, ${GOLD});
        }
        .wall-legend-dot {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0,0,0,0.4);
        }

        /* ── Macro toolbar (iter-14) ───────────────────────────── */
        @keyframes macroEnter {
          0%   { transform: translateY(-4px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .macro-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-bottom: 12px;
        }
        @media (min-width: 640px) {
          .macro-row { grid-template-columns: repeat(8, minmax(0, 1fr)); }
        }
        .macro-key {
          position: relative;
          aspect-ratio: 1 / 1.05;
          padding: 6px 4px 5px;
          border-radius: 8px;
          background:
            linear-gradient(180deg, var(--macro-from, var(--keycap-from, ${CREAM})) 0%, var(--macro-to, var(--keycap-to, #d4ba88)) 100%);
          border: 1.5px solid var(--macro-border, var(--keycap-border, #6b4a26));
          color: ${BROWN};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -2px 0 rgba(0,0,0,0.15),
            0 3px 0 var(--macro-shadow, var(--keycap-shadow, #5a3d20)),
            0 6px 10px -3px rgba(0,0,0,0.4);
          transition: transform 80ms ease, box-shadow 80ms ease, filter 120ms ease;
          animation: macroEnter 280ms cubic-bezier(.34,1.56,.64,1) both;
        }
        .macro-key:hover { filter: brightness(1.06); }
        .macro-key:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.5),
            0 1px 0 var(--macro-shadow, var(--keycap-shadow, #5a3d20)),
            0 2px 4px -1px rgba(0,0,0,0.3);
        }
        .macro-key.empty {
          background: rgba(255,255,255,0.06);
          border: 1.5px dashed rgba(247,230,194,0.35);
          color: rgba(247,230,194,0.55);
          box-shadow: none;
          cursor: pointer;
        }
        .macro-key.empty:hover { background: rgba(255,255,255,0.12); color: rgba(247,230,194,0.85); }
        .macro-icon {
          width: 20px; height: 20px;
          margin-top: 2px;
        }
        .macro-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1;
          text-align: center;
          text-transform: uppercase;
          padding: 0 2px;
        }
        .macro-price {
          font-size: 11px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .macro-key.cat-Service   { --macro-from: #d6e6f3; --macro-to: #4793a6; --macro-border: #1a3e48; --macro-shadow: #1a3e48; color: #0d2a32; }
        .macro-key.cat-Supplies  { --macro-from: #f0c878; --macro-to: ${GOLD_DARK}; --macro-border: #5a4318; --macro-shadow: #5a4318; }
        .macro-key.cat-Fees      { --macro-from: #f5d3d0; --macro-to: #e2483d; --macro-border: #780009; --macro-shadow: #780009; color: #4a0008; }
        .macro-key.cat-Mailbox   { --macro-from: #ebd4a8; --macro-to: ${GOLD}; --macro-border: ${GOLD_DARK}; --macro-shadow: ${GOLD_DARK}; }

        /* Tiny circular swap indicator on key when editing */
        .macro-edit-badge {
          position: absolute;
          top: -6px; right: -6px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${BROWN}; color: ${CREAM};
          font-size: 10px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid ${CREAM};
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          z-index: 2;
        }
        .macro-edit-badge.del {
          background: #c01818;
          left: -6px;
          right: auto;
        }

        /* Edit toggle pill on the row's right side */
        .macro-edit-pill {
          background: var(--cab-trim-hi, rgba(201,162,74,0.4));
          color: var(--rail-text, ${GOLD});
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid var(--cab-trim, ${GOLD_DARK});
          cursor: pointer;
          transition: all 140ms ease;
        }
        .macro-edit-pill:hover { filter: brightness(1.1); }
        .macro-edit-pill.active {
          background: ${BROWN}; color: ${CREAM};
          border-color: ${BROWN};
        }

        /* Swap popover */
        .macro-swap {
          position: absolute;
          top: calc(100% + 6px);
          left: 0; right: 0;
          background: linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 1.5px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 10px;
          z-index: 30;
          padding: 8px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.45);
        }

        /* ── Receipt Preview Modal (iter-15) ───────────────────── */
        @keyframes previewBackdrop {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes previewSlideUp {
          0%   { transform: translate(-50%, 100%); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .preview-overlay {
          position: fixed; inset: 0;
          z-index: 102;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.7), rgba(15,5,4,0.92) 70%);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: previewBackdrop 240ms ease both;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
          padding-bottom: 24px;
        }
        @media (min-width: 640px) {
          .preview-overlay { align-items: center; padding-bottom: 16px; }
        }
        .preview-card {
          position: relative;
          left: 50%;
          width: min(720px, 100%);
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          background: linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${BROWN};
          padding: 16px;
          animation: previewSlideUp 480ms cubic-bezier(.34,1.56,.64,1) both;
          transform: translate(-50%, 0);
        }
        .preview-paper {
          background: white;
          border: 1px solid #d8d4ce;
          border-radius: 4px;
          padding: 18px 20px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #1a1714;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          background-image:
            linear-gradient(180deg, transparent 50%, rgba(140,110,40,0.04) 50%);
          background-size: 100% 24px;
        }
        .preview-paper .row {
          display: flex; justify-content: space-between; gap: 8px;
        }
        .preview-paper .row.b { font-weight: 900; color: #2D100F; border-top: 1px solid #2D100F; padding-top: 4px; margin-top: 3px; font-size: 14px; }
        .preview-paper .h {
          font-size: 9px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; color: #666; margin: 8px 0 3px;
        }

        /* ── Live activity ticker (iter-16) ─────────────────────── */
        .ticker-rail {
          position: relative;
          margin-bottom: 8px;
          padding: 6px 12px 6px 60px;
          border-radius: 12px;
          background: linear-gradient(180deg, #0e1a14 0%, #0a1410 100%);
          border: 1px solid #1a3a2a;
          overflow: hidden;
          box-shadow: inset 0 0 18px rgba(0,0,0,0.5);
          color: ${CREAM};
          font-family: "Courier New", ui-monospace, monospace;
        }
        .ticker-rail::before {
          content: "LIVE";
          position: absolute;
          top: 50%;
          left: 8px;
          transform: translateY(-50%);
          background: #c01818;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          font-family: ui-sans-serif, system-ui, sans-serif;
          box-shadow: 0 0 6px rgba(192, 24, 24, 0.65);
          z-index: 4;
          animation: livePulse 1.4s ease-in-out infinite;
        }
        .ticker-rail::after {
          content: "";
          position: absolute;
          top: 0; right: 0;
          height: 100%;
          width: 80px;
          background: linear-gradient(90deg, transparent, #0a1410 80%);
          pointer-events: none;
          z-index: 3;
        }
        .ticker-track {
          display: inline-flex;
          gap: 14px;
          align-items: center;
          white-space: nowrap;
          animation: tickerScroll 75s linear infinite;
          will-change: transform;
        }
        .ticker-rail.paused .ticker-track { animation-play-state: paused; }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(124,255,178,0.25);
          background: rgba(124,255,178,0.05);
          color: ${CREAM};
        }
        .ticker-chip .ticker-icon {
          width: 14px; height: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900;
          border-radius: 50%;
        }
        .ticker-chip.kind-sale     .ticker-icon { background: #1a4a1a; color: #d3f0d3; box-shadow: 0 0 4px rgba(124,255,178,0.55); }
        .ticker-chip.kind-void     .ticker-icon { background: #5a1d1c; color: #ffd5d2; }
        .ticker-chip.kind-mail     .ticker-icon { background: #1a3a6a; color: #d8e6f8; box-shadow: 0 0 4px rgba(125,165,220,0.5); }
        .ticker-chip.kind-signup   .ticker-icon { background: ${GOLD_DARK}; color: ${CREAM}; box-shadow: 0 0 4px rgba(255,215,124,0.55); }
        .ticker-chip.kind-wallet   .ticker-icon { background: #2a8a2a; color: #ffffff; }
        .ticker-chip.kind-milestone .ticker-icon { background: #c01818; color: #ffffff; box-shadow: 0 0 6px rgba(255,76,76,0.7); }
        .ticker-chip .ticker-time { opacity: 0.55; font-size: 10px; margin-left: 4px; }
        .ticker-empty {
          color: rgba(247,230,194,0.5);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 4px 0;
        }

        /* ── Event toast (iter-16) ──────────────────────────────── */
        @keyframes toastSlide {
          0%   { transform: translateY(-12px); opacity: 0; }
          15%  { transform: translateY(0); opacity: 1; }
          85%  { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-12px); opacity: 0; }
        }
        .event-toast {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 95;
          background: linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 1.5px solid var(--cab-trim, ${GOLD_DARK});
          border-left-width: 6px;
          border-radius: 10px;
          padding: 10px 14px 10px 12px;
          color: ${BROWN};
          min-width: 240px;
          max-width: 320px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 12px 28px -8px rgba(0,0,0,0.55);
          animation: toastSlide 4000ms ease-in-out forwards;
          cursor: pointer;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .event-toast.kind-sale     { border-left-color: #2a8a2a; }
        .event-toast.kind-void     { border-left-color: #c01818; }
        .event-toast.kind-mail     { border-left-color: ${BLUE}; }
        .event-toast.kind-signup   { border-left-color: ${GOLD}; }
        .event-toast.kind-wallet   { border-left-color: #2a8a2a; }
        .event-toast.kind-milestone{ border-left-color: ${RED}; }

        /* ── Returns modal (iter-17) ─────────────────────────── */
        @keyframes returnsEnter {
          0%   { opacity: 0; transform: scale(0.96) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .returns-overlay {
          position: fixed; inset: 0;
          z-index: 98;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: clamp(12px, 2vw, 28px);
          overflow-y: auto;
        }
        .returns-card {
          max-width: 1100px;
          margin: 0 auto;
          background:
            linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${BROWN};
          padding: 18px;
          animation: returnsEnter 320ms cubic-bezier(.34,1.56,.64,1);
        }
        .returns-list {
          max-height: 60vh;
          overflow-y: auto;
          border-radius: 8px;
          border: 1px solid rgba(45,16,15,0.18);
          background: rgba(255,255,255,0.45);
        }
        .returns-row {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(45,16,15,0.08);
          cursor: pointer;
          transition: background 100ms ease;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .returns-row:hover { background: rgba(255,255,255,0.55); }
        .returns-row.active {
          background: linear-gradient(180deg, #fff5dd 0%, #fae9c0 100%);
          border-left: 3px solid var(--cab-trim, ${GOLD_DARK});
          padding-left: 9px;
        }
        .returns-row.voided { opacity: 0.55; }
        .returns-row .num {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px; font-weight: 900;
          color: ${BROWN};
          letter-spacing: 0.04em;
        }
        .returns-detail-paper {
          background: white;
          border: 1px solid #d8d4ce;
          border-radius: 4px;
          padding: 14px 16px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          line-height: 1.5;
          color: #1a1714;
          background-image:
            linear-gradient(180deg, transparent 50%, rgba(140,110,40,0.04) 50%);
          background-size: 100% 22px;
        }

        /* ── Promotions strip (iter-18) ───────────────────────── */
        @keyframes promoEnter {
          0%   { transform: scale(0.94) translateY(4px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes promoShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .promo-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 2px 8px;
          margin-bottom: 8px;
          scroll-snap-type: x proximity;
        }
        .promo-strip::-webkit-scrollbar { height: 4px; }
        .promo-strip::-webkit-scrollbar-thumb { background: rgba(247,230,194,0.25); border-radius: 2px; }
        .promo-chip {
          flex-shrink: 0;
          min-width: 180px;
          max-width: 220px;
          scroll-snap-align: start;
          padding: 8px 12px;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          animation: promoEnter 320ms cubic-bezier(.34,1.56,.64,1) both;
          transition: transform 120ms ease, filter 120ms ease;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.25),
            0 4px 10px -3px rgba(0,0,0,0.45);
          background-size: 200% 100%;
          animation-name: promoEnter, promoShimmer;
          animation-duration: 320ms, 8s;
          animation-iteration-count: 1, infinite;
          animation-timing-function: cubic-bezier(.34,1.56,.64,1), linear;
        }
        .promo-chip:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .promo-chip:active { transform: translateY(1px); }
        .promo-chip.expired { opacity: 0.45; cursor: not-allowed; filter: saturate(0.6); }

        .promo-rose   { background: linear-gradient(120deg, #c92a4d, #ff7799, #c92a4d); }
        .promo-indigo { background: linear-gradient(120deg, #2b3e7d, #5a78c2, #2b3e7d); }
        .promo-gold   { background: linear-gradient(120deg, #8c6e27, #f0c878, #8c6e27); color: #2D100F; }
        .promo-teal   { background: linear-gradient(120deg, #1a3e48, #4793a6, #1a3e48); }
        .promo-ember  { background: linear-gradient(120deg, #6c2010, #e2483d, #6c2010); }
        .promo-olive  { background: linear-gradient(120deg, #3d4a1c, #7e8e3e, #3d4a1c); }

        .promo-tag {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          opacity: 0.85;
        }
        .promo-label {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: -0.01em;
          line-height: 1.1;
          margin-top: 1px;
        }
        .promo-sub {
          font-size: 10px;
          font-weight: 700;
          opacity: 0.92;
          margin-top: 2px;
        }
        .promo-countdown {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 2px 6px;
          background: rgba(0,0,0,0.32);
          color: white;
          border-radius: 3px;
          margin-top: 4px;
        }
        .promo-countdown.urgent {
          background: rgba(192, 24, 24, 0.78);
          animation: livePulse 1.4s ease-in-out infinite;
        }

        /* ── Loyalty Punchcard (iter-19) ──────────────────────── */
        @keyframes stampInk {
          0%   { transform: scale(1.6) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(0.9) rotate(-12deg); opacity: 1; }
          100% { transform: scale(1) rotate(-12deg); opacity: 1; }
        }
        @keyframes rewardGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(192,24,24,0); }
          50%      { box-shadow: 0 0 12px rgba(192,24,24,0.65); }
        }
        .loyalty-card {
          margin-top: 10px;
          padding: 8px 10px;
          background:
            repeating-linear-gradient(0deg, #fff8e6 0, #fff8e6 12px, #f3e6c4 12px, #f3e6c4 13px),
            #fff8e6;
          border: 1px dashed rgba(45,16,15,0.35);
          border-radius: 8px;
          color: ${BROWN};
          position: relative;
        }
        .loyalty-header {
          display: flex; justify-content: space-between; align-items: baseline;
          font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
          opacity: 0.7;
          margin-bottom: 4px;
        }
        .loyalty-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 4px;
        }
        .loyalty-slot {
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(45,16,15,0.06);
          border: 1.5px dashed rgba(45,16,15,0.3);
          color: ${BROWN};
          font-size: 9px;
          font-weight: 900;
          font-family: serif;
          position: relative;
        }
        .loyalty-slot.stamped {
          background: radial-gradient(circle at 35% 30%, #f0a7a0, #c01818 60%, #6c0010);
          border: 2px solid #6c0010;
          color: #ffeae8;
          font-family: "Times New Roman", serif;
          animation: stampInk 360ms cubic-bezier(.5,2,.4,.8) both;
          box-shadow: inset 0 -1px 1px rgba(255,255,255,0.3), 0 1px 1px rgba(0,0,0,0.3);
        }
        .loyalty-reward {
          margin-top: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          background: linear-gradient(120deg, ${GOLD_DARK} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%);
          background-size: 200% 100%;
          animation: promoShimmer 2.4s linear infinite, rewardGlow 1.8s ease-in-out infinite;
          color: ${BROWN};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .loyalty-empty {
          font-size: 10px;
          font-weight: 700;
          opacity: 0.55;
          text-align: center;
          padding: 4px 0;
          color: ${BROWN};
        }
        .loyalty-progress {
          font-size: 9px;
          font-weight: 800;
          opacity: 0.65;
          color: ${BROWN};
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* ── Cash Count Modal (iter-20) ───────────────────────── */
        @keyframes cashEnter {
          0%   { opacity: 0; transform: scale(0.96) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .cash-overlay {
          position: fixed; inset: 0;
          z-index: 99;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: clamp(12px, 2vw, 28px);
          overflow-y: auto;
        }
        .cash-card {
          max-width: 980px;
          margin: 0 auto;
          background:
            linear-gradient(180deg, var(--cab-from, #4a2a1a) 0%, var(--cab-mid, #3a1f12) 35%, var(--cab-to, #2a160c) 100%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${CREAM};
          padding: 18px;
          animation: cashEnter 320ms cubic-bezier(.34,1.56,.64,1);
        }
        .cash-tray {
          background:
            linear-gradient(180deg, #c2a36b 0%, #a78048 60%, #7c5e30 100%);
          border-radius: 10px;
          padding: 12px;
          box-shadow:
            inset 0 2px 6px rgba(255,255,255,0.45),
            inset 0 -3px 8px rgba(0,0,0,0.32),
            0 6px 14px rgba(0,0,0,0.45);
        }
        .cash-slot {
          background: linear-gradient(180deg, #6e521b 0%, #4a3613 100%);
          border-radius: 6px;
          padding: 8px;
          color: #f5d6a3;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.18);
          border: 1px solid #2a1d09;
          display: flex; flex-direction: column; gap: 4px;
        }
        .cash-slot-input {
          width: 100%;
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(0,0,0,0.6);
          color: #fffbe7;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          text-align: center;
        }
        .cash-slot-input:focus { outline: 2px solid ${GOLD}; }
        .cash-summary {
          margin-top: 14px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        @media (min-width: 640px) {
          .cash-summary { grid-template-columns: repeat(4, 1fr); }
        }
        .cash-stat {
          display: flex; flex-direction: column;
          gap: 2px;
        }
        .cash-stat-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--rail-text, ${GOLD});
          opacity: 0.85;
        }
        .cash-stat-value {
          font-size: 18px;
          font-weight: 900;
          color: ${CREAM};
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .cash-stat-value.short  { color: #ffd5d2; }
        .cash-stat-value.over   { color: #c0fbd0; }
        .cash-stat-value.exact  { color: #ffd97c; }

        /* ── Hourly Spark (iter-21) ────────────────────────────── */
        @keyframes sparkDraw {
          0%   { stroke-dashoffset: 240; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes sparkPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.25); opacity: 0.85; }
        }
        .spark-stage {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .spark-stage svg .spark-fill {
          fill: url(#sparkFillGrad);
          opacity: 0.35;
        }
        .spark-stage svg .spark-line {
          fill: none;
          stroke: var(--rail-text, ${GOLD});
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 240;
          animation: sparkDraw 1100ms cubic-bezier(.5,.0,.4,1) forwards;
        }
        .spark-stage svg .spark-now {
          transform-origin: center;
          fill: var(--rail-text, ${GOLD});
          stroke: ${BROWN};
          stroke-width: 1.5;
          animation: sparkPulse 1.6s ease-in-out infinite;
        }
        .spark-axis {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: ${BROWN};
          opacity: 0.6;
          font-variant-numeric: tabular-nums;
        }

        /* ── Undo Toast (iter-22) ─────────────────────────────── */
        @keyframes undoEnter {
          0%   { transform: translateY(12px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes undoCountdown {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }
        .undo-toast {
          position: fixed;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 92;
          display: flex;
          align-items: center;
          gap: 10px;
          background:
            linear-gradient(180deg, var(--cab-from, #4a2a1a) 0%, var(--cab-to, #2a160c) 100%);
          border: 1.5px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 999px;
          padding: 7px 8px 7px 14px;
          color: ${CREAM};
          font-size: 12px;
          font-weight: 700;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 12px 28px -8px rgba(0,0,0,0.55);
          animation: undoEnter 320ms cubic-bezier(.34,1.56,.64,1) both;
          cursor: pointer;
          max-width: calc(100% - 24px);
        }
        .undo-toast:hover { filter: brightness(1.1); }
        .undo-toast .undo-label {
          opacity: 0.9;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }
        .undo-toast .undo-cta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: 900;
          letter-spacing: 0.16em;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--rail-text, ${GOLD});
        }
        .undo-toast .undo-ring {
          position: relative;
          width: 28px; height: 28px;
          flex-shrink: 0;
        }
        .undo-toast .undo-ring svg .undo-ring-track {
          fill: none;
          stroke: rgba(247, 230, 194, 0.18);
          stroke-width: 2.5;
        }
        .undo-toast .undo-ring svg .undo-ring-fill {
          fill: none;
          stroke: var(--rail-text, ${GOLD});
          stroke-width: 2.5;
          stroke-linecap: round;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
          animation: undoCountdown 5000ms linear forwards;
        }
        .undo-toast .undo-dismiss {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          color: ${CREAM};
          font-size: 12px;
          font-weight: 900;
          display: inline-flex; align-items: center; justify-content: center;
          border: none;
          cursor: pointer;
          opacity: 0.6;
        }
        .undo-toast .undo-dismiss:hover { opacity: 1; background: rgba(255,255,255,0.16); }

        /* ── Upcoming renewals strip (iter-23) ────────────────── */
        @keyframes upDayEnter {
          0%   { transform: translateY(4px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .up-strip {
          background: linear-gradient(180deg,#fff5dd 0%,#fae9c0 100%);
          border: 1px solid rgba(45,16,15,0.18);
          border-radius: 12px;
          padding: 10px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          margin-top: 24px;
        }
        .up-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0,1fr));
          gap: 4px;
        }
        @media (min-width: 1024px) {
          .up-grid { grid-template-columns: repeat(14, minmax(0,1fr)); }
        }
        .up-day {
          position: relative;
          padding: 8px 4px;
          border-radius: 8px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(45,16,15,0.15);
          color: ${BROWN};
          cursor: pointer;
          text-align: center;
          animation: upDayEnter 320ms cubic-bezier(.34,1.56,.64,1) both;
          transition: transform 100ms ease, filter 100ms ease;
        }
        .up-day:hover { transform: translateY(-1px); filter: brightness(1.04); }
        .up-day.today { background: rgba(255,217,124,0.55); border-color: ${GOLD_DARK}; box-shadow: 0 0 0 1px ${GOLD_DARK}; }
        .up-day.past  { background: rgba(245, 211, 208, 0.7); border-color: #b8606a; color: #6a0010; }
        .up-day.empty { opacity: 0.55; }
        .up-day.expanded {
          background: ${BROWN}; color: ${CREAM}; border-color: ${BROWN};
        }
        /* Heatmap tints — applied via inline style based on count */
        .up-day-weekday {
          font-size: 9px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; opacity: 0.65;
        }
        .up-day-num {
          font-size: 16px; font-weight: 900; line-height: 1; letter-spacing: -0.02em;
          font-family: "Baloo 2", system-ui, sans-serif;
        }
        .up-day-count {
          margin-top: 4px;
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 20px;
          padding: 0 5px;
          border-radius: 999px;
          background: ${BLUE};
          color: ${CREAM};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0;
        }
        .up-day.past .up-day-count { background: #a40010; }
        .up-day.expanded .up-day-count { background: ${GOLD}; color: ${BROWN}; }

        .up-popover {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          min-width: 220px;
          max-width: 280px;
          background: linear-gradient(180deg, #fdf7e6 0%, #ebd4a8 100%);
          border: 1.5px solid ${GOLD_DARK};
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.4);
          color: ${BROWN};
        }
        .up-popover::after {
          content: "";
          position: absolute;
          left: 50%; top: -7px;
          transform: translateX(-50%);
          width: 12px; height: 12px;
          background: linear-gradient(135deg, #fdf7e6, transparent 50%);
          border-top: 1.5px solid ${GOLD_DARK};
          border-left: 1.5px solid ${GOLD_DARK};
          rotate: 45deg;
        }
        .up-customer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 100ms ease;
        }
        .up-customer:hover { background: rgba(45,16,15,0.08); }

        /* ── Calculator Overlay (iter-24) ─────────────────────── */
        @keyframes calcSlide {
          0%   { transform: translateX(100%); opacity: 0.4; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .calc-overlay {
          position: fixed; inset: 0;
          z-index: 96;
          background: radial-gradient(ellipse at center, rgba(45,16,15,0.55), rgba(15,5,4,0.85) 80%);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .calc-panel {
          position: fixed;
          top: 16px;
          right: 16px;
          bottom: 16px;
          width: min(320px, calc(100% - 32px));
          background:
            linear-gradient(180deg, var(--cab-from, #4a2a1a) 0%, var(--cab-mid, #3a1f12) 35%, var(--cab-to, #2a160c) 100%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${CREAM};
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: calcSlide 280ms cubic-bezier(.34,1.56,.64,1) both;
        }
        .calc-display {
          background: linear-gradient(180deg, var(--lcd-bg-from, #0a160e) 0%, var(--lcd-bg-mid, #0e1a14) 50%, var(--lcd-bg-to, #0a1410) 100%);
          color: var(--lcd-glow, ${LCD_GLOW});
          font-family: "Courier New", ui-monospace, monospace;
          letter-spacing: 0.04em;
          text-shadow:
            0 0 4px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 45%, transparent),
            0 0 12px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 25%, transparent);
          border: 2px solid #061008;
          border-radius: 10px;
          box-shadow:
            inset 0 0 24px color-mix(in srgb, var(--lcd-glow, ${LCD_GLOW}) 18%, transparent),
            inset 0 0 80px rgba(0, 0, 0, 0.6);
          padding: 12px 14px;
          min-height: 78px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
          overflow: hidden;
        }
        .calc-display .calc-history {
          font-size: 11px; opacity: 0.65;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
          word-break: break-all;
        }
        .calc-display .calc-current {
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
          word-break: break-all;
          font-variant-numeric: tabular-nums;
        }
        .calc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
        }
        .calc-key {
          padding: 12px 0;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.01em;
          cursor: pointer;
          background:
            linear-gradient(180deg, var(--keycap-from, ${CREAM}) 0%, var(--keycap-mid, #ebd4a8) 60%, var(--keycap-to, #d4ba88) 100%);
          color: ${BROWN};
          border: 1.5px solid var(--keycap-border, #6b4a26);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -2px 0 rgba(0,0,0,0.18),
            0 3px 0 var(--keycap-shadow, #5a3d20),
            0 5px 8px -3px rgba(0,0,0,0.4);
          transition: transform 80ms ease, box-shadow 80ms ease, filter 120ms ease;
          font-variant-numeric: tabular-nums;
        }
        .calc-key:hover { filter: brightness(1.06); }
        .calc-key:active {
          transform: translateY(2px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 var(--keycap-shadow, #5a3d20), 0 2px 4px rgba(0,0,0,0.3);
        }
        .calc-key.op {
          background: linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          border-color: #5a4318; color: ${BROWN};
        }
        .calc-key.eq {
          background: linear-gradient(180deg, #f24739 0%, ${RED} 60%, #a40010 100%);
          border-color: #780009; color: ${CREAM};
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 0 #780009, 0 5px 8px -3px rgba(0,0,0,0.4);
        }
        .calc-key.mem {
          background: linear-gradient(180deg, #4a2d22 0%, #2a160c 100%);
          color: ${CREAM};
          border-color: #18090b;
          font-size: 13px;
        }
        .calc-key.clr {
          background: linear-gradient(180deg, #a30010 0%, #6c0010 100%);
          color: ${CREAM};
          border-color: #4c0008;
        }
        .calc-key.act {
          background: linear-gradient(180deg, #4793a6 0%, ${BLUE} 60%, #245765 100%);
          color: ${CREAM};
          border-color: #1a3e48;
          font-size: 11px;
          letter-spacing: 0.06em;
        }
        .calc-mem-tag {
          position: absolute;
          top: 14px; right: 14px;
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.18em;
          color: var(--rail-text, ${GOLD});
          background: rgba(0,0,0,0.4);
          padding: 2px 6px;
          border-radius: 3px;
          opacity: 0.75;
        }

        /* ── Service bell (iter-25) ─────────────────────────────── */
        @keyframes bellSwingKf {
          0%   { transform: rotate(0deg); }
          15%  { transform: rotate(-22deg); }
          30%  { transform: rotate(18deg); }
          45%  { transform: rotate(-14deg); }
          60%  { transform: rotate(10deg); }
          75%  { transform: rotate(-6deg); }
          90%  { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes bellSparkle {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          25%      { opacity: 1; transform: scale(1.2); }
        }
        .bell-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: -16px; /* nestles into the brass top-rail */
          z-index: 10;
        }
        .bell-mount {
          position: relative;
          padding: 4px 14px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        .bell-svg-wrap {
          transform-origin: 50% 6px;
          transition: filter 120ms ease;
        }
        .bell-svg-wrap.swinging {
          animation: bellSwingKf 720ms cubic-bezier(.36,1.6,.5,.9);
        }
        .bell-mount:hover .bell-svg-wrap { filter: brightness(1.08) drop-shadow(0 2px 6px rgba(0,0,0,0.5)); }
        .bell-mount:active .bell-svg-wrap { filter: brightness(0.95); }
        .bell-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: ${RED};
          color: ${CREAM};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          padding: 1px 6px;
          border-radius: 999px;
          border: 1.5px solid ${CREAM};
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          min-width: 18px;
          text-align: center;
        }
        .bell-sparkle {
          position: absolute;
          font-size: 14px;
          color: ${GOLD};
          pointer-events: none;
        }
        .bell-sparkle.s1 { top: 0;   left: -10px; animation: bellSparkle 600ms ease 60ms; }
        .bell-sparkle.s2 { top: 4px; right: -6px; animation: bellSparkle 600ms ease 0ms; }
        .bell-sparkle.s3 { top: -8px;left: 50%;   transform: translateX(-50%); animation: bellSparkle 600ms ease 120ms; }

        /* ── Signature Pad (iter-26) ──────────────────────────── */
        @keyframes sigEnter {
          0%   { opacity: 0; transform: scale(0.96) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sig-overlay {
          position: fixed; inset: 0;
          z-index: 101;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: clamp(12px, 2vw, 28px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sig-card {
          max-width: 720px;
          width: 100%;
          background:
            linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 2px solid var(--cab-trim, ${GOLD_DARK});
          border-radius: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 30px 60px -20px rgba(0,0,0,0.7);
          color: ${BROWN};
          padding: 18px;
          animation: sigEnter 320ms cubic-bezier(.34,1.56,.64,1);
        }
        .sig-canvas-wrap {
          position: relative;
          background: white;
          border: 1.5px solid #b69256;
          border-radius: 8px;
          margin: 12px 0;
          overflow: hidden;
          touch-action: none;
        }
        .sig-canvas {
          display: block;
          width: 100%;
          height: 220px;
          cursor: crosshair;
        }
        .sig-line {
          position: absolute;
          left: 18px; right: 18px; bottom: 36px;
          height: 1px;
          background: rgba(45,16,15,0.4);
          pointer-events: none;
        }
        .sig-x {
          position: absolute;
          left: 18px; bottom: 22px;
          font-size: 14px;
          font-weight: 900;
          color: rgba(45,16,15,0.4);
          pointer-events: none;
        }
        .sig-watermark {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: rgba(45,16,15,0.18);
          text-transform: uppercase;
          pointer-events: none;
        }
        .sig-empty .sig-watermark { display: block; }
        .sig-canvas-wrap:not(.sig-empty) .sig-watermark { display: none; }

        /* ── Cart-add Flight (iter-27) ────────────────────────── */
        @keyframes flyArc {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(calc(var(--dx, 0px) * 0.5), calc(var(--dy, 0px) * 0.5 - 80px)) scale(0.85);
            opacity: 1;
          }
          80% {
            opacity: 0.95;
          }
          100% {
            transform: translate(var(--dx, 0px), var(--dy, 0px)) scale(0.4);
            opacity: 0;
          }
        }
        .flight-token {
          position: fixed;
          z-index: 88;
          padding: 4px 10px;
          border-radius: 999px;
          color: ${CREAM};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 10px -3px rgba(0,0,0,0.45);
          animation: flyArc 700ms cubic-bezier(.5,0,.4,1) forwards;
          will-change: transform, opacity;
          transform: translate(0, 0);
          translate: -50% -50%;
        }

        /* ── Tip Jar (iter-28) ────────────────────────────────── */
        @keyframes coinDrop {
          0%   { transform: translate(0, -32px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { transform: translate(0, var(--coin-end-y, 22px)); opacity: 1; }
          92%  { transform: translate(0, calc(var(--coin-end-y, 22px) - 4px)); }
          100% { transform: translate(0, var(--coin-end-y, 22px)); opacity: 1; }
        }
        @keyframes jarShake {
          0%, 100% { transform: translateY(0); }
          30%      { transform: translateY(2px); }
          60%      { transform: translateY(-1px); }
        }
        .tip-jar-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          cursor: pointer;
          user-select: none;
        }
        .tip-jar {
          position: relative;
          width: 38px;
          height: 50px;
          /* Glass body */
          background:
            linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.18) 82%, rgba(255,255,255,0.55) 100%);
          border: 1.5px solid rgba(45,16,15,0.4);
          border-top-width: 0;
          border-radius: 0 0 6px 6px;
          box-shadow:
            inset 0 -2px 4px rgba(45,16,15,0.18),
            0 2px 4px rgba(0,0,0,0.18);
          overflow: hidden;
        }
        .tip-jar.dropping { animation: jarShake 220ms ease-out; }
        .tip-jar-rim {
          width: 44px;
          height: 6px;
          background: linear-gradient(180deg, #d8c89a 0%, #8c6e27 100%);
          border: 1.5px solid rgba(45,16,15,0.4);
          border-radius: 3px 3px 1px 1px;
          margin-bottom: -1px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
          position: relative;
          z-index: 2;
        }
        .tip-jar-rim::after {
          content: "TIPS";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: ${BROWN};
          font-size: 4.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }
        .tip-jar-fill {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          background:
            linear-gradient(180deg, rgba(212,167,58,0.65) 0%, rgba(140,110,40,0.85) 100%);
          transition: height 480ms cubic-bezier(.34,1.56,.64,1);
        }
        .tip-jar-stack {
          position: absolute;
          left: 4px; right: 4px; bottom: 2px;
          display: flex;
          flex-direction: column-reverse;
          gap: 1px;
          align-items: stretch;
        }
        .tip-jar-bill {
          height: 3px;
          border-radius: 1px;
          background: linear-gradient(180deg, #c2cda9 0%, #94a883 100%);
          border: 0.5px solid #3f5230;
          box-shadow: 0 0.5px 0 rgba(0,0,0,0.3);
        }
        .tip-jar-bill.b50  { background: linear-gradient(180deg, #d6c5a3 0%, #a89378 100%); }
        .tip-jar-bill.b100 { background: linear-gradient(180deg, #b3c5a3 0%, #88a07a 100%); }
        .tip-jar-coin {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: 8px; height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #fff3c0 0%, #d4a73a 35%, #8a6e1a 100%);
          box-shadow: 0 0 3px rgba(212,167,58,0.55);
          animation: coinDrop 720ms cubic-bezier(.5,0,.4,1) forwards;
          pointer-events: none;
        }
        .tip-jar-label {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: ${BROWN};
          opacity: 0.7;
          text-transform: uppercase;
        }
        .tip-jar-amount {
          font-size: 11px;
          font-weight: 900;
          color: ${BROWN};
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        /* ── Cashier Badge (iter-29) ──────────────────────────── */
        .cashier-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px 3px 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(45,16,15,0.3);
          color: ${BROWN};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: filter 120ms ease;
        }
        .cashier-badge:hover { filter: brightness(1.04); }
        .cashier-badge.empty {
          background: transparent;
          border-style: dashed;
          opacity: 0.65;
        }
        .cashier-badge-avatar {
          width: 22px; height: 22px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: ${CREAM};
          font-size: 11px;
          font-weight: 900;
          font-family: "Baloo 2", system-ui, sans-serif;
          letter-spacing: -0.02em;
          box-shadow:
            inset 0 -2px 4px rgba(0,0,0,0.25),
            inset 0 1px 2px rgba(255,255,255,0.35),
            0 1px 2px rgba(0,0,0,0.3);
          position: relative;
        }
        .cashier-badge-avatar.empty {
          background: rgba(45,16,15,0.18);
          color: rgba(45,16,15,0.5);
        }

        .cashier-popover {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 240px;
          background: linear-gradient(180deg, ${CREAM} 0%, #ebd4a8 100%);
          border: 1.5px solid ${GOLD_DARK};
          border-radius: 10px;
          padding: 10px;
          z-index: 30;
          box-shadow: 0 10px 24px rgba(0,0,0,0.4);
          animation: presenceSlide 220ms cubic-bezier(.34,1.56,.64,1);
        }
        .cashier-swatch-row {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .cashier-swatch {
          width: 24px; height: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.35);
          transition: transform 100ms ease, border-color 120ms ease;
        }
        .cashier-swatch:hover { transform: scale(1.08); }
        .cashier-swatch.active {
          border-color: ${BROWN};
          transform: scale(1.12);
        }

        /* ── Top Items Leaderboard (iter-31) ──────────────────── */
        @keyframes podiumGrow {
          0%   { transform: scaleY(0.4) translateY(20px); opacity: 0; }
          100% { transform: scaleY(1) translateY(0); opacity: 1; }
        }
        .top-strip {
          margin-bottom: 16px;
          padding: 10px 12px;
          background: linear-gradient(180deg, #fff5dd 0%, #fae9c0 100%);
          border: 1px solid rgba(45,16,15,0.18);
          border-radius: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .top-strip-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .top-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 6px;
        }
        @media (min-width: 640px) {
          .top-grid { grid-template-columns: repeat(5, minmax(0,1fr)); }
        }
        .top-pill {
          position: relative;
          padding: 8px 8px 6px 28px;
          border-radius: 8px;
          color: ${BROWN};
          background:
            linear-gradient(180deg, var(--podium-from, #fdf7e6) 0%, var(--podium-to, #ebd4a8) 100%);
          border: 1.5px solid var(--podium-border, #6b4a26);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.65),
            0 3px 0 var(--podium-shadow, #5a3d20),
            0 5px 8px -3px rgba(0,0,0,0.35);
          transform-origin: bottom center;
          animation: podiumGrow 460ms cubic-bezier(.34,1.56,.64,1) both;
          overflow: hidden;
        }
        .top-pill .top-rank {
          position: absolute;
          left: 6px; top: 6px;
          width: 18px; height: 18px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 900;
          line-height: 18px;
          text-align: center;
          color: ${BROWN};
          background: rgba(255,255,255,0.7);
          border: 1.5px solid var(--podium-border, #6b4a26);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        /* Gold (1st), Silver (2nd), Bronze (3rd), Brown (4th-5th) */
        .top-pill.r1 {
          --podium-from: #fff3c0; --podium-to: ${GOLD}; --podium-border: ${GOLD_DARK}; --podium-shadow: ${GOLD_DARK};
        }
        .top-pill.r1 .top-rank { background: linear-gradient(180deg, #fff3c0, ${GOLD}); color: ${BROWN}; }
        .top-pill.r2 {
          --podium-from: #ffffff; --podium-to: #c0c5cc; --podium-border: #5a6068; --podium-shadow: #5a6068;
        }
        .top-pill.r2 .top-rank { background: linear-gradient(180deg, #ffffff, #c0c5cc); color: #1a1d22; }
        .top-pill.r3 {
          --podium-from: #ffd9a8; --podium-to: #b66e2c; --podium-border: #5a3210; --podium-shadow: #5a3210;
          color: #2a1808;
        }
        .top-pill.r3 .top-rank { background: linear-gradient(180deg, #ffd9a8, #b66e2c); color: #2a1808; }
        .top-pill.r4, .top-pill.r5 {
          --podium-from: #fdf7e6; --podium-to: #d8c89a; --podium-border: #8c6e27; --podium-shadow: #8c6e27;
        }
        .top-pill-name {
          font-size: 11px;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin-bottom: 2px;
          /* Two-line clamp — long item names stay tidy */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .top-pill-meta {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 10px;
          font-weight: 700;
          opacity: 0.75;
          font-variant-numeric: tabular-nums;
        }
        .top-pill-amount {
          font-size: 12px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }
        .top-empty {
          padding: 16px;
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: ${BROWN};
          opacity: 0.55;
        }

        /* ── Tiered CHARGE pulse (iter-32) ────────────────────── */
        @keyframes chargeWarm {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #780009, 0 6px 10px -3px rgba(0,0,0,0.4), 0 0 0 0 rgba(255,215,124,0); }
          50%      { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #780009, 0 6px 10px -3px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,215,124,0.55); }
        }
        @keyframes chargeBig {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #780009, 0 6px 18px rgba(255,215,124,0.55), 0 0 0 0 rgba(255,215,124,0); }
          50%      { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 0 #780009, 0 6px 24px rgba(255,215,124,0.85), 0 0 0 6px rgba(255,215,124,0.3); }
        }
        @keyframes chargeJackpotShine {
          0%   { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        .charge-tier.tier-warm {
          animation: chargeWarm 2.4s ease-in-out infinite;
        }
        .charge-tier.tier-big {
          animation: chargeBig 1.8s ease-in-out infinite;
        }
        .charge-tier.tier-jackpot {
          background:
            linear-gradient(120deg, #f24739 0%, ${RED} 25%, #fff3c0 50%, ${RED} 75%, #a40010 100%) !important;
          background-size: 280% 100% !important;
          animation: chargeJackpotShine 2.4s linear infinite, chargeBig 1.4s ease-in-out infinite;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            inset 0 -2px 0 rgba(0,0,0,0.3),
            0 3px 0 #780009,
            0 8px 28px rgba(255,215,124,0.85),
            0 0 0 4px rgba(255,215,124,0.4) !important;
        }

        /* ── Coupon message chip (iter-33) ────────────────────── */
        @keyframes couponShake {
          0%, 100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(5px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(3px); }
          80%      { transform: translateX(-1px); }
        }
        @keyframes couponPop {
          0%   { transform: scale(0.92) translateY(4px); opacity: 0; }
          50%  { transform: scale(1.04) translateY(0);   opacity: 1; }
          100% { transform: scale(1) translateY(0);      opacity: 1; }
        }
        .coupon-msg {
          margin-top: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          display: inline-block;
        }
        .coupon-msg.ok {
          background: #d3f0d3;
          color: #1a4a1a;
          border: 1px solid #2a8a2a;
          animation: couponPop 360ms cubic-bezier(.34,1.56,.64,1);
        }
        .coupon-msg.err {
          background: #f5d3d0;
          color: #8a1010;
          border: 1px solid #b8606a;
          animation: couponShake 380ms ease-out;
        }

        /* ── Streak Chip (iter-34) ────────────────────────────── */
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(-1deg); filter: brightness(1); }
          25%      { transform: scale(1.06) rotate(2deg); filter: brightness(1.1); }
          50%      { transform: scale(0.96) rotate(-2deg); filter: brightness(0.95); }
          75%      { transform: scale(1.04) rotate(1.5deg); filter: brightness(1.08); }
        }
        @keyframes streakLegendaryGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,138,58,0); }
          50%      { box-shadow: 0 0 12px 2px rgba(255,138,58,0.45); }
        }
        .streak-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff8e6 0%, #ebd4a8 100%);
          border: 1px solid var(--streak-border, #6b4a26);
          color: ${BROWN};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1;
          cursor: default;
        }
        .streak-chip.tier-spark {
          --streak-border: ${GOLD_DARK};
        }
        .streak-chip.tier-warm {
          --streak-border: #b8794a;
          background: linear-gradient(180deg, #fff5dd 0%, #f0c878 100%);
        }
        .streak-chip.tier-blazing {
          --streak-border: #c01818;
          background: linear-gradient(180deg, #ffd9a0 0%, #ff8a3a 100%);
          color: #4a0008;
        }
        .streak-chip.tier-legendary {
          --streak-border: #780009;
          background: linear-gradient(180deg, #ff8a3a 0%, #c01818 100%);
          color: ${CREAM};
          animation: streakLegendaryGlow 1.6s ease-in-out infinite;
        }
        .streak-chip .flame {
          width: var(--flame-size, 14px);
          height: var(--flame-size, 14px);
          animation: flameFlicker 1.6s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        .streak-chip .streak-count {
          font-variant-numeric: tabular-nums;
        }

        /* ── Gift Card Modal (iter-35) ────────────────────────── */
        @keyframes giftCardEnter {
          0%   { opacity: 0; transform: scale(0.92) rotate(-2deg); }
          60%  { opacity: 1; transform: scale(1.04) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes giftShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .gift-overlay {
          position: fixed; inset: 0;
          z-index: 100;
          background: radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: clamp(12px, 2vw, 28px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gift-card {
          width: 100%;
          max-width: 540px;
          padding: 22px;
          border-radius: 18px;
          background:
            linear-gradient(120deg, #2b3e7d 0%, ${BLUE} 25%, #4793a6 50%, ${BLUE} 75%, #2b3e7d 100%),
            radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18), transparent 60%);
          background-size: 220% 100%;
          animation: giftShimmer 6s linear infinite;
          color: ${CREAM};
          border: 2px solid ${GOLD};
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.3),
            0 30px 60px -20px rgba(0,0,0,0.7);
        }
        .gift-card-shell {
          animation: giftCardEnter 480ms cubic-bezier(.34,1.56,.64,1);
        }
        .gift-band {
          position: relative;
          padding: 14px 16px;
          margin: 12px 0;
          border-radius: 10px;
          background: rgba(0,0,0,0.32);
          border: 1px dashed rgba(247,230,194,0.4);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .gift-amount-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .gift-amount-pill {
          padding: 12px 0;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.01em;
          background: rgba(255,255,255,0.1);
          border: 1.5px solid rgba(247,230,194,0.4);
          color: ${CREAM};
          cursor: pointer;
          transition: transform 100ms ease, background 100ms ease, filter 120ms ease;
        }
        .gift-amount-pill:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .gift-amount-pill.active {
          background: linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          color: ${BROWN};
          border-color: ${GOLD};
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
        }

        /* ── Cabinet Decals (iter-36) ─────────────────────────── */
        @keyframes decalPeelOnce {
          0%   { transform: rotate(var(--r, 0deg)) translateY(0); }
          50%  { transform: rotate(var(--r, 0deg)) translateY(-2px) skewX(-2deg); }
          100% { transform: rotate(var(--r, 0deg)) translateY(0); }
        }
        .decal {
          position: absolute;
          z-index: 6;
          padding: 4px 9px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          line-height: 1.05;
          color: var(--decal-ink, ${CREAM});
          background: var(--decal-bg, rgba(247,230,194,0.18));
          border: 1px solid var(--decal-border, rgba(247,230,194,0.3));
          transform: rotate(var(--r, 0deg));
          transform-origin: center center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
          pointer-events: auto;
          cursor: default;
          transition: transform 200ms ease, filter 160ms ease;
          user-select: none;
          opacity: 0.9;
        }
        .decal:hover {
          filter: brightness(1.12);
          animation: decalPeelOnce 320ms ease-out;
        }
        .decal-est {
          --decal-bg: linear-gradient(180deg, #fdf7e6 0%, #ebd4a8 100%);
          --decal-ink: ${BROWN};
          --decal-border: ${GOLD_DARK};
          --r: -7deg;
          top: 40px; left: -8px;
        }
        .decal-family {
          --decal-bg: linear-gradient(180deg, #c92a4d 0%, #8a1010 100%);
          --decal-ink: ${CREAM};
          --decal-border: #780009;
          --r: 5deg;
          top: 38px; right: -6px;
        }
        .decal-member {
          --decal-bg: linear-gradient(180deg, #2b3e7d 0%, ${BLUE} 100%);
          --decal-ink: ${CREAM};
          --decal-border: #1a3e48;
          --r: 4deg;
          bottom: 12px; left: 4px;
        }
        .decal-hours {
          --decal-bg: linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%);
          --decal-ink: ${BROWN};
          --decal-border: #5a4318;
          --r: -3deg;
          bottom: 14px; right: 4px;
        }
        .decal-star {
          --decal-bg: linear-gradient(180deg, #3d4a1c 0%, #1f2a0a 100%);
          --decal-ink: #d8e6a0;
          --decal-border: #1f2a0a;
          --r: 8deg;
          top: 50%;
          right: -10px;
          transform: translateY(-50%) rotate(8deg);
        }
        .decal-star:hover {
          transform: translateY(-50%) rotate(8deg);
          animation: decalPeelOnce 320ms ease-out;
        }
        @media (max-width: 640px) {
          .decal { display: none; } /* declutter on phones */
        }

        /* ── Brass Pressure Gauges (iter-37) ───────────────────────────── */
        .gauge-cluster {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: center;
          padding: 10px 16px;
          margin: 0 auto 14px;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.28) 100%);
          border: 1px solid rgba(0,0,0,0.5);
          border-radius: 14px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 4px 10px rgba(0,0,0,0.35);
          position: relative;
        }
        .gauge-cluster::before {
          content: "";
          position: absolute;
          left: 14px; top: 50%; transform: translateY(-50%);
          width: 6px; height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b, #8c6e27 70%);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .gauge-cluster::after {
          content: "";
          position: absolute;
          right: 14px; top: 50%; transform: translateY(-50%);
          width: 6px; height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b, #8c6e27 70%);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .gauge-glass {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, #1a0e07 0%, #0a0503 80%);
          box-shadow:
            0 0 0 2px #c9a24a,
            0 0 0 3px #5a4318,
            0 0 0 5px #8c6e27,
            inset 0 2px 4px rgba(0,0,0,0.6),
            inset 0 -1px 2px rgba(255,255,255,0.06);
        }
        .gauge-svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .gauge-face {
          fill: #f5e7c2;
          stroke: #5a4318;
          stroke-width: 0.4;
        }
        .gauge-tick-major {
          stroke: #2D100F;
          stroke-width: 1.4;
          stroke-linecap: round;
        }
        .gauge-tick-minor {
          stroke: #2D100F;
          stroke-width: 0.7;
          stroke-linecap: round;
          opacity: 0.65;
        }
        .gauge-arc {
          fill: none;
          stroke: #c9a24a;
          stroke-width: 2.2;
          stroke-linecap: round;
          opacity: 0.85;
        }
        .gauge-arc-redzone {
          fill: none;
          stroke: #a31920;
          stroke-width: 2.2;
          stroke-linecap: round;
          opacity: 0.9;
        }
        .gauge-needle-group {
          transition: transform 720ms cubic-bezier(.34, 1.56, .64, 1);
          transform-origin: 50px 50px;
          filter: drop-shadow(0 0.6px 0.6px rgba(0,0,0,0.55));
        }
        .gauge-needle-group polygon {
          fill: #a31920;
          stroke: #4a0c10;
          stroke-width: 0.3;
        }
        .gauge-hub {
          fill: #c9a24a;
          stroke: #5a4318;
          stroke-width: 0.5;
        }
        .gauge-hub-inner {
          fill: #5a4318;
        }
        .gauge-unit-label {
          font-size: 7px;
          font-weight: 900;
          fill: #2D100F;
          letter-spacing: 0.18em;
          font-family: "Courier New", monospace;
        }
        .gauge-glass::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(ellipse 60% 32% at 32% 22%, rgba(255,255,255,0.22), transparent 70%),
            radial-gradient(ellipse 30% 16% at 70% 78%, rgba(255,255,255,0.06), transparent 70%);
          pointer-events: none;
        }
        .gauge-readout {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .gauge-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: var(--rail-text, #c9a24a);
          text-transform: uppercase;
          font-family: "Courier New", monospace;
        }
        .gauge-value {
          font-size: 11px;
          font-weight: 900;
          font-family: "Courier New", monospace;
          color: var(--rail-text, #c9a24a);
          letter-spacing: 0.04em;
          text-shadow: 0 0 4px color-mix(in srgb, var(--rail-text, #c9a24a) 35%, transparent);
        }
        @media (max-width: 640px) {
          .gauge-cluster { gap: 10px; padding: 8px 12px; }
          .gauge-glass { width: 72px; height: 72px; }
        }

        /* ── Vacuum Tube Indicators (iter-38) ──────────────────────────── */
        .vacuum-rail {
          display: flex;
          gap: 14px;
          justify-content: center;
          align-items: end;
          padding: 6px 16px 4px;
          margin: 0 auto 10px;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.30) 100%);
          border: 1px solid rgba(0,0,0,0.5);
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
          border-bottom: none;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            inset 0 -2px 4px rgba(0,0,0,0.5);
          position: relative;
        }
        .vacuum-rail::before,
        .vacuum-rail::after {
          content: "";
          position: absolute;
          bottom: 4px;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b, #8c6e27 70%);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.4);
        }
        .vacuum-rail::before { left: 8px; }
        .vacuum-rail::after { right: 8px; }
        .vacuum-tube {
          position: relative;
          width: 28px;
          height: 78px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .vacuum-tube-glass {
          width: 26px;
          height: 64px;
          border-top-left-radius: 13px;
          border-top-right-radius: 13px;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
          background:
            radial-gradient(ellipse 80% 40% at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%),
            linear-gradient(180deg, rgba(180, 220, 240, 0.15) 0%, rgba(140, 180, 200, 0.08) 100%);
          border: 1px solid rgba(160, 200, 220, 0.3);
          box-shadow:
            inset 0 0 6px rgba(255, 200, 100, var(--tube-glow, 0.18)),
            inset 0 -2px 6px rgba(0, 0, 0, 0.4),
            0 0 6px rgba(255, 180, 90, var(--tube-glow, 0.12));
          position: relative;
          overflow: hidden;
          transition: box-shadow 220ms ease-out;
        }
        .vacuum-tube-filament {
          position: absolute;
          left: 50%;
          top: 18%;
          transform: translateX(-50%);
          width: 14px;
          height: 36px;
          background: linear-gradient(180deg,
            rgba(255, 180, 60, var(--tube-glow, 0.55)) 0%,
            rgba(255, 120, 30, var(--tube-glow, 0.65)) 45%,
            rgba(255, 80, 10, var(--tube-glow, 0.45)) 100%);
          filter: blur(2px);
          opacity: var(--tube-glow, 0.45);
          transition: opacity 220ms ease-out, filter 220ms ease-out;
        }
        .vacuum-tube-grid {
          position: absolute;
          left: 14%;
          right: 14%;
          top: 22%;
          bottom: 18%;
          background-image:
            repeating-linear-gradient(0deg, rgba(80, 60, 40, 0.45) 0px, rgba(80, 60, 40, 0.45) 0.5px, transparent 0.5px, transparent 4px);
          opacity: 0.55;
          pointer-events: none;
        }
        .vacuum-tube-cap {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: radial-gradient(circle, #c9a24a 0%, #5a4318 60%, #2D100F 100%);
          margin-top: -2px;
        }
        .vacuum-tube-base {
          width: 20px;
          height: 12px;
          margin-top: 0;
          background:
            linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 2px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(0,0,0,0.4);
          position: relative;
        }
        .vacuum-tube-base::before,
        .vacuum-tube-base::after {
          content: "";
          position: absolute;
          bottom: -3px;
          width: 1.5px; height: 4px;
          background: linear-gradient(180deg, #5a4318, #2D100F);
          border-radius: 0 0 1px 1px;
        }
        .vacuum-tube-base::before { left: 4px; }
        .vacuum-tube-base::after { right: 4px; }
        .vacuum-tube-label {
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.15em;
          font-family: "Courier New", monospace;
          color: var(--rail-text, #c9a24a);
          margin-top: 2px;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .vacuum-tube.is-active .vacuum-tube-glass {
          box-shadow:
            inset 0 0 12px rgba(255, 180, 60, 0.85),
            inset 0 -2px 6px rgba(0, 0, 0, 0.4),
            0 0 16px rgba(255, 160, 50, 0.65),
            0 0 28px rgba(255, 120, 40, 0.4);
        }
        .vacuum-tube.is-active .vacuum-tube-filament {
          opacity: 1;
          filter: blur(1px);
        }
        @keyframes vacuumTubeIdle {
          0%   { --tube-glow: 0.30; }
          50%  { --tube-glow: 0.50; }
          100% { --tube-glow: 0.30; }
        }
        @property --tube-glow {
          syntax: "<number>";
          inherits: true;
          initial-value: 0.30;
        }
        .vacuum-tube {
          animation: vacuumTubeIdle 4s ease-in-out infinite;
        }
        .vacuum-tube:nth-child(2) { animation-delay: 0.5s; }
        .vacuum-tube:nth-child(3) { animation-delay: 1s; }
        .vacuum-tube:nth-child(4) { animation-delay: 1.5s; }
        .vacuum-tube:nth-child(5) { animation-delay: 2s; }
        @keyframes vacuumTubeFlash {
          0%   { --tube-glow: 0.95; }
          100% { --tube-glow: 0.45; }
        }
        .vacuum-tube.is-flashing {
          animation: vacuumTubeFlash 700ms ease-out;
        }
        @media (max-width: 640px) {
          .vacuum-rail { gap: 10px; padding: 4px 10px 3px; }
          .vacuum-tube { width: 22px; height: 64px; }
          .vacuum-tube-glass { width: 20px; height: 50px; border-top-left-radius: 10px; border-top-right-radius: 10px; }
          .vacuum-tube-base { width: 16px; height: 9px; }
          .vacuum-tube-label { font-size: 5px; }
        }

        /* ── Mechanical Drum Counter / Odometer (iter-40) ──────────────── */
        .odo-band {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 10px 18px;
          margin: 0 auto 12px;
          background:
            linear-gradient(180deg, #2a1a0a 0%, #1a0e07 60%, #2a1a0a 100%);
          border: 1px solid rgba(0,0,0,0.55);
          border-radius: 10px;
          box-shadow:
            inset 0 1px 0 rgba(201, 162, 74, 0.18),
            inset 0 -2px 4px rgba(0,0,0,0.6),
            0 4px 8px rgba(0,0,0,0.35);
          position: relative;
        }
        .odo-band::before,
        .odo-band::after {
          content: "";
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 5px; height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b, #8c6e27 70%);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.4);
        }
        .odo-band::before { left: 8px; }
        .odo-band::after { right: 8px; }
        .odo-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.32em;
          color: #c9a24a;
          font-family: "Courier New", monospace;
          text-transform: uppercase;
        }
        .odo-row {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .odo-currency {
          font-size: 22px;
          font-weight: 900;
          color: #c9a24a;
          font-family: "Courier New", monospace;
          margin-right: 2px;
          text-shadow: 0 1px 0 rgba(0,0,0,0.6);
        }
        .odo-comma {
          width: 6px;
          height: 32px;
          color: #c9a24a;
          font-family: "Courier New", monospace;
          font-size: 22px;
          font-weight: 900;
          display: flex;
          align-items: flex-end;
          padding-bottom: 2px;
        }
        .odo-digit {
          width: 24px;
          height: 36px;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 50%, #20120a 0%, #0a0503 80%);
          border: 1px solid #5a4318;
          border-radius: 3px;
          box-shadow:
            inset 0 1px 2px rgba(0,0,0,0.85),
            inset 0 0 6px rgba(0,0,0,0.7),
            0 1px 0 rgba(255,255,255,0.05);
          position: relative;
        }
        .odo-digit::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg,
              rgba(0,0,0,0.78) 0%,
              rgba(0,0,0,0.0) 22%,
              rgba(0,0,0,0.0) 78%,
              rgba(0,0,0,0.78) 100%);
          z-index: 2;
          pointer-events: none;
          border-radius: inherit;
        }
        .odo-digit::after {
          /* Faint horizontal seam line through the middle, simulating the
             gap where the next digit emerges */
          content: "";
          position: absolute;
          left: 0; right: 0;
          top: 50%;
          height: 1px;
          background: rgba(0,0,0,0.6);
          z-index: 3;
          pointer-events: none;
        }
        .odo-strip {
          display: flex;
          flex-direction: column;
          transform: translateY(calc(var(--odo-pos, 0) * -36px));
          transition: transform 720ms cubic-bezier(.34, 1.56, .64, 1);
        }
        .odo-strip span {
          height: 36px;
          display: grid;
          place-items: center;
          font-family: "Courier New", monospace;
          font-size: 22px;
          font-weight: 900;
          color: #f5e7c2;
          text-shadow:
            0 1px 1px rgba(0,0,0,0.95),
            0 -1px 0 rgba(255, 230, 180, 0.18);
          letter-spacing: 0.02em;
          line-height: 36px;
        }
        @keyframes odoBezelKick {
          0%, 100% { transform: translateY(0); }
          40%      { transform: translateY(0.6px); }
          60%      { transform: translateY(-0.4px); }
        }
        .odo-digit.is-rolling {
          animation: odoBezelKick 720ms ease-out;
        }
        @media (max-width: 640px) {
          .odo-band { gap: 8px; padding: 8px 14px; }
          .odo-digit { width: 20px; height: 30px; }
          .odo-strip { transform: translateY(calc(var(--odo-pos, 0) * -30px)); }
          .odo-strip span { height: 30px; line-height: 30px; font-size: 18px; }
          .odo-currency { font-size: 18px; }
          .odo-comma { font-size: 18px; height: 26px; }
        }

        /* ── Striped Shopfront Awning (iter-41) ────────────────────────── */
        .awning {
          position: relative;
          height: 50px;
          margin: 0 -8px -10px;
          z-index: 6;
          pointer-events: none;
          animation: awningSway 8s ease-in-out infinite;
          transform-origin: 50% 0%;
          filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.4));
        }
        @keyframes awningSway {
          0%   { transform: rotate(-0.35deg); }
          50%  { transform: rotate(0.35deg); }
          100% { transform: rotate(-0.35deg); }
        }
        .awning-svg {
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }
        .awning-text {
          position: absolute;
          top: 7px;
          left: 50%;
          transform: translateX(-50%);
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          font-size: 17px;
          letter-spacing: 0.22em;
          color: #f5e7c2;
          text-shadow:
            0 1px 0 #5a0a14,
            0 2px 4px rgba(0, 0, 0, 0.5),
            0 0 1px rgba(245, 231, 194, 0.6);
          white-space: nowrap;
          z-index: 1;
          pointer-events: none;
        }
        .awning-cord {
          position: absolute;
          top: 6px;
          right: 18px;
          width: 1.4px;
          height: 92px;
          background: linear-gradient(180deg, #2D100F 0%, #5a4318 100%);
          z-index: 2;
          transform-origin: 50% 0%;
          animation: awningCordSway 8s ease-in-out infinite reverse;
          pointer-events: none;
        }
        @keyframes awningCordSway {
          0%   { transform: rotate(-0.6deg); }
          50%  { transform: rotate(0.6deg); }
          100% { transform: rotate(-0.6deg); }
        }
        .awning-cord-bell {
          position: absolute;
          bottom: -10px;
          left: -4.5px;
          width: 10px; height: 10px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, #ffd86b 0%, #c9a24a 45%, #8c6e27 80%);
          box-shadow:
            0 0 0 0.6px #5a4318,
            0 1px 2px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .awning-bracket-l,
        .awning-bracket-r {
          position: absolute;
          top: -4px;
          width: 18px; height: 12px;
          background: linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 2px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.3),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 1px 2px rgba(0,0,0,0.3);
          z-index: 3;
        }
        .awning-bracket-l { left: 12px; }
        .awning-bracket-r { right: 12px; }
        .awning-bracket-l::after,
        .awning-bracket-r::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #5a4318, #2D100F);
        }
        @media (max-width: 640px) {
          .awning { height: 42px; }
          .awning-text { font-size: 12px; letter-spacing: 0.16em; top: 6px; }
          .awning-cord { height: 76px; right: 14px; }
          .awning-bracket-l, .awning-bracket-r { width: 14px; height: 9px; }
          .awning-bracket-l { left: 8px; }
          .awning-bracket-r { right: 8px; }
        }

        /* ── Brass Service Counter Bell (iter-42) ──────────────────────── */
        .pos-tilt-stage { position: relative; }
        .service-bell-mount {
          position: absolute;
          top: 56px;
          right: 32px;
          width: 64px;
          height: 80px;
          z-index: 8;
          pointer-events: none;
        }
        .service-bell-bracket {
          position: absolute;
          top: -8px; left: 50%; transform: translateX(-50%);
          width: 26px; height: 14px;
          background: linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 3px 3px 1px 1px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 1px 2px rgba(0,0,0,0.4);
          z-index: 1;
        }
        .service-bell-bracket::before,
        .service-bell-bracket::after {
          content: "";
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 3px; height: 3px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #5a4318, #2D100F);
        }
        .service-bell-bracket::before { left: 4px; }
        .service-bell-bracket::after  { right: 4px; }
        .service-bell-block {
          position: absolute;
          bottom: 0; left: 50%; transform: translateX(-50%);
          width: 56px;
          height: 14px;
          background:
            linear-gradient(180deg, #6b4a26 0%, #4a2a1a 60%, #2D100F 100%),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 4px);
          background-blend-mode: multiply;
          border: 1px solid #2D100F;
          border-radius: 3px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 4px 6px rgba(0,0,0,0.45);
          z-index: 1;
        }
        .service-bell-button {
          position: absolute;
          inset: 0;
          background: transparent;
          border: 0;
          padding: 0;
          margin: 0;
          cursor: pointer;
          pointer-events: auto;
          z-index: 2;
        }
        .service-bell-button:focus-visible {
          outline: 2px solid #c9a24a;
          outline-offset: 2px;
          border-radius: 6px;
        }
        .service-bell-dome {
          position: absolute;
          bottom: 12px; left: 50%;
          transform: translateX(-50%) rotate(0deg);
          transform-origin: 50% 100%;
          display: block;
          width: 50px; height: 38px;
          background:
            radial-gradient(ellipse 60% 30% at 35% 18%, rgba(255, 255, 255, 0.65) 0%, transparent 55%),
            linear-gradient(135deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          border-radius: 50% 50% 26% 26% / 64% 64% 26% 26%;
          border: 1px solid #5a4318;
          box-shadow:
            inset 0 -3px 4px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.35),
            0 4px 6px rgba(0,0,0,0.4);
          z-index: 3;
        }
        .service-bell-shine {
          position: absolute;
          left: 18%;
          top: 14%;
          width: 14px;
          height: 6px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.8), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .service-bell-plunger {
          position: absolute;
          top: 6px; left: 50%;
          transform: translateX(-50%);
          width: 7px; height: 18px;
          background: linear-gradient(180deg, #e8eaed 0%, #a8aeb4 50%, #4a4f55 100%);
          border-radius: 2px 2px 1px 1px;
          z-index: 4;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 1px 2px rgba(0,0,0,0.4);
        }
        .service-bell-plunger-cap {
          position: absolute;
          top: -5px; left: 50%; transform: translateX(-50%);
          width: 16px; height: 9px;
          background:
            radial-gradient(ellipse at 30% 25%, #f4f6f8 0%, #c8ced2 40%, #6b7177 90%);
          border-radius: 50% 50% 26% 26%;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            0 1px 2px rgba(0,0,0,0.45);
        }
        .service-bell-glow {
          position: absolute;
          bottom: 14px; left: 50%;
          transform: translateX(-50%) scale(0);
          width: 80px; height: 80px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, rgba(255,216,107,0.45) 0%, rgba(255,216,107,0.08) 50%, transparent 75%);
          pointer-events: none;
          opacity: 0;
          z-index: 1;
          mix-blend-mode: screen;
        }
        @keyframes serviceBellRing {
          0%   { transform: translateX(-50%) rotate(0deg); }
          15%  { transform: translateX(-50%) rotate(-9deg); }
          30%  { transform: translateX(-50%) rotate(7deg); }
          45%  { transform: translateX(-50%) rotate(-5deg); }
          60%  { transform: translateX(-50%) rotate(3deg); }
          75%  { transform: translateX(-50%) rotate(-1.5deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }
        .service-bell-dome.is-ringing {
          animation: serviceBellRing 720ms cubic-bezier(.34,1.56,.64,1) forwards;
        }
        @keyframes serviceBellPress {
          0%   { transform: translateX(-50%) translateY(0); }
          25%  { transform: translateX(-50%) translateY(7px); }
          55%  { transform: translateX(-50%) translateY(7px); }
          100% { transform: translateX(-50%) translateY(0); }
        }
        .service-bell-plunger.is-pressing {
          animation: serviceBellPress 360ms ease-out forwards;
        }
        @keyframes serviceBellGlow {
          0%   { transform: translateX(-50%) scale(0); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translateX(-50%) scale(2.4); opacity: 0; }
        }
        .service-bell-glow.is-ringing {
          animation: serviceBellGlow 700ms ease-out forwards;
        }
        @media (max-width: 640px) {
          .service-bell-mount { right: 14px; top: 50px; width: 50px; height: 64px; }
          .service-bell-block { width: 42px; height: 11px; }
          .service-bell-dome { width: 38px; height: 30px; }
          .service-bell-plunger { width: 6px; height: 14px; top: 4px; }
          .service-bell-plunger-cap { width: 12px; height: 7px; }
        }

        /* ── Wall Calendar / Date Card Display (iter-43) ───────────────── */
        .wall-calendar {
          position: absolute;
          top: 56px;
          left: 32px;
          width: 60px;
          height: 96px;
          z-index: 8;
          pointer-events: none;
          filter: drop-shadow(0 4px 5px rgba(0,0,0,0.4));
        }
        .wall-calendar-bracket {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 26px;
          height: 14px;
          background: linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 3px 3px 1px 1px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 1px 2px rgba(0,0,0,0.4);
          z-index: 2;
        }
        .wall-calendar-bracket::before,
        .wall-calendar-bracket::after {
          content: "";
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 3px; height: 3px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #5a4318, #2D100F);
        }
        .wall-calendar-bracket::before { left: 4px; }
        .wall-calendar-bracket::after  { right: 4px; }
        .wall-calendar-frame {
          position: absolute;
          top: 4px;
          left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 5px;
          padding: 3px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.35),
            inset 0 -1px 2px rgba(0,0,0,0.45);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .wall-calendar-month,
        .wall-calendar-weekday {
          background:
            radial-gradient(ellipse at 50% 30%, #fdf7e6 0%, #ebd4a8 100%);
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          text-align: center;
          letter-spacing: 0.22em;
          border-radius: 2px;
          display: grid;
          place-items: center;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 1px 0 rgba(45,16,15,0.15);
        }
        .wall-calendar-month {
          font-size: 10px;
          height: 16px;
          color: #a31920;
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
        }
        .wall-calendar-weekday {
          font-size: 9px;
          height: 14px;
          color: #2D100F;
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
        }
        .wall-calendar-day {
          flex: 1;
          background:
            linear-gradient(180deg, #fdf7e6 0%, #fdf7e6 50%, #f5e7c2 50%, #f5e7c2 100%);
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          color: #2D100F;
          border-radius: 2px;
          position: relative;
          display: grid;
          place-items: center;
          font-size: 28px;
          letter-spacing: 0.04em;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -1px 2px rgba(0,0,0,0.12);
          overflow: hidden;
        }
        .wall-calendar-day::before {
          content: "";
          position: absolute;
          left: 3px; right: 3px;
          top: 50%;
          height: 1px;
          background:
            repeating-linear-gradient(90deg,
              rgba(45, 16, 15, 0.45) 0px,
              rgba(45, 16, 15, 0.45) 2px,
              transparent 2px,
              transparent 4px);
          z-index: 1;
          pointer-events: none;
        }
        .wall-calendar-day::after {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 50%;
          height: 50%;
          background: linear-gradient(180deg, rgba(0,0,0,0.04) 0%, transparent 30%);
          pointer-events: none;
        }
        .wall-calendar-day span {
          position: relative;
          z-index: 2;
          text-shadow:
            0 1px 0 rgba(255,255,255,0.5),
            0 -1px 0 rgba(45,16,15,0.04);
        }
        @media (max-width: 640px) {
          .wall-calendar { left: 14px; top: 50px; width: 50px; height: 80px; }
          .wall-calendar-month { font-size: 8px; height: 13px; }
          .wall-calendar-weekday { font-size: 7px; height: 12px; }
          .wall-calendar-day { font-size: 22px; }
        }

        /* ── LED Dot-Matrix Marquee Ticker (iter-44) ───────────────────── */
        .marquee-ticker {
          margin-top: 12px;
          padding: 0;
        }
        .marquee-frame {
          position: relative;
          background:
            linear-gradient(180deg, #0a0503 0%, #1a0e07 50%, #0a0503 100%);
          border: 1px solid rgba(0,0,0,0.6);
          border-radius: 8px;
          padding: 4px 28px;
          box-shadow:
            inset 0 1px 0 rgba(201, 162, 74, 0.18),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            inset 0 0 14px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .marquee-rivet {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, #ffd86b 0%, #c9a24a 45%, #5a4318 90%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.4);
          transform: translateY(-50%);
        }
        .marquee-rivet-l { left: 8px; }
        .marquee-rivet-r { right: 8px; }
        .marquee-window {
          position: relative;
          height: 22px;
          overflow: hidden;
          border-radius: 3px;
          background:
            linear-gradient(180deg, #050201 0%, #0a0503 50%, #050201 100%);
          box-shadow:
            inset 0 1px 2px rgba(0,0,0,0.95),
            inset 0 -1px 0 rgba(255, 184, 74, 0.04);
        }
        .marquee-window::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 1px 1px, rgba(0,0,0,0.85) 0.5px, transparent 0.6px) 0 0 / 3px 3px;
          opacity: 0.45;
          mix-blend-mode: multiply;
          pointer-events: none;
          z-index: 2;
        }
        .marquee-window::after {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0; width: 24px;
          background:
            linear-gradient(90deg, #050201 10%, transparent 100%);
          pointer-events: none;
          z-index: 3;
          box-shadow: 240px 0 0 -1px transparent;
        }
        .marquee-window {
          position: relative;
        }
        .marquee-window > .marquee-edge-r {
          /* nope - using inline mask instead */
        }
        .marquee-track {
          display: flex;
          flex-wrap: nowrap;
          width: max-content;
          animation: marqueeScroll 60s linear infinite;
          will-change: transform;
        }
        .marquee-segment {
          display: inline-block;
          padding: 0 8px;
          font-family: "Courier New", monospace;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #ffb84a;
          line-height: 22px;
          white-space: nowrap;
          text-shadow:
            0 0 4px rgba(255, 184, 74, 0.55),
            0 0 8px rgba(255, 130, 30, 0.32);
          flex-shrink: 0;
        }
        @keyframes marqueeScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-frame:hover .marquee-track {
          animation-play-state: paused;
        }
        @media (max-width: 640px) {
          .marquee-frame { padding: 3px 22px; }
          .marquee-window { height: 18px; }
          .marquee-segment { font-size: 10px; line-height: 18px; }
          .marquee-rivet { width: 6px; height: 6px; }
          .marquee-rivet-l { left: 6px; }
          .marquee-rivet-r { right: 6px; }
        }

        /* ── Exposed Clockwork Gears (iter-45) ─────────────────────────── */
        .marquee-frame-with-gears {
          display: flex;
          align-items: center;
        }
        .marquee-frame-with-gears .marquee-window {
          flex: 1;
          min-width: 0;
        }
        .marquee-gears-port {
          position: relative;
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, #1a0e07 0%, #0a0503 100%);
          box-shadow:
            inset 0 0 0 1px #c9a24a,
            inset 0 0 0 2px #5a4318,
            inset 0 0 0 3px #8c6e27,
            inset 0 0 6px rgba(0,0,0,0.85),
            0 1px 2px rgba(0,0,0,0.6);
          overflow: hidden;
          margin-right: 6px;
        }
        .marquee-gears-port::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(ellipse 60% 32% at 32% 22%, rgba(255,255,255,0.18), transparent 70%);
          pointer-events: none;
          z-index: 3;
        }
        .gears-window {
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          overflow: hidden;
        }
        .gears-svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .gear {
          transform-box: fill-box;
        }
        .gear-big {
          transform-origin: 50px 50px;
          animation: gearSpinCw 12s linear infinite;
          filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.5));
        }
        .gear-small {
          transform-origin: 26px 26px;
          animation: gearSpinCcw 6s linear infinite;
          filter: drop-shadow(0 0.4px 0.4px rgba(0,0,0,0.45));
        }
        .gear-tiny {
          transform-origin: 72px 72px;
          animation: gearSpinCw 4s linear infinite;
          filter: drop-shadow(0 0.3px 0.3px rgba(0,0,0,0.4));
        }
        @keyframes gearSpinCw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gearSpinCcw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @media (max-width: 640px) {
          .marquee-gears-port { width: 22px; height: 22px; margin-right: 4px; }
        }

        /* ── Pneumatic Tube System (iter-46) ───────────────────────────── */
        .pneumatic-tube {
          position: absolute;
          top: 56px;
          right: 6px;
          bottom: 8px;
          width: 16px;
          z-index: 7;
          pointer-events: none;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
        }
        .pneumatic-tube-glass {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg,
              rgba(160, 200, 220, 0.05) 0%,
              rgba(160, 200, 220, 0.18) 25%,
              rgba(255, 255, 255, 0.12) 50%,
              rgba(160, 200, 220, 0.08) 75%,
              rgba(0, 0, 0, 0.18) 100%);
          border-left: 1px solid rgba(160, 200, 220, 0.45);
          border-right: 1px solid rgba(0, 0, 0, 0.4);
          border-radius: 5px;
          box-shadow:
            inset 0 0 4px rgba(0, 0, 0, 0.45),
            inset 1px 0 0 rgba(255, 255, 255, 0.15),
            inset -1px 0 0 rgba(0, 0, 0, 0.3);
          z-index: 1;
        }
        .pneumatic-tube-cap {
          position: absolute;
          left: -3px; right: -3px;
          height: 14px;
          background:
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 3px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            inset 0 -1px 0 rgba(0,0,0,0.45),
            0 1px 2px rgba(0,0,0,0.4);
          z-index: 4;
        }
        .pt-cap-top    { top: 0; }
        .pt-cap-bottom { bottom: 0; }
        .pneumatic-tube-cap::before,
        .pneumatic-tube-cap::after {
          content: "";
          position: absolute;
          top: 50%; transform: translateY(-50%);
          width: 2.5px; height: 2.5px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #5a4318, #2D100F);
        }
        .pneumatic-tube-cap::before { left: 3px; }
        .pneumatic-tube-cap::after  { right: 3px; }
        .pneumatic-tube-bracket {
          position: absolute;
          left: -2px; right: -2px;
          height: 6px;
          background:
            linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          border-top: 1px solid #2D100F;
          border-bottom: 1px solid #2D100F;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.3),
            inset 0 -1px 0 rgba(0,0,0,0.45);
          z-index: 3;
        }
        .pt-bracket-1 { top: 18%; }
        .pt-bracket-2 { top: 38%; }
        .pt-bracket-3 { top: 58%; }
        .pt-bracket-4 { top: 78%; }
        .pneumatic-tube-capsule {
          position: absolute;
          left: 2px; right: 2px;
          height: 18px;
          top: 18px;
          background:
            linear-gradient(180deg,
              #ffd86b 0%,
              #c9a24a 18%,
              #8c6e27 35%,
              #5a4318 50%,
              #8c6e27 65%,
              #c9a24a 82%,
              #ffd86b 100%);
          border-left: 0.5px solid #2D100F;
          border-right: 0.5px solid #2D100F;
          border-radius: 5px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            inset 0 -1px 0 rgba(0,0,0,0.5);
          z-index: 2;
          animation: capsuleHover 4s ease-in-out infinite;
        }
        .pneumatic-tube-capsule::before {
          /* Leather grip band around the middle */
          content: "";
          position: absolute;
          left: 0; right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 3px;
          background: linear-gradient(180deg, #5a3220 0%, #2D100F 60%, #1a0a06 100%);
          border-top: 0.5px solid rgba(255,255,255,0.1);
          border-bottom: 0.5px solid rgba(0,0,0,0.5);
        }
        @keyframes capsuleHover {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(2px); }
        }
        @keyframes capsuleFlight {
          0%   { top: 18px; filter: blur(0); }
          12%  { filter: blur(1.4px); }
          40%  { top: calc(100% - 38px); filter: blur(0.4px); }
          50%  { top: calc(100% - 38px); filter: blur(0); }
          62%  { top: calc(100% - 38px); }
          75%  { filter: blur(0.8px); }
          100% { top: 18px; filter: blur(0); }
        }
        .pneumatic-tube-capsule.is-flying {
          animation: capsuleFlight 2400ms cubic-bezier(.55,.05,.45,.95) forwards;
        }
        @media (max-width: 640px) {
          .pneumatic-tube { width: 12px; right: 4px; top: 52px; }
          .pneumatic-tube-capsule { height: 14px; }
          .pneumatic-tube-cap { height: 10px; }
        }

        /* ── Wood-Paneled Shop Wall (iter-47) ──────────────────────────── */
        .pos-shop-room {
          position: relative;
          padding: 22px 26px 32px;
          margin-bottom: 8px;
          border-radius: 12px;
          background:
            /* Vertical plank seams — dark thin lines every 50px */
            repeating-linear-gradient(90deg,
              transparent 0px, transparent 49px,
              rgba(20, 8, 4, 0.55) 49px, rgba(20, 8, 4, 0.55) 50.5px),
            /* Subtle horizontal grain — thin shadow lines */
            repeating-linear-gradient(0deg,
              transparent 0px, transparent 5px,
              rgba(0, 0, 0, 0.05) 5px, rgba(0, 0, 0, 0.05) 6px),
            /* Sparse knot-like darker spots */
            radial-gradient(ellipse 80px 12px at 18% 32%, rgba(20, 8, 4, 0.32), transparent 70%),
            radial-gradient(ellipse 60px 9px at 72% 64%, rgba(20, 8, 4, 0.26), transparent 70%),
            radial-gradient(ellipse 50px 8px at 38% 78%, rgba(20, 8, 4, 0.22), transparent 70%),
            /* Wood color base */
            linear-gradient(180deg, #5a3220 0%, #4a2818 50%, #3a1f12 100%);
          box-shadow:
            inset 0 0 36px rgba(0, 0, 0, 0.55),
            inset 0 -3px 8px rgba(0, 0, 0, 0.45),
            0 6px 14px rgba(0, 0, 0, 0.3);
          overflow: visible;
        }
        .pos-shop-room::before {
          /* Brass picture rail across the top */
          content: "";
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          height: 5px;
          background:
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          border-top: 1px solid #2D100F;
          border-bottom: 1px solid #2D100F;
          border-radius: 1.5px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.5),
            0 1px 0 rgba(0, 0, 0, 0.45),
            0 2px 3px rgba(0, 0, 0, 0.35);
          z-index: 1;
          pointer-events: none;
        }
        .pos-shop-room::after {
          /* Vignette darkening the corners + a subtle warm glow at the
             very top-center to suggest a hidden ceiling lamp. */
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(ellipse 65% 36% at 50% 12%, rgba(255, 200, 130, 0.10), transparent 70%),
            radial-gradient(ellipse 110% 80% at 50% 40%, transparent 50%, rgba(0, 0, 0, 0.40) 100%);
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 640px) {
          .pos-shop-room { padding: 16px 14px 22px; }
        }

        /* ── Brass Mailbox Door Grid (iter-48) ─────────────────────────── */
        .mailbox-column {
          position: absolute;
          top: 24px;
          width: 22px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 1;
          pointer-events: none;
        }
        .mailbox-column-left { left: 2px; }
        .mailbox-column-right { right: 2px; }
        .mailbox-door {
          position: relative;
          width: 22px;
          height: 38px;
          background:
            radial-gradient(ellipse 50% 18% at 30% 12%, rgba(255, 255, 255, 0.4) 0%, transparent 60%),
            linear-gradient(135deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 2px 2px 1.5px 1.5px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.45),
            inset -1px 0 1px rgba(0, 0, 0, 0.25),
            0 1px 2px rgba(0, 0, 0, 0.5);
          transform: rotate(var(--door-tilt, 0deg));
          flex-shrink: 0;
        }
        .mailbox-number {
          position: absolute;
          top: 3px;
          left: 1px;
          right: 1px;
          font-size: 6.5px;
          font-weight: 900;
          color: #2D100F;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          letter-spacing: 0.05em;
          text-shadow: 0 0.5px 0 rgba(255, 255, 255, 0.4);
          line-height: 1;
        }
        .mailbox-hinge {
          position: absolute;
          left: -0.5px;
          width: 3px;
          height: 4px;
          background:
            radial-gradient(ellipse at 30% 30%, #ffd86b 0%, #8c6e27 70%);
          border: 0.5px solid #2D100F;
          border-radius: 1px;
          box-shadow: 0 0.5px 0.5px rgba(0, 0, 0, 0.4);
        }
        .mailbox-hinge-top { top: 5px; }
        .mailbox-hinge-bottom { bottom: 5px; }
        .mailbox-keyhole {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 60%, #2D100F 0%, #1a0a06 80%, #0a0503 100%);
          border: 0.4px solid #5a4318;
          box-shadow:
            inset 0 0.5px 1px rgba(0, 0, 0, 0.85),
            0 0.5px 0 rgba(255, 255, 255, 0.15);
        }
        .mailbox-keyhole::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          width: 0.8px;
          height: 1.6px;
          background: #1a0a06;
        }
        .mailbox-shine {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 4px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.5), transparent);
          border-radius: 50%;
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .mailbox-column { width: 16px; top: 18px; }
          .mailbox-column-left { left: 1px; }
          .mailbox-column-right { right: 1px; }
          .mailbox-door { width: 16px; height: 28px; }
          .mailbox-number { font-size: 5px; top: 2px; }
          .mailbox-hinge { width: 2.4px; height: 3px; }
          .mailbox-keyhole { width: 4px; height: 4px; bottom: 5px; }
        }

        /* ── Wooden Floor + Brass Baseboard (iter-49) ──────────────────── */
        .pos-shop-floor {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 26px;
          z-index: 0;
          border-radius: 0 0 12px 12px;
          background:
            /* Faint board seams every 90px (wider than wall planks since
               floorboards are typically wider than wall paneling) */
            repeating-linear-gradient(90deg,
              transparent 0px, transparent 89px,
              rgba(20, 8, 4, 0.5) 89px, rgba(20, 8, 4, 0.5) 90.5px),
            /* Horizontal grain — fine darker lines every 4-5px (perpendicular
               to the wall's vertical grain — sells the floor orientation) */
            repeating-linear-gradient(0deg,
              transparent 0px, transparent 3px,
              rgba(0, 0, 0, 0.07) 3px, rgba(0, 0, 0, 0.07) 4px,
              transparent 4px, transparent 7px,
              rgba(0, 0, 0, 0.04) 7px, rgba(0, 0, 0, 0.04) 7.5px),
            /* A few sparse darker patches suggesting wood knots in the floor */
            radial-gradient(ellipse 50px 8px at 24% 50%, rgba(20, 8, 4, 0.35), transparent 70%),
            radial-gradient(ellipse 40px 6px at 78% 30%, rgba(20, 8, 4, 0.28), transparent 70%),
            /* Floor base color — warmer / lighter than the walls so the eye
               reads the boundary between wall and floor without needing a
               literal trim line */
            linear-gradient(180deg, #7a4a30 0%, #6b3e2a 35%, #5a3220 100%);
          box-shadow:
            inset 0 1px 0 rgba(0, 0, 0, 0.55),
            inset 0 -2px 4px rgba(0, 0, 0, 0.4);
        }
        .pos-shop-floor::before {
          /* Brass baseboard trim line where wall meets floor — a 1.5px brass
             strip running across the top of the floor */
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background:
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          box-shadow:
            0 1px 0 rgba(0, 0, 0, 0.5),
            0 -1px 0 rgba(45, 16, 15, 0.6);
          z-index: 2;
        }
        .pos-shop-floor::after {
          /* Tiny brass nail heads punctuating the floor planks at irregular
             positions — like wide-board oak with visible nailwork */
          content: "";
          position: absolute;
          top: 12px;
          left: 50px;
          width: 1.5px;
          height: 1.5px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #c9a24a, #5a4318 70%);
          box-shadow:
            150px 4px 0 -0.2px #5a4318,
            230px -2px 0 -0.2px #5a4318,
            340px 6px 0 -0.2px #5a4318,
            420px 0 0 -0.2px #5a4318,
            520px 4px 0 -0.2px #5a4318,
            620px -3px 0 -0.2px #5a4318;
          z-index: 1;
        }
        .pos-shop-floor-shadow {
          /* The cabinet's drop shadow falling onto the floor — soft elliptical
             dark patch that suggests the cabinet sits on the floor rather
             than floating in space */
          position: absolute;
          left: 30px;
          right: 30px;
          top: 2px;
          height: 8px;
          background: radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 50%, transparent 80%);
          filter: blur(1.5px);
          pointer-events: none;
          z-index: 1;
        }
        @media (max-width: 640px) {
          .pos-shop-floor { height: 18px; }
          .pos-shop-floor-shadow { left: 18px; right: 18px; }
        }

        /* ── Shop Atmosphere — Sunbeam + Dust Motes (iter-50) ──────────── */
        .shop-atmosphere {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
          border-radius: inherit;
        }
        .shop-sunbeam {
          position: absolute;
          top: -8%;
          right: -22%;
          width: 58%;
          height: 130%;
          background:
            linear-gradient(120deg,
              transparent 0%,
              rgba(255, 220, 150, 0.04) 20%,
              rgba(255, 210, 130, 0.10) 38%,
              rgba(255, 230, 160, 0.13) 50%,
              rgba(255, 210, 130, 0.10) 62%,
              rgba(255, 220, 150, 0.04) 80%,
              transparent 100%);
          filter: blur(3px);
          transform: rotate(-22deg);
          mix-blend-mode: screen;
          opacity: 0.9;
          animation: sunbeamPulse 16s ease-in-out infinite;
        }
        .shop-sunbeam-secondary {
          /* Secondary thinner beam, slightly different angle, softer — adds
             dimension to the volumetric light effect */
          top: -4%;
          right: -10%;
          width: 24%;
          height: 110%;
          opacity: 0.55;
          background:
            linear-gradient(120deg,
              transparent 30%,
              rgba(255, 240, 180, 0.18) 50%,
              transparent 70%);
          transform: rotate(-22deg);
          animation-duration: 22s;
          animation-delay: -8s;
        }
        @keyframes sunbeamPulse {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
        .shop-dust {
          position: absolute;
          inset: 0;
        }
        .dust-mote {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 240, 200, 0.85);
          box-shadow:
            0 0 3px rgba(255, 240, 200, 0.7),
            0 0 6px rgba(255, 200, 130, 0.35);
          mix-blend-mode: screen;
          opacity: 0;
          animation: dustDrift linear infinite;
        }
        @keyframes dustDrift {
          0%   { transform: translate(0, 0);                                         opacity: 0; }
          12%  {                                                                      opacity: 0.95; }
          50%  { transform: translate(calc(var(--mote-drift, 12px) * 0.5), -55px); }
          88%  {                                                                      opacity: 0.55; }
          100% { transform: translate(var(--mote-drift, 12px), -130px);              opacity: 0; }
        }
        @media (max-width: 640px) {
          /* Slightly fewer motes visible on narrow viewports — same count, but
             the smaller surface area means they crowd. Reduce the mote shadow
             so the effect stays subtle. */
          .dust-mote { box-shadow: 0 0 2px rgba(255, 240, 200, 0.65); }
        }

        /* ── Wall Pendulum Clock (iter-51) ─────────────────────────────── */
        .wall-clock {
          position: absolute;
          top: 240px;
          left: 1px;
          width: 24px;
          z-index: 1;
          pointer-events: none;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
        }
        .wall-clock-face {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 50%, #fdf7e6 0%, #ebd4a8 100%);
          box-shadow:
            inset 0 0 0 1px #c9a24a,
            inset 0 0 0 2px #5a4318,
            inset 0 0 0 3px #8c6e27,
            0 1px 2px rgba(0, 0, 0, 0.5);
        }
        .wall-clock-face-inner {
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 30%, #fdf7e6 0%, #ebd4a8 100%);
        }
        .wall-clock-mark {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: center;
        }
        .wall-clock-mark span {
          display: block;
          width: 0.6px;
          height: 1.6px;
          background: #2D100F;
          margin-top: 0.6px;
        }
        .wall-clock-mark-major span {
          width: 1px;
          height: 2.4px;
        }
        .wall-clock-hand {
          position: absolute;
          left: 50%;
          bottom: 50%;
          transform-origin: 50% 100%;
          background: #2D100F;
          border-radius: 0.5px;
        }
        .wall-clock-hand-hour {
          width: 1px;
          height: 4.5px;
        }
        .wall-clock-hand-minute {
          width: 0.6px;
          height: 6.5px;
        }
        .wall-clock-hub {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1.8px;
          height: 1.8px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b, #c9a24a 50%, #5a4318 100%);
          box-shadow: 0 0 0 0.4px #2D100F;
          z-index: 5;
        }
        .wall-clock-pendulum-case {
          position: relative;
          margin: -2px auto 0;
          width: 12px;
          height: 36px;
          background:
            radial-gradient(ellipse at 50% 30%, #2a1a0a 0%, #0a0503 100%);
          border: 1px solid #5a4318;
          border-top: 0.5px solid #2D100F;
          border-radius: 0 0 5px 5px;
          box-shadow:
            inset 0 1px 1px rgba(0, 0, 0, 0.6),
            inset 0 -1px 0 rgba(201, 162, 74, 0.2);
          overflow: hidden;
        }
        .wall-clock-pendulum-case::before {
          /* Faint glass reflection on the case window */
          content: "";
          position: absolute;
          inset: 1px 1px auto 1px;
          height: 6px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent);
          pointer-events: none;
        }
        .wall-clock-pendulum {
          position: absolute;
          top: 0;
          left: 50%;
          transform-origin: 50% 0;
          width: 1px;
          margin-left: -0.5px;
          animation: pendulumSwing 2.4s cubic-bezier(.45,0,.55,1) infinite;
        }
        @keyframes pendulumSwing {
          0%, 100% { transform: rotate(14deg); }
          50%      { transform: rotate(-14deg); }
        }
        .wall-clock-pendulum-rod {
          width: 0.8px;
          height: 28px;
          background: linear-gradient(180deg, #c9a24a 0%, #8c6e27 60%, #5a4318 100%);
          margin: 0 auto;
        }
        .wall-clock-pendulum-bob {
          width: 7px;
          height: 7px;
          margin: -2px auto 0 -3px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, #ffd86b 0%, #c9a24a 45%, #8c6e27 80%, #5a4318 100%);
          border: 0.5px solid #5a4318;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 1px 1px rgba(0, 0, 0, 0.5);
        }
        @media (max-width: 640px) {
          .wall-clock { left: 0; width: 18px; top: 200px; }
          .wall-clock-face { width: 18px; height: 18px; }
          .wall-clock-face-inner { inset: 3px; }
          .wall-clock-hand-hour { height: 3.5px; }
          .wall-clock-hand-minute { height: 5px; }
          .wall-clock-pendulum-case { width: 9px; height: 28px; }
          .wall-clock-pendulum-rod { height: 22px; }
          .wall-clock-pendulum-bob { width: 5px; height: 5px; margin-left: -2px; }
        }

        /* ── Twin Hanging Pendant Lamps (iter-52) ──────────────────────── */
        .pendant-lamp {
          position: absolute;
          top: 6px;
          width: 44px;
          z-index: 4;
          pointer-events: none;
          transform-origin: 50% 0%;
          animation: pendantLampSway 11s ease-in-out infinite;
        }
        .pendant-lamp-left  { left:  22%; }
        .pendant-lamp-right { right: 22%; }
        .pendant-lamp-right { animation-delay: -3.6s; }
        @keyframes pendantLampSway {
          0%   { transform: rotate(-0.5deg); }
          50%  { transform: rotate(0.5deg); }
          100% { transform: rotate(-0.5deg); }
        }
        .pendant-lamp-cap {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 4px;
          background:
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 1px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            0 1px 0 rgba(0, 0, 0, 0.4);
        }
        .pendant-lamp-chain {
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 1.5px;
          height: 22px;
          background:
            repeating-linear-gradient(0deg,
              #5a4318 0px, #5a4318 1.5px,
              #2D100F 1.5px, #2D100F 2.5px,
              #5a4318 2.5px, #5a4318 4px);
          border-radius: 1px;
          filter: drop-shadow(0 0.5px 0.5px rgba(0, 0, 0, 0.6));
        }
        .pendant-lamp-shade {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          width: 36px;
          height: 22px;
          background:
            radial-gradient(ellipse 35% 25% at 30% 22%, rgba(255, 255, 255, 0.55) 0%, transparent 65%),
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 22%, #8c6e27 60%, #5a4318 100%);
          border: 1px solid #2D100F;
          border-radius: 4px 4px 50% 50% / 4px 4px 60% 60%;
          box-shadow:
            inset 0 -2px 4px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            0 0 14px rgba(255, 184, 74, 0.45),
            0 0 26px rgba(255, 130, 30, 0.22);
        }
        .pendant-lamp-bulb {
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 7px;
          background:
            radial-gradient(ellipse at 50% 30%, #fff4b8 0%, #ffe88a 30%, #ffb84a 60%, #c9722a 90%);
          border-radius: 50% 50% 35% 35%;
          filter: blur(0.5px);
          animation: pendantLampBulbBreathe 4.4s ease-in-out infinite;
          box-shadow:
            0 0 6px rgba(255, 200, 100, 0.7),
            0 0 12px rgba(255, 160, 60, 0.4);
        }
        @keyframes pendantLampBulbBreathe {
          0%, 100% { opacity: 0.92; }
          50%      { opacity: 1; }
        }
        .pendant-lamp-cone {
          position: absolute;
          top: 42px;
          left: 50%;
          transform: translateX(-50%);
          width: 96px;
          height: 90px;
          background:
            radial-gradient(ellipse 80% 100% at 50% 0%,
              rgba(255, 200, 130, 0.22) 0%,
              rgba(255, 180, 100, 0.10) 40%,
              transparent 80%);
          mix-blend-mode: screen;
          filter: blur(2.5px);
          z-index: 3;
        }
        @media (max-width: 640px) {
          .pendant-lamp { width: 32px; }
          .pendant-lamp-left  { left:  16%; }
          .pendant-lamp-right { right: 16%; }
          .pendant-lamp-shade { width: 26px; height: 18px; }
          .pendant-lamp-bulb { width: 14px; height: 5px; }
          .pendant-lamp-cone { width: 70px; height: 60px; }
        }

        /* ── Brass Address Plaque "5062" (iter-53) ─────────────────────── */
        .address-plaque {
          position: absolute;
          top: 240px;
          right: 0;
          width: 30px;
          height: 50px;
          z-index: 2;
          pointer-events: none;
          transform: rotate(-1deg);
          filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
        }
        .address-plaque-frame {
          position: relative;
          width: 100%;
          height: 100%;
          background:
            radial-gradient(ellipse 60% 40% at 30% 18%, #fdf7e6 0%, transparent 70%),
            radial-gradient(ellipse at 50% 50%, #ebd4a8 0%, #d4ba88 60%, #b89a64 100%);
          border: 1.5px solid #5a4318;
          border-radius: 3px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 0 0 0.5px rgba(201, 162, 74, 0.7),
            inset 0 -1px 1px rgba(0, 0, 0, 0.18);
        }
        .address-plaque-screw {
          position: absolute;
          width: 2.6px;
          height: 2.6px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffd86b 0%, #c9a24a 50%, #5a4318 80%);
          box-shadow:
            inset 0 0.4px 0 rgba(255, 255, 255, 0.4),
            0 0.5px 0.5px rgba(0, 0, 0, 0.5);
        }
        .address-plaque-screw::after {
          /* Slot mark — a thin diagonal line for the screw slot */
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 2px;
          height: 0.5px;
          background: rgba(0, 0, 0, 0.55);
          transform: translate(-50%, -50%) rotate(28deg);
        }
        .address-plaque-screw-tl { top: 2px;    left: 2px; }
        .address-plaque-screw-tr { top: 2px;    right: 2px; }
        .address-plaque-screw-bl { bottom: 2px; left: 2px; }
        .address-plaque-screw-br { bottom: 2px; right: 2px; }
        .address-plaque-number {
          position: absolute;
          top: 7px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          font-size: 17px;
          color: #2D100F;
          letter-spacing: 0.04em;
          line-height: 1;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.45),
            0 -0.5px 0 rgba(45, 16, 15, 0.08);
        }
        .address-plaque-label {
          position: absolute;
          bottom: 5px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          font-size: 4.5px;
          color: #5a4318;
          letter-spacing: 0.18em;
          text-shadow: 0 0.5px 0 rgba(255, 255, 255, 0.4);
        }
        @media (max-width: 640px) {
          .address-plaque { top: 200px; width: 24px; height: 40px; right: 0; }
          .address-plaque-number { font-size: 13px; top: 5px; }
          .address-plaque-label { font-size: 3.5px; bottom: 4px; }
          .address-plaque-screw { width: 2px; height: 2px; }
        }

        /* ── Vintage Rotary Telephone (iter-54) ────────────────────────── */
        .vintage-phone {
          position: absolute;
          top: 304px;
          right: 1px;
          width: 28px;
          height: 56px;
          z-index: 1;
          pointer-events: none;
          filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
        }
        .vintage-phone-body {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 30px;
          background:
            radial-gradient(ellipse at 30% 22%, #3a1a18 0%, #1a0a06 60%, #0a0503 100%);
          border: 1px solid #2D100F;
          border-radius: 5px 5px 7px 7px / 5px 5px 6px 6px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -2px 3px rgba(0, 0, 0, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.55);
        }
        .vintage-phone-dial {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 25%, #ffd86b 0%, #c9a24a 35%, #8c6e27 75%, #5a4318 100%);
          box-shadow:
            inset 0 0 0 0.5px #2D100F,
            inset 0 1px 0 rgba(255, 255, 255, 0.45),
            inset 0 -1px 1px rgba(0, 0, 0, 0.5),
            0 0 0 0.4px rgba(45, 16, 15, 0.6);
        }
        .vintage-phone-dial-hole {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1.6px;
          height: 1.6px;
          margin: -0.8px 0 0 -0.8px;
          border-radius: 50%;
          background: #0a0503;
          box-shadow: inset 0 0.3px 0.3px rgba(0, 0, 0, 0.85);
          transform-origin: 50% 50%;
        }
        .vintage-phone-dial-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 25%, #1a0a06 0%, #0a0503 100%);
          border: 0.5px solid #5a4318;
          box-shadow:
            inset 0 0 1px rgba(0, 0, 0, 0.85),
            0 0 0 0.4px rgba(255, 255, 255, 0.06);
        }
        .vintage-phone-dial-stop {
          /* Small finger stop at the 1/2 o'clock position — the metal tab the
             dial returns against after each digit is dialed */
          position: absolute;
          top: 12%;
          right: 22%;
          width: 1.5px;
          height: 2.5px;
          background: linear-gradient(180deg, #c9a24a, #5a4318);
          border-radius: 0.5px;
          transform: rotate(38deg);
        }
        .vintage-phone-handset {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotate(-3deg);
          width: 26px;
          height: 6px;
          background:
            linear-gradient(180deg, #3a1a18 0%, #1a0a06 45%, #0a0503 100%);
          border-radius: 50% / 60%;
          border: 0.8px solid #2D100F;
          box-shadow:
            inset 0 0.5px 0 rgba(255, 255, 255, 0.25),
            inset 0 -0.5px 0.5px rgba(0, 0, 0, 0.5),
            0 1px 1.5px rgba(0, 0, 0, 0.55);
        }
        .vintage-phone-handset::before,
        .vintage-phone-handset::after {
          /* Earpiece + mouthpiece bumps */
          content: "";
          position: absolute;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #1a0a06, #0a0503 70%);
          border: 0.4px solid #2D100F;
          transform: translateY(-50%);
        }
        .vintage-phone-handset::before { left: 1px; }
        .vintage-phone-handset::after  { right: 1px; }
        .vintage-phone-cord {
          position: absolute;
          bottom: 0;
          left: calc(50% + 4px);
          width: 2px;
          height: 18px;
          background:
            repeating-linear-gradient(0deg,
              #2D100F 0px, #2D100F 1.4px,
              #1a0a06 1.4px, #1a0a06 2.6px);
          border-radius: 1px;
          transform-origin: 50% 0;
          animation: phoneCordSway 8s ease-in-out infinite;
        }
        @keyframes phoneCordSway {
          0%, 100% { transform: rotate(-1.5deg); }
          50%      { transform: rotate(1.5deg); }
        }
        @media (max-width: 640px) {
          .vintage-phone { top: 250px; width: 22px; height: 46px; }
          .vintage-phone-body { width: 20px; height: 24px; }
          .vintage-phone-dial { width: 13px; height: 13px; }
          .vintage-phone-dial-hole { width: 1.2px; height: 1.2px; margin: -0.6px 0 0 -0.6px; }
          .vintage-phone-dial-center { width: 4.5px; height: 4.5px; }
          .vintage-phone-handset { width: 21px; height: 5px; }
          .vintage-phone-handset::before, .vintage-phone-handset::after { width: 3px; height: 3px; }
          .vintage-phone-cord { height: 14px; }
        }

        /* ── Receipt Spike (iter-55) ───────────────────────────────────── */
        .receipt-spike {
          position: absolute;
          top: 312px;
          left: 1px;
          width: 22px;
          height: 50px;
          z-index: 1;
          pointer-events: none;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
        }
        .receipt-spike-base {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 5px;
          background:
            linear-gradient(180deg, #6b3e2a 0%, #4a2818 60%, #2D100F 100%);
          border: 0.5px solid #2D100F;
          border-radius: 1.5px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -1px 0 rgba(0, 0, 0, 0.5),
            0 0.5px 1px rgba(0, 0, 0, 0.4);
        }
        .receipt-spike-rod {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 1.6px;
          height: 38px;
          background:
            linear-gradient(180deg, #ffd86b 0%, #c9a24a 25%, #8c6e27 70%, #5a4318 100%);
          /* Pointed top — clip-path shapes the rod so the top 8% tapers to a sharp point */
          clip-path: polygon(50% 0%, 100% 8%, 100% 100%, 0% 100%, 0% 8%);
          box-shadow: 0.4px 0 0.4px rgba(0, 0, 0, 0.45);
        }
        .receipt-spike-paper {
          position: absolute;
          left: 50%;
          width: 14px;
          height: 2.5px;
          margin-left: -7px;
          background:
            linear-gradient(180deg, #fdf7e6 0%, #ebd4a8 50%, #d4ba88 100%);
          border-top: 0.4px solid rgba(45, 16, 15, 0.5);
          border-bottom: 0.4px solid rgba(45, 16, 15, 0.4);
          box-shadow:
            0 0.4px 0.4px rgba(0, 0, 0, 0.35),
            inset 0 0.4px 0 rgba(255, 255, 255, 0.5);
        }
        .receipt-spike-paper::after {
          /* Tiny pinprick where the spike pierced the paper — visible as a
             dark dot in the center of each receipt */
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1.4px;
          height: 0.5px;
          background: rgba(45, 16, 15, 0.65);
          border-radius: 50%;
          box-shadow: 0 0.3px 0 rgba(0, 0, 0, 0.4);
        }
        @media (max-width: 640px) {
          .receipt-spike { top: 260px; width: 18px; height: 40px; }
          .receipt-spike-base { width: 13px; height: 4px; }
          .receipt-spike-rod { width: 1.4px; height: 30px; }
          .receipt-spike-paper { width: 11px; height: 2px; margin-left: -5.5px; }
        }

        /* ── Framed First Dollar Earned (iter-56) ──────────────────────── */
        .first-dollar {
          position: absolute;
          top: 380px;
          right: 0;
          width: 28px;
          height: 36px;
          z-index: 1;
          pointer-events: none;
          transform: rotate(1deg);
          filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
        }
        .first-dollar-frame {
          position: relative;
          width: 100%;
          height: 100%;
          background:
            linear-gradient(180deg, #6b3e2a 0%, #4a2818 50%, #2D100F 100%);
          border: 0.5px solid #2D100F;
          border-radius: 1.5px;
          padding: 2px 2px 6px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -1px 1px rgba(0, 0, 0, 0.55),
            inset 1px 0 0.5px rgba(255, 255, 255, 0.06),
            inset -1px 0 0.5px rgba(0, 0, 0, 0.4);
        }
        .first-dollar-mat {
          width: 100%;
          height: 100%;
          background:
            radial-gradient(ellipse at 50% 30%, #fdf7e6 0%, #ebd4a8 100%);
          border-radius: 0.5px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow:
            inset 0 0 0 0.4px rgba(45, 16, 15, 0.25),
            inset 0 1px 1px rgba(0, 0, 0, 0.12);
        }
        .first-dollar-bill {
          position: relative;
          width: 22px;
          height: 12px;
          background:
            linear-gradient(135deg, #d4e6c8 0%, #b4d4a4 35%, #98b88c 100%);
          border: 0.4px solid #5a7a4a;
          border-radius: 0.5px;
          box-shadow:
            0 0.4px 0.5px rgba(0, 0, 0, 0.35),
            inset 0 0 0 0.3px rgba(90, 122, 74, 0.4);
        }
        .first-dollar-bill-number {
          position: absolute;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          font-size: 3px;
          color: #2a4a1a;
          line-height: 1;
        }
        .first-dollar-bill-tl { top: 0.8px; left: 1px; }
        .first-dollar-bill-tr { top: 0.8px; right: 1px; }
        .first-dollar-bill-bl { bottom: 0.8px; left: 1px; }
        .first-dollar-bill-br { bottom: 0.8px; right: 1px; }
        .first-dollar-bill-portrait {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 5px;
          height: 6.5px;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 30%, rgba(45, 74, 26, 0.18) 0%, rgba(45, 74, 26, 0.42) 80%);
          border: 0.3px solid rgba(90, 122, 74, 0.7);
          box-shadow: inset 0 0 1px rgba(45, 74, 26, 0.3);
        }
        .first-dollar-bill-edge {
          position: absolute;
          left: 1px;
          right: 1px;
          height: 0.4px;
          background:
            repeating-linear-gradient(90deg,
              rgba(45, 74, 26, 0.35) 0 1px,
              transparent 1px 2px);
        }
        .first-dollar-bill-edge-top    { top: 1.4px; }
        .first-dollar-bill-edge-bottom { bottom: 1.4px; }
        .first-dollar-label {
          position: absolute;
          bottom: 0.8px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          font-size: 3.6px;
          color: #c9a24a;
          letter-spacing: 0.18em;
          text-shadow: 0 0.3px 0 rgba(0, 0, 0, 0.5);
          line-height: 1;
        }
        @media (max-width: 640px) {
          .first-dollar { top: 320px; width: 22px; height: 28px; }
          .first-dollar-bill { width: 17px; height: 9px; }
          .first-dollar-bill-number { font-size: 2.4px; }
          .first-dollar-bill-portrait { width: 4px; height: 5px; }
          .first-dollar-label { font-size: 2.8px; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: BROWN }}>
            Cash Register
          </h2>
          <p className="text-xs sm:text-sm text-text-light/70 mt-0.5">
            Counter-side point of sale · ring up walk-ins, supplies, services, and renewals
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <div className="theme-seg" role="group" aria-label="Theme">
            {(["brass", "aluminum", "walnut"] as const).map((t) => {
              const swatch =
                t === "brass" ? "linear-gradient(135deg,#c9a24a,#3a1f12)" :
                t === "aluminum" ? "linear-gradient(135deg,#d8dde2,#232830)" :
                "linear-gradient(135deg,#e2bb70,#432712)";
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`theme-seg-btn ${theme === t ? "active" : ""}`}
                  title={`Switch to ${t} finish`}
                >
                  <span className="theme-swatch" style={{ background: swatch }} />
                  <span className="hidden md:inline uppercase">{t}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={openZReport}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: BROWN,
              borderColor: "rgba(45,16,15,0.3)",
              background: "rgba(255,255,255,0.5)",
            }}
            title="Z-Read — print today's till summary"
          >
            <ChartIcon />
            <span className="hidden sm:inline">Z-READ</span>
          </button>
          <button
            onClick={() => setPreviewMode((p) => !p)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: previewMode ? CREAM : BROWN,
              borderColor: previewMode ? GOLD_DARK : "rgba(45,16,15,0.3)",
              background: previewMode ? `linear-gradient(180deg, ${BLUE} 0%, #23596A 100%)` : "rgba(255,255,255,0.5)",
            }}
            title={previewMode ? "Receipt preview is ON — preview shows before each charge" : "Toggle 4×6 receipt preview before charging"}
          >
            <PreviewIcon />
            <span className="hidden sm:inline">PREVIEW</span>
          </button>
          <button
            onClick={openReturns}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: "#a40010",
              borderColor: "rgba(192, 24, 24, 0.45)",
              background: "rgba(245, 211, 208, 0.55)",
            }}
            title="Process a return / refund — search a recent sale and reverse it"
          >
            <ReturnIcon />
            <span className="hidden sm:inline">RETURNS</span>
          </button>
          <button
            onClick={() => setCalcOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: BROWN,
              borderColor: "rgba(45,16,15,0.3)",
              background: "rgba(255,255,255,0.5)",
            }}
            title="Open calculator overlay"
          >
            <CalcIcon />
            <span className="hidden sm:inline">CALC</span>
          </button>
          <button
            onClick={popOutDisplay}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: BROWN,
              borderColor: "rgba(45,16,15,0.3)",
              background: "rgba(255,255,255,0.5)",
            }}
            title="Open the customer-facing display in a separate window (drag to a second monitor)"
          >
            <PopOutIcon />
            <span className="hidden sm:inline">POP OUT</span>
          </button>
          <button
            onClick={() => setGiftOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: CREAM,
              borderColor: "#5a4318",
              background: `linear-gradient(180deg, #c92a4d 0%, #8a1010 100%)`,
            }}
            title="Sell a gift card — pick denomination, generate code, ring up"
          >
            <GiftIcon />
            <span className="hidden sm:inline">GIFT</span>
          </button>
          <button
            onClick={() => setShiftModal(shift ? "close" : "open")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: shift ? CREAM : BROWN,
              borderColor: shift ? GOLD_DARK : "rgba(45,16,15,0.3)",
              background: shift
                ? `linear-gradient(180deg, ${GOLD} 0%, ${GOLD_DARK} 100%)`
                : "rgba(255,255,255,0.5)",
            }}
            title={shift ? "Close shift — count cash and reconcile against expected" : "Open shift — count starting cash"}
          >
            <TillIcon />
            <span className="hidden sm:inline">{shift ? "CLOSE TILL" : "OPEN TILL"}</span>
          </button>
          <button
            onClick={() => setCounterMode((c) => !c)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: counterMode ? CREAM : BROWN,
              borderColor: counterMode ? GOLD_DARK : "rgba(45,16,15,0.3)",
              background: counterMode ? `linear-gradient(180deg,${BROWN} 0%, #1a0a09 100%)` : "rgba(255,255,255,0.5)",
            }}
            title={counterMode ? "Exit Counter Mode (Esc)" : "Enter Counter Mode — kiosk-style fullscreen"}
          >
            <KioskIcon />
            <span className="hidden sm:inline">{counterMode ? "EXIT" : "COUNTER MODE"}</span>
          </button>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold tracking-wide border"
            style={{
              color: soundOn ? BROWN : "#9c8a72",
              borderColor: soundOn ? "rgba(45,16,15,0.3)" : "rgba(45,16,15,0.15)",
              background: soundOn ? "rgba(255,255,255,0.5)" : "transparent",
            }}
            title={soundOn ? "Sound on — click to mute" : "Sound off — click to enable"}
          >
            {soundOn ? <SoundOn /> : <SoundOff />}
            <span className="hidden sm:inline">{soundOn ? "SOUND" : "MUTED"}</span>
          </button>
          {streak && streak.count > 0 && <StreakChip count={streak.count} />}
          <CashierBadge
            identity={cashierIdentity}
            editing={showCashierEdit}
            setEditing={setShowCashierEdit}
            palette={CASHIER_PALETTE}
            onSave={saveCashier}
          />
          <div className="flex items-center gap-2">
            <span className={bellRinging ? "ring-bell" : ""} aria-hidden style={{ display: "inline-block" }}>
              <Bell />
            </span>
            <span className="font-bold tracking-wide" style={{ color: BROWN }}>
              STATION 1
            </span>
          </div>
        </div>
      </div>

      {/* ── Today's till summary with goal progress ring ─────────────── */}
      {till && (
        <div
          className="mb-4 p-3 rounded-2xl flex flex-wrap items-center gap-x-5 gap-y-2"
          style={{
            background: "linear-gradient(180deg,#fff5dd 0%,#fae9c0 100%)",
            border: "1px solid rgba(45,16,15,0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <GoalProgressRing
            totalCents={till.totalCents}
            goalCents={dailyGoalCents}
            count={till.count}
            onEditGoal={() => setShowGoalEditor((s) => !s)}
            isEditing={showGoalEditor}
            onSetGoal={(c) => { setDailyGoalCents(c); setShowGoalEditor(false); }}
          />
          <HourlySpark byHour={till.byHour} />
          <TipJar tipsCents={till.tipsCents} dropKey={tipDropKey} />
          <Stat label="Cash" value={fmt(till.cashCents)} />
          <Stat label="Zelle" value={fmt(till.zelleCents)} />
          <Stat label="Square" value={fmt(till.squareCents)} />
          <Stat label="Card" value={fmt(till.cardCents)} />
          <Stat label="Wallet" value={fmt(till.walletCents)} />
          <Stat label="Custom" value={fmt(till.customCents)} />
        </div>
      )}

      {/* Top items podium leaderboard (iter-31) */}
      {till && <TopItemsLeaderboard items={till.topItems} />}

      {/* Milestone celebration banner */}
      {milestone && (
        <div className="milestone-banner" key={milestone.key}>
          <div className="milestone-strip">
            <span className="milestone-icon" aria-hidden>★</span>
            <div>
              <div className="text-[10px] font-black tracking-[0.32em] uppercase opacity-80">Milestone</div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none">{milestone.label}</div>
              <div className="text-[11px] font-bold opacity-90 mt-0.5">Whoa NOHO! Keep it rolling.</div>
            </div>
            <span className="milestone-icon" aria-hidden>★</span>
          </div>
        </div>
      )}

      {/* ── Live activity ticker (iter-16) ─────────────────────────── */}
      <TickerStrip
        events={tickerEvents}
        paused={tickerPaused}
        onHover={setTickerPaused}
      />

      {/* ── Parked-tickets clothesline rail (iter-6) ─────────────────── */}
      <ParkedRail
        tickets={parkedTickets}
        onRecall={recallTicket}
        onDiscard={discardTicket}
      />

      {/* ── Service bell mounted above the cabinet (iter-25) ───────── */}
      <ServiceBell ringKey={bellSwing} count={bellRings} onRing={ringBell} />

      {/* ── The cabinet ───────────────────────────────────────────────── */}
      {/* Wood-paneled shop wall (iter-47) wraps the entire register, providing background context */}
      <div className="pos-shop-room">
      {/* Wooden floor + brass baseboard trim (iter-49) */}
      <div className="pos-shop-floor" aria-hidden>
        <div className="pos-shop-floor-shadow" />
      </div>
      {/* Atmospheric sunbeam + floating dust motes (iter-50) */}
      <ShopAtmosphere />
      {/* Brass mailbox door columns (iter-48) — 5 doors per side, mounted to the wall */}
      <MailboxColumn side="left" startNumber={101} />
      <MailboxColumn side="right" startNumber={106} />
      {/* Wall pendulum clock (iter-51) — mounted on the left wall below the mailbox column */}
      <WallClock />
      {/* Twin hanging pendant lamps (iter-52) — flank the awning's centered text */}
      <PendantLamp side="left" />
      <PendantLamp side="right" />
      {/* Brass address plaque (iter-53) — "5062 LANKERSHIM" mounted on the right wall */}
      <AddressPlaque />
      {/* Vintage rotary telephone (iter-54) — mounted on the right wall below the plaque */}
      <VintagePhone />
      {/* Receipt spike (iter-55) — mounted on the left wall below the pendulum clock */}
      <ReceiptSpike />
      {/* Framed first dollar (iter-56) — wood frame on right wall below the rotary phone */}
      <FirstDollarFrame />
      <div ref={tiltRef} className="pos-tilt-stage" style={{ ["--tilt-x" as any]: "0deg", ["--tilt-y" as any]: "0deg", ["--tilt-spec" as any]: "50%" }}>
      {/* Striped shopfront awning (iter-41) — sits above the cabinet, casts shadow */}
      <Awning />
      {/* Brass counter bell (iter-42) — wall-mounted dome bell, click or auto-rings on sale */}
      <CounterBell ringKey={serviceBellKey} onRing={ringServiceBell} />
      {/* Wall calendar (iter-43) — vintage 3-card date display, mirrors the bell on the left */}
      <WallCalendar />
      {/* Pneumatic tube system (iter-46) — brass capsule whooshes on sale completion */}
      <PneumaticTube flightKey={tubeFlightKey} />
      <div ref={drawerRef} className="pos-cabinet pos-tilt rounded-2xl p-3 sm:p-5 relative overflow-hidden">
        {/* Idle screensaver overlay (iter-9) */}
        {idle && (
          <div className="idle-overlay" onClick={() => setIdle(false)}>
            <div className="idle-spotlight" aria-hidden />
            <IdleAmbientCoins />
            <div className="relative text-center px-4">
              <div className="text-[10px] font-black tracking-[0.32em] uppercase mb-2" style={{ color: GOLD }}>
                ◆ NOHO Mailbox ◆
              </div>
              <div className="text-3xl sm:text-5xl font-black tracking-tight mb-2" style={{ color: CREAM }}>
                Now Serving
              </div>
              <div className="text-xs sm:text-sm font-bold opacity-80 mb-6" style={{ color: CREAM }}>
                5062 Lankershim Blvd · NoHo CA · (818) 506-7744
              </div>
              <IdleTaglineRotator />
              <div className="text-[10px] font-black tracking-[0.32em] uppercase mt-8 idle-tap" style={{ color: GOLD }}>
                — Tap anywhere to begin —
              </div>
            </div>
          </div>
        )}
        {/* Cabinet decals (iter-36) — sticker-style branding plastered on the cabinet */}
        <CabinetDecals />

        {/* Confetti coin shower — keyed on saleNumber so each charge spawns a fresh round */}
        {confettiKey > 0 && <ConfettiShower key={confettiKey} />}
        {/* Brass top-rail */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="brass-rivet" />
            <span className="brass-rivet" />
            <span className="brass-rivet" />
          </div>
          <div className="text-[10px] font-black tracking-[0.32em] uppercase rail-engrave">
            ◆ NOHO Mailbox · Register ◆
          </div>
          <div className="flex items-center gap-2">
            <span className="brass-rivet" />
            <span className="brass-rivet" />
            <span className="brass-rivet" />
          </div>
        </div>

        {/* Mechanical drum counter (iter-40) — today's till total in rolling digits */}
        {till && <OdometerCounter totalCents={till.totalCents} label="Today" />}

        {/* Brass pressure gauges (iter-37) — analog needles tracking till metrics */}
        {till && (
          <GaugeCluster
            salesCount={till.count}
            avgTicketCents={till.count > 0 ? Math.round(till.totalCents / till.count) : 0}
            totalCents={till.totalCents}
          />
        )}

        {/* Promotions strip — limited-time offers as click-to-apply chips */}
        <PromoStrip promos={PROMOS} />

        {/* Macro toolbar — 8 customizable quick-add keys */}
        <MacroToolbar
          slots={macroSkus}
          catalog={catalog}
          editing={macroEditing}
          setEditing={setMacroEditing}
          swapIndex={macroSwapIndex}
          setSwapIndex={setMacroSwapIndex}
          search={macroSearch}
          setSearch={setMacroSearch}
          onAdd={(sku) => {
            const entry = catalog.find((c) => c.sku === sku);
            if (entry) addLine(entry);
          }}
          onSwap={(idx, sku) => { setMacroSlot(idx, sku); setMacroSwapIndex(null); setMacroSearch(""); }}
          onClear={(idx) => { setMacroSlot(idx, ""); setMacroSwapIndex(null); }}
          onResetDefaults={() => setMacroSkus(DEFAULT_MACRO_SKUS)}
        />

        {/* Vacuum tube indicators (iter-38) — glow above the LCD like the cabinet is warming up */}
        <VacuumTubeStack flashKey={tubeFlashKey} />

        {/* LCD strip */}
        <div ref={lcdRef} className="lcd rounded-xl px-4 py-3 sm:py-4 mb-4">
          {/* CRT overlay layers (iter-39) — vignette, vertical refresh sweep, scan-hum */}
          <div className="crt-vignette" aria-hidden />
          <div className="crt-vertical-sweep" aria-hidden />
          <div className="crt-hum" aria-hidden />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#5fb88a" }}>
              ▸ Total Due
              {cashierIdentity && cart.length === 0 && (
                <span className="ml-2 opacity-75">· {cashierIdentity.nickname.toUpperCase()}</span>
              )}
            </div>
            <div className="text-[9px] tracking-[0.2em]" style={{ color: "#5fb88a" }}>
              {cart.length === 0 ? "READY" : `${cart.length} ITEM${cart.length === 1 ? "" : "S"}`}
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <div className="text-3xl sm:text-5xl font-black lcd-cursor" style={{ fontFamily: '"Courier New", monospace' }}>
              ${(totalCents / 100).toFixed(2)}
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: "#5fb88a" }}>SUBTOTAL</div>
              <div className="text-sm sm:text-base font-bold">${(subtotalCents / 100).toFixed(2)}</div>
              {discountCents > 0 && <div className="text-[10px]" style={{ color: "#ffb87c" }}>− {fmt(discountCents)} disc</div>}
              {taxCents > 0 && <div className="text-[10px]" style={{ color: "#5fb88a" }}>+ {fmt(taxCents)} tax</div>}
              {tipCents > 0 && <div className="text-[10px]" style={{ color: "#5fb88a" }}>+ {fmt(tipCents)} tip</div>}
            </div>
          </div>
          {method === "Cash" && cashTenderedCents > 0 && (
            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[rgba(124,255,178,0.25)]">
              <div className="text-[10px] tracking-[0.2em]" style={{ color: "#5fb88a" }}>TENDERED</div>
              <div className="text-xs font-bold">{fmt(cashTenderedCents)}</div>
              <div className="text-[10px] tracking-[0.2em]" style={{ color: "#ffb87c" }}>CHANGE DUE</div>
              <div className="text-base sm:text-lg font-black" style={{ color: "#ffd97c" }}>{fmt(changeDueCents)}</div>
            </div>
          )}
        </div>

        {/* Customer-facing mini display — narrow LCD that mirrors the cart for the customer side of the counter */}
        <div className="cust-display rounded-md mb-4 px-3 py-1.5 flex items-center gap-3 overflow-hidden">
          <div className="text-[8px] font-black tracking-[0.32em] uppercase shrink-0" style={{ color: "#ffb04a" }}>
            ◀ Customer
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="cust-marquee text-[12px] font-black tracking-wide" style={{ fontFamily: '"Courier New", monospace', color: "#ffb04a" }}>
              {cart.length === 0
                ? "WELCOME TO NOHO MAILBOX  ·  HOW CAN WE HELP?  ·  "
                : cart.map((l) => `${l.quantity}× ${l.name.toUpperCase()} — ${fmt(l.unitPriceCents * l.quantity)}`).join("  ·  ") + `  ·  TOTAL ${fmt(totalCents)}  ·  `}
            </div>
          </div>
        </div>

        {/* Layout: ITEM GRID (left) · CART/RECEIPT TAPE (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,420px)] gap-4">
          {/* ── Item grid + customer ── */}
          <div className="space-y-3">
            {/* Customer attach */}
            <div className="pos-bezel rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-black tracking-[0.18em] uppercase" style={{ color: BROWN }}>
                  Customer
                </div>
                {attached && (
                  <button
                    onClick={detach}
                    className="text-[10px] font-bold underline-offset-2 hover:underline"
                    style={{ color: BROWN }}
                  >
                    Detach
                  </button>
                )}
              </div>
              {attached ? (
                <CustomerPresenceCard
                  customer={attached}
                  onWalletChanged={async () => {
                    const fresh = await getPOSCustomer(attached.id);
                    if (fresh) setAttached({ ...attached, ...fresh });
                  }}
                />
              ) : (
                <div className="relative">
                  <input
                    type="search"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search name · suite · phone · email · business…"
                    className="w-full px-3 py-2 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] text-sm font-medium focus:outline-none focus:border-[#8c6e27]"
                    style={{ color: BROWN }}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#8c6e27] bg-[#fdf7e6] shadow-xl">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => attach(c)}
                          className="block w-full text-left px-3 py-2 text-sm border-b border-[#e8d8a8] last:border-b-0 hover:bg-[#f3e7c4]"
                          style={{ color: BROWN }}
                        >
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[11px] text-text-light/70">
                            {c.suiteNumber ? <>Suite #{c.suiteNumber} · </> : null}
                            {c.email}
                            {c.phone ? <> · {c.phone}</> : null}
                            <span className="float-right">Wallet {fmt(c.walletBalanceCents)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search bar — typeahead across full catalog */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: BROWN, opacity: 0.55 }}>
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (searchResultsCatalog.length === 0) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setSearchHighlight((h) => Math.min(h + 1, searchResultsCatalog.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHighlight((h) => Math.max(h - 1, 0)); }
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    const pick = searchResultsCatalog[searchHighlight];
                    if (pick) { addLine(pick); setSearchInput(""); }
                  } else if (e.key === "Escape") {
                    setSearchInput("");
                  }
                }}
                placeholder="Search catalog · ⌘K · ↑↓ Enter to add"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] text-sm font-medium focus:outline-none focus:border-[#8c6e27]"
                style={{ color: BROWN }}
                aria-label="Search catalog"
              />
              {searchInput.length >= 2 && (
                <div
                  className="absolute z-30 left-0 right-0 mt-1 rounded-lg overflow-hidden border border-[#8c6e27] bg-[#fdf7e6] shadow-xl max-h-72 overflow-y-auto"
                >
                  {searchResultsCatalog.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-text-light/60 font-bold text-center">
                      No matches for "{searchInput}"
                    </div>
                  ) : searchResultsCatalog.map((entry, i) => (
                    <button
                      key={entry.sku}
                      onMouseEnter={() => setSearchHighlight(i)}
                      onClick={() => { addLine(entry); setSearchInput(""); searchInputRef.current?.focus(); }}
                      className="block w-full text-left px-3 py-2 text-sm border-b border-[#e8d8a8] last:border-b-0"
                      style={{
                        background: i === searchHighlight ? "#f3e7c4" : "transparent",
                        color: BROWN,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{entry.name}</div>
                          <div className="text-[10px] text-text-light/60 font-bold uppercase tracking-wider">
                            {entry.category}{entry.hint ? ` · ${entry.hint}` : ""}
                          </div>
                        </div>
                        <div className="text-base font-black tabular-nums shrink-0">${(entry.priceCents / 100).toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-3 py-1.5 text-xs font-black tracking-wide uppercase rounded-md transition-all ${
                    activeCategory === c ? "keycap-blue" : "keycap"
                  }`}
                  style={{
                    transform: activeCategory === c ? "translateY(-1px)" : undefined,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Item grid OR Custom entry */}
            {activeCategory === "Custom" ? (
              <div className="pos-bezel rounded-xl p-3">
                <div className="text-[11px] font-black tracking-[0.18em] uppercase mb-2" style={{ color: BROWN }}>
                  Custom Line
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Item description"
                    className="flex-1 px-3 py-2 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] text-sm font-medium focus:outline-none focus:border-[#8c6e27]"
                    style={{ color: BROWN }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="$0.00"
                    className="w-full sm:w-32 px-3 py-2 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] text-sm font-bold tabular-nums focus:outline-none focus:border-[#8c6e27]"
                    style={{ color: BROWN }}
                  />
                  <button
                    onClick={addCustomLine}
                    className="keycap-gold px-4 py-2 rounded-lg text-sm font-black"
                  >
                    + ADD
                  </button>
                </div>
              </div>
            ) : activeCategory === "Mailbox" ? (
              <>
                <PlanPickerGrid items={visibleItems} addLine={addLine} />
                <MailboxWall
                  data={wall}
                  loading={wallLoading}
                  attachedSuite={attached?.suiteNumber ?? null}
                  onAttachCustomer={async (id) => {
                    try {
                      const c = await getPOSCustomer(id);
                      if (c) {
                        setAttached({
                          id: c.id,
                          name: c.name,
                          suiteNumber: c.suiteNumber,
                          email: c.email,
                          walletBalanceCents: c.walletBalanceCents,
                          plan: c.plan,
                          planTerm: c.planTerm,
                          planDueDate: c.planDueDate,
                          mailboxStatus: c.mailboxStatus,
                          businessName: c.businessName,
                          boxType: c.boxType,
                          phone: c.phone,
                        });
                      }
                    } catch {}
                  }}
                />
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {visibleItems.map((entry) => (
                  <button
                    key={entry.sku}
                    onClick={(e) => addLine(entry, e)}
                    className="keycap rounded-lg p-3 text-left h-full"
                  >
                    <div className="text-[13px] leading-tight font-extrabold mb-1">{entry.name}</div>
                    <div className="flex items-end justify-between gap-1">
                      <div className="text-[10px] opacity-60 uppercase tracking-wider">
                        {entry.hint ?? entry.category}
                      </div>
                      <div className="text-base font-black tabular-nums" style={{ color: BROWN }}>
                        {fmt(entry.priceCents)}
                      </div>
                    </div>
                  </button>
                ))}
                {visibleItems.length === 0 && (
                  <div className="col-span-full text-center text-[11px] text-[#fae9c0]/70 py-4">
                    No items in this category yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Receipt tape (cart) — wrapped in TX-450 thermal printer ── */}
          <div className="space-y-3">
            <div className={`printer-shell rounded-xl p-3 ${printing ? "printing" : ""}`}>
              {/* Printer head bar */}
              <div className="printer-head flex items-center justify-between px-2 py-1.5 mb-2 rounded-md">
                <div className="flex items-center gap-1.5">
                  <span className={`printer-led ${printing ? "led-print" : "led-ready"}`} />
                  <span className="text-[8px] font-black tracking-[0.18em] uppercase" style={{ color: "#f5d6a3" }}>
                    {printing ? "Printing…" : (cart.length > 0 ? "Buffered" : "Ready")}
                  </span>
                </div>
                <div className="text-[8px] font-black tracking-[0.32em] uppercase opacity-80" style={{ color: "#f5d6a3" }}>
                  ◇ NOHO TX-450 Thermal ◇
                </div>
                <div className="flex items-center gap-1">
                  <span className="printer-spool" aria-hidden />
                  <span className="text-[8px] font-black tracking-[0.18em]" style={{ color: "#f5d6a3" }}>
                    1¾"
                  </span>
                </div>
              </div>

              {/* Printer body — tape feeds through here */}
              <div className="printer-body relative rounded-sm">
                {/* Print head sweep arm — only visible while printing */}
                {printing && <span className="print-head-arm" aria-hidden />}

                <div className={`tape rounded-md p-3 min-h-[260px] relative ${cart.length > 0 ? "tape-feed" : ""}`}>
              {/* PAID stamp — slams in from above when a charge succeeds */}
              {paidStamp && (
                <div className="paid-stamp" aria-hidden>
                  <div className="paid-stamp-ring">
                    <div className="paid-stamp-text">PAID</div>
                    <div className="paid-stamp-sub">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
                  </div>
                </div>
              )}
              <div className="text-center text-[10px] font-black tracking-[0.32em] uppercase pb-1 border-b border-dashed border-[#8c6e27]/40">
                NOHO MAILBOX · #{recent[0] ? String(recent[0].number + 1).padStart(5, "0") : "00001"}
              </div>
              <div className="text-center text-[10px] tracking-[0.18em] py-1">
                5062 LANKERSHIM BLVD · NOHO CA 91601
              </div>
              <div className="text-center text-[9px] tracking-[0.18em] pb-2 border-b border-dashed border-[#8c6e27]/40">
                (818) 506-7744
              </div>

              <div className="py-2 space-y-1.5">
                {cart.length === 0 ? (
                  <div className="text-center text-[12px] py-8 text-[#8c6e27]">
                    – tap an item to ring it up –
                  </div>
                ) : (
                  cart.map((line) => (
                    <div key={line._key} className="flex items-start gap-1 text-[11px] leading-tight">
                      <button
                        onClick={() => removeLine(line._key)}
                        className="text-[10px] w-4 h-4 leading-4 text-center rounded bg-[#f5d3d0] text-[#a40010] font-black hover:bg-[#f0a7a0]"
                        title="Remove line"
                      >
                        ×
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div className="font-bold truncate">{line.name}</div>
                          <div className="font-black tabular-nums whitespace-nowrap">
                            {fmt(line.unitPriceCents * line.quantity)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            onClick={() => changeQty(line._key, -1)}
                            className="w-5 h-5 rounded bg-[#fae9c0] border border-[#8c6e27]/40 text-[#8c6e27] font-black"
                          >−</button>
                          <span className="px-1.5 text-[10px] font-bold tabular-nums">×{line.quantity}</span>
                          <button
                            onClick={() => changeQty(line._key, +1)}
                            className="w-5 h-5 rounded bg-[#fae9c0] border border-[#8c6e27]/40 text-[#8c6e27] font-black"
                          >+</button>
                          <span className="text-[9px] opacity-60 ml-1">
                            @ {fmt(line.unitPriceCents)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-dashed border-[#8c6e27]/40 pt-2 text-[11px] space-y-0.5">
                  <Row label="Subtotal" value={fmt(subtotalCents)} />
                  {discountCents > 0 && <Row label="Discount" value={`− ${fmt(discountCents)}`} />}
                  {taxCents > 0 && <Row label="Tax" value={fmt(taxCents)} />}
                  {tipCents > 0 && <Row label="Tip" value={fmt(tipCents)} />}
                  <Row label="TOTAL" value={fmt(totalCents)} bold />
                </div>
              )}
                </div>
                {/* Tear-off perforated edge */}
                <div className="tear-bar" aria-hidden />
              </div>
            </div>

            {/* Adjustments */}
            <div className="grid grid-cols-3 gap-2">
              <Adjust label="Discount" value={discountInput} onChange={setDiscountInput} />
              <div className="relative">
                <Adjust label="Tax" value={taxInput} onChange={(v) => { if (!autoTax) setTaxInput(v); }} />
                <button
                  onClick={() => setAutoTax((v) => !v)}
                  className="absolute right-1 top-0 px-1.5 py-0.5 text-[8px] font-black tracking-[0.16em] uppercase rounded"
                  style={{
                    background: autoTax ? BLUE : "rgba(45,16,15,0.08)",
                    color: autoTax ? CREAM : BROWN,
                    border: `1px solid ${autoTax ? BLUE : "rgba(45,16,15,0.3)"}`,
                  }}
                  title={autoTax ? "Auto 9.5% LA county tax — click to disable" : "Auto-fill 9.5% LA county tax on (subtotal − discount)"}
                >
                  {autoTax ? "AUTO 9.5%" : "AUTO"}
                </button>
              </div>
              <Adjust label="Tip" value={tipInput} onChange={setTipInput} />
            </div>

            {/* Coupon code input (iter-33) */}
            <div className="mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
                  Coupon
                </span>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                  placeholder="Type code · NOHO10 · WELCOME20 · LOCAL15"
                  className="flex-1 px-3 py-1.5 rounded-md border border-[#d8c89a] bg-[#fdf7e6] text-sm font-bold tracking-wider uppercase focus:outline-none focus:border-[#8c6e27]"
                  style={{ color: BROWN, letterSpacing: "0.06em" }}
                />
                <button
                  onClick={applyCoupon}
                  className="keycap-gold px-3 py-1.5 rounded-md text-[11px] font-black tracking-wider"
                >
                  APPLY
                </button>
              </div>
              {couponMsg && (
                <div
                  key={couponMsg.key}
                  className={`coupon-msg ${couponMsg.kind === "ok" ? "ok" : "err"}`}
                >
                  {couponMsg.text}
                </div>
              )}
            </div>

            {/* Tip-percentage chips */}
            {(subtotalCents - discountCents) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[9px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
                  Tip ·
                </span>
                {[10, 15, 20, 25].map((pct) => {
                  const tippable = Math.max(0, subtotalCents - discountCents);
                  const tipCents = Math.round(tippable * pct / 100);
                  return (
                    <button
                      key={pct}
                      onClick={() => applyTipPct(pct)}
                      className="tip-chip"
                      title={`${pct}% on ${fmt(tippable)}`}
                    >
                      <span className="tip-chip-pct">{pct}%</span>
                      <span className="tip-chip-amt">${(tipCents / 100).toFixed(2)}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setTipInput("")}
                  className="tip-chip-clear"
                  title="Clear tip"
                >
                  No tip
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Payment row ──────────────────────────────────────────── */}
        <div className="mt-5 pos-bezel rounded-xl p-3 sm:p-4">
          <div className="text-[11px] font-black tracking-[0.18em] uppercase mb-2" style={{ color: BROWN }}>
            Payment Method
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <PayKey label="Cash"   active={method === "Cash"}   onClick={() => { setMethod("Cash"); playClick(); }}   tone="cash"   icon={<IconCash />} />
            <PayKey label="Zelle"  active={method === "Zelle"}  onClick={() => { setMethod("Zelle"); playClick(); }}  tone="zelle"  icon={<IconZelle />} />
            <PayKey label="Square" active={method === "Square"} onClick={() => { setMethod("Square"); playClick(); }} tone="square" icon={<IconSquare />} />
            <PayKey label="Card"   active={method === "CardOnFile"} onClick={() => { setMethod("CardOnFile"); playClick(); }} tone="card" icon={<IconCard />} />
            <PayKey label="Wallet" active={method === "Wallet"} onClick={() => { setMethod("Wallet"); playClick(); }} tone="wallet" icon={<IconWallet />} disabled={!attached} />
            <PayKey label="Custom" active={method === "Custom"} onClick={() => { setMethod("Custom"); playClick(); }} tone="custom" icon={<IconCustom />} />
          </div>

          {/* Method-specific input */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {method === "Cash" && (
              <>
                <div>
                  <Adjust label="Cash tendered" value={cashTendered} onChange={setCashTendered} bigger />
                  <QuickTenderChips
                    totalCents={totalCents}
                    onAdd={(addCents, exact) => {
                      const next = exact ? totalCents : Math.round(parseFloat(cashTendered || "0") * 100) + addCents;
                      setCashTendered((next / 100).toFixed(2));
                      playRustle();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md bg-[#fdf7e6] border border-[#8c6e27]/40 px-3 py-2">
                  <div className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: BROWN }}>Change Due</div>
                  <div className="text-xl font-black tabular-nums" style={{ color: BROWN }}>{fmt(changeDueCents)}</div>
                </div>
              </>
            )}
            {method === "Zelle" && (
              <ZellePane
                totalCents={totalCents}
                saleNumber={recent[0] ? recent[0].number + 1 : 1001}
                customerName={attached?.name ?? null}
                paymentRef={paymentRef}
                setPaymentRef={setPaymentRef}
              />
            )}
            {method === "Square" && (
              <>
                <div className="rounded-md bg-[#1f1f1f] text-white border border-black px-3 py-2 text-[12px]">
                  <div className="font-black uppercase tracking-wider mb-0.5">Square Reader</div>
                  <div className="text-[11px] opacity-90">
                    Run the card on the Square reader, then enter the last-4 / receipt # below.
                  </div>
                </div>
                <Field label="Square receipt # / last-4" value={paymentRef} onChange={setPaymentRef} placeholder="e.g. 7XQ-… or 4242" />
              </>
            )}
            {method === "CardOnFile" && (
              <>
                <div className="rounded-md bg-[#f4e1d8] border border-[#b8794a] px-3 py-2 text-[12px]" style={{ color: "#6a3a1a" }}>
                  <div className="font-black uppercase tracking-wider mb-0.5">Card on File</div>
                  <div className="text-[11px] opacity-80">
                    {attached?.name ? `${attached.name}'s` : "Customer's"} default card. Charge in Square dashboard, then enter the receipt # below.
                  </div>
                </div>
                <Field label="Square receipt #" value={paymentRef} onChange={setPaymentRef} placeholder="optional reference" />
              </>
            )}
            {method === "Wallet" && (
              <div className="md:col-span-2 rounded-md bg-[#f3e7c4] border border-[#8c6e27] px-3 py-2 text-[12px]" style={{ color: BROWN }}>
                <div className="font-black uppercase tracking-wider mb-0.5">Wallet Charge</div>
                {attached ? (
                  <div className="text-[11px]">
                    Debit <b>{fmt(totalCents)}</b> from <b>{attached.name}</b>'s wallet (balance {fmt(attached.walletBalanceCents)} → {fmt(attached.walletBalanceCents - totalCents)}).
                  </div>
                ) : (
                  <div className="text-[11px] opacity-70">Attach a customer above to use wallet payment.</div>
                )}
              </div>
            )}
            {method === "Custom" && (
              <>
                <Field
                  label="Method label"
                  value={customLabel}
                  onChange={setCustomLabel}
                  placeholder='e.g. "Venmo", "Check #1042", "ACH"'
                />
                <Field label="Reference (optional)" value={paymentRef} onChange={setPaymentRef} placeholder="confirmation #, memo…" />
              </>
            )}
          </div>
        </div>

        {/* Errors / confirmations */}
        {error && (
          <div className="mt-3 px-3 py-2 rounded-md bg-[#5a1d1c] text-[#ffd5d2] text-sm font-bold border border-[#a30010]">
            {error}
          </div>
        )}
        {confirmation && (
          <ConfirmationBanner
            saleId={confirmation.saleId}
            saleNumber={confirmation.saleNumber}
            changeDueCents={confirmation.changeDueCents}
            attachedEmail={attached?.email ?? null}
            attachedPhone={attached?.phone ?? null}
            onClose={() => setConfirmation(null)}
          />
        )}

        {/* ── Action row ───────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={clearAll}
            className="keycap-dark py-3 rounded-xl text-sm font-black tracking-wide"
          >
            CLEAR ALL
          </button>
          <button
            disabled={!confirmation}
            className="keycap py-3 rounded-xl text-sm font-black tracking-wide"
            onClick={() => confirmation && window.open(`/admin/pos/receipt/${confirmation.saleId}`, "_blank")}
          >
            REPRINT
          </button>
          <button
            onClick={parkCurrentCart}
            disabled={cart.length === 0}
            className="keycap-gold py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-1.5"
            title="Park this ticket — pin to clothesline for later"
          >
            <ParkClipIcon /> PARK
          </button>
          <button
            onClick={() => openDrawerNow()}
            className="keycap-blue py-3 rounded-xl text-sm font-black tracking-wide"
          >
            NO SALE
          </button>
          <button
            onClick={submit}
            disabled={pending || cart.length === 0}
            className={`keycap-red py-3 rounded-xl text-base font-black tracking-wide flex items-center justify-center gap-2 charge-tier ${
              totalCents >= 100000 ? "tier-jackpot" :
              totalCents >= 50000  ? "tier-big" :
              totalCents >= 10000  ? "tier-warm" :
              ""
            }`}
          >
            {pending ? "RINGING…" : (
              <>
                <span className="ring-bell" aria-hidden>🛎</span>
                CHARGE {fmt(totalCents)}
              </>
            )}
          </button>
        </div>

        {/* LED dot-matrix marquee ticker (iter-44) — scrolling store info */}
        <MarqueeTicker />
      </div>

      </div>{/* /pos-tilt-stage */}
      </div>{/* /pos-shop-room */}

      {/* ── 3D Cash drawer (slides out from under the cabinet) ────────── */}
      <CashDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        tray={cashTray}
        adjust={adjustTray}
        totalCents={trayTotalCents}
      />

      {/* ── Upcoming renewals strip (iter-23) ─────────────────────────── */}
      {upcoming.length > 0 && (
        <UpcomingStrip days={upcoming} onAttachCustomer={async (id) => {
          try {
            const c = await getPOSCustomer(id);
            if (c) {
              setAttached({
                id: c.id, name: c.name, suiteNumber: c.suiteNumber, email: c.email,
                walletBalanceCents: c.walletBalanceCents, plan: c.plan, planTerm: c.planTerm,
                planDueDate: c.planDueDate, mailboxStatus: c.mailboxStatus,
                businessName: c.businessName, boxType: c.boxType, phone: c.phone,
              });
            }
          } catch {}
        }} />
      )}

      {/* ── Recent sales ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2" style={{ color: BROWN }}>
            Recent Sales
            <span className="live-pulse text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-1 ml-1" style={{ color: "#a40010" }}>
              <span className="live-dot" /> LIVE
            </span>
          </h3>
          <span className="text-[11px] text-text-light/60">last 8 · updates 30s</span>
        </div>
        {recent.length === 0 ? (
          <div className="text-sm text-text-light/60 px-3 py-6 rounded-lg border border-dashed border-[#8c6e27]/40 bg-[#fdf7e6] text-center">
            No sales yet today. The next one will land here.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {recent.map((s) => (
              <RecentRow key={s.id} row={s} onChanged={async () => {
                const [r2, t2] = await Promise.all([getRecentSales(8), getTodaysTill()]);
                setRecent(r2); setTill(t2);
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Kiosk-mode hint */}
      {counterMode && (
        <div className="pos-kiosk-hint">
          ESC to exit Counter Mode
        </div>
      )}

      {/* Z-Report modal */}
      {zReportOpen && (
        <ZReportModal
          data={zReportData}
          loading={zLoading}
          onClose={() => setZReportOpen(false)}
        />
      )}

      {/* Hotkey overlay — Shift+? toggles */}
      {showHotkeys && <HotkeyOverlay onClose={() => setShowHotkeys(false)} />}

      {/* Live event toast (iter-16) */}
      {eventToast && (
        <EventToast event={eventToast} onClose={() => setEventToast(null)} />
      )}

      {/* Signature pad (iter-26) — high-value sales */}
      {showSignaturePad && (
        <SignaturePad
          totalCents={totalCents}
          customerName={attached?.name ?? null}
          onCancel={() => setShowSignaturePad(false)}
          onSkip={() => {
            setSignaturePng(null);
            setShowSignaturePad(false);
            // Continue submit flow without signature (admin override)
            setTimeout(() => submit(), 0);
          }}
          onConfirm={(png) => {
            setSignaturePng(png);
            setShowSignaturePad(false);
            // Continue submit flow now that signature is captured
            setTimeout(() => submit(), 0);
          }}
        />
      )}

      {/* Gift Card Sell modal (iter-35) */}
      {giftOpen && (
        <GiftCardModal
          onClose={() => setGiftOpen(false)}
          onSell={(amountCents, code, recipient) => {
            const label = recipient
              ? `Gift Card $${(amountCents / 100).toFixed(0)} to ${recipient} · Code ${code}`
              : `Gift Card $${(amountCents / 100).toFixed(0)} · Code ${code}`;
            addCustomLineNamed(label, amountCents);
            setGiftOpen(false);
          }}
        />
      )}

      {/* Calculator overlay (iter-24) */}
      {calcOpen && (
        <CalculatorOverlay
          totalCents={totalCents}
          onClose={() => setCalcOpen(false)}
          onAddToCart={(cents, label) => {
            if (!Number.isFinite(cents) || cents <= 0) return;
            addCustomLineNamed(label || "Calculator entry", cents);
            setCalcOpen(false);
          }}
        />
      )}

      {/* Undo toast (iter-22) — pops on every reversible cart mutation */}
      {undoAction && !returnsOpen && !zReportOpen && !shiftModal && !showPreview && (
        <UndoToast
          key={undoAction.id}
          label={undoAction.label}
          onUndo={performUndo}
          onDismiss={() => setUndoAction(null)}
        />
      )}

      {/* Returns/Exchange modal (iter-17) */}
      {returnsOpen && (
        <ReturnsModal
          onClose={() => setReturnsOpen(false)}
          onAfterRefund={async () => {
            // Refresh recent sales + till after a refund
            const [r2, t2] = await Promise.all([getRecentSales(8), getTodaysTill()]);
            setRecent(r2); setTill(t2);
          }}
        />
      )}

      {/* Cash count modal (iter-20) — open or close shift */}
      {shiftModal && (
        <CashCountModal
          mode={shiftModal}
          shift={shift}
          todaysCashCents={till?.cashCents ?? 0}
          onClose={() => setShiftModal(null)}
          onSubmit={(counts, totalCents) => {
            if (shiftModal === "open") {
              const next: ShiftSnapshot = {
                openedAt: new Date().toISOString(),
                openingCounts: counts,
                openingTotalCents: totalCents,
              };
              persistShift(next);
              setShiftModal(null);
            } else if (shiftModal === "close" && shift) {
              const expected = shift.openingTotalCents + (till?.cashCents ?? 0);
              const variance = totalCents - expected;
              const closed: ShiftSnapshot = {
                ...shift,
                closedAt: new Date().toISOString(),
                closingCounts: counts,
                closingTotalCents: totalCents,
                expectedCloseCents: expected,
                varianceCents: variance,
                todaysCashSalesCents: till?.cashCents ?? 0,
              };
              archiveShift(closed);
              persistShift(null);
              setShiftModal(null);
            }
          }}
        />
      )}

      {/* Receipt preview modal — only when previewMode is on + cart has items */}
      {showPreview && (
        <ReceiptPreviewModal
          cart={cart}
          customer={attached}
          subtotalCents={subtotalCents}
          discountCents={discountCents}
          taxCents={taxCents}
          tipCents={tipCents}
          totalCents={totalCents}
          method={method}
          customMethodLabel={customLabel}
          paymentRef={paymentRef}
          cashTenderedCents={cashTenderedCents}
          changeDueCents={changeDueCents}
          saleNumberPreview={recent[0] ? recent[0].number + 1 : 1001}
          pending={pending}
          onCancel={() => setShowPreview(false)}
          onConfirm={() => {
            setShowPreview(false);
            actuallyChargeNow();
          }}
        />
      )}

      {/* Always-visible "?" reveal hint */}
      <button
        onClick={() => setShowHotkeys((s) => !s)}
        className="hk-pill"
        title="Keyboard shortcuts (Shift + ?)"
        aria-label="Show keyboard shortcuts"
      >
        ?
      </button>

      {/* Cart-add flight tokens (iter-27) */}
      {flightTokens.map((t) => (
        <span
          key={t.id}
          aria-hidden
          className="flight-token"
          style={{
            top: t.fromY,
            left: t.fromX,
            ["--dx" as any]: `${t.dx}px`,
            ["--dy" as any]: `${t.dy}px`,
            background: t.color,
          }}
        >
          + {t.label}
        </span>
      ))}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: BROWN, opacity: 0.6 }}>{label}</span>
      <span className={`tabular-nums font-black ${highlight ? "text-base" : "text-sm"}`} style={{ color: BROWN }}>{value}</span>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-sm font-black pt-1 border-t border-dashed border-[#8c6e27]/50" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Adjust({ label, value, onChange, bigger }: { label: string; value: string; onChange: (v: string) => void; bigger?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black tracking-[0.18em] uppercase block mb-1" style={{ color: BROWN, opacity: 0.7 }}>
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="$0.00"
        className={`w-full px-3 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] font-bold tabular-nums focus:outline-none focus:border-[#8c6e27] ${bigger ? "py-2.5 text-lg" : "py-2 text-sm"}`}
        style={{ color: BROWN }}
      />
    </label>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black tracking-[0.18em] uppercase block mb-1" style={{ color: BROWN, opacity: 0.7 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-[#fdf7e6] border border-[#d8c89a] text-sm font-medium focus:outline-none focus:border-[#8c6e27]"
        style={{ color: BROWN }}
      />
    </label>
  );
}

function PayKey({ label, active, onClick, tone, icon, disabled }: {
  label: string; active: boolean; onClick: () => void; tone: "cash" | "zelle" | "square" | "card" | "wallet" | "custom"; icon: React.ReactNode; disabled?: boolean;
}) {
  const baseTone = active
    ? (tone === "square" ? "keycap-dark" : tone === "cash" ? "keycap-gold" : tone === "zelle" ? "keycap-blue" : tone === "card" ? "keycap-gold" : tone === "wallet" ? "keycap-gold" : "keycap-red")
    : "keycap";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseTone} py-2.5 rounded-lg text-[11px] font-black tracking-wider uppercase flex flex-col items-center justify-center gap-0.5`}
      style={{ transform: active ? "translateY(-1px)" : undefined }}
    >
      <span className="opacity-90">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function RecentRow({ row, onChanged }: { row: POSSaleRow; onChanged: () => void }) {
  const [voiding, startVoid] = useTransition();
  const [showVoid, setShowVoid] = useState(false);
  const [reason, setReason] = useState("");
  const [refundStamp, setRefundStamp] = useState(false);
  const tone =
    row.paymentMethod === "Cash" ? "cash" :
    row.paymentMethod === "Zelle" ? "zelle" :
    row.paymentMethod === "Square" ? "square" :
    row.paymentMethod === "CardOnFile" ? "card" :
    row.paymentMethod === "Wallet" ? "wallet" : "custom";

  return (
    <div
      className="rounded-lg p-3 flex items-center justify-between gap-3 relative overflow-hidden"
      style={{
        background: row.status === "Voided" ? "#f3e3e0" : "#fdf7e6",
        border: row.status === "Voided" ? "1px solid #b8606a" : "1px solid #d8c89a",
        opacity: row.status === "Voided" ? 0.7 : 1,
      }}
    >
      {refundStamp && (
        <div className="refund-stamp" aria-hidden>
          <div className="refund-stamp-ring">REFUND</div>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tabular-nums" style={{ color: BROWN }}>
            #{String(row.number).padStart(5, "0")}
          </span>
          <span className={`badge-method ${tone}`}>
            {row.paymentMethod === "CardOnFile" ? "Card" : row.paymentMethod}
            {row.customMethodLabel ? ` · ${row.customMethodLabel}` : ""}
          </span>
          {row.status === "Voided" && <span className="text-[10px] font-black uppercase" style={{ color: "#a40010" }}>VOID</span>}
        </div>
        <div className="text-sm font-bold truncate mt-0.5" style={{ color: BROWN }}>
          {row.customerName ?? "Walk-in"}
          {row.customerSuite ? <span className="text-text-light/60 font-normal"> · #{row.customerSuite}</span> : null}
          <span className="text-text-light/60 font-normal"> · {row.itemCount} item{row.itemCount === 1 ? "" : "s"}</span>
        </div>
        <div className="text-[11px] text-text-light/60">
          {row.cashierName ? `${row.cashierName} · ` : ""}
          {row.createdAt instanceof Date ? row.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : String(row.createdAt)}
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <div className="text-lg font-black tabular-nums" style={{ color: BROWN }}>{fmt(row.totalCents)}</div>
        <div className="flex items-center gap-2">
          <a href={`/admin/pos/receipt/${row.id}`} target="_blank" className="text-[11px] font-bold underline" style={{ color: BLUE }}>
            Receipt
          </a>
          {row.status === "Paid" && (
            <button
              onClick={() => setShowVoid((v) => !v)}
              className="text-[11px] font-bold underline"
              style={{ color: RED }}
            >
              Void
            </button>
          )}
        </div>
        {showVoid && row.status === "Paid" && (
          <div className="flex items-center gap-1">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="reason"
              className="px-2 py-1 text-[11px] rounded border border-[#a40010] bg-white"
            />
            <button
              disabled={voiding || !reason.trim()}
              onClick={() => startVoid(async () => {
                const r = await voidSale({ saleId: row.id, reason: reason.trim() });
                if ("success" in r) {
                  setShowVoid(false);
                  setReason("");
                  setRefundStamp(true);
                  setTimeout(() => setRefundStamp(false), 1600);
                  setTimeout(() => onChanged(), 250);
                }
              })}
              className="px-2 py-1 text-[11px] font-black rounded bg-[#a40010] text-white"
            >
              {voiding ? "…" : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mini icons ───────────────────────────────────────────────────────────

function Bell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconCash() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.4" /><path d="M6 9v6 M18 9v6" />
  </svg>
); }
function IconZelle() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10l-9 10h10" /><path d="M12 4v3 M12 17v3" />
  </svg>
); }
function IconSquare() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
); }
function IconCard() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18 M7 15h3" />
  </svg>
); }
function IconWallet() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a3 3 0 0 1 3-3h12v5" /><rect x="3" y="8" width="18" height="11" rx="2" /><circle cx="17" cy="13.5" r="1.2" />
  </svg>
); }
function IconCustom() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 14.5 9h7l-5.5 4 2 7-6-4-6 4 2-7L2.5 9h7z" />
  </svg>
); }

// Parked-ticket clothesline — strung above the cabinet on a brass wire,
// each ticket pinned by a gold paper-clip. Click ticket body → recall to
// active cart. Click red × → discard. Auto-sways on a 6s ease so the rail
// feels alive without being distracting.
function ParkedRail({
  tickets,
  onRecall,
  onDiscard,
}: {
  tickets: Array<{
    id: string; label: string;
    customer: { id: string; name: string; suiteNumber: string | null } | null;
    cart: Array<{ name: string; quantity: number; unitPriceCents: number; discountCents?: number }>;
    savedAt: number;
  }>;
  onRecall: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  // Compute total per ticket
  const enriched = tickets.map((t) => {
    const sub = t.cart.reduce((s, l) => s + (l.unitPriceCents * l.quantity - (l.discountCents ?? 0)), 0);
    const items = t.cart.reduce((s, l) => s + l.quantity, 0);
    return { ...t, sub, items };
  });

  // Randomize each ticket's clothesline rotation (-5° to +3°) deterministically by id
  function rotForId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i);
    return -5 + (Math.abs(h) % 9); // -5..3°
  }

  return (
    <div className="park-rail">
      <div className="park-rail-wire" aria-hidden />
      {tickets.length === 0 ? (
        <div className="park-empty">
          No parked tickets. Press PARK to pin a cart for later.
        </div>
      ) : (
        <div className="flex gap-3 items-start overflow-x-auto pb-2 px-1">
          {enriched.map((t) => (
            <div
              key={t.id}
              className="park-ticket"
              style={{ ["--rot" as any]: `${rotForId(t.id)}deg`, transform: `rotate(${rotForId(t.id)}deg)` }}
              onClick={() => onRecall(t.id)}
              role="button"
              tabIndex={0}
            >
              <span className="park-ticket-clip" aria-hidden>
                <ParkClipIcon />
              </span>
              <button
                className="park-ticket-discard"
                onClick={(e) => { e.stopPropagation(); onDiscard(t.id); }}
                title="Discard ticket"
                aria-label="Discard"
              >×</button>
              <div className="text-[11px] font-black tracking-tight leading-tight" style={{ color: BROWN }}>
                {t.label}
              </div>
              <div className="text-[9px] mt-0.5 font-bold tabular-nums opacity-70" style={{ color: BROWN }}>
                {t.items} item{t.items === 1 ? "" : "s"} · ${(t.sub / 100).toFixed(2)}
              </div>
              <div className="text-[8px] mt-1 font-bold uppercase tracking-[0.16em] opacity-60" style={{ color: BROWN }}>
                {(() => {
                  const m = Math.floor((Date.now() - t.savedAt) / 60_000);
                  if (m < 1) return "just now";
                  if (m === 1) return "1 min ago";
                  if (m < 60) return `${m} min ago`;
                  const h = Math.floor(m / 60);
                  return `${h}h${(m % 60).toString().padStart(2, "0")}m ago`;
                })()}
              </div>
              <div className="mt-1 text-[8px] font-black tracking-[0.18em] uppercase" style={{ color: BLUE }}>
                ↺ Tap to recall
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParkClipIcon() {
  // Gold paper-clip / binder-clip
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <defs>
        <linearGradient id="clipG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf0b4" />
          <stop offset="50%" stopColor="#c9a24a" />
          <stop offset="100%" stopColor="#5a4318" />
        </linearGradient>
      </defs>
      {/* Top loop */}
      <rect x="2" y="2" width="18" height="6" rx="2" fill="url(#clipG)" stroke="#5a4318" strokeWidth="0.8" />
      {/* Body */}
      <path d="M5 8 L5 22 M17 8 L17 22 M5 22 L17 22" stroke="url(#clipG)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Inner highlight */}
      <rect x="3.5" y="3.5" width="15" height="2" rx="1" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

// Plan-Picker grid — 3×3 grid of (Plan × Term) cells with savings vs the 3-month rate.
// Cells highlight: Business 6mo as POPULAR, Premium 14mo as BEST VALUE.
// Falls back to the regular keycap grid if catalog doesn't have all 9 plan SKUs.
function PlanPickerGrid({
  items,
  addLine,
}: {
  items: POSCatalogEntry[];
  addLine: (e: POSCatalogEntry, evt?: React.MouseEvent) => void;
}) {
  // Index by sku for fast lookup
  const map = new Map(items.map((i) => [i.sku, i] as const));

  // Pull canonical plan ids in the order they appear (basic, business, premium)
  const planIds = useMemo(() => {
    const order: string[] = [];
    for (const it of items) {
      const m = it.sku.match(/^plan:([^:]+):/);
      if (m && !order.includes(m[1])) order.push(m[1]);
    }
    return order;
  }, [items]);

  if (planIds.length === 0) {
    return (
      <div className="text-[11px] text-[#fae9c0]/70 py-4 text-center">
        No mailbox plans configured.
      </div>
    );
  }

  const TERMS: Array<{ key: 3 | 6 | 14; label: string }> = [
    { key: 3,  label: "3 mo" },
    { key: 6,  label: "6 mo" },
    { key: 14, label: "14 mo" },
  ];

  return (
    <div className="plan-grid">
      {/* Header */}
      <div className="grid grid-cols-[1fr_repeat(3,1fr)] gap-2 mb-2 px-1">
        <div className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: BROWN, opacity: 0.55 }}>
          Plan / Term
        </div>
        {TERMS.map((t) => (
          <div key={t.key} className="text-[10px] font-black tracking-[0.18em] uppercase text-center" style={{ color: BROWN, opacity: 0.55 }}>
            {t.label}
          </div>
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-2">
        {planIds.map((id) => {
          const e3 = map.get(`plan:${id}:3`);
          const e6 = map.get(`plan:${id}:6`);
          const e14 = map.get(`plan:${id}:14`);
          const baseName = e3?.name?.replace(/ · 3 mo$/, "") ?? id;
          const monthly3 = (e3?.priceCents ?? 0) / 3;
          return (
            <div key={id} className="grid grid-cols-[1fr_repeat(3,1fr)] gap-2 items-stretch">
              <div className="rounded-lg p-2 flex flex-col justify-center" style={{ background: "rgba(45,16,15,0.06)", border: "1px solid rgba(45,16,15,0.18)" }}>
                <div className="text-[14px] font-black leading-tight tracking-tight" style={{ color: BROWN }}>{baseName}</div>
                <div className="text-[10px] opacity-70 font-bold" style={{ color: BROWN }}>
                  {id === "business" ? "Most freelancers + small biz" :
                   id === "premium"  ? "High-volume / business" :
                   id === "basic"    ? "Personal + light use" :
                   "Mailbox plan"}
                </div>
              </div>
              {[e3, e6, e14].map((entry, i) => {
                if (!entry) return <div key={i} className="text-center text-[10px] text-[#fae9c0]/60 py-3">—</div>;
                const term = TERMS[i].key;
                const monthly = entry.priceCents / term;
                const saving = term === 3 ? 0 : Math.round(((monthly3 - monthly) / monthly3) * 100);
                const popular = id === "business" && term === 6;
                const best = id === "premium" && term === 14;
                const cls = `plan-cell ${popular ? "plan-cell-pop" : ""} ${best ? "plan-cell-best" : ""}`.trim();
                return (
                  <button key={entry.sku} className={cls} onClick={(e) => addLine(entry, e)} title={`${baseName} · ${TERMS[i].label} renewal`}>
                    <div className="plan-cell-term">{TERMS[i].label}</div>
                    <div className="plan-cell-price">${(entry.priceCents / 100).toFixed(0)}</div>
                    <div className="plan-cell-permo">${(monthly / 100).toFixed(2)}/mo</div>
                    {saving > 0 && (
                      <div className="plan-cell-saving">SAVE {saving}%</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-center mt-2 opacity-70 font-bold" style={{ color: BROWN }}>
        Tap a cell to add to cart · Compared to 3-month rate
      </div>
    </div>
  );
}

// Confetti coin shower — 32 falling tokens (mix of gold + silver + copper coins + green bills).
// Each token gets a randomized horizontal start, end, rotation, size, duration, and delay
// via CSS variables. Lives ~1.5s then unmounts when the parent unmounts the keyed instance.
function ConfettiShower() {
  const tokens = useMemo(() => {
    const out: Array<{
      cls: string;
      xStart: number;
      xEnd: number;
      size: number;
      rot: number;
      dur: number;
      delay: number;
    }> = [];
    for (let i = 0; i < 32; i++) {
      const r = Math.random();
      const cls =
        r < 0.42 ? "confetti-gold" :
        r < 0.65 ? "confetti-silver" :
        r < 0.82 ? "confetti-copper" :
        "confetti-bill";
      out.push({
        cls,
        xStart: Math.random() * 100,
        xEnd: Math.random() * 100,
        size: 12 + Math.random() * 14,
        rot: 240 + Math.random() * 720,
        dur: 1100 + Math.random() * 700,
        delay: Math.random() * 250,
      });
    }
    return out;
  }, []);

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 25 }}
    >
      {tokens.map((t, i) => (
        <span
          key={i}
          className={`confetti-coin ${t.cls}`}
          style={{
            left: `calc(${t.xStart}% - ${t.size / 2}px)`,
            ["--x-start" as any]: "0px",
            ["--x-end" as any]: `${(t.xEnd - t.xStart) * 0.8}px`,
            ["--size" as any]: `${t.size}px`,
            ["--rot" as any]: `${t.rot}deg`,
            ["--dur" as any]: `${t.dur}ms`,
            ["--delay" as any]: `${t.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Quick-tender bill chips — under cash field. Six chips: EXACT, $5, $10, $20, $50, $100.
// Click → adds amount to tendered (or sets to total for EXACT). On click, a mini bill flies upward
// and dissolves; played with a paper-rustle sound for tactile feedback.
function QuickTenderChips({
  totalCents,
  onAdd,
}: {
  totalCents: number;
  onAdd: (addCents: number, exact: boolean) => void;
}) {
  const [flyKey, setFlyKey] = useState<number | null>(null);
  const denoms: Array<{ label: string; cents: number; from: string; to: string; ink: string; border: string }> = [
    { label: "$5",   cents: 500,   from: "#d2c4ad", to: "#a89e85", ink: "#221b10", border: "#544a35" },
    { label: "$10",  cents: 1000,  from: "#bca588", to: "#9e8868", ink: "#251a0e", border: "#5a4326" },
    { label: "$20",  cents: 2000,  from: "#a8b89e", to: "#86977c", ink: "#152018", border: "#3a4a30" },
    { label: "$50",  cents: 5000,  from: "#cebd9a", to: "#a89378", ink: "#2c2113", border: "#594a30" },
    { label: "$100", cents: 10000, from: "#bcccae", to: "#94a883", ink: "#1a2a14", border: "#3f5230" },
  ];
  return (
    <div className="mt-2">
      <div className="text-[9px] font-black tracking-[0.18em] uppercase mb-1" style={{ color: BROWN, opacity: 0.6 }}>
        Quick-Tender
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        <button
          data-exact="true"
          className="tender-chip rounded-md py-2 text-[11px] tracking-wide"
          onClick={() => { onAdd(totalCents, true); setFlyKey(0); setTimeout(() => setFlyKey(null), 380); }}
          title="Tender exact change"
        >
          EXACT
        </button>
        {denoms.map((d, i) => (
          <button
            key={d.label}
            className="tender-chip rounded-md py-2 text-[12px] tracking-wide relative overflow-visible"
            style={{
              ["--bill-from" as any]: d.from,
              ["--bill-to" as any]: d.to,
              ["--bill-border" as any]: d.border,
              ["--bill-ink" as any]: d.ink,
              background: `linear-gradient(180deg, ${d.from} 0%, ${d.to} 100%)`,
              color: d.ink,
              borderColor: d.border,
            }}
            onClick={() => { onAdd(d.cents, false); setFlyKey(i + 1); setTimeout(() => setFlyKey(null), 380); }}
            title={`Add ${d.label} to tendered`}
          >
            <span style={{ position: "relative", zIndex: 2 }}>+ {d.label}</span>
            {flyKey === i + 1 && (
              <span
                aria-hidden
                className="bill-fly"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${d.from} 0%, ${d.to} 100%)`,
                  border: `1px solid ${d.border}`,
                  color: d.ink,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  zIndex: 5,
                }}
              >
                {d.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Zelle payment pane — branded purple card with:
//  • Big amount-due display
//  • Memo code (NOHO-#####) the customer should type into Zelle's memo field
//  • Three copy-to-clipboard rows (email · amount · memo)
//  • QR code that encodes a `mailto:` link with subject pre-filled — customer can scan to
//    auto-compose a confirmation email AFTER they've sent the Zelle in their bank app
//    (real Zelle deep links require partner bank integration, so we instead
//    encode the verification round-trip)
//  • Confirm code input field
function ZellePane({
  totalCents,
  saleNumber,
  customerName,
  paymentRef,
  setPaymentRef,
}: {
  totalCents: number;
  saleNumber: number;
  customerName: string | null;
  paymentRef: string;
  setPaymentRef: (v: string) => void;
}) {
  const memo = `NOHO-${String(saleNumber).padStart(5, "0")}`;
  const [copied, setCopied] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  // Build a mailto: payload that the customer can scan post-Zelle to send us
  // a confirmation note with all the right metadata.
  const subject = `Zelle paid · ${memo} · $${(totalCents / 100).toFixed(2)}`;
  const body = `Hi NOHO Mailbox — confirming Zelle payment.\n\nReceipt: ${memo}\nAmount: $${(totalCents / 100).toFixed(2)}\n${customerName ? `Customer: ${customerName}\n` : ""}\nThanks!`;
  const mailtoUrl = `mailto:${ZELLE_RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Generate QR via the qrcode lib (already in deps). Async dataURL.
  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((m) => {
      m.toDataURL(mailtoUrl, {
        margin: 1,
        width: 200,
        color: { dark: "#2a1465", light: "#ffffffff" },
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setQrSrc(url);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [mailtoUrl]);

  function copy(label: string, text: string) {
    try {
      navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1400);
    } catch {}
  }

  return (
    <div className="md:col-span-2 zelle-card rounded-lg p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 sm:gap-4">
      {/* QR side */}
      <div className="flex flex-col items-center justify-center">
        <div className="rounded-md p-2" style={{ background: "#fff", border: "2px solid rgba(255,255,255,0.4)" }}>
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={`Zelle confirmation QR for ${memo}`} width={160} height={160} style={{ display: "block", width: 160, height: 160 }} />
          ) : (
            <div style={{ width: 160, height: 160 }} className="bg-white" />
          )}
        </div>
        <div className="text-[9px] tracking-[0.18em] uppercase font-black mt-1.5 opacity-90">
          Scan to email confirm
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[9px] font-black tracking-[0.32em] uppercase opacity-80 flex items-center gap-1">
              <ZelleZ /> Zelle Pay · NOHO Mailbox
            </div>
            <div className="text-[26px] sm:text-[30px] font-black leading-none tabular-nums mt-1">
              ${(totalCents / 100).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black tracking-[0.18em] uppercase opacity-80">Memo</div>
            <div className="text-[18px] font-black tabular-nums" style={{ fontFamily: '"Courier New", monospace' }}>
              {memo}
            </div>
          </div>
        </div>

        <CopyRow label="Email" value={ZELLE_RECIPIENT_EMAIL} copied={copied === "email"} onCopy={() => copy("email", ZELLE_RECIPIENT_EMAIL)} />
        <CopyRow label="Amount" value={`$${(totalCents / 100).toFixed(2)}`} copied={copied === "amount"} onCopy={() => copy("amount", (totalCents / 100).toFixed(2))} />
        <CopyRow label="Memo" value={memo} copied={copied === "memo"} onCopy={() => copy("memo", memo)} />

        <input
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
          placeholder="Zelle confirm code (optional)"
          className="w-full rounded-md px-3 py-1.5 text-[12px] font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.92)",
            color: "#2a1465",
            border: "1px solid rgba(255,255,255,0.4)",
          }}
        />

        <div className="text-[10px] opacity-90 leading-snug">
          Show the customer this card. Once Zelle says <b>“Sent”</b>, paste the confirmation code above and tap Charge.
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="zelle-row">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[9px] font-black tracking-[0.18em] uppercase opacity-70 shrink-0">{label}</span>
        <span className="truncate font-bold">{value}</span>
      </div>
      <button onClick={onCopy} className={`zelle-copy-btn ${copied ? "copied" : ""}`}>
        {copied ? "COPIED ✓" : "COPY"}
      </button>
    </div>
  );
}

function ZelleZ() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10l-9 10h10" />
      <path d="M12 4v3 M12 17v3" />
    </svg>
  );
}

// ─── Mailbox Wall (iter-13) ─────────────────────────────────────────────
function MailboxWall({
  data,
  loading,
  attachedSuite,
  onAttachCustomer,
}: {
  data: MailboxWallData | null;
  loading: boolean;
  attachedSuite: string | null;
  onAttachCustomer: (customerId: string) => void;
}) {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="wall-frame mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[10px] font-black tracking-[0.32em] uppercase rail-engrave">
          ◆ Mailbox Wall · 5062 Lankershim ◆
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] tracking-wide">
          {data && (
            <>
              <span className="wall-legend"><span className="wall-legend-dot" style={{ background: "#ebd4a8", borderColor: "#6b4a26" }} />{data.occupied} active</span>
              <span className="wall-legend"><span className="wall-legend-dot" style={{ background: "#f0c878", borderColor: GOLD_DARK }} />{data.dueSoon} due</span>
              <span className="wall-legend"><span className="wall-legend-dot" style={{ background: "#f0a7a0", borderColor: "#a40010" }} />{data.overdue} overdue</span>
              <span className="wall-legend"><span className="wall-legend-dot" style={{ background: "rgba(45,16,15,0.32)", borderColor: "rgba(201,162,74,0.4)" }} />{data.vacant} vacant</span>
            </>
          )}
        </div>
      </div>
      {loading || !data ? (
        <div className="text-center py-8 text-[11px] font-bold tracking-wide" style={{ color: "rgba(247,230,194,0.7)" }}>
          Painting the wall…
        </div>
      ) : data.cells.length === 0 ? (
        <div className="text-center py-8 text-[11px] font-bold tracking-wide" style={{ color: "rgba(247,230,194,0.7)" }}>
          No suites configured yet.
        </div>
      ) : (
        <div className="wall-grid">
          {data.cells.map((cell, i) => (
            <button
              key={cell.suiteNumber}
              className={`door ${cell.status}${attachedSuite === cell.suiteNumber ? " door-active" : ""}`}
              style={{ animationDelay: `${Math.min(i, 64) * 8}ms` }}
              disabled={cell.status === "vacant"}
              onClick={() => cell.customerId && onAttachCustomer(cell.customerId)}
              title={cell.customerName ? `Suite #${cell.suiteNumber} · ${cell.customerName}` : `Suite #${cell.suiteNumber} · vacant`}
            >
              <span className="door-num">#{cell.suiteNumber}</span>
              {cell.initials ? (
                <span className="door-initials">{cell.initials}</span>
              ) : (
                <span className="text-[14px] opacity-30 font-black leading-none">·</span>
              )}
              <span className="door-pill" style={{
                background:
                  cell.status === "overdue"  ? "#a40010" :
                  cell.status === "due_soon" ? GOLD :
                  cell.status === "suspended"? "#5a5a5a" :
                  cell.status === "held"     ? BLUE :
                  cell.status === "active"   ? "#2a8a2a" :
                  "transparent",
                opacity: cell.status === "vacant" ? 0 : 1,
              }} />
              <span className="door-tip">
                #{cell.suiteNumber} · {cell.customerName ?? "Vacant"}
                {cell.plan ? ` · ${cell.plan}` : ""}
                {cell.daysToRenew != null
                  ? cell.daysToRenew < 0
                    ? ` · ${Math.abs(cell.daysToRenew)}d OVERDUE`
                    : cell.daysToRenew === 0
                      ? ` · Due today`
                      : ` · ${cell.daysToRenew}d to renew`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="text-[9px] mt-2 opacity-60 font-bold tracking-wide text-center" style={{ color: "rgba(247,230,194,0.7)" }}>
        Tap an occupied door to auto-attach that customer to the cart
      </div>
    </div>
  );
}

// ─── Signature Pad (iter-26) ────────────────────────────────────────────
// Canvas-based signature input shown for high-value sales (≥$200). Captures
// pointer events (mouse + touch) and stores as base64 PNG. Three exits:
// Cancel (back to register), Skip (admin override, no signature stored), or
// Confirm (signature → notes field on the sale).
function SignaturePad({
  totalCents,
  customerName,
  onCancel,
  onSkip,
  onConfirm,
}: {
  totalCents: number;
  customerName: string | null;
  onCancel: () => void;
  onSkip: () => void;
  onConfirm: (png: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Setup canvas — match canvas pixel size to displayed CSS size for crisp lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a3e48";
    ctx.lineWidth = 2.4;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pointerPos(e);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (isEmpty) setIsEmpty(false);
  }

  function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastRef.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch {}
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
  }

  function handleConfirm() {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const png = canvas.toDataURL("image/png");
    onConfirm(png);
  }

  // ESC cancels
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="sig-overlay">
      <div className="sig-card">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase" style={{ color: "#a40010" }}>
              ◆ Signature Required ◆
            </div>
            <div className="text-2xl font-black tracking-tight">
              Customer signature for {fmt(totalCents)}
            </div>
            <div className="text-[11px] opacity-70 font-bold mt-0.5">
              {customerName ? `${customerName} · please sign below` : "Please sign below to authorize this charge"}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[10px] font-black tracking-wider px-3 py-1.5 rounded"
            style={{ background: "rgba(45,16,15,0.1)", color: BROWN, border: "1px solid #5a4318" }}
          >
            CANCEL · ESC
          </button>
        </div>

        <div className={`sig-canvas-wrap ${isEmpty ? "sig-empty" : ""}`}>
          <canvas
            ref={canvasRef}
            className="sig-canvas"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
          />
          <div className="sig-line" />
          <div className="sig-x">×</div>
          <div className="sig-watermark">— Sign here —</div>
        </div>

        <div className="text-[10px] mb-2 opacity-65 font-bold tracking-wider uppercase text-center" style={{ color: BROWN }}>
          Threshold for signature: $200.00 · Captured signature is stored with the sale
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={clearCanvas} className="keycap-dark py-3 rounded-xl text-sm font-black tracking-wide">
            CLEAR
          </button>
          <button onClick={onSkip} className="keycap py-3 rounded-xl text-sm font-black tracking-wide" title="Admin override — proceed without signature">
            SKIP
          </button>
          <button
            onClick={handleConfirm}
            disabled={isEmpty}
            className="keycap-red py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
            style={{ opacity: isEmpty ? 0.5 : 1, cursor: isEmpty ? "not-allowed" : "pointer" }}
          >
            CONFIRM SIGNATURE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Bell (iter-25) ─────────────────────────────────────────────
// Brass bell mounted above the cabinet — clicking swings the bell + plays
// a ding + increments the daily counter. Sparkle stars pop briefly on each
// click to underline the moment. Counter resets at midnight.
function ServiceBell({ ringKey, count, onRing }: { ringKey: number; count: number; onRing: () => void }) {
  // Sparkles re-mount on every ring (key={ringKey}) so the keyframes replay.
  const showSparkles = ringKey > 0;
  return (
    <div className="bell-stage" aria-label="Service bell">
      <button
        className="bell-mount"
        onClick={onRing}
        title="Ring the bell"
        aria-label="Ring the service bell"
      >
        <span
          className={`bell-svg-wrap ${ringKey > 0 ? "swinging" : ""}`}
          key={ringKey}
        >
          <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden>
            <defs>
              <linearGradient id="bellBrassGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3c0" />
                <stop offset="35%" stopColor="#f0c878" />
                <stop offset="65%" stopColor="#c9a24a" />
                <stop offset="100%" stopColor="#8c6e27" />
              </linearGradient>
              <radialGradient id="bellRimGrad" cx="50%" cy="80%" r="50%">
                <stop offset="0%" stopColor="#fffceb" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#f0c878" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Mount strap (top) */}
            <rect x="29" y="0" width="6" height="6" rx="1" fill="#5a3d20" />
            <rect x="27" y="4" width="10" height="3" rx="1" fill="#8c6e27" />
            {/* Bell body — chamber + flare */}
            <path
              d="M32 8 C42 8 50 18 50 30 V44 H14 V30 C14 18 22 8 32 8 Z"
              fill="url(#bellBrassGrad)"
              stroke="#5a3d20"
              strokeWidth="1.4"
            />
            {/* Highlight inside */}
            <path
              d="M22 14 C26 11 32 11 38 13 C36 22 32 28 28 30 C24 26 22 20 22 14 Z"
              fill="rgba(255,255,255,0.32)"
            />
            {/* Rim */}
            <ellipse cx="32" cy="44" rx="18" ry="3" fill="url(#bellRimGrad)" />
            <rect x="13" y="44" width="38" height="3" rx="1" fill="#8c6e27" />
            <rect x="11" y="46" width="42" height="2" rx="1" fill="#5a3d20" />
            {/* Clapper */}
            <line x1="32" y1="44" x2="32" y2="50" stroke="#3a2510" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="32" cy="51" r="3" fill="#5a3d20" stroke="#2a160c" strokeWidth="0.8" />
            {/* Tiny engraved letters on the bell — like real service bells */}
            <text x="32" y="34" textAnchor="middle" fontSize="6" fontWeight="900" fill="#5a3d20" opacity="0.75" letterSpacing="0.08em">NOHO</text>
          </svg>
        </span>
        {showSparkles && (
          <>
            <span key={`s1-${ringKey}`} className="bell-sparkle s1">✦</span>
            <span key={`s2-${ringKey}`} className="bell-sparkle s2">✦</span>
            <span key={`s3-${ringKey}`} className="bell-sparkle s3">✦</span>
          </>
        )}
        {count > 0 && (
          <span className="bell-count" title={`Rang ${count} time${count === 1 ? "" : "s"} today`}>
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Calculator Overlay (iter-24) ───────────────────────────────────────
// Slide-in panel from the right with a chunky keycap-styled calculator.
// LCD-themed display, memory functions (M+/M-/MR/MC), percentage shortcut,
// and "USE TOTAL" / "ADD TO CART" actions that integrate with the cart.
function CalculatorOverlay({
  totalCents,
  onClose,
  onAddToCart,
}: {
  totalCents: number;
  onClose: () => void;
  onAddToCart: (cents: number, label?: string) => void;
}) {
  const [display, setDisplay] = useState("0");
  const [history, setHistory] = useState<string>("");
  const [pending, setPending] = useState<{ op: string; lhs: number } | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [memory, setMemory] = useState(0);

  function pressDigit(d: string) {
    if (overwrite || display === "0") {
      setDisplay(d);
      setOverwrite(false);
    } else {
      if (display.length < 14) setDisplay(display + d);
    }
  }

  function pressDot() {
    if (overwrite) {
      setDisplay("0.");
      setOverwrite(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function pressOp(op: string) {
    const cur = parseFloat(display) || 0;
    if (pending && !overwrite) {
      const result = compute(pending.lhs, cur, pending.op);
      setDisplay(formatNumber(result));
      setHistory(`${formatNumber(result)} ${op}`);
      setPending({ op, lhs: result });
    } else {
      setHistory(`${formatNumber(cur)} ${op}`);
      setPending({ op, lhs: cur });
    }
    setOverwrite(true);
  }

  function pressEquals() {
    if (!pending) return;
    const cur = parseFloat(display) || 0;
    const result = compute(pending.lhs, cur, pending.op);
    setDisplay(formatNumber(result));
    setHistory(`${formatNumber(pending.lhs)} ${pending.op} ${formatNumber(cur)} =`);
    setPending(null);
    setOverwrite(true);
  }

  function pressClear() {
    setDisplay("0");
    setHistory("");
    setPending(null);
    setOverwrite(true);
  }

  function pressBackspace() {
    if (overwrite || display === "0") return;
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
      setOverwrite(true);
    } else {
      setDisplay(display.slice(0, -1));
    }
  }

  function pressPercent() {
    const cur = parseFloat(display) || 0;
    if (pending) {
      // X + Y% means add Y% of X
      const pct = pending.lhs * cur / 100;
      setDisplay(formatNumber(pct));
    } else {
      setDisplay(formatNumber(cur / 100));
    }
    setOverwrite(true);
  }

  function memOp(op: "MC" | "MR" | "M+" | "M-") {
    const cur = parseFloat(display) || 0;
    if (op === "MC") setMemory(0);
    else if (op === "MR") { setDisplay(formatNumber(memory)); setOverwrite(true); }
    else if (op === "M+") setMemory(memory + cur);
    else if (op === "M-") setMemory(memory - cur);
  }

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressDigit(e.key); return; }
      if (e.key === ".") { e.preventDefault(); pressDot(); return; }
      if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        e.preventDefault();
        const map: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
        pressOp(map[e.key] ?? e.key);
        return;
      }
      if (e.key === "Enter" || e.key === "=") { e.preventDefault(); pressEquals(); return; }
      if (e.key === "Backspace") { e.preventDefault(); pressBackspace(); return; }
      if (e.key === "%") { e.preventDefault(); pressPercent(); return; }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); pressClear(); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, display, overwrite, memory]);

  function useTotal() {
    if (totalCents <= 0) return;
    setDisplay(formatNumber(totalCents / 100));
    setHistory(`Cart total · ${formatNumber(totalCents / 100)}`);
    setOverwrite(true);
  }
  function addToCart() {
    const cur = parseFloat(display) || 0;
    const cents = Math.round(cur * 100);
    onAddToCart(cents, `Calculator: ${formatNumber(cur)}`);
  }

  return (
    <div className="calc-overlay" onClick={onClose}>
      <div className="calc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black tracking-[0.32em] uppercase rail-engrave">
              ◆ Counter Calculator
            </div>
            <div className="text-[10px] opacity-70 font-bold">⌨ keys + Enter · Esc to close</div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] font-black tracking-wider px-2 py-1 rounded"
            style={{ background: "rgba(255,255,255,0.08)", color: CREAM, border: "1px solid var(--cab-trim)" }}
          >
            ESC
          </button>
        </div>

        <div className="calc-display relative">
          {memory !== 0 && (
            <span className="calc-mem-tag">M · {formatNumber(memory)}</span>
          )}
          <div className="calc-history">{history || " "}</div>
          <div className="calc-current">{display}</div>
        </div>

        <div className="calc-grid">
          {/* Memory row */}
          <button className="calc-key mem" onClick={() => memOp("MC")}>MC</button>
          <button className="calc-key mem" onClick={() => memOp("MR")}>MR</button>
          <button className="calc-key mem" onClick={() => memOp("M+")}>M+</button>
          <button className="calc-key mem" onClick={() => memOp("M-")}>M−</button>

          {/* Clear row */}
          <button className="calc-key clr" onClick={pressClear}>C</button>
          <button className="calc-key clr" onClick={pressBackspace}>⌫</button>
          <button className="calc-key op" onClick={pressPercent}>%</button>
          <button className="calc-key op" onClick={() => pressOp("÷")}>÷</button>

          <button className="calc-key" onClick={() => pressDigit("7")}>7</button>
          <button className="calc-key" onClick={() => pressDigit("8")}>8</button>
          <button className="calc-key" onClick={() => pressDigit("9")}>9</button>
          <button className="calc-key op" onClick={() => pressOp("×")}>×</button>

          <button className="calc-key" onClick={() => pressDigit("4")}>4</button>
          <button className="calc-key" onClick={() => pressDigit("5")}>5</button>
          <button className="calc-key" onClick={() => pressDigit("6")}>6</button>
          <button className="calc-key op" onClick={() => pressOp("−")}>−</button>

          <button className="calc-key" onClick={() => pressDigit("1")}>1</button>
          <button className="calc-key" onClick={() => pressDigit("2")}>2</button>
          <button className="calc-key" onClick={() => pressDigit("3")}>3</button>
          <button className="calc-key op" onClick={() => pressOp("+")}>+</button>

          <button className="calc-key" style={{ gridColumn: "span 2" }} onClick={() => pressDigit("0")}>0</button>
          <button className="calc-key" onClick={pressDot}>.</button>
          <button className="calc-key eq" onClick={pressEquals}>=</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="calc-key act"
            onClick={useTotal}
            disabled={totalCents <= 0}
            style={{ opacity: totalCents <= 0 ? 0.5 : 1, cursor: totalCents <= 0 ? "not-allowed" : "pointer" }}
            title="Pull cart total into the display"
          >
            USE TOTAL
          </button>
          <button
            className="calc-key act"
            onClick={addToCart}
            title="Add the displayed value as a new custom line"
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

function compute(a: number, b: number, op: string): number {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b === 0 ? NaN : a / b;
  return b;
}
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  // Strip trailing zeros for clean display
  const str = n.toFixed(8);
  return parseFloat(str).toString();
}

function PopOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6 M20 4l-9 9 M5 8v11h11v-7" />
    </svg>
  );
}

function CalcIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <rect x="7" y="6" width="10" height="3" rx="0.5" />
      <path d="M8 13h.01 M12 13h.01 M16 13h.01 M8 17h.01 M12 17h.01 M16 17h.01" />
    </svg>
  );
}

// ─── Upcoming Renewals Strip (iter-23) ──────────────────────────────────
// 14-day horizontal calendar showing how many customers are due to renew
// each day. Heatmap-tinted by load. Click any day → popover of customers;
// click a customer → auto-attach to cart.
function UpcomingStrip({
  days,
  onAttachCustomer,
}: {
  days: UpcomingRenewalDay[];
  onAttachCustomer: (customerId: string) => void;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const totalUpcoming = days.reduce((s, d) => s + d.count, 0);

  // Map count to a heatmap intensity (cream → gold)
  function tint(d: UpcomingRenewalDay): string | undefined {
    if (d.count === 0 || d.isToday || d.isPast) return undefined;
    const t = d.count / max; // 0..1
    // Blend between #fff5dd (calm) and a warmer #f0c878 by intensity
    return `linear-gradient(180deg, ${mix("#fff5dd", "#f0c878", t)} 0%, ${mix("#fae9c0", "#e6b66a", t)} 100%)`;
  }

  return (
    <div className="up-strip">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-black tracking-tight" style={{ color: BROWN }}>
          Upcoming Renewals · 14 days
        </h3>
        <span className="text-[11px] font-bold opacity-60" style={{ color: BROWN }}>
          {totalUpcoming} due in window
        </span>
      </div>
      <div className="up-grid">
        {days.map((d, i) => {
          const isExpanded = expandedDate === d.date;
          const cls = `up-day ${d.isToday ? "today" : ""} ${d.isPast ? "past" : ""} ${d.count === 0 ? "empty" : ""} ${isExpanded ? "expanded" : ""}`.trim();
          const bg = isExpanded ? undefined : tint(d);
          return (
            <button
              key={d.date}
              className={cls}
              style={{ background: bg, animationDelay: `${i * 25}ms` }}
              onClick={() => setExpandedDate(isExpanded ? null : d.date)}
              title={`${d.weekday} ${d.dayOfMonth} · ${d.count} renewal${d.count === 1 ? "" : "s"}`}
            >
              <div className="up-day-weekday">{d.weekday}</div>
              <div className="up-day-num">{d.dayOfMonth}</div>
              {d.count > 0 ? (
                <div className="up-day-count">{d.count}</div>
              ) : (
                <div className="text-[10px] mt-1 opacity-30">—</div>
              )}
              {d.isPast && (
                <div className="text-[8px] font-black tracking-[0.18em] uppercase opacity-80 mt-0.5">
                  + Overdue
                </div>
              )}

              {isExpanded && d.customers.length > 0 && (
                <div className="up-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="text-[9px] font-black tracking-[0.18em] uppercase opacity-65 mb-1" style={{ color: BROWN }}>
                    {d.weekday} {d.dayOfMonth} · {d.count} renewal{d.count === 1 ? "" : "s"}
                  </div>
                  <div className="space-y-0.5 max-h-72 overflow-y-auto">
                    {d.customers.map((c) => (
                      <div
                        key={c.id}
                        className="up-customer"
                        onClick={(e) => { e.stopPropagation(); onAttachCustomer(c.id); setExpandedDate(null); }}
                      >
                        <span className="truncate">
                          {c.name}
                          {c.suiteNumber ? <span style={{ color: BLUE, fontWeight: 800 }}> · #{c.suiteNumber}</span> : null}
                        </span>
                        <span className="opacity-60 text-[10px]">
                          {c.plan ?? "—"}{c.planTerm ? ` · ${c.planTerm}m` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  {d.customers.length >= 12 && (
                    <div className="text-[9px] mt-1 opacity-60 font-bold tracking-wider uppercase text-center" style={{ color: BROWN }}>
                      Showing top 12 of {d.count}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tiny helper: linearly interpolate two #rrggbb colors
function mix(aHex: string, bHex: string, t: number): string {
  const ax = parseHex(aHex);
  const bx = parseHex(bHex);
  const r = Math.round(ax[0] + (bx[0] - ax[0]) * t);
  const g = Math.round(ax[1] + (bx[1] - ax[1]) * t);
  const b = Math.round(ax[2] + (bx[2] - ax[2]) * t);
  return `rgb(${r},${g},${b})`;
}
function parseHex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

// ─── Undo Toast (iter-22) ───────────────────────────────────────────────
// Floating bottom-center pill that appears on every reversible cart mutation.
// Click anywhere on the toast → undo. Tiny X-button → dismiss without undo.
// SVG ring animates a 5-second countdown via stroke-dashoffset; when the
// CSS animation completes, the parent unmounts the toast via setTimeout.
function UndoToast({
  label,
  onUndo,
  onDismiss,
}: {
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="undo-toast"
      onClick={onUndo}
      role="button"
      tabIndex={0}
      title="Click to undo · auto-dismisses in 5s"
    >
      <span className="undo-cta">↶ Undo</span>
      <span className="undo-label">{label}</span>
      <span className="undo-ring" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 36 36">
          <circle className="undo-ring-track" cx="18" cy="18" r="15.9" />
          <circle className="undo-ring-fill" cx="18" cy="18" r="15.9" pathLength={100} />
        </svg>
      </span>
      <button
        className="undo-dismiss"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Gift Card Sell Modal (iter-35) ─────────────────────────────────────
// Pick denomination ($25/$50/$100/$200) or custom, optional recipient name,
// generate a 12-char code, then ring up. The receipt prints the code so the
// customer (or recipient) can redeem at any future visit.
function GiftCardModal({
  onClose,
  onSell,
}: {
  onClose: () => void;
  onSell: (amountCents: number, code: string, recipient: string) => void;
}) {
  const PRESETS = [25, 50, 100, 200];
  const [amountCents, setAmountCents] = useState<number>(2500); // default $25
  const [customAmount, setCustomAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [code, setCode] = useState(() => generateGiftCode());

  function generateGiftCode(): string {
    // 8-char alphanumeric (no ambiguous chars), formatted GC-XXXX-XXXX
    const ALPHA = "ACDEFGHJKLMNPQRTUVWXYZ234679";
    let s = "";
    for (let i = 0; i < 8; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    return `GC-${s.slice(0, 4)}-${s.slice(4)}`;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleConfirm() {
    let cents = amountCents;
    if (customAmount.trim()) {
      const n = Math.round(parseFloat(customAmount) * 100);
      if (Number.isFinite(n) && n > 0) cents = n;
    }
    if (cents <= 0) return;
    onSell(cents, code, recipient.trim());
  }

  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;

  return (
    <div className="gift-overlay" onClick={onClose}>
      <div className="gift-card-shell" onClick={(e) => e.stopPropagation()}>
        <div className="gift-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.32em", color: GOLD, opacity: 0.95 }}>
                ◆ NOHO Mailbox
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>
                Gift Card
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                Mail · Notary · Shipping · Supplies
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", opacity: 0.7 }}>
                FACE VALUE
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: GOLD }}>
                {customAmount.trim() ? `$${parseFloat(customAmount).toFixed(0)}` : fmt(amountCents)}
              </div>
            </div>
          </div>

          {/* Code band */}
          <div className="gift-band">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.32em", color: GOLD, opacity: 0.85 }}>
                  REDEMPTION CODE
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.18em", marginTop: 2 }}>
                  {code}
                </div>
              </div>
              <button
                onClick={() => setCode(generateGiftCode())}
                title="Re-generate code"
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: "rgba(247,230,194,0.15)",
                  color: CREAM,
                  border: "1px solid rgba(247,230,194,0.4)",
                  cursor: "pointer",
                }}
              >
                ↻ NEW
              </button>
            </div>
          </div>

          {/* Bottom strip */}
          <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 700, letterSpacing: "0.04em" }}>
            Redeem at NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601
          </div>
        </div>

        <div style={{
          marginTop: 16,
          padding: 16,
          background: "linear-gradient(180deg, " + CREAM + " 0%, #ebd4a8 100%)",
          border: `1px solid ${GOLD_DARK}`,
          borderRadius: 14,
          color: BROWN,
        }}>
          <div className="text-[11px] font-black tracking-[0.18em] uppercase opacity-65 mb-2">
            Choose denomination
          </div>
          <div className="gift-amount-row">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setAmountCents(p * 100); setCustomAmount(""); }}
                className={`gift-amount-pill ${(!customAmount.trim() && amountCents === p * 100) ? "active" : ""}`}
              >
                ${p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase opacity-65">Custom amount</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-base font-black">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1 rounded border border-[#8c6e27] bg-white text-sm font-bold tabular-nums focus:outline-none"
                  style={{ color: BROWN }}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] font-black tracking-[0.18em] uppercase opacity-65">Recipient (optional)</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Mom"
                maxLength={28}
                className="w-full mt-0.5 px-2 py-1 rounded border border-[#8c6e27] bg-white text-sm font-medium focus:outline-none"
                style={{ color: BROWN }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={onClose} className="keycap-dark py-3 rounded-xl text-sm font-black tracking-wide">
              CANCEL
            </button>
            <button onClick={handleConfirm} className="keycap-gold py-3 rounded-xl text-sm font-black tracking-wide">
              ADD TO CART
            </button>
          </div>
          <div className="text-[10px] mt-2 opacity-70 text-center font-bold tracking-wider">
            Customer pays at checkout. Code prints on the receipt.
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 13h18 M12 9v11" />
      <path d="M12 9c-2-3-7-3-7 0 0 2 3 2 7 0 z M12 9c2-3 7-3 7 0 0 2-3 2-7 0 z" />
    </svg>
  );
}

// ─── Streak Chip (iter-34) ──────────────────────────────────────────────
// Header chip showing consecutive days with at least one sale. Tier styling
// escalates: spark (1-2) → warm (3-9) → blazing (10-29) → legendary (30+).
function StreakChip({ count }: { count: number }) {
  const tier =
    count >= 30 ? "legendary" :
    count >= 10 ? "blazing" :
    count >= 3  ? "warm" :
    "spark";
  const flameSize =
    tier === "legendary" ? 18 :
    tier === "blazing"   ? 16 :
    tier === "warm"      ? 14 :
    12;
  const milestone =
    count === 7   ? "1 week!"   :
    count === 14  ? "2 weeks!"  :
    count === 30  ? "1 month!"  :
    count === 50  ? "50 days!"  :
    count === 100 ? "100 days!" :
    null;
  return (
    <div
      className={`streak-chip tier-${tier}`}
      style={{ ["--flame-size" as any]: `${flameSize}px` }}
      title={milestone ? `${count}-day streak — ${milestone}` : `${count}-day sale streak — ring up at least one sale tomorrow to keep it going`}
    >
      <svg className="flame" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`flameGrad-${tier}`} x1="0" y1="0" x2="0" y2="1">
            {tier === "legendary" ? (
              <>
                <stop offset="0%" stopColor="#ffd97c" />
                <stop offset="55%" stopColor="#ff5a1f" />
                <stop offset="100%" stopColor="#a40010" />
              </>
            ) : tier === "blazing" ? (
              <>
                <stop offset="0%" stopColor="#fff3c0" />
                <stop offset="60%" stopColor="#ff8a3a" />
                <stop offset="100%" stopColor="#c01818" />
              </>
            ) : tier === "warm" ? (
              <>
                <stop offset="0%" stopColor="#fff3c0" />
                <stop offset="55%" stopColor="#f0c878" />
                <stop offset="100%" stopColor="#8c6e27" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fff3c0" />
                <stop offset="100%" stopColor="#c9a24a" />
              </>
            )}
          </linearGradient>
        </defs>
        {/* Classic flame teardrop */}
        <path
          d="M12 2 C9 6 8 8 8 11 C8 13 9 14 10 14 C10 12 11 10 12 9 C13 11 13 13 13 15 C13 17 12 18 11 18 C13 19 16 18 17 14 C18 11 16 8 14 6 C13 5 13 3 12 2 Z"
          fill={`url(#flameGrad-${tier})`}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.6"
        />
        {/* Inner flicker */}
        <path
          d="M12 9 C13 11 13 13 13 15 C13 17 12 18 11 18"
          fill="rgba(255,255,224,0.55)"
        />
      </svg>
      <span className="streak-count">{count}</span>
      <span style={{ opacity: 0.65, fontWeight: 700 }} className="hidden md:inline">
        {milestone ? `· ${milestone}` : `day${count === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

// ─── Framed First Dollar Earned (iter-56) ───────────────────────────────
// Classic shopkeeper tradition — the first dollar a business earns is
// framed and hung on the wall as a good-luck talisman. Small wooden frame
// containing a miniature greenback ($1 bill) on a cream mat, with corner
// "1" numerals, a stand-in Washington portrait oval, and "OUR FIRST" in
// gold letters across the bottom of the frame. Slight +1° tilt mirroring
// the address plaque's -1° tilt — visual symmetry across the two walls.
function FirstDollarFrame() {
  return (
    <div className="first-dollar" aria-label="Our first dollar earned, framed on the wall">
      <div className="first-dollar-frame">
        <div className="first-dollar-mat">
          <div className="first-dollar-bill">
            <span className="first-dollar-bill-number first-dollar-bill-tl">1</span>
            <span className="first-dollar-bill-number first-dollar-bill-tr">1</span>
            <span className="first-dollar-bill-number first-dollar-bill-bl">1</span>
            <span className="first-dollar-bill-number first-dollar-bill-br">1</span>
            <div className="first-dollar-bill-portrait" />
            <div className="first-dollar-bill-edge first-dollar-bill-edge-top" />
            <div className="first-dollar-bill-edge first-dollar-bill-edge-bottom" />
          </div>
        </div>
        <div className="first-dollar-label">OUR FIRST</div>
      </div>
    </div>
  );
}

// ─── Receipt Spike (iter-55) ────────────────────────────────────────────
// Small brass paper-impale spike on a wooden block, mounted on the left wall
// below the pendulum clock. Six receipt papers impaled near the spike's base
// at slight individual rotations (-2° to +2.5°) so they read as a stack of
// real torn-off slips with random tilts. The spike has a sharp pointed top
// achieved via clip-path. Period-correct shopkeeper accessory: every old
// register had one to skewer carbon-copies of the day's sales.
function ReceiptSpike() {
  // Six receipt papers stacked from bottom (latest) to top (oldest), each
  // with a pre-determined rotation so they don't all sit at the same angle.
  const receipts = [
    { y: 18, rot: -2 },
    { y: 15, rot: 1.5 },
    { y: 12, rot: -0.5 },
    { y: 9,  rot: 2.5 },
    { y: 6,  rot: -1.5 },
    { y: 3,  rot: 1 },
  ];
  return (
    <div className="receipt-spike" aria-hidden>
      <div className="receipt-spike-base" />
      <div className="receipt-spike-rod" />
      {receipts.map((r, i) => (
        <div
          key={i}
          className="receipt-spike-paper"
          style={{ bottom: `${r.y}px`, transform: `rotate(${r.rot}deg)` }}
        />
      ))}
    </div>
  );
}

// ─── Vintage Wall-Mounted Rotary Telephone (iter-54) ────────────────────
// Black bakelite rotary phone mounted on the right wood-paneled wall below
// the address plaque. Brass-rimmed dial with 10 finger-hole positions
// circling a dark center (the brake-pin), handset resting in the cradle
// at the top tilted -3deg (like it was hung up by a busy clerk), and a
// thin cord trailing down the wall. Period-correct shop accessory — every
// 1940s storefront had one mounted within reach of the register.
function VintagePhone() {
  return (
    <div className="vintage-phone" aria-hidden>
      <div className="vintage-phone-body">
        <div className="vintage-phone-dial">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="vintage-phone-dial-hole"
              style={{ transform: `rotate(${i * 36}deg) translateY(-5.5px)` }}
            />
          ))}
          <span className="vintage-phone-dial-center" />
          <span className="vintage-phone-dial-stop" />
        </div>
      </div>
      <div className="vintage-phone-handset" />
      <div className="vintage-phone-cord" />
    </div>
  );
}

// ─── Brass Address Plaque "5062" (iter-53) ──────────────────────────────
// Vintage cream-and-brass address plaque mounted on the right wall below
// the mailbox column. Establishes the storefront's official address (5062
// Lankershim Blvd) as a visual anchor — like the engraved number plate
// next to a real shop's front door. Four brass screw heads, slight -1°
// tilt to read as "installed by a tradesman in 1947 and never adjusted."
function AddressPlaque() {
  return (
    <div className="address-plaque" aria-label="5062 Lankershim Boulevard">
      <div className="address-plaque-frame">
        <div className="address-plaque-screw address-plaque-screw-tl" aria-hidden />
        <div className="address-plaque-screw address-plaque-screw-tr" aria-hidden />
        <div className="address-plaque-screw address-plaque-screw-bl" aria-hidden />
        <div className="address-plaque-screw address-plaque-screw-br" aria-hidden />
        <div className="address-plaque-number">5062</div>
        <div className="address-plaque-label">LANKERSHIM</div>
      </div>
    </div>
  );
}

// ─── Twin Hanging Pendant Lamps (iter-52) ───────────────────────────────
// Two brass pendant lamps hang from the brass picture rail at the top of
// the shop room, flanking the awning's centered "NOHO MAILBOX" text. Each
// lamp has: a brass mounting cap fixed to the picture rail, a chain of
// repeating dark links going down ~22px, a brass dome shade with a soft
// upper-left highlight, a glowing amber bulb visible through the bottom
// opening of the dome, and a translucent light cone fanning out below the
// dome that brightens the awning + cabinet area beneath it. The two lamps
// sway gently at 11s/cycle, with the right one delayed -3s so the two
// don't move in lockstep — natural "old chain fixture" subtle drift.
function PendantLamp({ side }: { side: "left" | "right" }) {
  return (
    <div className={`pendant-lamp pendant-lamp-${side}`} aria-hidden>
      <div className="pendant-lamp-cap" />
      <div className="pendant-lamp-chain" />
      <div className="pendant-lamp-shade">
        <div className="pendant-lamp-bulb" />
      </div>
      <div className="pendant-lamp-cone" />
    </div>
  );
}

// ─── Wall Pendulum Clock (iter-51) ──────────────────────────────────────
// Vintage brass-rimmed wall clock mounted on the left wood-paneled wall
// below the left mailbox column. Cream-painted face with 12 hour-tick marks
// (longer at 12 / 3 / 6 / 9), live black hour + minute hands updating every
// 30s, and a brass center hub. Below the face hangs a narrow dark pendulum
// case with a brass pendulum bob swinging at a steady 2.4s period — the
// classic regulator-clock silhouette.
function WallClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const hours12 = now.getHours() % 12;
  const minutes = now.getMinutes();
  const hourAngle = hours12 * 30 + minutes / 2;
  const minuteAngle = minutes * 6;
  return (
    <div
      className="wall-clock"
      aria-label={`Current time ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
    >
      <div className="wall-clock-face">
        <div className="wall-clock-face-inner">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`wall-clock-mark ${i % 3 === 0 ? "wall-clock-mark-major" : ""}`}
              style={{ transform: `rotate(${i * 30}deg)` }}
            >
              <span />
            </div>
          ))}
          <div
            className="wall-clock-hand wall-clock-hand-hour"
            style={{ transform: `translateX(-50%) rotate(${hourAngle.toFixed(1)}deg)` }}
          />
          <div
            className="wall-clock-hand wall-clock-hand-minute"
            style={{ transform: `translateX(-50%) rotate(${minuteAngle.toFixed(1)}deg)` }}
          />
          <div className="wall-clock-hub" />
        </div>
      </div>
      <div className="wall-clock-pendulum-case" aria-hidden>
        <div className="wall-clock-pendulum">
          <div className="wall-clock-pendulum-rod" />
          <div className="wall-clock-pendulum-bob" />
        </div>
      </div>
    </div>
  );
}

// ─── Shop Atmosphere — Sunbeam + Dust Motes (iter-50) ───────────────────
// Soft warm diagonal beam of light slanting down through the shop from the
// upper-right, with 18 tiny luminous dust motes slowly drifting upward
// through it. Each mote has a different starting position, size, animation
// duration, and delay — staggered so the flow is continuous rather than
// pulsing in lockstep. The whole effect is purely decorative and uses
// `mix-blend-mode: screen` so it brightens whatever's underneath without
// covering it. Half-second start delays + opacity 0 at the keyframe edges
// make motes fade in/out smoothly rather than popping.
function ShopAtmosphere() {
  // Pre-generate all motes deterministically so server + client agree on
  // positions (no Math.random) — pure index-based pseudo-random spread.
  const motes = Array.from({ length: 18 }).map((_, i) => ({
    key: i,
    x: 4 + (i * 13.7) % 96,         // % from left
    y: 8 + (i * 17.3) % 84,          // % from top
    delay: -((i * 0.7) % 12),        // negative delay = pre-staggered, no startup pulse
    size: 1 + (i % 3) * 0.6,         // 1, 1.6, 2.2px
    duration: 12 + (i % 5) * 2.6,    // 12s, 14.6s, 17.2s, 19.8s, 22.4s
    drift: ((i % 2) === 0 ? 1 : -1) * (10 + (i % 4) * 4), // ±10–22px horizontal drift
  }));
  return (
    <div className="shop-atmosphere" aria-hidden>
      <div className="shop-sunbeam" />
      <div className="shop-sunbeam shop-sunbeam-secondary" />
      <div className="shop-dust">
        {motes.map((m) => (
          <span
            key={m.key}
            className="dust-mote"
            style={{
              left: `${m.x.toFixed(2)}%`,
              top: `${m.y.toFixed(2)}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`,
              ["--mote-drift" as any]: `${m.drift}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Brass Mailbox Door Grid (iter-48) ──────────────────────────────────
// A vertical column of 5 small brass mailbox doors mounted to the wood
// wall on each side of the cabinet. Each door has an engraved Roman-numeral
// number plate at the top, a small brass-bezeled keyhole at the bottom,
// and two visible hinge knuckles on the LEFT side. Period-correct backdrop
// for a NoHo mailbox shop — the customer mailboxes are part of the
// architecture, visible behind/around the register.
function MailboxColumn({ side, startNumber }: { side: "left" | "right"; startNumber: number }) {
  // Stagger micro-rotations on each door so the grid doesn't look perfect —
  // hand-installed doors over the decades aren't all dead-square.
  const tilts = [-0.4, 0.3, -0.2, 0.5, -0.3];
  return (
    <div className={`mailbox-column mailbox-column-${side}`} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="mailbox-door"
          style={{ ["--door-tilt" as any]: `${tilts[i]}deg` }}
        >
          <div className="mailbox-number">{startNumber + i}</div>
          <div className="mailbox-hinge mailbox-hinge-top" />
          <div className="mailbox-hinge mailbox-hinge-bottom" />
          <div className="mailbox-keyhole" />
          <div className="mailbox-shine" />
        </div>
      ))}
    </div>
  );
}

// ─── Pneumatic Tube System (iter-46) ────────────────────────────────────
// Vertical brass-and-glass pneumatic tube running along the right outer
// edge of the cabinet. Department stores in the early 1900s used these
// to ferry receipts, cash, and credit slips between the sales floor and
// a central office. Idle: capsule sits parked at the top, gently floating
// 1px up-and-down on a slow breathing animation. On sale completion: the
// capsule WHOOSHES down to the bottom (with motion-blur during traverse),
// holds for a moment, then rises smoothly back to its parked position.
function PneumaticTube({ flightKey }: { flightKey: number }) {
  const flying = flightKey > 0;
  return (
    <div className="pneumatic-tube" aria-hidden>
      <div className="pneumatic-tube-glass" />
      <div className="pneumatic-tube-bracket pt-bracket-1" />
      <div className="pneumatic-tube-bracket pt-bracket-2" />
      <div className="pneumatic-tube-bracket pt-bracket-3" />
      <div className="pneumatic-tube-bracket pt-bracket-4" />
      <div className="pneumatic-tube-cap pt-cap-top" />
      <div className="pneumatic-tube-cap pt-cap-bottom" />
      <div
        key={flightKey}
        className={`pneumatic-tube-capsule ${flying ? "is-flying" : ""}`}
      />
    </div>
  );
}

// ─── Exposed Clockwork Gears (iter-45) ──────────────────────────────────
// Three interlocking brass gears in a circular brass-bezeled window cut
// into the cabinet face. Different rotation speeds + alternating directions
// (12s CW + 6s CCW + 4s CW) sell the mechanical-clockwork illusion. Each
// gear is generated procedurally as a polygon with N×2 alternating
// outer/inner points to create the toothed silhouette, plus a hub disc
// and a center axle dot.
function gearPath(cx: number, cy: number, innerR: number, toothH: number, teeth: number) {
  const outerR = innerR + toothH;
  const halfStep = (Math.PI * 2) / (teeth * 2);
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = i * halfStep - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}
function ClockworkGears() {
  // Three gears positioned so their tooth tips visually meet at the
  // mesh points, even if the rotation rates aren't physically consistent
  // (which would require gear-ratio math; the eye doesn't check this in a
  // small ornament).
  return (
    <div className="gears-window" aria-hidden>
      <svg viewBox="0 0 100 100" className="gears-svg">
        {/* Big gear at center */}
        <g className="gear gear-big">
          <path
            d={gearPath(50, 50, 22, 4, 12)}
            fill="url(#gear-brass)"
            stroke="#5a4318"
            strokeWidth="0.6"
          />
          <circle cx="50" cy="50" r="14" fill="#8c6e27" stroke="#5a4318" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="3" fill="#2D100F" />
          {/* Spoke holes */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const a = (deg * Math.PI) / 180;
            const r = 9;
            return (
              <circle
                key={deg}
                cx={50 + Math.cos(a) * r}
                cy={50 + Math.sin(a) * r}
                r="1.6"
                fill="#2D100F"
              />
            );
          })}
        </g>
        {/* Small gear upper-left */}
        <g className="gear gear-small">
          <path
            d={gearPath(26, 26, 12, 3, 8)}
            fill="url(#gear-brass)"
            stroke="#5a4318"
            strokeWidth="0.5"
          />
          <circle cx="26" cy="26" r="6" fill="#8c6e27" stroke="#5a4318" strokeWidth="0.3" />
          <circle cx="26" cy="26" r="1.6" fill="#2D100F" />
        </g>
        {/* Tiny gear lower-right */}
        <g className="gear gear-tiny">
          <path
            d={gearPath(72, 72, 9, 2.4, 6)}
            fill="url(#gear-brass)"
            stroke="#5a4318"
            strokeWidth="0.4"
          />
          <circle cx="72" cy="72" r="4" fill="#8c6e27" stroke="#5a4318" strokeWidth="0.3" />
          <circle cx="72" cy="72" r="1.2" fill="#2D100F" />
        </g>
        <defs>
          <linearGradient id="gear-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd86b" />
            <stop offset="0.4" stopColor="#c9a24a" />
            <stop offset="0.85" stopColor="#8c6e27" />
            <stop offset="1" stopColor="#5a4318" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── LED Dot-Matrix Marquee Ticker (iter-44) ────────────────────────────
// Horizontal scrolling banner mounted at the bottom of the cabinet body.
// Amber Courier text on a dark recessed inset; rotates through 6 messages
// (store info, address, accepted payments, hours, today's date/time). The
// dot-matrix aesthetic is achieved via a `repeating-radial-gradient` mask
// overlay that creates a subtle dot-stipple effect across the readout
// without rendering each character as actual SVG dots.
function MarqueeTicker() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  // Build the ticker payload. Time/date messages only render once now is
  // populated from the client (avoids hydration mismatch).
  const messages: string[] = [
    "★  WELCOME TO NOHO MAILBOX  ★",
    "MAILBOX RENTAL  ·  NOTARY  ·  COPIES  ·  SHIPPING  ·  SUPPLIES",
    "PAYMENT METHODS  ·  CASH  ·  ZELLE  ·  SQUARE  ·  CARDS  ·  WALLET",
    "5062 LANKERSHIM BLVD  ·  NORTH HOLLYWOOD  CA 91601  ·  (818) 506-7744",
    "OPEN  MON–SAT  9:30 AM – 5:30 PM  ·  CLOSED SUNDAY",
  ];
  if (now) {
    const t = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    const d = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    messages.push(`${d}  ·  ${t}`);
  }
  // Concatenate twice — when the first copy scrolls out the left, the second
  // is already visible on the right, providing a seamless loop. Separator
  // is a diamond ◆ in amber.
  const sep = "  ◆  ";
  const payload = messages.join(sep) + sep;
  return (
    <div className="marquee-ticker" aria-label="Store information ticker">
      <div className="marquee-frame marquee-frame-with-gears">
        <div className="marquee-rivet marquee-rivet-l" aria-hidden />
        <div className="marquee-rivet marquee-rivet-r" aria-hidden />
        <div className="marquee-gears-port" aria-hidden>
          <ClockworkGears />
        </div>
        <div className="marquee-window">
          <div className="marquee-track">
            <span className="marquee-segment">{payload}</span>
            <span className="marquee-segment" aria-hidden>{payload}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wall Calendar / Date Card Display (iter-43) ────────────────────────
// Vintage perpetual-calendar card display mounted on the left side of the
// cabinet area, mirroring the counter bell on the right. Three stacked
// paper cards in a brass frame: red-ink MONTH abbreviation on top, large
// monospace day NUMBER in the middle (with a perforation-style fold line
// across the center), small WEEKDAY abbreviation on the bottom. Updates
// live every minute (cheap; the date only crosses midnight once per day).
function WallCalendar() {
  // SSR-safe: don't render until we have a client-side Date. Avoids hydration
  // mismatch when the server's TZ differs from the client's.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(now.getDate()).padStart(2, "0");
  const weekday = now.toLocaleString("en-US", { weekday: "short" }).toUpperCase();
  return (
    <div className="wall-calendar" aria-label={`Today is ${weekday} ${month} ${day}`}>
      <div className="wall-calendar-bracket" aria-hidden />
      <div className="wall-calendar-frame">
        <div className="wall-calendar-month">{month}</div>
        <div className="wall-calendar-day">
          <span>{day}</span>
        </div>
        <div className="wall-calendar-weekday">{weekday}</div>
      </div>
    </div>
  );
}

// ─── Brass Counter Bell (iter-42) ───────────────────────────────────────
// Classic dome-shaped desk bell with a silver plunger sitting on a small
// wooden block, mounted on a wall bracket above the cabinet's right edge.
// Distinct from the existing iter-25 ServiceBell (which is a hand-bell
// shape inside the cabinet header for the daily ring count) — this is the
// hotel-style desk push-bell, mounted as a sibling of pos-cabinet so it
// sits in the empty space above the cabinet's brass top-rail.
// Click to ring (manual). Auto-rings on sale completion. The plunger
// compresses inward, the dome rocks side-to-side with a 720ms damped
// oscillation, and a faint glow halo expands and fades around the bell.
function CounterBell({ ringKey, onRing }: { ringKey: number; onRing: () => void }) {
  // Re-mount on ringKey change to retrigger the CSS animations from frame 0.
  // First mount (ringKey=0) skips the animation so the bell sits still on load.
  const animating = ringKey > 0;
  return (
    <div className="service-bell-mount" aria-hidden={false}>
      <div className="service-bell-bracket" aria-hidden />
      <div className="service-bell-block" aria-hidden />
      <button
        type="button"
        className="service-bell-button"
        onClick={onRing}
        aria-label="Ring service bell"
      >
        <span key={ringKey} className={`service-bell-dome ${animating ? "is-ringing" : ""}`}>
          <span className="service-bell-shine" aria-hidden />
        </span>
        <span key={`p-${ringKey}`} className={`service-bell-plunger ${animating ? "is-pressing" : ""}`}>
          <span className="service-bell-plunger-cap" aria-hidden />
        </span>
        <span key={`g-${ringKey}`} className={`service-bell-glow ${animating ? "is-ringing" : ""}`} aria-hidden />
      </button>
    </div>
  );
}

// ─── Striped Shopfront Awning (iter-41) ─────────────────────────────────
// Cream + red striped fabric awning with scalloped bottom edge mounted
// above the cabinet. "NOHO MAILBOX" embroidered in serif type across the
// front, brass pull-cord on the right with a small bell weight. Gentle
// sway animation (0.3deg ↔ -0.3deg over 8s) makes the fabric look like
// it's catching a slight breeze. Drop shadow casts onto the cabinet below.
function Awning() {
  // Build the scalloped clip path procedurally — 24 quadratic bumps across
  // a 480-wide viewBox. Stretches via preserveAspectRatio="none".
  const TOTAL_W = 480;
  const STRIPE_BOTTOM = 36;
  const SCALLOP_DEPTH = 50;
  const SCALLOP_W = 20;
  const numScallops = TOTAL_W / SCALLOP_W;
  let path = `M 0 0 L ${TOTAL_W} 0 L ${TOTAL_W} ${STRIPE_BOTTOM} `;
  for (let i = 0; i < numScallops; i++) {
    const startX = TOTAL_W - i * SCALLOP_W;
    const ctrlX = startX - SCALLOP_W / 2;
    const endX = startX - SCALLOP_W;
    path += `Q ${ctrlX} ${SCALLOP_DEPTH} ${endX} ${STRIPE_BOTTOM} `;
  }
  path += "Z";
  return (
    <div className="awning" aria-hidden>
      <svg viewBox="0 0 480 50" preserveAspectRatio="none" className="awning-svg">
        <defs>
          <pattern id="awning-stripes" patternUnits="userSpaceOnUse" width="32" height="50">
            <rect width="16" height="50" fill="#f5e7c2" />
            <rect x="16" width="16" height="50" fill="#c92a4d" />
          </pattern>
          <linearGradient id="awning-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0,0,0,0.35)" />
            <stop offset="0.4" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.4)" />
          </linearGradient>
        </defs>
        <path d={path} fill="url(#awning-stripes)" stroke="#5a4318" strokeWidth="1.2" />
        <path d={path} fill="url(#awning-shade)" />
        {/* Hand-stitched seam at the top of each stripe joint */}
        {Array.from({ length: numScallops + 1 }).map((_, i) => {
          const x = (i * SCALLOP_W);
          return (
            <line
              key={i}
              x1={x}
              y1={1}
              x2={x}
              y2={STRIPE_BOTTOM - 1}
              stroke="rgba(45, 16, 15, 0.25)"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
          );
        })}
      </svg>
      <div className="awning-text">NOHO MAILBOX</div>
      <div className="awning-cord">
        <div className="awning-cord-bell" />
      </div>
      <div className="awning-bracket-l" />
      <div className="awning-bracket-r" />
    </div>
  );
}

// ─── Mechanical Drum Counter / Odometer (iter-40) ───────────────────────
// Vintage rotating-drum display showing today's till total in mechanical
// digits. Each drum is an inset dark cylinder with a vertical strip of
// 0-9 painted in cream; the strip translates upward when the digit changes,
// rolling the next number into view with a spring-y cubic-bezier curve.
// Two horizontal dark gradient bars at top/bottom fake the cylinder
// curvature, plus a 1px seam across the middle for the digit-edge gap.
function OdometerDigit({ digit }: { digit: number }) {
  const safe = Math.max(0, Math.min(9, Math.floor(digit)));
  const [pos, setPos] = useState(safe);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (pos !== safe) {
      setRolling(true);
      setPos(safe);
      const t = setTimeout(() => setRolling(false), 720);
      return () => clearTimeout(t);
    }
  }, [safe, pos]);
  return (
    <div className={`odo-digit ${rolling ? "is-rolling" : ""}`}>
      <div className="odo-strip" style={{ ["--odo-pos" as any]: String(pos) }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </div>
  );
}

function OdometerCounter({ totalCents, label = "Today" }: { totalCents: number; label?: string }) {
  // Cap at $99,999.99 so we always have exactly 7 digits to render.
  const capped = Math.min(9_999_999, Math.max(0, Math.floor(totalCents)));
  const dollars = Math.floor(capped / 100);
  const cents = capped % 100;
  const dollarStr = String(dollars).padStart(5, "0");
  const centStr = String(cents).padStart(2, "0");
  // Insert a comma between thousands. With 5 dollar digits that's
  // [d4][d3] , [d2][d1][d0]
  const d4 = Number(dollarStr[0]);
  const d3 = Number(dollarStr[1]);
  const d2 = Number(dollarStr[2]);
  const d1 = Number(dollarStr[3]);
  const d0 = Number(dollarStr[4]);
  const c1 = Number(centStr[0]);
  const c0 = Number(centStr[1]);
  return (
    <div className="odo-band">
      <div className="odo-label">{label}</div>
      <div className="odo-row">
        <span className="odo-currency">$</span>
        <OdometerDigit digit={d4} />
        <OdometerDigit digit={d3} />
        <span className="odo-comma">,</span>
        <OdometerDigit digit={d2} />
        <OdometerDigit digit={d1} />
        <OdometerDigit digit={d0} />
        <span className="odo-comma">.</span>
        <OdometerDigit digit={c1} />
        <OdometerDigit digit={c0} />
      </div>
    </div>
  );
}

// ─── Vacuum Tube Indicators (iter-38) ───────────────────────────────────
// 5 glass vacuum tubes in a brass-mounted rail above the LCD. Each has a
// glowing amber filament with idle ambient breathing animation; on cart
// change or sale completion all tubes flash bright orange briefly. Channels
// the 1940s electronics aesthetic — like the cabinet is "warming up" to
// process your transaction.
function VacuumTube({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`vacuum-tube ${active ? "is-flashing" : ""}`}>
      <div className="vacuum-tube-cap" />
      <div className="vacuum-tube-glass">
        <div className="vacuum-tube-grid" />
        <div className="vacuum-tube-filament" />
      </div>
      <div className="vacuum-tube-base" />
      <div className="vacuum-tube-label">{label}</div>
    </div>
  );
}

function VacuumTubeStack({ flashKey }: { flashKey: number }) {
  // Re-mounting the inner row on flashKey bump retriggers the CSS animation.
  const labels = ["V1", "V2", "V3", "V4", "V5"];
  return (
    <div className="vacuum-rail">
      {labels.map((lab) => (
        <VacuumTube key={`${flashKey}-${lab}`} active={flashKey > 0} label={lab} />
      ))}
    </div>
  );
}

// ─── Brass Pressure Gauges (iter-37) ────────────────────────────────────
// Three vintage analog gauges with brass bezels, glass domes, and animated
// needles. Live-wired to till metrics. The needles snap to value with a
// spring-y cubic-bezier transition; first 1/4 of the dial is a gold arc
// (normal range), last 1/4 is a red zone arc (busy/peak). Tick marks every
// 27° (10 major divisions over the 270° sweep).
function Gauge({
  label,
  value,
  max,
  format,
  redZone = 0.75,
}: {
  label: string;
  value: number;
  max: number;
  format: (n: number) => string;
  redZone?: number;
}) {
  // -135° = leftmost (zero), +135° = rightmost (max). 270° total sweep.
  const pct = Math.max(0, Math.min(1, value / max));
  const angle = -135 + pct * 270;
  // Build arcs using polar→cartesian; zone start/end in degrees from -135 to +135.
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [50 + Math.cos(rad) * r, 50 + Math.sin(rad) * r];
  };
  const goldArcEnd = -135 + redZone * 270;
  const [gx0, gy0] = polar(-135, 32);
  const [gx1, gy1] = polar(goldArcEnd, 32);
  const [rx0, ry0] = polar(goldArcEnd, 32);
  const [rx1, ry1] = polar(135, 32);
  const goldLarge = goldArcEnd - -135 > 180 ? 1 : 0;
  const redLarge = 135 - goldArcEnd > 180 ? 1 : 0;
  // Tick marks: 11 majors spaced over 270°
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = -135 + (i / 10) * 270;
    const [x1, y1] = polar(a, 39);
    const [x2, y2] = polar(a, 34);
    return { x1, y1, x2, y2, key: `M${i}` };
  });
  // Minor ticks (4 per major segment, so 41 total) — but only render the ones
  // that aren't on a major position.
  const minorTicks = Array.from({ length: 41 }, (_, i) => {
    if (i % 4 === 0) return null;
    const a = -135 + (i / 40) * 270;
    const [x1, y1] = polar(a, 38.5);
    const [x2, y2] = polar(a, 35.5);
    return { x1, y1, x2, y2, key: `m${i}` };
  }).filter((t): t is NonNullable<typeof t> => t !== null);

  return (
    <div className="gauge">
      <div className="gauge-glass">
        <svg viewBox="0 0 100 100" className="gauge-svg">
          {/* Dial face */}
          <circle cx="50" cy="50" r="42" className="gauge-face" />
          {/* Gold normal-range arc */}
          <path
            d={`M ${gx0.toFixed(2)} ${gy0.toFixed(2)} A 32 32 0 ${goldLarge} 1 ${gx1.toFixed(2)} ${gy1.toFixed(2)}`}
            className="gauge-arc"
          />
          {/* Red zone arc */}
          <path
            d={`M ${rx0.toFixed(2)} ${ry0.toFixed(2)} A 32 32 0 ${redLarge} 1 ${rx1.toFixed(2)} ${ry1.toFixed(2)}`}
            className="gauge-arc-redzone"
          />
          {/* Tick marks */}
          {ticks.map((t) => (
            <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="gauge-tick-major" />
          ))}
          {minorTicks.map((t) => (
            <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="gauge-tick-minor" />
          ))}
          {/* Unit label engraved on face */}
          <text x="50" y="68" textAnchor="middle" className="gauge-unit-label">
            {label}
          </text>
          {/* Needle */}
          <g
            transform={`rotate(${angle.toFixed(2)} 50 50)`}
            className="gauge-needle-group"
          >
            <polygon points="50,11 48.4,52 51.6,52" />
            <polygon points="50,52 48.4,52 49.5,58" fill="#4a0c10" />
          </g>
          {/* Center hub */}
          <circle cx="50" cy="50" r="4.2" className="gauge-hub" />
          <circle cx="50" cy="50" r="1.4" className="gauge-hub-inner" />
        </svg>
      </div>
      <div className="gauge-readout">
        <div className="gauge-value">{format(value)}</div>
      </div>
    </div>
  );
}

function GaugeCluster({
  salesCount,
  avgTicketCents,
  totalCents,
}: {
  salesCount: number;
  avgTicketCents: number;
  totalCents: number;
}) {
  return (
    <div className="gauge-cluster">
      <Gauge
        label="RPM · SALES"
        value={salesCount}
        max={40}
        format={(n) => String(Math.round(n)).padStart(2, "0")}
      />
      <Gauge
        label="PSI · AVG"
        value={avgTicketCents / 100}
        max={250}
        format={(n) => `$${n.toFixed(0)}`}
      />
      <Gauge
        label="VOLT · TILL"
        value={totalCents / 100}
        max={3000}
        format={(n) => `$${n.toFixed(0)}`}
        redZone={0.85}
      />
    </div>
  );
}

// ─── Cabinet Decals / Stickers (iter-36) ────────────────────────────────
// Sticker-style branded badges plastered around the cabinet edges with slight
// rotations for that "applied-by-hand" feel real shop registers have. Subtle
// hover peel-back animation. Hidden on phones (<640px) to avoid clutter.
function CabinetDecals() {
  return (
    <>
      <div className="decal decal-est">EST · 2023</div>
      <div className="decal decal-family">★ Family Owned</div>
      <div className="decal decal-member">NoHo Biz · Member</div>
      <div className="decal decal-hours">Open Mon-Sat · 9:30-5:30</div>
      <div className="decal decal-star">♥ NOHO</div>
    </>
  );
}

// ─── Top Items Leaderboard (iter-31) ────────────────────────────────────
// Horizontal podium-style strip showing today's 5 bestseller items.
// 1st = gold pill, 2nd = silver, 3rd = bronze, 4th/5th = honorable-mention brown.
// Animated grow-from-bottom entry per pill.
function TopItemsLeaderboard({
  items,
}: {
  items: Array<{ name: string; quantity: number; cents: number }>;
}) {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="top-strip">
      <div className="top-strip-header">
        <h3 className="text-base font-black tracking-tight" style={{ color: BROWN }}>
          ★ Top Items · Today
        </h3>
        <span className="text-[11px] font-bold opacity-60" style={{ color: BROWN }}>
          {items.length === 0 ? "no sales yet" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="top-empty">
          🔔 No items rung up yet — the first sale of the day lands here.
        </div>
      ) : (
        <div className="top-grid">
          {items.slice(0, 5).map((it, i) => (
            <div
              key={it.name}
              className={`top-pill r${i + 1}`}
              style={{ animationDelay: `${i * 60}ms` }}
              title={`${it.quantity}× sold · ${fmt(it.cents)}`}
            >
              <span className="top-rank">{i + 1}</span>
              <div className="top-pill-name">{it.name}</div>
              <div className="top-pill-meta">
                <span>{it.quantity}×</span>
                <span className="top-pill-amount">{fmt(it.cents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cashier Badge (iter-29) ────────────────────────────────────────────
// Compact identity pill in the panel header. Click → popover with text input
// + 7-color avatar swatch picker. Persists to localStorage. Empty state shows
// dashed border + "Sign in" label.
function CashierBadge({
  identity,
  editing,
  setEditing,
  palette,
  onSave,
}: {
  identity: { nickname: string; color: string } | null;
  editing: boolean;
  setEditing: (v: boolean) => void;
  palette: string[];
  onSave: (nickname: string, color: string) => void;
}) {
  const [draft, setDraft] = useState(identity?.nickname ?? "");
  const [color, setColor] = useState(identity?.color ?? palette[0]);
  useEffect(() => {
    if (editing) {
      setDraft(identity?.nickname ?? "");
      setColor(identity?.color ?? palette[0]);
    }
  }, [editing, identity, palette]);
  const initial = (identity?.nickname?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        className={`cashier-badge ${identity ? "" : "empty"}`}
        onClick={() => setEditing(!editing)}
        title={identity ? `Signed in as ${identity.nickname}` : "Sign in as cashier"}
      >
        <span className={`cashier-badge-avatar ${identity ? "" : "empty"}`} style={{ background: identity?.color }}>
          {initial}
        </span>
        <span className="hidden sm:inline">
          {identity ? `Hi, ${identity.nickname}` : "Sign in"}
        </span>
      </button>
      {editing && (
        <div className="cashier-popover" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] font-black tracking-[0.18em] uppercase opacity-65 mb-1" style={{ color: BROWN }}>
            Cashier sign-in
          </div>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(draft, color);
              else if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Your name (e.g. Sarah)"
            className="w-full px-3 py-1.5 rounded border border-[#8c6e27] bg-white text-sm font-medium focus:outline-none focus:border-[#5a4318]"
            style={{ color: BROWN }}
            maxLength={20}
          />
          <div className="cashier-swatch-row">
            {palette.map((c) => (
              <button
                key={c}
                className={`cashier-swatch ${color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Pick color ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-1.5 rounded text-[11px] font-black tracking-wider border border-[#5a4318]"
              style={{ background: "rgba(255,255,255,0.5)", color: BROWN }}
            >
              CANCEL
            </button>
            {identity && (
              <button
                onClick={() => onSave("", color)}
                className="flex-1 py-1.5 rounded text-[11px] font-black tracking-wider border border-[#a40010]"
                style={{ background: "rgba(245, 211, 208, 0.7)", color: "#8a1010" }}
              >
                SIGN OUT
              </button>
            )}
            <button
              onClick={() => onSave(draft, color)}
              disabled={!draft.trim()}
              className="flex-1 py-1.5 rounded text-[11px] font-black tracking-wider"
              style={{
                background: draft.trim() ? BROWN : "rgba(45,16,15,0.3)",
                color: CREAM,
                cursor: draft.trim() ? "pointer" : "not-allowed",
              }}
            >
              {identity ? "UPDATE" : "SIGN IN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tip Jar (iter-28) ──────────────────────────────────────────────────
// Glass jar that fills as today's tips accumulate. Each charge with a tip
// fires a coin-drop animation (`dropKey` increments → SVG remount).
function TipJar({ tipsCents, dropKey }: { tipsCents: number; dropKey: number }) {
  // Fill height: 0% at $0, 100% at $50.
  const FULL_AT_CENTS = 5000;
  const fillPct = Math.min(100, Math.round((tipsCents / FULL_AT_CENTS) * 100));
  // Visualize as stacked bills inside (cosmetic — quantity scales with tipsCents)
  // Render up to 8 bills max so the stack fits.
  const billCount = Math.min(8, Math.floor(tipsCents / 500)); // 1 bill per ~$5
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="tip-jar-stage" title={`Tips today: ${fmt(tipsCents)} · drops here when a sale tips out`}>
      <div className="tip-jar-label">Tips</div>
      <div className="tip-jar-rim" aria-hidden />
      <div className={`tip-jar ${dropKey > 0 ? "dropping" : ""}`} key={`jar-${dropKey}`}>
        <div className="tip-jar-fill" style={{ height: `${fillPct}%` }} />
        <div className="tip-jar-stack">
          {Array.from({ length: billCount }).map((_, i) => (
            <span
              key={i}
              className={`tip-jar-bill ${i >= 6 ? "b100" : i >= 3 ? "b50" : ""}`}
            />
          ))}
        </div>
        {dropKey > 0 && (
          <span
            className="tip-jar-coin"
            style={{ ["--coin-end-y" as any]: `${50 - 4 - Math.min(40, Math.floor(fillPct * 0.4))}px` }}
            key={`coin-${dropKey}`}
          />
        )}
      </div>
      <div className="tip-jar-amount">{fmt(tipsCents)}</div>
    </div>
  );
}

// ─── Hourly Sales Spark (iter-21) ────────────────────────────────────────
// 120×40 SVG sparkline of today's hourly sales with gradient fill, smooth
// path, and a pulsing dot at the current hour. Animates draw-in once per
// remount. Compact form for embedding in the till summary alongside the
// goal ring.
function HourlySpark({ byHour }: { byHour: Array<{ hour: number; cents: number; count: number }> }) {
  const W = 120;
  const H = 40;
  const PAD = 2;
  const nowH = new Date().getHours();
  const max = Math.max(1, ...byHour.map((b) => b.cents));
  const total = byHour.reduce((s, b) => s + b.cents, 0);

  // Map hour 0..23 to x; cents to y (inverted). Smooth via simple linear.
  const stepX = (W - PAD * 2) / 23;
  const points = byHour.map((b, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((b.cents / max) * (H - PAD * 2));
    return { x, y, cents: b.cents };
  });

  // Build path
  const linePath = points.map((p, i) => (i === 0 ? `M${p.x.toFixed(2)},${p.y.toFixed(2)}` : `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)).join(" ");
  // Closed area under line for fill
  const fillPath = `${linePath} L${(W - PAD).toFixed(2)},${H - PAD} L${PAD},${H - PAD} Z`;

  const nowPoint = points[Math.min(23, Math.max(0, nowH))];

  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;

  return (
    <div className="spark-stage" title={`Today's sales rate · total ${fmt(total)}`}>
      <div className="text-[8px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
        Velocity · today
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          <linearGradient id="sparkFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rail-text)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--rail-text)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {total > 0 ? (
          <>
            <path className="spark-fill" d={fillPath} />
            <path className="spark-line" d={linePath} />
            <circle className="spark-now" cx={nowPoint.x} cy={nowPoint.y} r={3} />
          </>
        ) : (
          <line
            x1={PAD} y1={H - PAD * 2}
            x2={W - PAD} y2={H - PAD * 2}
            stroke="rgba(45,16,15,0.18)"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
        )}
      </svg>
      <div className="spark-axis">
        <span>12a</span>
        <span>6a</span>
        <span>noon</span>
        <span>6p</span>
      </div>
    </div>
  );
}

// ─── Daily Goal Progress Ring (iter-12) ──────────────────────────────────
function GoalProgressRing({
  totalCents,
  goalCents,
  count,
  onEditGoal,
  isEditing,
  onSetGoal,
}: {
  totalCents: number;
  goalCents: number;
  count: number;
  onEditGoal: () => void;
  isEditing: boolean;
  onSetGoal: (cents: number) => void;
}) {
  const pct = goalCents > 0 ? Math.min(1, totalCents / goalCents) : 0;
  const reached = pct >= 1;
  const r = 38;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - pct);
  const [draft, setDraft] = useState((goalCents / 100).toFixed(0));
  useEffect(() => { setDraft((goalCents / 100).toFixed(0)); }, [goalCents]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="goal-ring-stage">
      <div className="goal-ring" onClick={onEditGoal} role="button" tabIndex={0} title="Click to edit daily goal">
        <svg viewBox="0 0 84 84" width="84" height="84">
          <defs>
            <linearGradient id="goalRingFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor={GOLD} />
              <stop offset="100%" stopColor={BLUE} />
            </linearGradient>
            <linearGradient id="goalRingFillReached" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#f0c878" />
              <stop offset="50%" stopColor={GOLD} />
              <stop offset="100%" stopColor="#fff3c0" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx="42" cy="42" r={r}
            fill="none"
            stroke="rgba(45,16,15,0.12)"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle cx="42" cy="42" r={r}
            fill="none"
            stroke={reached ? "url(#goalRingFillReached)" : "url(#goalRingFill)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 42 42)"
            style={{ transition: "stroke-dashoffset 480ms cubic-bezier(.34,1.56,.64,1)" }}
          />
        </svg>
        <div className="goal-ring-inner">
          <div className="text-[8px] font-black tracking-[0.18em] uppercase" style={{ color: BROWN, opacity: 0.55 }}>Today</div>
          <div className="text-base font-black leading-none tabular-nums" style={{ color: BROWN }}>
            {fmt(totalCents)}
          </div>
          <div className="text-[8px] font-bold tracking-wider mt-0.5 tabular-nums" style={{ color: BROWN, opacity: 0.6 }}>
            {Math.round(pct * 100)}% · {count} sale{count === 1 ? "" : "s"}
          </div>
        </div>
        {reached && (
          <>
            <span className="goal-sparkle" style={{ left: "-4px", top: "8px", animationDelay: "0s" }}>✦</span>
            <span className="goal-sparkle" style={{ right: "-2px", top: "12px", animationDelay: "0.4s" }}>✦</span>
            <span className="goal-sparkle" style={{ left: "8px", bottom: "-2px", animationDelay: "0.8s" }}>✦</span>
            <span className="goal-sparkle" style={{ right: "10px", bottom: "0px", animationDelay: "1.2s" }}>✦</span>
          </>
        )}
      </div>

      <div className="flex flex-col">
        <div className="text-[10px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
          Daily Goal
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-sm font-black" style={{ color: BROWN }}>$</span>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Math.max(100, Math.round(parseFloat(draft) * 100) || 50000);
                  onSetGoal(n);
                } else if (e.key === "Escape") {
                  onEditGoal();
                }
              }}
              className="w-16 px-1.5 py-0.5 rounded border border-[#8c6e27] bg-white text-sm font-black tabular-nums focus:outline-none"
              style={{ color: BROWN }}
              placeholder="500"
            />
            <button
              onClick={() => {
                const n = Math.max(100, Math.round(parseFloat(draft) * 100) || 50000);
                onSetGoal(n);
              }}
              className="text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: BROWN, color: CREAM }}
            >SET</button>
          </div>
        ) : (
          <button
            onClick={onEditGoal}
            className="text-base font-black tabular-nums leading-tight text-left hover:underline"
            style={{ color: BROWN }}
            title="Click to change daily goal"
          >
            {fmt(goalCents)}
          </button>
        )}
        <div className="text-[10px] font-bold opacity-60 mt-0.5" style={{ color: BROWN }}>
          {reached ? "★ Goal hit — nice!" :
            `${fmt(Math.max(0, goalCents - totalCents))} to go`}
        </div>
      </div>
    </div>
  );
}

// ─── Loyalty Punchcard (iter-19) ────────────────────────────────────────
// 10 round slots; each filled visit (most recent first) gets a red ink-stamp.
// At ≥10 visits a shimmering REWARD READY chip appears underneath.
function LoyaltyPunchcard({ visits }: { visits: string[] }) {
  // Cap to 10 stamps for the classic punchcard feel
  const filled = Math.min(visits.length, 10);
  const slots: Array<string | null> = [];
  for (let i = 0; i < 10; i++) {
    slots.push(i < filled ? visits[i] : null);
  }

  // "Last visit" relative
  const last = visits[0];
  const lastLabel = (() => {
    if (!last) return null;
    try {
      const m = Math.floor((Date.now() - new Date(last).getTime()) / 60_000);
      if (m < 60) return m < 1 ? "just now" : `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      return `${d}d ago`;
    } catch { return null; }
  })();

  return (
    <div className="loyalty-card">
      <div className="loyalty-header">
        <span>Loyalty · 10 visits = free</span>
        <span className="loyalty-progress">
          {filled}/10
          {lastLabel ? ` · last ${lastLabel}` : ""}
        </span>
      </div>
      {visits.length === 0 ? (
        <div className="loyalty-empty">— no visits in the last 90 days —</div>
      ) : (
        <div className="loyalty-grid">
          {slots.map((iso, i) => (
            <div
              key={i}
              className={`loyalty-slot ${iso ? "stamped" : ""}`}
              title={iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `Slot ${i + 1}`}
              style={iso ? { animationDelay: `${i * 60}ms` } : undefined}
            >
              {iso ? "✓" : i + 1}
            </div>
          ))}
        </div>
      )}
      {filled >= 10 && (
        <div className="loyalty-reward">
          ★ REWARD READY · Free passport photo or notary
        </div>
      )}
    </div>
  );
}

// ─── Confirmation banner with delivery chips (iter-10) ───────────────────
function ConfirmationBanner({
  saleId,
  saleNumber,
  changeDueCents,
  attachedEmail,
  attachedPhone,
  onClose,
}: {
  saleId: string;
  saleNumber: number;
  changeDueCents: number;
  attachedEmail: string | null;
  attachedPhone: string | null;
  onClose: () => void;
}) {
  type DeliverState = "idle" | "sending" | "sent" | "failed";
  const [emailState, setEmailState] = useState<DeliverState>("idle");
  const [smsState, setSmsState] = useState<DeliverState>("idle");
  const [smsBody, setSmsBody] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState<string | null>(null);

  async function doEmail() {
    if (emailState === "sending" || emailState === "sent") return;
    setEmailState("sending");
    try {
      const r = await emailPOSReceipt(saleId);
      setEmailState("error" in r ? "failed" : "sent");
    } catch {
      setEmailState("failed");
    }
  }
  async function doSms() {
    if (smsState === "sending" || smsState === "sent") return;
    setSmsState("sending");
    try {
      const r = await smsPOSReceipt(saleId);
      if ("error" in r) {
        setSmsState("failed");
      } else {
        setSmsState("sent");
        setSmsBody(r.body);
        setSmsPhone(r.phone);
      }
    } catch {
      setSmsState("failed");
    }
  }

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="mt-3 rounded-md bg-[#1a4a1a] text-[#d3f0d3] text-sm font-bold border border-[#2a8a2a]">
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          ✓ Sale #{String(saleNumber).padStart(5, "0")} recorded
          {changeDueCents > 0 && <> · Change due {fmt(changeDueCents)}</>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/pos/receipt/${saleId}`}
            target="_blank"
            className="deliver-chip"
            title="Open 4×6 thermal receipt"
          >
            <PrintIcon /> Print 4×6
          </a>
          <button
            onClick={doEmail}
            disabled={!attachedEmail}
            className={`deliver-chip ${emailState === "sending" ? "sending" : ""} ${emailState === "sent" ? "sent" : ""} ${emailState === "failed" ? "failed" : ""}`}
            title={attachedEmail ? `Email receipt to ${attachedEmail}` : "Attach a customer with email to send"}
          >
            <MailIcon />
            {emailState === "sending" ? "Sending…" :
              emailState === "sent" ? "Emailed ✓" :
              emailState === "failed" ? "Email failed" :
              attachedEmail ? "Email receipt" : "No email"}
          </button>
          <button
            onClick={doSms}
            disabled={!attachedPhone}
            className={`deliver-chip ${smsState === "sending" ? "sending" : ""} ${smsState === "sent" ? "sent" : ""} ${smsState === "failed" ? "failed" : ""}`}
            title={attachedPhone ? `Compose SMS to ${attachedPhone}` : "Attach a customer with phone to send"}
          >
            <SmsIcon />
            {smsState === "sending" ? "Sending…" :
              smsState === "sent" ? "SMS ready ✓" :
              smsState === "failed" ? "SMS failed" :
              attachedPhone ? "SMS receipt" : "No phone"}
          </button>
          <button onClick={onClose} className="deliver-chip" title="Dismiss banner">
            Done
          </button>
        </div>
      </div>
      {/* When SMS body is generated, show it as copy-friendly text */}
      {smsState === "sent" && smsBody && (
        <div className="mx-3 mb-2 rounded-md bg-[#0e2f0e] border border-[#2a8a2a] px-3 py-2 text-[12px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[10px] font-black tracking-[0.18em] uppercase opacity-80">
              Send to {smsPhone}
            </div>
            <button
              onClick={() => { try { navigator.clipboard.writeText(smsBody); } catch {} }}
              className="text-[10px] font-black tracking-[0.18em] uppercase px-2 py-0.5 rounded bg-[#d3f0d3] text-[#0e3a14]"
            >
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] m-0 opacity-90 leading-snug">{smsBody}</pre>
        </div>
      )}
    </div>
  );
}

function PrintIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="m3 8 9 6 9-6" />
    </svg>
  );
}
function SmsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M7 9h10 M7 13h6" />
    </svg>
  );
}

// ─── Customer Presence Card (iter-10) ─────────────────────────────────────
// Big visual upgrade when a customer is attached. Avatar with deterministic
// gradient based on hash(name), plan badge with color-coded due-date status,
// wallet balance + tap-to-show-recent indicator, business-name line if any.
function CustomerPresenceCard({
  customer,
  onWalletChanged,
}: {
  customer: AttachedCustomer;
  onWalletChanged: () => void | Promise<void>;
}) {
  const initial = (customer.name?.[0] ?? "?").toUpperCase();
  const [visits, setVisits] = useState<string[]>([]);
  useEffect(() => {
    let cancel = false;
    getCustomerVisits(customer.id)
      .then((v) => { if (!cancel) setVisits(v); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [customer.id]);
  const [showCredit, setShowCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditMethod, setCreditMethod] = useState<"Cash" | "Square" | "CardOnFile" | "Comp">("Cash");
  const [creditReason, setCreditReason] = useState("");
  const [creditPending, setCreditPending] = useState(false);
  const [creditMsg, setCreditMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submitCredit() {
    setCreditMsg(null);
    const cents = Math.round(parseFloat(creditAmount || "0") * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setCreditMsg({ kind: "err", text: "Amount must be > 0." });
      return;
    }
    if (!creditReason.trim()) {
      setCreditMsg({ kind: "err", text: "Reason required (audit trail)." });
      return;
    }
    setCreditPending(true);
    try {
      const r = await adminAddWalletCredit({
        userId: customer.id,
        amountCents: cents,
        paymentMethod: creditMethod,
        reason: creditReason.trim(),
      });
      if ("error" in r) {
        setCreditMsg({ kind: "err", text: r.error ?? "Failed to credit." });
      } else {
        setCreditMsg({ kind: "ok", text: `+ $${(cents / 100).toFixed(2)} credited.` });
        setCreditAmount("");
        setCreditReason("");
        await onWalletChanged();
      }
    } catch (e: any) {
      setCreditMsg({ kind: "err", text: e?.message ?? "Failed to credit." });
    } finally {
      setCreditPending(false);
    }
  }

  // Deterministic gradient — pick from a brand-aligned palette by name hash
  const gradient = useMemo(() => {
    const palette = [
      ["#337485", "#23596A"],   // Brand blue
      ["#C9A24A", "#8C6E27"],   // Brass gold
      ["#E70013", "#A40010"],   // Tunisian red
      ["#2D100F", "#5a3d20"],   // Dark brown
      ["#4793a6", "#1a3e48"],   // Steel blue
      ["#e2483d", "#8a1010"],   // Coral red
      ["#7c5e30", "#4a3613"],   // Walnut
    ];
    let h = 0;
    for (let i = 0; i < customer.name.length; i++) h = ((h << 5) - h) + customer.name.charCodeAt(i);
    const [a, b] = palette[Math.abs(h) % palette.length];
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
  }, [customer.name]);

  // Plan due-date countdown
  const dueInfo = useMemo(() => {
    if (!customer.planDueDate) return null;
    try {
      const [Y, M, D] = customer.planDueDate.split("-").map(Number);
      const due = new Date(Y, M - 1, D);
      due.setHours(23, 59, 59, 999);
      const now = new Date();
      const dayMs = 86400000;
      const diff = Math.floor((due.getTime() - now.getTime()) / dayMs);
      const longLabel = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return { diff, longLabel };
    } catch {
      return null;
    }
  }, [customer.planDueDate]);

  const dueTone =
    !dueInfo ? "blue" :
    dueInfo.diff < 0 ? "red" :
    dueInfo.diff <= 14 ? "amber" : "green";

  const dueLabel =
    !dueInfo ? "No due date" :
    dueInfo.diff < 0 ? `${Math.abs(dueInfo.diff)}d OVERDUE` :
    dueInfo.diff === 0 ? "Due today" :
    dueInfo.diff === 1 ? "Due tomorrow" :
    `${dueInfo.diff}d to renew`;

  return (
    <div className="presence-card">
      <div className="presence-avatar" style={{ background: gradient }} aria-hidden>
        <span style={{ position: "relative", zIndex: 2 }}>{initial}</span>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <div className="font-black text-base leading-tight tracking-tight truncate" style={{ color: BROWN }}>
            {customer.name}
          </div>
          {customer.suiteNumber && (
            <span className="presence-pill blue">#{customer.suiteNumber}</span>
          )}
          {customer.boxType === "Business" && (
            <span className="presence-pill amber">BUSINESS</span>
          )}
        </div>

        {customer.businessName && (
          <div className="text-[10px] truncate font-bold opacity-70 mb-1" style={{ color: BROWN }}>
            {customer.businessName}
          </div>
        )}
        <div className="text-[11px] truncate opacity-80 mb-2" style={{ color: BROWN }}>
          {customer.email}
          {customer.phone ? <span className="opacity-60"> · {customer.phone}</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          {customer.plan && (
            <span className="presence-pill green" title="Active plan">
              {customer.plan}{customer.planTerm ? ` · ${customer.planTerm}mo` : ""}
            </span>
          )}
          {customer.mailboxStatus && customer.mailboxStatus !== "Active" && (
            <span className={`presence-pill ${customer.mailboxStatus === "Suspended" ? "red" : "amber"}`}>
              {customer.mailboxStatus}
            </span>
          )}
          <span className={`presence-pill ${dueTone}`} title={dueInfo?.longLabel}>
            {dueLabel}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="presence-stat">Wallet</div>
            <div className="text-xl font-black leading-none tabular-nums" style={{ color: BROWN }}>
              ${(customer.walletBalanceCents / 100).toFixed(2)}
            </div>
          </div>
          <div className="flex items-end gap-2">
            {dueInfo && (
              <div className="text-right">
                <div className="presence-stat">Renews</div>
                <div className="text-[12px] font-black tabular-nums leading-tight" style={{ color: BROWN }}>
                  {dueInfo.longLabel}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowCredit((s) => !s)}
              className="text-[10px] font-black tracking-[0.16em] uppercase px-2 py-1 rounded"
              style={{
                background: showCredit ? BROWN : "rgba(45,16,15,0.08)",
                color: showCredit ? CREAM : BROWN,
                border: `1px solid ${BROWN}`,
              }}
              title="Add wallet credit"
            >
              {showCredit ? "Cancel" : "+ Credit"}
            </button>
          </div>
        </div>

        <LoyaltyPunchcard visits={visits} />

        {showCredit && (
          <div
            className="mt-3 pt-3"
            style={{ borderTop: "1px dashed rgba(45,16,15,0.3)" }}
          >
            <div className="flex flex-wrap gap-2 items-end">
              <label className="block">
                <span className="presence-stat">Amount</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-base font-black" style={{ color: BROWN }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-20 px-2 py-1 rounded border border-[#b69256] bg-white text-sm font-bold tabular-nums focus:outline-none focus:border-[#5a4318]"
                    style={{ color: BROWN }}
                  />
                </div>
              </label>
              <label className="block">
                <span className="presence-stat">Method</span>
                <select
                  value={creditMethod}
                  onChange={(e) => setCreditMethod(e.target.value as typeof creditMethod)}
                  className="px-2 py-1 rounded border border-[#b69256] bg-white text-sm font-bold focus:outline-none mt-0.5"
                  style={{ color: BROWN }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Square">Square</option>
                  <option value="CardOnFile">Card on File</option>
                  <option value="Comp">Comp (no payment)</option>
                </select>
              </label>
              <label className="flex-1 min-w-[140px] block">
                <span className="presence-stat">Reason</span>
                <input
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. cash top-up at counter"
                  className="w-full px-2 py-1 rounded border border-[#b69256] bg-white text-sm font-medium focus:outline-none focus:border-[#5a4318] mt-0.5"
                  style={{ color: BROWN }}
                />
              </label>
              <button
                onClick={submitCredit}
                disabled={creditPending}
                className="keycap-gold py-1.5 px-3 rounded text-[11px] font-black tracking-wider"
              >
                {creditPending ? "…" : "ADD"}
              </button>
            </div>
            {creditMsg && (
              <div
                className="mt-2 text-[11px] font-bold px-2 py-1 rounded"
                style={{
                  background: creditMsg.kind === "ok" ? "#d3f0d3" : "#f5d3d0",
                  color: creditMsg.kind === "ok" ? "#1a4a1a" : "#8a1010",
                  border: `1px solid ${creditMsg.kind === "ok" ? "#2a8a2a" : "#b8606a"}`,
                }}
              >
                {creditMsg.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Idle screensaver subcomponents (iter-9) ──────────────────────────────
function IdleAmbientCoins() {
  // 14 ambient coins drifting upward at low opacity. Cheaper than the
  // celebration shower — fewer tokens, longer durations, low z-index.
  const coins = useMemo(() => {
    return Array.from({ length: 14 }, () => ({
      x: Math.random() * 100,
      size: 8 + Math.random() * 10,
      dur: 7000 + Math.random() * 5000,
      delay: -Math.random() * 8000,
      rot: 180 + Math.random() * 540,
    }));
  }, []);
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {coins.map((c, i) => (
        <span
          key={i}
          className="idle-coin"
          style={{
            ["--x" as any]: `${c.x}%`,
            ["--size" as any]: `${c.size}px`,
            ["--dur" as any]: `${c.dur}ms`,
            ["--delay" as any]: `${c.delay}ms`,
            ["--rot" as any]: `${c.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

function IdleTaglineRotator() {
  // Five rotating taglines, one visible at a time on a 6s cycle. Synced via
  // the idleTagline CSS keyframe so all five share the timing window — each
  // is offset by 1.2s via animation-delay (-N s) so only one is visible.
  const TAGLINES = [
    "Your Mail. Your Way.",
    "A Smarter Mailbox in NoHo.",
    "Scan it. Forward it. Forget it.",
    "Real address — never a P.O. Box.",
    "Open Mon–Sat · 9:30a–5:30p",
  ];
  return (
    <div className="relative" style={{ height: 24 }}>
      {TAGLINES.map((t, i) => (
        <div
          key={i}
          className="idle-tagline absolute left-0 right-0"
          style={{ animationDelay: `${-i * 1.2}s`, animationDuration: `${TAGLINES.length * 1.2}s` }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

// ─── Promotions Strip (iter-18) ─────────────────────────────────────────
function PromoStrip({
  promos,
}: {
  promos: Array<{
    id: string;
    label: string;
    sub: string;
    palette: "rose" | "indigo" | "gold" | "teal" | "ember" | "olive";
    expiresAt: string | null;
    apply: () => void;
  }>;
}) {
  // Tick once a minute so countdown labels stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function countdownLabel(iso: string | null) {
    if (!iso) return null;
    try {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms < 0) return { text: "ENDED", urgent: false, expired: true };
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor((ms % 86_400_000) / 3_600_000);
      const mins = Math.floor((ms % 3_600_000) / 60_000);
      if (days >= 7) return { text: `${days}d left`, urgent: false, expired: false };
      if (days >= 1) return { text: `${days}d ${hours}h left`, urgent: false, expired: false };
      if (hours >= 1) return { text: `${hours}h ${mins}m left`, urgent: hours < 6, expired: false };
      return { text: `${mins}m left`, urgent: true, expired: false };
    } catch {
      return null;
    }
  }

  return (
    <div className="promo-strip" aria-label="Active promotions">
      {promos.map((p, i) => {
        const cd = countdownLabel(p.expiresAt);
        const expired = cd?.expired ?? false;
        return (
          <button
            key={p.id}
            className={`promo-chip promo-${p.palette} ${expired ? "expired" : ""}`}
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => { if (!expired) p.apply(); }}
            disabled={expired}
            title={expired ? "Promo ended" : "Click to apply"}
          >
            <div className="promo-tag">★ Promo</div>
            <div className="promo-label">{p.label}</div>
            <div className="promo-sub">{p.sub}</div>
            {cd && (
              <div className={`promo-countdown ${cd.urgent ? "urgent" : ""}`}>
                ⏱ {cd.text}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Cash Count Modal (iter-20) ─────────────────────────────────────────
// Used for both Open Shift and Close Shift. Cashier enters denomination
// counts; the modal computes a live total and (for Close) variance against
// expected. On Submit: open mode persists the shift; close mode archives it
// and clears the active shift.
const CASH_DENOMS: Array<{ cents: number; label: string; sub: string }> = [
  { cents: 10000, label: "$100", sub: "C-note" },
  { cents: 5000,  label: "$50",  sub: "Grant" },
  { cents: 2000,  label: "$20",  sub: "Jackson" },
  { cents: 1000,  label: "$10",  sub: "Hamilton" },
  { cents: 500,   label: "$5",   sub: "Lincoln" },
  { cents: 100,   label: "$1",   sub: "Buck" },
  { cents: 25,    label: "25¢",  sub: "Quarter" },
  { cents: 10,    label: "10¢",  sub: "Dime" },
  { cents: 5,     label: "5¢",   sub: "Nickel" },
  { cents: 1,     label: "1¢",   sub: "Penny" },
];

function CashCountModal({
  mode,
  shift,
  todaysCashCents,
  onClose,
  onSubmit,
}: {
  mode: "open" | "close";
  shift: {
    openedAt: string;
    openingTotalCents: number;
  } | null;
  todaysCashCents: number;
  onClose: () => void;
  onSubmit: (counts: Record<string, number>, totalCents: number) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const d of CASH_DENOMS) initial[String(d.cents)] = 0;
    return initial;
  });

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalCents = useMemo(
    () => Object.entries(counts).reduce((s, [v, n]) => s + Number(v) * (n || 0), 0),
    [counts],
  );
  const expectedClose = (shift?.openingTotalCents ?? 0) + todaysCashCents;
  const variance = mode === "close" ? totalCents - expectedClose : 0;
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  function setCount(denom: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setCounts((prev) => ({ ...prev, [denom]: n }));
  }

  return (
    <div className="cash-overlay" onClick={onClose}>
      <div className="cash-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3" style={{ borderBottom: "1px solid var(--cab-trim)" }}>
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase rail-engrave">
              ◆ {mode === "open" ? "Open Shift" : "Close Shift"} ◆
            </div>
            <div className="text-2xl font-black tracking-tight">
              {mode === "open" ? "Count starting cash" : "Reconcile the till"}
            </div>
            <div className="text-[11px] opacity-70 font-bold mt-0.5">
              {mode === "open"
                ? "Enter the count of each denomination in the drawer right now."
                : `Opened ${shift?.openedAt ? new Date(shift.openedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"} · cash sales since open: ${fmt(todaysCashCents)}`}
            </div>
          </div>
          <button onClick={onClose} className="keycap-dark px-3 py-2 rounded-lg text-[12px] font-black">
            CLOSE · ESC
          </button>
        </div>

        {/* Denomination tray */}
        <div className="cash-tray">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CASH_DENOMS.map((d) => {
              const sub = (counts[String(d.cents)] || 0) * d.cents;
              return (
                <div key={d.cents} className="cash-slot">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-black tracking-wide">{d.label}</span>
                    <span className="text-[8px] opacity-65 tracking-[0.18em] uppercase">{d.sub}</span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={counts[String(d.cents)] ?? 0}
                    onChange={(e) => setCount(String(d.cents), e.target.value)}
                    className="cash-slot-input"
                  />
                  <div className="text-[10px] text-center opacity-75 font-black tabular-nums">
                    {fmt(sub)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="cash-summary">
          <div className="cash-stat">
            <div className="cash-stat-label">Counted</div>
            <div className="cash-stat-value">{fmt(totalCents)}</div>
          </div>
          {mode === "close" ? (
            <>
              <div className="cash-stat">
                <div className="cash-stat-label">Opening</div>
                <div className="cash-stat-value">{fmt(shift?.openingTotalCents ?? 0)}</div>
              </div>
              <div className="cash-stat">
                <div className="cash-stat-label">+ Cash Sales</div>
                <div className="cash-stat-value">{fmt(todaysCashCents)}</div>
              </div>
              <div className="cash-stat">
                <div className="cash-stat-label">Variance</div>
                <div className={`cash-stat-value ${variance < 0 ? "short" : variance > 0 ? "over" : "exact"}`}>
                  {variance > 0 ? "+" : ""}{fmt(variance)}
                </div>
              </div>
            </>
          ) : (
            <div className="cash-stat" style={{ gridColumn: "span 3" }}>
              <div className="cash-stat-label">Note</div>
              <div className="text-[12px] opacity-90 leading-snug" style={{ color: CREAM }}>
                Opening total is recorded as the starting balance. At close, we'll compare actual count vs starting + today's cash sales.
              </div>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="keycap-dark py-3 rounded-xl text-sm font-black tracking-wide">
            CANCEL
          </button>
          <button
            onClick={() => onSubmit(counts, totalCents)}
            className="keycap-gold py-3 rounded-xl text-sm font-black tracking-wide"
          >
            {mode === "open"
              ? `OPEN SHIFT · ${fmt(totalCents)}`
              : variance === 0
                ? `CLOSE SHIFT · EXACT`
                : variance > 0
                  ? `CLOSE SHIFT · OVER ${fmt(Math.abs(variance))}`
                  : `CLOSE SHIFT · SHORT ${fmt(Math.abs(variance))}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TillIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 13h18 M7 16h2 M11 16h2 M15 16h2" />
      <rect x="6" y="6" width="12" height="3" rx="0.5" />
      <path d="M12 4v2" />
    </svg>
  );
}

// ─── Returns Modal (iter-17) ────────────────────────────────────────────
// Search recent sales by receipt # / customer name / suite / phone, expand
// a row to see the full receipt detail, type a refund reason, then confirm
// to fire voidSale + REFUND-stamp animation. Esc closes; click backdrop closes.
function ReturnsModal({
  onClose,
  onAfterRefund,
}: {
  onClose: () => void;
  onAfterRefund: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<POSSaleDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stampShown, setStampShown] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced query
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = window.setTimeout(() => {
      getRecentSalesDetailed(query).then((r) => {
        if (!cancel) {
          setResults(r);
          setLoading(false);
          // Auto-pick top result if nothing selected and search is specific
          if (query.trim().length >= 3 && r.length === 1) setActiveId(r[0].id);
        }
      }).catch(() => { if (!cancel) setLoading(false); });
    }, 220);
    return () => { cancel = true; clearTimeout(t); };
  }, [query]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = results.find((r) => r.id === activeId) ?? null;
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  async function confirmRefund() {
    if (!active) return;
    if (!reason.trim()) { setErrorMsg("Refund reason required."); return; }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const r = await voidSale({ saleId: active.id, reason: reason.trim() });
      if ("error" in r) {
        setErrorMsg(r.error);
        setSubmitting(false);
        return;
      }
      setStampShown(true);
      // Fire-and-forget refresh of recent sales / till
      onAfterRefund();
      // Close after stamp animation finishes
      setTimeout(() => onClose(), 1700);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Refund failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="returns-overlay" onClick={onClose}>
      <div className="returns-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-[#5a4318]">
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase" style={{ color: "#a40010" }}>
              ◆ Returns / Refund ◆
            </div>
            <div className="text-2xl font-black tracking-tight">Reverse a recent sale</div>
            <div className="text-[11px] opacity-70 font-bold mt-0.5">
              Searches the last 30 days. Reason is required for the audit log.
            </div>
          </div>
          <button onClick={onClose} className="keycap-dark px-3 py-2 rounded-lg text-[12px] font-black">
            CLOSE · ESC
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-4">
          {/* Left: search + list */}
          <div>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: BROWN, opacity: 0.55 }}>
                <SearchIcon />
              </span>
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Receipt # · name · suite · phone"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#8c6e27] text-sm font-medium focus:outline-none focus:border-[#5a4318]"
                style={{ color: BROWN }}
              />
            </div>
            {loading && results.length === 0 ? (
              <div className="returns-list p-4 text-center text-[11px] opacity-60 font-bold">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="returns-list p-4 text-center text-[11px] opacity-60 font-bold">
                No sales found.
              </div>
            ) : (
              <div className="returns-list">
                {results.map((s) => (
                  <div
                    key={s.id}
                    className={`returns-row ${activeId === s.id ? "active" : ""} ${s.status === "Voided" ? "voided" : ""}`}
                    onClick={() => setActiveId(s.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="num">#{String(s.number).padStart(5, "0")}</span>
                        <span className={`badge-method ${
                          s.paymentMethod === "Cash" ? "cash" :
                          s.paymentMethod === "Zelle" ? "zelle" :
                          s.paymentMethod === "Square" ? "square" :
                          s.paymentMethod === "CardOnFile" ? "card" :
                          s.paymentMethod === "Wallet" ? "wallet" : "custom"
                        }`}>
                          {s.paymentMethod === "CardOnFile" ? "Card" : s.paymentMethod}
                        </span>
                        {s.status === "Voided" && (
                          <span className="text-[9px] font-black tracking-[0.18em] uppercase" style={{ color: "#a40010" }}>
                            VOIDED
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] font-bold truncate mt-0.5">
                        {s.customerName ?? "Walk-in"}
                        {s.customerSuite ? <span className="opacity-60 font-normal"> · #{s.customerSuite}</span> : null}
                        <span className="opacity-60 font-normal"> · {s.items.length} item{s.items.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="text-[10px] opacity-60 font-bold">
                        {new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {s.cashierName ? ` · ${s.cashierName}` : ""}
                      </div>
                    </div>
                    <div className="text-base font-black tabular-nums shrink-0" style={{ color: BROWN }}>
                      {fmt(s.totalCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail / receipt + refund form */}
          <div>
            {!active ? (
              <div className="rounded-md border border-dashed border-[#8c6e27]/40 bg-[rgba(255,255,255,0.45)] p-12 text-center text-[12px] opacity-60 font-bold">
                Select a sale on the left to review and refund.
              </div>
            ) : (
              <div className="relative">
                {stampShown && (
                  <div className="paid-stamp" aria-hidden style={{ color: "#c01818" }}>
                    <div className="paid-stamp-ring" style={{ borderColor: "#c01818" }}>
                      <div className="paid-stamp-text">REFUND</div>
                      <div className="paid-stamp-sub">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
                    </div>
                  </div>
                )}
                <div className="returns-detail-paper">
                  <div style={{ textAlign: "center", borderBottom: "1.5px solid #2D100F", paddingBottom: 6 }}>
                    <div className="font-black tracking-[0.32em]" style={{ fontSize: 10, color: "#337485" }}>
                      ◆ NOHO MAILBOX ◆
                    </div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 4, fontWeight: 700, letterSpacing: "0.16em" }}>
                      # {String(active.number).padStart(5, "0")} ·{" "}
                      {new Date(active.paidAt ?? active.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                    {active.status === "Voided" && (
                      <div style={{ fontSize: 9, color: "#a40010", marginTop: 3, fontWeight: 900, letterSpacing: "0.2em" }}>
                        ★ ALREADY VOIDED — {active.voidReason ?? "no reason"}
                      </div>
                    )}
                  </div>

                  {active.customerName && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", marginBottom: 2 }}>Customer</div>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>
                        {active.customerName}
                        {active.customerSuite ? <span style={{ color: "#337485" }}> · #{active.customerSuite}</span> : null}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", marginBottom: 2 }}>Items</div>
                    {active.items.map((it) => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>{it.name}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>{it.quantity} × {fmt(it.unitPriceCents)}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmt(it.totalCents)}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 5, borderTop: "1px dashed #c9c4bc" }}>
                    <div className="row"><span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(active.subtotalCents)}</span></div>
                    {active.discountCents > 0 && <div className="row"><span>Discount</span><span style={{ fontVariantNumeric: "tabular-nums" }}>− {fmt(active.discountCents)}</span></div>}
                    {active.taxCents > 0 && <div className="row"><span>Tax</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(active.taxCents)}</span></div>}
                    {active.tipCents > 0 && <div className="row"><span>Tip</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(active.tipCents)}</span></div>}
                    <div className="row b" style={{ fontSize: 14, fontWeight: 900, color: "#2D100F", borderTop: "1px solid #2D100F", marginTop: 3, paddingTop: 4 }}>
                      <span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(active.totalCents)}</span>
                    </div>
                  </div>
                </div>

                {/* Refund form */}
                {active.status === "Voided" ? (
                  <div className="mt-3 px-3 py-3 rounded-md text-[12px] font-bold" style={{ background: "#f3e3e0", color: "#8a1010", border: "1px solid #b8606a" }}>
                    This sale was already voided{active.voidedAt ? ` ${new Date(active.voidedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}.
                  </div>
                ) : stampShown ? (
                  <div className="mt-3 px-3 py-3 rounded-md text-[12px] font-bold" style={{ background: "#d3f0d3", color: "#1a4a1a", border: "1px solid #2a8a2a" }}>
                    ✓ Refund issued. Closing…
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    <label className="block">
                      <span className="text-[10px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
                        Refund Reason (audit log)
                      </span>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. customer changed mind, item defective, duplicate ring…"
                        rows={2}
                        className="w-full mt-0.5 px-3 py-2 rounded border border-[#8c6e27] bg-white text-sm font-medium focus:outline-none focus:border-[#5a4318]"
                        style={{ color: BROWN }}
                      />
                    </label>
                    {errorMsg && (
                      <div className="text-[11px] font-bold px-3 py-1.5 rounded" style={{ background: "#f3e3e0", color: "#8a1010", border: "1px solid #b8606a" }}>
                        {errorMsg}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={onClose}
                        disabled={submitting}
                        className="keycap py-3 rounded-xl text-sm font-black tracking-wide"
                      >
                        BACK · CANCEL
                      </button>
                      <button
                        onClick={confirmRefund}
                        disabled={submitting || !reason.trim()}
                        className="keycap-red py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
                      >
                        {submitting ? "REFUNDING…" : <>CONFIRM REFUND {fmt(active.totalCents)}</>}
                      </button>
                    </div>
                    <div className="text-[10px] text-center opacity-65 font-bold tracking-wide" style={{ color: BROWN }}>
                      Full void — wallet payments auto-credit back; cash/card refunds need to be physically returned.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14H5l3-3 M5 11l3 3" />
      <path d="M5 12h10a4 4 0 0 1 4 4v3" />
    </svg>
  );
}

// ─── Live Activity Ticker (iter-16) ──────────────────────────────────────
// Stock-ticker-style horizontal marquee above the cabinet. Reads recent
// events from getPOSTickerEvents and scrolls them on a 75s loop. Pauses on
// hover so cashier can read. Hides if no events. Track is duplicated in the
// DOM so the -50% translate animation produces a seamless infinite scroll.
function TickerStrip({
  events,
  paused,
  onHover,
}: {
  events: TickerEvent[];
  paused: boolean;
  onHover: (paused: boolean) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="ticker-rail">
        <div className="ticker-empty">— no recent activity —</div>
      </div>
    );
  }

  function relativeTime(iso: string): string {
    try {
      const dt = new Date(iso).getTime();
      const m = Math.floor((Date.now() - dt) / 60_000);
      if (m < 1) return "now";
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h${(m % 60).toString().padStart(2, "0")}m ago`;
      return `${Math.floor(h / 24)}d ago`;
    } catch { return ""; }
  }

  // Duplicate events so the -50% translate animation loops seamlessly.
  const doubled = [...events, ...events];

  return (
    <div
      className={`ticker-rail ${paused ? "paused" : ""}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="ticker-track">
        {doubled.map((ev, i) => (
          <span key={`${ev.id}-${i}`} className={`ticker-chip kind-${ev.kind}`}>
            <span className="ticker-icon">{ev.iconLetter}</span>
            <span>{ev.message}</span>
            <span className="ticker-time">{relativeTime(ev.atIso)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function EventToast({ event, onClose }: { event: TickerEvent; onClose: () => void }) {
  return (
    <div
      className={`event-toast kind-${event.kind}`}
      onClick={onClose}
      role="button"
      tabIndex={0}
    >
      <div className="text-[9px] font-black tracking-[0.18em] uppercase opacity-65">
        Live event
      </div>
      <div className="text-sm font-black mt-0.5 truncate">{event.message}</div>
      {(event.customerName || event.suiteNumber) && (
        <div className="text-[10px] font-bold opacity-70 mt-0.5">
          {event.customerName ?? "—"}
          {event.suiteNumber ? ` · #${event.suiteNumber}` : ""}
        </div>
      )}
    </div>
  );
}

// ─── Receipt Preview Modal (iter-15) ────────────────────────────────────
function ReceiptPreviewModal({
  cart,
  customer,
  subtotalCents,
  discountCents,
  taxCents,
  tipCents,
  totalCents,
  method,
  customMethodLabel,
  paymentRef,
  cashTenderedCents,
  changeDueCents,
  saleNumberPreview,
  pending,
  onCancel,
  onConfirm,
}: {
  cart: Array<POSCartLine & { _key?: string }>;
  customer: AttachedCustomer | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  method: POSPaymentMethod;
  customMethodLabel: string;
  paymentRef: string;
  cashTenderedCents: number;
  changeDueCents: number;
  saleNumberPreview: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // ESC cancels; Enter confirms (when not in a text field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        onConfirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const methodLabel =
    method === "Custom" ? `Custom · ${customMethodLabel || "—"}` :
    method === "CardOnFile" ? "Card on File" : method;

  return (
    <div className="preview-overlay" onClick={onCancel}>
      <div className="preview-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase" style={{ color: BLUE }}>
              ◆ Receipt Preview ◆
            </div>
            <div className="text-base sm:text-lg font-black tracking-tight">
              Verify before charging
            </div>
          </div>
          <div className="text-[10px] font-bold tracking-wider opacity-65">
            ESC · cancel
          </div>
        </div>

        {/* Live receipt rendering */}
        <div className="preview-paper">
          <div className="text-center" style={{ borderBottom: "1.5px solid #2D100F", paddingBottom: 6 }}>
            <div className="font-black tracking-[0.32em]" style={{ fontSize: 10, color: "#337485" }}>
              ◆ NOHO MAILBOX ◆
            </div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>
              5062 LANKERSHIM BLVD · NOHO CA 91601
            </div>
            <div style={{ fontSize: 9, color: "#444" }}>(818) 506-7744</div>
            <div style={{ fontSize: 9, color: "#888", marginTop: 4, fontWeight: 700, letterSpacing: "0.16em" }}>
              # {String(saleNumberPreview).padStart(5, "0")} · {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>

          {customer && (
            <>
              <div className="h">Customer</div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {customer.name}
                {customer.suiteNumber && <span style={{ color: "#337485" }}> · #{customer.suiteNumber}</span>}
              </div>
              {customer.email && <div style={{ fontSize: 10, color: "#666" }}>{customer.email}</div>}
            </>
          )}

          <div className="h">Items</div>
          {cart.length === 0 ? (
            <div style={{ fontSize: 11, color: "#888", textAlign: "center", padding: "8px 0" }}>
              — empty cart —
            </div>
          ) : cart.map((line, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", marginBottom: 2 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{line.name}</div>
                <div style={{ fontSize: 10, color: "#888" }}>
                  {line.quantity} × {fmt(line.unitPriceCents)}
                  {(line.discountCents ?? 0) > 0 ? ` · disc ${fmt(line.discountCents ?? 0)}` : ""}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {fmt(line.unitPriceCents * line.quantity - (line.discountCents ?? 0))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, paddingTop: 5, borderTop: "1px dashed #c9c4bc" }}>
            <div className="row"><span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(subtotalCents)}</span></div>
            {discountCents > 0 && <div className="row"><span>Discount</span><span style={{ fontVariantNumeric: "tabular-nums" }}>− {fmt(discountCents)}</span></div>}
            {taxCents > 0 && <div className="row"><span>Tax</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(taxCents)}</span></div>}
            {tipCents > 0 && <div className="row"><span>Tip</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(tipCents)}</span></div>}
            <div className="row b"><span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(totalCents)}</span></div>
            {method === "Cash" && cashTenderedCents > 0 && (
              <>
                <div className="row" style={{ fontSize: 11 }}><span>Cash tendered</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(cashTenderedCents)}</span></div>
                <div className="row" style={{ fontSize: 11 }}><span>Change</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(changeDueCents)}</span></div>
              </>
            )}
          </div>

          <div className="h">Payment</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>
            {methodLabel}
            {paymentRef ? <span style={{ color: "#666" }}> · ref {paymentRef}</span> : null}
            {method === "Zelle" ? <div style={{ fontSize: 9, color: "#1a3a6a", marginTop: 2 }}>Zelle to <b>{ZELLE_RECIPIENT_EMAIL}</b></div> : null}
          </div>

          <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1.5px solid #2D100F", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485" }}>
              Thank you for choosing NOHO Mailbox
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={onCancel}
            className="keycap-dark py-3 rounded-xl text-sm font-black tracking-wide"
            disabled={pending}
          >
            ← BACK · CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="keycap-red py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
          >
            {pending ? "RINGING…" : <>CONFIRM CHARGE {fmt(totalCents)}</>}
          </button>
        </div>
        <div className="text-[10px] text-center mt-2 opacity-60 font-bold tracking-wide">
          Enter to confirm · Esc to cancel
        </div>
      </div>
    </div>
  );
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Hotkey overlay (iter-8) ─────────────────────────────────────────────
function HotkeyOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const platform = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

  const groups = [
    {
      title: "General",
      keys: [
        [<><span className="kbd">{platform}</span> + <span className="kbd">K</span></>, "Focus search bar"],
        [<><span className="kbd">Esc</span></>, "Close popovers · clear search · exit Counter Mode"],
        [<><span className="kbd">Shift</span> + <span className="kbd">?</span></>, "Toggle this overlay"],
      ],
    },
    {
      title: "Search results",
      keys: [
        [<><span className="kbd">↑</span> / <span className="kbd">↓</span></>, "Move highlight"],
        [<><span className="kbd">Enter</span></>, "Add highlighted item to cart"],
      ],
    },
    {
      title: "Payment method",
      keys: [
        [<><span className="kbd">1</span></>, "Cash"],
        [<><span className="kbd">2</span></>, "Zelle"],
        [<><span className="kbd">3</span></>, "Square"],
        [<><span className="kbd">4</span></>, "Card on File"],
        [<><span className="kbd">5</span></>, "Wallet"],
        [<><span className="kbd">6</span></>, "Custom"],
      ],
    },
  ];

  return (
    <div className="hk-overlay" onClick={onClose}>
      <div className="hk-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase" style={{ color: BLUE }}>◆ Keyboard Shortcuts ◆</div>
            <div className="text-2xl font-black tracking-tight">NOHO Cash Register</div>
          </div>
          <button onClick={onClose} className="text-[11px] font-black px-3 py-1.5 rounded bg-[rgba(45,16,15,0.1)] border border-[#5a4318]">
            Close · Esc
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="text-[11px] font-black tracking-[0.18em] uppercase mb-1.5 opacity-70">{g.title}</div>
              <div className="space-y-1">
                {g.keys.map(([key, desc], i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="font-bold opacity-90">{desc}</span>
                    <span className="flex items-center gap-1 shrink-0">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[#5a4318] text-[10px] opacity-65 text-center font-bold tracking-[0.18em] uppercase">
          Tip: Counter Mode + Search = lightning-fast counter ringup
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

// ─── Z-Report modal (iter-7) ────────────────────────────────────────────
function ZReportModal({
  data,
  loading,
  onClose,
}: {
  data: ZReportData | null;
  loading: boolean;
  onClose: () => void;
}) {
  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const dateLabel = data
    ? new Date(`${data.dateYmd}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="z-overlay">
      <div className="z-card p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-[#5a4318]">
          <div>
            <div className="text-[10px] font-black tracking-[0.32em] uppercase" style={{ color: BLUE }}>
              ◆ End-of-Shift Z-Report ◆
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-0.5">
              Station 1 · {dateLabel || "—"}
            </div>
            <div className="text-[11px] opacity-70 font-bold mt-0.5">
              Generated {data ? new Date(data.generatedAtIso).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }) : "…"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <a
                href={`/admin/pos/zreport/${data.dateYmd}`}
                target="_blank"
                className="keycap-gold px-3 py-2 rounded-lg text-[12px] font-black"
              >
                Print 4×6
              </a>
            )}
            <button onClick={onClose} className="keycap-dark px-3 py-2 rounded-lg text-[12px] font-black">
              CLOSE · ESC
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-16 text-center text-sm font-bold opacity-70">
            Tabulating today's till…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Headline totals */}
            <div className="z-totals-grid">
              <ZBigStat label="Net Total"   value={fmt(data.totals.netCents)} accent />
              <ZBigStat label="Gross"       value={fmt(data.totals.grossCents)} />
              <ZBigStat label="Sales Count" value={String(data.totals.saleCount)} />
              <ZBigStat label="Voided"      value={data.totals.voidCount > 0 ? `${fmt(data.totals.voidedCents)} · ${data.totals.voidCount}x` : "$0.00"} subdued={data.totals.voidCount === 0} />
            </div>
            <div className="z-totals-grid">
              <ZSmallStat label="Discounts" value={fmt(data.totals.discountCents)} />
              <ZSmallStat label="Tax"       value={fmt(data.totals.taxCents)} />
              <ZSmallStat label="Tips"      value={fmt(data.totals.tipCents)} />
              <ZSmallStat label="Avg Sale"  value={data.totals.saleCount > 0 ? fmt(Math.round(data.totals.netCents / data.totals.saleCount)) : "—"} />
            </div>

            {/* Hourly histogram */}
            <ZSection title="Hourly velocity" subtitle="Each bar = total $ in that hour">
              <ZHourlyChart data={data.byHour} />
            </ZSection>

            {/* Two-up: Methods + Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ZSection title="By Payment Method">
                <ZHorizontalBars
                  rows={data.byMethod.map((r) => ({ label: r.method === "CardOnFile" ? "Card on File" : r.method, value: r.cents, sub: `${r.count} sale${r.count === 1 ? "" : "s"}` }))}
                  formatValue={fmt}
                />
              </ZSection>
              <ZSection title="By Category">
                <ZHorizontalBars
                  rows={data.byCategory.map((r) => ({ label: r.category, value: r.cents, sub: `${r.quantity} item${r.quantity === 1 ? "" : "s"}` }))}
                  formatValue={fmt}
                />
              </ZSection>
            </div>

            {/* Top items + Cashiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ZSection title="Top Items">
                <ZHorizontalBars
                  rows={data.topItems.map((r) => ({ label: r.name, value: r.cents, sub: `${r.quantity}×` }))}
                  formatValue={fmt}
                />
              </ZSection>
              <ZSection title="Cashiers">
                <ZHorizontalBars
                  rows={data.byCashier.map((r) => ({ label: r.name, value: r.cents, sub: `${r.count} ring${r.count === 1 ? "" : "s"}` }))}
                  formatValue={fmt}
                />
              </ZSection>
            </div>

            {/* Footer signature line */}
            <div className="pt-4 border-t-2 border-[#5a4318] flex items-center justify-between text-[11px] opacity-80">
              <div>NOHO Mailbox · 5062 Lankershim Blvd · (818) 506-7744</div>
              <div className="font-bold tracking-[0.18em] uppercase">— End of Z-Report —</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ZBigStat({ label, value, accent, subdued }: { label: string; value: string; accent?: boolean; subdued?: boolean }) {
  return (
    <div
      className="rounded-xl p-3 sm:p-4"
      style={{
        background: accent ? `linear-gradient(180deg, ${BLUE} 0%, #23596A 100%)` : "rgba(255,255,255,0.55)",
        color: accent ? CREAM : BROWN,
        border: accent ? "1px solid #1a3e48" : "1px solid #b69256",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
        opacity: subdued ? 0.6 : 1,
      }}
    >
      <div className="text-[9px] font-black tracking-[0.18em] uppercase opacity-80">{label}</div>
      <div className="text-2xl sm:text-3xl font-black tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  );
}

function ZSmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-3 py-2 bg-[rgba(255,255,255,0.45)] border border-[#b69256]">
      <div className="text-[8px] font-black tracking-[0.18em] uppercase opacity-70">{label}</div>
      <div className="text-base font-black tabular-nums">{value}</div>
    </div>
  );
}

function ZSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[12px] font-black tracking-[0.18em] uppercase">{title}</div>
        {subtitle && <div className="text-[10px] opacity-65 font-bold">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function ZHourlyChart({ data }: { data: Array<{ hour: number; cents: number; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.cents));
  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;
  return (
    <div className="rounded-md bg-[rgba(255,255,255,0.45)] border border-[#b69256] p-3">
      <div className="grid grid-cols-24 gap-[2px] h-32 items-end" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {data.map((d) => {
          const height = (d.cents / max) * 100;
          return (
            <div key={d.hour} className="relative flex items-end" style={{ height: "100%" }}>
              <div
                className="z-bar-vert"
                style={{ height: `${Math.max(2, height)}%`, animationDelay: `${d.hour * 18}ms` }}
                title={`${d.hour}:00 — ${fmt(d.cents)} · ${d.count} sale${d.count === 1 ? "" : "s"}`}
              />
              {d.cents > 0 && (
                <div className="absolute -top-4 left-0 right-0 text-center text-[8px] font-black tabular-nums opacity-80">
                  {fmt(d.cents)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-24 gap-[2px] mt-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {data.map((d) => (
          <div key={d.hour} className="text-center text-[7px] font-bold opacity-60 tabular-nums">
            {d.hour % 3 === 0 ? d.hour : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function ZHorizontalBars({
  rows,
  formatValue,
}: {
  rows: Array<{ label: string; value: number; sub?: string }>;
  formatValue: (n: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md bg-[rgba(255,255,255,0.45)] border border-[#b69256] p-4 text-center text-[12px] opacity-60 font-bold">
        — none today —
      </div>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-md bg-[rgba(255,255,255,0.45)] border border-[#b69256] p-3 space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[140px_1fr_auto] gap-2 items-center text-[11px]">
          <div className="font-bold truncate">{r.label}</div>
          <div className="relative h-5 bg-[rgba(45,16,15,0.08)] rounded overflow-hidden">
            <div
              className="z-bar-horz"
              style={{
                width: `${Math.max(3, (r.value / max) * 100)}%`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <div className="text-right">
            <div className="font-black tabular-nums">{formatValue(r.value)}</div>
            {r.sub && <div className="text-[9px] opacity-60 font-bold">{r.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ChartIcon — for the Z-Read button
function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <rect x="6" y="13" width="3" height="6" rx="0.5" />
      <rect x="11" y="9" width="3" height="10" rx="0.5" />
      <rect x="16" y="5" width="3" height="14" rx="0.5" />
    </svg>
  );
}

// KioskIcon — fullscreen-corner glyph for the Counter Mode toggle
function KioskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V5h4 M16 5h4v4 M20 15v4h-4 M8 19H4v-4" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function SoundOn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M19 6a8 8 0 0 1 0 12" />
    </svg>
  );
}
function SoundOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="m17 9 6 6 M23 9l-6 6" />
    </svg>
  );
}

// ─── Cash drawer — physical till with bill slots + coin tray + live counters ──
//
// Renders ONLY when open. Animates in via drawerSlide keyframes (overshoot
// curve mimicking a real spring drawer). Six bill slots (1/5/10/20/50/100) +
// four coin slots (penny/nickel/dime/quarter). Each compartment shows the
// stacked bills/coins with a live ± stepper. Persists to localStorage so the
// till survives page reloads.

const BILL_DENOMINATIONS = [
  { cents: 10000, label: "$100", code: "C-Note", from: "#bcccae", to: "#94a883", border: "#3f5230", ink: "#1a2a14" },
  { cents: 5000,  label: "$50",  code: "Grant",  from: "#cebd9a", to: "#a89378", border: "#594a30", ink: "#2c2113" },
  { cents: 2000,  label: "$20",  code: "Jackson",from: "#a8b89e", to: "#86977c", border: "#3a4a30", ink: "#152018" },
  { cents: 1000,  label: "$10",  code: "Hamilton",from:"#bca588", to: "#9e8868", border: "#5a4326", ink: "#251a0e" },
  { cents: 500,   label: "$5",   code: "Lincoln", from:"#d2c4ad", to: "#a89e85", border: "#544a35", ink: "#221b10" },
  { cents: 100,   label: "$1",   code: "Buck",    from:"#aab59f", to: "#85907a", border: "#34402c", ink: "#101b13" },
] as const;

const COIN_DENOMINATIONS = [
  { cents: 25, label: "25¢", code: "Quarter", className: "coin-silver", size: 38 },
  { cents: 10, label: "10¢", code: "Dime",    className: "coin-silver", size: 30 },
  { cents: 5,  label: "5¢",  code: "Nickel",  className: "coin-silver", size: 36 },
  { cents: 1,  label: "1¢",  code: "Penny",   className: "coin-copper", size: 32 },
] as const;

function CashDrawer({
  open,
  onClose,
  tray,
  adjust,
  totalCents,
}: {
  open: boolean;
  onClose: () => void;
  tray: Record<string, number>;
  adjust: (denom: string, delta: number) => void;
  totalCents: number;
}) {
  // Render-with-animation pattern: keep the wrapper mounted briefly during
  // close so the retract animation can play.
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setRender(true); setClosing(false); }
    else if (render) {
      setClosing(true);
      const t = setTimeout(() => { setRender(false); setClosing(false); }, 320);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  if (!render) return null;

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className={`drawer-housing rounded-b-2xl px-3 sm:px-5 pt-3 pb-4 -mt-2 ${closing ? "drawer-anim-close" : "drawer-anim-open"}`}>
      {/* Drawer face / pull handle */}
      <div
        className="rounded-md mb-3 px-3 py-2 flex items-center justify-between"
        style={{
          background: "linear-gradient(180deg,#c9a24a 0%,#8c6e27 100%)",
          border: "1px solid #5a4318",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ color: "#2D100F" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="9" width="18" height="11" rx="1.5" />
              <path d="M3 13h18" />
              <rect x="6" y="6" width="12" height="3" rx="0.5" />
              <circle cx="12" cy="4.5" r="0.9" />
            </svg>
          </span>
          <div className="text-[10px] font-black tracking-[0.28em] uppercase" style={{ color: "#2D100F" }}>
            Cash Drawer · Open
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[8px] font-black tracking-[0.18em] uppercase" style={{ color: "#2D100F", opacity: 0.65 }}>In Drawer</div>
            <div className="text-base font-black tabular-nums" style={{ color: "#2D100F" }}>{fmt(totalCents)}</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[11px] font-black tracking-wide"
            style={{
              background: "linear-gradient(180deg,#fdf7e6 0%,#ebd4a8 100%)",
              border: "1px solid #5a4318",
              color: "#2D100F",
              boxShadow: "0 2px 0 #5a4318",
            }}
          >
            CLOSE DRAWER
          </button>
        </div>
      </div>

      {/* Tray itself */}
      <div className="drawer-tray p-3 sm:p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {BILL_DENOMINATIONS.map((d) => (
            <BillSlot
              key={d.cents}
              denom={d}
              count={tray[String(d.cents)] ?? 0}
              onInc={() => adjust(String(d.cents), +1)}
              onDec={() => adjust(String(d.cents), -1)}
            />
          ))}
        </div>
        {/* Coin row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COIN_DENOMINATIONS.map((d) => (
            <CoinSlot
              key={d.cents}
              denom={d}
              count={tray[String(d.cents)] ?? 0}
              onInc={() => adjust(String(d.cents), +1)}
              onDec={() => adjust(String(d.cents), -1)}
            />
          ))}
        </div>
      </div>

      {/* Footer micro-note */}
      <div className="text-[10px] text-center mt-3" style={{ color: "rgba(247,230,194,0.7)", letterSpacing: "0.18em" }}>
        — denomination counts persist across reloads (per browser) —
      </div>
    </div>
  );
}

function BillSlot({
  denom,
  count,
  onInc,
  onDec,
}: {
  denom: typeof BILL_DENOMINATIONS[number];
  count: number;
  onInc: () => void;
  onDec: () => void;
}) {
  const subtotal = denom.cents * count;
  // Render up to 6 bills stacked offset for visual "stack" feel; if count > 6 show a "+ N more" label.
  const stackVisible = Math.min(count, 6);
  return (
    <div className="bill-slot p-2">
      <div className="text-[9px] font-black tracking-[0.18em] uppercase mb-1" style={{ color: "#f5d6a3" }}>
        {denom.label} · <span className="opacity-70">{denom.code}</span>
      </div>
      <div className="relative h-14 mb-1.5">
        {Array.from({ length: stackVisible }).map((_, i) => (
          <div
            key={i}
            className="bill absolute left-1 right-1 rounded-sm flex items-center justify-between px-2 text-[10px] font-black"
            style={{
              ["--bill-from" as any]: denom.from,
              ["--bill-to" as any]: denom.to,
              ["--bill-border" as any]: denom.border,
              ["--bill-ink" as any]: denom.ink,
              top: `${i * 2}px`,
              height: "16px",
              transform: `rotate(${(i % 2 === 0 ? -0.4 : 0.4) * (i + 1)}deg)`,
              zIndex: i,
            }}
          >
            <span>{denom.label}</span>
            <span className="text-[8px] opacity-80">USA</span>
            <span>{denom.label}</span>
          </div>
        ))}
        {count === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase tracking-wider" style={{ color: "rgba(245,214,163,0.45)" }}>
            empty
          </div>
        )}
        {count > 6 && (
          <div className="absolute right-1 top-0 text-[8px] font-black tabular-nums px-1 rounded" style={{ background: "rgba(0,0,0,0.4)", color: "#f5d6a3" }}>
            ×{count}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px]" style={{ color: "#f5d6a3" }}>
        <button
          onClick={onDec}
          disabled={count === 0}
          className="w-6 h-5 rounded font-black"
          style={{ background: "rgba(0,0,0,0.45)", color: "#f5d6a3", opacity: count === 0 ? 0.35 : 1 }}
          aria-label="Remove one"
        >−</button>
        <div className="font-black tabular-nums">×{count}</div>
        <button
          onClick={onInc}
          className="w-6 h-5 rounded font-black"
          style={{ background: "rgba(0,0,0,0.45)", color: "#f5d6a3" }}
          aria-label="Add one"
        >+</button>
      </div>
      <div className="text-center text-[10px] font-black tabular-nums mt-1" style={{ color: "#fffbe7" }}>
        ${(subtotal / 100).toFixed(2)}
      </div>
    </div>
  );
}

function CoinSlot({
  denom,
  count,
  onInc,
  onDec,
}: {
  denom: typeof COIN_DENOMINATIONS[number];
  count: number;
  onInc: () => void;
  onDec: () => void;
}) {
  const subtotal = denom.cents * count;
  return (
    <div className="bill-slot p-2 flex items-center gap-2">
      <div className={`coin ${denom.className} rounded-full flex items-center justify-center shrink-0 text-[10px]`} style={{ width: denom.size, height: denom.size }}>
        {denom.label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-black tracking-[0.18em] uppercase truncate" style={{ color: "#f5d6a3" }}>
          {denom.code}
        </div>
        <div className="flex items-center justify-between text-[10px] mt-0.5" style={{ color: "#f5d6a3" }}>
          <button
            onClick={onDec}
            disabled={count === 0}
            className="w-6 h-5 rounded font-black"
            style={{ background: "rgba(0,0,0,0.45)", color: "#f5d6a3", opacity: count === 0 ? 0.35 : 1 }}
          >−</button>
          <span className="font-black tabular-nums">×{count}</span>
          <button
            onClick={onInc}
            className="w-6 h-5 rounded font-black"
            style={{ background: "rgba(0,0,0,0.45)", color: "#f5d6a3" }}
          >+</button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] font-black tabular-nums" style={{ color: "#fffbe7" }}>
          ${(subtotal / 100).toFixed(2)}
        </div>
      </div>
    </div>
  );
}
