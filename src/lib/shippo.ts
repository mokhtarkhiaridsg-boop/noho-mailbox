/**
 * NOHO Mailbox — Shippo Shipping Client
 * Wraps the Shippo SDK for label creation, rate fetching, and tracking.
 *
 * Set SHIPPO_API_KEY in your environment to enable.
 * All functions return null/error gracefully when unconfigured.
 */

import { Shippo } from "shippo";
import type { AddressCreateRequest } from "shippo/models/components";
import type { TransactionCreateRequest } from "shippo/models/components";

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY ?? "";

export function isShippoConfigured(): boolean {
  return !!SHIPPO_API_KEY;
}

function getClient(): Shippo {
  if (!SHIPPO_API_KEY) throw new Error("SHIPPO_API_KEY not configured");
  return new Shippo({ apiKeyHeader: SHIPPO_API_KEY });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShippoAddress = {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
  email?: string;
  company?: string;
};

export type ShippoParcel = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
};

export type ShippoRateResult = {
  rateObjectId: string;
  provider: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
  durationTerms: string | null;
};

export type ShippoLabelResult = {
  labelUrl: string;
  trackingNumber: string;
  trackingUrlProvider: string;
  carrier: string;
  servicelevel: string;
  amountPaid: string;
  shipmentId: string;
  transactionId: string;
};

// ─── NOHO Mailbox origin address ─────────────────────────────────────────────

export const NOHO_ORIGIN: ShippoAddress = {
  name: "NOHO Mailbox",
  company: "NOHO Mailbox",
  street1: "5062 Lankershim Blvd",
  city: "North Hollywood",
  state: "CA",
  zip: "91601",
  country: "US",
  phone: "(818) 506-7744",
  email: "nohomailbox@gmail.com",
};

function toShippoAddr(addr: ShippoAddress): AddressCreateRequest {
  return {
    name: addr.name,
    street1: addr.street1,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
    country: (addr.country ?? "US") as string,
    phone: addr.phone,
    email: addr.email,
    company: addr.company,
  };
}

// ─── Validate an address ─────────────────────────────────────────────────────

export async function validateAddress(addr: ShippoAddress): Promise<{
  valid: boolean;
  messages: string[];
}> {
  if (!isShippoConfigured()) return { valid: false, messages: ["Shippo not configured"] };
  try {
    const client = getClient();
    // Create the address first, then validate it
    const created = await client.addresses.create(toShippoAddr(addr));
    if (!created.objectId) return { valid: false, messages: ["Could not create address"] };
    const validated = await client.addresses.validate(created.objectId);
    const isValid = validated.validationResults?.isValid ?? false;
    const messages = (validated.validationResults?.messages ?? [])
      .map((m: { code?: string; text?: string }) => m.text ?? m.code ?? "")
      .filter(Boolean);
    return { valid: isValid, messages };
  } catch {
    return { valid: false, messages: ["Address validation failed"] };
  }
}

// ─── Get shipping rates ────────────────────────────────────────────────────────

export async function getShippingRates(
  to: ShippoAddress,
  parcel: ShippoParcel,
  from: ShippoAddress = NOHO_ORIGIN,
  carrierAccountIds?: string[],
): Promise<ShippoRateResult[] | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
    // If the operator has saved specific carrier account IDs (their real
    // UPS / FedEx / DHL contracts in Shippo), pin rate-fetch + downstream
    // purchase to those accounts only. Without this, Shippo falls back to
    // its default test accounts and downstream `transactions.create` for
    // UPS/FedEx silently fails because no account is linked.
    const accountFilter = carrierAccountIds && carrierAccountIds.length > 0
      ? { carrierAccounts: carrierAccountIds }
      : {};
    const shipment = await client.shipments.create({
      addressFrom: toShippoAddr(from),
      addressTo: toShippoAddr(to),
      parcels: [
        {
          length: String(parcel.lengthIn),
          width: String(parcel.widthIn),
          height: String(parcel.heightIn),
          distanceUnit: "in",
          weight: String(parcel.weightOz / 16), // Shippo uses lbs
          massUnit: "lb",
        },
      ],
      async: false,
      ...accountFilter,
    });

    if (!shipment.rates || shipment.rates.length === 0) return [];

    // Shippo's Rate object does NOT carry `objectStatus` — that lives on the
    // parent Shipment. The previous filter (`r.objectStatus === "VALID"`)
    // always evaluated to false and silently zeroed out the rate list. Filter
    // by the only meaningful predicate: that the rate actually has an id +
    // priced amount.
    return (shipment.rates as any[])
      .filter((r) => !!r.objectId && r.amount != null && parseFloat(r.amount) > 0)
      .map((r) => ({
        rateObjectId: r.objectId,
        provider: r.provider ?? "",
        servicelevel: r.servicelevel?.displayName ?? r.servicelevel?.name ?? "",
        amount: r.amount ?? "0",
        currency: r.currency ?? "USD",
        estimatedDays: r.estimatedDays ?? null,
        durationTerms: r.durationTerms ?? null,
        carrierAccount: r.carrierAccount ?? null,
      }))
      .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
  } catch (err) {
    console.error("Shippo getShippingRates failed:", err);
    return null;
  }
}

// ─── List configured carrier accounts ────────────────────────────────────────

export type CarrierAccountSummary = {
  objectId: string;
  carrier: string;
  carrierName: string;
  accountId: string | null;
  active: boolean;
  isShippoAccount: boolean;
};

export async function listCarrierAccounts(): Promise<CarrierAccountSummary[]> {
  if (!isShippoConfigured()) return [];
  try {
    const client = getClient();
    const list = await client.carrierAccounts.list({}) as any;
    const items: any[] = Array.isArray(list?.results) ? list.results : Array.isArray(list) ? list : [];
    return items
      .filter((a) => !!a?.objectId)
      .map((a) => ({
        objectId: a.objectId as string,
        carrier: (a.carrier ?? "").toString(),
        carrierName: prettyCarrier(a.carrier),
        accountId: a.accountId ?? a.account_id ?? null,
        active: a.active !== false,
        // "shippo" sub-accounts are the test/default ones; user-owned accounts
        // are linked through the carrier's own portal.
        isShippoAccount:
          (typeof a.accountOwner === "string" && a.accountOwner === "shippo") ||
          (a.parameters?.shippoAccount === true),
      }));
  } catch (err) {
    console.error("listCarrierAccounts failed:", err);
    return [];
  }
}

function prettyCarrier(slug: unknown): string {
  if (!slug) return "Carrier";
  const s = String(slug).toLowerCase();
  const map: Record<string, string> = {
    usps: "USPS",
    ups: "UPS",
    fedex: "FedEx",
    dhl_express: "DHL Express",
    dhl_ecommerce: "DHL eCommerce",
    "dhl-express": "DHL Express",
    canada_post: "Canada Post",
    purolator: "Purolator",
    ontrac: "OnTrac",
    asendia_us: "Asendia US",
    sendle: "Sendle",
    apc: "APC",
    lasership: "LaserShip",
  };
  return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Purchase a label ─────────────────────────────────────────────────────────
// Default format is PDF_4x6 — the right size for thermal label printers
// (Zebra, Brother, Dymo). Switch to PDF for desktop 8.5×11, ZPLII for raw
// Zebra, or PNG.
export type LabelFormat = "PDF_4x6" | "PDF" | "PDF_A4" | "PDF_A6" | "ZPLII" | "PNG";

export async function purchaseLabel(
  rateObjectId: string,
  labelFormat: LabelFormat = "PDF_4x6",
  metadata?: string,
): Promise<ShippoLabelResult | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
    // Shippo `metadata` is a free-form string of up to 100 chars stored on
    // the transaction. We use it for admin notes ("birthday gift to friend")
    // so the note travels with the label and is searchable in Shippo's UI.
    const req: TransactionCreateRequest = {
      rate: rateObjectId,
      labelFileType: labelFormat as any,
      async: false,
      ...(metadata ? { metadata: metadata.slice(0, 100) } : {}),
    };
    const transaction = await client.transactions.create(req);
    const tx = transaction as any;

    if (tx.status !== "SUCCESS") return null;

    return {
      labelUrl: tx.labelUrl ?? "",
      trackingNumber: tx.trackingNumber ?? "",
      trackingUrlProvider: tx.trackingUrlProvider ?? "",
      carrier: tx.rate?.provider ?? "",
      servicelevel: tx.rate?.servicelevel?.displayName ?? "",
      amountPaid: tx.rate?.amount ?? "0",
      shipmentId: tx.shipment ?? "",
      transactionId: tx.objectId ?? "",
    };
  } catch (err) {
    console.error("Shippo purchaseLabel failed:", err);
    return null;
  }
}

// ─── Refund a label (only if not yet shipped/scanned) ────────────────────────

export async function refundShippoTransaction(
  transactionId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (!isShippoConfigured()) return { success: false, error: "Shippo not configured" };
  try {
    const client = getClient();
    // Shippo refund: pass the transaction (label) to refund.
    const refund = await client.refunds.create({ transaction: transactionId } as any);
    const r = refund as any;
    if (r.status === "ERROR") {
      return { success: false, error: r.messages?.[0]?.text ?? "Refund failed" };
    }
    return { success: true, status: r.status ?? "QUEUED" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Refund request failed";
    console.error("Shippo refund failed:", err);
    return { success: false, error: msg };
  }
}

// ─── Look up the live status of a refund by its source transaction ──────────
// Shippo's refunds API doesn't accept a `transaction` filter on list(), so we
// page through and match on the matching transaction object_id. Slow at high
// scale, fine at NOHO volume (a handful of refunds/month).

export type RefundStatusInfo = {
  refundId: string;
  status: string; // "QUEUED" | "PENDING" | "SUCCESS" | "ERROR"
  amount?: string | null;
  currency?: string | null;
  createdAt?: string | null;
  messages: string[];
};

export async function findRefundForTransaction(transactionId: string): Promise<RefundStatusInfo | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
    // First page is enough at small scale. SDK list returns a paginated list.
    const list = (await client.refunds.list({} as any)) as any;
    const items: any[] = Array.isArray(list?.results) ? list.results : Array.isArray(list) ? list : [];
    const match = items.find((r) => {
      const tx = r.transaction;
      return typeof tx === "string" ? tx === transactionId : tx?.objectId === transactionId;
    });
    if (!match) return null;
    return {
      refundId: match.objectId ?? "",
      status: (match.status ?? "QUEUED").toString(),
      amount: match.amount ?? null,
      currency: match.currency ?? null,
      createdAt: match.objectCreated ?? match.objectUpdated ?? null,
      messages: Array.isArray(match.messages)
        ? match.messages.map((m: any) => m?.text ?? m?.code ?? "").filter(Boolean)
        : [],
    };
  } catch (err) {
    console.error("Shippo findRefundForTransaction failed:", err);
    return null;
  }
}

// ─── Get tracking status ───────────────────────────────────────────────────────

export async function getTrackingStatus(
  carrier: string,
  trackingNumber: string
): Promise<{
  status: string;
  substatus: string | null;
  location: string | null;
  eta: string | null;
  trackingHistory: Array<{ date: string; status: string; location: string }>;
} | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
    const tracking = await client.trackingStatus.get(carrier, trackingNumber, {}) as any;

    const history = (tracking.trackingHistory ?? []).map((h: any) => ({
      date: h.statusDate ?? "",
      status: h.statusDetails ?? h.status ?? "",
      location: [h.location?.city, h.location?.state, h.location?.zip].filter(Boolean).join(", "),
    }));

    return {
      status: tracking.trackingStatus?.status ?? "UNKNOWN",
      substatus: tracking.trackingStatus?.substatus?.code ?? null,
      location: [
        tracking.trackingStatus?.location?.city,
        tracking.trackingStatus?.location?.state,
      ].filter(Boolean).join(", ") || null,
      eta: tracking.eta ?? null,
      trackingHistory: history,
    };
  } catch {
    return null;
  }
}
