"use server";

/**
 * iter-229 — Cash-drawer reconciliation server actions (Tier 17 #138).
 *
 * Daily cash-drawer session lifecycle:
 *   open → (sales accumulate via iter-130 POSSale rows) → adjustments
 *   (paid_in / paid_out) → close (counted ending float) → variance
 *   computed = closingCents - (opening + cashSales - cashRefunds + adjustments).
 *
 * Sessions with |variance| > tolerance are flagged "Variance" + audit
 * `cashdrawer.variance_flagged` + cashdrawer.variance_flagged webhook
 * fires for compliance. Admin must sign off with a reason memo to
 * resolve.
 *
 * Reuses iter-130 POSSale rows as the cash-sales source (paymentMethod
 * = "Cash"), iter-228-style atomic prisma.$transaction([update, audit])
 * for state changes, and existing fireWebhooks pipeline.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";

export type CashDrawerAdjustmentRow = {
  id: string;
  kind: "paid_in" | "paid_out";
  amountCents: number;
  signedCents: number;     // +amount when paid_in, -amount when paid_out
  reason: string;
  category: string | null;
  receiptRef: string | null;
  byActorName: string | null;
  createdAtIso: string;
};

export type CashDrawerSessionRow = {
  id: string;
  number: number;
  stationLabel: string | null;
  status: "Open" | "Closed" | "Variance";
  openingCents: number;
  cashSalesCents: number;
  cashRefundsCents: number;
  adjustmentsCents: number;
  expectedClosingCents: number;
  closingCents: number | null;
  varianceCents: number | null;
  varianceFlagged: boolean;
  varianceTolerance: number;
  closeNote: string | null;
  signOffReason: string | null;
  signedOffAtIso: string | null;
  signedOffByName: string | null;
  openedAtIso: string;
  openedByName: string | null;
  closedAtIso: string | null;
  closedByName: string | null;
  notes: string | null;
  adjustments: CashDrawerAdjustmentRow[];
};

// ─── Helpers ───────────────────────────────────────────────────────────

async function nextSessionNumber(): Promise<number> {
  const last = await prisma.cashDrawerSession.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 100) + 1;
}

async function computeWindowSums(openedAt: Date, closedAt: Date | null): Promise<{ cashSalesCents: number; cashRefundsCents: number }> {
  const end = closedAt ?? new Date();
  // Cash sales: POSSale rows with paymentMethod=Cash, status=Paid, paidAt within window.
  const sales = await prisma.pOSSale.findMany({
    where: { paymentMethod: "Cash", status: "Paid", paidAt: { gte: openedAt, lte: end } },
    select: { totalCents: true },
  });
  const cashSalesCents = sales.reduce((acc, s) => acc + (s.totalCents ?? 0), 0);
  // Cash refunds: POSSale rows with paymentMethod=Cash, status=Refunded, refundedAt within window.
  const refunds = await prisma.pOSSale.findMany({
    where: { paymentMethod: "Cash", status: "Refunded", refundedAt: { gte: openedAt, lte: end } },
    select: { totalCents: true },
  });
  const cashRefundsCents = refunds.reduce((acc, r) => acc + (r.totalCents ?? 0), 0);
  return { cashSalesCents, cashRefundsCents };
}

function adjustmentsSignedSum(adjustments: Array<{ kind: string; amountCents: number }>): number {
  return adjustments.reduce((acc, a) => acc + (a.kind === "paid_in" ? a.amountCents : -a.amountCents), 0);
}

function toAdjustmentView(a: { id: string; kind: string; amountCents: number; reason: string; category: string | null; receiptRef: string | null; byActorName: string | null; createdAt: Date }): CashDrawerAdjustmentRow {
  const kind = a.kind === "paid_in" ? "paid_in" : "paid_out";
  return {
    id: a.id, kind,
    amountCents: a.amountCents,
    signedCents: kind === "paid_in" ? a.amountCents : -a.amountCents,
    reason: a.reason, category: a.category, receiptRef: a.receiptRef,
    byActorName: a.byActorName,
    createdAtIso: a.createdAt.toISOString(),
  };
}

function toSessionView(r: { id: string; number: number; stationLabel: string | null; status: string; openingCents: number; cashSalesCents: number; cashRefundsCents: number; adjustmentsCents: number; expectedClosingCents: number; closingCents: number | null; varianceCents: number | null; varianceFlagged: boolean; varianceTolerance: number; closeNote: string | null; signOffReason: string | null; signedOffAt: Date | null; signedOffByName?: string | null; openedAt: Date; openedByName: string | null; closedAt: Date | null; closedByName: string | null; notes: string | null; adjustments: Array<{ id: string; kind: string; amountCents: number; reason: string; category: string | null; receiptRef: string | null; byActorName: string | null; createdAt: Date }> }): CashDrawerSessionRow {
  return {
    id: r.id, number: r.number, stationLabel: r.stationLabel,
    status: (r.status === "Variance" ? "Variance" : r.status === "Closed" ? "Closed" : "Open"),
    openingCents: r.openingCents,
    cashSalesCents: r.cashSalesCents, cashRefundsCents: r.cashRefundsCents,
    adjustmentsCents: r.adjustmentsCents, expectedClosingCents: r.expectedClosingCents,
    closingCents: r.closingCents, varianceCents: r.varianceCents,
    varianceFlagged: r.varianceFlagged, varianceTolerance: r.varianceTolerance,
    closeNote: r.closeNote, signOffReason: r.signOffReason,
    signedOffAtIso: r.signedOffAt?.toISOString() ?? null,
    signedOffByName: r.signedOffByName ?? null,
    openedAtIso: r.openedAt.toISOString(),
    openedByName: r.openedByName,
    closedAtIso: r.closedAt?.toISOString() ?? null,
    closedByName: r.closedByName,
    notes: r.notes,
    adjustments: r.adjustments.map(toAdjustmentView),
  };
}

// ─── Open ──────────────────────────────────────────────────────────────

export async function openCashDrawerSession(input: { openingCents: number; stationLabel?: string; varianceTolerance?: number; notes?: string }): Promise<{ session?: CashDrawerSessionRow; error?: string }> {
  const actor = await verifyAdmin();
  const opening = Math.max(0, Math.round(input.openingCents));
  if (!Number.isFinite(opening)) return { error: "Opening amount must be a positive number." };

  // Block if there is already an Open session — one drawer at a time.
  const existing = await prisma.cashDrawerSession.findFirst({ where: { status: "Open" }, select: { id: true, number: true } });
  if (existing) return { error: `Drawer #${existing.number} is already Open. Close it before opening a new one.` };

  const number = await nextSessionNumber();
  const created = await prisma.cashDrawerSession.create({
    data: {
      number,
      stationLabel: input.stationLabel?.trim().slice(0, 60) || null,
      openingCents: opening,
      openedById: actor.id,
      openedByName: actor.name ?? null,
      varianceTolerance: input.varianceTolerance != null ? Math.max(0, Math.round(input.varianceTolerance)) : 500,
      notes: input.notes?.trim().slice(0, 500) || null,
    },
    include: { adjustments: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "cashdrawer.opened",
      entityType: "CashDrawerSession", entityId: created.id,
      metadata: JSON.stringify({ number, openingCents: opening, stationLabel: input.stationLabel ?? null }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { session: toSessionView({ ...created, signedOffByName: null }) };
}

// ─── Add adjustment ────────────────────────────────────────────────────

export async function addCashDrawerAdjustment(input: { sessionId: string; kind: "paid_in" | "paid_out"; amountCents: number; reason: string; category?: string; receiptRef?: string }): Promise<{ adjustment?: CashDrawerAdjustmentRow; error?: string }> {
  const actor = await verifyAdmin();
  const sess = await prisma.cashDrawerSession.findUnique({ where: { id: input.sessionId } });
  if (!sess) return { error: "Session not found." };
  if (sess.status !== "Open") return { error: "Cannot adjust a closed session." };
  if (input.kind !== "paid_in" && input.kind !== "paid_out") return { error: "Kind must be paid_in or paid_out." };
  const amount = Math.round(input.amountCents);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be > 0." };
  const reason = input.reason?.trim();
  if (!reason || reason.length < 2) return { error: "Reason is required." };

  const created = await prisma.cashDrawerAdjustment.create({
    data: {
      sessionId: sess.id,
      kind: input.kind,
      amountCents: amount,
      reason: reason.slice(0, 200),
      category: input.category?.trim().slice(0, 40) || null,
      receiptRef: input.receiptRef?.trim().slice(0, 80) || null,
      byActorId: actor.id,
      byActorName: actor.name ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "cashdrawer.adjustment_added",
      entityType: "CashDrawerSession", entityId: sess.id,
      metadata: JSON.stringify({ adjustmentId: created.id, kind: input.kind, amountCents: amount, reason: reason.slice(0, 80) }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { adjustment: toAdjustmentView(created) };
}

// ─── Close ─────────────────────────────────────────────────────────────

export async function closeCashDrawerSession(input: { id: string; closingCents: number; closeNote?: string }): Promise<{ session?: CashDrawerSessionRow; error?: string }> {
  const actor = await verifyAdmin();
  const sess = await prisma.cashDrawerSession.findUnique({ where: { id: input.id }, include: { adjustments: true } });
  if (!sess) return { error: "Session not found." };
  if (sess.status !== "Open") return { error: "Session is not open." };
  const closing = Math.round(input.closingCents);
  if (!Number.isFinite(closing) || closing < 0) return { error: "Counted closing must be ≥ 0." };

  const closeAt = new Date();
  const { cashSalesCents, cashRefundsCents } = await computeWindowSums(sess.openedAt, closeAt);
  const adjustmentsCents = adjustmentsSignedSum(sess.adjustments);
  const expectedClosingCents = sess.openingCents + cashSalesCents - cashRefundsCents + adjustmentsCents;
  const varianceCents = closing - expectedClosingCents;
  const varianceFlagged = Math.abs(varianceCents) > sess.varianceTolerance;
  const status = varianceFlagged ? "Variance" : "Closed";

  const updated = await prisma.cashDrawerSession.update({
    where: { id: sess.id },
    data: {
      cashSalesCents, cashRefundsCents, adjustmentsCents, expectedClosingCents,
      closingCents: closing, varianceCents, varianceFlagged, status,
      closeNote: input.closeNote?.trim().slice(0, 500) || null,
      closedAt: closeAt, closedById: actor.id, closedByName: actor.name ?? null,
    },
    include: { adjustments: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: varianceFlagged ? "cashdrawer.variance_flagged" : "cashdrawer.closed",
      entityType: "CashDrawerSession", entityId: sess.id,
      metadata: JSON.stringify({
        number: sess.number, openingCents: sess.openingCents,
        cashSalesCents, cashRefundsCents, adjustmentsCents,
        expectedClosingCents, closingCents: closing, varianceCents,
        varianceTolerance: sess.varianceTolerance,
      }),
    },
  }).catch(() => null);

  if (varianceFlagged) {
    const sign = varianceCents > 0 ? "+" : "−";
    const abs = Math.abs(varianceCents);
    void fireWebhooks("cashdrawer.variance_flagged", {
      text: `💰 Drawer #${sess.number} closed ${sign}$${(abs / 100).toFixed(2)} vs expected · needs sign-off`,
      emoji: "💰",
      detail: {
        sessionNumber: sess.number,
        varianceCents,
        expectedClosingCents,
        closingCents: closing,
        cashSalesCents, cashRefundsCents, adjustmentsCents,
        tolerance: sess.varianceTolerance,
      },
    });
  }
  revalidatePath("/admin");
  return { session: toSessionView({ ...updated, signedOffByName: null }) };
}

// ─── Sign off on a flagged variance ────────────────────────────────────

export async function signOffCashDrawerVariance(input: { id: string; reason: string }): Promise<{ session?: CashDrawerSessionRow; error?: string }> {
  const actor = await verifyAdmin();
  const sess = await prisma.cashDrawerSession.findUnique({ where: { id: input.id }, include: { adjustments: true } });
  if (!sess) return { error: "Session not found." };
  if (!sess.varianceFlagged) return { error: "Session is not flagged." };
  const reason = input.reason?.trim();
  if (!reason || reason.length < 4) return { error: "Sign-off reason (≥4 chars) required." };

  const updated = await prisma.cashDrawerSession.update({
    where: { id: sess.id },
    data: {
      varianceFlagged: false,
      status: "Closed",
      signOffReason: reason.slice(0, 500),
      signedOffAt: new Date(),
      signedOffById: actor.id,
    },
    include: { adjustments: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "cashdrawer.signed_off",
      entityType: "CashDrawerSession", entityId: sess.id,
      metadata: JSON.stringify({ varianceCents: sess.varianceCents, reason: reason.slice(0, 80) }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { session: toSessionView({ ...updated, signedOffByName: actor.name ?? null }) };
}

// ─── Read ──────────────────────────────────────────────────────────────

export async function listCashDrawerSessions(input: { limit?: number; status?: "Open" | "Closed" | "Variance" } = {}): Promise<CashDrawerSessionRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const where = input.status ? { status: input.status } : {};
  const rows = await prisma.cashDrawerSession.findMany({
    where, orderBy: [{ openedAt: "desc" }], take: limit,
    include: { adjustments: { orderBy: { createdAt: "desc" } } },
  });
  // Enrich signed-off names in batch.
  const signedIds = Array.from(new Set(rows.map((r) => r.signedOffById).filter((v): v is string => !!v)));
  const signedUsers = signedIds.length
    ? await prisma.user.findMany({ where: { id: { in: signedIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(signedUsers.map((u) => [u.id, u.name]));
  return rows.map((r) => toSessionView({ ...r, signedOffByName: r.signedOffById ? nameById.get(r.signedOffById) ?? null : null }));
}

export async function getCurrentOpenSession(): Promise<CashDrawerSessionRow | null> {
  await verifyAdmin();
  const r = await prisma.cashDrawerSession.findFirst({
    where: { status: "Open" },
    include: { adjustments: { orderBy: { createdAt: "desc" } } },
  });
  if (!r) return null;
  // Live preview: compute running expected so admin sees what they should count.
  const { cashSalesCents, cashRefundsCents } = await computeWindowSums(r.openedAt, null);
  const adjustmentsCents = adjustmentsSignedSum(r.adjustments);
  const expectedClosingCents = r.openingCents + cashSalesCents - cashRefundsCents + adjustmentsCents;
  return toSessionView({
    ...r,
    cashSalesCents, cashRefundsCents, adjustmentsCents, expectedClosingCents,
    signedOffByName: null,
  });
}

export async function getCashDrawerSummary(input: { sinceIso?: string } = {}): Promise<{
  openCount: number;
  flaggedCount: number;
  last7Variance: number;          // signed sum
  last7AbsVariance: number;
  last7Sessions: number;
}> {
  await verifyAdmin();
  const since = input.sinceIso ? new Date(input.sinceIso) : new Date(Date.now() - 7 * 24 * 3600_000);
  const [openCount, flaggedCount, last7] = await Promise.all([
    prisma.cashDrawerSession.count({ where: { status: "Open" } }),
    prisma.cashDrawerSession.count({ where: { varianceFlagged: true } }),
    prisma.cashDrawerSession.findMany({
      where: { closedAt: { gte: since } },
      select: { varianceCents: true },
    }),
  ]);
  const last7Variance = last7.reduce((acc, r) => acc + (r.varianceCents ?? 0), 0);
  const last7AbsVariance = last7.reduce((acc, r) => acc + Math.abs(r.varianceCents ?? 0), 0);
  return { openCount, flaggedCount, last7Variance, last7AbsVariance, last7Sessions: last7.length };
}
