"use server";

/**
 * iter-184 — Carrier rate-shop server actions (Tier 12 #93).
 *
 * Admin types destination zip + weight → `quoteShippingRates` returns
 * USPS / UPS / FedEx / DHL rates side-by-side (heuristic engine in
 * lib/rate-shop.ts) AND persists the snapshot as a `RateQuote` row so
 * future audits see what we quoted vs what we actually picked.
 *
 * Two flows:
 *   1. quote-only (just see the rates, no persistence) — used for
 *      ad-hoc curiosity
 *   2. quote-and-persist (mailItemId optional) — admin's about to ship
 *      this exact item, we want the audit trail
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getRateQuotes, type Quote, type CarrierKey } from "@/lib/rate-shop";

const VALID_CARRIERS: CarrierKey[] = ["USPS", "UPS", "FedEx", "DHL"];

export type RateQuoteResponse = {
  quoteId: string | null;        // null when persist=false
  rates: Quote[];
  zone: number | null;           // computed for display
  weightOz: number;
  destZip: string;
  cheapest: { carrier: CarrierKey; service: string; totalCents: number };
  fastest: { carrier: CarrierKey; service: string; totalCents: number; etaDaysMax: number };
};

export type QuoteInput = {
  destZip: string;
  weightOz: number;
  declaredValueCents?: number;
  dimensions?: string;
  persist?: boolean;             // when true, writes RateQuote row + audit
  mailItemId?: string;
};

export async function quoteShippingRates(input: QuoteInput): Promise<{ ok: true; data: RateQuoteResponse } | { ok: false; error: string }> {
  const actor = await verifyAdmin();
  const destZip = input.destZip.replace(/\D/g, "").slice(0, 5);
  if (destZip.length !== 5) return { ok: false, error: "Destination ZIP must be 5 digits." };
  const weightOz = Math.max(1, Math.min(70 * 16, Math.round(input.weightOz)));
  if (!Number.isFinite(input.weightOz) || input.weightOz <= 0) return { ok: false, error: "Weight must be > 0." };

  const rates = getRateQuotes({
    destZip,
    weightOz,
    declaredValueCents: input.declaredValueCents,
  });

  const cheapest = rates.find((r) => r.isCheapest)!;
  const fastest = rates.find((r) => r.isFastest)!;

  let quoteId: string | null = null;
  if (input.persist) {
    const created = await prisma.rateQuote.create({
      data: {
        originZip: "91601",
        destZip,
        weightOz,
        dimensions: input.dimensions?.trim().slice(0, 80) || null,
        declaredValueCents: input.declaredValueCents != null ? Math.round(input.declaredValueCents) : null,
        ratesJson: JSON.stringify(rates),
        mailItemId: input.mailItemId ?? null,
        createdById: actor.id ?? null,
      },
    });
    quoteId = created.id;
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "rate_shop.quote_created",
        entityType: "RateQuote",
        entityId: created.id,
        metadata: JSON.stringify({ destZip, weightOz, cheapest: cheapest.carrier, fastest: fastest.carrier, mailItemId: input.mailItemId ?? null }),
      },
    });
    revalidatePath("/admin");
  }

  return {
    ok: true,
    data: {
      quoteId,
      rates,
      zone: zoneForDisplay(destZip),
      weightOz,
      destZip,
      cheapest: { carrier: cheapest.carrier, service: cheapest.service, totalCents: cheapest.totalCents },
      fastest: { carrier: fastest.carrier, service: fastest.service, totalCents: fastest.totalCents, etaDaysMax: fastest.etaDays.max },
    },
  };
}

function zoneForDisplay(destZip: string): number | null {
  const first = destZip[0];
  const map: Record<string, number> = { "9": 1, "8": 2, "7": 4, "6": 5, "5": 5, "4": 6, "3": 7, "2": 7, "1": 8, "0": 8 };
  return first ? (map[first] ?? null) : null;
}

// Admin selects which carrier they actually shipped — locks in the
// snapshot for revenue + carrier-mix reporting.
export async function selectRateQuote(input: { quoteId: string; carrier: CarrierKey; service: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  if (!VALID_CARRIERS.includes(input.carrier)) return { error: "Invalid carrier." };
  const row = await prisma.rateQuote.findUnique({ where: { id: input.quoteId } });
  if (!row) return { error: "Quote not found." };
  // Find matching rate in the stored snapshot.
  let rates: Quote[] = [];
  try { rates = JSON.parse(row.ratesJson) as Quote[]; } catch { /* corrupt — let admin re-quote */ }
  const match = rates.find((r) => r.carrier === input.carrier && r.service === input.service);
  if (!match) return { error: "Selected carrier+service not in this quote." };
  await prisma.$transaction([
    prisma.rateQuote.update({
      where: { id: row.id },
      data: { selectedCarrier: input.carrier, selectedService: input.service, selectedTotalCents: match.totalCents },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "rate_shop.carrier_selected",
        entityType: "RateQuote",
        entityId: row.id,
        metadata: JSON.stringify({ carrier: input.carrier, service: input.service, totalCents: match.totalCents, destZip: row.destZip, weightOz: row.weightOz }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// Recent quotes for the panel history strip.
export type RecentQuoteRow = {
  id: string;
  destZip: string;
  weightOz: number;
  cheapestCarrier: string | null;
  cheapestCents: number | null;
  selectedCarrier: string | null;
  selectedService: string | null;
  selectedTotalCents: number | null;
  createdAtIso: string;
};

export async function listRecentRateQuotes(input: { limit?: number } = {}): Promise<RecentQuoteRow[]> {
  await verifyAdmin();
  const rows = await prisma.rateQuote.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(5, Math.min(50, input.limit ?? 12)),
  });
  return rows.map((r) => {
    let rates: Quote[] = [];
    try { rates = JSON.parse(r.ratesJson) as Quote[]; } catch { /* swallow */ }
    const cheap = rates.reduce<Quote | null>((min, q) => !min || q.totalCents < min.totalCents ? q : min, null);
    return {
      id: r.id,
      destZip: r.destZip,
      weightOz: r.weightOz,
      cheapestCarrier: cheap?.carrier ?? null,
      cheapestCents: cheap?.totalCents ?? null,
      selectedCarrier: r.selectedCarrier,
      selectedService: r.selectedService,
      selectedTotalCents: r.selectedTotalCents,
      createdAtIso: r.createdAt.toISOString(),
    };
  });
}
