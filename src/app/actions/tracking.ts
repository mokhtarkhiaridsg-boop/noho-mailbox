"use server";

// iter-94 — Carrier-API tracking poller.
//
// For each active MailItem with a tracking# + carrier, hit the Shippo
// trackingStatus endpoint (existing helper). Diff against TrackingEvent
// rows we already have, insert only the new ones, and stamp
// MailItemTrackingState with the latest summary + ETA.
//
// Designed to be called by a daily/hourly cron route that grabs the N
// stalest active items so we don't blast Shippo with redundant calls.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { getTrackingStatus } from "@/lib/shippo";

// Normalize a carrier-supplied status to our coarse keys. Shippo's
// `trackingStatus.status` ladder matches USPS/UPS/FedEx semantics.
function normalizeStatusKey(raw: string | null | undefined): string {
  const s = (raw ?? "").toUpperCase();
  if (!s) return "unknown";
  if (s.includes("DELIVERED")) return "delivered";
  if (s.includes("OUT_FOR_DELIVERY") || s.includes("OUTFORDELIVERY")) return "out_for_delivery";
  if (s.includes("TRANSIT") || s.includes("INTRANSIT")) return "in_transit";
  if (s.includes("EXCEPTION") || s.includes("RETURNED")) return "exception";
  if (s.includes("PRE_TRANSIT")) return "pre_transit";
  if (s.includes("UNKNOWN")) return "unknown";
  return s.toLowerCase();
}

export async function pollMailItemTracking(mailItemId: string): Promise<{
  ok?: boolean;
  newEvents?: number;
  error?: string;
}> {
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { id: true, carrier: true, trackingNumber: true, status: true },
  });
  if (!item) return { error: "Mail item not found" };
  if (!item.carrier || !item.trackingNumber) return { error: "No carrier/tracking on file" };

  const result = await getTrackingStatus(item.carrier, item.trackingNumber);

  // Always upsert the polling state — even on error we record we tried.
  if (!result) {
    await prisma.mailItemTrackingState.upsert({
      where: { mailItemId },
      create: {
        mailItemId,
        lastPolledAt: new Date(),
        pollErrorCount: 1,
        pollLastError: "Shippo returned null",
      },
      update: {
        lastPolledAt: new Date(),
        pollErrorCount: { increment: 1 },
        pollLastError: "Shippo returned null",
      },
    });
    return { error: "Shippo unreachable or no data" };
  }

  // Insert new history events (dedup via the unique tuple). Shippo's
  // history is oldest-first usually; insert serially to keep order.
  let inserted = 0;
  for (const h of result.trackingHistory) {
    if (!h.date) continue;
    const key = normalizeStatusKey(h.status);
    try {
      await prisma.trackingEvent.create({
        data: {
          mailItemId,
          eventTimeIso: h.date,
          statusKey: key,
          statusDetails: h.status || key,
          location: h.location || null,
          source: "shippo",
        },
      });
      inserted++;
    } catch {
      // P2002 unique constraint = already inserted; skip
    }
  }

  // Stamp summary state.
  await prisma.mailItemTrackingState.upsert({
    where: { mailItemId },
    create: {
      mailItemId,
      lastPolledAt: new Date(),
      lastStatusKey: normalizeStatusKey(result.status),
      lastStatusLabel: result.status,
      lastLocation: result.location,
      etaIso: result.eta,
      pollErrorCount: 0,
      pollLastError: null,
    },
    update: {
      lastPolledAt: new Date(),
      lastStatusKey: normalizeStatusKey(result.status),
      lastStatusLabel: result.status,
      lastLocation: result.location,
      etaIso: result.eta,
      pollErrorCount: 0,
      pollLastError: null,
    },
  });

  return { ok: true, newEvents: inserted };
}

// Sweep up to N mail items that need polling. Picks active items
// (non-terminal status) with a tracking# whose lastPolledAt is null or
// older than `staleMinutes`. Conservative defaults: 60min, 50 per run.
export async function runTrackingPoll(limit = 50, staleMinutes = 60): Promise<{
  attempted: number;
  succeeded: number;
  newEvents: number;
  errors: number;
}> {
  // Authentication: cron route handles its own bearer-token check; this
  // function exposes an admin-only path for manual triggers from the
  // Insights / Operations panels.
  await verifyAdmin();

  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  // Find candidates: active items with carrier+tracking, joined with
  // their tracking state.
  const candidates = await prisma.mailItem.findMany({
    where: {
      status: { in: ["Received", "Scanned", "Awaiting Pickup", "Held"] },
      carrier: { not: null },
      trackingNumber: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 4, // overfetch — we filter by state below
    select: { id: true },
  });

  const ids = candidates.map((c) => c.id);
  const states = ids.length === 0
    ? []
    : await prisma.mailItemTrackingState.findMany({
        where: { mailItemId: { in: ids } },
        select: { mailItemId: true, lastPolledAt: true },
      });
  const stateById = new Map(states.map((s) => [s.mailItemId, s] as const));

  const stale = candidates.filter((c) => {
    const s = stateById.get(c.id);
    return !s || s.lastPolledAt == null || s.lastPolledAt < cutoff;
  }).slice(0, limit);

  let succeeded = 0, newEvents = 0, errors = 0;
  for (const c of stale) {
    const r = await pollMailItemTracking(c.id);
    if ((r as { error?: string }).error) errors++;
    else { succeeded++; newEvents += (r as { newEvents?: number }).newEvents ?? 0; }
  }

  return { attempted: stale.length, succeeded, newEvents, errors };
}

// Read API for member dashboard + public tracking page. Returns the
// last N events + the summary state in one call.
export async function getMailItemTrackingFeed(mailItemId: string, limit = 20): Promise<{
  state: { lastStatusKey: string | null; lastStatusLabel: string | null; lastLocation: string | null; etaIso: string | null; lastPolledAtIso: string | null } | null;
  events: Array<{ id: string; eventTimeIso: string; statusKey: string; statusDetails: string; location: string | null }>;
}> {
  const [state, events] = await Promise.all([
    prisma.mailItemTrackingState.findUnique({
      where: { mailItemId },
      select: { lastStatusKey: true, lastStatusLabel: true, lastLocation: true, etaIso: true, lastPolledAt: true },
    }),
    prisma.trackingEvent.findMany({
      where: { mailItemId },
      orderBy: { eventTimeIso: "desc" },
      take: limit,
      select: { id: true, eventTimeIso: true, statusKey: true, statusDetails: true, location: true },
    }),
  ]);
  return {
    state: state ? {
      lastStatusKey: state.lastStatusKey,
      lastStatusLabel: state.lastStatusLabel,
      lastLocation: state.lastLocation,
      etaIso: state.etaIso,
      lastPolledAtIso: state.lastPolledAt?.toISOString() ?? null,
    } : null,
    events,
  };
}
