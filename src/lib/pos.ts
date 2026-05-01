/**
 * POS — types + constants.
 * Lives outside `"use server"` boundary so it can be imported by both client
 * components and server actions.
 */

export type POSPaymentMethod =
  | "Cash"
  | "Zelle"
  | "Square"
  | "CardOnFile"
  | "Wallet"
  | "Custom";

export type POSCartLine = {
  sku?: string | null;
  name: string;
  category?: string | null;
  unitPriceCents: number;
  quantity: number;
  discountCents?: number;
  notes?: string | null;
};

export type POSSaleRow = {
  id: string;
  number: number;
  cashierName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerSuite: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  paymentMethod: string;
  customMethodLabel: string | null;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  itemCount: number;
};

export type POSCatalogEntry = {
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  hint?: string;
};

export const ZELLE_RECIPIENT_EMAIL = "nohomailbox@gmail.com";
export const ZELLE_RECIPIENT_NAME = "NOHO Mailbox";

// ─── Upcoming renewals strip (iter-23) ───────────────────────────────
export type UpcomingRenewalCustomer = {
  id: string;
  name: string;
  suiteNumber: string | null;
  plan: string | null;
  planTerm: string | null;
};
export type UpcomingRenewalDay = {
  date: string;                // "YYYY-MM-DD"
  weekday: string;             // "Mon", "Tue", ...
  dayOfMonth: number;          // 1..31
  count: number;
  customers: UpcomingRenewalCustomer[];
  isToday: boolean;
  isPast: boolean;             // overdue
};

// ─── Returns modal (iter-17) ─────────────────────────────────────────
export type POSSaleDetailed = {
  id: string;
  number: number;
  customerName: string | null;
  customerSuite: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  cashierName: string | null;
  paymentMethod: string;
  customMethodLabel: string | null;
  paymentRef: string | null;
  status: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  paidAt: string | null;          // ISO
  voidedAt: string | null;        // ISO
  voidReason: string | null;
  createdAt: string;              // ISO
  items: Array<{
    id: string;
    name: string;
    category: string | null;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
  }>;
};

// ─── Live activity ticker (iter-16) ──────────────────────────────────
export type TickerEventKind =
  | "sale"
  | "void"
  | "mail"
  | "signup"
  | "wallet"
  | "milestone";

export type TickerEvent = {
  id: string;             // unique key (table+id)
  kind: TickerEventKind;
  iconLetter: string;     // ✓ ⚐ ☆ ＄ etc
  message: string;        // human-readable
  amountCents?: number;
  customerName?: string | null;
  suiteNumber?: string | null;
  atIso: string;          // ISO timestamp
};

// ─── Mailbox wall (iter-13) ──────────────────────────────────────────
export type MailboxWallCell = {
  suiteNumber: string;
  status: "active" | "due_soon" | "overdue" | "suspended" | "held" | "vacant";
  customerId: string | null;
  customerName: string | null;
  initials: string | null;
  plan: string | null;
  planDueDate: string | null;
  daysToRenew: number | null;
};
export type MailboxWallData = {
  cells: MailboxWallCell[];
  highest: number;
  occupied: number;
  vacant: number;
  overdue: number;
  dueSoon: number;
};

// ─── Z-Report (iter-7) ───────────────────────────────────────────────
export type ZReportData = {
  dateYmd: string;             // "2026-04-30"
  generatedAtIso: string;
  totals: {
    grossCents: number;
    discountCents: number;
    taxCents: number;
    tipCents: number;
    netCents: number;
    voidedCents: number;
    saleCount: number;
    voidCount: number;
  };
  byMethod: Array<{ method: string; cents: number; count: number }>;
  byCategory: Array<{ category: string; cents: number; quantity: number }>;
  topItems: Array<{ name: string; quantity: number; cents: number }>;
  byHour: Array<{ hour: number; cents: number; count: number }>;
  byCashier: Array<{ name: string; cents: number; count: number }>;
};
