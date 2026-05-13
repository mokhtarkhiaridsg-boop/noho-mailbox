"use server";

/**
 * iter-231 — Self-serve mailbox transfer to family server actions
 * (Tier 17 #140).
 *
 * Distinct from iter-122 SuiteTransferRequest (suite # change for the
 * same member) — this is a true OWNERSHIP change. Member files request
 * → recipient gets an in-person-visit invite email (per KHIARI no-
 * e-sign rule) → admin verifies docs in person + uploads scans → admin
 * Approves → atomic: revoke all iter-100 SharedMailboxAccess held by
 * the primary user (snapshot revoked IDs onto the row for audit) +
 * audit + send completion emails + fire `family_transfer.approved`
 * webhook → admin manually creates the recipient's User + marks
 * Completed.
 *
 * Reuses iter-228 atomic `prisma.$transaction([entity.update, audit.create])`
 * pattern, iter-230 webhook event registration, iter-225-style email
 * fire-and-forget post-tx.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";
import { sendEmail } from "@/lib/email";

export type FamilyTransferStatus = "Pending" | "AwaitingVisit" | "Approved" | "Completed" | "Cancelled" | "Denied";
export type FamilyTransferRow = {
  id: string;
  primaryUserId: string;
  primaryUserName: string | null;
  primaryUserSuite: string | null;
  primaryUserEmail: string | null;
  recipientEmail: string;
  recipientName: string;
  recipientPhone: string | null;
  relationship: string;
  reason: string | null;
  kycIdImageUrl: string | null;
  kycForm1583Url: string | null;
  kycNotes: string | null;
  visitedBureauAtIso: string | null;
  status: FamilyTransferStatus;
  approvedAtIso: string | null;
  decisionNote: string | null;
  completedAtIso: string | null;
  newUserId: string | null;
  cancelledAtIso: string | null;
  cancelledReason: string | null;
  deniedAtIso: string | null;
  deniedReason: string | null;
  revokedSharedAccessCount: number;       // derived from JSON snapshot
  createdAtIso: string;
};

const RELATIONSHIPS = ["spouse", "child", "parent", "sibling", "other"] as const;

function toView(r: { id: string; primaryUserId: string; primaryUserName: string | null; primaryUserSuite: string | null; primaryUserEmail: string | null; recipientEmail: string; recipientName: string; recipientPhone: string | null; relationship: string; reason: string | null; kycIdImageUrl: string | null; kycForm1583Url: string | null; kycNotes: string | null; visitedBureauAt: Date | null; status: string; approvedAt: Date | null; decisionNote: string | null; completedAt: Date | null; newUserId: string | null; cancelledAt: Date | null; cancelledReason: string | null; deniedAt: Date | null; deniedReason: string | null; revokedSharedAccessIdsJson: string | null; createdAt: Date }): FamilyTransferRow {
  let revokedCount = 0;
  if (r.revokedSharedAccessIdsJson) {
    try {
      const arr = JSON.parse(r.revokedSharedAccessIdsJson);
      if (Array.isArray(arr)) revokedCount = arr.length;
    } catch { /* ignore */ }
  }
  const status: FamilyTransferStatus =
    r.status === "AwaitingVisit" ? "AwaitingVisit" :
    r.status === "Approved" ? "Approved" :
    r.status === "Completed" ? "Completed" :
    r.status === "Cancelled" ? "Cancelled" :
    r.status === "Denied" ? "Denied" : "Pending";
  return {
    id: r.id, primaryUserId: r.primaryUserId,
    primaryUserName: r.primaryUserName, primaryUserSuite: r.primaryUserSuite,
    primaryUserEmail: r.primaryUserEmail,
    recipientEmail: r.recipientEmail, recipientName: r.recipientName,
    recipientPhone: r.recipientPhone, relationship: r.relationship,
    reason: r.reason,
    kycIdImageUrl: r.kycIdImageUrl, kycForm1583Url: r.kycForm1583Url,
    kycNotes: r.kycNotes,
    visitedBureauAtIso: r.visitedBureauAt?.toISOString() ?? null,
    status,
    approvedAtIso: r.approvedAt?.toISOString() ?? null,
    decisionNote: r.decisionNote,
    completedAtIso: r.completedAt?.toISOString() ?? null,
    newUserId: r.newUserId,
    cancelledAtIso: r.cancelledAt?.toISOString() ?? null,
    cancelledReason: r.cancelledReason,
    deniedAtIso: r.deniedAt?.toISOString() ?? null,
    deniedReason: r.deniedReason,
    revokedSharedAccessCount: revokedCount,
    createdAtIso: r.createdAt.toISOString(),
  };
}

const RELATIONSHIP_LABEL: Record<string, string> = {
  spouse: "spouse",
  child: "child",
  parent: "parent",
  sibling: "sibling",
  other: "family member",
};

// ─── Member-side: file request ─────────────────────────────────────────

export async function requestMailboxFamilyTransfer(input: {
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  relationship: "spouse" | "child" | "parent" | "sibling" | "other";
  reason?: string;
}): Promise<{ row?: FamilyTransferRow; error?: string }> {
  const me = await verifySession();
  if (me.role === "ADMIN") return { error: "Admins file transfers via the admin panel." };
  const email = input.recipientEmail?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Recipient email looks invalid." };
  const name = input.recipientName?.trim();
  if (!name || name.length < 2) return { error: "Recipient name required (≥2 chars)." };
  if (!RELATIONSHIPS.includes(input.relationship)) return { error: "Pick a valid relationship." };

  const fullMe = await prisma.user.findUnique({
    where: { id: me.id },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  if (!fullMe) return { error: "Account not found." };
  if (fullMe.email && fullMe.email.toLowerCase() === email) return { error: "Cannot transfer to your own email." };

  // Block duplicates: already have an open transfer (Pending/AwaitingVisit/Approved)?
  const existing = await prisma.mailboxFamilyTransfer.findFirst({
    where: { primaryUserId: me.id, status: { in: ["Pending", "AwaitingVisit", "Approved"] } },
    select: { id: true, recipientEmail: true, status: true },
  });
  if (existing) return { error: `You already have an open transfer (${existing.status}) to ${existing.recipientEmail}. Cancel it first.` };

  const created = await prisma.mailboxFamilyTransfer.create({
    data: {
      primaryUserId: me.id,
      primaryUserName: fullMe.name ?? null,
      primaryUserSuite: fullMe.suiteNumber ?? null,
      primaryUserEmail: fullMe.email ?? null,
      recipientEmail: email,
      recipientName: name.slice(0, 120),
      recipientPhone: input.recipientPhone?.trim().slice(0, 30) || null,
      relationship: input.relationship,
      reason: input.reason?.trim().slice(0, 500) || null,
      status: "AwaitingVisit",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: me.id, actorRole: "MEMBER",
      action: "family_transfer.requested",
      entityType: "MailboxFamilyTransfer", entityId: created.id,
      metadata: JSON.stringify({ recipientEmail: email, relationship: input.relationship, suite: fullMe.suiteNumber ?? null }),
    },
  }).catch(() => null);

  // Fire-and-forget: invite email to recipient + confirmation to primary user.
  void sendEmail({
    to: email,
    subject: `${fullMe.name ?? "A NOHO member"} wants to transfer their mailbox to you`,
    kind: "family_transfer_invite",
    html: buildRecipientInviteEmail({ primaryName: fullMe.name ?? "(member)", primarySuite: fullMe.suiteNumber ?? "", recipientName: name, relationship: RELATIONSHIP_LABEL[input.relationship] ?? "family", reason: input.reason ?? null }),
  }).catch(() => null);
  if (fullMe.email) {
    void sendEmail({
      to: fullMe.email, userId: me.id,
      subject: `Family-transfer request received — bureau visit pending`,
      kind: "family_transfer_confirm_primary",
      html: buildPrimaryConfirmEmail({ primaryName: fullMe.name ?? "(you)", primarySuite: fullMe.suiteNumber ?? "", recipientName: name, recipientEmail: email, relationship: RELATIONSHIP_LABEL[input.relationship] ?? "family" }),
    }).catch(() => null);
  }

  void fireWebhooks("family_transfer.requested", {
    text: `👨‍👩‍👧 ${fullMe.name ?? "Member"} (suite #${fullMe.suiteNumber ?? "—"}) filed a transfer to ${RELATIONSHIP_LABEL[input.relationship] ?? "family member"} ${name}`,
    emoji: "👨‍👩‍👧",
    detail: { transferId: created.id, primaryUserId: me.id, recipientEmail: email, relationship: input.relationship },
  });

  revalidatePath("/dashboard");
  return { row: toView(created) };
}

export async function cancelMyMailboxFamilyTransfer(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const me = await verifySession();
  const row = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Transfer not found." };
  if (me.role !== "ADMIN" && row.primaryUserId !== me.id) return { error: "Not your transfer." };
  if (row.status === "Approved" || row.status === "Completed") return { error: "Cannot cancel an Approved/Completed transfer — contact bureau." };
  if (row.status === "Cancelled" || row.status === "Denied") return { success: true };
  await prisma.$transaction([
    prisma.mailboxFamilyTransfer.update({
      where: { id: row.id },
      data: { status: "Cancelled", cancelledAt: new Date(), cancelledReason: input.reason?.trim().slice(0, 200) || "cancelled_by_member" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: me.id, actorRole: me.role === "ADMIN" ? "ADMIN" : "MEMBER",
        action: "family_transfer.cancelled",
        entityType: "MailboxFamilyTransfer", entityId: row.id,
        metadata: JSON.stringify({ reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/dashboard"); revalidatePath("/admin");
  return { success: true };
}

export async function getMyMailboxFamilyTransfers(): Promise<FamilyTransferRow[]> {
  const me = await verifySession();
  const rows = await prisma.mailboxFamilyTransfer.findMany({
    where: { primaryUserId: me.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toView);
}

// ─── Admin-side ────────────────────────────────────────────────────────

export async function adminUpdateFamilyTransferKyc(input: { id: string; kycIdImageUrl?: string; kycForm1583Url?: string; kycNotes?: string; markVisited?: boolean }): Promise<{ row?: FamilyTransferRow; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Transfer not found." };
  if (row.status === "Approved" || row.status === "Completed" || row.status === "Cancelled" || row.status === "Denied") return { error: "Cannot edit KYC after transfer is finalized." };
  const data: { kycIdImageUrl?: string; kycForm1583Url?: string; kycNotes?: string; visitedBureauAt?: Date } = {};
  if (input.kycIdImageUrl) data.kycIdImageUrl = input.kycIdImageUrl.trim().slice(0, 500);
  if (input.kycForm1583Url) data.kycForm1583Url = input.kycForm1583Url.trim().slice(0, 500);
  if (typeof input.kycNotes === "string") data.kycNotes = input.kycNotes.trim().slice(0, 1000);
  if (input.markVisited && !row.visitedBureauAt) data.visitedBureauAt = new Date();
  if (Object.keys(data).length === 0) return { error: "Nothing to update." };
  const updated = await prisma.mailboxFamilyTransfer.update({ where: { id: row.id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "family_transfer.kyc_updated",
      entityType: "MailboxFamilyTransfer", entityId: row.id,
      metadata: JSON.stringify({ kycIdImage: !!input.kycIdImageUrl, kycForm1583: !!input.kycForm1583Url, kycNotes: !!input.kycNotes, markVisited: !!input.markVisited }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: toView(updated) };
}

export async function approveMailboxFamilyTransfer(input: { id: string; decisionNote?: string }): Promise<{ row?: FamilyTransferRow; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Transfer not found." };
  if (row.status !== "Pending" && row.status !== "AwaitingVisit") return { error: `Transfer is ${row.status}; cannot approve.` };
  if (!row.kycIdImageUrl || !row.kycForm1583Url) return { error: "Upload KYC ID + signed Form 1583 before approving." };
  if (!row.visitedBureauAt) return { error: "Mark in-person visit complete before approving (KHIARI no-e-sign policy)." };

  // Snapshot all active iter-100 SharedMailboxAccess held by the primary user.
  const sharedActive = await prisma.sharedMailboxAccess.findMany({
    where: { primaryUserId: row.primaryUserId, active: true },
    select: { id: true },
  });
  const revokedIds = sharedActive.map((s) => s.id);

  const now = new Date();
  await prisma.$transaction([
    prisma.mailboxFamilyTransfer.update({
      where: { id: row.id },
      data: {
        status: "Approved",
        approvedAt: now, approvedById: actor.id,
        decisionNote: input.decisionNote?.trim().slice(0, 500) || null,
        revokedSharedAccessIdsJson: revokedIds.length > 0 ? JSON.stringify(revokedIds) : null,
      },
    }),
    prisma.sharedMailboxAccess.updateMany({
      where: { primaryUserId: row.primaryUserId, active: true },
      data: { active: false },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "family_transfer.approved",
        entityType: "MailboxFamilyTransfer", entityId: row.id,
        metadata: JSON.stringify({
          recipientEmail: row.recipientEmail,
          revokedSharedAccessCount: revokedIds.length,
          suite: row.primaryUserSuite ?? null,
        }),
      },
    }),
  ]);

  // Fire-and-forget post-tx side effects.
  if (row.primaryUserEmail) {
    void sendEmail({
      to: row.primaryUserEmail, userId: row.primaryUserId,
      subject: `Mailbox transfer approved — handover complete`,
      kind: "family_transfer_approved_primary",
      html: buildPrimaryApprovedEmail({ primaryName: row.primaryUserName ?? "(member)", primarySuite: row.primaryUserSuite ?? "", recipientName: row.recipientName, revokedCount: revokedIds.length }),
    }).catch(() => null);
  }
  void sendEmail({
    to: row.recipientEmail,
    subject: `Welcome to NOHO Mailbox — your mailbox is ready`,
    kind: "family_transfer_approved_recipient",
    html: buildRecipientApprovedEmail({ recipientName: row.recipientName, primaryName: row.primaryUserName ?? "(previous owner)", primarySuite: row.primaryUserSuite ?? "" }),
  }).catch(() => null);
  void fireWebhooks("family_transfer.approved", {
    text: `✅ Suite #${row.primaryUserSuite ?? "—"} family-transfer approved · ${revokedIds.length} SharedAccess revoked`,
    emoji: "✅",
    detail: { transferId: row.id, primaryUserId: row.primaryUserId, recipientEmail: row.recipientEmail, revokedSharedAccessCount: revokedIds.length },
  });

  const fresh = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: row.id } });
  revalidatePath("/admin"); revalidatePath("/dashboard");
  return { row: fresh ? toView(fresh) : undefined };
}

export async function denyMailboxFamilyTransfer(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Transfer not found." };
  if (row.status === "Approved" || row.status === "Completed") return { error: "Cannot deny a finalized transfer." };
  const reason = input.reason?.trim();
  if (!reason || reason.length < 4) return { error: "Denial reason (≥4 chars) required." };
  await prisma.$transaction([
    prisma.mailboxFamilyTransfer.update({
      where: { id: row.id },
      data: { status: "Denied", deniedAt: new Date(), deniedReason: reason.slice(0, 500) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "family_transfer.denied",
        entityType: "MailboxFamilyTransfer", entityId: row.id,
        metadata: JSON.stringify({ reason: reason.slice(0, 80) }),
      },
    }),
  ]);
  if (row.primaryUserEmail) {
    void sendEmail({
      to: row.primaryUserEmail, userId: row.primaryUserId,
      subject: `Mailbox transfer denied`,
      kind: "family_transfer_denied",
      html: `<p>Hi ${row.primaryUserName ?? ""},</p><p>Your mailbox-transfer request was not approved by the bureau.</p><p><strong>Reason:</strong> ${reason}</p><p>Please reach out to <a href="mailto:nohomailbox@gmail.com">nohomailbox@gmail.com</a> if you'd like to discuss next steps.</p>`,
    }).catch(() => null);
  }
  revalidatePath("/admin"); revalidatePath("/dashboard");
  return { success: true };
}

export async function completeMailboxFamilyTransfer(input: { id: string; newUserId: string }): Promise<{ row?: FamilyTransferRow; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Transfer not found." };
  if (row.status !== "Approved") return { error: "Mark Approved first." };
  const newUser = await prisma.user.findUnique({ where: { id: input.newUserId }, select: { id: true } });
  if (!newUser) return { error: "Recipient User account not found — create it first." };
  await prisma.$transaction([
    prisma.mailboxFamilyTransfer.update({
      where: { id: row.id },
      data: { status: "Completed", completedAt: new Date(), newUserId: input.newUserId },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "family_transfer.completed",
        entityType: "MailboxFamilyTransfer", entityId: row.id,
        metadata: JSON.stringify({ newUserId: input.newUserId }),
      },
    }),
  ]);
  const fresh = await prisma.mailboxFamilyTransfer.findUnique({ where: { id: row.id } });
  revalidatePath("/admin"); revalidatePath("/dashboard");
  return { row: fresh ? toView(fresh) : undefined };
}

export async function listMailboxFamilyTransfersAdmin(input: { status?: FamilyTransferStatus; limit?: number } = {}): Promise<FamilyTransferRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 30));
  const where = input.status ? { status: input.status } : {};
  const rows = await prisma.mailboxFamilyTransfer.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toView);
}

// ─── Email body builders ───────────────────────────────────────────────

function buildRecipientInviteEmail(args: { primaryName: string; primarySuite: string; recipientName: string; relationship: string; reason: string | null }): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A1D23;">
    <div style="background: linear-gradient(135deg, #1976FF, #5B21B6); padding: 32px 24px; border-radius: 12px; color: white; text-align: center;">
      <p style="font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px; opacity: 0.85;">NOHO Mailbox · Family Transfer</p>
      <h1 style="font-size: 22px; font-weight: 800; margin: 0;">You've been invited to take over a NOHO mailbox</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.6;">Hi ${args.recipientName},</p>
      <p style="font-size: 14px; line-height: 1.6;"><strong>${args.primaryName}</strong> (suite #${args.primarySuite || "—"}) has filed a request to transfer ownership of their NOHO Mailbox to you as their <strong>${args.relationship}</strong>.</p>
      ${args.reason ? `<p style="font-size: 13px; line-height: 1.6; padding: 12px; background: #F4F5F7; border-radius: 8px; font-style: italic;">📝 Their note: "${args.reason}"</p>` : ""}
      <div style="margin: 20px 0; padding: 16px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 6px;">
        <p style="font-size: 13px; font-weight: 700; margin: 0 0 8px; color: #92400e;">📍 In-person visit required</p>
        <p style="font-size: 13px; line-height: 1.5; margin: 0; color: #78350f;">Per CMRA regulations, the NOHO bureau requires an in-person visit to complete this handover. Please bring:</p>
        <ul style="font-size: 13px; line-height: 1.6; margin: 8px 0 0; padding-left: 20px; color: #78350f;">
          <li>Government-issued photo ID (driver's license, passport)</li>
          <li>Proof of address (utility bill, lease)</li>
          <li>This invitation reference (just mention "${args.primaryName}'s mailbox transfer")</li>
        </ul>
      </div>
      <p style="font-size: 14px; line-height: 1.6;">Bureau hours: Mon–Fri 9:30am–5:30pm (lunch 1:30–2pm) · Sat 10am–1:30pm.</p>
      <p style="font-size: 13px; line-height: 1.6; color: #7A8290;">Questions? Reply to this email or call the bureau at <a href="tel:+18185067744" style="color: #1976FF;">(818) 506-7744</a>.</p>
    </div>
  </div>`;
}

function buildPrimaryConfirmEmail(args: { primaryName: string; primarySuite: string; recipientName: string; recipientEmail: string; relationship: string }): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A1D23;">
    <h2 style="font-size: 20px; font-weight: 800;">Family-transfer request received ✓</h2>
    <p style="font-size: 14px; line-height: 1.6;">Hi ${args.primaryName},</p>
    <p style="font-size: 14px; line-height: 1.6;">We've received your request to transfer suite #${args.primarySuite || "—"} to your ${args.relationship}, <strong>${args.recipientName}</strong> (${args.recipientEmail}).</p>
    <p style="font-size: 14px; line-height: 1.6;">We've sent ${args.recipientName} an invitation to visit the bureau in person to complete the handover (CMRA regulations require in-person identity verification + Form 1583 re-signing).</p>
    <p style="font-size: 13px; line-height: 1.6; padding: 12px; background: #F4F5F7; border-radius: 8px;">
      Once they visit and we approve the transfer, all your existing shared-access grants will be revoked and ${args.recipientName} will become the new primary owner of the mailbox.
    </p>
    <p style="font-size: 13px; line-height: 1.6; color: #7A8290;">You can cancel this request anytime from your dashboard until it's approved.</p>
  </div>`;
}

function buildPrimaryApprovedEmail(args: { primaryName: string; primarySuite: string; recipientName: string; revokedCount: number }): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A1D23;">
    <div style="background: #22C55E; padding: 24px; border-radius: 12px; color: white; text-align: center;">
      <h1 style="font-size: 22px; font-weight: 800; margin: 0;">✅ Mailbox transfer approved</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.6;">Hi ${args.primaryName},</p>
      <p style="font-size: 14px; line-height: 1.6;">The transfer of suite #${args.primarySuite || "—"} to <strong>${args.recipientName}</strong> has been approved by the bureau.</p>
      ${args.revokedCount > 0 ? `<p style="font-size: 13px; line-height: 1.6;">As part of the handover, we revoked <strong>${args.revokedCount}</strong> shared-access grant${args.revokedCount === 1 ? "" : "s"} you'd previously issued.</p>` : ""}
      <p style="font-size: 14px; line-height: 1.6;">Thank you for being part of the NOHO Mailbox community. We hope to see you again soon!</p>
    </div>
  </div>`;
}

function buildRecipientApprovedEmail(args: { recipientName: string; primaryName: string; primarySuite: string }): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A1D23;">
    <div style="background: linear-gradient(135deg, #22C55E, #1976FF); padding: 32px 24px; border-radius: 12px; color: white; text-align: center;">
      <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Welcome to NOHO Mailbox 📬</h1>
      <p style="font-size: 13px; margin: 8px 0 0; opacity: 0.9;">Suite #${args.primarySuite || "—"} is now yours</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.6;">Hi ${args.recipientName},</p>
      <p style="font-size: 14px; line-height: 1.6;">The handover from <strong>${args.primaryName}</strong> is complete. The bureau will reach out shortly to set up your account login and walk you through your first dashboard sign-in.</p>
      <p style="font-size: 14px; line-height: 1.6;">You can now receive mail + packages at your suite immediately.</p>
    </div>
  </div>`;
}
