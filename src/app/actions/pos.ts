"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getPricingConfig } from "@/app/actions/pricing";
import {
  ZELLE_RECIPIENT_EMAIL,
  type POSCartLine,
  type POSPaymentMethod,
  type POSCatalogEntry,
  type POSSaleRow,
  type ZReportData,
  type MailboxWallCell,
  type MailboxWallData,
  type TickerEvent,
  type POSSaleDetailed,
  type UpcomingRenewalDay,
} from "@/lib/pos";

// ─── Catalog ─────────────────────────────────────────────────────────────
//
// The POS pulls quick-tap items from three sources:
//   1. Live `pricing_v2` plans (Basic / Business / Premium × 3/6/14mo terms)
//   2. A static services + supplies set (notary, scan, key, supplies)
//   3. A "Custom" line for one-off charges
//
// Returned in a flat list with SKU prefixes so the UI can group.
export async function getPOSCatalog(): Promise<POSCatalogEntry[]> {
  await verifyAdmin();

  const pricing = await getPricingConfig();
  const out: POSCatalogEntry[] = [];

  // Plans × terms
  for (const plan of pricing.plans) {
    out.push({
      sku: `plan:${plan.id}:3`,
      name: `${plan.name} · 3 mo`,
      category: "Mailbox",
      priceCents: Math.round(plan.prices.term3 * 100),
      hint: "3-month renewal",
    });
    out.push({
      sku: `plan:${plan.id}:6`,
      name: `${plan.name} · 6 mo`,
      category: "Mailbox",
      priceCents: Math.round(plan.prices.term6 * 100),
      hint: "6-month renewal",
    });
    out.push({
      sku: `plan:${plan.id}:14`,
      name: `${plan.name} · 14 mo`,
      category: "Mailbox",
      priceCents: Math.round(plan.prices.term14 * 100),
      hint: "14-month renewal",
    });
  }

  // Services
  out.push(
    { sku: "svc:notary",    name: "Notary signature",    category: "Service",  priceCents: 1500, hint: "$15 / signature" },
    { sku: "svc:scan",      name: "Mail scan (per page)", category: "Service",  priceCents: 200,  hint: "$2 / page" },
    { sku: "svc:fwd-fee",   name: "Forwarding fee",       category: "Service",  priceCents: 500,  hint: "+ postage" },
    { sku: "svc:shred",     name: "Shred (per lb)",       category: "Service",  priceCents: 100,  hint: "$1 / lb" },
    { sku: "svc:fax",       name: "Fax (per page)",       category: "Service",  priceCents: 200,  hint: "$2 / page" },
    { sku: "svc:print",     name: "Print (per page)",     category: "Service",  priceCents: 50,   hint: "$0.50 / page" },
    { sku: "svc:copy",      name: "Copy (per page)",      category: "Service",  priceCents: 35,   hint: "$0.35 / page" },
    { sku: "svc:photo",     name: "Passport photo",       category: "Service",  priceCents: 1500, hint: "$15 set of 2" },
    { sku: "svc:delivery",  name: "Same-day delivery",    category: "Service",  priceCents: 500,  hint: "$5 NoHo zone" },
  );

  // Supplies
  out.push(
    { sku: "sup:bub-sm", name: "Bubble mailer · small",  category: "Supplies", priceCents: 150, hint: '6×9"' },
    { sku: "sup:bub-md", name: "Bubble mailer · medium", category: "Supplies", priceCents: 225, hint: '10×13"' },
    { sku: "sup:bub-lg", name: "Bubble mailer · large",  category: "Supplies", priceCents: 325, hint: '14×17"' },
    { sku: "sup:box-sm", name: "Box · small",            category: "Supplies", priceCents: 200, hint: '6×6×6"' },
    { sku: "sup:box-md", name: "Box · medium",           category: "Supplies", priceCents: 350, hint: '12×12×12"' },
    { sku: "sup:box-lg", name: "Box · large",            category: "Supplies", priceCents: 500, hint: '18×18×18"' },
    { sku: "sup:tape",   name: "Packing tape roll",      category: "Supplies", priceCents: 400, hint: '2"×55yd' },
    { sku: "sup:labels", name: "Address labels (20pk)",  category: "Supplies", priceCents: 300, hint: "self-adhesive" },
    { sku: "sup:env-pl", name: "Padded envelope",        category: "Supplies", priceCents: 100, hint: "kraft" },
    { sku: "sup:stamp",  name: "Stamps · forever",       category: "Supplies", priceCents: 73,  hint: "USPS" },
  );

  // Mailbox fees
  out.push(
    { sku: "fee:deposit",   name: "Security deposit",       category: "Fees", priceCents: 5000,  hint: "refundable" },
    { sku: "fee:key",       name: "Mailbox key",            category: "Fees", priceCents: 1500,  hint: "new key" },
    { sku: "fee:lostkey",   name: "Lost key replacement",   category: "Fees", priceCents: 2500,  hint: "$25 fee" },
    { sku: "fee:setup",     name: "Setup fee",              category: "Fees", priceCents: 2500,  hint: "one-time" },
    { sku: "fee:business",  name: "Business solutions pkg", category: "Fees", priceCents: 200000, hint: "$2,000 LLC launch" },
  );

  return out;
}

// ─── Customer search (used by POS attach-customer) ───────────────────────

export async function searchPOSCustomers(query: string): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    suiteNumber: string | null;
    walletBalanceCents: number;
    plan: string | null;
    planTerm: string | null;
    planDueDate: string | null;
    mailboxStatus: string | null;
    businessName: string | null;
    boxType: string | null;
  }>
> {
  await verifyAdmin();
  const q = query.trim();
  if (q.length < 2) return [];

  const digits = q.replace(/\D/g, "");
  const customers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { suiteNumber: { contains: q } },
        { businessName: { contains: q } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } as { contains: string } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      suiteNumber: true,
      walletBalanceCents: true,
      plan: true,
      planTerm: true,
      planDueDate: true,
      mailboxStatus: true,
      businessName: true,
      boxType: true,
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return customers;
}

// ─── Customer detail by id (refresh after wallet credit / etc) ───────────
export async function getPOSCustomer(id: string) {
  await verifyAdmin();
  const c = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      suiteNumber: true,
      walletBalanceCents: true,
      plan: true,
      planTerm: true,
      planDueDate: true,
      mailboxStatus: true,
      businessName: true,
      boxType: true,
    },
  });
  return c;
}

// ─── Receipt # generator ─────────────────────────────────────────────────

async function nextReceiptNumber(): Promise<number> {
  // Smallest counter that survives concurrent rings — sub-query the max + 1.
  // Concurrent two-cashier collision is rejected by the unique index; caller
  // retries.
  const max = await (prisma as any).pOSSale.aggregate({ _max: { number: true } });
  const cur = max?._max?.number ?? 1000;
  return cur + 1;
}

// ─── createSale ───────────────────────────────────────────────────────────

// Local-only type — exporting a non-async name from a "use server" file
// causes Next.js 16 to drop ALL exports from the module ("no exports at all").
// Type stays internal; create-sale callers infer parameter shape from createSale().
type CreateSaleInput = {
  cart: POSCartLine[];
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerSuite?: string | null;
  discountCents?: number;
  taxCents?: number;
  tipCents?: number;
  paymentMethod: POSPaymentMethod;
  customMethodLabel?: string | null;
  paymentRef?: string | null;
  cashTenderedCents?: number | null;
  notes?: string | null;
  cashierLabel?: string | null; // nickname override; falls back to admin.name
};

export async function createSale(input: CreateSaleInput): Promise<
  | { success: true; saleId: string; saleNumber: number; changeDueCents: number }
  | { error: string }
> {
  const admin = await verifyAdmin();

  if (!input.cart || input.cart.length === 0) {
    return { error: "Cart is empty." };
  }
  if (!input.paymentMethod) return { error: "Payment method required." };

  // Snap customer
  let customer: { id: string; name: string; email: string; phone: string | null; suiteNumber: string | null } | null = null;
  if (input.customerId) {
    customer = await prisma.user.findUnique({
      where: { id: input.customerId },
      select: { id: true, name: true, email: true, phone: true, suiteNumber: true },
    });
    if (!customer) return { error: "Customer not found." };
  }

  // Compute totals
  let subtotalCents = 0;
  const lines = input.cart.map((line) => {
    const lineDiscount = line.discountCents ?? 0;
    const lineTotal = line.unitPriceCents * line.quantity - lineDiscount;
    subtotalCents += lineTotal;
    return {
      sku: line.sku ?? null,
      name: line.name,
      category: line.category ?? null,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      discountCents: lineDiscount,
      taxCents: 0,
      totalCents: lineTotal,
      notes: line.notes ?? null,
    };
  });

  const discountCents = input.discountCents ?? 0;
  const taxCents = input.taxCents ?? 0;
  const tipCents = input.tipCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents + tipCents);

  // Cash tender + change
  let cashTenderedCents: number | null = null;
  let cashChangeCents: number | null = null;
  if (input.paymentMethod === "Cash") {
    cashTenderedCents = input.cashTenderedCents ?? totalCents;
    if (cashTenderedCents < totalCents) {
      return { error: `Cash short — tendered $${(cashTenderedCents / 100).toFixed(2)} but total is $${(totalCents / 100).toFixed(2)}.` };
    }
    cashChangeCents = cashTenderedCents - totalCents;
  }

  // Custom method requires a label
  if (input.paymentMethod === "Custom" && !input.customMethodLabel?.trim()) {
    return { error: "Custom payment method needs a label (e.g. Venmo, Check #1042)." };
  }

  // Wallet method debits — confirm balance suffices
  if (input.paymentMethod === "Wallet") {
    if (!customer) return { error: "Wallet payment requires an attached customer." };
    const fresh = await prisma.user.findUnique({
      where: { id: customer.id },
      select: { walletBalanceCents: true },
    });
    if (!fresh) return { error: "Customer not found." };
    if (fresh.walletBalanceCents < totalCents) {
      return { error: `Wallet has $${(fresh.walletBalanceCents / 100).toFixed(2)} but sale is $${(totalCents / 100).toFixed(2)}.` };
    }
  }

  // Receipt # — retry on unique-collision
  let saleNumber = 0;
  let saleId = "";
  let attempt = 0;
  while (attempt < 5) {
    attempt += 1;
    const candidateNumber = await nextReceiptNumber();
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Wallet debit (atomic, conditional)
        if (input.paymentMethod === "Wallet" && customer) {
          const u = await tx.user.updateMany({
            where: { id: customer.id, walletBalanceCents: { gte: totalCents } },
            data: { walletBalanceCents: { decrement: totalCents } },
          });
          if (u.count === 0) throw new Error("Wallet balance changed — please retry.");
          await (tx as any).walletTransaction.create({
            data: {
              id: crypto.randomUUID(),
              userId: customer.id,
              kind: "Charge",
              amountCents: -totalCents,
              note: `POS sale #${candidateNumber}`,
            },
          });
        }

        const sale = await (tx as any).pOSSale.create({
          data: {
            number: candidateNumber,
            cashierId: admin.id ?? null,
            cashierName: input.cashierLabel?.trim() || admin.name || null,
            customerId: customer?.id ?? null,
            customerName: customer?.name ?? input.customerName ?? null,
            customerPhone: customer?.phone ?? input.customerPhone ?? null,
            customerEmail: customer?.email ?? input.customerEmail ?? null,
            customerSuite: customer?.suiteNumber ?? input.customerSuite ?? null,
            subtotalCents,
            discountCents,
            taxCents,
            tipCents,
            totalCents,
            cashTenderedCents,
            cashChangeCents,
            paymentMethod: input.paymentMethod,
            customMethodLabel: input.customMethodLabel ?? null,
            paymentRef: input.paymentRef ?? null,
            zelleEmail: input.paymentMethod === "Zelle" ? ZELLE_RECIPIENT_EMAIL : null,
            status: "Paid",
            paidAt: new Date(),
            notes: input.notes ?? null,
            items: {
              create: lines,
            },
          },
          select: { id: true, number: true },
        });

        // Audit log
        await (tx as any).auditLog.create({
          data: {
            id: crypto.randomUUID(),
            actorId: admin.id ?? null,
            actorName: admin.name ?? null,
            action: "pos.sale.create",
            entityType: "POSSale",
            entityId: sale.id,
            metadata: JSON.stringify({
              number: sale.number,
              total: totalCents,
              method: input.paymentMethod,
              customLabel: input.customMethodLabel ?? null,
              customerId: customer?.id ?? null,
              lines: lines.length,
            }),
          },
        });

        return sale;
      });
      saleNumber = created.number;
      saleId = created.id;
      break;
    } catch (e: any) {
      // Unique violation on number → retry; other errors throw.
      const msg = String(e?.message ?? "");
      if (/UNIQUE|number/i.test(msg) && attempt < 5) continue;
      return { error: msg || "Failed to record sale." };
    }
  }

  if (!saleId) return { error: "Could not assign a receipt number — try again." };

  revalidatePath("/admin");
  return {
    success: true,
    saleId,
    saleNumber,
    changeDueCents: cashChangeCents ?? 0,
  };
}

// ─── Recent sales feed ────────────────────────────────────────────────────

export async function getRecentSales(limit = 12): Promise<POSSaleRow[]> {
  await verifyAdmin();

  const sales = await (prisma as any).pOSSale.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  });

  return sales.map((s: any) => ({
    id: s.id,
    number: s.number,
    cashierName: s.cashierName,
    customerId: s.customerId,
    customerName: s.customerName,
    customerSuite: s.customerSuite,
    subtotalCents: s.subtotalCents,
    discountCents: s.discountCents,
    taxCents: s.taxCents,
    tipCents: s.tipCents,
    totalCents: s.totalCents,
    paymentMethod: s.paymentMethod,
    customMethodLabel: s.customMethodLabel,
    status: s.status,
    paidAt: s.paidAt,
    createdAt: s.createdAt,
    itemCount: s._count.items,
  }));
}

// ─── Today's till ─────────────────────────────────────────────────────────

export async function getTodaysTill(): Promise<{
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
}> {
  await verifyAdmin();

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const sales = await (prisma as any).pOSSale.findMany({
    where: { status: "Paid", paidAt: { gte: start } },
    select: {
      paymentMethod: true,
      totalCents: true,
      tipCents: true,
      paidAt: true,
      items: { select: { name: true, quantity: true, totalCents: true } },
    },
  });

  const out = {
    cashCents: 0,
    zelleCents: 0,
    squareCents: 0,
    cardCents: 0,
    walletCents: 0,
    customCents: 0,
    totalCents: 0,
    tipsCents: 0,
    count: sales.length,
    byHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, cents: 0, count: 0 })),
    topItems: [] as Array<{ name: string; quantity: number; cents: number }>,
  };
  const itemMap = new Map<string, { quantity: number; cents: number }>();
  for (const s of sales) {
    out.totalCents += s.totalCents;
    out.tipsCents += s.tipCents ?? 0;
    for (const it of (s.items ?? []) as Array<{ name: string; quantity: number; totalCents: number }>) {
      const key = it.name;
      const existing = itemMap.get(key) ?? { quantity: 0, cents: 0 };
      existing.quantity += it.quantity;
      existing.cents += it.totalCents;
      itemMap.set(key, existing);
    }
    if (s.paymentMethod === "Cash") out.cashCents += s.totalCents;
    else if (s.paymentMethod === "Zelle") out.zelleCents += s.totalCents;
    else if (s.paymentMethod === "Square") out.squareCents += s.totalCents;
    else if (s.paymentMethod === "CardOnFile") out.cardCents += s.totalCents;
    else if (s.paymentMethod === "Wallet") out.walletCents += s.totalCents;
    else if (s.paymentMethod === "Custom") out.customCents += s.totalCents;

    if (s.paidAt) {
      const h = new Date(s.paidAt).getHours();
      if (h >= 0 && h < 24) {
        out.byHour[h].cents += s.totalCents;
        out.byHour[h].count += 1;
      }
    }
  }
  out.topItems = Array.from(itemMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);
  return out;
}

// ─── Void a sale ──────────────────────────────────────────────────────────

export async function voidSale(input: { saleId: string; reason: string }): Promise<{ success: true } | { error: string }> {
  const admin = await verifyAdmin();
  if (!input.reason?.trim()) return { error: "Void reason required." };

  const sale = await (prisma as any).pOSSale.findUnique({
    where: { id: input.saleId },
    include: { items: true },
  });
  if (!sale) return { error: "Sale not found." };
  if (sale.status === "Voided") return { error: "Already voided." };

  await prisma.$transaction(async (tx) => {
    await (tx as any).pOSSale.update({
      where: { id: sale.id },
      data: { status: "Voided", voidedAt: new Date(), voidReason: input.reason },
    });
    // If wallet was debited, credit back
    if (sale.paymentMethod === "Wallet" && sale.customerId) {
      await tx.user.update({
        where: { id: sale.customerId },
        data: { walletBalanceCents: { increment: sale.totalCents } },
      });
      await (tx as any).walletTransaction.create({
        data: {
          id: crypto.randomUUID(),
          userId: sale.customerId,
          kind: "Refund",
          amountCents: sale.totalCents,
          note: `POS sale #${sale.number} voided — ${input.reason}`,
        },
      });
    }
    await (tx as any).auditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: admin.id ?? null,
        actorName: admin.name ?? null,
        action: "pos.sale.void",
        entityType: "POSSale",
        entityId: sale.id,
        metadata: JSON.stringify({ number: sale.number, reason: input.reason }),
      },
    });
  });

  revalidatePath("/admin");
  return { success: true };
}

// ─── Mark receipt printed/emailed/smsed ──────────────────────────────────

export async function markReceiptPrinted(saleId: string): Promise<{ success: true } | { error: string }> {
  await verifyAdmin();
  await (prisma as any).pOSSale.update({
    where: { id: saleId },
    data: { receiptPrintedAt: new Date() },
  });
  return { success: true };
}

// ─── Email a sale receipt to a recipient ─────────────────────────────────
// Uses the existing Resend pipeline (logs to EmailLog regardless of provider
// state). Caller passes the recipient email — defaults to the sale's snapshot.
export async function emailPOSReceipt(saleId: string, overrideEmail?: string): Promise<{ success: true; logId: string } | { error: string }> {
  await verifyAdmin();
  const sale = await (prisma as any).pOSSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return { error: "Sale not found." };
  const to = (overrideEmail ?? sale.customerEmail ?? "").trim();
  if (!to) return { error: "No email address on file." };

  // Lazy import so the pos.ts → email.ts cycle is clean.
  const { sendEmail } = await import("@/lib/email");

  const dollars = (sale.totalCents / 100).toFixed(2);
  const paidStr = (sale.paidAt ?? sale.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines = (sale.items as Array<any>).map((it) =>
    `<tr>
       <td style="padding:4px 0;color:#2D100F;">${escapeHtml(it.name)}<br><span style="color:#7A6050;font-size:11px;">${it.quantity} × $${(it.unitPriceCents/100).toFixed(2)}</span></td>
       <td style="padding:4px 0;text-align:right;font-weight:700;color:#2D100F;">$${(it.totalCents/100).toFixed(2)}</td>
     </tr>`,
  ).join("");

  const methodLabel = sale.paymentMethod === "Custom"
    ? `Custom · ${sale.customMethodLabel ?? "—"}`
    : sale.paymentMethod === "CardOnFile" ? "Card on File" : sale.paymentMethod;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#FFF9F3;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#2D100F;">
    <div style="max-width:520px;margin:0 auto;background:white;border:1px solid #E8DDD0;border-radius:14px;padding:24px;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.32em;text-transform:uppercase;color:#337485;">◆ NOHO Mailbox ◆</div>
        <div style="font-size:11px;color:#7A6050;margin-top:2px;">Receipt #${String(sale.number).padStart(5, "0")}</div>
      </div>
      <div style="text-align:center;margin:8px 0 18px;padding-bottom:12px;border-bottom:1.5px solid #2D100F;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#7A6050;">Total Paid</div>
        <div style="font-size:30px;font-weight:900;color:#2D100F;line-height:1;">$${dollars}</div>
        <div style="font-size:11px;color:#7A6050;margin-top:4px;">${paidStr} · ${methodLabel}${sale.paymentRef ? ` · ref ${escapeHtml(sale.paymentRef)}` : ""}</div>
      </div>
      ${sale.customerName ? `<p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#7A6050;">Customer</p>
      <p style="margin:0 0 12px;font-weight:700;font-size:14px;">${escapeHtml(sale.customerName)}${sale.customerSuite ? ` · Suite #${escapeHtml(sale.customerSuite)}` : ""}</p>` : ""}
      <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#7A6050;">Items</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">${lines}</table>
      <div style="margin-top:14px;padding-top:8px;border-top:1px dashed #cdc4b0;font-size:13px;">
        <div style="display:flex;justify-content:space-between;color:#7A6050;"><span>Subtotal</span><span>$${(sale.subtotalCents/100).toFixed(2)}</span></div>
        ${sale.discountCents > 0 ? `<div style="display:flex;justify-content:space-between;color:#7A6050;"><span>Discount</span><span>− $${(sale.discountCents/100).toFixed(2)}</span></div>` : ""}
        ${sale.taxCents > 0 ? `<div style="display:flex;justify-content:space-between;color:#7A6050;"><span>Tax</span><span>$${(sale.taxCents/100).toFixed(2)}</span></div>` : ""}
        ${sale.tipCents > 0 ? `<div style="display:flex;justify-content:space-between;color:#7A6050;"><span>Tip</span><span>$${(sale.tipCents/100).toFixed(2)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-weight:900;font-size:14px;color:#2D100F;border-top:1px solid #2D100F;margin-top:6px;padding-top:6px;"><span>Total</span><span>$${dollars}</span></div>
      </div>
      <p style="margin:18px 0 0;text-align:center;font-size:10px;color:#9aa5b8;">Thank you for choosing NOHO Mailbox<br>5062 Lankershim Blvd · NoHo CA 91601 · (818) 506-7744</p>
    </div></body></html>`;

  try {
    const r = await sendEmail({
      to,
      subject: `Receipt — NOHO Mailbox · #${String(sale.number).padStart(5, "0")} · $${dollars}`,
      html,
      kind: "receipt",
      userId: sale.customerId ?? null,
    });
    await (prisma as any).pOSSale.update({
      where: { id: saleId },
      data: { receiptEmailedAt: new Date() },
    });
    return { success: true, logId: r.logId };
  } catch (e: any) {
    return { error: e?.message ?? "Email send failed." };
  }
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ─── Mailbox wall — storefront occupancy grid (iter-13) ──────────────────
//
// Returns one entry per occupied suite + a derived list of vacant slots
// up to the highest assigned suite #. Used by AdminPOSPanel's mailbox-wall
// reference component — cashier sees exactly which doors are taken vs free.
export async function getMailboxWall(): Promise<MailboxWallData> {
  await verifyAdmin();

  const customers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      suiteNumber: { not: null },
    },
    select: {
      id: true,
      name: true,
      suiteNumber: true,
      plan: true,
      planDueDate: true,
      mailboxStatus: true,
    },
    take: 500,
    orderBy: { suiteNumber: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a map keyed by suite-as-int (when parseable) for densest grid
  const occupiedMap = new Map<number, MailboxWallCell>();
  let highest = 0;

  for (const c of customers) {
    if (!c.suiteNumber) continue;
    const num = parseInt(c.suiteNumber, 10);
    if (!Number.isFinite(num)) continue;
    if (num > highest) highest = num;

    let daysToRenew: number | null = null;
    if (c.planDueDate) {
      try {
        const [Y, M, D] = c.planDueDate.split("-").map(Number);
        const due = new Date(Y, M - 1, D);
        due.setHours(23, 59, 59, 999);
        daysToRenew = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
      } catch { /* ignore */ }
    }

    let status: MailboxWallCell["status"] = "active";
    if (c.mailboxStatus === "Suspended") status = "suspended";
    else if (c.mailboxStatus === "Held") status = "held";
    else if (daysToRenew != null) {
      if (daysToRenew < 0) status = "overdue";
      else if (daysToRenew <= 14) status = "due_soon";
      else status = "active";
    }

    const initials = c.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    occupiedMap.set(num, {
      suiteNumber: c.suiteNumber,
      status,
      customerId: c.id,
      customerName: c.name,
      initials,
      plan: c.plan ?? null,
      planDueDate: c.planDueDate ?? null,
      daysToRenew,
    });
  }

  // Cap the visible wall at a sensible upper bound — don't paint thousands
  // of empty cells if someone has a stray suite "9999". Round up to nearest 24.
  const ceiling = Math.max(48, Math.min(200, Math.ceil((highest + 6) / 24) * 24));

  const cells: MailboxWallCell[] = [];
  for (let i = 1; i <= ceiling; i++) {
    const occ = occupiedMap.get(i);
    if (occ) {
      cells.push(occ);
    } else {
      cells.push({
        suiteNumber: String(i),
        status: "vacant",
        customerId: null,
        customerName: null,
        initials: null,
        plan: null,
        planDueDate: null,
        daysToRenew: null,
      });
    }
  }

  let occupied = 0, vacant = 0, overdue = 0, dueSoon = 0;
  for (const c of cells) {
    if (c.status === "vacant") vacant += 1;
    else {
      occupied += 1;
      if (c.status === "overdue") overdue += 1;
      else if (c.status === "due_soon") dueSoon += 1;
    }
  }

  return { cells, highest, occupied, vacant, overdue, dueSoon };
}

// ─── SMS receipt — best-effort placeholder ───────────────────────────────
// Marks the sale as smsed and returns a copy-friendly text body that the
// admin can paste into their phone. (Twilio integration would slot in here.)
export async function smsPOSReceipt(saleId: string): Promise<{ success: true; phone: string; body: string } | { error: string }> {
  await verifyAdmin();
  const sale = await (prisma as any).pOSSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return { error: "Sale not found." };
  const phone = (sale.customerPhone ?? "").trim();
  if (!phone) return { error: "No phone number on file." };

  const dollars = (sale.totalCents / 100).toFixed(2);
  const itemSummary = (sale.items as Array<any>).slice(0, 3).map((it: any) => `${it.quantity}× ${it.name}`).join(", ");
  const more = (sale.items as Array<any>).length > 3 ? ` +${(sale.items as Array<any>).length - 3} more` : "";
  const body = `NOHO Mailbox · Receipt #${String(sale.number).padStart(5, "0")}\n${itemSummary}${more}\nTotal $${dollars} · ${sale.paymentMethod}\nThanks!`;

  await (prisma as any).pOSSale.update({
    where: { id: saleId },
    data: { receiptSmsedAt: new Date() },
  });
  return { success: true, phone, body };
}

// ─── Z-Report — end-of-day shift summary ─────────────────────────────────
//
// Builds a printable end-of-shift report from the day's POS sales.
// `dateYmd` optional in "YYYY-MM-DD" — defaults to today (local).
export async function getDailyZReport(dateYmd?: string): Promise<ZReportData> {
  await verifyAdmin();

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = dateYmd ?? `${yyyy}-${mm}-${dd}`;

  // Build local-day window [start, end)
  const [Y, M, D] = today.split("-").map(Number);
  const start = new Date(Y, M - 1, D, 0, 0, 0, 0);
  const end = new Date(Y, M - 1, D + 1, 0, 0, 0, 0);

  const sales = await (prisma as any).pOSSale.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const totals = {
    grossCents: 0,
    discountCents: 0,
    taxCents: 0,
    tipCents: 0,
    netCents: 0,
    voidedCents: 0,
    saleCount: 0,
    voidCount: 0,
  };
  const methodMap = new Map<string, { cents: number; count: number }>();
  const catMap = new Map<string, { cents: number; quantity: number }>();
  const itemMap = new Map<string, { quantity: number; cents: number }>();
  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, cents: 0, count: 0 }));
  const cashierMap = new Map<string, { cents: number; count: number }>();

  for (const s of sales as Array<any>) {
    if (s.status === "Voided") {
      totals.voidedCents += s.totalCents;
      totals.voidCount += 1;
      continue;
    }
    if (s.status !== "Paid") continue;

    totals.saleCount += 1;
    totals.grossCents += s.subtotalCents;
    totals.discountCents += s.discountCents;
    totals.taxCents += s.taxCents;
    totals.tipCents += s.tipCents;
    totals.netCents += s.totalCents;

    const m = methodMap.get(s.paymentMethod) ?? { cents: 0, count: 0 };
    m.cents += s.totalCents; m.count += 1;
    methodMap.set(s.paymentMethod, m);

    for (const it of s.items as Array<any>) {
      const cat = it.category ?? "Other";
      const c = catMap.get(cat) ?? { cents: 0, quantity: 0 };
      c.cents += it.totalCents; c.quantity += it.quantity;
      catMap.set(cat, c);

      const ik = itemMap.get(it.name) ?? { quantity: 0, cents: 0 };
      ik.quantity += it.quantity; ik.cents += it.totalCents;
      itemMap.set(it.name, ik);
    }

    const h = new Date(s.createdAt).getHours();
    hourBuckets[h].cents += s.totalCents;
    hourBuckets[h].count += 1;

    const cn = s.cashierName ?? "—";
    const cr = cashierMap.get(cn) ?? { cents: 0, count: 0 };
    cr.cents += s.totalCents; cr.count += 1;
    cashierMap.set(cn, cr);
  }

  return {
    dateYmd: today,
    generatedAtIso: new Date().toISOString(),
    totals,
    byMethod: Array.from(methodMap.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.cents - a.cents),
    byCategory: Array.from(catMap.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.cents - a.cents),
    topItems: Array.from(itemMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 6),
    byHour: hourBuckets,
    byCashier: Array.from(cashierMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cents - a.cents),
  };
}

// ─── Live activity ticker (iter-16) ──────────────────────────────────────
//
// Pulls a unified, time-ordered list of recent storefront events for the
// scrolling marquee at the top of the POS cabinet. Looks back ~6 hours; cap
// the merged list at 20 events.
export async function getPOSTickerEvents(): Promise<TickerEvent[]> {
  await verifyAdmin();

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours back
  const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  const [sales, mail, signups, walletTxns] = await Promise.all([
    (prisma as any).pOSSale.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.mailItem.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, suiteNumber: true } } },
    }),
    prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, suiteNumber: true, plan: true, createdAt: true },
    }),
    (prisma as any).walletTransaction.findMany({
      where: {
        createdAt: { gte: since },
        kind: { in: ["TopUp", "DepositCharge"] },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, suiteNumber: true } } },
    }),
  ]);

  const events: TickerEvent[] = [];

  for (const s of sales as Array<any>) {
    if (s.status === "Voided") {
      events.push({
        id: `void:${s.id}`,
        kind: "void",
        iconLetter: "✕",
        message: `Void #${String(s.number).padStart(5, "0")} · ${fmtCents(s.totalCents)}`,
        amountCents: s.totalCents,
        customerName: s.customerName,
        suiteNumber: s.customerSuite,
        atIso: (s.voidedAt ?? s.createdAt).toISOString(),
      });
    } else if (s.status === "Paid") {
      events.push({
        id: `sale:${s.id}`,
        kind: "sale",
        iconLetter: "✓",
        message: `Sale #${String(s.number).padStart(5, "0")} · ${fmtCents(s.totalCents)} · ${s.paymentMethod}`,
        amountCents: s.totalCents,
        customerName: s.customerName,
        suiteNumber: s.customerSuite,
        atIso: (s.paidAt ?? s.createdAt).toISOString(),
      });
    }
  }

  for (const m of mail as Array<any>) {
    events.push({
      id: `mail:${m.id}`,
      kind: "mail",
      iconLetter: "⚐",
      message: `Mail · ${m.user?.name ? `Suite #${m.user.suiteNumber ?? "?"}` : "unassigned"}${m.from ? ` · from ${m.from.slice(0, 22)}` : ""}`,
      customerName: m.user?.name ?? null,
      suiteNumber: m.user?.suiteNumber ?? null,
      atIso: m.createdAt.toISOString(),
    });
  }

  for (const u of signups) {
    events.push({
      id: `signup:${u.id}`,
      kind: "signup",
      iconLetter: "★",
      message: `Signup · ${u.name}${u.suiteNumber ? ` · #${u.suiteNumber}` : ""}${u.plan ? ` · ${u.plan}` : ""}`,
      customerName: u.name,
      suiteNumber: u.suiteNumber,
      atIso: u.createdAt.toISOString(),
    });
  }

  for (const t of walletTxns as Array<any>) {
    if (typeof t.amountCents !== "number" || t.amountCents <= 0) continue;
    events.push({
      id: `wallet:${t.id}`,
      kind: "wallet",
      iconLetter: "＄",
      message: `Wallet +${fmtCents(t.amountCents)}${t.user?.name ? ` · ${t.user.name}` : ""}`,
      amountCents: t.amountCents,
      customerName: t.user?.name ?? null,
      suiteNumber: t.user?.suiteNumber ?? null,
      atIso: t.createdAt.toISOString(),
    });
  }

  events.sort((a, b) => b.atIso.localeCompare(a.atIso));
  return events.slice(0, 20);
}

// ─── Customer visits — for loyalty punchcard (iter-19) ──────────────────
// Returns paid-sale dates (most recent first) for the given customer over
// the last 90 days, capped at 50.
export async function getCustomerVisits(userId: string): Promise<string[]> {
  await verifyAdmin();
  if (!userId) return [];
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sales = await (prisma as any).pOSSale.findMany({
    where: {
      customerId: userId,
      status: "Paid",
      paidAt: { gte: since },
    },
    orderBy: { paidAt: "desc" },
    take: 50,
    select: { paidAt: true },
  });
  return (sales as Array<{ paidAt: Date | null }>)
    .map((s) => (s.paidAt ?? null))
    .filter((d): d is Date => d != null)
    .map((d) => d.toISOString());
}

// ─── Returns modal — recent sales with full line items (iter-17) ─────────
//
// For the receipt-search interface in the Returns/Exchange modal. Returns
// sales (Paid + Voided) from the last 30 days, paginated to 20.
export async function getRecentSalesDetailed(query: string = ""): Promise<POSSaleDetailed[]> {
  await verifyAdmin();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const q = query.trim();
  const digits = q.replace(/\D/g, "");

  const where: any = { createdAt: { gte: since } };
  if (q.length >= 2) {
    const orClauses: any[] = [];
    // Receipt # — strip leading zeros and try parseInt
    const numQ = parseInt(q.replace(/^#?0*/, ""), 10);
    if (Number.isFinite(numQ)) orClauses.push({ number: numQ });
    orClauses.push({ customerName: { contains: q } });
    orClauses.push({ customerEmail: { contains: q } });
    orClauses.push({ customerSuite: { contains: q } });
    if (digits.length >= 3) orClauses.push({ customerPhone: { contains: digits } });
    where.OR = orClauses;
  }

  const sales = await (prisma as any).pOSSale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return (sales as Array<any>).map((s) => ({
    id: s.id,
    number: s.number,
    customerName: s.customerName,
    customerSuite: s.customerSuite,
    customerEmail: s.customerEmail,
    customerPhone: s.customerPhone,
    cashierName: s.cashierName,
    paymentMethod: s.paymentMethod,
    customMethodLabel: s.customMethodLabel,
    paymentRef: s.paymentRef,
    status: s.status,
    totalCents: s.totalCents,
    subtotalCents: s.subtotalCents,
    discountCents: s.discountCents,
    taxCents: s.taxCents,
    tipCents: s.tipCents,
    paidAt: s.paidAt ? s.paidAt.toISOString() : null,
    voidedAt: s.voidedAt ? s.voidedAt.toISOString() : null,
    voidReason: s.voidReason,
    createdAt: s.createdAt.toISOString(),
    items: (s.items as Array<any>).map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category,
      unitPriceCents: it.unitPriceCents,
      quantity: it.quantity,
      totalCents: it.totalCents,
    })),
  }));
}

// ─── Upcoming renewals strip (iter-23) ───────────────────────────────────
//
// Returns the next N days (default 14) including today, each with the count
// + customer list of mailboxes due to renew on that date. Past-due (planDueDate
// < today) get bucketed into the today cell as `isPast: true`.
export async function getUpcomingRenewals(days: number = 14): Promise<UpcomingRenewalDay[]> {
  await verifyAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the calendar window
  const window: UpcomingRenewalDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    window.push({
      date: `${yyyy}-${mm}-${dd}`,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayOfMonth: d.getDate(),
      count: 0,
      customers: [],
      isToday: i === 0,
      isPast: false,
    });
  }
  // Map for fast lookup by date
  const byDate = new Map(window.map((d) => [d.date, d]));

  // Fetch all members with planDueDate within the window OR in the past
  // (we'll bucket past into today's cell)
  const lastDate = window[window.length - 1].date;

  const customers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      planDueDate: { not: null, lte: lastDate },
    },
    select: {
      id: true,
      name: true,
      suiteNumber: true,
      plan: true,
      planTerm: true,
      planDueDate: true,
    },
    take: 500,
  });

  for (const c of customers) {
    if (!c.planDueDate) continue;
    const cell = byDate.get(c.planDueDate);
    if (cell) {
      cell.count += 1;
      cell.customers.push({
        id: c.id,
        name: c.name,
        suiteNumber: c.suiteNumber,
        plan: c.plan,
        planTerm: c.planTerm,
      });
      continue;
    }
    // Past-due: bucket into today's cell
    if (c.planDueDate < window[0].date) {
      const todayCell = window[0];
      todayCell.count += 1;
      todayCell.isPast = true;
      todayCell.customers.push({
        id: c.id,
        name: c.name,
        suiteNumber: c.suiteNumber,
        plan: c.plan,
        planTerm: c.planTerm,
      });
    }
  }

  // Cap each day's customer list to keep payload small (panel renders top names anyway)
  for (const cell of window) {
    cell.customers.sort((a, b) => a.name.localeCompare(b.name));
    if (cell.customers.length > 12) cell.customers = cell.customers.slice(0, 12);
  }

  return window;
}
