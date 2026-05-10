"use server";

/**
 * iter-177 — Stripe ACH renewal payments (Tier 12 #86).
 *
 * Member or admin sets up an ACH mandate via Stripe SetupIntent. Once
 * active, admin (or future cron) can charge it for renewals — much
 * lower fees than Square card on big-ticket Business plans.
 *
 * Three actions for the setup flow:
 *   1. setupAchForUser → returns Stripe SetupIntent client_secret
 *      (member's browser uses Stripe.js to attach the bank)
 *   2. recordAchMandate → server action called from the success page
 *      after Stripe.js returns a paymentMethodId
 *   3. revokeMyAchMandate → member-side soft-delete
 *
 * Charge:
 *   - chargeAchForRenewal({mandateId, amountCents, description})
 *     — admin-fired, creates StripeAchPayment row + audit
 *   - status comes back as "processing" (settles in 4-5 business days);
 *     a webhook (future iter) will flip to succeeded/failed.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  isStripeConfigured,
  createOrFindStripeCustomer,
  createAchSetupIntent,
  chargeAchPaymentMethod,
  type SetupIntentRow,
} from "@/lib/stripeAch";

export type AchMandateRow = {
  id: string;
  userId: string;
  bankName: string | null;
  bankLast4: string | null;
  status: "pending" | "active" | "revoked" | "failed";
  setupCompletedAtIso: string | null;
  revokedAtIso: string | null;
  notes: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; userId: string; bankName: string | null; bankLast4: string | null; status: string; setupCompletedAt: Date | null; revokedAt: Date | null; notes: string | null; createdAt: Date }): AchMandateRow {
  return {
    id: r.id,
    userId: r.userId,
    bankName: r.bankName,
    bankLast4: r.bankLast4,
    status: ["pending", "active", "revoked", "failed"].includes(r.status) ? (r.status as AchMandateRow["status"]) : "pending",
    setupCompletedAtIso: r.setupCompletedAt?.toISOString() ?? null,
    revokedAtIso: r.revokedAt?.toISOString() ?? null,
    notes: r.notes,
    createdAtIso: r.createdAt.toISOString(),
  };
}

export type SetupAchResult =
  | { ok: true; clientSecret: string; setupIntentId: string; customerId: string; isNewCustomer: boolean }
  | { ok: false; error: string; reason?: string };

// ─── Setup flow ──────────────────────────────────────────────────────
// Member-side: returns a SetupIntent client_secret that Stripe.js uses
// to attach a bank account. After Stripe.js confirms, the browser
// calls `recordAchMandate` with the resulting paymentMethodId.
export async function setupAchForMyUser(): Promise<SetupAchResult> {
  const session = await verifySession();
  if (!isStripeConfigured()) return { ok: false, error: "Stripe is not configured on this server.", reason: "not_configured" };
  const u = await prisma.user.findUnique({ where: { id: session.id! } });
  if (!u) return { ok: false, error: "User not found." };

  const customer = await createOrFindStripeCustomer({
    email: u.email, name: u.name, metadata: { userId: u.id, suite: u.suiteNumber ?? "" },
  });
  if (!customer.ok) return { ok: false, error: customer.reason };

  const intent = await createAchSetupIntent({
    customerId: customer.data.id,
    metadata: { userId: u.id },
  });
  if (!intent.ok) return { ok: false, error: intent.reason };

  return {
    ok: true,
    clientSecret: intent.data.client_secret,
    setupIntentId: intent.data.id,
    customerId: customer.data.id,
    isNewCustomer: false, // we don't track this — close enough
  };
}

// Admin-side companion: same as above but for any user.
export async function setupAchForUser(input: { userId: string }): Promise<SetupAchResult> {
  await verifyAdmin();
  if (!isStripeConfigured()) return { ok: false, error: "Stripe is not configured on this server.", reason: "not_configured" };
  const u = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!u) return { ok: false, error: "User not found." };

  const customer = await createOrFindStripeCustomer({
    email: u.email, name: u.name, metadata: { userId: u.id, suite: u.suiteNumber ?? "" },
  });
  if (!customer.ok) return { ok: false, error: customer.reason };

  const intent = await createAchSetupIntent({
    customerId: customer.data.id,
    metadata: { userId: u.id, initiatedBy: "admin" },
  });
  if (!intent.ok) return { ok: false, error: intent.reason };

  return {
    ok: true,
    clientSecret: intent.data.client_secret,
    setupIntentId: intent.data.id,
    customerId: customer.data.id,
    isNewCustomer: false,
  };
}

// Called from the browser AFTER Stripe.js confirms the SetupIntent.
// We store the resulting paymentMethodId + bank metadata so future
// charges can use it.
export async function recordAchMandate(input: {
  userId?: string;             // when omitted, uses the session user
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  bankName?: string;
  bankLast4?: string;
}): Promise<{ id?: string; error?: string }> {
  // Member-side: record their own. Admin-side: record for any user.
  const session = await verifySession();
  const userId = input.userId ?? session.id!;
  if (input.userId && session.role !== "ADMIN" && input.userId !== session.id) {
    return { error: "Cannot record mandate for another user." };
  }

  // Revoke any prior active mandate so there's only one active per
  // user at a time (admin can manually re-activate from the panel if
  // needed for split-billing scenarios).
  await prisma.stripeAchMandate.updateMany({
    where: { userId, status: "active" },
    data: { status: "revoked", revokedAt: new Date(), revokedReason: "superseded by new mandate" },
  });

  const created = await prisma.stripeAchMandate.create({
    data: {
      userId,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentMethod: input.stripePaymentMethodId,
      bankName: input.bankName?.slice(0, 80) ?? null,
      bankLast4: input.bankLast4?.replace(/\D/g, "").slice(-4) ?? null,
      status: "active",
      setupCompletedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id ?? "unknown",
      actorRole: session.role ?? "MEMBER",
      action: "stripe.ach_mandate_created",
      entityType: "StripeAchMandate",
      entityId: created.id,
      metadata: JSON.stringify({ userId, bankName: created.bankName, bankLast4: created.bankLast4 }),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { id: created.id };
}

export async function revokeAchMandate(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const row = await prisma.stripeAchMandate.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Mandate not found." };
  if (row.userId !== session.id && session.role !== "ADMIN") return { error: "Not your mandate." };
  if (row.status === "revoked") return { error: "Already revoked." };
  await prisma.$transaction([
    prisma.stripeAchMandate.update({
      where: { id: row.id },
      data: { status: "revoked", revokedAt: new Date(), revokedReason: input.reason?.trim().slice(0, 200) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.id ?? "unknown", actorRole: session.role ?? "MEMBER",
        action: "stripe.ach_mandate_revoked",
        entityType: "StripeAchMandate",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

// ─── Read ────────────────────────────────────────────────────────────
export async function listMyAchMandates(): Promise<AchMandateRow[]> {
  const session = await verifySession();
  const rows = await prisma.stripeAchMandate.findMany({
    where: { userId: session.id! },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rows.map(toRow);
}

export async function listAchMandatesForUser(input: { userId: string }): Promise<AchMandateRow[]> {
  await verifyAdmin();
  const rows = await prisma.stripeAchMandate.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toRow);
}

export type AchPaymentRow = {
  id: string;
  mandateId: string;
  userId: string;
  amountCents: number;
  description: string;
  stripePaymentIntentId: string | null;
  status: "processing" | "succeeded" | "failed" | "cancelled";
  failureCode: string | null;
  failureMessage: string | null;
  initiatedById: string | null;
  settledAtIso: string | null;
  createdAtIso: string;
};

export async function listMyAchPayments(): Promise<AchPaymentRow[]> {
  const session = await verifySession();
  const rows = await prisma.stripeAchPayment.findMany({
    where: { userId: session.id! },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id, mandateId: r.mandateId, userId: r.userId,
    amountCents: r.amountCents, description: r.description,
    stripePaymentIntentId: r.stripePaymentIntentId,
    status: ["processing", "succeeded", "failed", "cancelled"].includes(r.status) ? (r.status as AchPaymentRow["status"]) : "processing",
    failureCode: r.failureCode, failureMessage: r.failureMessage,
    initiatedById: r.initiatedById,
    settledAtIso: r.settledAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// ─── Charge for renewal (admin-fired) ────────────────────────────────
export type ChargeAchResult =
  | { ok: true; paymentId: string; status: string; stripePaymentIntentId: string | null }
  | { ok: false; error: string };

export async function chargeAchForRenewal(input: {
  mandateId: string;
  amountCents: number;
  description: string;
}): Promise<ChargeAchResult> {
  const actor = await verifyAdmin();
  if (!isStripeConfigured()) return { ok: false, error: "Stripe is not configured." };
  const mandate = await prisma.stripeAchMandate.findUnique({ where: { id: input.mandateId } });
  if (!mandate) return { ok: false, error: "Mandate not found." };
  if (mandate.status !== "active") return { ok: false, error: `Mandate is ${mandate.status} — cannot charge.` };
  if (input.amountCents < 100) return { ok: false, error: "Minimum $1." };

  // Create the charge row first so we have an id to write into the
  // Stripe metadata.
  const row = await prisma.stripeAchPayment.create({
    data: {
      mandateId: mandate.id,
      userId: mandate.userId,
      amountCents: Math.round(input.amountCents),
      description: input.description.slice(0, 500),
      status: "processing",
      initiatedById: actor.id ?? null,
    },
  });

  const charge = await chargeAchPaymentMethod({
    customerId: mandate.stripeCustomerId,
    paymentMethodId: mandate.stripePaymentMethod,
    amountCents: input.amountCents,
    description: input.description,
    mandateId: mandate.stripeMandateId ?? undefined,
    metadata: { internalPaymentId: row.id, userId: mandate.userId, kind: "renewal" },
  });

  if (!charge.ok) {
    await prisma.stripeAchPayment.update({
      where: { id: row.id },
      data: { status: "failed", failureMessage: charge.reason },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "stripe.ach_charge_failed",
        entityType: "StripeAchPayment",
        entityId: row.id,
        metadata: JSON.stringify({ mandateId: mandate.id, userId: mandate.userId, amountCents: input.amountCents, error: charge.reason }),
      },
    });
    return { ok: false, error: charge.reason };
  }

  // Status should be "processing" for ACH (settles in 4-5 business
  // days). We persist it as-is. A webhook will later flip to
  // succeeded/failed.
  const status = ["succeeded", "processing", "requires_action", "requires_payment_method", "canceled"].includes(charge.data.status)
    ? (charge.data.status === "canceled" ? "cancelled" : charge.data.status === "succeeded" ? "succeeded" : "processing")
    : "processing";

  await prisma.stripeAchPayment.update({
    where: { id: row.id },
    data: {
      stripePaymentIntentId: charge.data.id,
      stripeChargeId: charge.data.latest_charge ?? null,
      status,
      ...(status === "succeeded" ? { settledAt: new Date() } : {}),
    },
  });

  // If this was the FIRST successful charge, capture the mandateId
  // (Stripe returns it on the charge).
  if (status === "succeeded" && !mandate.stripeMandateId) {
    await prisma.stripeAchMandate.update({
      where: { id: mandate.id },
      data: { stripeMandateId: charge.data.latest_charge ?? null },
    }).catch(() => undefined);
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: status === "succeeded" ? "stripe.ach_charge_succeeded" : "stripe.ach_charge_processing",
      entityType: "StripeAchPayment",
      entityId: row.id,
      metadata: JSON.stringify({ mandateId: mandate.id, userId: mandate.userId, amountCents: input.amountCents, stripePaymentIntentId: charge.data.id, status }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, paymentId: row.id, status, stripePaymentIntentId: charge.data.id };
}

// ─── Member dashboard summary ────────────────────────────────────────
export async function getMyAchSummary(): Promise<{ active: AchMandateRow | null; recentPayments: AchPaymentRow[]; configured: boolean }> {
  const [mandates, payments] = await Promise.all([listMyAchMandates(), listMyAchPayments()]);
  const active = mandates.find((m) => m.status === "active") ?? null;
  return { active, recentPayments: payments, configured: isStripeConfigured() };
}
