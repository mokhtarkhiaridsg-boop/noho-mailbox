"use server";

/**
 * iter-210 — Suite-info QR scan (Tier 15 #119).
 *
 * Public — token-gated by HMAC over the suite #. Used by the
 * /suite-info/[suiteNumber] route which admin scans from the QR
 * label affixed to each mailbox door.
 *
 * Returned info is intentionally MINIMAL (first name, suite #, last
 * pickup date, member-since year, optional photo) — even if a token
 * leaks, the leak's blast radius is one suite's first name + 4 dates,
 * not full PII. Audit fires on every scan so admin can see who's
 * looking up which suite.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { signSuiteToken, verifySuiteToken, isSuiteTokenConfigured } from "@/lib/suite-token";

export type SuiteInfoView = {
  ok: true;
  suiteNumber: string;
  firstName: string;
  memberSinceYear: number;
  photoUrl: string | null;
  lastPickupAtIso: string | null;
  daysSinceLastPickup: number | null;
  hasOpenPackages: boolean;
  openPackageCount: number;
  bio: string | null;
} | {
  ok: false;
  reason: "not_configured" | "invalid_token" | "no_member" | "vacant";
};

export async function getSuiteInfoForAdmin(input: { suiteNumber: string; token: string }): Promise<SuiteInfoView> {
  const suite = input.suiteNumber.trim();
  if (!isSuiteTokenConfigured()) return { ok: false, reason: "not_configured" };
  if (!verifySuiteToken(suite, input.token)) return { ok: false, reason: "invalid_token" };

  const user = await prisma.user.findUnique({
    where: { suiteNumber: suite },
    select: {
      id: true, name: true, image: true,
      mailboxAssignedAt: true, createdAt: true,
      neighborProfile: { select: { bio: true, status: true, photoUrl: true } },
    },
  });
  if (!user) return { ok: false, reason: "vacant" };

  // Last pickup: most recent MailItem with status="Picked Up" + pickupSignedAt
  const lastPickup = await prisma.mailItem.findFirst({
    where: { userId: user.id, pickupSignedAt: { not: null } },
    select: { pickupSignedAt: true },
    orderBy: { pickupSignedAt: "desc" },
  }).catch(() => null);

  // Open packages: status "Awaiting Pickup" or "Received"
  const openCount = await prisma.mailItem.count({
    where: { userId: user.id, status: { in: ["Awaiting Pickup", "Received", "Scanned"] }, type: "Package" },
  }).catch(() => 0);

  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const joinedAt = user.mailboxAssignedAt ?? user.createdAt;
  const lastPickupAt = lastPickup?.pickupSignedAt ?? null;
  const days = lastPickupAt ? Math.floor((Date.now() - lastPickupAt.getTime()) / (24 * 3600 * 1000)) : null;

  // Audit — useful "who scanned suite X today" trail.
  await prisma.auditLog.create({
    data: {
      actorId: "qr_scanner", actorRole: "ADMIN",
      action: "suite_info.scanned",
      entityType: "User", entityId: user.id,
      metadata: JSON.stringify({ suite, openCount, lastPickupAtIso: lastPickupAt?.toISOString() ?? null }),
    },
  }).catch(() => null);

  // Privacy: never expose the public neighbor bio to admin scans unless
  // the member has opted into the directory (status=Active).
  const neighborBio = user.neighborProfile?.status === "Active" ? user.neighborProfile.bio : null;
  const photoUrl = user.image ?? user.neighborProfile?.photoUrl ?? null;

  return {
    ok: true,
    suiteNumber: suite,
    firstName,
    memberSinceYear: joinedAt.getUTCFullYear(),
    photoUrl,
    lastPickupAtIso: lastPickupAt?.toISOString() ?? null,
    daysSinceLastPickup: days,
    hasOpenPackages: openCount > 0,
    openPackageCount: openCount,
    bio: neighborBio,
  };
}

// Admin-only: returns the canonical /suite-info URL with token baked in.
// Used by the printable QR-sheet generator to populate each label.
export async function getSuiteInfoUrl(input: { suiteNumber: string }): Promise<{ url: string | null; configured: boolean }> {
  await verifyAdmin();
  if (!isSuiteTokenConfigured()) return { url: null, configured: false };
  const tok = signSuiteToken(input.suiteNumber);
  if (!tok) return { url: null, configured: true };
  const base = process.env.AUTH_URL ?? "https://nohomailbox.org";
  return {
    url: `${base.replace(/\/$/, "")}/suite-info/${encodeURIComponent(input.suiteNumber.trim())}?token=${tok}`,
    configured: true,
  };
}

// Admin-only: bulk-generate URLs for a suite-number range. Used by the
// printable label sheet — admin enters "001..200" and gets one row
// per suite they have on file in that range.
export async function generateSuiteInfoUrls(input: { rangeMin: number; rangeMax: number }): Promise<{ rows: Array<{ suiteNumber: string; url: string; slogan: string | null }>; configured: boolean }> {
  await verifyAdmin();
  if (!isSuiteTokenConfigured()) return { rows: [], configured: false };
  const min = Math.max(1, Math.min(9999, Math.floor(input.rangeMin)));
  const max = Math.max(min, Math.min(min + 999, Math.floor(input.rangeMax)));
  const base = process.env.AUTH_URL ?? "https://nohomailbox.org";
  // iter-232: pull suitePinSlogan in one batch query so labels print the
  // member's custom 1-liner under the #suite (no per-row N+1).
  const suites: string[] = [];
  for (let n = min; n <= max; n++) suites.push(String(n).padStart(3, "0"));
  const sloganUsers = await prisma.user.findMany({
    where: { suiteNumber: { in: suites }, suitePinSlogan: { not: null } },
    select: { suiteNumber: true, suitePinSlogan: true },
  });
  const sloganBySuite = new Map(sloganUsers.map((u) => [u.suiteNumber!, u.suitePinSlogan!]));
  const rows: Array<{ suiteNumber: string; url: string; slogan: string | null }> = [];
  for (const suite of suites) {
    const tok = signSuiteToken(suite);
    if (!tok) continue;
    rows.push({
      suiteNumber: suite,
      url: `${base.replace(/\/$/, "")}/suite-info/${encodeURIComponent(suite)}?token=${tok}`,
      slogan: sloganBySuite.get(suite) ?? null,
    });
  }
  return { rows, configured: true };
}
