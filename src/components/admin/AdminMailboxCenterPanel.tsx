"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  processMailboxRenewal,
  resendRenewalReceipt,
} from "@/app/actions/mailboxRenewals";
import {
  addCustomerNote,
  togglePinNote,
  deleteCustomerNote,
  reassignSuite,
  voidMailboxRenewal,
  addKeyToInventory,
  issueKey,
  returnKey,
  markKeyLost,
  refundSecurityDeposit,
  cancelCustomerWithRefund,
  adminAddWalletCredit,
  listWalletTxns,
} from "@/app/actions/customerOps";
import { DEFAULT_PRICING, type PricingPlan, type PricingConfig } from "@/lib/pricing-config";
import { AdminWalkInSignupWizard } from "./AdminWalkInSignupWizard";
import { runDueAutoRenewals, setAutoRenewal } from "@/app/actions/billing";

export type MailboxRenewalRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  planAtRenewal: string;
  termMonths: number;
  amountCents: number;
  paymentMethod: string;
  paidAt: string;
  newPlanDueDate: string;
  receiptSentAt: string | null;
  notes: string | null;
};

export type RenewalCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  plan: string | null;
  planTerm?: string | null;
  suiteNumber: string | null;
  planDueDate?: string | null;
  status: string;
  /** ISO strings, used for ID-expiry alerts. */
  idPrimaryExpDate?: string | null;
  idSecondaryExpDate?: string | null;
  securityDepositCents?: number;
  /** Number of mail items received in last 90 days (computed in /admin/page.tsx). */
  mail90d?: number;
  kycStatus?: string | null;
  mailboxStatus?: string | null;
  planAutoRenew?: boolean;
  walletBalanceCents?: number;
  cardLast4?: string | null;
  businessName?: string | null;
};

export type CustomerNoteRow = {
  id: string;
  userId: string;
  authorName: string | null;
  kind: string;
  body: string;
  pinned: boolean;
  createdAt: string;
};

export type MailboxKeyRow = {
  id: string;
  keyTag: string;
  suiteNumber: string;
  status: string;
  issuedToId: string | null;
  issuedToName?: string | null;
  issuedAt: string | null;
  returnedAt: string | null;
  notes: string | null;
};

export type WalkInTodayStat = {
  paymentsToday: number;
  cashToday: number;
  cardToday: number;
  squareToday: number;
};

type Props = {
  customers: RenewalCustomer[];
  renewals: MailboxRenewalRow[];
  pricing?: PricingConfig | null;
  notes?: CustomerNoteRow[];
  keys?: MailboxKeyRow[];
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
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_RED = "#E70013";

type Mode = "renew" | "recent" | "keys" | "search";
type TermKey = "term3" | "term6" | "term14";

const TERMS: Array<{ value: 3 | 6 | 14; key: TermKey; label: string; sub: string }> = [
  { value: 3, key: "term3",  label: "3 mo",  sub: "Quarterly" },
  { value: 6, key: "term6",  label: "6 mo",  sub: "Half-year" },
  { value: 14, key: "term14", label: "14 mo", sub: "Best value" },
];

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return s;
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

// Smoothly tweens an integer value from 0 to `target` over `duration` ms.
// Returns the current frame value. Re-animates whenever `target` changes.
// rAF-based, ease-out-cubic, falls back to instant render under reduced motion.
function useAnimatedCount(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || duration <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = value;
    const delta = target - from;
    if (delta === 0) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

const UI_STATE_KEY = "noho-mbcenter-ui-v1";
type PersistedUI = {
  mode?: Mode;
  pickerView?: "list" | "grid";
  statusFilter?: "all" | "active" | "atrisk";
};
function readPersistedUI(): PersistedUI {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(UI_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedUI) : {};
  } catch {
    return {};
  }
}

export function AdminMailboxCenterPanel({ customers, renewals, pricing, notes = [], keys = [], walkInToday, mrrCents = 0, dormantCount = 0, planDistribution, tillWeek, churn30dCount = 0, churnAnnualizedPct = 0, forwardingByState }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Initial UI state hydrates from localStorage on mount via useEffect (below)
  // — avoids a server/client text mismatch under React strict-hydration.
  const [mode, setMode] = useState<Mode>("renew");
  const [hoveredMode, setHoveredMode] = useState<Mode | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Renewal form state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "atrisk">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [pickerView, setPickerView] = useState<"list" | "grid">("list");

  // ─── Persisted UI state — restores mode / picker view / status filter
  // across page reloads. Hydrate once on mount, then write on every change.
  // selectedCustomerId is intentionally NOT persisted (a stale id after the
  // customer is deleted would render an empty form with no recovery).
  useEffect(() => {
    const saved = readPersistedUI();
    if (saved.mode && ["renew", "recent", "keys", "search"].includes(saved.mode)) {
      setMode(saved.mode);
    }
    if (saved.pickerView === "list" || saved.pickerView === "grid") {
      setPickerView(saved.pickerView);
    }
    if (saved.statusFilter && ["all", "active", "atrisk"].includes(saved.statusFilter)) {
      setStatusFilter(saved.statusFilter);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        UI_STATE_KEY,
        JSON.stringify({ mode, pickerView, statusFilter }),
      );
    } catch {
      // localStorage unavailable (private browsing / quota) — fail silent
    }
  }, [mode, pickerView, statusFilter]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; lastError: string | null }>({ done: 0, total: 0, lastError: null });
  const [termMonths, setTermMonths] = useState<3 | 6 | 14>(3);
  const [paymentMethod, setPaymentMethod] = useState<"Square" | "Cash" | "CardOnFile">("Square");
  const [renewalNotes, setRenewalNotes] = useState("");
  const [planOverride, setPlanOverride] = useState<string | null>(null);
  const [priceMode, setPriceMode] = useState<"standard" | "custom">("standard");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [reason, setReason] = useState("");
  // Customer profile inline (notes + suite reassign)
  const [newNote, setNewNote] = useState("");
  const [newNoteKind, setNewNoteKind] = useState<"note" | "call" | "visit" | "compliance" | "billing" | "issue">("note");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [newSuite, setNewSuite] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  // Key registry
  const [keyFilter, setKeyFilter] = useState<"all" | "issued" | "available" | "lost">("all");
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyTag, setNewKeyTag] = useState("");
  const [newKeySuite, setNewKeySuite] = useState("");
  // Walk-in signup wizard
  const [walkInOpen, setWalkInOpen] = useState(false);
  // Auto-renew batch
  const [autoRenewing, setAutoRenewing] = useState(false);
  // Deposit refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<"Cash" | "Square" | "CardOnFile">("Cash");
  const [refundReason, setRefundReason] = useState("");
  // Cancel + refund
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelRefundAmount, setCancelRefundAmount] = useState("");
  const [cancelRefundMethod, setCancelRefundMethod] = useState<"Cash" | "Square" | "CardOnFile" | "WalletCredit">("Cash");
  const [cancelReason, setCancelReason] = useState("");
  // Wallet top-up
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState<"Cash" | "Square" | "CardOnFile" | "Comp">("Cash");
  const [topUpReason, setTopUpReason] = useState("");
  // Wallet history
  const [walletHistOpen, setWalletHistOpen] = useState(false);
  const [walletTxns, setWalletTxns] = useState<Array<{ id: string; kind: string; amountCents: number; description: string; balanceAfterCents: number; createdAt: string | Date }>>([]);
  const [walletHistLoading, setWalletHistLoading] = useState(false);

  const cfg = pricing ?? DEFAULT_PRICING;
  const planNames = cfg.plans.map((p) => p.name);

  // ─── At-risk computation: due in <=14d, overdue, or non-Active ───────────
  // All comparisons use UTC midnight to match the server's frame for "YYYY-MM-DD"
  // strings — otherwise the admin's local TZ shifts the boundary.
  const atRisk = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const in14 = new Date(today);
    in14.setUTCDate(in14.getUTCDate() + 14);
    let overdue = 0, dueSoon = 0, suspended = 0;
    for (const c of customers) {
      if (c.status === "Suspended") suspended++;
      if (!c.planDueDate) continue;
      try {
        const [y, m, d] = c.planDueDate.split("-").map(Number);
        if (!y || !m || !d) continue;
        const due = new Date(Date.UTC(y, m - 1, d));
        if (due < today) overdue++;
        else if (due <= in14) dueSoon++;
      } catch {}
    }
    return { overdue, dueSoon, suspended, total: overdue + dueSoon + suspended };
  }, [customers]);

  // ─── ID-expiry: any customer with a primary or secondary ID expiring in <=60d
  const idExpiring = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const in60 = new Date(today);
    in60.setUTCDate(in60.getUTCDate() + 60);
    let expiring = 0, expired = 0;
    const parse = (s: string | null | undefined) => {
      if (!s) return null;
      try {
        const [y, m, d] = s.split("-").map(Number);
        if (!y || !m || !d) return null;
        return new Date(Date.UTC(y, m - 1, d));
      } catch { return null; }
    };
    for (const c of customers) {
      const dates = [parse(c.idPrimaryExpDate), parse(c.idSecondaryExpDate)].filter(Boolean) as Date[];
      if (dates.length === 0) continue;
      const earliest = dates.reduce((a, b) => (a < b ? a : b));
      if (earliest < today) expired++;
      else if (earliest <= in60) expiring++;
    }
    return { expiring, expired, total: expiring + expired };
  }, [customers]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const in14 = new Date(today);
    in14.setUTCDate(in14.getUTCDate() + 14);
    const isAtRisk = (c: RenewalCustomer) => {
      if (c.status === "Suspended") return true;
      if (!c.planDueDate) return false;
      try {
        const [y, m, d] = c.planDueDate.split("-").map(Number);
        if (!y || !m || !d) return false;
        const due = new Date(Date.UTC(y, m - 1, d));
        return due <= in14;
      } catch {
        return false;
      }
    };
    let pool = customers;
    if (statusFilter === "active") pool = pool.filter((c) => c.status === "Active");
    if (statusFilter === "atrisk") pool = pool.filter(isAtRisk);

    if (!search.trim()) return pool.slice(0, 12);
    const q = search.toLowerCase().trim();
    // Strip everything but digits for phone matching — admin can paste a
    // formatted phone "(818) 506-7744" or "8185067744" and find the same row.
    const qDigits = q.replace(/\D/g, "");
    return pool
      .filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.email.toLowerCase().includes(q)) return true;
        if ((c.suiteNumber ?? "").toLowerCase().includes(q)) return true;
        if (c.businessName && c.businessName.toLowerCase().includes(q)) return true;
        // Phone: match against digits-only form so formatting doesn't break it.
        if (qDigits && qDigits.length >= 3 && c.phone) {
          const phoneDigits = c.phone.replace(/\D/g, "");
          if (phoneDigits.includes(qDigits)) return true;
        }
        // Card last 4
        if (qDigits && qDigits.length === 4 && c.cardLast4 === qDigits) return true;
        return false;
      })
      .slice(0, 16);
  }, [search, statusFilter, customers]);

  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const effectivePlan = planOverride ?? selected?.plan ?? null;

  // Notes for the currently selected customer
  const customerNotes = useMemo(
    () => notes.filter((n) => n.userId === selectedCustomerId).sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)),
    [notes, selectedCustomerId],
  );
  // Keys held by selected customer
  const customerKeys = useMemo(
    () => keys.filter((k) => k.issuedToId === selectedCustomerId && k.status === "Issued"),
    [keys, selectedCustomerId],
  );
  // Available keys to issue (in stock, prefer matching the customer's suite)
  const availableKeysForSuite = useMemo(() => {
    if (!selected?.suiteNumber) return keys.filter((k) => k.status === "InStock");
    return keys
      .filter((k) => k.status === "InStock")
      .sort((a, b) => {
        if (a.suiteNumber === selected.suiteNumber && b.suiteNumber !== selected.suiteNumber) return -1;
        if (b.suiteNumber === selected.suiteNumber && a.suiteNumber !== selected.suiteNumber) return 1;
        return 0;
      });
  }, [keys, selected]);

  const filteredKeys = useMemo(() => {
    if (keyFilter === "all") return keys;
    if (keyFilter === "issued") return keys.filter((k) => k.status === "Issued");
    if (keyFilter === "available") return keys.filter((k) => k.status === "InStock");
    if (keyFilter === "lost") return keys.filter((k) => k.status === "Lost");
    return keys;
  }, [keys, keyFilter]);

  // Standard price from config (based on effective plan)
  const standardPriceCents = useMemo(() => {
    if (!effectivePlan) return null;
    const tier = cfg.plans.find((t: PricingPlan) => t.name.toLowerCase() === effectivePlan.toLowerCase());
    if (!tier) return null;
    const key: TermKey = `term${termMonths}` as TermKey;
    const dollars = tier.prices?.[key];
    if (typeof dollars !== "number") return null;
    return Math.round(dollars * 100);
  }, [effectivePlan, termMonths, cfg]);

  const customPriceCents = useMemo(() => {
    const n = parseFloat(customPrice);
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  }, [customPrice]);

  const priceCents =
    priceMode === "custom"
      ? customPriceCents
      : standardPriceCents;

  const priceOverridden =
    priceMode === "custom" && priceCents != null && standardPriceCents != null && priceCents !== standardPriceCents;

  const speech = useMemo(() => {
    const m = hoveredMode ?? mode;
    switch (m) {
      case "renew": {
        if (!selected) {
          if (atRisk.total > 0) {
            return `Heads up — ${atRisk.overdue} overdue, ${atRisk.dueSoon} due soon, ${atRisk.suspended} suspended. Pick a customer below.`;
          }
          return "Pick a customer below — I'll handle the rest.";
        }
        const status = selected.status === "Active" ? "" : ` · ${selected.status}`;
        return `Ready: Suite #${selected.suiteNumber ?? "—"} · ${effectivePlan ?? "no plan"} · ${termMonths} mo${status}.`;
      }
      case "recent": return `${renewals.length} recent renewal${renewals.length === 1 ? "" : "s"}. Tap a row to view the receipt or void.`;
      case "keys": {
        const issued = keys.filter((k) => k.status === "Issued").length;
        const stock = keys.filter((k) => k.status === "InStock").length;
        return `${issued} keys out · ${stock} in stock. Add new tags or track returns here.`;
      }
      case "search": return "Search by name, email, or suite #. Filter by Active or At-risk.";
    }
  }, [hoveredMode, mode, selected, termMonths, renewals.length, atRisk, effectivePlan, keys]);

  function handleProcess() {
    if (!selected) {
      setFeedback("Pick a customer first.");
      return;
    }
    if (priceCents == null) {
      setFeedback(priceMode === "custom" ? "Enter a custom price first." : "Couldn't find a price. Confirm the customer's plan is set.");
      return;
    }
    if ((priceOverridden || priceCents === 0) && !reason.trim()) {
      setFeedback(`A reason is required for ${priceCents === 0 ? "$0" : "custom-price"} renewals.`);
      return;
    }
    const planNote = effectivePlan && effectivePlan !== selected.plan ? `, plan → ${effectivePlan}` : "";
    if (!confirm(`Process ${termMonths}-month renewal for ${selected.name} (${fmtMoney(priceCents)})${planNote}? This sends an email receipt.`)) return;

    startTransition(async () => {
      const res = await processMailboxRenewal({
        userId: selected.id,
        termMonths,
        amountCents: priceCents,
        paymentMethod,
        planOverride: planOverride ?? undefined,
        standardAmountCents: standardPriceCents ?? null,
        reason: reason.trim() || undefined,
        notes: renewalNotes.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setFeedback(
        res.receiptStatus === "sent"
          ? `Renewed · receipt emailed · new due date ${fmtDate(res.newDueDate)}`
          : `Renewed · email status: ${res.receiptStatus} (admin can resend)`,
      );
      // Reset form
      setSelectedCustomerId(null);
      setSearch("");
      setRenewalNotes("");
      setReason("");
      setPlanOverride(null);
      setPriceMode("standard");
      setCustomPrice("");
      setMode("recent");
      router.refresh();
      setTimeout(() => setFeedback(null), 5500);
    });
  }

  async function handleBulkRenew() {
    if (bulkSelected.size === 0) return;
    const ids = Array.from(bulkSelected);
    const planlessCount = ids
      .map((id) => customers.find((c) => c.id === id))
      .filter((c): c is RenewalCustomer => !!c && !c.plan).length;
    const eligibleCount = ids.length - planlessCount;
    if (eligibleCount === 0) {
      setFeedback("None of the selected customers have a plan — set plans first.");
      return;
    }
    const planlessNote = planlessCount > 0
      ? `\n\n${planlessCount} customer(s) without a plan will be skipped.`
      : "";
    if (!confirm(`Renew ${eligibleCount} customer${eligibleCount === 1 ? "" : "s"} for ${termMonths} months via ${paymentMethod}?\n\nUses each customer's standard plan price; sends a receipt email per customer.${planlessNote}`)) return;

    // `total` excludes planless customers — admins care about how many actual
    // renewals we're processing, not how many rows they checkboxed.
    const totalToProcess = ids.length - planlessCount;
    setBulkProcessing(true);
    setBulkProgress({ done: 0, total: totalToProcess, lastError: null });
    let done = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let lastError: string | null = null;
    for (const id of ids) {
      const c = customers.find((cc) => cc.id === id);
      if (!c?.plan) {
        skipped++;
        // Don't increment `done` — the progress bar should reflect real work.
        continue;
      }
      // Standard price for this customer's plan + chosen term
      const tier = cfg.plans.find((t) => t.name.toLowerCase() === c.plan!.toLowerCase());
      const standardCents = tier?.prices?.[`term${termMonths}` as TermKey];
      if (typeof standardCents !== "number") {
        failed++;
        done++;
        lastError = `${c.name}: no price for ${c.plan} ${termMonths}mo`;
        setBulkProgress({ done, total: totalToProcess, lastError });
        continue;
      }
      const amountCents = Math.round(standardCents * 100);
      const res = await processMailboxRenewal({
        userId: c.id,
        termMonths,
        amountCents,
        paymentMethod,
        standardAmountCents: amountCents,
      });
      done++;
      if ("error" in res && res.error) {
        failed++;
        lastError = `${c.name}: ${res.error}`;
      } else {
        succeeded++;
      }
      setBulkProgress({ done, total: totalToProcess, lastError });
    }
    setBulkProcessing(false);
    setBulkSelected(new Set());
    setBulkMode(false);
    const summary = [
      `${succeeded} renewed`,
      failed > 0 ? `${failed} failed` : null,
      skipped > 0 ? `${skipped} skipped` : null,
    ].filter(Boolean).join(" · ");
    setFeedback(`Bulk renewal complete · ${summary}${lastError ? ` · last error: ${lastError}` : ""}`);
    router.refresh();
    setTimeout(() => setFeedback(null), 6000);
  }

  function handleResend(renewalId: string) {
    startTransition(async () => {
      const res = await resendRenewalReceipt(renewalId);
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setFeedback(res.status === "sent" ? "Receipt resent — delivered." : `Receipt resend status: ${res.status}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function handleVoidRenewal(renewalId: string, label: string) {
    const reason = window.prompt(
      `Void renewal "${label}"? Type a reason (audit trail). This refunds the payment and reverses plan dates.`,
      "",
    );
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      const res = await voidMailboxRenewal({ renewalId, reason: reason.trim() });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setFeedback("Renewal voided · payment refunded · plan dates reverted");
      router.refresh();
      setTimeout(() => setFeedback(null), 4500);
    });
  }

  function handleAddNote() {
    if (!selected) return;
    if (!newNote.trim()) {
      setFeedback("Note can't be empty.");
      return;
    }
    startTransition(async () => {
      const res = await addCustomerNote({
        userId: selected.id,
        body: newNote.trim(),
        kind: newNoteKind,
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setNewNote("");
      setNewNoteKind("note");
      setFeedback("Note added.");
      router.refresh();
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  function handleTogglePin(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    const willPin = !note?.pinned;
    startTransition(async () => {
      const res = await togglePinNote(noteId);
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
      } else {
        setFeedback(willPin ? "Note pinned" : "Note unpinned");
        router.refresh();
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  }

  function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      const res = await deleteCustomerNote(noteId);
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
      } else {
        setFeedback("Note deleted");
        router.refresh();
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  }

  function handleReassignSuite() {
    if (!selected) return;
    if (!newSuite.trim()) {
      setFeedback("Enter a new suite number.");
      return;
    }
    startTransition(async () => {
      const res = await reassignSuite({
        userId: selected.id,
        newSuiteNumber: newSuite.trim(),
        reason: reassignReason.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setReassignOpen(false);
      setNewSuite("");
      setReassignReason("");
      setFeedback(`Suite reassigned · ${res.oldSuite ?? "—"} → ${res.newSuite}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 3500);
    });
  }

  async function handleRunAutoRenewals() {
    if (!confirm("Run today's auto-renewals? Each enrolled customer with a due date today or earlier will be charged from their wallet balance.")) return;
    setAutoRenewing(true);
    try {
      const res = await runDueAutoRenewals();
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
      } else {
        const summary = `Auto-renewals · ${res.candidates} due · ${res.succeeded} succeeded · ${res.failed} failed`;
        setFeedback(summary);
        router.refresh();
      }
    } catch (e) {
      setFeedback(`Error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setAutoRenewing(false);
      setTimeout(() => setFeedback(null), 8000);
    }
  }

  function handleToggleAutoRenew() {
    if (!selected) return;
    // Capture customer details NOW — `selected` is a derived ref that can shift
    // if the admin clicks another customer mid-flight. Pinning at start keeps
    // the action targeted at the customer the admin actually clicked on.
    const targetId = selected.id;
    const targetName = selected.name;
    const turningOn = !selected.planAutoRenew;
    if (turningOn && (selected.walletBalanceCents ?? 0) === 0) {
      if (!confirm(`${targetName}'s wallet is at $0. Auto-renew will fail until they top up. Enable anyway?`)) return;
    }
    startTransition(async () => {
      const res = await setAutoRenewal(targetId, turningOn);
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setFeedback(turningOn ? `Auto-renew enabled for ${targetName}` : `Auto-renew disabled for ${targetName}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleRefundDeposit() {
    if (!selected) return;
    const amt = parseFloat(refundAmount);
    if (!isFinite(amt) || amt <= 0) {
      setFeedback("Enter a refund amount > 0.");
      return;
    }
    const cents = Math.round(amt * 100);
    if (!confirm(`Refund $${amt.toFixed(2)} of ${selected.name}'s deposit via ${refundMethod}? This logs an audit entry.`)) return;
    startTransition(async () => {
      const res = await refundSecurityDeposit({
        userId: selected.id,
        amountCents: cents,
        paymentMethod: refundMethod,
        reason: refundReason.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setRefundOpen(false);
      setRefundAmount("");
      setRefundReason("");
      const newBalanceCents: number = ("newBalanceCents" in res ? res.newBalanceCents : 0) ?? 0;
      setFeedback(`Refund processed · new deposit balance $${(newBalanceCents / 100).toFixed(2)}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  // Lazy-load wallet history when admin expands the section, refresh when
  // selected customer changes, and clear history if section is closed.
  useEffect(() => {
    if (!walletHistOpen || !selected) {
      setWalletTxns([]);
      return;
    }
    let cancelled = false;
    setWalletHistLoading(true);
    listWalletTxns(selected.id, 10)
      .then((rows) => {
        if (cancelled) return;
        setWalletTxns(
          (rows as Array<{ id: string; kind: string; amountCents: number; description: string; balanceAfterCents: number; createdAt: Date }>).map((r) => ({
            ...r,
            createdAt: new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          })),
        );
      })
      .catch(() => { if (!cancelled) setWalletTxns([]); })
      .finally(() => { if (!cancelled) setWalletHistLoading(false); });
    return () => { cancelled = true; };
  }, [walletHistOpen, selected?.id]);

  function handleWalletTopUp() {
    if (!selected) return;
    const amt = parseFloat(topUpAmount);
    if (!isFinite(amt) || amt <= 0) {
      setFeedback("Enter a positive top-up amount.");
      return;
    }
    if (!topUpReason.trim()) {
      setFeedback("Reason required (audit trail).");
      return;
    }
    const cents = Math.round(amt * 100);
    if (!confirm(`Add $${amt.toFixed(2)} to ${selected.name}'s wallet via ${topUpMethod}?`)) return;
    startTransition(async () => {
      const res = await adminAddWalletCredit({
        userId: selected.id,
        amountCents: cents,
        paymentMethod: topUpMethod,
        reason: topUpReason.trim(),
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setTopUpOpen(false);
      setTopUpAmount("");
      setTopUpReason("");
      const newBal: number = ("newBalanceCents" in res ? res.newBalanceCents : 0) ?? 0;
      setFeedback(`+$${amt.toFixed(2)} credited · new wallet $${(newBal / 100).toFixed(2)}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 3500);
    });
  }

  function handleCancelCustomer() {
    if (!selected) return;
    const amt = parseFloat(cancelRefundAmount || "0");
    if (!isFinite(amt) || amt < 0) {
      setFeedback("Refund amount can't be negative.");
      return;
    }
    if (!cancelReason.trim()) {
      setFeedback("Reason required (audit trail).");
      return;
    }
    const cents = Math.round(amt * 100);
    const refundLabel = cents > 0 ? `with $${amt.toFixed(2)} refund via ${cancelRefundMethod}` : "without refund";
    if (!confirm(`Cancel ${selected.name}'s mailbox ${refundLabel}? This sets status to Inactive and disables auto-renew.`)) return;
    startTransition(async () => {
      const res = await cancelCustomerWithRefund({
        userId: selected.id,
        refundAmountCents: cents,
        paymentMethod: cancelRefundMethod,
        reason: cancelReason.trim(),
      });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setCancelOpen(false);
      setCancelRefundAmount("");
      setCancelReason("");
      setSelectedCustomerId(null);
      setFeedback(`Cancelled · ${cents > 0 ? `refunded $${amt.toFixed(2)}` : "no refund"}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  // Pro-rate suggestion for cancellation refund: remaining months in plan term × monthly rate
  const cancelProrateCents = useMemo(() => {
    if (!selected?.plan || !selected.planTerm || !selected.planDueDate) return 0;
    const tier = cfg.plans.find((p) => p.name.toLowerCase() === selected.plan!.toLowerCase());
    if (!tier) return 0;
    const term = parseInt(selected.planTerm) || 0;
    const dollars = tier.prices?.[`term${term}` as TermKey];
    if (typeof dollars !== "number" || term <= 0) return 0;
    const monthlyCents = Math.round((dollars * 100) / term);
    // Days remaining ÷ 30 ≈ months remaining (rough; admin can override)
    try {
      const [y, m, d] = selected.planDueDate.split("-").map(Number);
      const due = new Date(Date.UTC(y, m - 1, d));
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const daysRemaining = Math.max(0, Math.ceil((+due - +today) / 86400000));
      const monthsRemaining = daysRemaining / 30;
      return Math.max(0, Math.round(monthlyCents * monthsRemaining));
    } catch {
      return 0;
    }
  }, [selected, cfg]);

  function handleAddKey() {
    if (!newKeyTag.trim() || !newKeySuite.trim()) {
      setFeedback("Key tag and suite # required.");
      return;
    }
    startTransition(async () => {
      const res = await addKeyToInventory({ keyTag: newKeyTag.trim(), suiteNumber: newKeySuite.trim() });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setNewKeyTag("");
      setNewKeySuite("");
      setShowAddKey(false);
      setFeedback("Key added to inventory.");
      router.refresh();
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  function handleIssueKey(keyId: string) {
    if (!selected) {
      setFeedback("Pick a customer first.");
      return;
    }
    startTransition(async () => {
      const res = await issueKey({ keyId, userId: selected.id });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        return;
      }
      setFeedback(`Key issued to ${selected.name}`);
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleReturnKey(keyId: string) {
    if (!confirm("Mark this key as returned?")) return;
    startTransition(async () => {
      const res = await returnKey(keyId);
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
        // Don't refresh — keep the error visible
      } else {
        setFeedback("Key returned to inventory.");
        router.refresh();
      }
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  function handleMarkLost(keyId: string) {
    if (!confirm("Mark this key as LOST? Charges $25 replacement fee.")) return;
    startTransition(async () => {
      const res = await markKeyLost({ keyId, chargeFee: true });
      if ("error" in res && res.error) {
        setFeedback(`Error: ${res.error}`);
      } else {
        setFeedback("Key marked lost.");
        router.refresh();
      }
      setTimeout(() => setFeedback(null), 2500);
    });
  }

  return (
    <div className="space-y-5">
      {/* ─── NPC Hero ──────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 sm:p-7"
        style={{
          background: "radial-gradient(ellipse at top, #1A2E3A 0%, #0E1820 60%, #0A1218 100%)",
          boxShadow: "0 30px 80px rgba(10,18,24,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Floor grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,230,194,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(247,230,194,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            transform: "perspective(800px) rotateX(58deg) translateY(20%) scale(1.4)",
            transformOrigin: "center bottom",
          }}
        />
        <div aria-hidden="true" className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: NOHO_RED }} />
        <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: NOHO_BLUE }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] mb-1" style={{ color: "rgba(247,230,194,0.6)" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_RED, boxShadow: `0 0 8px ${NOHO_RED}` }} />
                MAILBOX OPERATIONS · LIVE
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: NOHO_CREAM, fontFamily: "var(--font-baloo), sans-serif" }}>
                Mailbox Center
              </h2>
              <p className="text-xs mt-1" style={{ color: "rgba(247,230,194,0.55)" }}>
                Renew suites, send receipts, keep the lights on.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <StatTile
                label="Active"
                value={customers.filter((c) => c.status === "Active").length}
                suffix="customers"
                onClick={() => { setMode("renew"); setStatusFilter("active"); }}
                active={statusFilter === "active"}
                title="Click to filter the picker to Active customers only"
              />
              <StatTile
                label="At-Risk"
                value={atRisk.total}
                suffix={`${atRisk.overdue}od · ${atRisk.dueSoon}due · ${atRisk.suspended}sus`}
                title={`${atRisk.overdue} overdue · ${atRisk.dueSoon} due soon · ${atRisk.suspended} suspended — click to filter`}
                accent={atRisk.total > 0}
                onClick={() => { setMode("renew"); setStatusFilter("atrisk"); }}
                active={statusFilter === "atrisk"}
              />
              <StatTile
                label="ID Expiry"
                value={idExpiring.total}
                suffix={idExpiring.expired > 0 ? `${idExpiring.expired} expired · ${idExpiring.expiring} 60d` : `${idExpiring.expiring} in 60d`}
                accent={idExpiring.expired > 0}
                title={
                  idExpiring.total > 0
                    ? `${idExpiring.expired} expired · ${idExpiring.expiring} expiring in 60d — click to surface`
                    : "No customers with expiring IDs"
                }
                onClick={
                  idExpiring.total > 0
                    ? () => { setMode("search"); setSearch(""); setStatusFilter("all"); }
                    : undefined
                }
              />
              {walkInToday && (
                <StatTile
                  label="Today"
                  value={walkInToday.paymentsToday}
                  suffix={`$${(walkInToday.cashToday / 100).toFixed(0)}c · $${(walkInToday.cardToday / 100).toFixed(0)}cd · $${(walkInToday.squareToday / 100).toFixed(0)}sq`}
                  title={`Today's payments — $${(walkInToday.cashToday / 100).toFixed(2)} cash · $${(walkInToday.cardToday / 100).toFixed(2)} card-on-file · $${(walkInToday.squareToday / 100).toFixed(2)} Square — click for recent renewals`}
                  onClick={() => setMode("recent")}
                />
              )}
              {mrrCents > 0 && (
                <StatTile
                  label="MRR"
                  prefix="$"
                  value={Math.round(mrrCents / 100)}
                  suffix="recurring / month"
                />
              )}
              {dormantCount > 0 && (
                <StatTile
                  label="Dormant"
                  value={dormantCount}
                  suffix="0 mail in 90d"
                />
              )}
              {churn30dCount > 0 && (
                <StatTile
                  label="Churn 30d"
                  value={churn30dCount}
                  suffix={`~${churnAnnualizedPct}%/yr`}
                  accent={churnAnnualizedPct > 30}
                />
              )}
            </div>
          </div>

          <NpcScene
            mode={hoveredMode ?? mode}
            speech={speech}
            onPick={setMode}
            onHover={setHoveredMode}
          />
        </div>
      </div>

      {/* Toast */}
      {feedback && (
        <div className="rounded-xl px-4 py-3 text-xs font-bold" style={{ background: "rgba(51,116,133,0.08)", color: NOHO_BLUE_DEEP, border: "1px solid rgba(51,116,133,0.2)" }}>
          {feedback}
        </div>
      )}

      {/* ─── Overview row — plan distribution + cash till + forwarding (visible on renew/search) ─── */}
      {(mode === "renew" || mode === "search") && (planDistribution || tillWeek || forwardingByState) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {planDistribution && Object.keys(planDistribution).length > 0 && (
            <PlanDistributionCard distribution={planDistribution} />
          )}
          {tillWeek && tillWeek.count > 0 && (
            <TillCard week={tillWeek} today={walkInToday} />
          )}
          {forwardingByState && Object.keys(forwardingByState).length > 0 && (
            <ForwardingMapCard byState={forwardingByState} />
          )}
        </div>
      )}

      {/* ─── Working area — content depends on mode ─────────────────────── */}

      {(mode === "renew" || mode === "search") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer picker */}
          <div className="lg:col-span-1 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setWalkInOpen(true)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:-translate-y-0.5 whitespace-nowrap"
                style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, boxShadow: "0 4px 14px rgba(51,116,133,0.32)" }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="9" cy="9" r="3.5" />
                  <path d="M3 19 C3 14.5 6 13 9 13 C11 13 13 13.5 14 14.5" />
                  <path d="M17 16 L17 22 M14 19 L20 19" />
                </svg>
                <span>+ Walk-in</span>
              </button>
              <button
                onClick={handleRunAutoRenewals}
                disabled={autoRenewing}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-black transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                style={{ background: "rgba(45,16,15,0.06)", color: NOHO_INK, border: "1px solid rgba(45,16,15,0.18)" }}
                title="Run renewals for everyone with auto-renew on whose plan is due"
              >
                {autoRenewing && (
                  <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8 C2 4.5 5 2 8 2 C10.5 2 12.5 3.5 13.5 5.5" /><path d="M14 8 C14 11.5 11 14 8 14 C5.5 14 3.5 12.5 2.5 10.5" /><path d="M11 5.5 L13.5 5.5 L13.5 3 M5 10.5 L2.5 10.5 L2.5 13" /></svg>
                <span>{autoRenewing ? "Running…" : "Auto-renew"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Customer</p>
              <div className="flex gap-1">
                {(["list", "grid"] as const).map((v) => {
                  const active = pickerView === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setPickerView(v)}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
                      style={{
                        background: active ? NOHO_INK : "transparent",
                        color: active ? NOHO_CREAM : "#7A6050",
                      }}
                      title={v === "grid" ? "Suite grid view" : "List view"}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, suite #"
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-2"
              style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }}
            />
            <div className="flex gap-1 mb-2">
              {([
                ["all", "All"],
                ["active", "Active"],
                ["atrisk", "At-Risk"],
              ] as const).map(([k, label]) => {
                const active = statusFilter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setStatusFilter(k)}
                    className="flex-1 text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: active ? NOHO_BLUE : "#FFF9F3",
                      color: active ? "#fff" : "#7A6050",
                      border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Bulk toggle */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={() => {
                  setBulkMode(!bulkMode);
                  setBulkSelected(new Set());
                }}
                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: bulkMode ? NOHO_RED : "transparent",
                  color: bulkMode ? "#fff" : "#7A6050",
                  border: bulkMode ? "none" : "1px solid #E8DDD0",
                }}
                title="Multi-select to renew several customers in one batch"
              >
                {bulkMode ? `Bulk · ${bulkSelected.size}` : "Bulk renew"}
              </button>
              {bulkMode && bulkSelected.size > 0 && (
                <button
                  onClick={() => {
                    // Quick-select: at-risk customers with plans
                    const atRiskIds = filtered.filter((c) => c.plan).map((c) => c.id);
                    setBulkSelected(new Set(atRiskIds));
                  }}
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: NOHO_BLUE }}
                >
                  Select all visible
                </button>
              )}
            </div>

            {/* Picker — list or grid */}
            {pickerView === "list" ? (
              <ul className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                {filtered.length === 0 && (
                  <li className="text-xs text-[#7A6050] italic px-2">No customers match.</li>
                )}
                {filtered.map((c) => {
                  const sel = selectedCustomerId === c.id;
                  const checked = bulkSelected.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          if (bulkMode) {
                            const next = new Set(bulkSelected);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            setBulkSelected(next);
                          } else {
                            setSelectedCustomerId(c.id);
                          }
                        }}
                        className="w-full text-left rounded-xl px-3 py-2 transition-all flex items-start gap-2"
                        style={{
                          background: bulkMode ? (checked ? "rgba(231,0,19,0.06)" : "#FFF9F3") : sel ? NOHO_BLUE : "#FFF9F3",
                          color: bulkMode ? NOHO_INK : sel ? "#fff" : NOHO_INK,
                          border: bulkMode ? `1px solid ${checked ? NOHO_RED : "#E8DDD0"}` : sel ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                        }}
                      >
                        {bulkMode && (
                          <span className="mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center" style={{ background: checked ? NOHO_RED : "transparent", border: `1.5px solid ${checked ? NOHO_RED : "#7A6050"}` }}>
                            {checked && (
                              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 6 L5 9 L10 3" />
                              </svg>
                            )}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black flex items-center gap-2 flex-wrap">
                            {c.name}
                            {c.suiteNumber && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: !bulkMode && sel ? "rgba(255,255,255,0.2)" : "rgba(51,116,133,0.1)", color: !bulkMode && sel ? "#fff" : NOHO_BLUE }}>
                                #{c.suiteNumber}
                              </span>
                            )}
                            {c.status !== "Active" && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                    style={{
                                      background: !bulkMode && sel ? "rgba(255,255,255,0.18)" :
                                        c.status === "Suspended" ? "rgba(231,0,19,0.12)" : "rgba(245,158,11,0.18)",
                                      color: !bulkMode && sel ? "#fff" :
                                        c.status === "Suspended" ? "#b91c1c" : "#92400e",
                                    }}>
                                {c.status}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: !bulkMode && sel ? "rgba(255,255,255,0.7)" : "#7A6050" }}>
                            {c.plan ?? "no plan"} · due {fmtDate(c.planDueDate)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              /* ─── Grid view: each tile is a suite ─── */
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[28rem] overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="col-span-full text-xs text-[#7A6050] italic px-2 py-4 text-center">No customers match.</p>
                )}
                {filtered.map((c) => {
                  const sel = selectedCustomerId === c.id;
                  const checked = bulkSelected.has(c.id);
                  // Color band per status
                  const today = new Date();
                  const tUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
                  let statusTone: "active" | "duesoon" | "overdue" | "suspended" | "noplan" = "noplan";
                  if (c.status === "Suspended") statusTone = "suspended";
                  else if (c.planDueDate) {
                    try {
                      const [y, m, d] = c.planDueDate.split("-").map(Number);
                      const due = new Date(Date.UTC(y, m - 1, d));
                      const daysOut = Math.ceil((+due - +tUtc) / 86400000);
                      if (daysOut < 0) statusTone = "overdue";
                      else if (daysOut <= 14) statusTone = "duesoon";
                      else statusTone = "active";
                    } catch {
                      statusTone = "noplan";
                    }
                  }
                  const tones: Record<string, { bg: string; fg: string; dot: string }> = {
                    active:    { bg: "#EBF2FA",            fg: NOHO_BLUE,  dot: NOHO_BLUE },
                    duesoon:   { bg: "rgba(245,158,11,0.12)", fg: "#92400e", dot: "#F5A623" },
                    overdue:   { bg: "rgba(231,0,19,0.10)",   fg: "#b91c1c", dot: NOHO_RED },
                    suspended: { bg: "rgba(231,0,19,0.18)",   fg: "#b91c1c", dot: NOHO_RED },
                    noplan:    { bg: "#FFF9F3",            fg: "#7A6050",  dot: "#D8C8B4" },
                  };
                  const tone = tones[statusTone];
                  const initials = c.name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (bulkMode) {
                          const next = new Set(bulkSelected);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          setBulkSelected(next);
                        } else {
                          setSelectedCustomerId(c.id);
                        }
                      }}
                      title={`${c.name} · ${c.plan ?? "no plan"} · due ${fmtDate(c.planDueDate)}`}
                      className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-transform hover:-translate-y-0.5"
                      style={{
                        background: bulkMode && checked ? "rgba(231,0,19,0.18)" : sel && !bulkMode ? NOHO_BLUE : tone.bg,
                        color: bulkMode && checked ? "#b91c1c" : sel && !bulkMode ? "#fff" : tone.fg,
                        border: `1.5px solid ${
                          bulkMode && checked ? NOHO_RED :
                          sel && !bulkMode ? NOHO_BLUE :
                          "transparent"
                        }`,
                      }}
                    >
                      {/* Status dot top-right */}
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                      {/* Suite # */}
                      <p className="text-[10px] font-black opacity-70 leading-none">
                        #{c.suiteNumber ?? "—"}
                      </p>
                      <p className="text-base font-extrabold tracking-tight mt-0.5">{initials}</p>
                      <p className="text-[9px] uppercase tracking-wider mt-0.5 opacity-60 truncate w-full px-1 text-center">
                        {c.plan ?? "—"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bulk action footer */}
            {bulkMode && bulkSelected.size > 0 && (
              <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(231,0,19,0.04)", border: "1px solid rgba(231,0,19,0.18)" }}>
                <p className="text-[11px] font-bold mb-2" style={{ color: "#b91c1c" }}>
                  {bulkSelected.size} customer{bulkSelected.size === 1 ? "" : "s"} selected for bulk renewal
                </p>
                <p className="text-[10px] mb-2" style={{ color: "#7A6050" }}>
                  Each renewal uses the term + payment method below at the customer&apos;s standard plan price.
                </p>
                <button
                  onClick={handleBulkRenew}
                  disabled={isPending || bulkProcessing}
                  className="w-full text-xs font-black px-3 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ background: NOHO_RED }}
                >
                  {bulkProcessing ? `Processing ${bulkProgress.done}/${bulkProgress.total}…` : `Renew ${bulkSelected.size} customers · ${termMonths}mo · ${paymentMethod}`}
                </button>
                {bulkProgress.lastError && (
                  <p className="text-[10px] mt-2" style={{ color: "#b91c1c" }}>
                    Last error: {bulkProgress.lastError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Renewal form */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Renewal</p>
            <h3 className="text-xl font-extrabold tracking-tight mt-1" style={{ color: NOHO_INK }}>
              {selected ? `${selected.name} · Suite #${selected.suiteNumber ?? "—"}` : "Pick a customer to begin"}
            </h3>
            {selected && (
              <p className="text-xs mt-1" style={{ color: "#7A6050" }}>
                Plan: <strong style={{ color: NOHO_INK }}>{selected.plan ?? "—"}</strong>
                {" · "}Current due: <strong style={{ color: NOHO_INK }}>{fmtDate(selected.planDueDate)}</strong>
                {selected.kycStatus && selected.kycStatus !== "Approved" && (
                  <>
                    {" · "}
                    <span className="font-black" style={{ color: selected.kycStatus === "Rejected" ? "#b91c1c" : "#92400e" }}>
                      KYC: {selected.kycStatus}
                    </span>
                  </>
                )}
                {selected.mailboxStatus && selected.mailboxStatus !== "Active" && (
                  <>
                    {" · "}
                    <span className="font-black" style={{ color: "#92400e" }}>
                      Mailbox: {selected.mailboxStatus}
                    </span>
                  </>
                )}
                {typeof selected.mail90d === "number" && (
                  <>
                    {" · "}
                    <span title="Mail items received in last 90 days" style={{ color: selected.mail90d === 0 ? "#b91c1c" : NOHO_INK }}>
                      {selected.mail90d === 0 ? "Dormant — 0 mail in 90d" : `${selected.mail90d} mail in 90d`}
                    </span>
                  </>
                )}
              </p>
            )}

            {/* Plan picker — defaults to current plan, lets admin upgrade/downgrade in same flow */}
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Plan</p>
              <div className="grid grid-cols-3 gap-2">
                {planNames.map((name) => {
                  const active = (effectivePlan ?? selected?.plan) === name;
                  const isChange = selected && selected.plan !== name;
                  return (
                    <button
                      key={name}
                      onClick={() => setPlanOverride(name)}
                      disabled={!selected}
                      className="rounded-xl py-2.5 px-2 text-center transition-all disabled:opacity-50 relative"
                      style={{
                        background: active ? NOHO_BLUE : "#FFF9F3",
                        color: active ? "#fff" : NOHO_INK,
                        border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                      }}
                    >
                      <p className="text-sm font-extrabold tracking-tight">{name}</p>
                      {isChange && active && (
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: NOHO_RED, color: "#fff" }}>
                          {planNames.indexOf(name) > planNames.indexOf(selected!.plan ?? "") ? "Up" : "Down"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Term picker */}
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Term</p>
              <div className="grid grid-cols-3 gap-2">
                {TERMS.map((t) => {
                  const active = termMonths === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTermMonths(t.value)}
                      disabled={!selected}
                      className="rounded-xl py-3 px-2 text-center transition-all disabled:opacity-50"
                      style={{
                        background: active ? NOHO_BLUE : "#FFF9F3",
                        color: active ? "#fff" : NOHO_INK,
                        border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                        boxShadow: active ? "0 4px 14px rgba(51,116,133,0.32)" : "none",
                      }}
                    >
                      <p className="text-base font-extrabold tracking-tight">{t.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.7)" : "#7A6050" }}>{t.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {(["Square", "Cash", "CardOnFile"] as const).map((m) => {
                  const active = paymentMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      disabled={!selected}
                      className="rounded-xl py-2.5 px-2 text-center text-xs font-bold transition-all disabled:opacity-50"
                      style={{
                        background: active ? NOHO_INK : "#FFF9F3",
                        color: active ? NOHO_CREAM : NOHO_INK,
                        border: active ? `1px solid ${NOHO_INK}` : "1px solid #E8DDD0",
                      }}
                    >
                      {m === "CardOnFile" ? "Card on file" : m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price override */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Price</p>
                <div className="flex gap-1">
                  {([
                    ["standard", standardPriceCents != null ? fmtMoney(standardPriceCents) : "Standard"],
                    ["custom", "Override"],
                  ] as const).map(([k, label]) => {
                    const active = priceMode === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setPriceMode(k)}
                        disabled={!selected}
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
                        style={{
                          background: active ? NOHO_INK : "#FFF9F3",
                          color: active ? NOHO_CREAM : "#7A6050",
                          border: active ? `1px solid ${NOHO_INK}` : "1px solid #E8DDD0",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {priceMode === "custom" && (
                <div className="flex gap-2 items-center mb-1">
                  <span className="text-base font-black" style={{ color: NOHO_INK }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={standardPriceCents != null ? (standardPriceCents / 100).toFixed(2) : "0.00"}
                    disabled={!selected}
                    className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                    style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  {standardPriceCents != null && customPriceCents != null && (
                    <span className="text-[10px] font-bold" style={{ color: customPriceCents < standardPriceCents ? "#16a34a" : customPriceCents > standardPriceCents ? "#92400e" : "#7A6050" }}>
                      {customPriceCents < standardPriceCents ? `−${fmtMoney(standardPriceCents - customPriceCents)}` :
                       customPriceCents > standardPriceCents ? `+${fmtMoney(customPriceCents - standardPriceCents)}` : "match"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Reason — required when price overridden or amount=0 */}
            {(priceOverridden || priceCents === 0) && (
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: NOHO_RED }}>
                  Reason (required for audit)
                </p>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Loyalty discount, comp month, family"
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(231,0,19,0.04)", border: "1px solid rgba(231,0,19,0.28)", color: NOHO_INK }}
                />
              </div>
            )}

            {/* Notes */}
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Notes (internal)</p>
              <textarea
                value={renewalNotes}
                onChange={(e) => setRenewalNotes(e.target.value)}
                disabled={!selected}
                rows={2}
                placeholder="Optional — e.g. paid in cash + tip"
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none disabled:opacity-50"
                style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }}
              />
            </div>

            {/* Price preview + CTA */}
            <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Total</p>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color: NOHO_BLUE }}>
                  {priceCents != null ? fmtMoney(priceCents) : "—"}
                </p>
                {priceCents == null && selected && (
                  <p className="text-[10px] mt-0.5" style={{ color: NOHO_RED }}>
                    No price found for {selected.plan ?? "(no plan)"}. Edit pricing in Settings.
                  </p>
                )}
              </div>
              <button
                onClick={handleProcess}
                disabled={isPending || !selected || priceCents == null}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 disabled:cursor-wait"
                style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, boxShadow: "0 6px 18px rgba(51,116,133,0.35)" }}
              >
                {isPending && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {isPending ? "Processing…" : "Process Renewal & Email Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Customer profile: shown when a customer is selected in renew/search mode ─── */}
      {(mode === "renew" || mode === "search") && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Notes timeline */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>
                Customer Log · {selected.name}
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                {customerNotes.length}
              </span>
            </div>

            {/* Add note */}
            <div className="rounded-xl p-3 mb-3" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(["note", "call", "visit", "compliance", "billing", "issue"] as const).map((k) => {
                  const active = newNoteKind === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setNewNoteKind(k)}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: active ? NOHO_BLUE : "transparent",
                        color: active ? "#fff" : "#7A6050",
                        border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                      }}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this customer (visit, call, observation)…"
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={isPending || !newNote.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-black text-white disabled:opacity-50"
                  style={{ background: NOHO_BLUE }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Timeline */}
            {customerNotes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#7A6050]">No notes yet for this customer.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {customerNotes.map((n) => (
                  <li key={n.id} className="rounded-xl p-3 group" style={{ background: n.pinned ? "rgba(245,166,35,0.06)" : "#FFF9F3", border: `1px solid ${n.pinned ? "rgba(245,166,35,0.28)" : "#E8DDD0"}` }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background:
                                  n.kind === "issue"      ? "rgba(231,0,19,0.15)" :
                                  n.kind === "billing"    ? "rgba(245,166,35,0.18)" :
                                  n.kind === "compliance" ? "rgba(51,116,133,0.15)" :
                                  n.kind === "system"     ? "rgba(45,16,15,0.08)" :
                                                            "rgba(51,116,133,0.10)",
                                color:
                                  n.kind === "issue"      ? "#b91c1c" :
                                  n.kind === "billing"    ? "#92400e" :
                                  n.kind === "compliance" ? NOHO_BLUE :
                                  n.kind === "system"     ? "#7A6050" :
                                                            NOHO_BLUE,
                              }}>
                          {n.kind}
                        </span>
                        {n.authorName && <span className="text-[10px] font-bold" style={{ color: "#7A6050" }}>{n.authorName}</span>}
                        <span className="text-[10px]" style={{ color: "rgba(122,96,80,0.6)" }}>{n.createdAt}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleTogglePin(n.id)} className="text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-[#337485]/10" style={{ color: n.pinned ? "#92400e" : NOHO_BLUE }}>
                          {n.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button onClick={() => handleDeleteNote(n.id)} className="text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-red-50 text-red-600">
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: NOHO_INK }}>{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Suite + Keys */}
          <div className="space-y-5">
            {/* Auto-renew toggle + wallet balance */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Auto-renew</p>
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={isPending}
                  className="relative w-11 h-6 rounded-full transition-colors disabled:opacity-50"
                  style={{ background: selected.planAutoRenew ? "#16a34a" : "#E8DDD0" }}
                  aria-label={selected.planAutoRenew ? "Disable auto-renew" : "Enable auto-renew"}
                  role="switch"
                  aria-checked={!!selected.planAutoRenew}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: selected.planAutoRenew ? "translateX(22px)" : "translateX(2px)", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px]" style={{ color: "#7A6050" }}>
                  Wallet: <strong style={{ color: (selected.walletBalanceCents ?? 0) > 0 ? NOHO_INK : "#b91c1c" }}>
                    ${((selected.walletBalanceCents ?? 0) / 100).toFixed(2)}
                  </strong>
                  {selected.planAutoRenew ? " · charges from wallet on due date" : " · admin renews manually"}
                </p>
                {!topUpOpen && (
                  <button
                    onClick={() => { setTopUpOpen(true); setTopUpAmount(""); setTopUpReason(""); }}
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shrink-0"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#15803d" }}
                  >
                    + Top up
                  </button>
                )}
              </div>
              {selected.planAutoRenew && (selected.walletBalanceCents ?? 0) === 0 && (
                <p className="text-[10px] mt-1 font-bold" style={{ color: "#b91c1c" }}>
                  Wallet at $0 — auto-renew will fail until topped up.
                </p>
              )}

              {/* Wallet history toggle */}
              <button
                onClick={() => setWalletHistOpen(!walletHistOpen)}
                className="text-[10px] font-bold mt-2 flex items-center gap-1"
                style={{ color: NOHO_BLUE }}
              >
                <svg viewBox="0 0 12 12" className={`w-2.5 h-2.5 transition-transform ${walletHistOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2 L8 6 L4 10" /></svg>
                {walletHistOpen ? "Hide" : "Show"} wallet history
              </button>
              {walletHistOpen && (
                <div className="mt-2 rounded-xl p-2 max-h-48 overflow-y-auto" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                  {walletHistLoading ? (
                    <p className="text-[10px] italic text-center py-2" style={{ color: "#7A6050" }}>Loading…</p>
                  ) : walletTxns.length === 0 ? (
                    <p className="text-[10px] italic text-center py-2" style={{ color: "#7A6050" }}>No wallet activity yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {walletTxns.map((t) => {
                        const credit = t.amountCents > 0;
                        return (
                          <li key={t.id} className="flex items-start justify-between gap-2 text-[10px] leading-tight">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate" style={{ color: NOHO_INK }}>
                                <span className="text-[8px] font-black uppercase tracking-wider mr-1.5 px-1 py-0.5 rounded" style={{
                                  background: credit ? "rgba(22,163,74,0.12)" : "rgba(45,16,15,0.08)",
                                  color: credit ? "#15803d" : NOHO_INK,
                                }}>{t.kind}</span>
                                {t.description}
                              </p>
                              <p style={{ color: "#7A6050" }}>{t.createdAt as string}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black" style={{ color: credit ? "#15803d" : NOHO_INK }}>
                                {credit ? "+" : ""}${(t.amountCents / 100).toFixed(2)}
                              </p>
                              <p className="text-[8px]" style={{ color: "#7A6050" }}>bal ${(t.balanceAfterCents / 100).toFixed(2)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {topUpOpen && (
                <div className="mt-3 space-y-2 rounded-xl p-3" style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.2)" }}>
                  <div className="flex gap-2 items-center">
                    <span className="text-base font-black" style={{ color: NOHO_INK }}>$</span>
                    <input
                      type="number"
                      min={0.01}
                      step={1}
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="25.00"
                      className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["Cash", "Square", "CardOnFile", "Comp"] as const).map((m) => {
                      const active = topUpMethod === m;
                      const label = m === "CardOnFile" ? "Card" : m;
                      return (
                        <button
                          key={m}
                          onClick={() => setTopUpMethod(m)}
                          className="text-[10px] font-black uppercase tracking-wider px-1.5 py-1.5 rounded transition-colors"
                          style={{
                            background: active ? (m === "Comp" ? "#92400e" : "#15803d") : "white",
                            color: active ? "#fff" : "#7A6050",
                            border: active ? "none" : "1px solid #E8DDD0",
                          }}
                          title={m === "Comp" ? "Free credit (no money taken)" : `Paid via ${m}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={topUpReason}
                    onChange={(e) => setTopUpReason(e.target.value)}
                    placeholder="Reason (e.g. paid in cash, comp month) *"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setTopUpOpen(false); setTopUpAmount(""); setTopUpReason(""); }}
                      disabled={isPending}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ color: "#7A6050" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWalletTopUp}
                      disabled={isPending || !topUpAmount || !topUpReason.trim()}
                      className="text-xs font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "#15803d" }}
                    >
                      Credit wallet
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Suite reassign */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-1">Suite</p>
              {!reassignOpen ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-extrabold tracking-tight" style={{ color: NOHO_BLUE }}>
                    #{selected.suiteNumber ?? "—"}
                  </p>
                  <button
                    onClick={() => { setReassignOpen(true); setNewSuite(""); setReassignReason(""); }}
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(51,116,133,0.08)", color: NOHO_BLUE }}
                  >
                    Reassign
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newSuite}
                    onChange={(e) => setNewSuite(e.target.value)}
                    placeholder="New suite #"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  <input
                    type="text"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setReassignOpen(false)} disabled={isPending} className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ color: "#7A6050" }}>
                      Cancel
                    </button>
                    <button onClick={handleReassignSuite} disabled={isPending || !newSuite.trim()} className="text-xs font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: NOHO_BLUE }}>
                      Reassign
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keys */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Keys in hand</p>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                  {customerKeys.length}
                </span>
              </div>
              {customerKeys.length === 0 ? (
                <p className="text-xs text-[#7A6050] mb-3 italic">No keys issued yet.</p>
              ) : (
                <ul className="space-y-1.5 mb-3">
                  {customerKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                      <span className="text-xs font-black" style={{ color: NOHO_INK }}>{k.keyTag}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleReturnKey(k.id)} disabled={isPending} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded disabled:opacity-50" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                          Return
                        </button>
                        <button onClick={() => handleMarkLost(k.id)} disabled={isPending} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded disabled:opacity-50" style={{ background: "rgba(231,0,19,0.1)", color: "#b91c1c" }}>
                          Lost
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-1">Available to issue</p>
              {availableKeysForSuite.length === 0 ? (
                <p className="text-xs text-[#7A6050] italic">No keys in stock — add to inventory under Key Registry.</p>
              ) : (
                <ul className="space-y-1">
                  {availableKeysForSuite.slice(0, 5).map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-2 text-xs">
                      <span style={{ color: NOHO_INK }}>
                        <strong>{k.keyTag}</strong>
                        <span className="ml-1 text-[10px]" style={{ color: "#7A6050" }}>
                          {k.suiteNumber === selected.suiteNumber ? "(matches suite)" : `suite ${k.suiteNumber}`}
                        </span>
                      </span>
                      <button onClick={() => handleIssueKey(k.id)} disabled={isPending} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded disabled:opacity-50" style={{ background: NOHO_BLUE, color: "#fff" }}>
                        Issue
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Security deposit */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Security Deposit</p>
                {!refundOpen && (selected.securityDepositCents ?? 0) > 0 && (
                  <button
                    onClick={() => { setRefundOpen(true); setRefundAmount(((selected.securityDepositCents ?? 0) / 100).toFixed(2)); }}
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(231,0,19,0.08)", color: "#b91c1c" }}
                    title="Refund all or part of the deposit"
                  >
                    Refund
                  </button>
                )}
              </div>
              <p className="text-2xl font-extrabold tracking-tight" style={{ color: (selected.securityDepositCents ?? 0) > 0 ? NOHO_INK : "#7A6050" }}>
                {fmtMoney(selected.securityDepositCents ?? 0)}
              </p>
              {refundOpen && (
                <div className="mt-3 space-y-2 rounded-xl p-3" style={{ background: "rgba(231,0,19,0.04)", border: "1px solid rgba(231,0,19,0.18)" }}>
                  <div className="flex gap-2 items-center">
                    <span className="text-base font-black" style={{ color: NOHO_INK }}>$</span>
                    <input
                      type="number"
                      min={0.01}
                      max={(selected.securityDepositCents ?? 0) / 100}
                      step={0.01}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={((selected.securityDepositCents ?? 0) / 100).toFixed(2)}
                      className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["Cash", "Square", "CardOnFile"] as const).map((m) => {
                      const active = refundMethod === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setRefundMethod(m)}
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded transition-colors"
                          style={{
                            background: active ? NOHO_INK : "white",
                            color: active ? NOHO_CREAM : "#7A6050",
                            border: active ? `1px solid ${NOHO_INK}` : "1px solid #E8DDD0",
                          }}
                        >
                          {m === "CardOnFile" ? "Card" : m}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason (optional, audit trail)"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setRefundOpen(false); setRefundAmount(""); setRefundReason(""); }}
                      disabled={isPending}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ color: "#7A6050" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRefundDeposit}
                      disabled={isPending || !refundAmount}
                      className="text-xs font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "#b91c1c" }}
                    >
                      Refund
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel + refund (terminate account) */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#b91c1c" }}>Cancel Account</p>
              {!cancelOpen ? (
                <>
                  <p className="text-[11px] mt-1 mb-2" style={{ color: "#7A6050" }}>
                    {selected.mailboxStatus === "Cancelled" || selected.status === "Inactive"
                      ? "Customer is already cancelled."
                      : "Closes the box, disables auto-renew, optionally refunds remaining time."}
                  </p>
                  <button
                    onClick={() => {
                      setCancelOpen(true);
                      setCancelRefundAmount(((cancelProrateCents) / 100).toFixed(2));
                      setCancelReason("");
                    }}
                    disabled={selected.mailboxStatus === "Cancelled" || selected.status === "Inactive"}
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: "rgba(231,0,19,0.08)", color: "#b91c1c", border: "1px solid rgba(231,0,19,0.18)" }}
                  >
                    Cancel & refund
                  </button>
                </>
              ) : (
                <div className="space-y-2 mt-2 rounded-xl p-3" style={{ background: "rgba(231,0,19,0.04)", border: "1px solid rgba(231,0,19,0.18)" }}>
                  {cancelProrateCents > 0 && (
                    <p className="text-[10px]" style={{ color: "#7A6050" }}>
                      Suggested pro-rate: <strong style={{ color: NOHO_INK }}>${(cancelProrateCents / 100).toFixed(2)}</strong> (remaining months × monthly rate)
                    </p>
                  )}
                  <div className="flex gap-2 items-center">
                    <span className="text-base font-black" style={{ color: NOHO_INK }}>$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cancelRefundAmount}
                      onChange={(e) => setCancelRefundAmount(e.target.value)}
                      placeholder="0.00 (no refund)"
                      className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["Cash", "Square", "CardOnFile", "WalletCredit"] as const).map((m) => {
                      const active = cancelRefundMethod === m;
                      const label = m === "CardOnFile" ? "Card" : m === "WalletCredit" ? "Wallet" : m;
                      return (
                        <button
                          key={m}
                          onClick={() => setCancelRefundMethod(m)}
                          className="text-[10px] font-black uppercase tracking-wider px-1.5 py-1.5 rounded transition-colors"
                          style={{
                            background: active ? NOHO_INK : "white",
                            color: active ? NOHO_CREAM : "#7A6050",
                            border: active ? `1px solid ${NOHO_INK}` : "1px solid #E8DDD0",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason (required, audit trail) *"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setCancelOpen(false); setCancelRefundAmount(""); setCancelReason(""); }}
                      disabled={isPending}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ color: "#7A6050" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCancelCustomer}
                      disabled={isPending || !cancelReason.trim()}
                      className="text-xs font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "#b91c1c" }}
                    >
                      Cancel account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Key Registry mode ─── */}
      {mode === "keys" && (
        <div className="rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>
              Key Registry
            </h3>
            <div className="flex gap-2">
              <div className="flex gap-1">
                {(["all", "issued", "available", "lost"] as const).map((k) => {
                  const active = keyFilter === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setKeyFilter(k)}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: active ? NOHO_BLUE : "#FFF9F3",
                        color: active ? "#fff" : "#7A6050",
                        border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                      }}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAddKey(!showAddKey)}
                className="text-xs font-black px-3 py-1.5 rounded-lg text-white"
                style={{ background: NOHO_BLUE }}
              >
                {showAddKey ? "Close" : "+ Add Key"}
              </button>
            </div>
          </div>

          {showAddKey && (
            <div className="rounded-xl p-3 mb-4 flex gap-2 flex-wrap items-center" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
              <input
                type="text"
                value={newKeyTag}
                onChange={(e) => setNewKeyTag(e.target.value)}
                placeholder="Key tag (e.g. K-0142)"
                className="flex-1 min-w-[120px] rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
              />
              <input
                type="text"
                value={newKeySuite}
                onChange={(e) => setNewKeySuite(e.target.value)}
                placeholder="Suite #"
                className="flex-1 min-w-[100px] rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
              />
              <button
                onClick={handleAddKey}
                disabled={isPending || !newKeyTag.trim() || !newKeySuite.trim()}
                className="px-4 py-2 rounded-lg text-xs font-black text-white disabled:opacity-50"
                style={{ background: NOHO_BLUE }}
              >
                Add to inventory
              </button>
            </div>
          )}

          {filteredKeys.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-[#2D100F]/70">No keys match.</p>
              <p className="text-xs text-[#2D100F]/50 mt-1">Add the first physical key to start the registry.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8DDD0]">
              {filteredKeys.map((k) => {
                const issued = k.status === "Issued";
                const lost = k.status === "Lost";
                return (
                  <li key={k.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black flex items-center gap-2 flex-wrap" style={{ color: NOHO_INK }}>
                        {k.keyTag}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                          Suite #{k.suiteNumber}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: issued ? "rgba(245,166,35,0.15)" : lost ? "rgba(231,0,19,0.12)" : "rgba(22,163,74,0.12)",
                                color: issued ? "#92400e" : lost ? "#b91c1c" : "#15803d",
                              }}>
                          {k.status}
                        </span>
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#7A6050" }}>
                        {issued ? `Held by ${k.issuedToName ?? "(unknown)"} since ${k.issuedAt ?? "—"}` :
                         lost ? `Marked lost ${k.returnedAt ?? ""}` :
                         k.returnedAt ? `Returned ${k.returnedAt}` : "In stock"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {issued && (
                        <>
                          <button onClick={() => handleReturnKey(k.id)} disabled={isPending} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded disabled:opacity-50" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                            Return
                          </button>
                          <button onClick={() => handleMarkLost(k.id)} disabled={isPending} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded disabled:opacity-50" style={{ background: "rgba(231,0,19,0.1)", color: "#b91c1c" }}>
                            Mark lost
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {(mode === "recent") && (
        <div className="rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>
              Recent Renewals
            </h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
              {renewals.length}
            </span>
          </div>
          {renewals.length === 0 ? (
            <div className="p-12 text-center">
              <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke={NOHO_INK} strokeWidth="2" strokeLinejoin="round">
                <rect x="6" y="10" width="36" height="32" rx="3" />
                <path d="M6 18 L42 18" />
                <path d="M14 4 L14 14 M34 4 L34 14" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-bold text-[#2D100F]/70">No renewals yet</p>
              <p className="text-xs text-[#2D100F]/50 mt-1">Process your first renewal to start the audit log.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8DDD0]">
              {renewals.map((r) => {
                const sent = !!r.receiptSentAt;
                return (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black flex items-center gap-2 flex-wrap" style={{ color: NOHO_INK }}>
                        {r.userName}
                        {r.suiteNumber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
                            #{r.suiteNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: sent ? "rgba(22,163,74,0.12)" : "rgba(245,158,11,0.15)", color: sent ? "#15803d" : "#92400e" }}>
                          {sent ? "Receipt sent" : "Receipt pending"}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#7A6050" }}>
                        {r.planAtRenewal} · {r.termMonths} mo · {fmtMoney(r.amountCents)} · {r.paymentMethod} · paid {r.paidAt} · new due {fmtDate(r.newPlanDueDate)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <a
                        href={`/admin/mailbox/receipt/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "rgba(51,116,133,0.08)", color: NOHO_BLUE }}
                      >
                        View receipt
                      </a>
                      <button
                        onClick={() => handleResend(r.id)}
                        disabled={isPending}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: "rgba(45,16,15,0.06)", color: NOHO_INK }}
                      >
                        Resend email
                      </button>
                      <button
                        onClick={() => handleVoidRenewal(r.id, `${r.userName} · ${r.termMonths}mo · ${fmtMoney(r.amountCents)}`)}
                        disabled={isPending}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-red-50"
                        style={{ color: "#b91c1c", border: "1px solid rgba(231,0,19,0.2)" }}
                        title="Void this renewal — refunds payment + reverts plan dates"
                      >
                        Void
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ─── Walk-in Signup wizard ─── */}
      {walkInOpen && (
        <AdminWalkInSignupWizard
          pricing={pricing ?? null}
          takenSuites={customers.map((c) => c.suiteNumber).filter((s): s is string => !!s)}
          onClose={() => setWalkInOpen(false)}
          onSuccess={(userId) => {
            setWalkInOpen(false);
            setSelectedCustomerId(userId);
            setMode("renew");
            setFeedback("Walk-in signup processed · welcome email sent if email on file");
            setTimeout(() => setFeedback(null), 5000);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── NPC scene ────────────────────────────────────────────────────────── */

/* ─── Plan distribution: horizontal bars by plan ────────────────────────── */
function PlanDistributionCard({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const colors: Record<string, string> = {
    Basic:    NOHO_BLUE,
    Business: "#23596A",
    Premium:  "#0E2340",
    "(no plan)": "#7A6050",
  };
  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>Plan Distribution</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
          {total} active
        </span>
      </div>
      <ul className="space-y-3">
        {entries.map(([plan, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const color = colors[plan] ?? "#7A6050";
          return (
            <li key={plan}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black" style={{ color: NOHO_INK }}>{plan}</span>
                <span className="text-xs font-bold" style={{ color: "#7A6050" }}>
                  {count} <span className="text-[10px] opacity-70">· {pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#FFF9F3" }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Forwarding distribution — count by US state, top 8 ────────────────── */
function ForwardingMapCard({ byState }: { byState: Record<string, number> }) {
  const entries = Object.entries(byState).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const top = entries.slice(0, 8);
  const rest = entries.slice(8).reduce((s, [, n]) => s + n, 0);
  const max = top[0]?.[1] ?? 1;
  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>Forwarding Reach</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
          {total} addrs · {Object.keys(byState).filter((s) => s !== "??").length} states
        </span>
      </div>
      <ul className="space-y-2.5">
        {top.map(([state, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const wPct = max > 0 ? (count / max) * 100 : 0;
          const isUnknown = state === "??";
          return (
            <li key={state}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5" style={{ color: isUnknown ? "#7A6050" : NOHO_INK }}>
                  {isUnknown ? "Unparseable" : state}
                  {!isUnknown && <span className="text-[10px] font-normal" style={{ color: "#7A6050" }}>{stateName(state)}</span>}
                </span>
                <span className="text-xs font-bold" style={{ color: "#7A6050" }}>
                  {count} <span className="text-[10px] opacity-70">· {pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#FFF9F3" }}>
                <div className="h-full transition-all" style={{ width: `${wPct}%`, background: isUnknown ? "#7A6050" : NOHO_BLUE }} />
              </div>
            </li>
          );
        })}
        {rest > 0 && (
          <li className="text-[11px] italic" style={{ color: "#7A6050" }}>+ {rest} addresses across {entries.length - 8} more states</li>
        )}
      </ul>
    </div>
  );
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "DC", PR: "Puerto Rico", VI: "Virgin Islands", GU: "Guam", AS: "American Samoa",
};
function stateName(code: string): string {
  return STATE_NAMES[code.toUpperCase()] ?? "";
}

/* ─── Cash till — today + 7-day rollup by source ────────────────────────── */
function TillCard({
  week,
  today,
}: {
  week: NonNullable<Props["tillWeek"]>;
  today?: WalkInTodayStat;
}) {
  const todayTotal = today ? today.cashToday + today.cardToday + today.squareToday : 0;
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const pctOf = (cents: number) => (week.completedCents > 0 ? (cents / week.completedCents) * 100 : 0);
  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold tracking-tight" style={{ color: NOHO_INK }}>Cash Till</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
          7 days
        </span>
      </div>

      {/* Today summary */}
      <div className="mb-4 rounded-xl p-3" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Today</p>
        <p className="text-2xl font-extrabold tracking-tight" style={{ color: NOHO_INK }}>
          {fmt(todayTotal)}
        </p>
        {today && today.paymentsToday > 0 && (
          <p className="text-[11px] mt-0.5" style={{ color: "#7A6050" }}>
            {today.paymentsToday} payment{today.paymentsToday === 1 ? "" : "s"} · cash {fmt(today.cashToday)} · card {fmt(today.cardToday)} · sq {fmt(today.squareToday)}
          </p>
        )}
        {(!today || today.paymentsToday === 0) && (
          <p className="text-[11px] mt-0.5" style={{ color: "#7A6050" }}>No payments yet today</p>
        )}
      </div>

      {/* 7-day breakdown */}
      <div className="space-y-2.5">
        {[
          { label: "Cash",   cents: week.cashCents,   tone: "#16a34a" },
          { label: "Card",   cents: week.cardCents,   tone: NOHO_BLUE },
          { label: "Square", cents: week.squareCents, tone: "#0E2340" },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black" style={{ color: NOHO_INK }}>{row.label}</span>
              <span className="text-xs font-bold" style={{ color: "#7A6050" }}>
                {fmt(row.cents)} <span className="text-[10px] opacity-70">· {pctOf(row.cents).toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#FFF9F3" }}>
              <div className="h-full" style={{ width: `${pctOf(row.cents)}%`, background: row.tone }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "#E8DDD0" }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">7-day net</p>
          <p className="text-lg font-extrabold tracking-tight" style={{ color: NOHO_INK }}>
            {fmt(week.completedCents - week.refundedCents)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: "#7A6050" }}>{week.count} sales</p>
          {week.refundCount > 0 && (
            <p className="text-[10px]" style={{ color: "#b91c1c" }}>{week.refundCount} refund{week.refundCount === 1 ? "" : "s"} · −{fmt(week.refundedCents)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  accent,
  title,
  prefix,
  onClick,
  active,
}: {
  label: string;
  value: number;
  suffix: string;
  accent?: boolean;
  title?: string;
  /** Optional prefix on the value (e.g. "$" for money tiles). */
  prefix?: string;
  /** Click → typically filters the picker. When provided, the tile renders as a button. */
  onClick?: () => void;
  /** Mark this tile as the currently-applied filter (raises elevation + ring). */
  active?: boolean;
}) {
  // a11y: screen readers concat the three stacked <p> tags into one string
  // ("At-Risk32od · 1due · 0sus"). Setting an explicit aria-label on the
  // group + aria-hidden on the inner paragraphs gives readers a clean,
  // human-readable announcement without losing the visual layout.
  const announce = `${label}: ${value}${title ? ` — ${title}` : suffix ? ` — ${suffix}` : ""}`;
  const animated = useAnimatedCount(value);
  const Tag = onClick ? "button" : "div";

  // Premium look: glassy frosted bg, subtle gradient, 1px highlight on top,
  // hover lift, urgent (accent) tiles get a pulsing dot indicator.
  const baseBg = accent
    ? "linear-gradient(135deg, rgba(231,0,19,0.22) 0%, rgba(231,0,19,0.10) 100%)"
    : "linear-gradient(135deg, rgba(247,230,194,0.12) 0%, rgba(247,230,194,0.04) 100%)";
  const baseBorder = accent ? "rgba(231,0,19,0.42)" : "rgba(247,230,194,0.20)";
  const ring = active
    ? `0 0 0 2px ${accent ? "rgba(231,0,19,0.55)" : "rgba(247,230,194,0.55)"}, 0 8px 24px rgba(0,0,0,0.35)`
    : accent
    ? "0 6px 18px rgba(231,0,19,0.18), inset 0 1px 0 rgba(255,255,255,0.05)"
    : "0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      role={onClick ? undefined : "group"}
      aria-label={announce}
      onClick={onClick}
      className={[
        "relative overflow-hidden rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 min-w-[92px] sm:min-w-[116px]",
        "transition-all duration-200 ease-out",
        onClick ? "text-left cursor-pointer hover:-translate-y-0.5 active:translate-y-0" : "",
        "backdrop-blur-sm",
      ].join(" ")}
      style={{
        background: baseBg,
        border: `1px solid ${baseBorder}`,
        boxShadow: ring,
      }}
      title={title}
    >
      {/* Top inner highlight — gives the glass a faint top edge */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.20) 40%, rgba(255,255,255,0.20) 60%, transparent)",
        }}
      />
      {/* Pulsing dot for urgency tiles */}
      {accent && value > 0 && (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{
            background: "#FFB4BB",
            boxShadow: "0 0 8px rgba(255,180,187,0.9)",
            animation: "stat-pulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      <p
        aria-hidden
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: accent ? "rgba(255,180,187,0.85)" : "rgba(247,230,194,0.7)" }}
      >
        {label}
      </p>
      <p
        aria-hidden
        className="text-2xl font-extrabold tracking-tight tabular-nums"
        style={{ color: accent ? "#FFB4BB" : NOHO_CREAM }}
      >
        {prefix ?? ""}{animated.toLocaleString("en-US")}
      </p>
      <p
        aria-hidden
        className="text-[9px]"
        style={{ color: accent ? "rgba(255,180,187,0.6)" : "rgba(247,230,194,0.5)" }}
      >
        {suffix}
      </p>
      <style>{`
        @keyframes stat-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="rounded-xl"] { animation: none !important; }
        }
      `}</style>
    </Tag>
  );
}

function NpcScene({
  mode,
  speech,
  onPick,
  onHover,
}: {
  mode: Mode;
  speech: string;
  onPick: (m: Mode) => void;
  onHover: (m: Mode | null) => void;
}) {
  // 4 menu options arranged in an arc above + sides + below the agent.
  const menu: Array<{
    id: Mode;
    label: string;
    sub: string;
    angle: number; // degrees from top, going clockwise
    Icon: (p: { className?: string }) => React.ReactElement;
  }> = [
    { id: "renew",  angle: -90, label: "Process Renewal",  sub: "Pick term · email receipt", Icon: IconRenew },
    { id: "recent", angle: 0,   label: "Recent Renewals",  sub: "Audit log + receipts",      Icon: IconReceipt },
    { id: "keys",   angle: 90,  label: "Key Registry",     sub: "Issue · return · lost",     Icon: IconKey },
    { id: "search", angle: 180, label: "Find Customer",    sub: "Search · jump to suite",     Icon: IconSearch },
  ];

  // Layout: agent in center; menu options orbit at radius `r` from center.
  const SIZE = 520; // SVG canvas
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = 180;

  function pos(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  return (
    <div className="relative hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(10,18,24,0.4)", border: "1px solid rgba(247,230,194,0.08)" }}>
      {/* Speech bubble — rendered as an HTML overlay on top of the SVG so it
          can wrap on any length of text without colliding with the orbit menu.
          The earlier SVG-based bubble was a fixed-width rect that occluded
          the "Process Renewal" tile at the -90° orbit position. */}
      <div
        aria-live="polite"
        className="absolute left-1/2 top-3 z-10 -translate-x-1/2 max-w-[78%] rounded-xl px-3 py-1.5 text-center pointer-events-none"
        style={{
          background: NOHO_CREAM,
          color: NOHO_INK,
          border: `2px solid ${NOHO_INK}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.35,
        }}
      >
        {speech}
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 480 }}>
        <defs>
          <radialGradient id="agent-glow" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor={NOHO_CREAM} stopOpacity="0.4" />
            <stop offset="60%" stopColor={NOHO_BLUE} stopOpacity="0.1" />
            <stop offset="100%" stopColor={NOHO_BLUE} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Concentric rings */}
        {[80, 140, 200, 240].map((rad, i) => (
          <circle
            key={rad}
            cx={cx} cy={cy} r={rad}
            fill="none"
            stroke="rgba(247,230,194,0.1)"
            strokeWidth="1"
            strokeDasharray="2 6"
            style={{ animation: `npc-ring-rotate ${30 + i * 6}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }}
          />
        ))}

        {/* Agent glow */}
        <circle cx={cx} cy={cy} r="120" fill="url(#agent-glow)" />

        {/* Connector lines from agent to each menu option */}
        {menu.map((m) => {
          const p = pos(m.angle);
          const active = mode === m.id;
          return (
            <line
              key={`line-${m.id}`}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke={active ? NOHO_BLUE : "rgba(247,230,194,0.16)"}
              strokeWidth={active ? 1.8 : 1}
              strokeDasharray={active ? "none" : "3 6"}
            />
          );
        })}

        {/* The Agent (NPC) — friendly NOHO Mailbox shopkeeper */}
        <g transform={`translate(${cx - 50} ${cy - 60})`} style={{ animation: "agent-breathe 5s ease-in-out infinite", transformOrigin: `${cx}px ${cy}px` }}>
          {/* Counter */}
          <rect x="-10" y="86" width="120" height="34" rx="3" fill="#3a2a18" stroke={NOHO_INK} strokeWidth="2" />
          <rect x="-10" y="86" width="120" height="6" fill="#52391f" stroke={NOHO_INK} strokeWidth="1.5" />
          <rect x="6" y="98" width="14" height="14" rx="1.5" fill="#FFF9F3" stroke={NOHO_INK} strokeWidth="1.5" />
          <rect x="80" y="98" width="14" height="14" rx="1.5" fill={NOHO_BLUE} stroke={NOHO_INK} strokeWidth="1.5" />

          {/* Body — apron over shirt */}
          <rect x="22" y="56" width="56" height="40" rx="4" fill={NOHO_BLUE} stroke={NOHO_INK} strokeWidth="2" />
          {/* Apron tie */}
          <path d="M22 60 L18 56 M78 60 L82 56" stroke={NOHO_INK} strokeWidth="2" strokeLinecap="round" />
          {/* Apron pocket */}
          <rect x="36" y="74" width="28" height="14" rx="2" fill="rgba(255,255,255,0.18)" stroke={NOHO_INK} strokeWidth="1.5" />
          <path d="M48 78 L48 86 M44 82 L52 82" stroke={NOHO_CREAM} strokeWidth="1.4" strokeLinecap="round" />

          {/* Neck */}
          <rect x="42" y="46" width="16" height="12" fill="#E8C9A0" stroke={NOHO_INK} strokeWidth="1.5" />

          {/* Head */}
          <ellipse cx="50" cy="32" rx="22" ry="22" fill="#F0D5AB" stroke={NOHO_INK} strokeWidth="2" />
          {/* Hair */}
          <path d="M30 24 C30 12 70 12 70 24 L70 28 L30 28 Z" fill="#3d2418" stroke={NOHO_INK} strokeWidth="1.5" strokeLinejoin="round" />
          {/* Brows */}
          <path d="M40 28 L46 27 M54 27 L60 28" stroke={NOHO_INK} strokeWidth="2" strokeLinecap="round" />
          {/* Eyes — blink animation */}
          <g style={{ animation: "agent-blink 5s steps(1, end) infinite", transformOrigin: "50px 33px" }}>
            <circle cx="42" cy="33" r="1.6" fill={NOHO_INK} />
            <circle cx="58" cy="33" r="1.6" fill={NOHO_INK} />
          </g>
          {/* Smile */}
          <path d="M42 40 Q50 46 58 40" stroke={NOHO_INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Cheeks */}
          <circle cx="36" cy="38" r="2" fill="rgba(231,0,19,0.3)" />
          <circle cx="64" cy="38" r="2" fill="rgba(231,0,19,0.3)" />

          {/* Apron logo — small heart */}
          <path d="M50 70 C50 67 46 66 46 69 C46 73 50 75 50 75 C50 75 54 73 54 69 C54 66 50 67 50 70Z" fill={NOHO_RED} />
        </g>

        {/* Speech bubble moved to an HTML overlay above the SVG so it never
            overlaps the orbit menu. Was: rect+foreignObject at cy-175. */}

        {/* Menu options arranged on the orbit */}
        {menu.map((m) => {
          const p = pos(m.angle);
          const active = mode === m.id;
          const w = 150, h = 64;
          const x = p.x - w / 2;
          const y = p.y - h / 2;
          return (
            <g
              key={m.id}
              style={{ cursor: "pointer" }}
              onClick={() => onPick(m.id)}
              onMouseEnter={() => onHover(m.id)}
              onMouseLeave={() => onHover(null)}
            >
              <rect
                x={x} y={y} width={w} height={h} rx="14"
                fill={active ? NOHO_BLUE : "rgba(255,255,255,0.04)"}
                stroke={active ? NOHO_BLUE : "rgba(247,230,194,0.22)"}
                strokeWidth={active ? 2 : 1.2}
                style={{
                  filter: active ? `drop-shadow(0 8px 24px ${NOHO_BLUE}AA)` : "drop-shadow(0 2px 10px rgba(0,0,0,0.35))",
                  transition: "all 250ms",
                }}
              />
              <foreignObject x={x + 12} y={y + 10} width={w - 24} height={h - 20}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "system-ui", height: "100%" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? "rgba(255,255,255,0.18)" : "rgba(247,230,194,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: active ? "#fff" : NOHO_CREAM }}>
                    <m.Icon className="w-4 h-4" />
                  </div>
                  <div style={{ minWidth: 0, lineHeight: 1.15 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: active ? "#fff" : NOHO_CREAM, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: active ? "rgba(255,255,255,0.85)" : "rgba(247,230,194,0.55)", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {m.sub}
                    </div>
                  </div>
                </div>
              </foreignObject>
              {active && <circle cx={x + w - 10} cy={y + 10} r="3" fill="#fff" />}
            </g>
          );
        })}

        <style>{`
          @keyframes npc-ring-rotate {
            to { transform: rotate(360deg); transform-origin: ${cx}px ${cy}px; }
          }
          @keyframes agent-breathe {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-2px); }
          }
          @keyframes agent-blink {
            0%, 92%, 100% { transform: scaleY(1); }
            94%, 96%      { transform: scaleY(0.05); }
          }
          @media (prefers-reduced-motion: reduce) {
            svg circle, svg g { animation: none !important; }
          }
        `}</style>
      </svg>

      {/* Mobile fallback */}
      <div className="md:hidden grid grid-cols-2 gap-2 p-4">
        {menu.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: active ? NOHO_BLUE : "rgba(255,255,255,0.06)",
                border: `1px solid ${active ? NOHO_BLUE : "rgba(247,230,194,0.16)"}`,
                color: active ? "#fff" : NOHO_CREAM,
              }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? "rgba(255,255,255,0.15)" : "rgba(247,230,194,0.08)" }}>
                <m.Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black truncate">{m.label}</p>
                <p className="text-[9px] truncate" style={{ color: active ? "rgba(255,255,255,0.7)" : "rgba(247,230,194,0.55)" }}>{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Inline icons used in the radial menu ─────────────────────────────── */

function IconRenew({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 C3 7 7 3 12 3 C16 3 19 5 21 9" />
      <path d="M21 12 C21 17 17 21 12 21 C8 21 5 19 3 15" />
      <path d="M16 9 L21 9 L21 4 M8 15 L3 15 L3 20" />
    </svg>
  );
}

function IconReceipt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M5 3 L19 3 L19 21 L17 19 L15 21 L13 19 L11 21 L9 19 L7 21 L5 21 Z" />
      <path d="M9 9 L15 9 M9 13 L15 13" />
    </svg>
  );
}

function IconKey({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12 L21 12" />
      <path d="M17 12 L17 16 M21 12 L21 17" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="6" />
      <path d="M15 15 L21 21" />
    </svg>
  );
}
