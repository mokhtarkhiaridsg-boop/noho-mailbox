"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendKycStatusEmail, sendMailboxActivatedEmail } from "@/lib/email";

export async function createCustomer(formData: FormData) {
  await verifyAdmin();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const plan = formData.get("plan") as string;
  const suiteNumber = formData.get("suite") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !plan || !suiteNumber) {
    return { error: "All fields are required" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email already exists" };

  const existingSuite = await prisma.user.findUnique({ where: { suiteNumber } });
  if (existingSuite) return { error: "Suite number already taken" };

  // Use provided password or generate a random temporary one
  const tempPassword = password || Math.random().toString(36).slice(-10) + "A1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      plan,
      suiteNumber,
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
    select: { name: true, email: true },
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
