/**
 * Invoice Builder — types + math helpers shared between the admin builder
 * UI, the server actions that persist drafts, and the printable receipt
 * page. Lives outside any "use server" file so the client editor can
 * import the types directly.
 */

export type InvoiceLine = {
  /** Stable row id used by React keys + the hide toggle. */
  id: string;
  /** What the customer sees on the receipt. */
  description: string;
  /** Quantity — supports decimals (e.g. 0.5 hours, 2.5 lbs). */
  qty: number;
  /** Unit price in cents, before tax + line discount. */
  unitPriceCents: number;
  /** Per-line discount in cents (subtracted before tax). */
  discountCents?: number;
  /** Hidden lines exist on the internal record but are NOT printed on the
   *  customer-facing invoice. Useful for cost notes, internal comments, or
   *  itemising things you don't want the customer to see broken out. */
  hidden?: boolean;
  /** Optional tax flag — if false, this line is excluded from the tax base. */
  taxable?: boolean;
  /** Square catalog id when the line was rung up from a synced item. */
  squareCatalogId?: string;
};

export type InvoiceMeta = {
  /** Recipient — overrides the linked User's email if set. */
  recipientName?: string;
  recipientEmail?: string;
  /** Optional billing address printed on the receipt. */
  billTo?: string;
  /** Free-form note printed below the line items (e.g. "Thank you!"). */
  notes?: string;
  /** Default 0 — global tax rate as a decimal (0.0975 for 9.75%). */
  taxRate?: number;
  /** Subtotal-level discount in cents (applied AFTER line discounts but
   *  BEFORE tax). UI lets admins enter either a flat $ or a percentage —
   *  we always store the resolved cents. */
  invoiceDiscountCents?: number;
  /** When status flips to Paid, where did the money come from? */
  paidVia?: "Cash" | "Square" | "Zelle" | "Check" | "Wire" | "Other";
  /** Free-form note about the payment (e.g. "Square txn 12345" or last 4). */
  paidRef?: string;
  /** Lines as they were captured at draft time (rendered in print + email). */
  lines: InvoiceLine[];
};

// ─── Math helpers ─────────────────────────────────────────────────────

/**
 * Compute totals from the meta. All values in cents (integer-safe).
 *   subtotalVisible — sum of visible lines (qty × unit − line discount)
 *   subtotalHidden  — sum of hidden lines (informational only)
 *   discount        — invoiceDiscountCents
 *   taxBase         — subtotalVisible − discount on taxable lines only
 *   tax             — taxBase × taxRate (rounded half-up)
 *   total           — subtotalVisible − discount + tax
 */
export function computeInvoiceTotals(meta: InvoiceMeta): {
  subtotalVisible: number;
  subtotalHidden: number;
  taxableBase: number;
  discount: number;
  tax: number;
  total: number;
} {
  let subtotalVisible = 0;
  let subtotalHidden = 0;
  let taxableSubtotal = 0;
  for (const l of meta.lines ?? []) {
    const lineGross = Math.max(0, Math.round(l.qty * l.unitPriceCents));
    const lineNet = Math.max(0, lineGross - (l.discountCents ?? 0));
    if (l.hidden) {
      subtotalHidden += lineNet;
    } else {
      subtotalVisible += lineNet;
      // Default lines to taxable; admin can opt out per line.
      if (l.taxable !== false) taxableSubtotal += lineNet;
    }
  }
  const discount = Math.max(0, Math.min(meta.invoiceDiscountCents ?? 0, subtotalVisible));
  // Apply discount proportionally to the taxable base so a 10% discount
  // reduces tax by 10% as well.
  const taxableAfterDiscount =
    subtotalVisible > 0
      ? Math.round((taxableSubtotal * (subtotalVisible - discount)) / subtotalVisible)
      : 0;
  const rate = meta.taxRate ?? 0;
  const tax = Math.max(0, Math.round(taxableAfterDiscount * rate));
  const total = subtotalVisible - discount + tax;
  return {
    subtotalVisible,
    subtotalHidden,
    taxableBase: taxableAfterDiscount,
    discount,
    tax,
    total,
  };
}

/** Default tax rate — California / LA city sales tax (9.5%). Admin can
 *  override per-invoice. */
export const DEFAULT_TAX_RATE = 0.095;

/** Generate a human-friendly invoice number — INV-YYMMDD-####. The 4-digit
 *  suffix is the last 4 of the row id so we don't have to query a sequence. */
export function generateInvoiceNumber(rowId: string, when: Date = new Date()): string {
  const yy = String(when.getFullYear()).slice(-2);
  const mm = String(when.getMonth() + 1).padStart(2, "0");
  const dd = String(when.getDate()).padStart(2, "0");
  const tail = rowId.slice(-4).toUpperCase();
  return `INV-${yy}${mm}${dd}-${tail}`;
}

export function emptyMeta(): InvoiceMeta {
  return {
    lines: [],
    taxRate: DEFAULT_TAX_RATE,
    invoiceDiscountCents: 0,
  };
}

export function newLine(): InvoiceLine {
  return {
    id: "ln_" + Math.random().toString(36).slice(2, 10),
    description: "",
    qty: 1,
    unitPriceCents: 0,
    taxable: true,
  };
}
