"use server";

/**
 * NOHO Mailbox — admin daily-ops actions:
 *   • Customer log book (notes timeline)
 *   • Suite reassignment
 *   • Void renewal (refund + reverse plan dates)
 *   • Key inventory (issue, return, mark lost)
 *   • Walk-in signup wizard (in-store new customer creation)
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendMailboxActivatedEmail } from "@/lib/email";

function cuid() {
  return crypto.randomUUID();
}

/** Add `months` calendar months to a UTC date — used for plan due-date math. */
function addMonthsUtc(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

function fmtUtcDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ─── Customer notes / log book ────────────────────────────────────────────────

export async function addCustomerNote(input: {
  userId: string;
  body: string;
  kind?: string;
  pinned?: boolean;
}) {
  const admin = await verifyAdmin();
  const body = input.body.trim();
  if (!body) return { error: "Note can't be empty." };
  if (body.length > 4000) return { error: "Note too long (max 4000 chars)." };

  await (prisma as any).customerNote.create({
    data: {
      id: cuid(),
      userId: input.userId,
      authorId: admin.id ?? null,
      authorName: admin.name ?? null,
      kind: input.kind ?? "note",
      body,
      pinned: !!input.pinned,
    },
  });
  // Audit
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "customer.note.add",
      entityType: "User",
      entityId: input.userId,
      metadata: JSON.stringify({ kind: input.kind ?? "note", length: body.length, pinned: !!input.pinned }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const };
}

export async function listCustomerNotes(userId: string, limit = 50) {
  await verifyAdmin();
  return (prisma as any).customerNote.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function togglePinNote(noteId: string) {
  const admin = await verifyAdmin();
  const note = await (prisma as any).customerNote.findUnique({ where: { id: noteId } });
  if (!note) return { error: "Note not found" };
  const newPinned = !note.pinned;
  await prisma.$transaction([
    (prisma as any).customerNote.update({
      where: { id: noteId },
      data: { pinned: newPinned },
    }),
    prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: newPinned ? "customer.note.pin" : "customer.note.unpin",
        entityType: "User",
        entityId: note.userId,
        metadata: JSON.stringify({ noteId }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true as const };
}

export async function deleteCustomerNote(noteId: string) {
  const admin = await verifyAdmin();
  const note = await (prisma as any).customerNote.findUnique({ where: { id: noteId } });
  if (!note) return { error: "Note not found" };
  await (prisma as any).customerNote.delete({ where: { id: noteId } });
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "customer.note.delete",
      entityType: "User",
      entityId: note.userId,
      metadata: JSON.stringify({ noteId, kind: note.kind }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const };
}

// ─── Suite reassignment ──────────────────────────────────────────────────────

export async function reassignSuite(input: {
  userId: string;
  newSuiteNumber: string;
  reason?: string;
}) {
  const admin = await verifyAdmin();
  const newSuite = input.newSuiteNumber.trim();
  if (!newSuite) return { error: "New suite number required" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, suiteNumber: true, name: true },
  });
  if (!user) return { error: "Customer not found" };
  if (user.suiteNumber === newSuite) return { error: "Customer is already in that suite." };

  // Conflict check — is another active customer already on that suite?
  const conflict = await prisma.user.findUnique({ where: { suiteNumber: newSuite } });
  if (conflict && conflict.id !== input.userId) {
    return { error: `Suite ${newSuite} is already assigned to ${conflict.name}.` };
  }

  const oldSuite = user.suiteNumber ?? null;

  await prisma.user.update({
    where: { id: input.userId },
    data: { suiteNumber: newSuite },
  });

  // Move any issued keys with the old suite over to the new suite
  if (oldSuite) {
    await (prisma as any).mailboxKey.updateMany({
      where: { issuedToId: input.userId, suiteNumber: oldSuite, status: "Issued" },
      data: { suiteNumber: newSuite },
    });
  }

  // Note + audit
  await (prisma as any).customerNote.create({
    data: {
      id: cuid(),
      userId: input.userId,
      authorId: admin.id ?? null,
      authorName: admin.name ?? null,
      kind: "system",
      body: `Suite reassigned: ${oldSuite ?? "—"} → ${newSuite}${input.reason ? ` · ${input.reason}` : ""}`,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "customer.suite.reassign",
      entityType: "User",
      entityId: input.userId,
      metadata: JSON.stringify({ oldSuite, newSuite, reason: input.reason ?? null }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const, oldSuite, newSuite };
}

// ─── Void renewal ────────────────────────────────────────────────────────────
// Reverses planDueDate / planExpiresAt to the snapshot, marks the related
// Payment as REFUNDED, and creates an audit + customer note.

export async function voidMailboxRenewal(input: { renewalId: string; reason: string }) {
  const admin = await verifyAdmin();
  const reason = input.reason.trim();
  if (!reason) return { error: "Reason is required to void a renewal (audit trail)." };

  const renewal = await (prisma as any).mailboxRenewal.findUnique({
    where: { id: input.renewalId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!renewal) return { error: "Renewal not found" };
  if (!renewal.user) return { error: "Renewal's customer was deleted — can't void cleanly." };

  // Atomic: reverse user dates + mark payment refunded + delete renewal + write
  // customer note + audit log. All-or-nothing so the void is never half-applied.
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: renewal.userId },
        data: {
          planDueDate: renewal.prevPlanDueDate ?? null,
          planExpiresAt: renewal.prevPlanExpiresAt ?? null,
        },
      }),
      prisma.payment.updateMany({
        where: { squarePaymentId: `renewal-${renewal.id}`, status: "COMPLETED" },
        data: { status: "REFUNDED", note: `Voided · ${reason}` },
      }),
      (prisma as any).mailboxRenewal.delete({ where: { id: renewal.id } }),
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId: renewal.userId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "billing",
          body: `Renewal voided · ${renewal.termMonths}mo · $${(renewal.amountCents / 100).toFixed(2)} · ${reason}`,
        },
      }),
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "renewal.void",
          entityType: "MailboxRenewal",
          entityId: renewal.id,
          metadata: JSON.stringify({
            userId: renewal.userId,
            userName: renewal.user.name,
            termMonths: renewal.termMonths,
            amountCents: renewal.amountCents,
            reason,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Void renewal transaction failed:", e);
    return { error: "Void failed mid-write — no changes saved. Try again." };
  }

  revalidatePath("/admin");
  return { success: true as const };
}

// ─── Security deposit refund ─────────────────────────────────────────────────
// Records a partial or full refund of the customer's posted deposit. Decrements
// securityDepositCents, creates a Payment row marked REFUNDED for audit, writes
// a customer note + audit log. Replacement-key fees, late fees, etc. are
// usually deducted before refund — admin enters the net refund amount.

export async function refundSecurityDeposit(input: {
  userId: string;
  amountCents: number;
  paymentMethod: "Cash" | "Square" | "CardOnFile";
  reason?: string;
}) {
  const admin = await verifyAdmin();
  const reason = (input.reason ?? "").trim() || null;

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { error: "Refund amount must be a positive whole number of cents." };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, suiteNumber: true, securityDepositCents: true },
  });
  if (!user) return { error: "Customer not found." };
  if (user.securityDepositCents < input.amountCents) {
    return { error: `Refund $${(input.amountCents / 100).toFixed(2)} exceeds deposit balance $${(user.securityDepositCents / 100).toFixed(2)}.` };
  }

  const newBalance = user.securityDepositCents - input.amountCents;
  const refundId = cuid();
  const noteBody = `Security deposit refunded · $${(input.amountCents / 100).toFixed(2)} via ${input.paymentMethod}${reason ? ` · ${reason}` : ""} · balance now $${(newBalance / 100).toFixed(2)}`;

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: { securityDepositCents: newBalance },
      }),
      prisma.payment.create({
        data: {
          id: cuid(),
          squarePaymentId: `deposit-refund-${refundId}`,
          userId: input.userId,
          amount: input.amountCents,
          currency: "USD",
          status: "REFUNDED",
          sourceType: input.paymentMethod,
          note: `Security deposit refund${reason ? ` · ${reason}` : ""}`,
          squareCreatedAt: new Date().toISOString(),
        },
      }),
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId: input.userId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "billing",
          body: noteBody,
        },
      }),
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "deposit.refund",
          entityType: "User",
          entityId: input.userId,
          metadata: JSON.stringify({
            amountCents: input.amountCents,
            paymentMethod: input.paymentMethod,
            reason,
            prevBalanceCents: user.securityDepositCents,
            newBalanceCents: newBalance,
            suiteNumber: user.suiteNumber,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Security deposit refund transaction failed:", e);
    return { error: "Refund failed mid-write — no changes saved. Try again." };
  }

  revalidatePath("/admin");
  return { success: true as const, newBalanceCents: newBalance };
}

// ─── Key inventory ────────────────────────────────────────────────────────────

export async function listKeys(filter?: "all" | "issued" | "available" | "lost") {
  await verifyAdmin();
  const where =
    filter === "issued"   ? { status: "Issued" } :
    filter === "available" ? { status: "InStock" } :
    filter === "lost"      ? { status: "Lost" } :
    {};
  return (prisma as any).mailboxKey.findMany({
    where,
    orderBy: [{ status: "asc" }, { suiteNumber: "asc" }],
    take: 500,
  });
}

export async function addKeyToInventory(input: { keyTag: string; suiteNumber: string; notes?: string }) {
  const admin = await verifyAdmin();
  const tag = input.keyTag.trim();
  const suite = input.suiteNumber.trim();
  if (!tag) return { error: "Key tag required" };
  if (!suite) return { error: "Suite number required" };

  const existing = await (prisma as any).mailboxKey.findUnique({ where: { keyTag: tag } });
  if (existing) return { error: `Key tag "${tag}" is already in inventory.` };

  await (prisma as any).mailboxKey.create({
    data: {
      id: cuid(),
      keyTag: tag,
      suiteNumber: suite,
      status: "InStock",
      notes: input.notes?.trim() || null,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "key.add",
      entityType: "MailboxKey",
      metadata: JSON.stringify({ keyTag: tag, suiteNumber: suite }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const };
}

export async function issueKey(input: { keyId: string; userId: string }) {
  const admin = await verifyAdmin();
  const key = await (prisma as any).mailboxKey.findUnique({ where: { id: input.keyId } });
  if (!key) return { error: "Key not found" };
  if (key.status === "Issued") return { error: "Key already issued — return it first." };
  if (key.status === "Lost" || key.status === "Retired") return { error: `Key is ${key.status}. Re-add to inventory first.` };

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { name: true, suiteNumber: true } });
  if (!user) return { error: "Customer not found" };

  await (prisma as any).mailboxKey.update({
    where: { id: input.keyId },
    data: {
      status: "Issued",
      issuedToId: input.userId,
      issuedAt: new Date(),
      returnedAt: null,
      suiteNumber: user.suiteNumber ?? key.suiteNumber,
    },
  });
  await (prisma as any).customerNote.create({
    data: {
      id: cuid(),
      userId: input.userId,
      authorId: admin.id ?? null,
      authorName: admin.name ?? null,
      kind: "system",
      body: `Key ${key.keyTag} issued (suite ${user.suiteNumber ?? key.suiteNumber})`,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "key.issue",
      entityType: "MailboxKey",
      entityId: input.keyId,
      metadata: JSON.stringify({ keyTag: key.keyTag, userId: input.userId, suiteNumber: user.suiteNumber }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const };
}

export async function returnKey(keyId: string) {
  const admin = await verifyAdmin();
  const key = await (prisma as any).mailboxKey.findUnique({ where: { id: keyId } });
  if (!key) return { error: "Key not found" };
  if (key.status !== "Issued") return { error: `Key status is ${key.status}, can't return.` };

  const prevUserId = key.issuedToId;

  await (prisma as any).mailboxKey.update({
    where: { id: keyId },
    data: {
      status: "InStock",
      issuedToId: null,
      returnedAt: new Date(),
    },
  });
  if (prevUserId) {
    await (prisma as any).customerNote.create({
      data: {
        id: cuid(),
        userId: prevUserId,
        authorId: admin.id ?? null,
        authorName: admin.name ?? null,
        kind: "system",
        body: `Key ${key.keyTag} returned`,
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "key.return",
      entityType: "MailboxKey",
      entityId: keyId,
      metadata: JSON.stringify({ keyTag: key.keyTag, prevUserId }),
    },
  });
  revalidatePath("/admin");
  return { success: true as const };
}

// $25 lost-key replacement fee — debited from the wallet so it shows up in
// the customer's ledger, not just a note. If wallet would go negative we
// still charge (allow customer to top up later); revisit if collections is
// preferred. Setting `chargeFee: false` skips the debit entirely.
const LOST_KEY_FEE_CENTS = 2500;

export async function markKeyLost(input: { keyId: string; chargeFee?: boolean }) {
  const admin = await verifyAdmin();
  const key = await (prisma as any).mailboxKey.findUnique({ where: { id: input.keyId } });
  if (!key) return { error: "Key not found" };

  const prevUserId = key.issuedToId;
  const shouldCharge = !!input.chargeFee && !!prevUserId;

  // Need the wallet balance to compute balanceAfterCents for the ledger row.
  let newBal = 0;
  if (shouldCharge) {
    const u = await prisma.user.findUnique({
      where: { id: prevUserId! },
      select: { walletBalanceCents: true },
    });
    if (!u) return { error: "Customer linked to key was not found" };
    newBal = u.walletBalanceCents - LOST_KEY_FEE_CENTS;
  }

  // Atomic: key state + customer note + (optional) wallet debit + ledger +
  // audit must all commit together so we never end up with a "fee charged"
  // note but no actual charge in the wallet history.
  const ops: any[] = [
    (prisma as any).mailboxKey.update({
      where: { id: input.keyId },
      data: { status: "Lost" },
    }),
  ];
  if (prevUserId) {
    ops.push(
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId: prevUserId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "issue",
          body: `Key ${key.keyTag} marked LOST${shouldCharge ? ` · $${(LOST_KEY_FEE_CENTS / 100).toFixed(2)} replacement fee charged` : ""}`,
        },
      }),
    );
  }
  if (shouldCharge) {
    ops.push(
      prisma.user.update({
        where: { id: prevUserId! },
        data: { walletBalanceCents: newBal },
      }),
      prisma.walletTransaction.create({
        data: {
          id: cuid(),
          userId: prevUserId!,
          kind: "Charge",
          amountCents: -LOST_KEY_FEE_CENTS,
          description: `Lost key replacement (${key.keyTag})`,
          balanceAfterCents: newBal,
        },
      }),
    );
  }
  ops.push(
    prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "key.lost",
        entityType: "MailboxKey",
        entityId: input.keyId,
        metadata: JSON.stringify({
          keyTag: key.keyTag,
          prevUserId,
          chargeFee: shouldCharge,
          chargedCents: shouldCharge ? LOST_KEY_FEE_CENTS : 0,
        }),
      },
    }),
  );

  await prisma.$transaction(ops);
  revalidatePath("/admin");
  return { success: true as const, charged: shouldCharge ? LOST_KEY_FEE_CENTS : 0 };
}

// ─── Walk-in signup wizard ───────────────────────────────────────────────────
// Streamlined in-store customer creation: admin enters minimum info, suite is
// activated immediately, initial term is recorded as a MailboxRenewal so the
// audit trail starts on day 1, payment is logged, and a welcome email goes out.
//
// kycStatus defaults to "Approved" because the admin is verifying the customer
// in person; if uploads are required they can be added later from the customer
// profile.

export async function createWalkInSignup(input: {
  // Identity
  name: string;
  phone?: string;
  email?: string;
  boxType?: "Personal" | "Business";
  businessName?: string;
  businessOwnerName?: string;
  businessOwnerRelation?: string;
  businessOwnerPhone?: string;
  // Plan
  plan: string;
  termMonths: 3 | 6 | 14;
  planAmountCents: number;
  // Suite
  suiteNumber: string;
  // Money
  depositCents: number;
  keyFeeCents: number;
  paymentMethod: "Cash" | "Square" | "CardOnFile";
  // ID verification (optional; admin can complete later if missing)
  idPrimaryType?: string;
  idPrimaryNumber?: string;
  idPrimaryExpDate?: string;
  idPrimaryIssuer?: string;
  idPrimaryImageUrl?: string;
  idSecondaryType?: string;
  idSecondaryNumber?: string;
  idSecondaryExpDate?: string;
  idSecondaryIssuer?: string;
  idSecondaryImageUrl?: string;
  // Email
  sendWelcome?: boolean;
}) {
  const admin = await verifyAdmin();

  // Validation
  const name = input.name.trim();
  if (!name) return { error: "Customer name required" };
  const suite = input.suiteNumber.trim();
  if (!suite) return { error: "Suite number required" };
  if (![3, 6, 14].includes(input.termMonths)) return { error: "Term must be 3, 6, or 14 months" };
  if (!Number.isInteger(input.planAmountCents) || input.planAmountCents < 0) return { error: "Invalid plan amount" };
  if (!Number.isInteger(input.depositCents) || input.depositCents < 0) return { error: "Invalid deposit" };
  if (!Number.isInteger(input.keyFeeCents) || input.keyFeeCents < 0) return { error: "Invalid key fee" };

  const boxType = input.boxType ?? "Personal";
  if (boxType === "Business") {
    if (!input.businessName?.trim()) return { error: "Business name required for Business box" };
    if (!input.businessOwnerName?.trim()) return { error: "Business owner name required" };
    if (!input.businessOwnerRelation?.trim()) return { error: "Owner role/relation required" };
  }

  // Suite conflict
  const suiteOwner = await prisma.user.findUnique({ where: { suiteNumber: suite } });
  if (suiteOwner) return { error: `Suite ${suite} is already assigned to ${suiteOwner.name}` };

  // Email — optional. Generate a placeholder if missing so the unique-email
  // constraint still holds and the customer can be edited later.
  const emailRaw = (input.email ?? "").trim().toLowerCase();
  // Crypto-grade suffix so the placeholder address can never collide
  // (Math.random was theoretically collidable across concurrent walk-ins).
  const placeholderSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const email = emailRaw || `noemail+${suite.toLowerCase().replace(/[^a-z0-9]/g, "")}-${placeholderSuffix}@nohomailbox.local`;
  if (emailRaw) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return { error: "Email already exists in the system" };
  }

  // Plan dates — add termMonths from today UTC.
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const newDue = addMonthsUtc(todayUtc, input.termMonths);
  const planDueDate = fmtUtcDateString(newDue);

  // Temp password — admin can text it / customer can reset later. Crypto-grade
  // randomness so it can never be guessed even if the timing window is known.
  const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 10) + "A1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const userId = cuid();
  const renewalId = cuid();

  try {
    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          phone: input.phone?.trim() || null,
          passwordHash,
          plan: input.plan,
          planTerm: String(input.termMonths),
          suiteNumber: suite,
          status: "Active",
          mailboxStatus: "Active",
          mailboxAssignedAt: new Date(),
          kycStatus: "Approved",
          kycReviewedAt: new Date(),
          kycReviewedBy: admin.id ?? null,
          planDueDate,
          planExpiresAt: newDue,
          securityDepositCents: input.depositCents,
          securityDepositTotalCents: input.depositCents,
          boxType,
          businessName: boxType === "Business" ? input.businessName!.trim() : null,
          businessOwnerName: input.businessOwnerName?.trim() || null,
          businessOwnerRelation: input.businessOwnerRelation?.trim() || null,
          businessOwnerPhone: input.businessOwnerPhone?.trim() || null,
          // ID verification (optional — kycStatus already "Approved" because
          // admin verified in person; these fields persist what they captured).
          idPrimaryType:      input.idPrimaryType?.trim() || null,
          idPrimaryNumber:    input.idPrimaryNumber?.trim() || null,
          idPrimaryExpDate:   input.idPrimaryExpDate?.trim() || null,
          idPrimaryIssuer:    input.idPrimaryIssuer?.trim() || null,
          kycIdImageUrl:      input.idPrimaryImageUrl ?? null,
          idSecondaryType:    input.idSecondaryType?.trim() || null,
          idSecondaryNumber:  input.idSecondaryNumber?.trim() || null,
          idSecondaryExpDate: input.idSecondaryExpDate?.trim() || null,
          idSecondaryIssuer:  input.idSecondaryIssuer?.trim() || null,
          kycIdImage2Url:     input.idSecondaryImageUrl ?? null,
        },
      }),
      // Plan period payment
      prisma.payment.create({
        data: {
          id: cuid(),
          squarePaymentId: `walkin-plan-${userId}`,
          userId,
          amount: input.planAmountCents,
          currency: "USD",
          status: "COMPLETED",
          sourceType: input.paymentMethod,
          note: `Walk-in signup · ${input.plan} · ${input.termMonths} months`,
          squareCreatedAt: now.toISOString(),
        },
      }),
      // Deposit payment (separate row so refunds are clean)
      ...(input.depositCents > 0
        ? [prisma.payment.create({
            data: {
              id: cuid(),
              squarePaymentId: `walkin-deposit-${userId}`,
              userId,
              amount: input.depositCents,
              currency: "USD",
              status: "COMPLETED",
              sourceType: input.paymentMethod,
              note: `Security deposit · walk-in signup`,
              squareCreatedAt: now.toISOString(),
            },
          })]
        : []),
      // Key fee payment (if any)
      ...(input.keyFeeCents > 0
        ? [prisma.payment.create({
            data: {
              id: cuid(),
              squarePaymentId: `walkin-key-${userId}`,
              userId,
              amount: input.keyFeeCents,
              currency: "USD",
              status: "COMPLETED",
              sourceType: input.paymentMethod,
              note: `Mailbox key fee · walk-in signup`,
              squareCreatedAt: now.toISOString(),
            },
          })]
        : []),
      // Initial term recorded as a renewal (so the renewal log starts on day 1)
      (prisma as any).mailboxRenewal.create({
        data: {
          id: renewalId,
          userId,
          termMonths: input.termMonths,
          planAtRenewal: input.plan,
          amountCents: input.planAmountCents,
          paymentMethod: input.paymentMethod,
          paidAt: now,
          prevPlanDueDate: null,
          newPlanDueDate: planDueDate,
          prevPlanExpiresAt: null,
          newPlanExpiresAt: newDue,
          notes: `Walk-in signup · initial term${input.depositCents > 0 ? ` · deposit $${(input.depositCents / 100).toFixed(2)}` : ""}${input.keyFeeCents > 0 ? ` · key fee $${(input.keyFeeCents / 100).toFixed(2)}` : ""}`,
          createdById: admin.id ?? null,
        },
      }),
      // Welcome note
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "system",
          body: `Walk-in signup processed · Suite #${suite} · ${input.plan} · ${input.termMonths}mo · ${input.paymentMethod}`,
        },
      }),
      // Audit log
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "customer.walkin.create",
          entityType: "User",
          entityId: userId,
          metadata: JSON.stringify({
            suite,
            plan: input.plan,
            termMonths: input.termMonths,
            planAmountCents: input.planAmountCents,
            depositCents: input.depositCents,
            keyFeeCents: input.keyFeeCents,
            paymentMethod: input.paymentMethod,
            boxType,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Walk-in signup transaction failed:", e);
    // Parse Prisma P2002 unique-constraint failures for actionable error messages
    // — covers TOCTOU races where two admins race for the same suite/email.
    const code = (e as { code?: string }).code;
    const target = (e as { meta?: { target?: string[] } }).meta?.target?.join(",") ?? "";
    if (code === "P2002") {
      if (target.includes("suiteNumber")) {
        return { error: `Suite ${suite} was just taken by another admin. Pick a different suite.` };
      }
      if (target.includes("email")) {
        return { error: "Email already exists in the system. Use a different email or leave it blank." };
      }
      return { error: "A unique constraint failed — likely suite or email collision. Try again." };
    }
    return { error: "Signup failed mid-write — no changes saved. Try again." };
  }

  // Welcome email — outside the transaction so a Resend hiccup doesn't fail
  // a customer whose user record + payments are already saved.
  if (input.sendWelcome !== false && emailRaw) {
    try {
      await sendMailboxActivatedEmail(email, name.split(" ")[0] ?? name, suite);
    } catch (e) {
      console.error("Walk-in welcome email failed:", e);
    }
  }

  revalidatePath("/admin");
  return { success: true as const, userId, tempPassword, planDueDate };
}

// ─── Cancel customer with pro-rated refund ──────────────────────────────────
// One-shot admin action when a customer wants to close their box mid-cycle.
// Sets status + mailboxStatus to inactive, processes the refund as a Payment
// (status=REFUNDED), writes customer note + audit log. Caller passes the
// refund amount (admin can compute or use the suggested pro-rate).

export async function cancelCustomerWithRefund(input: {
  userId: string;
  refundAmountCents: number;
  paymentMethod: "Cash" | "Square" | "CardOnFile" | "WalletCredit";
  reason: string;
}) {
  const admin = await verifyAdmin();
  const reason = input.reason.trim();
  if (!reason) return { error: "Reason required (audit trail)." };
  if (!Number.isInteger(input.refundAmountCents) || input.refundAmountCents < 0) {
    return { error: "Refund amount must be a non-negative integer (cents)." };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, suiteNumber: true, status: true, mailboxStatus: true },
  });
  if (!user) return { error: "Customer not found." };
  if (user.mailboxStatus === "Cancelled" || user.status === "Inactive") {
    return { error: "Customer is already cancelled." };
  }

  // Cap the refund at "what the customer has actually paid us, minus what we've
  // already refunded." Without this cap a typo (or a compromised admin session)
  // could refund a multiple of what they owe. We don't trust the client number.
  if (input.refundAmountCents > 0) {
    const [paidAgg, refundedAgg] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId: input.userId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { userId: input.userId, status: "REFUNDED" },
        _sum: { amount: true },
      }),
    ]);
    const totalPaidCents = paidAgg._sum.amount ?? 0;
    const totalRefundedCents = refundedAgg._sum.amount ?? 0;
    const refundableCents = Math.max(0, totalPaidCents - totalRefundedCents);
    if (input.refundAmountCents > refundableCents) {
      const cap = (refundableCents / 100).toFixed(2);
      return {
        error: `Refund of $${(input.refundAmountCents / 100).toFixed(2)} exceeds the customer's refundable balance ($${cap}). They've paid $${(totalPaidCents / 100).toFixed(2)} and already received $${(totalRefundedCents / 100).toFixed(2)} in refunds.`,
      };
    }
  }

  const refundId = cuid();
  const dollars = (input.refundAmountCents / 100).toFixed(2);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: {
          status: "Inactive",
          mailboxStatus: "Cancelled",
          planAutoRenew: false,
        },
      }),
      ...(input.refundAmountCents > 0
        ? [prisma.payment.create({
            data: {
              id: cuid(),
              squarePaymentId: `cancel-refund-${refundId}`,
              userId: input.userId,
              amount: input.refundAmountCents,
              currency: "USD",
              status: "REFUNDED",
              sourceType: input.paymentMethod,
              note: `Cancellation refund · ${reason}`,
              squareCreatedAt: new Date().toISOString(),
            },
          })]
        : []),
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId: input.userId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "billing",
          body: `Account cancelled · ${input.refundAmountCents > 0 ? `refunded $${dollars} via ${input.paymentMethod} · ` : "no refund · "}${reason}`,
        },
      }),
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "customer.cancel.refund",
          entityType: "User",
          entityId: input.userId,
          metadata: JSON.stringify({
            refundAmountCents: input.refundAmountCents,
            paymentMethod: input.paymentMethod,
            reason,
            suiteNumber: user.suiteNumber,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Cancel + refund transaction failed:", e);
    return { error: "Cancellation failed mid-write — no changes saved. Try again." };
  }

  revalidatePath("/admin");
  return { success: true as const, refundedCents: input.refundAmountCents };
}

// ─── Wallet history — recent transactions for a customer ────────────────────
export async function listWalletTxns(userId: string, limit = 10) {
  await verifyAdmin();
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─── Admin wallet top-up — direct credit (cash sale, comp, adjustment) ───────
// Skips the customer-initiated CreditRequest + Square link flow. Records as a
// WalletTransaction (kind=TopUp) and a Payment (status=COMPLETED) so revenue
// reports stay accurate. Uses a Prisma transaction to keep balance + ledger
// strictly consistent.

export async function adminAddWalletCredit(input: {
  userId: string;
  amountCents: number;
  paymentMethod: "Cash" | "Square" | "CardOnFile" | "Comp";
  reason: string;
}) {
  const admin = await verifyAdmin();
  const reason = input.reason.trim();
  if (!reason) return { error: "Reason required (audit trail)." };
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { error: "Top-up amount must be a positive integer (cents)." };
  }
  if (input.amountCents > 100000) {
    return { error: "Top-up over $1,000 — split into smaller amounts or use Credits flow." };
  }

  // Rolling-window cap: max $5,000 in admin top-ups per customer per 24 hours.
  // The per-call $1,000 limit alone is bypassable (just call 100 times in a
  // loop) — this guards against the script-the-admin-session attack while
  // still allowing big legitimate top-ups across multiple sessions/days. We
  // count audit-log entries because they're the durable record of the action.
  const ROLLING_24H_CAP_CENTS = 500_000;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.auditLog.findMany({
    where: {
      action: "wallet.admin.topup",
      entityId: input.userId,
      createdAt: { gte: dayAgo },
    },
    select: { metadata: true },
  });
  let recentCents = 0;
  for (const r of recent) {
    try {
      const meta = JSON.parse(r.metadata ?? "{}") as { amountCents?: number };
      if (typeof meta.amountCents === "number") recentCents += meta.amountCents;
    } catch {
      // Old/malformed audit entries — skip rather than blow up.
    }
  }
  if (recentCents + input.amountCents > ROLLING_24H_CAP_CENTS) {
    const remaining = Math.max(0, ROLLING_24H_CAP_CENTS - recentCents);
    return {
      error: `24-hour top-up cap of $${(ROLLING_24H_CAP_CENTS / 100).toFixed(0)} would be exceeded. Already topped up $${(recentCents / 100).toFixed(2)} for this customer in the last 24h; $${(remaining / 100).toFixed(2)} remaining today.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, walletBalanceCents: true, suiteNumber: true },
  });
  if (!user) return { error: "Customer not found." };

  const newBalance = user.walletBalanceCents + input.amountCents;
  const txId = cuid();

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.userId },
        data: { walletBalanceCents: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          id: txId,
          userId: input.userId,
          kind: "TopUp",
          amountCents: input.amountCents,
          description: `Admin top-up · ${input.paymentMethod}${reason ? ` · ${reason}` : ""}`,
          balanceAfterCents: newBalance,
        },
      }),
      // Comps don't go through Payment (no money changed hands)
      ...(input.paymentMethod !== "Comp"
        ? [prisma.payment.create({
            data: {
              id: cuid(),
              squarePaymentId: `wallet-topup-${txId}`,
              userId: input.userId,
              amount: input.amountCents,
              currency: "USD",
              status: "COMPLETED",
              sourceType: input.paymentMethod,
              note: `Admin wallet top-up · ${reason}`,
              squareCreatedAt: new Date().toISOString(),
            },
          })]
        : []),
      (prisma as any).customerNote.create({
        data: {
          id: cuid(),
          userId: input.userId,
          authorId: admin.id ?? null,
          authorName: admin.name ?? null,
          kind: "billing",
          body: `Wallet top-up · +$${(input.amountCents / 100).toFixed(2)} via ${input.paymentMethod} · ${reason} · balance now $${(newBalance / 100).toFixed(2)}`,
        },
      }),
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "wallet.admin.topup",
          entityType: "User",
          entityId: input.userId,
          metadata: JSON.stringify({
            amountCents: input.amountCents,
            paymentMethod: input.paymentMethod,
            reason,
            prevBalance: user.walletBalanceCents,
            newBalance,
            suiteNumber: user.suiteNumber,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Admin wallet top-up transaction failed:", e);
    return { error: "Top-up failed mid-write — no changes saved. Try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true as const, newBalanceCents: newBalance };
}
