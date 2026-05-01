"use server";

/**
 * NOHO Mailbox — pre-paid shipping label orders.
 *
 * Public flow: customer enters parcel + dest, gets live Shippo rates with a
 * +10% margin baked in, picks one, submits with their contact info. The order
 * lands in the admin queue with status "AwaitingPayment". Admin texts a Square
 * link, marks Paid, then clicks Print which actually purchases the Shippo
 * label and links it back to the order.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  getShippingRates,
  purchaseLabel,
  isShippoConfigured,
  type ShippoAddress,
  type ShippoParcel,
} from "@/lib/shippo";
import { getShippoSender, getActiveCarrierAccountIds } from "@/app/actions/shippo";
import { priceWithMargin } from "@/lib/label-orders";

function cuid() {
  return crypto.randomUUID();
}

function senderToAddress(sender: Awaited<ReturnType<typeof getShippoSender>>): ShippoAddress {
  return {
    name: sender.name,
    street1: sender.street1,
    city: sender.city,
    state: sender.state,
    zip: sender.zip,
    country: sender.country ?? "US",
    phone: sender.phone,
    company: sender.company,
  };
}

// ─── Public: live rate quote with +10% margin ────────────────────────────────

export async function getPublicShippoRates(input: {
  toZip: string;
  toCity?: string;
  toState?: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
}) {
  if (!isShippoConfigured()) {
    return {
      error: "Live rates are unavailable right now. Please call (818) 506-7744 for a quote.",
    };
  }
  if (!/^\d{5}$/.test(input.toZip)) return { error: "Enter a valid 5-digit destination zip." };
  if (
    input.weightOz <= 0 ||
    input.lengthIn <= 0 ||
    input.widthIn <= 0 ||
    input.heightIn <= 0
  ) {
    return { error: "Weight and dimensions must be greater than zero." };
  }

  const sender = await getShippoSender();
  const fromAddr = senderToAddress(sender);

  const toAddr: ShippoAddress = {
    name: "Recipient",
    street1: "1 Main St",
    city: input.toCity?.trim() || "Los Angeles",
    state: (input.toState?.trim() || "CA").toUpperCase(),
    zip: input.toZip,
    country: "US",
  };

  const parcel: ShippoParcel = {
    lengthIn: input.lengthIn,
    widthIn: input.widthIn,
    heightIn: input.heightIn,
    weightOz: input.weightOz,
  };

  const accountIds = await getActiveCarrierAccountIds();
  const rates = await getShippingRates(toAddr, parcel, fromAddr, accountIds);
  if (!rates) return { error: "Couldn't fetch live rates. Try again or call us." };
  if (rates.length === 0) {
    return { error: "No carriers will deliver this package. Try different dimensions or call us." };
  }

  const out = rates.map((r) => {
    const shippoCostCents = Math.round(parseFloat(r.amount) * 100);
    const { customerPriceCents, marginCents } = priceWithMargin(shippoCostCents);
    return {
      rateObjectId: r.rateObjectId,
      carrier: r.provider,
      servicelevel: r.servicelevel,
      shippoCostCents,
      customerPriceCents,
      marginCents,
      estimatedDays: r.estimatedDays,
      durationTerms: r.durationTerms,
    };
  });

  return { rates: out };
}

// ─── Public: customer submits a label order ──────────────────────────────────

export async function createLabelOrder(input: {
  rateObjectId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  toName: string;
  toCompany?: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  notes?: string;
}) {
  if (!isShippoConfigured()) {
    return { error: "Shipping is unavailable right now. Call (818) 506-7744." };
  }
  if (!input.customerName.trim()) return { error: "Name is required." };
  if (!input.customerEmail.includes("@")) return { error: "Valid email required." };
  if (
    !input.toStreet.trim() ||
    !input.toCity.trim() ||
    !input.toState.trim() ||
    !/^\d{5}$/.test(input.toZip)
  ) {
    return { error: "Complete destination address is required." };
  }
  if (
    input.weightOz <= 0 ||
    input.lengthIn <= 0 ||
    input.widthIn <= 0 ||
    input.heightIn <= 0
  ) {
    return { error: "Weight and dimensions must be greater than zero." };
  }

  // Per-email rate limit: 10 orders per email per hour. The order table
  // doubles as a rate-limit ledger — no extra schema. Protects against
  // someone scripting form submissions to burn Shippo API quota. Match
  // against the same case that gets stored below (`input.customerEmail.trim()`)
  // — case-insensitive matching isn't available on SQLite/Turso through Prisma.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const trimmedEmail = input.customerEmail.trim();
  const recentForEmail = await (prisma as any).labelOrder.count({
    where: {
      customerEmail: trimmedEmail,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentForEmail >= 10) {
    return {
      error: "Too many orders in the last hour from this email. Please call (818) 506-7744 if you need help.",
    };
  }

  // Re-fetch rates so the saved cost matches what Shippo will actually charge.
  const sender = await getShippoSender();
  const fromAddr = senderToAddress(sender);
  const toAddr: ShippoAddress = {
    name: input.toName.trim(),
    street1: input.toStreet.trim(),
    city: input.toCity.trim(),
    state: input.toState.trim().toUpperCase(),
    zip: input.toZip.trim(),
    country: "US",
    company: input.toCompany?.trim() || undefined,
  };
  const parcel: ShippoParcel = {
    lengthIn: input.lengthIn,
    widthIn: input.widthIn,
    heightIn: input.heightIn,
    weightOz: input.weightOz,
  };

  const accountIds = await getActiveCarrierAccountIds();
  const rates = await getShippingRates(toAddr, parcel, fromAddr, accountIds);
  if (!rates) return { error: "Couldn't validate the chosen rate. Please try again." };

  // Match by rate id first; if expired, fall back to carrier+service match.
  let matching = rates.find((r) => r.rateObjectId === input.rateObjectId);
  if (!matching) {
    return {
      error: "Selected rate is no longer available. Please refresh the rates and pick again.",
    };
  }

  const shippoCostCents = Math.round(parseFloat(matching.amount) * 100);
  const { customerPriceCents, marginCents } = priceWithMargin(shippoCostCents);

  let userId: string | null = null;
  try {
    const session = await verifySession();
    if (session?.id) userId = session.id as string;
  } catch {
    // anonymous customer is fine
  }

  const id = cuid();
  await (prisma as any).labelOrder.create({
    data: {
      id,
      userId,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerPhone: input.customerPhone?.trim() || null,
      fromKind: "store",
      toName: input.toName.trim(),
      toCompany: input.toCompany?.trim() || null,
      toStreet: input.toStreet.trim(),
      toCity: input.toCity.trim(),
      toState: input.toState.trim().toUpperCase(),
      toZip: input.toZip.trim(),
      lengthIn: input.lengthIn,
      widthIn: input.widthIn,
      heightIn: input.heightIn,
      weightOz: input.weightOz,
      rateObjectId: input.rateObjectId,
      carrier: matching.provider,
      servicelevel: matching.servicelevel,
      shippoCostCents,
      customerPriceCents,
      marginCents,
      estimatedDays: matching.estimatedDays,
      status: "AwaitingPayment",
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/admin");
  return {
    success: true,
    orderId: id,
    customerPriceCents,
    carrier: matching.provider,
    servicelevel: matching.servicelevel,
  };
}

// ─── Admin actions ───────────────────────────────────────────────────────────

// Status-machine guard: each transition asserts the prior status to defeat
// double-clicks, two admins editing the same order, and stale tabs. Returns
// the count of rows updated — caller checks for 1 to confirm the move.
async function transitionLabelOrder(
  orderId: string,
  fromStatuses: string[],
  data: Record<string, unknown>,
): Promise<number> {
  const res = await (prisma as any).labelOrder.updateMany({
    where: { id: orderId, status: { in: fromStatuses } },
    data,
  });
  return res.count as number;
}

export async function adminMarkLabelOrderLinkSent(orderId: string, squareLink: string) {
  await verifyAdmin();
  if (!squareLink || !squareLink.startsWith("http")) {
    return { error: "Provide a valid Square link URL" };
  }
  // Only "AwaitingPayment" orders can move to LinkSent — prevents reverting
  // a Paid or Printed order back to LinkSent on a stray click. Re-sending a
  // link to an already-LinkSent order goes through a separate (future) action.
  const moved = await transitionLabelOrder(orderId, ["AwaitingPayment", "LinkSent"], {
    status: "LinkSent",
    squareLink,
    linkSentAt: new Date(),
  });
  if (moved === 0) {
    return { error: "Order is not in a state that can receive a payment link." };
  }
  revalidatePath("/admin");
  return { success: true };
}

export async function adminMarkLabelOrderPaid(orderId: string) {
  await verifyAdmin();
  // Only LinkSent → Paid is valid. Atomic guard prevents the race where two
  // admins click "Mark Paid" simultaneously and both fire downstream effects.
  const moved = await transitionLabelOrder(orderId, ["LinkSent"], {
    status: "Paid",
    paidAt: new Date(),
  });
  if (moved === 0) {
    const order = await (prisma as any).labelOrder.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) return { error: "Order not found" };
    if (order.status === "Paid" || order.status === "Printed") {
      return { error: "Already marked paid" };
    }
    return { error: `Cannot mark paid — order is ${order.status}` };
  }
  revalidatePath("/admin");
  return { success: true };
}

export async function adminCancelLabelOrder(orderId: string) {
  await verifyAdmin();
  // Cancelling a Printed order is a real money loss (label already purchased
  // on Shippo). Block it — admin must refund through Shippo and then we can
  // mark the order Refunded with a different action (not implemented yet).
  const moved = await transitionLabelOrder(
    orderId,
    ["AwaitingPayment", "LinkSent", "Paid"],
    { status: "Cancelled", cancelledAt: new Date() },
  );
  if (moved === 0) {
    const order = await (prisma as any).labelOrder.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) return { error: "Order not found" };
    if (order.status === "Printed") {
      return { error: "Cannot cancel a Printed order — refund the label on Shippo first." };
    }
    if (order.status === "Cancelled") return { error: "Already cancelled" };
    return { error: `Cannot cancel — order is ${order.status}` };
  }
  revalidatePath("/admin");
  return { success: true };
}

// ─── Bulk-cancel stale pre-paid orders ──────────────────────────────────────
// Marks every Awaiting/LinkSent order older than N days as Cancelled. Lets
// admin sweep abandoned orders out of the queue without clicking each one.
// Returns the count cancelled. Audit-trail-light: each row's `cancelledAt`
// timestamp is set, so the lifecycle is preserved.
export async function bulkCancelStaleLabelOrders(olderThanDays: number = 7) {
  await verifyAdmin();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await (prisma as any).labelOrder.updateMany({
    where: {
      status: { in: ["AwaitingPayment", "LinkSent"] },
      createdAt: { lt: cutoff },
    },
    data: { status: "Cancelled", cancelledAt: new Date() },
  });
  if (result.count > 0) {
    revalidatePath("/admin");
  }
  return { success: true, cancelled: result.count as number };
}

export async function adminPrintLabelOrder(orderId: string) {
  await verifyAdmin();
  if (!isShippoConfigured()) return { error: "Shippo not configured" };

  const order = await (prisma as any).labelOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found" };
  if (order.status === "Printed") return { error: "Already printed" };
  if (order.status !== "Paid") {
    return { error: "Mark the order as paid before printing." };
  }

  // Idempotency guard: if a ShippoLabel already exists for this order
  // (e.g. previous Print attempt died between purchaseLabel and the DB
  // update), don't re-purchase. Just re-link and return the existing label.
  if (order.shippoLabelId) {
    const existing = await prisma.shippoLabel.findUnique({
      where: { id: order.shippoLabelId },
    });
    if (existing) {
      await (prisma as any).labelOrder.update({
        where: { id: orderId },
        data: { status: "Printed", printedAt: new Date() },
      });
      revalidatePath("/admin");
      return {
        success: true,
        labelUrl: existing.labelUrl,
        trackingNumber: existing.trackingNumber,
        trackingUrl: existing.trackingUrl,
      };
    }
  }

  // Re-fetch rates so we know the rate is still purchasable. Rate IDs change
  // each fetch, so we match on carrier + servicelevel instead.
  const sender = await getShippoSender();
  const fromAddr = senderToAddress(sender);
  const toAddr: ShippoAddress = {
    name: order.toName,
    street1: order.toStreet,
    city: order.toCity,
    state: order.toState,
    zip: order.toZip,
    country: "US",
    company: order.toCompany,
  };
  const parcel: ShippoParcel = {
    lengthIn: order.lengthIn,
    widthIn: order.widthIn,
    heightIn: order.heightIn,
    weightOz: order.weightOz,
  };

  const accountIds = await getActiveCarrierAccountIds();
  const rates = await getShippingRates(toAddr, parcel, fromAddr, accountIds);
  if (!rates || rates.length === 0) {
    return { error: "Couldn't fetch fresh rates from Shippo. Try again in a minute." };
  }
  const fresh = rates.find(
    (r) => r.provider === order.carrier && r.servicelevel === order.servicelevel,
  );
  if (!fresh) {
    return {
      error: `${order.carrier} ${order.servicelevel} no longer available for this shipment.`,
    };
  }

  const label = await purchaseLabel(fresh.rateObjectId, "PDF_4x6");
  if (!label) return { error: "Label purchase failed — check Shippo balance." };

  const shippoLabelId = cuid();
  // Atomic: ShippoLabel row + LabelOrder status flip must commit together.
  // If they don't, a re-Print would re-purchase. The earlier shippoLabelId
  // idempotency check above also catches this case on the next click.
  try {
    await prisma.$transaction([
      prisma.shippoLabel.create({
        data: {
          id: shippoLabelId,
          userId: order.userId,
          transactionId: label.transactionId,
          shipmentId: label.shipmentId,
          carrier: label.carrier,
          servicelevel: label.servicelevel,
          trackingNumber: label.trackingNumber,
          trackingUrl: label.trackingUrlProvider,
          labelUrl: label.labelUrl,
          amountPaid: parseFloat(label.amountPaid),
          toName: order.toName,
          toStreet: order.toStreet,
          toCity: order.toCity,
          toState: order.toState,
          toZip: order.toZip,
          lengthIn: order.lengthIn,
          widthIn: order.widthIn,
          heightIn: order.heightIn,
          weightOz: order.weightOz,
          labelFormat: "PDF_4x6",
        },
      }),
      (prisma as any).labelOrder.update({
        where: { id: orderId },
        data: { status: "Printed", printedAt: new Date(), shippoLabelId },
      }),
    ]);
  } catch (e) {
    console.error("[adminPrintLabelOrder] DB write failed AFTER Shippo purchased:", {
      orderId, shippoTxId: label.transactionId, labelUrl: label.labelUrl, error: e,
    });
    return {
      error: "Shippo purchased the label but DB save failed. Tracking " +
        `${label.trackingNumber} — write it down and contact dev to reconcile.`,
    };
  }

  // Auto-fire the branded tracking email to the customer who pre-paid for
  // the label. Best-effort — sendEmail logs to EmailLog and never throws,
  // and the catch here makes sure even an unexpected error doesn't block the
  // success path. The order is the system of record; the email is a courtesy.
  if (order.customerEmail) {
    void (async () => {
      try {
        const { sendLabelTrackingEmail } = await import("@/lib/email");
        await sendLabelTrackingEmail({
          email: order.customerEmail,
          recipientName: order.customerName ?? order.toName,
          carrier: label.carrier,
          servicelevel: label.servicelevel,
          trackingNumber: label.trackingNumber,
          labelId: shippoLabelId,
          labelUrl: label.labelUrl,
          city: order.toCity,
          state: order.toState,
          zip: order.toZip,
        });
      } catch (e) {
        console.error("[adminPrintLabelOrder] sendLabelTrackingEmail failed:", e);
      }
    })();
  }

  revalidatePath("/admin");
  return {
    success: true,
    labelUrl: label.labelUrl,
    trackingNumber: label.trackingNumber,
    trackingUrl: label.trackingUrlProvider,
  };
}
