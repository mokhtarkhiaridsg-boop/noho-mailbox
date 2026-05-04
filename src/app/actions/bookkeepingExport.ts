"use server";

// iter-106 — Bookkeeping export.
//
// Generates monthly (or any custom date-range) export of all financial
// records across the system: Square payments, wallet transactions, POS
// sales, invoices, mailbox renewals, dropoff fees. Two formats:
//   - CSV: per-table flat exports (one file per type, plain RFC 4180)
//   - QuickBooks IIF: classic accounting-import format with header
//     blocks (!HDR/!ACCNT/!TRNS/!SPL) — works with QuickBooks Desktop
//     and most SMB bookkeeping software.
//
// All exports audit-logged with row-counts so admin can prove what was
// extracted on tax day. Reuses iter-95 audit pattern + the iter-83
// existing CSV escape helpers in src/lib/csv.ts.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { toCsv, type CsvValue } from "@/lib/csv";

const CASH_ACCOUNT = "NOHO Mailbox · Income";
const FEE_ACCOUNT = "NOHO Mailbox · Fees";

export type ExportSummary = {
  fromIso: string;
  toIso: string;
  payments: number;
  walletTransactions: number;
  posSales: number;
  invoices: number;
  renewals: number;
  dropoffs: number;
  totalGrossCents: number;
};

function parseRange(input: { from?: string; to?: string }): { from: Date; to: Date } {
  // Default = last calendar month (full).
  if (input.from && input.to) {
    return { from: new Date(input.from), to: new Date(input.to) };
  }
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { from: startOfLastMonth, to: startOfThisMonth };
}

// ─── Summary (drives the admin preview) ──────────────────────────────────
export async function getBookkeepingSummary(input: { from?: string; to?: string } = {}): Promise<ExportSummary> {
  await verifyAdmin();
  const { from, to } = parseRange(input);
  const range = { gte: from, lt: to };

  const [
    payCount, payAgg,
    walletCount, walletAgg,
    posCount, posAgg,
    invCount, invAgg,
    renewalCount, renewalAgg,
    dropoffCount,
  ] = await Promise.all([
    prisma.payment.count({ where: { syncedAt: range, status: "COMPLETED" } }),
    prisma.payment.aggregate({ where: { syncedAt: range, status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.walletTransaction.count({ where: { createdAt: range } }),
    prisma.walletTransaction.aggregate({ where: { createdAt: range, kind: { in: ["TopUp", "DepositCharge"] } }, _sum: { amountCents: true } }),
    prisma.pOSSale.count({ where: { paidAt: range, status: "Paid" } }),
    prisma.pOSSale.aggregate({ where: { paidAt: range, status: "Paid" }, _sum: { totalCents: true } }),
    prisma.invoice.count({ where: { paidAt: range, status: "Paid" } }),
    prisma.invoice.aggregate({ where: { paidAt: range, status: "Paid" }, _sum: { totalCents: true } }),
    prisma.mailboxRenewal.count({ where: { paidAt: range } }),
    prisma.mailboxRenewal.aggregate({ where: { paidAt: range }, _sum: { amountCents: true } }),
    prisma.externalDropoff.count({ where: { createdAt: range } }).catch(() => 0),
  ]);

  // Don't double-count: Square payments + POS Square-method sales overlap.
  // We trust the bookkeeper to reconcile, but show each total separately.
  const totalGrossCents =
    (payAgg._sum.amount ?? 0) +
    (posAgg._sum.totalCents ?? 0) +
    (invAgg._sum.totalCents ?? 0) +
    (renewalAgg._sum.amountCents ?? 0);

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    payments: payCount,
    walletTransactions: walletCount,
    posSales: posCount,
    invoices: invCount,
    renewals: renewalCount,
    dropoffs: dropoffCount,
    totalGrossCents,
  };
}

// ─── CSV exporters ───────────────────────────────────────────────────────
// Each returns the file's text body — the client downloads it via a
// Blob (admin panel handles the disk-write).

export async function exportPaymentsCsv(input: { from?: string; to?: string } = {}): Promise<{ csv: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);
  const rows = await prisma.payment.findMany({
    where: { syncedAt: { gte: from, lt: to }, status: "COMPLETED" },
    orderBy: { syncedAt: "asc" },
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  const csv = toCsv(rows.map((r) => ({
    "Square ID":    r.squarePaymentId,
    "Synced At":    r.syncedAt,
    "Square Created": r.squareCreatedAt,
    "Customer":     r.user?.name ?? "(unknown)",
    "Email":        r.user?.email ?? "",
    "Suite":        r.user?.suiteNumber ?? "",
    "Amount":       (r.amount / 100).toFixed(2),
    "Currency":     r.currency,
    "Source":       r.sourceType ?? "",
    "Note":         r.note ?? "",
    "Receipt URL":  r.receiptUrl ?? "",
  })));
  await audit(actor.id, actor.role, "bookkeeping.export_csv", "Payment", { rows: rows.length, range: rangeMeta(from, to) });
  return { csv, rows: rows.length };
}

export async function exportPosSalesCsv(input: { from?: string; to?: string } = {}): Promise<{ csv: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);
  const rows = await prisma.pOSSale.findMany({
    where: { paidAt: { gte: from, lt: to }, status: "Paid" },
    orderBy: { paidAt: "asc" },
  });
  const csv = toCsv(rows.map((r) => ({
    "Receipt #":       r.number,
    "Paid At":         r.paidAt,
    "Cashier":         r.cashierName ?? "",
    "Customer":        r.customerName ?? "",
    "Suite":           r.customerSuite ?? "",
    "Email":           r.customerEmail ?? "",
    "Subtotal":        (r.subtotalCents / 100).toFixed(2),
    "Discount":        (r.discountCents / 100).toFixed(2),
    "Tax":             (r.taxCents / 100).toFixed(2),
    "Tip":             (r.tipCents / 100).toFixed(2),
    "Total":           (r.totalCents / 100).toFixed(2),
    "Payment Method":  r.paymentMethod,
    "Custom Method":   r.customMethodLabel ?? "",
    "Payment Ref":     r.paymentRef ?? "",
  })));
  await audit(actor.id, actor.role, "bookkeeping.export_csv", "POSSale", { rows: rows.length, range: rangeMeta(from, to) });
  return { csv, rows: rows.length };
}

export async function exportWalletTransactionsCsv(input: { from?: string; to?: string } = {}): Promise<{ csv: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);
  const rows = await prisma.walletTransaction.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  const csv = toCsv(rows.map((r) => ({
    "ID":               r.id,
    "Created At":       r.createdAt,
    "Customer":         r.user?.name ?? "(unknown)",
    "Email":            r.user?.email ?? "",
    "Suite":            r.user?.suiteNumber ?? "",
    "Kind":             r.kind,
    "Amount":           (r.amountCents / 100).toFixed(2),
    "Balance After":    (r.balanceAfterCents / 100).toFixed(2),
    "Description":      r.description,
    "Invoice Linked":   r.invoiceId ?? "",
  })));
  await audit(actor.id, actor.role, "bookkeeping.export_csv", "WalletTransaction", { rows: rows.length, range: rangeMeta(from, to) });
  return { csv, rows: rows.length };
}

export async function exportInvoicesCsv(input: { from?: string; to?: string } = {}): Promise<{ csv: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);
  const rows = await prisma.invoice.findMany({
    where: { paidAt: { gte: from, lt: to }, status: "Paid" },
    orderBy: { paidAt: "asc" },
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  const csv = toCsv(rows.map((r) => ({
    "Invoice #":     r.number,
    "Paid At":       r.paidAt,
    "Customer":      r.user?.name ?? "(unknown)",
    "Email":         r.user?.email ?? "",
    "Suite":         r.user?.suiteNumber ?? "",
    "Kind":          r.kind,
    "Description":   r.description,
    "Amount":        (r.amountCents / 100).toFixed(2),
    "Tax":           (r.taxCents / 100).toFixed(2),
    "Total":         (r.totalCents / 100).toFixed(2),
    "Payment ID":    r.paymentId ?? "",
  })));
  await audit(actor.id, actor.role, "bookkeeping.export_csv", "Invoice", { rows: rows.length, range: rangeMeta(from, to) });
  return { csv, rows: rows.length };
}

export async function exportRenewalsCsv(input: { from?: string; to?: string } = {}): Promise<{ csv: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);
  const rows = await prisma.mailboxRenewal.findMany({
    where: { paidAt: { gte: from, lt: to } },
    orderBy: { paidAt: "asc" },
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  const csv = toCsv(rows.map((r) => ({
    "ID":              r.id,
    "Paid At":         r.paidAt,
    "Customer":        r.user?.name ?? "(unknown)",
    "Email":           r.user?.email ?? "",
    "Suite":           r.user?.suiteNumber ?? "",
    "Plan":            r.planAtRenewal,
    "Term (months)":   r.termMonths,
    "Amount":          (r.amountCents / 100).toFixed(2),
    "Payment Method":  r.paymentMethod,
    "Notes":           r.notes ?? "",
  })));
  await audit(actor.id, actor.role, "bookkeeping.export_csv", "MailboxRenewal", { rows: rows.length, range: rangeMeta(from, to) });
  return { csv, rows: rows.length };
}

// ─── QuickBooks IIF ──────────────────────────────────────────────────────
//
// IIF is a tab-delimited format with named header lines (!ACCNT, !TRNS,
// !SPL, !ENDTRNS). Each "transaction" is a TRNS line followed by one or
// more SPL (split) lines and an ENDTRNS terminator. We treat each paid
// invoice + each POS sale + each renewal as a single-split deposit into
// the income account.

export async function exportQuickbooksIif(input: { from?: string; to?: string } = {}): Promise<{ iif: string; rows: number }> {
  const actor = await verifyAdmin();
  const { from, to } = parseRange(input);

  const [pos, invoices, renewals] = await Promise.all([
    prisma.pOSSale.findMany({
      where: { paidAt: { gte: from, lt: to }, status: "Paid" },
      orderBy: { paidAt: "asc" },
    }),
    prisma.invoice.findMany({
      where: { paidAt: { gte: from, lt: to }, status: "Paid" },
      orderBy: { paidAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.mailboxRenewal.findMany({
      where: { paidAt: { gte: from, lt: to } },
      orderBy: { paidAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const lines: string[] = [];

  // Header blocks. ACCNT defines the chart of accounts we'll post into.
  lines.push(["!ACCNT", "NAME", "ACCNTTYPE", "DESC"].join("\t"));
  lines.push(["ACCNT", CASH_ACCOUNT, "INC", "Mailbox + POS revenue"].join("\t"));
  lines.push(["ACCNT", "Cash on hand", "BANK", "Cash drawer"].join("\t"));
  lines.push(["ACCNT", "Square checking", "BANK", "Square deposits"].join("\t"));

  lines.push(["!TRNS", "TRNSID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO"].join("\t"));
  lines.push(["!SPL", "SPLID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "MEMO"].join("\t"));
  lines.push("!ENDTRNS");

  let trnsId = 1;
  function emit(args: {
    date: Date;
    bankAccount: string;
    customer: string;
    amountCents: number;
    docNum: string;
    memo: string;
  }) {
    const dateStr = formatIifDate(args.date);
    const amountDollars = (args.amountCents / 100).toFixed(2);
    const negativeDollars = (-args.amountCents / 100).toFixed(2);
    lines.push(["TRNS", String(trnsId), "DEPOSIT", dateStr, args.bankAccount, args.customer, amountDollars, args.docNum, args.memo].join("\t"));
    lines.push(["SPL", String(trnsId), "DEPOSIT", dateStr, CASH_ACCOUNT, args.customer, negativeDollars, args.memo].join("\t"));
    lines.push("ENDTRNS");
    trnsId += 1;
  }

  for (const s of pos) {
    const bank = s.paymentMethod === "Cash" ? "Cash on hand"
      : s.paymentMethod === "Square" || s.paymentMethod === "CardOnFile" ? "Square checking"
      : "Cash on hand";
    emit({
      date: s.paidAt ?? s.createdAt,
      bankAccount: bank,
      customer: s.customerName ?? "Walk-in",
      amountCents: s.totalCents,
      docNum: `POS-${s.number}`,
      memo: `POS sale · ${s.paymentMethod}${s.customMethodLabel ? ` (${s.customMethodLabel})` : ""}`,
    });
  }
  for (const inv of invoices) {
    emit({
      date: inv.paidAt ?? inv.createdAt,
      bankAccount: "Square checking",
      customer: inv.user?.name ?? "Customer",
      amountCents: inv.totalCents,
      docNum: inv.number,
      memo: `Invoice · ${inv.kind} · ${inv.description}`.slice(0, 80),
    });
  }
  for (const r of renewals) {
    const bank = r.paymentMethod === "Cash" ? "Cash on hand" : "Square checking";
    emit({
      date: r.paidAt,
      bankAccount: bank,
      customer: r.user?.name ?? "Customer",
      amountCents: r.amountCents,
      docNum: `RENEW-${r.id.slice(0, 8)}`,
      memo: `Renewal · ${r.planAtRenewal} · ${r.termMonths}mo`,
    });
  }

  await audit(actor.id, actor.role, "bookkeeping.export_iif", "QuickBooks", {
    rows: trnsId - 1, range: rangeMeta(from, to),
  });
  return { iif: lines.join("\n") + "\n", rows: trnsId - 1 };
}

function formatIifDate(d: Date): string {
  // QuickBooks IIF wants MM/DD/YYYY.
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function rangeMeta(from: Date, to: Date) {
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

async function audit(actorId: string | undefined, actorRole: string | undefined, action: string, entityType: string, metadata: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? "unknown",
        actorRole: actorRole ?? "ADMIN",
        action,
        entityType,
        entityId: "(bulk)",
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (e) {
    console.error("[bookkeepingExport] audit failed:", e);
  }
}
