"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import {
  computeInvoiceTotals,
  generateInvoiceNumber,
  type InvoiceMeta,
} from "@/lib/invoice-builder";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// ─── Create a custom invoice ────────────────────────────────────────────
//
// Caller supplies the line-items + tax + discount + recipient meta. We
// compute the totals here (don't trust client) and persist as a Draft.
// `userId` is the customer the invoice is associated with — defaults to
// admin's own user id when admin is preparing an invoice for a non-member
// (the row still needs an owner since `Invoice.userId` is required).
export async function createCustomInvoice(input: {
  /** Member to attach the invoice to. If omitted → admin's user id. */
  userId?: string;
  /** Free-form one-line memo (used in lists / kind column). */
  description: string;
  /** Optional `kind` tag for filtering — defaults to "Custom". */
  kind?: string;
  /** Due date (ISO). Optional. */
  dueAt?: string;
  /** Builder meta — line items, tax, discount, recipient. */
  meta: InvoiceMeta;
}): Promise<{ success: true; invoiceId: string; number: string; total: number } | { error: string }> {
  const adminUser = await verifyAdmin();

  if (!Array.isArray(input.meta.lines) || input.meta.lines.length === 0) {
    return { error: "Add at least one line item." };
  }
  for (const l of input.meta.lines) {
    if (!l.description?.trim()) return { error: "Every line needs a description." };
    if (!Number.isFinite(l.qty) || l.qty <= 0) return { error: "Line quantities must be positive." };
    if (!Number.isFinite(l.unitPriceCents) || l.unitPriceCents < 0) {
      return { error: "Line prices must be ≥ 0." };
    }
  }

  const ownerId = input.userId ?? adminUser.id;
  const totals = computeInvoiceTotals(input.meta);

  // Mint number after row exists so we can use the row id.
  const placeholderNumber = "INV-DRAFT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const row = await prisma.invoice.create({
    data: {
      userId: ownerId,
      number: placeholderNumber,
      kind: input.kind ?? "Custom",
      description: input.description.trim() || "Custom invoice",
      amountCents: totals.subtotalVisible - totals.discount,
      taxCents: totals.tax,
      totalCents: totals.total,
      status: "Draft",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      meta: JSON.stringify(input.meta),
    },
  });
  const number = generateInvoiceNumber(row.id);
  await prisma.invoice.update({ where: { id: row.id }, data: { number } });

  revalidatePath("/admin");
  return { success: true, invoiceId: row.id, number, total: totals.total };
}

// ─── Update a draft invoice ──────────────────────────────────────────────
export async function updateCustomInvoice(input: {
  invoiceId: string;
  description?: string;
  meta: InvoiceMeta;
}): Promise<{ success: true; total: number } | { error: string }> {
  await verifyAdmin();
  const existing = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!existing) return { error: "Invoice not found" };
  if (existing.status === "Paid" || existing.status === "Void") {
    return { error: "Can't edit a " + existing.status.toLowerCase() + " invoice." };
  }

  const totals = computeInvoiceTotals(input.meta);
  await prisma.invoice.update({
    where: { id: input.invoiceId },
    data: {
      description: input.description?.trim() || existing.description,
      amountCents: totals.subtotalVisible - totals.discount,
      taxCents: totals.tax,
      totalCents: totals.total,
      meta: JSON.stringify(input.meta),
    },
  });
  revalidatePath("/admin");
  return { success: true, total: totals.total };
}

// ─── Email the invoice to the recipient ─────────────────────────────────
export async function sendInvoiceByEmail(input: {
  invoiceId: string;
  /** If omitted, use meta.recipientEmail; if also missing, the linked user's email. */
  overrideEmail?: string;
}): Promise<{ success: true; emailLogId: string } | { error: string }> {
  await verifyAdmin();
  const inv = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!inv) return { error: "Invoice not found" };
  if (!inv.meta) return { error: "Invoice has no line items — open the builder and re-save." };

  const meta = JSON.parse(inv.meta) as InvoiceMeta;
  const to = input.overrideEmail || meta.recipientEmail || inv.user?.email;
  if (!to) return { error: "No recipient email — add one in the builder." };

  const recipientName = meta.recipientName || inv.user?.name || "Customer";
  const html = renderInvoiceHtml(inv, meta, recipientName);
  const subject = `Invoice ${inv.number} from NOHO Mailbox · $${(inv.totalCents / 100).toFixed(2)}`;

  const r = await sendEmail({
    to,
    subject,
    html,
    kind: "invoice",
    userId: inv.userId,
  });

  if (r.status === "sent" || r.status === "queued") {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: inv.status === "Draft" ? "Sent" : inv.status, sentAt: new Date() },
    });
  }
  revalidatePath("/admin");
  return { success: true, emailLogId: r.logId };
}

// ─── Record a manual payment ────────────────────────────────────────────
export async function recordInvoicePayment(input: {
  invoiceId: string;
  paidVia: "Cash" | "Square" | "Zelle" | "Check" | "Wire" | "Other";
  paidRef?: string;
  /** Optional override — defaults to invoice total. Use for partial payments
   *  by recording multiple times (we only track latest paidVia/Ref though). */
  amountCents?: number;
}): Promise<{ success: true } | { error: string }> {
  await verifyAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "Paid") return { error: "Already marked Paid." };
  if (inv.status === "Void") return { error: "Invoice is voided." };

  const meta = inv.meta ? (JSON.parse(inv.meta) as InvoiceMeta) : ({ lines: [] } as InvoiceMeta);
  meta.paidVia = input.paidVia;
  meta.paidRef = input.paidRef?.trim() || undefined;

  await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      status: "Paid",
      paidAt: new Date(),
      meta: JSON.stringify(meta),
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

// ─── Void an invoice ────────────────────────────────────────────────────
export async function voidInvoice(invoiceId: string): Promise<{ success: true } | { error: string }> {
  await verifyAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "Paid") return { error: "Can't void a paid invoice — issue a refund instead." };
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "Void" },
  });
  revalidatePath("/admin");
  return { success: true };
}

// ─── List recent custom invoices for the admin builder UI ───────────────
export async function listRecentCustomInvoices(limit = 20) {
  await verifyAdmin();
  const rows = await prisma.invoice.findMany({
    where: { kind: { in: ["Custom", "Membership", "Forward", "Scan", "Delivery", "Notary"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    kind: r.kind,
    description: r.description,
    totalCents: r.totalCents,
    status: r.status,
    sentAt: r.sentAt?.toISOString() ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    dueAt: r.dueAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    customerName: r.user?.name ?? null,
    customerEmail: r.user?.email ?? null,
    meta: r.meta,
  }));
}

// ─── Render HTML (also used by the print page) ──────────────────────────
//
// Email-friendly inline-CSS layout. Hidden lines are filtered out.
function renderInvoiceHtml(
  inv: { id: string; number: string; description: string; createdAt: Date; dueAt: Date | null; status: string; totalCents: number },
  meta: InvoiceMeta,
  recipientName: string,
): string {
  const totals = computeInvoiceTotals(meta);
  const visible = (meta.lines ?? []).filter((l) => !l.hidden);
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const linesHtml = visible
    .map((l) => {
      const lineGross = Math.round(l.qty * l.unitPriceCents);
      const lineNet = lineGross - (l.discountCents ?? 0);
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E8DDD0;font-size:13px;color:#2D100F;">
            ${escapeHtml(l.description)}
            ${l.discountCents
              ? `<div style="font-size:11px;color:#A89484;margin-top:2px;">Discount: −${fmt(l.discountCents)}</div>`
              : ""}
            ${l.taxable === false
              ? `<div style="font-size:11px;color:#A89484;margin-top:2px;">Tax-exempt</div>`
              : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #E8DDD0;font-size:13px;color:#5C4540;text-align:center;width:60px;">${l.qty}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E8DDD0;font-size:13px;color:#5C4540;text-align:right;width:80px;">${fmt(l.unitPriceCents)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E8DDD0;font-size:13px;color:#2D100F;text-align:right;font-weight:700;width:90px;">${fmt(lineNet)}</td>
        </tr>`;
    })
    .join("");

  const status = inv.status.toUpperCase();
  const statusBg =
    status === "PAID" ? "#DCFCE7" : status === "VOID" ? "#FEE2E2" : "#FEF3C7";
  const statusFg = status === "PAID" ? "#166534" : status === "VOID" ? "#7F1D1D" : "#7C2D12";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2D100F;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
<tr><td align="center"><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
<tr><td style="background:#F7E6C2;padding:28px 32px;border-radius:24px 24px 0 0;border:1px solid #E8DDD0;border-bottom:none;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="vertical-align:top;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#337485;">Invoice</p>
        <h1 style="margin:6px 0 0;font-size:26px;font-weight:900;color:#2D100F;">${escapeHtml(inv.number)}</h1>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:0.10em;background:${statusBg};color:${statusFg};">${status}</span>
        <p style="margin:8px 0 0;font-size:12px;color:#5C4540;">Issued ${fmtDate(inv.createdAt)}${inv.dueAt ? `<br/>Due ${fmtDate(inv.dueAt)}` : ""}</p>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:28px 32px;border-left:1px solid #E8DDD0;border-right:1px solid #E8DDD0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;width:50%;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#A89484;">From</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:#2D100F;line-height:1.5;">
          NOHO Mailbox<br/>5062 Lankershim Blvd<br/>North Hollywood, CA 91601<br/>(818) 506-7744
        </p>
      </td>
      <td style="vertical-align:top;width:50%;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#A89484;">Bill to</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:#2D100F;line-height:1.5;">
          ${escapeHtml(recipientName)}${meta.recipientEmail ? "<br/>" + escapeHtml(meta.recipientEmail) : ""}
          ${meta.billTo ? "<br/>" + escapeHtml(meta.billTo).replace(/\n/g, "<br/>") : ""}
        </p>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 12px;font-size:14px;color:#5C4540;">${escapeHtml(inv.description)}</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
    <tr>
      <th align="left"   style="padding:8px 0;border-bottom:2px solid #2D100F;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#2D100F;">Description</th>
      <th align="center" style="padding:8px 0;border-bottom:2px solid #2D100F;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#2D100F;width:60px;">Qty</th>
      <th align="right"  style="padding:8px 0;border-bottom:2px solid #2D100F;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#2D100F;width:80px;">Unit</th>
      <th align="right"  style="padding:8px 0;border-bottom:2px solid #2D100F;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#2D100F;width:90px;">Total</th>
    </tr>
    ${linesHtml || `<tr><td colspan="4" style="padding:24px 0;text-align:center;color:#A89484;font-size:13px;">No line items.</td></tr>`}
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td></td><td style="padding-top:14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:4px 12px;font-size:13px;color:#5C4540;text-align:right;">Subtotal</td>
        <td style="padding:4px 0;font-size:13px;color:#2D100F;text-align:right;width:90px;">${fmt(totals.subtotalVisible)}</td>
      </tr>
      ${totals.discount > 0 ? `<tr>
        <td style="padding:4px 12px;font-size:13px;color:#5C4540;text-align:right;">Discount</td>
        <td style="padding:4px 0;font-size:13px;color:#7F1D1D;text-align:right;">−${fmt(totals.discount)}</td>
      </tr>` : ""}
      ${totals.tax > 0 ? `<tr>
        <td style="padding:4px 12px;font-size:13px;color:#5C4540;text-align:right;">Tax${meta.taxRate ? ` (${(meta.taxRate * 100).toFixed(meta.taxRate * 100 % 1 === 0 ? 0 : 2)}%)` : ""}</td>
        <td style="padding:4px 0;font-size:13px;color:#2D100F;text-align:right;">${fmt(totals.tax)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 12px 0;font-size:14px;font-weight:900;color:#2D100F;text-align:right;border-top:1px solid #E8DDD0;">Total</td>
        <td style="padding:8px 0 0;font-size:18px;font-weight:900;color:#2D100F;text-align:right;border-top:1px solid #E8DDD0;">${fmt(totals.total)}</td>
      </tr>
    </table></td></tr>
  </table>

  ${meta.notes ? `<div style="margin-top:18px;padding:12px 14px;background:#F8F2EA;border:1px solid #E8DDD0;border-radius:12px;font-size:12px;color:#5C4540;">${escapeHtml(meta.notes).replace(/\n/g, "<br/>")}</div>` : ""}

  ${meta.paidVia ? `<div style="margin-top:14px;padding:10px 14px;background:#DCFCE7;border:1px solid rgba(34,197,94,0.30);border-radius:10px;font-size:12px;color:#166534;">
    <strong>Paid via ${escapeHtml(meta.paidVia)}${meta.paidRef ? " · " + escapeHtml(meta.paidRef) : ""}</strong>
  </div>` : ""}

  <p style="margin:18px 0 0;font-size:11px;color:#A89484;">
    View this invoice online: <a href="${BASE_URL}/admin/invoice/${inv.id}" style="color:#337485;">${BASE_URL}/admin/invoice/${inv.id}</a>
  </p>
</td></tr>
<tr><td style="background:#F7E6C2;padding:14px 32px;border-radius:0 0 24px 24px;border:1px solid #E8DDD0;border-top:none;text-align:center;">
  <p style="margin:0;font-size:12px;color:#5C4540;">NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601</p>
  <p style="margin:6px 0 0;font-size:12px;color:#5C4540;">
    <a href="tel:+18185067744" style="color:#337485;font-weight:700;text-decoration:none;">(818) 506-7744</a> ·
    <a href="mailto:nohomailbox@gmail.com" style="color:#337485;font-weight:700;text-decoration:none;">nohomailbox@gmail.com</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
