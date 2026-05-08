"use server";

// iter-124/128/136 — Thermal label printer.
//
// Look up a tracking number and return everything the AdminLabelPrinter
// UI needs to render a brand-styled, print-ready 4×6 thermal label.
//
// iter-136: ONLINE lookup as the primary path. We auto-detect the
// carrier from the tracking-number pattern (UPS/USPS/FedEx/DHL/Amazon)
// and hit Shippo's tracking API for live status, location, ETA, and
// recent history. The DB is checked secondarily — if a MailItem exists
// locally for this tracking, we overlay our intake metadata (suite,
// customer, intake date, exterior photo) on top of the online data.
// This means the panel works for ANY tracking number a driver hands
// the admin, even one we've never seen before.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { detectCarrier } from "@/lib/trackingUtils";
import { getTrackingStatus, isShippoConfigured } from "@/lib/shippo";

export type OnlineTracking = {
  carrier: string;                 // detected carrier (UPS, USPS, FedEx, DHL, Amazon, Other)
  status: string | null;           // Shippo top-level status (UNKNOWN, TRANSIT, DELIVERED, RETURNED, FAILURE)
  substatus: string | null;
  location: string | null;         // last known city, state
  etaIso: string | null;           // ISO ETA when carrier provides one
  history: Array<{ dateIso: string; status: string; location: string }>;
  source: "shippo" | "carrier-detect" | "none";
  fetchedAtIso: string;
};

export type LabelData = {
  mailItemId: string | null;       // null = no DB record (online-only)
  trackingNumber: string;
  carrier: string | null;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
  recipientName: string | null;
  intakeDate: string;
  intakeAtIso: string;
  weightOz: number | null;
  dimensions: string | null;
  exteriorImageUrl: string | null;
  labelNumber: string;
  source: "online" | "db+online" | "manual"; // iter-136 — how this data was assembled
  online: OnlineTracking | null;             // iter-136 — live carrier data (null if Shippo disabled)
};

// iter-136: primary lookup — checks the carrier's tracking API FIRST for
// any tracking number admin enters. The DB is a secondary overlay so
// internally-tracked packages still autofill suite/customer details.
// Always returns `found: true` for valid tracking patterns (4+ chars)
// because manual entry is a feature, not an error.
export async function findLabelByTracking(input: { tracking: string }): Promise<{
  error?: string;
  found: boolean;
  label?: LabelData;
}> {
  await verifyAdmin();
  // iter-141 — Normalize the tracking number ONCE here so every
  // downstream lookup uses the same form. Strip whitespace (USPS labels
  // carry spaces in the printed tracking ID, e.g. "9334 6208 4550 0002
  // 4952 83") and upper-case 1Z/JD prefix carriers. Carrier detection,
  // Shippo lookup, AND DB `contains` all need the same normalized
  // string — otherwise the DB match silently misses whenever admin
  // pastes the printed-on-label form.
  const raw = input.tracking.trim();
  const q = raw.replace(/[\s-]+/g, "").toUpperCase();
  if (q.length < 4) return { found: false, error: "Enter at least 4 chars of the tracking number" };

  // Carrier auto-detection from the tracking pattern. Always succeeds
  // (returns "Other" when nothing matches) so the panel renders an
  // editable Carrier field.
  const detectedCarrier = detectCarrier(q);

  // Online lookup — runs in parallel with the DB lookup so neither
  // blocks the other. Shippo failures are silent; the panel falls back
  // to the carrier-detect-only mode in that case.
  // The DB lookup tries BOTH normalized + raw-with-spaces because we
  // can't know how it was originally stored at intake time.
  const [onlineResult, item] = await Promise.all([
    fetchOnlineTracking(detectedCarrier, q),
    prisma.mailItem.findFirst({
      where: {
        OR: [
          { trackingNumber: { contains: q } },
          { trackingNumber: { contains: raw } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, trackingNumber: true, carrier: true, recipientName: true,
        date: true, createdAt: true, weightOz: true, dimensions: true,
        exteriorImageUrl: true,
        user: { select: { name: true, email: true, suiteNumber: true } },
      },
    }),
  ]);

  // Audit-log every online lookup so we have a paper trail of what
  // tracking numbers admin queried (helps with refund disputes and
  // chain-of-custody questions). Fire-and-forget.
  void prisma.auditLog.create({
    data: {
      actorId: "system",
      actorRole: "ADMIN",
      action: "labelprinter.online_lookup",
      entityType: "tracking",
      entityId: q.slice(0, 64),
      metadata: JSON.stringify({
        carrier: detectedCarrier,
        hasMailItem: Boolean(item),
        onlineSource: onlineResult.source,
        onlineStatus: onlineResult.status,
      }),
    },
  }).catch(() => undefined);

  if (item) {
    return {
      found: true,
      label: {
        mailItemId: item.id,
        trackingNumber: item.trackingNumber ?? q,
        carrier: item.carrier ?? detectedCarrier,
        customerName: item.user?.name ?? "(unknown)",
        customerEmail: item.user?.email ?? "",
        suiteNumber: item.user?.suiteNumber ?? null,
        recipientName: item.recipientName,
        intakeDate: item.date,
        intakeAtIso: item.createdAt.toISOString(),
        weightOz: item.weightOz,
        dimensions: item.dimensions,
        exteriorImageUrl: item.exteriorImageUrl,
        labelNumber: item.id.slice(-6).toUpperCase(),
        source: "db+online",
        online: onlineResult,
      },
    };
  }

  // No local record — return an online-only label seed. Admin still
  // types the recipient/suite themselves (carrier APIs do not expose
  // label-side address details for privacy reasons).
  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return {
    found: true,
    label: {
      mailItemId: null,
      trackingNumber: q,
      carrier: detectedCarrier,
      customerName: "",
      customerEmail: "",
      suiteNumber: null,
      recipientName: null,
      intakeDate: todayStr,
      intakeAtIso: new Date().toISOString(),
      weightOz: null,
      dimensions: null,
      exteriorImageUrl: null,
      labelNumber: q.slice(-6).toUpperCase(),
      source: "online",
      online: onlineResult,
    },
  };
}

// iter-136 — Tracking-status fetcher. Tries Shippo first (works for
// every account-attached carrier we've configured). When Shippo isn't
// configured or returns nothing, we fall back to carrier-detect-only —
// the panel still gets a carrier label, just no live status feed.
async function fetchOnlineTracking(
  carrier: string,
  trackingNumber: string,
): Promise<OnlineTracking> {
  const fetchedAtIso = new Date().toISOString();
  // Shippo's tracking endpoint expects lowercase carrier slugs. Map ours.
  const slug = shippoCarrierSlug(carrier);
  if (slug && isShippoConfigured()) {
    try {
      const live = await getTrackingStatus(slug, trackingNumber);
      if (live) {
        return {
          carrier,
          status: live.status,
          substatus: live.substatus,
          location: live.location,
          etaIso: live.eta,
          history: live.trackingHistory.slice(0, 8).map((h) => ({
            dateIso: h.date,
            status: h.status,
            location: h.location,
          })),
          source: "shippo",
          fetchedAtIso,
        };
      }
    } catch {
      // Silent fall-through — never block the panel on a Shippo error.
    }
  }
  return {
    carrier,
    status: null,
    substatus: null,
    location: null,
    etaIso: null,
    history: [],
    source: slug ? "carrier-detect" : "none",
    fetchedAtIso,
  };
}

function shippoCarrierSlug(carrier: string): string | null {
  switch (carrier) {
    case "UPS":   return "ups";
    case "USPS":  return "usps";
    case "FedEx": return "fedex";
    case "DHL":   return "dhl_express";
    // Shippo doesn't support Amazon/OnTrac/LaserShip tracking through
    // the standard endpoint — bail to detect-only for those.
    default:      return null;
  }
}

// iter-128: customer search for the manual mode "addressee" autocomplete
// when admin wants to associate the label with a known suite. Lightweight
// — name / email / suite contains-match.
export async function searchCustomersForLabel(input: { query: string }): Promise<Array<{
  id: string; name: string; email: string; suiteNumber: string | null;
}>> {
  await verifyAdmin();
  const q = input.query.trim();
  if (q.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { suiteNumber: { contains: q } },
      ],
    },
    take: 6,
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
}
