"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  getShippingRates,
  purchaseLabel,
  getTrackingStatus,
  isShippoConfigured,
  listCarrierAccounts,
  NOHO_ORIGIN,
  type ShippoAddress,
  type ShippoParcel,
  type CarrierAccountSummary,
} from "@/lib/shippo";
import { priceWithMargin } from "@/lib/label-orders";
function cuid() {
  return crypto.randomUUID();
}

// ─── Validate a destination address ─────────────────────────────────────────
// Wraps Shippo's address validation + returns the canonicalized version so
// the UI can offer a one-click "use this" fix when the customer typo'd the
// zip / city / abbreviation. Pure read on Shippo's side — safe to call
// before paying for rate-fetching.
export async function validateShippoAddress(input: {
  toName?: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
}) {
  await verifyAdmin();
  if (!isShippoConfigured()) {
    return { valid: true, messages: [], suggestion: null }; // soft-pass when off
  }
  const { validateAddress } = await import("@/lib/shippo");
  try {
    const res = await validateAddress({
      name: input.toName ?? "Recipient",
      street1: input.toStreet,
      city: input.toCity,
      state: input.toState.toUpperCase(),
      zip: input.toZip,
      country: "US",
    });
    return { valid: res.valid, messages: res.messages, suggestion: null };
  } catch {
    return { valid: true, messages: [] as string[], suggestion: null };
  }
}

// ─── Get live rates ──────────────────────────────────────────────────────────

export async function getShippoRates(input: {
  toName: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  toPhone?: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  fromAddress?: ShippoAddress;
}) {
  await verifyAdmin();

  if (!isShippoConfigured()) {
    return { error: "Shippo not configured. Add SHIPPO_API_KEY to your environment." };
  }

  const to: ShippoAddress = {
    name: input.toName,
    street1: input.toStreet,
    city: input.toCity,
    state: input.toState,
    zip: input.toZip,
    country: "US",
    phone: input.toPhone,
  };

  const parcel: ShippoParcel = {
    lengthIn: input.lengthIn,
    widthIn: input.widthIn,
    heightIn: input.heightIn,
    weightOz: input.weightOz,
  };

  // Use saved sender if no explicit fromAddress supplied
  const senderDefault = input.fromAddress ?? (await getShippoSender());
  // Pin rates to the operator's saved carrier accounts so UPS / FedEx / DHL
  // labels purchase reliably. Without this, Shippo returns shadow rates from
  // its default test accounts and `transactions.create` fails downstream.
  const accountIds = await getActiveCarrierAccountIds();
  const rates = await getShippingRates(to, parcel, senderDefault as ShippoAddress, accountIds);
  if (!rates) return { error: "Failed to fetch rates from Shippo. Check your API key." };
  // Decorate each rate with the customer-facing markup price so the admin UI
  // can show "you charge customer $X" alongside "Shippo cost $Y" without
  // having to recompute on the client.
  const decorated = rates.map((r) => {
    const shippoCostCents = Math.round(parseFloat(r.amount) * 100);
    const { customerPriceCents, marginCents } = priceWithMargin(shippoCostCents);
    return {
      ...r,
      shippoCostCents,
      customerPriceCents,
      marginCents,
      customerPrice: (customerPriceCents / 100).toFixed(2),
    };
  });
  return { rates: decorated };
}

// ─── Carrier accounts (UPS, FedEx, DHL targeting) ────────────────────────────
const CARRIER_ACCOUNTS_KEY = "shippo_carrier_accounts_v1";

type SavedCarrierAccounts = {
  // List of Shippo carrier-account `object_id`s the operator wants Shippo to
  // pull rates from. Empty = let Shippo decide (returns its default test
  // accounts, which is what was breaking real UPS purchases).
  ids: string[];
};

export async function getActiveCarrierAccountIds(): Promise<string[]> {
  const row = await prisma.siteConfig.findUnique({ where: { key: CARRIER_ACCOUNTS_KEY } });
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as SavedCarrierAccounts;
    return Array.isArray(parsed.ids) ? parsed.ids.filter((s) => typeof s === "string" && s.length > 0) : [];
  } catch {
    return [];
  }
}

export async function setActiveCarrierAccountIds(ids: string[]) {
  await verifyAdmin();
  const clean = Array.from(new Set(ids.filter((s) => typeof s === "string" && s.length > 0)));
  await prisma.siteConfig.upsert({
    where: { key: CARRIER_ACCOUNTS_KEY },
    update: { value: JSON.stringify({ ids: clean } satisfies SavedCarrierAccounts) },
    create: { key: CARRIER_ACCOUNTS_KEY, value: JSON.stringify({ ids: clean } satisfies SavedCarrierAccounts) },
  });
  revalidatePath("/admin");
  return { success: true, count: clean.length };
}

// Returns every carrier account on the Shippo profile + which ones are active
// in our settings. Used by the admin Carriers settings card.
export async function getCarrierAccountsWithSelection(): Promise<{
  available: CarrierAccountSummary[];
  activeIds: string[];
  configured: boolean;
}> {
  await verifyAdmin();
  const configured = isShippoConfigured();
  const [available, activeIds] = await Promise.all([
    configured ? listCarrierAccounts() : Promise.resolve([] as CarrierAccountSummary[]),
    getActiveCarrierAccountIds(),
  ]);
  return { available, activeIds, configured };
}

// ─── Shipping Center health check ────────────────────────────────────────────
// Lightweight "what's broken / missing" snapshot used by the health card on
// the Shipping Center hero. Each item is admin-actionable; the card surfaces
// a click-to-fix button mapping back to the right workspace tab.

export type HealthSeverity = "ok" | "warn" | "fail";
export type HealthItem = {
  id: string;
  label: string;
  detail: string;
  severity: HealthSeverity;
  fixTab?: "rates" | "labels" | "track" | "carriers" | "presets" | "prepaid";
  fixCta?: string;
};

export async function getShippingCenterHealth(input: { stuckOrderCount: number; refundedTodayCount?: number }): Promise<HealthItem[]> {
  await verifyAdmin();
  const items: HealthItem[] = [];

  const configured = isShippoConfigured();
  items.push(
    configured
      ? { id: "shippo", label: "Shippo connected", detail: "API key present — live rates + label purchases work.", severity: "ok" }
      : { id: "shippo", label: "Shippo not configured", detail: "Add SHIPPO_API_KEY to env. Without it, no rates and no label purchases.", severity: "fail" },
  );

  if (configured) {
    const [accounts, activeIds] = await Promise.all([
      listCarrierAccounts(),
      getActiveCarrierAccountIds(),
    ]);
    if (activeIds.length === 0) {
      items.push({
        id: "carriers",
        label: "No carrier accounts pinned",
        detail: accounts.length > 0
          ? `Found ${accounts.length} on your Shippo profile. Pin yours so UPS / FedEx purchases use your real contracts.`
          : "Connect UPS / FedEx / DHL via apps.goshippo.com/settings/carriers, then pick them here.",
        severity: "warn",
        fixTab: "carriers",
        fixCta: "Pin accounts",
      });
    } else {
      items.push({
        id: "carriers",
        label: `${activeIds.length} carrier account${activeIds.length === 1 ? "" : "s"} pinned`,
        detail: "Live rates + label purchases route through your real contracts.",
        severity: "ok",
      });
    }
  }

  // Sender / ship-from completeness
  const sender = await getShippoSender();
  const senderComplete = !!(sender.name && sender.street1 && sender.city && sender.state && sender.zip);
  items.push(
    senderComplete
      ? { id: "sender", label: "Sender address set", detail: `${sender.name} · ${sender.city}, ${sender.state}`, severity: "ok" }
      : { id: "sender", label: "Sender incomplete", detail: "Return-address fields missing. Open Quick Ship → Edit Sender.", severity: "warn", fixTab: "rates", fixCta: "Edit sender" },
  );

  // Presets — soft warn if zero (unusable but not blocking)
  const presets = await getParcelPresets();
  if (presets.length === 0) {
    items.push({
      id: "presets",
      label: "No box presets defined",
      detail: "Add your real box stock so Quick Ship has one-tap fill chips.",
      severity: "warn",
      fixTab: "presets",
      fixCta: "Add presets",
    });
  } else {
    items.push({
      id: "presets",
      label: `${presets.length} box preset${presets.length === 1 ? "" : "s"}`,
      detail: "One-tap fill on the Quick Ship rate form.",
      severity: "ok",
    });
  }

  // Stuck orders — passed in by the caller because it's already computed on
  // the AdminShippingCenterPanel from the labelOrders list.
  if (input.stuckOrderCount > 0) {
    items.push({
      id: "stuck",
      label: `${input.stuckOrderCount} stuck order${input.stuckOrderCount === 1 ? "" : "s"}`,
      detail: "Pre-paid > 4h ago without a Shippo label purchased. Customer is waiting.",
      severity: "fail",
      fixTab: "prepaid",
      fixCta: "Open queue",
    });
  } else {
    items.push({
      id: "stuck",
      label: "No stuck orders",
      detail: "Every Paid pre-paid order has been printed within 4h.",
      severity: "ok",
    });
  }

  return items;
}

// ─── Parcel presets (saved box dimensions) ───────────────────────────────────
// Admin defines his real box stock once: name + LWH + weight (oz). Quick-fill
// chips on the rate form replace the hard-coded "Envelope/Small/Medium/Large"
// fixtures. Persisted in SiteConfig as JSON so we don't grow the schema.

const PARCEL_PRESETS_KEY = "shippo_parcel_presets_v1";

export type ParcelPreset = {
  id: string;
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
};

const DEFAULT_PRESETS: ParcelPreset[] = [
  { id: "envelope", label: "Envelope",   lengthIn: 9,  widthIn: 6,  heightIn: 0.5, weightOz: 2 },
  { id: "small",    label: "Small Box",  lengthIn: 12, widthIn: 9,  heightIn: 4,   weightOz: 32 },
  { id: "medium",   label: "Medium Box", lengthIn: 15, widthIn: 12, heightIn: 8,   weightOz: 80 },
  { id: "large",    label: "Large Box",  lengthIn: 20, widthIn: 15, heightIn: 12,  weightOz: 160 },
];

export async function getParcelPresets(): Promise<ParcelPreset[]> {
  const row = await prisma.siteConfig.findUnique({ where: { key: PARCEL_PRESETS_KEY } });
  if (!row?.value) return DEFAULT_PRESETS;
  try {
    const parsed = JSON.parse(row.value) as { presets?: ParcelPreset[] };
    if (Array.isArray(parsed.presets) && parsed.presets.length > 0) {
      return parsed.presets
        .filter((p) => p && typeof p.label === "string")
        .map((p) => ({
          id: String(p.id ?? crypto.randomUUID()),
          label: String(p.label).slice(0, 60),
          lengthIn: Number(p.lengthIn) || 0,
          widthIn: Number(p.widthIn) || 0,
          heightIn: Number(p.heightIn) || 0,
          weightOz: Number(p.weightOz) || 0,
        }));
    }
    return DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

export async function setParcelPresets(presets: ParcelPreset[]) {
  await verifyAdmin();
  const clean = presets
    .filter((p) => p.label?.trim())
    .map((p) => ({
      id: p.id?.trim() || crypto.randomUUID(),
      label: p.label.trim().slice(0, 60),
      lengthIn: Math.max(0, Number(p.lengthIn) || 0),
      widthIn: Math.max(0, Number(p.widthIn) || 0),
      heightIn: Math.max(0, Number(p.heightIn) || 0),
      weightOz: Math.max(0, Number(p.weightOz) || 0),
    }))
    .slice(0, 24); // sanity cap

  await prisma.siteConfig.upsert({
    where: { key: PARCEL_PRESETS_KEY },
    update: { value: JSON.stringify({ presets: clean }) },
    create: { key: PARCEL_PRESETS_KEY, value: JSON.stringify({ presets: clean }) },
  });
  revalidatePath("/admin");
  return { success: true, count: clean.length };
}

export async function resetParcelPresets() {
  await verifyAdmin();
  await prisma.siteConfig.upsert({
    where: { key: PARCEL_PRESETS_KEY },
    update: { value: JSON.stringify({ presets: DEFAULT_PRESETS }) },
    create: { key: PARCEL_PRESETS_KEY, value: JSON.stringify({ presets: DEFAULT_PRESETS }) },
  });
  revalidatePath("/admin");
  return { success: true, presets: DEFAULT_PRESETS };
}

// ─── Recent recipients (address-book autocomplete) ───────────────────────────

export type RecentRecipient = {
  toName: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  lastShipped: string; // ISO date
  shipmentCount: number;
};

// Pulls the last ~200 ShippoLabel rows, deduplicates by (toName + toZip), and
// counts repeat shipments. Used by the Quick Ship rate form to autocomplete
// recipient details — admin types "Goldberg" → suggestions of past matches
// pre-filled with the full address.
export async function getRecentRecipients(): Promise<RecentRecipient[]> {
  await verifyAdmin();
  const rows = await prisma.shippoLabel.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      toName: true,
      toStreet: true,
      toCity: true,
      toState: true,
      toZip: true,
      createdAt: true,
    },
  });
  // Dedup by (lowercased toName + zip) — same person at different addresses
  // gets separate entries. Most-recent shipment wins for the canonical
  // street/city. Count is a cheap "frequent flyer" hint.
  const buckets = new Map<string, RecentRecipient>();
  for (const r of rows) {
    if (!r.toName || !r.toZip) continue;
    const k = `${r.toName.trim().toLowerCase()}|${r.toZip.trim()}`;
    const existing = buckets.get(k);
    if (!existing) {
      buckets.set(k, {
        toName: r.toName.trim(),
        toStreet: r.toStreet.trim(),
        toCity: r.toCity.trim(),
        toState: r.toState.trim().toUpperCase(),
        toZip: r.toZip.trim(),
        lastShipped: r.createdAt.toISOString(),
        shipmentCount: 1,
      });
    } else {
      existing.shipmentCount += 1;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => b.lastShipped.localeCompare(a.lastShipped));
}

// ─── Buy a label (admin quick-ship) ─────────────────────────────────────────

// ─── Sender / Ship-From defaults (admin-editable, stored in SiteConfig) ──────
const SENDER_KEY = "shippo_sender_v1";

export type SenderAddress = {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export async function getShippoSender(): Promise<SenderAddress> {
  const row = await prisma.siteConfig.findUnique({ where: { key: SENDER_KEY } });
  if (row?.value) {
    try {
      return JSON.parse(row.value) as SenderAddress;
    } catch {
      /* fall through */
    }
  }
  // Fallback to the hard-coded NOHO origin.
  return {
    name: NOHO_ORIGIN.name,
    company: NOHO_ORIGIN.company,
    street1: NOHO_ORIGIN.street1,
    city: NOHO_ORIGIN.city,
    state: NOHO_ORIGIN.state,
    zip: NOHO_ORIGIN.zip,
    country: NOHO_ORIGIN.country ?? "US",
    phone: NOHO_ORIGIN.phone,
    email: NOHO_ORIGIN.email,
  };
}

export async function updateShippoSender(input: SenderAddress) {
  await verifyAdmin();
  if (!input.name || !input.street1 || !input.city || !input.state || !input.zip) {
    return { error: "Name, street, city, state, and zip are required" };
  }
  await prisma.siteConfig.upsert({
    where: { key: SENDER_KEY },
    update: { value: JSON.stringify(input) },
    create: { key: SENDER_KEY, value: JSON.stringify(input) },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function buyShippoLabel(input: {
  rateObjectId: string;
  toName: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  weightOz?: number;
  userId?: string;
  mailItemId?: string;
  deliveryOrderId?: string;
  labelFormat?: "PDF_4x6" | "PDF" | "PDF_A4" | "PDF_A6" | "ZPLII" | "PNG";
  // Admin's free-form note captured on Quick Ship — passes through to Shippo's
  // transaction `metadata` field (capped at 100 chars on Shippo's side).
  note?: string;
}) {
  await verifyAdmin();

  if (!isShippoConfigured()) {
    return { error: "Shippo not configured." };
  }

  const fmt = input.labelFormat ?? "PDF_4x6";
  const noteTrimmed = input.note?.trim().slice(0, 100);
  const label = await purchaseLabel(input.rateObjectId, fmt, noteTrimmed);
  if (!label) return { error: "Label purchase failed. Check your Shippo account balance." };

  const id = cuid();

  await prisma.shippoLabel.create({
    data: {
      id,
      userId: input.userId ?? null,
      mailItemId: input.mailItemId ?? null,
      deliveryOrderId: input.deliveryOrderId ?? null,
      transactionId: label.transactionId,
      shipmentId: label.shipmentId,
      carrier: label.carrier,
      servicelevel: label.servicelevel,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrlProvider,
      labelUrl: label.labelUrl,
      amountPaid: parseFloat(label.amountPaid),
      toName: input.toName,
      toStreet: input.toStreet,
      toCity: input.toCity,
      toState: input.toState,
      toZip: input.toZip,
      lengthIn: input.lengthIn ?? null,
      widthIn: input.widthIn ?? null,
      heightIn: input.heightIn ?? null,
      weightOz: input.weightOz ?? null,
      labelFormat: fmt,
    },
  });

  // Auto-fire customer tracking email when a member is linked. Best-effort —
  // sendEmail is fire-and-forget (errors logged via EmailLog, never thrown).
  // For walk-in labels with no userId, no email is sent (admin uses Forward
  // SMS for those).
  if (input.userId) {
    void prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    }).then(async (u) => {
      if (!u?.email) return;
      const { sendLabelTrackingEmail } = await import("@/lib/email");
      await sendLabelTrackingEmail({
        email: u.email,
        recipientName: u.name ?? input.toName,
        carrier: label.carrier,
        servicelevel: label.servicelevel,
        trackingNumber: label.trackingNumber,
        labelId: id,
        labelUrl: label.labelUrl,
        city: input.toCity,
        state: input.toState,
        zip: input.toZip,
      }).catch((e) => console.error("[buyShippoLabel] sendLabelTrackingEmail failed:", e));
    }).catch((e) => console.error("[buyShippoLabel] user lookup failed:", e));
  }

  revalidatePath("/admin");
  return { success: true, label, id };
}

// ─── Look up live refund status (Shippo) ────────────────────────────────────

export async function getShippoRefundStatus(labelId: string) {
  await verifyAdmin();
  const row = await prisma.shippoLabel.findUnique({ where: { id: labelId }, select: { id: true, transactionId: true, status: true } });
  if (!row) return { error: "Label not found" };
  if (row.status !== "refunded") return { error: "This label has not been refunded yet." };
  const { findRefundForTransaction } = await import("@/lib/shippo");
  const info = await findRefundForTransaction(row.transactionId);
  if (!info) return { error: "Couldn't find a matching refund on Shippo. The refund may still be queued — try again in a minute." };
  return { success: true, info };
}

// ─── Refund a label ─────────────────────────────────────────────────────────

export async function refundShippoLabel(labelId: string) {
  await verifyAdmin();
  const row = await prisma.shippoLabel.findUnique({ where: { id: labelId } });
  if (!row) return { error: "Label not found" };
  if (row.status === "refunded") return { error: "Already refunded" };

  const { refundShippoTransaction } = await import("@/lib/shippo");
  const result = await refundShippoTransaction(row.transactionId);
  if (!result.success) {
    return { error: result.error ?? "Refund failed. Some carriers only allow refunds within 30 days." };
  }
  await prisma.shippoLabel.update({
    where: { id: labelId },
    data: { status: "refunded", refundedAt: new Date() },
  });
  revalidatePath("/admin");
  return { success: true, refundStatus: result.status };
}

// ─── Forward label to a customer via SMS ────────────────────────────────────
// Returns the sms: URL the admin's browser will open in Messages.app.
export async function forwardShippoLabel(labelId: string) {
  await verifyAdmin();
  const row = await prisma.shippoLabel.findUnique({
    where: { id: labelId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!row) return { error: "Label not found" };
  const phone = row.user?.phone ?? null;
  if (!phone) {
    return { error: "No phone on file for this customer — share the label URL manually." };
  }
  const firstName = (row.user?.name ?? row.toName).split(" ")[0];
  // Public branded receipt — single short NOHO URL the customer can re-open
  // anytime to see the latest tracking. The unguessable cuid is the access
  // token. Falls back to nohomailbox.org if the public-origin env var isn't
  // set so prod always emits a real link.
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
    "https://nohomailbox.org";
  const receiptUrl = `${publicOrigin}/r/${row.id}`;
  const body =
    `Hi ${firstName}, this is NOHO Mailbox. Here's your shipping label and live tracking:\n\n` +
    `Label: ${row.labelUrl}\nTracking page: ${receiptUrl}\n\n` +
    `Carrier: ${row.carrier} ${row.servicelevel}.`;
  const phoneDigits = phone.replace(/\D/g, "");
  const smsUrl = `sms:+1${phoneDigits}?&body=${encodeURIComponent(body)}`;
  return { success: true, smsUrl };
}

// ─── Get labels list (admin) ──────────────────────────────────────────────────

export async function getShippoLabels(limit = 50) {
  await verifyAdmin();
  const labels = await prisma.shippoLabel.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  return labels;
}

// ─── Track a label ─────────────────────────────────────────────────────────────

export async function trackShippoLabel(carrier: string, trackingNumber: string) {
  await verifyAdmin();
  if (!isShippoConfigured()) return { error: "Shippo not configured." };
  const status = await getTrackingStatus(carrier, trackingNumber);
  if (!status) return { error: "Could not fetch tracking status." };
  return { status };
}

// ─── Member uploads their own pre-paid label ──────────────────────────────────

export async function uploadMemberLabel(input: {
  filename: string;
  url: string;
  carrier?: string;
  trackingNum?: string;
  notes?: string;
}) {
  const session = await verifySession();
  const id = cuid();

  await prisma.labelUpload.create({
    data: {
      id,
      userId: session.id!,
      filename: input.filename,
      url: input.url,
      carrier: input.carrier ?? null,
      trackingNum: input.trackingNum ?? null,
      notes: input.notes ?? null,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, id };
}

// ─── Admin updates label upload status ───────────────────────────────────────

export async function updateLabelUploadStatus(
  uploadId: string,
  status: "uploaded" | "picked_up" | "shipped"
) {
  await verifyAdmin();
  await prisma.labelUpload.update({ where: { id: uploadId }, data: { status } });
  revalidatePath("/admin");
  return { success: true };
}
