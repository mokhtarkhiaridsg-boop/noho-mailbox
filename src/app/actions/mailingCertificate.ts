"use server";

/**
 * iter-187 — Mailing-certificate server actions (Tier 13 #96).
 *
 * Admin issues a chain-of-custody certificate for any MailItem (or
 * member can self-issue for their own items). The cert is a printable
 * /cert/<token> page accessible publicly so a court / agency can
 * verify authenticity at the URL the member shows them.
 *
 * Snapshots all the relevant fields at issue time so the cert stays
 * stable even if the source MailItem is later edited or deleted.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { generateCertificateNumber, generateVerifyToken } from "@/lib/mailing-certificate";

export type MailingCertificateRow = {
  id: string;
  certificateNumber: string;
  verifyToken: string;
  mailItemId: string;
  recipientName: string;
  recipientSuite: string | null;
  senderName: string;
  itemType: string;
  itemDate: string;
  trackingNumber: string | null;
  carrier: string | null;
  weightOz: number | null;
  exteriorImageUrl: string | null;
  notes: string | null;
  revokedAtIso: string | null;
  revokedReason: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; certificateNumber: string; verifyToken: string; mailItemId: string; recipientName: string; recipientSuite: string | null; senderName: string; itemType: string; itemDate: string; trackingNumber: string | null; carrier: string | null; weightOz: number | null; exteriorImageUrl: string | null; notes: string | null; revokedAt: Date | null; revokedReason: string | null; createdAt: Date }): MailingCertificateRow {
  return {
    id: r.id,
    certificateNumber: r.certificateNumber,
    verifyToken: r.verifyToken,
    mailItemId: r.mailItemId,
    recipientName: r.recipientName,
    recipientSuite: r.recipientSuite,
    senderName: r.senderName,
    itemType: r.itemType,
    itemDate: r.itemDate,
    trackingNumber: r.trackingNumber,
    carrier: r.carrier,
    weightOz: r.weightOz,
    exteriorImageUrl: r.exteriorImageUrl,
    notes: r.notes,
    revokedAtIso: r.revokedAt?.toISOString() ?? null,
    revokedReason: r.revokedReason,
    createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── Issue (member-side) — for own MailItems ────────────────────────
export async function issueCertificateForMyMail(input: { mailItemId: string; notes?: string }): Promise<{ id?: string; verifyToken?: string; error?: string }> {
  const session = await verifySession();
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  if (!item) return { error: "Mail item not found." };
  if (item.userId !== session.id && session.role !== "ADMIN") return { error: "Not your mail item." };
  return issueImpl({ item, issuedById: session.id ?? null, actorRole: session.role ?? "MEMBER", notes: input.notes });
}

// ─── Issue (admin-side) — for any MailItem ──────────────────────────
export async function issueCertificateForMailItem(input: { mailItemId: string; notes?: string }): Promise<{ id?: string; verifyToken?: string; error?: string }> {
  const actor = await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  if (!item) return { error: "Mail item not found." };
  return issueImpl({ item, issuedById: actor.id ?? null, actorRole: actor.role, notes: input.notes });
}

type IssueArgs = {
  item: {
    id: string;
    type: string;
    from: string;
    date: string;
    trackingNumber: string | null;
    carrier: string | null;
    weightOz: number | null;
    exteriorImageUrl: string | null;
    user: { name: string; suiteNumber: string | null };
  };
  issuedById: string | null;
  actorRole: string;
  notes?: string;
};

async function issueImpl(args: IssueArgs): Promise<{ id?: string; verifyToken?: string; error?: string }> {
  // Retry the certificate-number + verify-token generation on the
  // (very rare) collision case.
  let row = null;
  for (let attempt = 0; attempt < 5 && !row; attempt++) {
    const certificateNumber = generateCertificateNumber();
    const verifyToken = generateVerifyToken();
    try {
      row = await prisma.mailingCertificate.create({
        data: {
          mailItemId: args.item.id,
          certificateNumber,
          verifyToken,
          recipientName: args.item.user.name,
          recipientSuite: args.item.user.suiteNumber,
          senderName: args.item.from,
          itemType: args.item.type,
          itemDate: args.item.date,
          trackingNumber: args.item.trackingNumber,
          carrier: args.item.carrier,
          weightOz: args.item.weightOz != null ? Math.round(args.item.weightOz) : null,
          exteriorImageUrl: args.item.exteriorImageUrl,
          notes: args.notes?.trim().slice(0, 500) || null,
          issuedById: args.issuedById,
        },
      });
    } catch {
      // Collision — try again with fresh tokens. Bail after 5 to
      // avoid an infinite loop on a real schema error.
    }
  }
  if (!row) return { error: "Could not issue certificate, try again." };
  await prisma.auditLog.create({
    data: {
      actorId: args.issuedById ?? "unknown",
      actorRole: args.actorRole,
      action: "mailing_certificate.issued",
      entityType: "MailingCertificate",
      entityId: row.id,
      metadata: JSON.stringify({
        mailItemId: args.item.id,
        certificateNumber: row.certificateNumber,
        recipientName: args.item.user.name,
        senderName: args.item.from,
      }),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath(`/cert/${row.verifyToken}`);
  return { id: row.id, verifyToken: row.verifyToken };
}

// ─── Public verify (no auth) ────────────────────────────────────────
export async function getMailingCertificateByToken(input: { token: string }): Promise<MailingCertificateRow | null> {
  const t = input.token.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (t.length < 8) return null;
  // Wrap in try/catch so DB hiccups (missing table in dev, transient connection
  // errors) cause /cert/<token> to render the 404 page instead of bubbling a
  // 500 to the user. Public token pages should always degrade gracefully to
  // "not found" rather than expose server errors.
  try {
    const row = await prisma.mailingCertificate.findUnique({ where: { verifyToken: t } });
    if (!row) return null;
    return toRow(row);
  } catch {
    return null;
  }
}

// ─── Member: list mine ──────────────────────────────────────────────
export async function listMyMailingCertificates(): Promise<MailingCertificateRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  // Find MailItems owned by this user, then their certificates.
  const items = await prisma.mailItem.findMany({ where: { userId }, select: { id: true } });
  if (items.length === 0) return [];
  const rows = await prisma.mailingCertificate.findMany({
    where: { mailItemId: { in: items.map((i) => i.id) } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toRow);
}

// ─── Admin: list / revoke ───────────────────────────────────────────
export async function listAdminMailingCertificates(input: { limit?: number } = {}): Promise<MailingCertificateRow[]> {
  await verifyAdmin();
  const rows = await prisma.mailingCertificate.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(5, Math.min(200, input.limit ?? 50)),
  });
  return rows.map(toRow);
}

export async function revokeMailingCertificate(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const reason = input.reason.trim().slice(0, 300);
  if (reason.length < 2) return { error: "Reason required." };
  const row = await prisma.mailingCertificate.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Certificate not found." };
  if (row.revokedAt) return { error: "Already revoked." };
  await prisma.$transaction([
    prisma.mailingCertificate.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), revokedReason: reason },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "mailing_certificate.revoked",
        entityType: "MailingCertificate",
        entityId: row.id,
        metadata: JSON.stringify({ certificateNumber: row.certificateNumber, reason }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath(`/cert/${row.verifyToken}`);
  return { success: true };
}
