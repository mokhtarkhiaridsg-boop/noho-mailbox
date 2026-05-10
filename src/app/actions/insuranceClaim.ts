"use server";

/**
 * iter-196 — Carrier insurance claim assistant server actions (Tier 13 #105).
 *
 * Admin-only. The flow:
 *   1. `prefillClaimForMailItem({mailItemId, carrier, claimType})` —
 *      pure read; aggregates iter-91 declared value + iter-93 photos
 *      + iter-94 tracking + iter-87 storage timeline + iter-108 AI
 *      warnings into one ClaimPrefill blob the admin can paste.
 *   2. `startInsuranceClaim({...})` — creates the InsuranceClaim row
 *      in Draft status, snapshotting the prefill. Audit logged.
 *   3. `markClaimFiled/Paid/Denied/Closed` — admin updates as carrier
 *      portal returns updates. Audit logged on every transition.
 *
 * Why we snapshot the evidence: the underlying MailItem can change
 * (status updates, more photos added), and the carrier sees what we
 * sent — not what's current. The evidenceJson blob is the source of
 * truth for what we filed.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  CARRIER_FILING_WINDOWS_DAYS,
  describeClaim,
  dollarFmt,
  evidenceBullets,
  type ClaimCarrier,
  type ClaimEvidence,
  type ClaimPrefill,
  type ClaimType,
} from "@/lib/insurance-claim";

export type InsuranceClaimRow = {
  id: string;
  mailItemId: string;
  userId: string;
  carrier: ClaimCarrier;
  claimType: ClaimType;
  status: "Draft" | "Filed" | "Paid" | "Denied" | "Closed";
  declaredValueCents: number;
  claimedAmountCents: number;
  carrierClaimNumber: string | null;
  notes: string | null;
  filedAtIso: string | null;
  paidAtIso: string | null;
  paidAmountCents: number | null;
  deniedAtIso: string | null;
  denialReason: string | null;
  closedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  // joined for admin list display
  userName: string | null;
  suiteNumber: string | null;
  fromSender: string;
  trackingNumber: string | null;
};

function asCarrier(s: string | null | undefined): ClaimCarrier {
  if (s === "USPS" || s === "UPS" || s === "FedEx" || s === "DHL" || s === "Amazon") return s;
  return "Other";
}

function asClaimType(s: string): ClaimType {
  if (s === "damaged" || s === "lost" || s === "missing_contents" || s === "other") return s;
  return "other";
}

async function buildEvidence(mailItemId: string): Promise<{ evidence: ClaimEvidence; userId: string; fromSender: string; recipientName: string | null } | null> {
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    include: {
      user: { select: { id: true, name: true, suiteNumber: true } },
      requests: { select: { kind: true, status: true, createdAt: true, completedAt: true }, orderBy: { createdAt: "asc" } },
      storageAlerts: { select: { threshold: true, sentAt: true, feeAtAlertCents: true }, orderBy: { sentAt: "asc" } },
    },
  });
  if (!item) return null;

  // Photos: primary exterior + supplemental gallery (iter-135) + scan
  const photos: Array<{ url: string; label: string; addedAtIso: string }> = [];
  if (item.exteriorImageUrl) photos.push({ url: item.exteriorImageUrl, label: "Intake photo (exterior)", addedAtIso: item.createdAt.toISOString() });
  if (item.scanImageUrl) photos.push({ url: item.scanImageUrl, label: "Scanned contents", addedAtIso: item.createdAt.toISOString() });
  if (item.extraPhotosJson) {
    try {
      const extras = JSON.parse(item.extraPhotosJson) as Array<{ id: string; url: string; label?: string; addedAt?: string }>;
      for (const e of extras) {
        if (e.url) photos.push({
          url: e.url,
          label: e.label || "Additional intake angle",
          addedAtIso: e.addedAt || item.createdAt.toISOString(),
        });
      }
    } catch { /* swallow */ }
  }

  // Timeline: intake + status transitions + storage alerts + pickup
  const timeline: Array<{ atIso: string; label: string; detail?: string }> = [];
  timeline.push({ atIso: item.createdAt.toISOString(), label: "Received at NOHO Mailbox", detail: `from ${item.from}` });
  if (item.assignedAt) timeline.push({ atIso: item.assignedAt.toISOString(), label: "Sorted to suite", detail: item.user?.suiteNumber ? `#${item.user.suiteNumber}` : undefined });
  for (const r of item.requests) {
    timeline.push({ atIso: r.createdAt.toISOString(), label: `${r.kind} requested`, detail: r.status });
    if (r.completedAt) timeline.push({ atIso: r.completedAt.toISOString(), label: `${r.kind} completed` });
  }
  for (const s of item.storageAlerts) {
    timeline.push({ atIso: s.sentAt.toISOString(), label: `Storage alert sent (${s.threshold})`, detail: s.feeAtAlertCents ? `fee $${dollarFmt(s.feeAtAlertCents)}` : undefined });
  }
  if (item.pickupSignedAt) timeline.push({ atIso: item.pickupSignedAt.toISOString(), label: "Picked up", detail: item.pickupSignerName ?? undefined });
  // Sort chronologically
  timeline.sort((a, b) => a.atIso.localeCompare(b.atIso));

  // AI warnings (iter-108)
  let aiWarnings: string[] = [];
  if (item.aiAnalysisJson) {
    try {
      const j = JSON.parse(item.aiAnalysisJson) as { ok?: boolean; warnings?: string[] };
      if (j.ok && Array.isArray(j.warnings)) aiWarnings = j.warnings;
    } catch { /* swallow */ }
  }

  const evidence: ClaimEvidence = {
    photos,
    timeline,
    trackingNumber: item.trackingNumber,
    carrier: item.carrier,
    intakeDateIso: item.createdAt.toISOString(),
    pickupSignedAtIso: item.pickupSignedAt?.toISOString() ?? null,
    pickupSignerName: item.pickupSignerName,
    declaredValueCents: item.declaredValueCents,
    insuranceFeeCents: item.insuranceFeeCents,
    weightOz: item.weightOz,
    dimensions: item.dimensions,
    fromSender: item.from,
    recipientName: item.recipientName,
    aiWarnings,
    scanImageUrl: item.scanImageUrl,
  };

  return { evidence, userId: item.user?.id ?? item.userId, fromSender: item.from, recipientName: item.recipientName };
}

export async function prefillClaimForMailItem(input: {
  mailItemId: string;
  carrier?: string;
  claimType?: string;
}): Promise<{ prefill?: ClaimPrefill; evidence?: ClaimEvidence; error?: string }> {
  await verifyAdmin();
  const built = await buildEvidence(input.mailItemId);
  if (!built) return { error: "Mail item not found." };
  const carrier = asCarrier(input.carrier ?? built.evidence.carrier ?? null);
  const claimType = asClaimType(input.claimType ?? "damaged");

  const intakeDate = new Date(built.evidence.intakeDateIso);
  const daysSinceIntake = Math.floor((Date.now() - intakeDate.getTime()) / (24 * 3600 * 1000));
  const filingWindowDays = CARRIER_FILING_WINDOWS_DAYS[carrier] ?? null;
  const filingWindowExceeded = filingWindowDays != null && daysSinceIntake > filingWindowDays;

  const declaredCents = built.evidence.declaredValueCents ?? 0;

  const prefill: ClaimPrefill = {
    carrier,
    claimType,
    trackingNumber: built.evidence.trackingNumber,
    intakeDateIso: built.evidence.intakeDateIso,
    daysSinceIntake,
    filingWindowDays,
    filingWindowExceeded,
    senderName: built.evidence.fromSender,
    recipientName: built.evidence.recipientName ?? "Recipient on file",
    recipientAddress: null, // not stored per-item; admin paste from membership form
    declaredValueDollars: dollarFmt(declaredCents),
    claimedAmountDollars: dollarFmt(declaredCents),
    weightOz: built.evidence.weightOz,
    dimensions: built.evidence.dimensions,
    description: describeClaim({ claimType, carrier, fromSender: built.evidence.fromSender, trackingNumber: built.evidence.trackingNumber }),
    evidenceList: evidenceBullets(built.evidence),
  };

  return { prefill, evidence: built.evidence };
}

export async function startInsuranceClaim(input: {
  mailItemId: string;
  carrier: string;
  claimType: string;
  claimedAmountCents?: number;
  notes?: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const built = await buildEvidence(input.mailItemId);
  if (!built) return { error: "Mail item not found." };
  const carrier = asCarrier(input.carrier);
  const claimType = asClaimType(input.claimType);
  const declaredCents = built.evidence.declaredValueCents ?? 0;
  const claimedCents = Math.max(0, Math.min(input.claimedAmountCents ?? declaredCents, 1_000_000_00));

  const prefill = await prefillClaimForMailItem({ mailItemId: input.mailItemId, carrier, claimType });
  if (!prefill.prefill || !prefill.evidence) return { error: prefill.error ?? "Couldn't build prefill." };

  const claim = await prisma.insuranceClaim.create({
    data: {
      mailItemId: input.mailItemId,
      userId: built.userId,
      carrier,
      claimType,
      declaredValueCents: declaredCents,
      claimedAmountCents: claimedCents,
      status: "Draft",
      evidenceJson: JSON.stringify(prefill.evidence),
      prefillJson: JSON.stringify(prefill.prefill),
      notes: input.notes?.trim().slice(0, 600) || null,
      createdById: actor.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "insurance_claim.started",
      entityType: "InsuranceClaim",
      entityId: claim.id,
      metadata: JSON.stringify({ carrier, claimType, declaredCents, claimedCents, mailItemId: input.mailItemId }),
    },
  });
  revalidatePath("/admin");
  return { id: claim.id };
}

export async function markClaimFiled(input: { id: string; carrierClaimNumber: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const num = input.carrierClaimNumber.trim().slice(0, 80);
  if (!num) return { error: "Carrier claim # required." };
  const claim = await prisma.insuranceClaim.findUnique({ where: { id: input.id } });
  if (!claim) return { error: "Claim not found." };
  await prisma.$transaction([
    prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: { status: "Filed", carrierClaimNumber: num, filedAt: new Date(), filedById: actor.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: "ADMIN",
        action: "insurance_claim.filed",
        entityType: "InsuranceClaim",
        entityId: claim.id,
        metadata: JSON.stringify({ carrierClaimNumber: num, carrier: claim.carrier }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function markClaimPaid(input: { id: string; paidAmountCents: number }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const cents = Math.max(0, Math.min(input.paidAmountCents, 1_000_000_00));
  const claim = await prisma.insuranceClaim.findUnique({ where: { id: input.id } });
  if (!claim) return { error: "Claim not found." };
  await prisma.$transaction([
    prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: { status: "Paid", paidAt: new Date(), paidAmountCents: cents },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: "ADMIN",
        action: "insurance_claim.paid",
        entityType: "InsuranceClaim",
        entityId: claim.id,
        metadata: JSON.stringify({ paidAmountCents: cents, claimedAmountCents: claim.claimedAmountCents }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function markClaimDenied(input: { id: string; denialReason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const reason = input.denialReason.trim().slice(0, 300);
  if (!reason) return { error: "Denial reason required." };
  const claim = await prisma.insuranceClaim.findUnique({ where: { id: input.id } });
  if (!claim) return { error: "Claim not found." };
  await prisma.$transaction([
    prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: { status: "Denied", deniedAt: new Date(), denialReason: reason },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: "ADMIN",
        action: "insurance_claim.denied",
        entityType: "InsuranceClaim",
        entityId: claim.id,
        metadata: JSON.stringify({ denialReason: reason, carrier: claim.carrier }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function closeClaim(input: { id: string; notes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const claim = await prisma.insuranceClaim.findUnique({ where: { id: input.id } });
  if (!claim) return { error: "Claim not found." };
  const notes = input.notes?.trim().slice(0, 600) || claim.notes;
  await prisma.$transaction([
    prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: { status: "Closed", closedAt: new Date(), notes },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: "ADMIN",
        action: "insurance_claim.closed",
        entityType: "InsuranceClaim",
        entityId: claim.id,
        metadata: JSON.stringify({ status: claim.status, paidAmountCents: claim.paidAmountCents }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function listInsuranceClaims(input: { status?: string; limit?: number } = {}): Promise<InsuranceClaimRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 100));
  const where: { status?: string } = {};
  if (input.status && ["Draft", "Filed", "Paid", "Denied", "Closed"].includes(input.status)) where.status = input.status;
  const rows = await prisma.insuranceClaim.findMany({
    where,
    include: { mailItem: { include: { user: { select: { name: true, suiteNumber: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    mailItemId: r.mailItemId,
    userId: r.userId,
    carrier: asCarrier(r.carrier),
    claimType: asClaimType(r.claimType),
    status: (r.status === "Draft" || r.status === "Filed" || r.status === "Paid" || r.status === "Denied" || r.status === "Closed") ? r.status : "Draft",
    declaredValueCents: r.declaredValueCents,
    claimedAmountCents: r.claimedAmountCents,
    carrierClaimNumber: r.carrierClaimNumber,
    notes: r.notes,
    filedAtIso: r.filedAt?.toISOString() ?? null,
    paidAtIso: r.paidAt?.toISOString() ?? null,
    paidAmountCents: r.paidAmountCents,
    deniedAtIso: r.deniedAt?.toISOString() ?? null,
    denialReason: r.denialReason,
    closedAtIso: r.closedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    updatedAtIso: r.updatedAt.toISOString(),
    userName: r.mailItem?.user?.name ?? null,
    suiteNumber: r.mailItem?.user?.suiteNumber ?? null,
    fromSender: r.mailItem?.from ?? "(unknown)",
    trackingNumber: r.mailItem?.trackingNumber ?? null,
  }));
}

export async function getInsuranceClaim(input: { id: string }): Promise<{
  row: InsuranceClaimRow;
  prefill: ClaimPrefill;
  evidence: ClaimEvidence;
} | null> {
  await verifyAdmin();
  const r = await prisma.insuranceClaim.findUnique({
    where: { id: input.id },
    include: { mailItem: { include: { user: { select: { name: true, suiteNumber: true } } } } },
  });
  if (!r) return null;
  let prefill: ClaimPrefill;
  let evidence: ClaimEvidence;
  try {
    prefill = JSON.parse(r.prefillJson) as ClaimPrefill;
    evidence = JSON.parse(r.evidenceJson) as ClaimEvidence;
  } catch {
    return null;
  }
  return {
    row: {
      id: r.id,
      mailItemId: r.mailItemId,
      userId: r.userId,
      carrier: asCarrier(r.carrier),
      claimType: asClaimType(r.claimType),
      status: (r.status === "Draft" || r.status === "Filed" || r.status === "Paid" || r.status === "Denied" || r.status === "Closed") ? r.status : "Draft",
      declaredValueCents: r.declaredValueCents,
      claimedAmountCents: r.claimedAmountCents,
      carrierClaimNumber: r.carrierClaimNumber,
      notes: r.notes,
      filedAtIso: r.filedAt?.toISOString() ?? null,
      paidAtIso: r.paidAt?.toISOString() ?? null,
      paidAmountCents: r.paidAmountCents,
      deniedAtIso: r.deniedAt?.toISOString() ?? null,
      denialReason: r.denialReason,
      closedAtIso: r.closedAt?.toISOString() ?? null,
      createdAtIso: r.createdAt.toISOString(),
      updatedAtIso: r.updatedAt.toISOString(),
      userName: r.mailItem?.user?.name ?? null,
      suiteNumber: r.mailItem?.user?.suiteNumber ?? null,
      fromSender: r.mailItem?.from ?? "(unknown)",
      trackingNumber: r.mailItem?.trackingNumber ?? null,
    },
    prefill,
    evidence,
  };
}

// Convenience for the claim-creation flow: admin pastes a mail item ID
// or tracking #, we resolve it to the canonical MailItem.
export async function lookupMailItemForClaim(input: { idOrTracking: string }): Promise<{
  id: string;
  from: string;
  type: string;
  trackingNumber: string | null;
  carrier: string | null;
  declaredValueCents: number | null;
  userName: string | null;
  suiteNumber: string | null;
  createdAtIso: string;
} | null> {
  await verifyAdmin();
  const q = input.idOrTracking.trim();
  if (!q) return null;
  const byId = await prisma.mailItem.findUnique({
    where: { id: q },
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  const item = byId ?? await prisma.mailItem.findFirst({
    where: { trackingNumber: q },
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  if (!item) return null;
  return {
    id: item.id,
    from: item.from,
    type: item.type,
    trackingNumber: item.trackingNumber,
    carrier: item.carrier,
    declaredValueCents: item.declaredValueCents,
    userName: item.user?.name ?? null,
    suiteNumber: item.user?.suiteNumber ?? null,
    createdAtIso: item.createdAt.toISOString(),
  };
}
