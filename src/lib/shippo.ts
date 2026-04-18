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
  phone: "(818) 765-1539",
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
  from: ShippoAddress = NOHO_ORIGIN
): Promise<ShippoRateResult[] | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
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
    });

    if (!shipment.rates || shipment.rates.length === 0) return [];

    return (shipment.rates as any[])
      .filter((r) => r.objectStatus === "VALID")
      .map((r) => ({
        rateObjectId: r.objectId,
        provider: r.provider ?? "",
        servicelevel: r.servicelevel?.displayName ?? r.servicelevel?.name ?? "",
        amount: r.amount ?? "0",
        currency: r.currency ?? "USD",
        estimatedDays: r.estimatedDays ?? null,
        durationTerms: r.durationTerms ?? null,
      }))
      .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
  } catch {
    return null;
  }
}

// ─── Purchase a label ─────────────────────────────────────────────────────────

export async function purchaseLabel(
  rateObjectId: string,
  labelFormat: "PDF" | "PNG" | "ZPLII" = "PDF"
): Promise<ShippoLabelResult | null> {
  if (!isShippoConfigured()) return null;
  try {
    const client = getClient();
    const req: TransactionCreateRequest = {
      rate: rateObjectId,
      labelFileType: labelFormat as any,
      async: false,
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
  } catch {
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
