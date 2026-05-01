"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { sendKycStatusEmail, sendMailboxActivatedEmail, sendSquarePaymentLinkEmail } from "@/lib/email";

export async function createCustomer(formData: FormData) {
  await verifyAdmin();

  const name = formData.get("name") as string;
  const emailRaw = ((formData.get("email") as string) || "").trim().toLowerCase();
  const plan = formData.get("plan") as string;
  const suiteNumber = formData.get("suite") as string;
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string) || null;
  const planTerm = (formData.get("planTerm") as string) || null;
  const planDueDate = (formData.get("planDueDate") as string) || null;
  const mailboxStatus = (formData.get("mailboxStatus") as string) || "Pending";
  const kycStatus = (formData.get("kycStatus") as string) || "Pending";
  const depositCentsRaw = formData.get("depositCents") as string;
  const securityDepositCents = depositCentsRaw ? parseInt(depositCentsRaw) : 0;
  const cardLast4 = (formData.get("cardLast4") as string) || null;
  const cardBrand = (formData.get("cardBrand") as string) || null;
  const cardExpiry = (formData.get("cardExpiry") as string) || null;
  const cardholderName = (formData.get("cardholderName") as string) || null;
  const cardDiscountPct = parseInt((formData.get("cardDiscountPct") as string) || "0") || 0;

  // CMRA box-type fields. A company cannot exist as an individual — for
  // Business boxes, an Owner with name + relation is required.
  const boxType = ((formData.get("boxType") as string) || "Personal").trim();
  const businessName = (formData.get("businessName") as string)?.trim() || null;
  const businessOwnerName = (formData.get("businessOwnerName") as string)?.trim() || null;
  const businessOwnerRelation = (formData.get("businessOwnerRelation") as string)?.trim() || null;
  const businessOwnerPhone = (formData.get("businessOwnerPhone") as string)?.trim() || null;

  if (!name || !plan || !suiteNumber) {
    return { error: "Name, plan, and suite number are required" };
  }

  if (boxType === "Business") {
    if (!businessName) return { error: "Business name is required for a Business box" };
    if (!businessOwnerName)
      return { error: "Business owner name is required — a company can't exist as an individual" };
    if (!businessOwnerRelation)
      return { error: "Owner's role/relation is required (Owner / Officer / Member / etc.)" };
  }

  // Email is optional now. If admin doesn't supply one, generate a placeholder
  // so the unique-email constraint and downstream auth still work. Admin can
  // edit it later in EditCustomerModal.
  const email =
    emailRaw ||
    `noemail+${suiteNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 8)}@nohomailbox.local`;

  if (emailRaw) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "Email already exists" };
  }

  const existingSuite = await prisma.user.findUnique({ where: { suiteNumber } });
  if (existingSuite) return { error: "Suite number already taken" };

  // Use provided password or generate a random temporary one (crypto-grade).
  const tempPassword = password || crypto.randomUUID().replace(/-/g, "").slice(0, 10) + "A1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      plan,
      suiteNumber,
      phone,
      planTerm,
      planDueDate,
      mailboxStatus,
      kycStatus,
      securityDepositCents,
      cardLast4,
      cardBrand,
      cardExpiry,
      cardholderName,
      cardDiscountPct,
      boxType,
      businessName,
      businessOwnerName,
      businessOwnerRelation,
      businessOwnerPhone,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateDeliveryStatus(
  orderId: string,
  status: string,
  courier?: string
) {
  await verifyAdmin();

  await prisma.deliveryOrder.update({
    where: { id: orderId },
    data: {
      status,
      ...(courier ? { courier } : {}),
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateShopOrderStatus(orderId: string, status: string) {
  await verifyAdmin();

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/admin");
  return { success: true };
}

// ============================================================
// iPostal1-parity admin actions
// ============================================================

export async function assignMailbox(userId: string, suiteNumber: string) {
  const admin = await verifyAdmin();

  if (!suiteNumber.trim()) return { error: "Suite number required" };

  const conflict = await prisma.user.findUnique({
    where: { suiteNumber },
    select: { id: true },
  });
  if (conflict && conflict.id !== userId) {
    return { error: "Suite number already taken" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, kycNotes: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      suiteNumber,
      mailboxStatus: "Active",
      mailboxAssignedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "assignMailbox",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ suiteNumber }),
    },
  });

  // Apply deferred referral credit (set during signup, captured in kycNotes
  // because requestMailbox doesn't fire credit pre-payment to defeat a
  // credit-mint vector). This is the legitimate post-activation moment to
  // credit both wallets — the customer is now paid + active, so the bonus
  // is honored. Idempotent via applyReferralCodeInternal's atomic claim
  // (re-running on a customer who's already been credited is a no-op).
  if (user?.kycNotes) {
    const match = user.kycNotes.match(/Referral code:\s*([A-Z0-9-]+)/i);
    if (match) {
      const code = match[1];
      try {
        const { applyReferralCodeInternal } = await import("@/lib/referral-internal");
        const ok = await applyReferralCodeInternal(code, userId);
        if (ok) {
          await prisma.auditLog.create({
            data: {
              actorId: admin.id ?? "",
              actorRole: "ADMIN",
              action: "referral.creditOnActivation",
              entityType: "User",
              entityId: userId,
              metadata: JSON.stringify({ code, suiteNumber }),
            },
          });
        }
      } catch (e) {
        // Non-fatal — activation completes regardless. Log so admin can
        // notice if the credit pipeline starts silently failing.
        console.error("[assignMailbox] applyReferralCodeInternal failed:", e);
      }
    }
  }

  // Notify customer their mailbox is live (fire-and-forget)
  if (user) {
    try {
      await sendMailboxActivatedEmail(user.email, user.name ?? "there", suiteNumber);
    } catch { /* non-fatal */ }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bulkAssignMailboxes(userIds: string[], startSuite: number) {
  await verifyAdmin();
  let suite = startSuite;
  for (const userId of userIds) {
    // Find next free suite
    while (
      await prisma.user.findUnique({
        where: { suiteNumber: String(suite) },
        select: { id: true },
      })
    ) {
      suite += 1;
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        suiteNumber: String(suite),
        mailboxStatus: "Active",
        mailboxAssignedAt: new Date(),
      },
    });
    suite += 1;
  }
  revalidatePath("/admin");
  return { success: true };
}

export async function reviewKyc(
  userId: string,
  decision: "Approved" | "Rejected",
  notes?: string
) {
  const admin = await verifyAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, plan: true, suiteNumber: true },
  });
  if (!user) return { error: "User not found" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: decision,
      kycReviewedAt: new Date(),
      kycReviewedBy: admin.id ?? null,
      kycNotes: notes ?? null,
      // If approved AND has paid plan AND already has a suite, activate
      mailboxStatus:
        decision === "Approved" && user.plan && user.plan !== "Free" && user.suiteNumber
          ? "Active"
          : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: `kyc:${decision}`,
      entityType: "User",
      entityId: userId,
      metadata: notes ? JSON.stringify({ notes }) : null,
    },
  });

  // Notify customer of KYC decision (fire-and-forget)
  try {
    await sendKycStatusEmail(user.email, user.name ?? "there", decision, notes);
  } catch { /* non-fatal */ }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function issueNewKey(userId: string, keyRequestId?: string) {
  const admin = await verifyAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityDepositCents: true },
  });
  if (!user) return { error: "User not found" };

  const feeCents = 2500;
  const newBalance = Math.max(0, user.securityDepositCents - feeCents);

  await prisma.user.update({
    where: { id: userId },
    data: { securityDepositCents: newBalance },
  });

  await prisma.walletTransaction.create({
    data: {
      userId,
      kind: "DepositCharge",
      amountCents: -feeCents,
      description: "Mailbox key replacement",
      balanceAfterCents: newBalance,
    },
  });

  if (keyRequestId) {
    await prisma.keyRequest.update({
      where: { id: keyRequestId },
      data: { status: "Issued", completedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "issueNewKey",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ feeCents }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSecurityDeposit(userId: string, amountCents: number) {
  await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { securityDepositCents: amountCents },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function updateCustomerSuite(userId: string, newSuiteNumber: string) {
  const admin = await verifyAdmin();
  if (!newSuiteNumber.trim()) return { error: "Suite number required" };

  const conflict = await prisma.user.findUnique({
    where: { suiteNumber: newSuiteNumber.trim() },
    select: { id: true },
  });
  if (conflict && conflict.id !== userId) {
    return { error: "Suite number already taken" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { suiteNumber: newSuiteNumber.trim() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "changeSuite",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ newSuiteNumber }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCustomerPlanDueDate(userId: string, dueDate: string) {
  await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { planDueDate: dueDate || null },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function updateMailboxStatus(
  userId: string,
  status: "Pending" | "Assigned" | "Active" | "Suspended"
) {
  const admin = await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { mailboxStatus: status },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "setMailboxStatus",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ status }),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCustomerPlan(
  userId: string,
  plan: string,
  planTerm: string | null
) {
  const admin = await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { plan: plan || null, planTerm: planTerm || null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "updatePlan",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ plan, planTerm }),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function suspendCustomer(userId: string) {
  const admin = await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { status: "Expired", mailboxStatus: "Suspended" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "suspendCustomer",
      entityType: "User",
      entityId: userId,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reactivateCustomer(userId: string) {
  const admin = await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { status: "Active", mailboxStatus: "Active" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "reactivateCustomer",
      entityType: "User",
      entityId: userId,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCustomerDetails(
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    suiteNumber?: string;
    plan?: string;
    planTerm?: string | null;
    mailboxStatus?: string;
    planDueDate?: string | null;
    securityDepositCents?: number;
    kycStatus?: string;
    cardLast4?: string | null;
    cardBrand?: string | null;
    cardExpiry?: string | null;
    cardholderName?: string | null;
    cardDiscountPct?: number;
    // KYC / ID file URLs + types + expiration dates
    kycForm1583Url?: string | null;
    kycIdImageUrl?: string | null;
    kycIdImage2Url?: string | null;
    idPrimaryType?: string | null;
    idSecondaryType?: string | null;
    idPrimaryExpDate?: string | null;
    idSecondaryExpDate?: string | null;
    idPrimaryNumber?: string | null;
    idSecondaryNumber?: string | null;
    idPrimaryIssuer?: string | null;
    idSecondaryIssuer?: string | null;
    // Box ownership
    boxType?: string | null;
    businessName?: string | null;
    businessOwnerName?: string | null;
    businessOwnerRelation?: string | null;
    businessOwnerPhone?: string | null;
  }
) {
  const admin = await verifyAdmin();

  // Check suite conflict if changing suite
  if (data.suiteNumber !== undefined) {
    const conflict = await prisma.user.findFirst({
      where: { suiteNumber: data.suiteNumber, id: { not: userId } },
      select: { id: true },
    });
    if (conflict) return { error: `Suite #${data.suiteNumber} is already assigned to another customer` };
  }

  // Check email conflict if changing email
  if (data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: data.email, id: { not: userId } },
      select: { id: true },
    });
    if (conflict) return { error: "That email is already used by another account" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.suiteNumber !== undefined ? { suiteNumber: data.suiteNumber || null } : {}),
      ...(data.plan !== undefined ? { plan: data.plan || null } : {}),
      ...(data.planTerm !== undefined ? { planTerm: data.planTerm || null } : {}),
      ...(data.mailboxStatus ? { mailboxStatus: data.mailboxStatus } : {}),
      ...(data.planDueDate !== undefined ? { planDueDate: data.planDueDate || null } : {}),
      ...(data.securityDepositCents !== undefined ? { securityDepositCents: data.securityDepositCents } : {}),
      ...(data.kycStatus ? { kycStatus: data.kycStatus } : {}),
      ...(data.cardLast4 !== undefined ? { cardLast4: data.cardLast4 || null } : {}),
      ...(data.cardBrand !== undefined ? { cardBrand: data.cardBrand || null } : {}),
      ...(data.cardExpiry !== undefined ? { cardExpiry: data.cardExpiry || null } : {}),
      ...(data.cardholderName !== undefined ? { cardholderName: data.cardholderName || null } : {}),
      ...(data.cardDiscountPct !== undefined ? { cardDiscountPct: data.cardDiscountPct } : {}),
      ...(data.kycForm1583Url !== undefined ? { kycForm1583Url: data.kycForm1583Url || null } : {}),
      ...(data.kycIdImageUrl !== undefined ? { kycIdImageUrl: data.kycIdImageUrl || null } : {}),
      ...(data.kycIdImage2Url !== undefined ? { kycIdImage2Url: data.kycIdImage2Url || null } : {}),
      ...(data.idPrimaryType !== undefined ? { idPrimaryType: data.idPrimaryType || null } : {}),
      ...(data.idSecondaryType !== undefined ? { idSecondaryType: data.idSecondaryType || null } : {}),
      ...(data.idPrimaryExpDate !== undefined ? { idPrimaryExpDate: data.idPrimaryExpDate || null } : {}),
      ...(data.idSecondaryExpDate !== undefined ? { idSecondaryExpDate: data.idSecondaryExpDate || null } : {}),
      ...(data.idPrimaryNumber !== undefined ? { idPrimaryNumber: data.idPrimaryNumber || null } : {}),
      ...(data.idSecondaryNumber !== undefined ? { idSecondaryNumber: data.idSecondaryNumber || null } : {}),
      ...(data.idPrimaryIssuer !== undefined ? { idPrimaryIssuer: data.idPrimaryIssuer || null } : {}),
      ...(data.idSecondaryIssuer !== undefined ? { idSecondaryIssuer: data.idSecondaryIssuer || null } : {}),
      ...(data.boxType !== undefined ? { boxType: data.boxType || null } : {}),
      ...(data.businessName !== undefined ? { businessName: data.businessName || null } : {}),
      ...(data.businessOwnerName !== undefined ? { businessOwnerName: data.businessOwnerName || null } : {}),
      ...(data.businessOwnerRelation !== undefined ? { businessOwnerRelation: data.businessOwnerRelation || null } : {}),
      ...(data.businessOwnerPhone !== undefined ? { businessOwnerPhone: data.businessOwnerPhone || null } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "updateCustomerDetails",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify(data),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Admin: credit (or debit) a member's wallet. Positive = credit, negative = debit.
 * Records a WalletTransaction + AuditLog.
 */
export async function adminAdjustWallet(
  userId: string,
  amountCents: number,
  description: string
) {
  const admin = await verifyAdmin();
  if (!Number.isFinite(amountCents) || amountCents === 0) {
    return { error: "Amount must be non-zero" };
  }
  if (Math.abs(amountCents) > 1_000_00) {
    return { error: "Amount exceeds $1000 cap — split into smaller adjustments" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalanceCents: true },
  });
  if (!user) return { error: "User not found" };

  const newBalance = user.walletBalanceCents + amountCents;
  if (newBalance < 0) return { error: "Debit would make balance negative" };

  await prisma.user.update({
    where: { id: userId },
    data: { walletBalanceCents: newBalance },
  });

  await prisma.walletTransaction.create({
    data: {
      userId,
      kind: amountCents > 0 ? "Refund" : "Charge",
      amountCents,
      description: `[Admin] ${description || (amountCents > 0 ? "Credit" : "Debit")}`,
      balanceAfterCents: newBalance,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "adminAdjustWallet",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ amountCents, description, newBalance }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, newBalance };
}

/**
 * Admin: list email log entries (most recent first).
 * Optionally filter by userId to show per-member history.
 */
export async function adminGetEmailLogs(opts?: { userId?: string; limit?: number }) {
  await verifyAdmin();
  const take = Math.min(opts?.limit ?? 100, 500);
  return prisma.emailLog.findMany({
    where: opts?.userId ? { userId: opts.userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      userId: true,
      toEmail: true,
      subject: true,
      kind: true,
      status: true,
      provider: true,
      error: true,
      createdAt: true,
      sentAt: true,
    },
  });
}

// ─── Admin: get email body (to copy reset links / receipts manually) ──────────
export async function adminGetEmailBody(logId: string) {
  await verifyAdmin();
  const log = await prisma.emailLog.findUnique({
    where: { id: logId },
    select: { id: true, subject: true, toEmail: true, body: true, kind: true, status: true },
  });
  return log;
}

// ─── Admin: generate password reset link without sending email ────────────────
// Workaround for when email delivery isn't configured. Admin copies the link
// and shares it with the customer via SMS, phone, or in person.
export async function adminGeneratePasswordResetLink(userId: string) {
  await verifyAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return { error: "User not found" };

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? "https://nohomailbox.org";
  const url = `${baseUrl}/reset-password?token=${token}`;

  return {
    success: true,
    url,
    email: user.email,
    name: user.name,
    expiresAt: expiresAt.toISOString(),
  };
}

// ─── Admin: email a Square payment link to a pending signup ───────────────────
// Admin pastes the Square checkout/invoice URL they generated in the Square
// dashboard; we email it to the customer and log it to EmailLog.
export async function adminEmailSquarePaymentLink(userId: string, paymentUrl: string) {
  const admin = await verifyAdmin();
  if (!paymentUrl?.startsWith("http")) return { error: "Invalid payment URL" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true },
  });
  if (!user) return { error: "User not found" };

  const result = await sendSquarePaymentLinkEmail({
    email: user.email,
    name: user.name,
    paymentUrl,
    plan: user.plan,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id ?? "",
      actorRole: "ADMIN",
      action: "emailSquareLink",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ paymentUrl, emailStatus: result.status }),
    },
  });

  revalidatePath("/admin");

  if (result.status === "sent") {
    return { success: true, status: "sent" };
  }
  return {
    error: result.status === "not_sent"
      ? "Email provider not configured. Copy the URL and paste it directly to the customer."
      : "Email failed to send. Try again or paste the URL directly.",
  };
}
