"use server";

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getPlanStatus } from "@/lib/plan";
import { sendMailArrivedEmail, sendMailPickedUpEmail, sendStorageFeeChargedEmail } from "@/lib/email";
import { sendMailArrivedSms, sendMailPickedUpSms } from "@/lib/sms";
import { parsePrefs, getChannelPrefs } from "@/lib/notifPrefs";
import { notifyMailArrived, notifyMailPickedUp, notifyOversizePackage } from "@/app/actions/notifications";
import { fireWebhooks } from "@/lib/webhooks";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";
import { getActivePinsForSuite } from "@/app/actions/suitePinNotes";
import { analyzeMailItemPhoto } from "@/app/actions/aiPhotoAnalysis";

// ─── Scan-and-log inbound package ────────────────────────────────────────────
// Optimized for the storefront scan workflow: admin scans the carrier
// barcode → tracking + carrier captured → assigns to a customer (suite #
// or userId) → MailItem created → returns the id so the client can navigate
// to the printable thermal receipt at /admin/inbound/receipt/[id].
//
// Unlike `logMail` (which takes FormData and fires email/notif chains),
// this is the typed POS path. It still fires the mail-arrived notification
// + email so the customer knows their package landed, but uses simpler
// inputs because barcode-driven scans don't have weight/dims at scan time.
export async function logScannedInbound(input: {
  trackingNumber: string;
  carrier: string;
  userId?: string;        // either userId
  suiteNumber?: string;   // or suite # (we'll resolve)
  recipientName?: string;
  notes?: string;
  // Optional intake details — captured at scan time when admin pre-weighs
  // oversize packages. Skipped for typical scan-and-go workflow.
  weightOz?: number;
  dimensions?: string;
  // Optional Vercel Blob URL for an exterior photo of the package.
  exteriorImageUrl?: string;
}) {
  await verifyAdmin();

  if (!input.trackingNumber || input.trackingNumber.length < 6) {
    return { error: "Tracking number is required (≥6 chars)." };
  }

  // Resolve customer — userId wins, then suite#.
  let userId = input.userId;
  let user: { id: string; name: string | null; email: string; suiteNumber: string | null; phone: string | null; notifPrefs: string | null } | null = null;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, suiteNumber: true, phone: true, notifPrefs: true },
    });
  } else if (input.suiteNumber) {
    user = await prisma.user.findFirst({
      where: { suiteNumber: input.suiteNumber.trim() },
      select: { id: true, name: true, email: true, suiteNumber: true, phone: true, notifPrefs: true },
    });
    if (user) userId = user.id;
  }
  if (!user || !userId) {
    return { error: "Customer not found. Confirm the suite # or pick from the list." };
  }

  // Friendly date string for the date column (existing convention).
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const admin = await verifySession();
  const newMailItemId = crypto.randomUUID();

  // Atomic write — MailItem + AuditLog land together so the scan workflow
  // has the same forensic coverage as other admin paths (iter-14 sweep).
  // CMRA audit-trail requirement is "who logged which package, when".
  const [created] = await prisma.$transaction([
    prisma.mailItem.create({
      data: {
        id: newMailItemId,
        userId,
        from: input.carrier || "Unknown carrier",
        type: "Package",
        status: "Received",
        date: dateStr,
        trackingNumber: input.trackingNumber.trim(),
        carrier: input.carrier || null,
        recipientName: input.recipientName ?? user.name ?? null,
        weightOz: typeof input.weightOz === "number" && input.weightOz > 0 ? input.weightOz : null,
        dimensions: input.dimensions?.trim() || null,
        exteriorImageUrl: input.exteriorImageUrl?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "mail.intake.scan",
        entityType: "MailItem",
        entityId: newMailItemId,
        metadata: JSON.stringify({
          userId,
          suiteNumber: user.suiteNumber,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber.trim(),
          recipientName: input.recipientName ?? user.name ?? null,
          weightOz: typeof input.weightOz === "number" ? input.weightOz : null,
          dimensions: input.dimensions?.trim() || null,
          hasPhoto: !!input.exteriorImageUrl,
        }),
      },
    }),
  ]);

  // Best-effort customer notification — same fire-and-forget pattern as
  // logMail. Errors logged via EmailLog but don't block the print path.
  // Photo is included so the customer can confirm the package is theirs at
  // a glance from the email itself.
  // iter-84: gated by per-channel notifPrefs (defaults: email + in-app on,
  // sms opt-in only).
  const arrivedPrefs = getChannelPrefs(parsePrefs(user.notifPrefs), "mailArrived");
  if (arrivedPrefs.email && user.email) {
    void sendMailArrivedEmail({
      email: user.email,
      name: user.name ?? "",
      suiteNumber: user.suiteNumber ?? "",
      from: input.carrier || "Unknown",
      type: "Package",
      recipientName: input.recipientName ?? user.name ?? null,
      photoUrl: input.exteriorImageUrl ?? null,
    }).catch((e) => console.error("[logScannedInbound] email failed:", e));
  }
  if (arrivedPrefs.inApp) {
    void notifyMailArrived({
      userId,
      type: "Package",
      from: input.carrier || "Unknown",
    }).catch((e) => console.error("[logScannedInbound] notification failed:", e));
  }
  if (arrivedPrefs.sms && user.phone) {
    void sendMailArrivedSms({
      userId,
      toPhone: user.phone,
      firstName: (user.name ?? "").split(" ")[0] || "there",
      suiteNumber: user.suiteNumber ?? "—",
      type: "Package",
      from: input.carrier || "Unknown",
    }).catch((e) => console.error("[logScannedInbound] sms failed:", e));
  }

  // iter-108: AI photo analysis (Claude Vision). No-op if no API key
  // or no photo. Persists warnings on the MailItem so member + admin
  // see "🚸 fragile / ☢️ hazmat" chips on the row.
  if (input.exteriorImageUrl) {
    void analyzeMailItemPhoto({ mailItemId: newMailItemId })
      .catch((e) => console.error("[logScannedInbound] ai analysis failed:", e));
  }

  // iter-103: outbound webhook bridge (Slack/Discord). No-op if no
  // endpoints configured.
  void fireWebhooks("mail.arrived", {
    text: `Package arrived for *${user.name ?? "(unknown)"}* (suite #${user.suiteNumber ?? "—"}) — ${input.carrier} ${input.trackingNumber}`,
    emoji: "📦",
    detail: {
      userId,
      suiteNumber: user.suiteNumber ?? null,
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      recipientName: input.recipientName ?? user.name ?? null,
    },
  });

  // iter-167: member-registered webhook bridge. Fires per the OWNER's
  // own webhook subscriptions — privacy-scoped to userId, never
  // broadcasts cross-tenant. Both `package.arrived` (specific) AND
  // `mail.arrived` (generic) so members can subscribe at either
  // granularity.
  void fireMemberWebhooks(userId, "package.arrived", {
    text: `📦 Package arrived from ${input.carrier} (${input.trackingNumber})`,
    url: "https://nohomailbox.org/dashboard?tab=packages",
    detail: {
      mailItemId: created.id,
      type: "Package",
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      recipientName: input.recipientName ?? user.name ?? null,
      suiteNumber: user.suiteNumber ?? null,
    },
  });
  void fireMemberWebhooks(userId, "mail.arrived", {
    text: `📦 New ${input.carrier} package arrived`,
    url: "https://nohomailbox.org/dashboard?tab=packages",
    detail: {
      mailItemId: created.id,
      type: "Package",
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
    },
  });

  // iter-182 — Surface sticky pins for this suite so admin sees
  // "hold for K. on Tues" or "verify ID before release" the moment
  // they finish the scan. Cheap query + best-effort: if it fails the
  // intake still succeeds.
  let suitePins: Array<{ id: string; body: string; color: string }> = [];
  if (user.suiteNumber) {
    try {
      const pins = await getActivePinsForSuite(user.suiteNumber);
      suitePins = pins.map((p) => ({ id: p.id, body: p.body, color: p.color }));
    } catch { /* swallow */ }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, mailItemId: created.id, suitePins };
}

// Recent scans — last N inbound packages logged via the Scan workflow,
// surfaced at the bottom of AdminInboundScanPanel as a live audit trail
// admin can re-print receipts from. Limited to admin-scanned packages
// (type=Package + status=Received) from the last 48h to keep the list
// scoped + fresh.
export async function getRecentScans(limit = 12) {
  await verifyAdmin();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      from: true,
      recipientName: true,
      weightOz: true,
      dimensions: true,
      exteriorImageUrl: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, suiteNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    trackingNumber: r.trackingNumber ?? "",
    carrier: r.carrier ?? r.from ?? "Unknown",
    recipientName: r.recipientName ?? r.user?.name ?? "",
    suiteNumber: r.user?.suiteNumber ?? "",
    weightOz: r.weightOz,
    dimensions: r.dimensions,
    exteriorImageUrl: r.exteriorImageUrl,
    status: r.status,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// iter-56: The shelf — packages currently sitting in the bureau waiting
// for the customer to come pick them up. Oldest first so the bureau can
// see at a glance which packages have been sitting longest (storage tier
// kicks in at day 4 per Terms). Returns the same shape as getRecentScans
// so the row component can be reused; difference is the WHERE (active
// non-terminal states only) and the ORDER BY (createdAt asc).
export async function getAwaitingShelf(limit = 10) {
  await verifyAdmin();
  const rows = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      status: { in: ["Awaiting Pickup", "Received", "Scanned"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      from: true,
      recipientName: true,
      weightOz: true,
      dimensions: true,
      exteriorImageUrl: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, suiteNumber: true } },
    },
  });
  // Total count separate from the page so the header can show "Showing 10
  // of 47" without double-fetching the heavy data shape.
  const total = await prisma.mailItem.count({
    where: {
      type: "Package",
      status: { in: ["Awaiting Pickup", "Received", "Scanned"] },
    },
  });
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      trackingNumber: r.trackingNumber ?? "",
      carrier: r.carrier ?? r.from ?? "Unknown",
      recipientName: r.recipientName ?? r.user?.name ?? "",
      suiteNumber: r.user?.suiteNumber ?? "",
      weightOz: r.weightOz,
      dimensions: r.dimensions,
      exteriorImageUrl: r.exteriorImageUrl,
      status: r.status,
      createdAtIso: r.createdAt.toISOString(),
    })),
  };
}

// iter-54: Reassign a scanned mail item to a different customer. Common
// real-world need — admin scans a package, picks the wrong suite from the
// dropdown (suite #042 vs #024 fat-fingered), needs to correct it before
// the wrong customer comes to pick up. Only allowed on non-terminal
// statuses; once the package is Picked Up / Forwarded / Returned /
// Discarded the wrong customer physically has it and we can't fix it
// with a DB write. Writes a paired audit log entry so the original
// assignment + correction are both recorded.
const REASSIGN_ALLOWED_STATES = new Set([
  "Received",
  "Scanned",
  "Awaiting Pickup",
  "Held",
  "Scan Requested",
  "Forward Requested",
  "Discard Requested",
]);

export async function reassignMailItem(input: { mailItemId: string; newUserId: string }) {
  const actor = await verifyAdmin();
  const { mailItemId, newUserId } = input;
  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };
  if (!REASSIGN_ALLOWED_STATES.has(item.status)) {
    return {
      error: `Can't reassign a ${item.status.toLowerCase()} package. Once a package is in a terminal state the wrong customer already has it.`,
    };
  }
  if (item.userId === newUserId) {
    return { error: "Already assigned to this customer." };
  }
  const newOwner = await prisma.user.findUnique({
    where: { id: newUserId },
    select: { id: true, name: true, suiteNumber: true, email: true },
  });
  if (!newOwner) return { error: "Customer not found" };

  const fromUserId = item.userId;
  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: mailItemId },
      data: {
        userId: newUserId,
        // Reset recipientName to the new owner's name unless admin had
        // typed a custom override different from any default — best effort.
        recipientName: newOwner.name ?? item.recipientName,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mail.reassign",
        entityType: "MailItem",
        entityId: mailItemId,
        metadata: JSON.stringify({
          fromUserId,
          toUserId: newUserId,
          toSuite: newOwner.suiteNumber ?? null,
          status: item.status,
        }),
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, newOwner };
}

// Today's intake snapshot for the InboundScanPanel header card.
// "Today" = since local-midnight (server is in storefront's TZ — Tunis).
// We expose four counts the bureau cares about during open hours:
//   - scannedToday: every package logged since midnight (intake throughput)
//   - awaitingPickup: currently on the shelf, ready for handoff
//   - pickedUpToday: handed off since midnight (pickup throughput)
//   - heldRightNow: on the Held shelf (vacation / customer asked to hold)
// All counts are best-effort — if the query times out we return zeros so
// the panel still renders.
export async function getTodaysIntakeStats() {
  await verifyAdmin();
  // Local-midnight in the server's TZ. Storefront is in Tunis; the prod
  // server runs UTC, so we approximate "today" as 00:00 server time which
  // is one Tunis hour off in winter, two in summer. Acceptable drift for a
  // standup-style stat panel.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // iter-64: Yesterday window = [yesterday-midnight, today-midnight). Used
  // for trend deltas in the UI ("scanned today: 12 ▲+3 vs yesterday").
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  try {
    const [
      scannedToday, awaitingPickup, pickedUpToday, heldRightNow, dropoffsToday,
      scannedYesterday, pickedUpYesterday, dropoffsYesterday,
    ] = await Promise.all([
      prisma.mailItem.count({
        where: { type: "Package", createdAt: { gte: today } },
      }),
      prisma.mailItem.count({
        where: { type: "Package", status: { in: ["Awaiting Pickup", "Received", "Scanned"] } },
      }),
      // MailItem has no updatedAt column. Count audit-log entries created
      // by updateMailStatus when the destination is "Picked Up" — same data
      // we'd derive from updatedAt and properly attributed to an actor.
      // Pre-iter-50 status updates didn't write to AuditLog so this count
      // will be 0 for older items; that's the best we can do without a
      // backfill or schema migration. Hot-path index on (action, entityId,
      // createdAt) keeps this cheap.
      prisma.auditLog.count({
        where: {
          entityType: "MailItem",
          action: "mail.status.picked_up",
          createdAt: { gte: today },
        },
      }),
      prisma.mailItem.count({
        where: { type: "Package", status: "Held" },
      }),
      // iter-60: External dropoff throughput. Different table; same "today
      // since midnight" filter. ExternalDropoff DOES have createdAt so we
      // can count it directly without going through AuditLog.
      prisma.externalDropoff.count({
        where: { createdAt: { gte: today } },
      }),
      // iter-64: Yesterday counterparts for the three flow metrics. We
      // skip "Awaiting Pickup" and "Held" because those are point-in-time
      // states, not flow.
      prisma.mailItem.count({
        where: { type: "Package", createdAt: { gte: yesterday, lt: today } },
      }),
      prisma.auditLog.count({
        where: {
          entityType: "MailItem",
          action: "mail.status.picked_up",
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.externalDropoff.count({
        where: { createdAt: { gte: yesterday, lt: today } },
      }),
    ]);
    return {
      scannedToday, awaitingPickup, pickedUpToday, heldRightNow, dropoffsToday,
      scannedYesterday, pickedUpYesterday, dropoffsYesterday,
    };
  } catch (e) {
    console.error("[getTodaysIntakeStats] failed:", e);
    return {
      scannedToday: 0, awaitingPickup: 0, pickedUpToday: 0, heldRightNow: 0, dropoffsToday: 0,
      scannedYesterday: 0, pickedUpYesterday: 0, dropoffsYesterday: 0,
    };
  }
}

// iter-74: Re-fire the mail-arrived email + in-app notification for a
// package that's been on the shelf too long. Used by the "Nudge customer"
// button in the stale-row UI. Throttled — refuses to nudge the same item
// more than once per 24h to prevent admin from blasting the same customer.
export async function nudgeStaleCustomer(mailItemId: string) {
  const actor = await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: {
      id: true,
      type: true,
      from: true,
      status: true,
      recipientName: true,
      exteriorImageUrl: true,
      userId: true,
      user: { select: { name: true, email: true, suiteNumber: true } },
    },
  });
  if (!item) return { error: "Mail item not found" };
  if (!item.user?.email) return { error: "No email on file for this customer." };
  // Sanity gate — only nudge active packages. Picked-up customers don't
  // need a reminder; a "your package arrived" email after pickup is
  // confusing and embarrassing.
  if (!["Received", "Scanned", "Awaiting Pickup", "Held"].includes(item.status)) {
    return { error: `Can't nudge a ${item.status.toLowerCase()} package.` };
  }
  // Throttle: refuse if the last nudge for this item was <24h ago.
  const lastNudge = await prisma.auditLog.findFirst({
    where: { entityType: "MailItem", entityId: mailItemId, action: "mail.nudge" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastNudge && Date.now() - lastNudge.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    const hoursAgo = Math.round((Date.now() - lastNudge.createdAt.getTime()) / (60 * 60 * 1000));
    return { error: `Already nudged ${hoursAgo}h ago. Wait 24h between nudges.` };
  }

  // Fire-and-await both the email + in-app notification + audit log
  // sequentially. If any of them fails we still log so admin knows the
  // attempt happened.
  const failures: string[] = [];
  try {
    await sendMailArrivedEmail({
      email: item.user.email,
      name: item.user.name ?? "",
      suiteNumber: item.user.suiteNumber ?? "—",
      from: item.from,
      type: item.type === "Package" ? "Package" : "Letter",
      recipientName: item.recipientName ?? null,
      photoUrl: item.exteriorImageUrl ?? null,
    });
  } catch (e) {
    console.error("[nudgeStaleCustomer] email failed:", e);
    failures.push("email");
  }
  try {
    await notifyMailArrived({
      userId: item.userId,
      from: item.from,
      type: item.type === "Package" ? "Package" : "Letter",
      mailItemId: item.id,
    });
  } catch (e) {
    console.error("[nudgeStaleCustomer] notification failed:", e);
    failures.push("notification");
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "mail.nudge",
      entityType: "MailItem",
      entityId: mailItemId,
      metadata: JSON.stringify({ failures, type: item.type, status: item.status }),
    },
  });

  if (failures.length === 0) {
    return { success: true };
  }
  return { partial: true, failures, message: `Sent with errors: ${failures.join(", ")}` };
}

// iter-76: Customer pickup search — when a walk-in customer at the
// counter doesn't know their tracking number ("I'm here for my package"),
// admin types their name/suite/email and we return matching customers
// with their currently-active packages embedded so admin can pick the
// right one and one-tap confirm pickup.
//
// Reuses the same active-state filter as the rest of the pickup flow so
// terminal items don't show up. Cap of 4 customers + 6 packages each
// keeps the response tight.
export async function findCustomersWithActivePackages(query: string) {
  await verifyAdmin();
  const q = (query ?? "").trim();
  if (!q) return [];
  const customers = await prisma.user.findMany({
    where: {
      OR: [
        { suiteNumber: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
      ],
      // Only customers — admin/staff users don't get inbound packages.
      role: { not: "ADMIN" },
    },
    orderBy: { suiteNumber: "asc" },
    take: 4,
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      mailItems: {
        where: {
          type: "Package",
          status: { in: ["Awaiting Pickup", "Received", "Scanned"] },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          trackingNumber: true,
          carrier: true,
          from: true,
          recipientName: true,
          status: true,
          exteriorImageUrl: true,
          createdAt: true,
        },
      },
    },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    suiteNumber: c.suiteNumber,
    activePackages: c.mailItems.map((m) => ({
      ...m,
      createdAtIso: m.createdAt.toISOString(),
    })),
  }));
}

// iter-73: Universal tracking-number lookup. Used by /admin/lookup for
// "where's my package?" calls — admin types a tracking #, we search both
// MailItem (any status) and ExternalDropoff. Includes audit-log entries
// for the matching MailItem so admin can see the full lifecycle. No
// time window — looks back across all history (the index on
// trackingNumber keeps it cheap).
export async function lookupAnyPackage(query: string) {
  await verifyAdmin();
  const q = (query ?? "").trim();
  if (!q || q.length < 4) return { mailItems: [], dropoffs: [], audit: [] };

  const [mailItems, dropoffs] = await Promise.all([
    prisma.mailItem.findMany({
      where: { trackingNumber: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        from: true,
        recipientName: true,
        status: true,
        weightOz: true,
        dimensions: true,
        exteriorImageUrl: true,
        createdAt: true,
        user: { select: { id: true, name: true, suiteNumber: true, email: true } },
      },
    }),
    prisma.externalDropoff.findMany({
      where: { trackingNumber: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        senderName: true,
        receiverName: true,
        destination: true,
        status: true,
        exteriorImageUrl: true,
        createdAt: true,
        carrierPickedUpAt: true,
      },
    }),
  ]);

  // Pull the full audit trail for the matching MailItems so the page can
  // show "scanned by X at Y → picked up by Z at W" timeline.
  const ids = mailItems.map((m) => m.id);
  const audit = ids.length === 0
    ? []
    : await prisma.auditLog.findMany({
        where: { entityType: "MailItem", entityId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, entityId: true, createdAt: true, metadata: true, actorId: true },
      });

  return {
    mailItems: mailItems.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    dropoffs: dropoffs.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      carrierPickedUpAt: d.carrierPickedUpAt?.toISOString() ?? null,
    })),
    audit: audit.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  };
}

// iter-66: Daily activity export. Returns a flat list of rows for today's
// inbound scans, pickup audit-log entries, and external dropoffs — three
// streams unified under one shape so the bureau can paste a single CSV
// into accounting or end-of-day reports. Sorted newest first (chronologic
// is more natural for a daily log than the in-memory grouping).
export async function getTodaysActivityForExport() {
  await verifyAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [scans, pickups, dropoffs] = await Promise.all([
    prisma.mailItem.findMany({
      where: { type: "Package", createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        from: true,
        recipientName: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, suiteNumber: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: "MailItem",
        action: "mail.status.picked_up",
        createdAt: { gte: today },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityId: true,
        createdAt: true,
        actorId: true,
      },
    }),
    prisma.externalDropoff.findMany({
      where: { createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        senderName: true,
        receiverName: true,
        destination: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  // Hydrate the picked-up audit log with the MailItem details so the CSV
  // row is self-contained. (The MailItem might have been further updated,
  // but for a daily report the current snapshot is fine.)
  const pickupItems = pickups.length === 0
    ? []
    : await prisma.mailItem.findMany({
        where: { id: { in: pickups.map((p) => p.entityId).filter((x): x is string => Boolean(x)) } },
        select: {
          id: true,
          trackingNumber: true,
          carrier: true,
          recipientName: true,
          user: { select: { name: true, suiteNumber: true } },
        },
      });
  const pickupItemById = new Map(pickupItems.map((m) => [m.id, m] as const));

  type Row = {
    timeIso: string;
    kind: "Scan" | "Pickup" | "Dropoff";
    tracking: string;
    carrier: string;
    party: string;       // recipient (scan/pickup) or sender→receiver (dropoff)
    suite: string;
    status: string;
  };
  const rows: Row[] = [];
  for (const s of scans) {
    rows.push({
      timeIso: s.createdAt.toISOString(),
      kind: "Scan",
      tracking: s.trackingNumber ?? "",
      carrier: s.carrier ?? s.from ?? "",
      party: s.recipientName ?? s.user?.name ?? "",
      suite: s.user?.suiteNumber ?? "",
      status: s.status,
    });
  }
  for (const p of pickups) {
    const m = p.entityId ? pickupItemById.get(p.entityId) : undefined;
    rows.push({
      timeIso: p.createdAt.toISOString(),
      kind: "Pickup",
      tracking: m?.trackingNumber ?? "",
      carrier: m?.carrier ?? "",
      party: m?.recipientName ?? m?.user?.name ?? "",
      suite: m?.user?.suiteNumber ?? "",
      status: "Picked Up",
    });
  }
  for (const d of dropoffs) {
    const party = [d.senderName, d.receiverName].filter(Boolean).join(" → ");
    rows.push({
      timeIso: d.createdAt.toISOString(),
      kind: "Dropoff",
      tracking: d.trackingNumber,
      carrier: d.carrier,
      party: party || (d.destination ?? ""),
      suite: "",
      status: d.status,
    });
  }
  // Newest first for the CSV body — mirrors how admin reads the panel.
  rows.sort((a, b) => (a.timeIso < b.timeIso ? 1 : -1));
  return rows;
}

// Pickup-mode lookup — admin scans/types a tracking # at the counter and
// we return the matching active MailItem so they can confirm "in person
// handoff" with a single tap. Active = non-terminal status; we exclude
// Picked Up / Forwarded / Returned / Discarded so admin doesn't accidentally
// re-flip a closed item. If multiple matches exist we return the most
// recent (rare — duplicate tracking #s from different carriers can collide
// on short ranges, but the most-recent active one is what's at the counter).
export async function findMailItemForPickup(trackingFragment: string) {
  await verifyAdmin();
  const q = (trackingFragment ?? "").trim();
  if (!q || q.length < 4) return { match: null as null };
  // Exact match first, then trailing-fragment match (the human reads the
  // last 6+ chars off the carrier label, which is what most scanners catch).
  const candidates = await prisma.mailItem.findMany({
    where: {
      trackingNumber: { contains: q },
      status: { notIn: ["Picked Up", "Forwarded", "Returned", "Discarded"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      from: true,
      recipientName: true,
      exteriorImageUrl: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true, suiteNumber: true } },
    },
  });
  if (candidates.length === 0) return { match: null as null };
  const r = candidates[0];
  return {
    match: {
      id: r.id,
      trackingNumber: r.trackingNumber ?? "",
      carrier: r.carrier ?? r.from ?? "Unknown",
      recipientName: r.recipientName ?? r.user?.name ?? "",
      suiteNumber: r.user?.suiteNumber ?? "",
      email: r.user?.email ?? "",
      exteriorImageUrl: r.exteriorImageUrl,
      status: r.status,
      createdAtIso: r.createdAt.toISOString(),
    },
    duplicates: candidates.length - 1, // > 0 means admin should double-check
  };
}

// Customer-resolution helpers for the scan UI — admin types a fragment
// (suite # or name), we return up to 8 matches.
export async function findCustomersForScan(query: string) {
  await verifyAdmin();
  const q = (query ?? "").trim();
  if (!q) return [];
  const all = await prisma.user.findMany({
    where: {
      OR: [
        { suiteNumber: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
      ],
    },
    orderBy: { suiteNumber: "asc" },
    take: 8,
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true },
  });
  return all;
}

// Allowed mail-item lifecycle transitions. The keys are the statuses we
// know exist in the wild; the values are the statuses each can move to. A
// "Picked Up" item shouldn't be re-Received; a "Discarded" item is terminal.
// Admin can override via a separate adminForceStatus action (TODO if needed),
// but the daily-ops UI must respect the lifecycle so accidental clicks don't
// destroy customer history.
const MAIL_STATUS_TRANSITIONS: Record<string, string[]> = {
  Received: ["Scanned", "Awaiting Pickup", "Held", "Scan Requested", "Forward Requested", "Discard Requested", "Picked Up"],
  Scanned: ["Awaiting Pickup", "Held", "Forward Requested", "Discard Requested", "Picked Up"],
  "Awaiting Pickup": ["Picked Up", "Held", "Forward Requested", "Discard Requested", "Returned"],
  Held: ["Awaiting Pickup", "Forwarded", "Returned", "Discarded"],
  "Scan Requested": ["Scanned", "Awaiting Pickup"],
  "Forward Requested": ["Forwarded", "Awaiting Pickup"],
  "Discard Requested": ["Discarded", "Awaiting Pickup"],
  // Terminal states: empty array.
  "Picked Up": [],
  Forwarded: [],
  Returned: [],
  Discarded: [],
};

// iter-93 — Public share token for /p/[id] tracking page. Lazy-mints
// the token on first share. Idempotent — re-share returns the same
// token. Member-only — guests can't share other people's packages.

const PUBLIC_SHARE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export async function ensureMailPublicShareToken(mailItemId: string): Promise<{ error?: string; token?: string }> {
  const session = await verifySession();
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { id: true, userId: true, publicShareToken: true },
  });
  if (!item) return { error: "Mail item not found" };
  if (item.userId !== session.id && session.role !== "ADMIN") return { error: "Not authorized" };
  if (item.publicShareToken) return { token: item.publicShareToken };

  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const token = Array.from(bytes, (b) => PUBLIC_SHARE_ALPHABET[b % PUBLIC_SHARE_ALPHABET.length]).join("");

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: mailItemId },
      data: { publicShareToken: token },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.id,
        actorRole: session.role,
        action: "mail.share_token_created",
        entityType: "MailItem",
        entityId: mailItemId,
        metadata: JSON.stringify({ tokenTail: token.slice(-6) }),
      },
    }),
  ]);
  return { token };
}

// Public read by mailItemId + token (no auth). Returns enough to render
// the public tracking page without exposing other customer data. The
// status timeline is built from the AuditLog (every status flip writes
// `mail.status.{newStatus}` so we can reconstruct what happened).
// iter-94: also returns carrier API events + summary state.
export async function getMailPublicShareView(mailItemId: string, token: string): Promise<{
  error?: string;
  view?: {
    id: string;
    from: string;
    type: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    exteriorImageUrl: string | null;
    recipientName: string | null;
    weightOz: number | null;
    dimensions: string | null;
    createdAtIso: string;
    suiteNumber: string | null;
    customerInitials: string;
    timeline: Array<{ id: string; action: string; createdAtIso: string; metadata: string | null }>;
    trackingEvents: Array<{ id: string; eventTimeIso: string; statusKey: string; statusDetails: string; location: string | null; source: string }>;
    trackingState: { statusKey: string | null; statusLabel: string | null; location: string | null; etaIso: string | null; polledAtIso: string | null } | null;
  };
}> {
  const t = (token ?? "").trim();
  if (!t || t.length < 10) return { error: "Invalid share link" };
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: {
      id: true,
      from: true,
      type: true,
      status: true,
      carrier: true,
      trackingNumber: true,
      exteriorImageUrl: true,
      recipientName: true,
      weightOz: true,
      dimensions: true,
      createdAt: true,
      publicShareToken: true,
      user: { select: { name: true, suiteNumber: true } },
    },
  });
  if (!item) return { error: "Package not found" };
  if (!item.publicShareToken || item.publicShareToken !== t) return { error: "Invalid share link" };

  const [timeline, trackingEvents, trackingState] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityType: "MailItem",
        entityId: mailItemId,
        action: { startsWith: "mail." },
      },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: { id: true, action: true, createdAt: true, metadata: true },
    }),
    // iter-94: include carrier API events for the public timeline.
    prisma.trackingEvent.findMany({
      where: { mailItemId },
      orderBy: { eventTimeIso: "asc" },
      take: 50,
      select: { id: true, eventTimeIso: true, statusKey: true, statusDetails: true, location: true, source: true },
    }),
    prisma.mailItemTrackingState.findUnique({
      where: { mailItemId },
      select: { lastStatusKey: true, lastStatusLabel: true, lastLocation: true, etaIso: true, lastPolledAt: true },
    }),
  ]);

  const initials = (item.user?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "—";

  return {
    view: {
      id: item.id,
      from: item.from,
      type: item.type,
      status: item.status,
      carrier: item.carrier,
      trackingNumber: item.trackingNumber,
      exteriorImageUrl: item.exteriorImageUrl,
      recipientName: item.recipientName,
      weightOz: item.weightOz,
      dimensions: item.dimensions,
      createdAtIso: item.createdAt.toISOString(),
      suiteNumber: item.user?.suiteNumber ?? null,
      customerInitials: initials,
      timeline: timeline.map((t) => ({
        id: t.id,
        action: t.action,
        createdAtIso: t.createdAt.toISOString(),
        metadata: t.metadata,
      })),
      trackingEvents: trackingEvents.map((e) => ({
        id: e.id,
        eventTimeIso: e.eventTimeIso,
        statusKey: e.statusKey,
        statusDetails: e.statusDetails,
        location: e.location,
        source: e.source,
      })),
      trackingState: trackingState ? {
        statusKey: trackingState.lastStatusKey,
        statusLabel: trackingState.lastStatusLabel,
        location: trackingState.lastLocation,
        etaIso: trackingState.etaIso,
        polledAtIso: trackingState.lastPolledAt?.toISOString() ?? null,
      } : null,
    },
  };
}

// iter-91 — Insurance / declared-value workflow.
//
// Customer self-declares value on a package they're tracking. Server
// computes the cheapest tier that covers it, debits wallet for the fee
// (clamps to balance — residual not allowed for insurance, must be
// paid in full), records declaredValueCents + insuranceFeeCents on the
// MailItem, audits + emails. Fully idempotent — re-declares replace
// the previous record (and we refund/charge the difference).

import { INSURANCE_TIERS, pickTier, MAX_INSURED_VALUE_CENTS } from "@/lib/insurance";
import { sendPackageInsuredEmail } from "@/lib/email";

export async function declareInsuranceValue(input: { mailItemId: string; declaredValueCents: number }): Promise<{
  error?: string;
  success?: boolean;
  tier?: { id: string; label: string; feeCents: number };
  walletBalanceCents?: number;
}> {
  const session = await verifySession();
  const value = Math.max(0, Math.floor(input.declaredValueCents));
  if (value > MAX_INSURED_VALUE_CENTS) {
    return { error: `Maximum insured value is $${(MAX_INSURED_VALUE_CENTS / 100).toFixed(0)}.` };
  }
  const tier = pickTier(value);
  if (!tier) return { error: "Could not pick a coverage tier for that amount." };

  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, userId: true, status: true, carrier: true, trackingNumber: true, insuranceFeeCents: true },
  });
  if (!item) return { error: "Mail item not found" };
  if (item.userId !== session.id && session.role !== "ADMIN") return { error: "Not authorized" };
  // Insurance only applies while the package is in our custody.
  if (["Picked Up", "Forwarded", "Returned", "Discarded"].includes(item.status)) {
    return { error: "Can't add insurance to a closed package." };
  }

  // Compute net change: refund any previous fee, charge the new tier's fee.
  const previousFee = item.insuranceFeeCents ?? 0;
  const netChargeCents = tier.feeCents - previousFee;

  const owner = await prisma.user.findUnique({
    where: { id: item.userId },
    select: { walletBalanceCents: true, email: true, name: true, suiteNumber: true },
  });
  if (!owner) return { error: "Customer not found" };

  if (netChargeCents > 0 && owner.walletBalanceCents < netChargeCents) {
    return { error: `Need ${(netChargeCents / 100).toFixed(2)} in wallet — current balance ${(owner.walletBalanceCents / 100).toFixed(2)}. Top up and try again.` };
  }

  const newBalance = owner.walletBalanceCents - netChargeCents;

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: item.id },
      data: { declaredValueCents: value, insuranceFeeCents: tier.feeCents },
    }),
    prisma.user.update({
      where: { id: item.userId },
      data: { walletBalanceCents: newBalance },
    }),
    prisma.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        userId: item.userId,
        kind: netChargeCents >= 0 ? "Charge" : "Refund",
        amountCents: -netChargeCents,
        description: netChargeCents === 0
          ? `Insurance updated · ${tier.label} (no charge)`
          : netChargeCents > 0
          ? `Package insurance · ${tier.label} (declared $${(value / 100).toFixed(2)})`
          : `Insurance refund · adjusted to ${tier.label}`,
        balanceAfterCents: newBalance,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.id,
        actorRole: session.role,
        action: "mail.insurance_declared",
        entityType: "MailItem",
        entityId: item.id,
        metadata: JSON.stringify({
          declaredValueCents: value,
          tierId: tier.id,
          tierLabel: tier.label,
          feeCents: tier.feeCents,
          previousFeeCents: previousFee,
          netChargeCents,
          newWalletBalance: newBalance,
        }),
      },
    }),
  ]);

  // Receipt email — best-effort.
  if (owner.email) {
    void sendPackageInsuredEmail({
      email: owner.email,
      name: owner.name ?? "",
      suiteNumber: owner.suiteNumber ?? "—",
      carrier: item.carrier,
      trackingNumber: item.trackingNumber,
      declaredValueCents: value,
      tierLabel: tier.label,
      feeCents: tier.feeCents,
      newWalletBalanceCents: newBalance,
    }).catch((e) => console.error("[declareInsuranceValue] email failed:", e));
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return {
    success: true,
    tier: { id: tier.id, label: tier.label, feeCents: tier.feeCents },
    walletBalanceCents: newBalance,
  };
}

// Public read of the tier ladder so the UI can render a picker without
// re-importing the lib client-side. (The lib is pure, but co-locating
// keeps the component import surface tidy.)
export async function getInsuranceTiers() {
  return INSURANCE_TIERS;
}

// iter-87 — Storage-fee billing on pickup confirm.
//
// Per Terms: $6.50/day starts day 4 of shelf storage. This helper:
//   - is idempotent via MailItem.feeChargedCents (skip if already set)
//   - computes billable = max(0, daysOnShelf - 3) × $6.50
//   - debits wallet up to balance; residual becomes an open Invoice
//   - writes WalletTransaction + AuditLog atomically
//   - fires the storage-fee receipt email (best-effort)
//
// Returns a small shape so the caller can log + decide whether to surface
// the charge in the response. Errors are swallowed so a billing outage
// never blocks the pickup status flip.

const STORAGE_FREE_DAYS = 3;
const STORAGE_RATE_CENTS = 650;

async function applyStorageFeeOnPickup(args: {
  mailItem: { id: string; createdAt: Date; feeChargedCents: number | null };
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string;
  ownerSuiteNumber: string | null;
  actorId: string;
  actorRole: string;
}): Promise<{ skipped?: boolean; chargedCents?: number; walletDebitCents?: number; invoiceCents?: number }> {
  const m = args.mailItem;
  if (m.feeChargedCents != null) return { skipped: true }; // idempotency

  const daysOnShelf = Math.floor((Date.now() - m.createdAt.getTime()) / (24 * 60 * 60 * 1000));
  const billableDays = daysOnShelf - STORAGE_FREE_DAYS;
  if (billableDays <= 0) return { skipped: true };

  // iter-142 — Tiered storage fee math. Replaces the flat
  // `billableDays × $6.50` calculation: graduated rates kick in at
  // days 14, 30, 60 so long-shelved packages cost more — matches the
  // tier-graduation alerts the customer received.
  const { tieredStorageFeeCents } = await import("@/app/actions/storageTierSweep");
  const totalCents = await tieredStorageFeeCents(daysOnShelf);
  void STORAGE_RATE_CENTS; // legacy constant retained for telemetry comments
  if (totalCents <= 0) return { skipped: true };

  // Read wallet balance INSIDE the transaction to avoid a race with
  // any concurrent debit — Prisma's $transaction gives us serialization.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.findUnique({
        where: { id: args.ownerId },
        select: { walletBalanceCents: true },
      });
      const walletBalance = owner?.walletBalanceCents ?? 0;
      const walletDebit = Math.min(totalCents, walletBalance);
      const invoiceCents = totalCents - walletDebit;
      const newBalance = walletBalance - walletDebit;

      // Mark the MailItem so the next tick can't re-charge.
      await tx.mailItem.update({
        where: { id: m.id },
        data: { feeChargedCents: totalCents },
      });

      if (walletDebit > 0) {
        await tx.user.update({
          where: { id: args.ownerId },
          data: { walletBalanceCents: newBalance },
        });
        await tx.walletTransaction.create({
          data: {
            id: crypto.randomUUID(),
            userId: args.ownerId,
            kind: "Charge",
            amountCents: -walletDebit,
            description: `Storage fee · ${billableDays} day${billableDays === 1 ? "" : "s"} × $${(STORAGE_RATE_CENTS / 100).toFixed(2)} (suite #${args.ownerSuiteNumber ?? "—"})`,
            balanceAfterCents: newBalance,
          },
        });
      }

      if (invoiceCents > 0) {
        // Number scheme matches the existing convention (timestamp-based).
        const invNumber = `STO-${Date.now().toString(36).toUpperCase()}-${m.id.slice(0, 4)}`;
        await tx.invoice.create({
          data: {
            id: crypto.randomUUID(),
            userId: args.ownerId,
            number: invNumber,
            kind: "Storage",
            description: `Storage fee residual · ${billableDays} day${billableDays === 1 ? "" : "s"} on shelf for suite #${args.ownerSuiteNumber ?? "—"}`,
            amountCents: invoiceCents,
            taxCents: 0,
            totalCents: invoiceCents,
            status: "Sent",
            sentAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: args.actorId,
          actorRole: args.actorRole,
          action: "mail.storage_fee_charged",
          entityType: "MailItem",
          entityId: m.id,
          metadata: JSON.stringify({
            daysOnShelf,
            billableDays,
            ratePerDayCents: STORAGE_RATE_CENTS,
            totalCents,
            walletDebit,
            invoiceCents,
            newWalletBalance: newBalance,
          }),
        },
      });

      return { totalCents, walletDebit, invoiceCents, newBalance };
    });

    // Receipt email (best-effort, outside the transaction).
    if (args.ownerEmail) {
      try {
        await sendStorageFeeChargedEmail({
          email: args.ownerEmail,
          name: args.ownerName ?? "",
          suiteNumber: args.ownerSuiteNumber ?? "—",
          daysOnShelf,
          billableDays,
          ratePerDayCents: STORAGE_RATE_CENTS,
          walletDebitCents: result.walletDebit,
          invoiceCents: result.invoiceCents,
          newWalletBalanceCents: result.newBalance,
        });
      } catch (e) {
        console.error("[applyStorageFeeOnPickup] email failed:", e);
      }
    }

    return { chargedCents: result.totalCents, walletDebitCents: result.walletDebit, invoiceCents: result.invoiceCents };
  } catch (e) {
    console.error("[applyStorageFeeOnPickup] charge failed:", e);
    return {};
  }
}

export async function updateMailStatus(mailItemId: string, newStatus: string) {
  const user = await verifySession();

  // Verify ownership or admin
  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  if (item.userId !== user.id && user.role !== "ADMIN") {
    return { error: "Not authorized" };
  }

  // State-machine guard — was completely unguarded before. Admin (or
  // customer for their own item) could flip Received → Picked Up directly,
  // bypassing notifications, billing, and audit trails. Reject moves that
  // aren't in the allowed transitions table.
  const allowed = MAIL_STATUS_TRANSITIONS[item.status];
  if (allowed === undefined) {
    // Unknown current status — admin may have older data; let it through
    // but log so we notice if the table needs more entries.
    console.warn(`[updateMailStatus] unknown source status "${item.status}" on item ${mailItemId}`);
  } else if (!allowed.includes(newStatus)) {
    return {
      error: `Can't transition from "${item.status}" to "${newStatus}". Valid next states: ${allowed.join(", ") || "(terminal)"}.`,
    };
  }

  // iter-50: Atomic update + audit log so we have a permanent trail of
  // who flipped what to what (the bureau needs this for compliance + the
  // "picked up today" stat needs queryable timestamps). Pre-iter-50 there
  // was no record of the actor on a status change.
  const fromStatus = item.status;
  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: mailItemId },
      data: {
        status: newStatus,
        scanned: newStatus === "Scanned" ? true : undefined,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: `mail.status.${newStatus.toLowerCase().replace(/\s+/g, "_")}`,
        entityType: "MailItem",
        entityId: mailItemId,
        metadata: JSON.stringify({ from: fromStatus, to: newStatus }),
      },
    }),
  ]);

  // iter-51: Pickup confirmation email — fire-and-forget so a Resend
  // outage doesn't fail the status flip. The customer just got their
  // package in person; the email is a paper-trail courtesy.
  // iter-61: + in-app Notification (dashboard bell + push if enabled).
  // iter-84: + SMS via Twilio when customer opted in. Each channel gated
  // independently by parsePrefs(owner.notifPrefs).packagePickedUp.
  if (newStatus === "Picked Up") {
    void (async () => {
      const owner = await prisma.user.findUnique({
        where: { id: item.userId },
        select: { name: true, email: true, phone: true, suiteNumber: true, notifPrefs: true },
      });
      if (!owner) return;

      // iter-87: Auto-bill storage fee if the package was on the shelf
      // > 3 days. Idempotent (skips if MailItem.feeChargedCents already
      // set). Runs FIRST so the receipt email follows the pickup-confirm
      // email naturally (one is "you got your package", the other is
      // "and here's the storage charge"). Re-fetch the item to get
      // current feeChargedCents value (item from line 970+ may be stale).
      try {
        const fresh = await prisma.mailItem.findUnique({
          where: { id: mailItemId },
          select: { id: true, createdAt: true, feeChargedCents: true },
        });
        if (fresh && owner.email) {
          await applyStorageFeeOnPickup({
            mailItem: fresh,
            ownerId: item.userId,
            ownerName: owner.name,
            ownerEmail: owner.email,
            ownerSuiteNumber: owner.suiteNumber,
            actorId: user.id,
            actorRole: user.role,
          });
        }
      } catch (e) { console.error("[updateMailStatus] applyStorageFeeOnPickup failed:", e); }

      const prefs = getChannelPrefs(parsePrefs(owner.notifPrefs), "packagePickedUp");
      // iter-92: Mint a feedback token + include the link in the email.
      let feedbackToken: string | undefined;
      try {
        const { ensurePickupSurveyToken } = await import("@/app/actions/pickupSurvey");
        const r = await ensurePickupSurveyToken({ mailItemId, userId: item.userId });
        feedbackToken = r.token;
      } catch (e) { console.error("[updateMailStatus] ensurePickupSurveyToken failed:", e); }

      if (prefs.email && owner.email) {
        try {
          // iter-137 — Pull the captured signature off the row so the
          // receipt email shows it. Re-fetch to get the freshest values
          // since `recordPickupSignature` writes happen just before
          // `updateMailStatus("Picked Up")` from the admin pickup flow.
          const sigRow = await prisma.mailItem.findUnique({
            where: { id: mailItemId },
            select: { pickupSignatureSvg: true, pickupSignerName: true },
          });
          await sendMailPickedUpEmail({
            email: owner.email,
            name: owner.name ?? "",
            suiteNumber: owner.suiteNumber ?? "—",
            carrier: item.carrier,
            trackingNumber: item.trackingNumber,
            pickedUpAt: new Date(),
            feedbackToken,
            signatureSvg: sigRow?.pickupSignatureSvg ?? null,
            signerName: sigRow?.pickupSignerName ?? null,
          });
        } catch (e) { console.error("[updateMailStatus] sendMailPickedUpEmail failed:", e); }
      }
      if (prefs.inApp) {
        try {
          await notifyMailPickedUp({
            userId: item.userId,
            carrier: item.carrier,
            trackingNumber: item.trackingNumber,
          });
        } catch (e) { console.error("[updateMailStatus] notifyMailPickedUp failed:", e); }
      }
      if (prefs.sms && owner.phone) {
        try {
          await sendMailPickedUpSms({
            userId: item.userId,
            toPhone: owner.phone,
            firstName: (owner.name ?? "").split(" ")[0] || "there",
            suiteNumber: owner.suiteNumber ?? "—",
            carrier: item.carrier,
            trackingNumber: item.trackingNumber,
          });
        } catch (e) { console.error("[updateMailStatus] sendMailPickedUpSms failed:", e); }
      }
      // iter-103: outbound webhook bridge.
      try {
        await fireWebhooks("mail.picked_up", {
          text: `*${owner.name ?? "(unknown)"}* (suite #${owner.suiteNumber ?? "—"}) picked up ${item.carrier ?? "package"} ${item.trackingNumber ?? ""}`.trim(),
          emoji: "✅",
          detail: {
            userId: item.userId,
            suiteNumber: owner.suiteNumber ?? null,
            carrier: item.carrier ?? null,
            trackingNumber: item.trackingNumber ?? null,
          },
        });
      } catch (e) { console.error("[updateMailStatus] fireWebhooks failed:", e); }
      // iter-167: member-registered webhook bridge. Fires to the
      // OWNER's own webhooks (privacy-scoped). Both
      // `package.picked_up` (specific) AND `mail.picked_up` (generic).
      try {
        const isPackage = item.type === "Package";
        if (isPackage) {
          void fireMemberWebhooks(item.userId, "package.picked_up", {
            text: `✅ Package picked up · ${item.carrier ?? ""} ${item.trackingNumber ?? ""}`.trim(),
            url: "https://nohomailbox.org/dashboard?tab=packages",
            detail: {
              mailItemId: item.id,
              carrier: item.carrier ?? null,
              trackingNumber: item.trackingNumber ?? null,
            },
          });
        }
        void fireMemberWebhooks(item.userId, "mail.picked_up", {
          text: `✅ ${item.type} picked up`,
          url: "https://nohomailbox.org/dashboard",
          detail: {
            mailItemId: item.id,
            type: item.type,
          },
        });
      } catch (e) { console.error("[updateMailStatus] fireMemberWebhooks failed:", e); }
    })();
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function logMail(formData: FormData) {
  await verifyAdmin();

  const suiteNumber = formData.get("suite") as string;
  const from = formData.get("from") as string;
  const type = formData.get("type") as string;
  const label = (formData.get("label") as string) || null;
  const recipientName = (formData.get("recipientName") as string) || null;
  const recipientPhone = (formData.get("recipientPhone") as string) || null;
  const exteriorImageUrl = (formData.get("exteriorImageUrl") as string) || null;

  if (!suiteNumber || !from || !type) {
    return { error: "Suite number, sender, and type are required" };
  }

  const weightOzRaw = formData.get("weightOz") as string;
  const dimensions = (formData.get("dimensions") as string) || null;
  const weightOz = weightOzRaw ? parseFloat(weightOzRaw) : null;

  // Oversize = weight > 32oz (2 lbs) or ANY dimension > 18". The earlier
  // `dimensions.match(/(\d+)/)` regex only captured the FIRST number, so
  // "4x18x24" was read as `4` (not oversize) when it should trigger on the
  // 24" depth. Walk every number in the string and check the max.
  const dimensionNumbers = dimensions
    ? Array.from(dimensions.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) => parseFloat(m[1]))
    : [];
  const maxDimension = dimensionNumbers.length > 0 ? Math.max(...dimensionNumbers) : 0;
  const isOversize = !!((weightOz && weightOz > 32) || maxDimension > 18);

  const customer = await prisma.user.findUnique({ where: { suiteNumber } });
  if (!customer) return { error: `No customer found for suite #${suiteNumber}` };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Vacation-hold auto-honor: if the customer has an active VacationHold
  // covering today, new mail lands as "Held" instead of "Received" and skips
  // the per-item alert (the daily digest the customer signed up for is
  // sufficient). Was missing entirely — customer set up a hold for their
  // honeymoon and still got 47 SMS pings.
  const vacation = await (prisma as unknown as {
    vacationHold: {
      findUnique: (args: unknown) => Promise<
        | { active: boolean; startDate: string; endDate: string; digest: boolean }
        | null
      >;
    };
  }).vacationHold.findUnique({ where: { userId: customer.id } });

  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  const onVacation =
    !!vacation?.active &&
    vacation.startDate <= todayStr &&
    vacation.endDate >= todayStr;

  await prisma.mailItem.create({
    data: {
      userId: customer.id,
      from,
      type,
      status: onVacation ? "Held" : "Received",
      scanned: false,
      label,
      date: dateStr,
      recipientName,
      recipientPhone,
      exteriorImageUrl,
      weightOz: weightOz ?? undefined,
      dimensions: dimensions ?? undefined,
    },
  });

  // Notify customer (email + in-app). Email gated on the admin's
  // `notif.mailArrived` site setting (toggle in Admin Settings); previously
  // the toggle was read-only UI and ignored. Default-on when the setting
  // is unset so existing deploys don't go silent on upgrade.
  // Failures are logged but don't block the logMail response.
  const notifConfig = await prisma.siteConfig.findUnique({
    where: { key: "notif.mailArrived" },
  });
  const mailArrivedEnabled = notifConfig?.value !== "false";
  // Customers on vacation skip per-item alerts. They get the daily digest
  // (handled by a separate scheduled job that reads VacationHold.digest +
  // assembles the day's "Held" mail). The digest preference is on the row
  // itself — but for the per-item alert path here, vacation-on always means
  // "don't blast them right now".
  const skipPerItemForVacation = onVacation;

  try {
    const work: Promise<unknown>[] = [];
    if (mailArrivedEnabled && !skipPerItemForVacation) {
      work.push(
        sendMailArrivedEmail({
          email: customer.email,
          name: customer.name,
          suiteNumber,
          from,
          type,
          recipientName,
          photoUrl: exteriorImageUrl,
        }),
      );
    }
    if (!skipPerItemForVacation) {
      // In-app notifications still fire for oversize packages even when on
      // vacation — the customer might want to know if a giant box arrives
      // (storage charges accrue on oversize).
      work.push(
        isOversize
          ? notifyOversizePackage({ userId: customer.id, from, weightOz: weightOz ?? undefined, dimensions: dimensions ?? undefined })
          : notifyMailArrived({
              userId: customer.id,
              from,
              type: type as "Letter" | "Package",
            }),
      );
    } else if (isOversize) {
      // Even on vacation, oversize triggers an in-app notification because
      // it's billing-relevant. No email — they'll get the digest.
      work.push(
        notifyOversizePackage({
          userId: customer.id,
          from,
          weightOz: weightOz ?? undefined,
          dimensions: dimensions ?? undefined,
        }),
      );
    }
    await Promise.all(work);
  } catch (e) {
    // Non-fatal — but log so failed notifications don't go undiagnosed.
    console.error("[logMail] notification dispatch failed:", e);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

async function createMailRequest(
  userId: string,
  mailItemId: string,
  kind: string,
  newStatus: string,
  notes?: string
) {
  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: newStatus },
  });
  await prisma.mailRequest.create({
    data: {
      userId,
      mailItemId,
      kind,
      status: "Pending",
      notes: notes ?? null,
    },
  });
}

async function authorizeMailItem(mailItemId: string) {
  const user = await verifySession();
  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item || item.userId !== user.id) {
    return { error: "Not authorized" as const };
  }

  // Block requests when the plan is expired past the 10-day grace period
  if (user.role !== "ADMIN") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planDueDate: true },
    });
    if (getPlanStatus(dbUser?.planDueDate) === "expired") {
      return { error: "Your plan has expired. Please renew to continue using mailbox services." as const };
    }
  }

  return { user, item };
}

export async function requestForward(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Forward", "Forward Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestScan(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Scan", "Scan Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

// Quick Peek — $0.50 exterior scan, charged immediately from wallet
export async function requestQuickPeek(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;

  const QUICK_PEEK_CENTS = 50;
  const userId = auth.user.id as string;

  // Atomic balance check + debit + ledger row. The previous read-then-write
  // had a TOCTOU race: two concurrent Quick Peek requests could both pass
  // the balance check at $0.50 and double-spend down to -$0.50. Using
  // `decrement` with a `where: { walletBalanceCents: { gte: ... } }` clause
  // (via updateMany) makes the debit conditional on still having the funds.
  const debit = await prisma.user.updateMany({
    where: { id: userId, walletBalanceCents: { gte: QUICK_PEEK_CENTS } },
    data: { walletBalanceCents: { decrement: QUICK_PEEK_CENTS } },
  });
  if (debit.count === 0) {
    return { error: "Insufficient wallet balance ($0.50 needed for Quick Peek)" };
  }

  // Re-fetch the post-debit balance for the ledger row. We do this outside
  // the original updateMany because Prisma can't return the new value from
  // updateMany directly. Theoretically another transaction could run between
  // the updateMany and this read, but we'd still record THE balance at this
  // moment, which is a valid ledger snapshot.
  const post = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalanceCents: true },
  });
  const newBal = post?.walletBalanceCents ?? 0;

  await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        kind: "Charge",
        amountCents: -QUICK_PEEK_CENTS,
        description: "Quick Peek scan ($0.50)",
        balanceAfterCents: newBal,
      },
    }),
  ]);

  // Mail request creation can stay outside the wallet transaction — if it
  // fails we'd rather have charged the user (refundable) than have an
  // un-reconcilable mail request without a charge.
  await createMailRequest(userId, mailItemId, "QuickPeek", "Scan Requested");

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, chargedCents: QUICK_PEEK_CENTS };
}

export async function requestDiscard(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Discard", "Discard Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestPickup(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Pickup", "Pickup Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestHold(mailItemId: string, untilDate: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;

  // Validate untilDate — was being passed unchecked into `new Date()` which
  // accepts any string and falls back to `Invalid Date`. That stored as a
  // garbage timestamp and could in theory be set decades out to indefinitely
  // tie up a slot. Cap to 90 days from now and require a future date.
  const parsed = new Date(untilDate);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Invalid hold date." };
  }
  const now = Date.now();
  const maxFuture = now + 90 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < now) {
    return { error: "Hold date must be in the future." };
  }
  if (parsed.getTime() > maxFuture) {
    return { error: "Hold can be at most 90 days from today." };
  }

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: "Held", holdUntil: parsed },
  });
  await prisma.mailRequest.create({
    data: {
      userId: auth.user.id ?? "",
      mailItemId,
      kind: "Hold",
      status: "Pending",
      notes: `Hold until ${untilDate}`,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestReturnToSender(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Return", "Return Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestShred(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Shred", "Shred Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestDeposit(mailItemId: string, bankRef: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(
    auth.user.id ?? "",
    mailItemId,
    "Deposit",
    "Deposit Requested",
    `Bank ref: ${bankRef}`
  );
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function fulfillMailRequest(
  requestId: string,
  completionNote?: string,
  scanPages?: number,
  forwardTracking?: { carrier?: string; trackingNumber?: string },
) {
  const admin = await verifyAdmin();
  const req = await prisma.mailRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found" };

  // Idempotency guard: a double-click could fulfill the same scan request
  // twice and double-charge the wallet. Block any non-Pending re-entry.
  if (req.status !== "Pending") {
    return { error: `Request is already ${req.status} — refresh and try again if needed.` };
  }

  // Charge wallet for scans: $2/page. If wallet is short, charge what's
  // available and let the rest carry on the customer's invoice ledger.
  if (req.kind === "Scan" && scanPages && scanPages > 0) {
    const SCAN_CENTS_PER_PAGE = 200;
    const totalCharge = SCAN_CENTS_PER_PAGE * scanPages;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { walletBalanceCents: true },
    });
    if (user) {
      const charge = Math.min(user.walletBalanceCents, totalCharge);
      if (charge > 0) {
        const newBal = user.walletBalanceCents - charge;
        // Atomic: wallet debit + ledger row + audit log all commit together.
        // Was a Promise.all with no audit trail — admin couldn't see who
        // billed how many pages against which scan request.
        await prisma.$transaction([
          prisma.user.update({
            where: { id: req.userId },
            data: { walletBalanceCents: newBal },
          }),
          prisma.walletTransaction.create({
            data: {
              userId: req.userId,
              kind: "Charge",
              amountCents: -charge,
              description: `Scan request — ${scanPages} page${scanPages !== 1 ? "s" : ""} ($2/page)`,
              balanceAfterCents: newBal,
            },
          }),
          prisma.auditLog.create({
            data: {
              id: crypto.randomUUID(),
              actorId: admin.id ?? "unknown",
              actorRole: "ADMIN",
              action: "mail.scan.charge",
              entityType: "User",
              entityId: req.userId,
              metadata: JSON.stringify({
                mailRequestId: requestId,
                pages: scanPages,
                totalChargeCents: totalCharge,
                actuallyChargedCents: charge,
                owedCents: totalCharge - charge,
                prevBalance: user.walletBalanceCents,
                newBalance: newBal,
              }),
            },
          }),
        ]);
      }
      // Owed: log to notes for admin follow-up
      const owed = totalCharge - charge;
      if (owed > 0) {
        completionNote = `${completionNote ?? ""}\n[BALANCE OWED: $${(owed / 100).toFixed(2)} — wallet was short]`.trim();
      }
    }
  }

  await prisma.mailRequest.update({
    where: { id: requestId },
    data: {
      status: "Completed",
      completedAt: new Date(),
      completedBy: admin.id ?? null,
      notes: completionNote ?? req.notes,
    },
  });

  // Update the underlying mail item to its final state
  const finalStatus: Record<string, string> = {
    Scan: "Scanned",
    Forward: "Forwarded",
    Discard: "Discarded",
    Pickup: "Picked Up",
    Hold: "Held",
    Shred: "Shredded",
    Deposit: "Deposited",
  };
  // Forwarding can ship via USPS/UPS/FedEx — capture the tracking number on
  // the MailItem so the customer's dashboard can show "your forward shipped
  // via {carrier} {tracking#}". Was missing entirely; admin had no way to
  // attach tracking even though MailItem has the columns.
  const trackingPatch =
    req.kind === "Forward" && forwardTracking?.trackingNumber
      ? {
          trackingNumber: forwardTracking.trackingNumber.trim(),
          carrier: forwardTracking.carrier?.trim() || null,
        }
      : {};
  await prisma.mailItem.update({
    where: { id: req.mailItemId },
    data: {
      status: finalStatus[req.kind] ?? "Completed",
      ...(req.kind === "Scan" ? { scanned: true } : {}),
      ...trackingPatch,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setMailIntakeDetails(
  mailItemId: string,
  data: { weightOz?: number; dimensions?: string; exteriorImageUrl?: string }
) {
  const admin = await verifyAdmin();

  // Capture before-state so audit log shows what changed (admin uses this
  // for shipping-dispute reconciliation; need to know who edited what).
  const before = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { weightOz: true, dimensions: true, exteriorImageUrl: true, userId: true },
  });
  if (!before) return { error: "Mail item not found" };

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: mailItemId },
      data: {
        weightOz: data.weightOz ?? undefined,
        dimensions: data.dimensions ?? undefined,
        exteriorImageUrl: data.exteriorImageUrl ?? undefined,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "mail.intake.edit",
        entityType: "MailItem",
        entityId: mailItemId,
        metadata: JSON.stringify({
          before: {
            weightOz: before.weightOz,
            dimensions: before.dimensions,
            exteriorImageUrl: before.exteriorImageUrl,
          },
          after: {
            weightOz: data.weightOz ?? before.weightOz,
            dimensions: data.dimensions ?? before.dimensions,
            exteriorImageUrl: data.exteriorImageUrl ?? before.exteriorImageUrl,
          },
          customerId: before.userId,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateMailLabel(mailItemId: string, label: string | null) {
  const user = await verifySession();

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  if (item.userId !== user.id && user.role !== "ADMIN") {
    return { error: "Not authorized" };
  }

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { label },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function setScanImage(
  mailItemId: string,
  scanImageUrl: string,
  scanPages?: number,
) {
  const admin = await verifyAdmin();

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  // If there's a pending Scan request for this item, fulfill it via the
  // proper billing path so the customer is charged $2/page and the
  // MailRequest gets closed out. Was a real money-leak path: admin uploading
  // via the camera-icon shortcut would skip the wallet debit entirely and
  // leave the request hanging Pending forever.
  const pendingScanRequest = await prisma.mailRequest.findFirst({
    where: {
      mailItemId,
      kind: "Scan",
      status: "Pending",
    },
    select: { id: true },
  });

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: {
      scanImageUrl,
      scanned: true,
      status: item.status === "Received" ? "Scanned" : item.status,
    },
  });

  // Bill + close request only when there's an actual outstanding request
  // (admin proactively scanning ahead of a customer request shouldn't auto-
  // charge — that's a customer-service gesture).
  if (pendingScanRequest && scanPages && scanPages > 0) {
    await fulfillMailRequest(pendingScanRequest.id, undefined, scanPages);
  }

  // Mention `admin` in metadata-style audit-of-record so the var isn't unused.
  // Audit-log emissions for the actual charge happen inside fulfillMailRequest.
  void admin;

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, billedPendingRequest: !!pendingScanRequest && !!scanPages };
}
