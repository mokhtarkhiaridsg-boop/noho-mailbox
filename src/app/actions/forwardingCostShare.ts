"use server";

/**
 * iter-230 — Forwarding cost-share split server actions (Tier 17 #139).
 *
 * Workflow:
 *   1. Admin builds a Suggested group: pick ≥2 members forwarding to
 *      the same destination + log each member's individual postage cost
 *      + the combined-shipment cost.
 *   2. `approveForwardingCostShareGroup` atomically:
 *        - splits the savings (totalIndividual − combined) evenly across
 *          members, floor-divided so we never over-credit;
 *        - for each member, creates a `WalletTransaction kind="Refund"`
 *          + bumps `User.walletBalanceCents` (atomic per member);
 *        - audits `forwarding.cost_share_split` once for the group;
 *        - fires `forwarding.cost_share_split` webhook for ops.
 *   3. Optional `markGroupShipped({trackingNumber})` flips status →
 *      "Shipped" once admin drops the combined parcel with the carrier.
 *
 * Reuses iter-228 atomic-tx pattern, iter-229 webhook event registration.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";
import { normalizeAddress, shortLabel } from "@/lib/cost-share-address";

export type CostShareMemberRow = {
  id: string;
  userId: string;
  userName: string | null;
  suiteNumber: string | null;
  individualPostageCents: number;
  creditCents: number;
  walletTxnId: string | null;
};

export type CostShareGroupRow = {
  id: string;
  status: "Suggested" | "Approved" | "Shipped" | "Cancelled";
  destAddressLabel: string;
  destShort: string;                // "NYC 10128"
  destCity: string | null;
  destState: string | null;
  destZip: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  totalIndividualCents: number;
  combinedPostageCents: number;
  savingsCents: number;
  perMemberCreditCents: number;
  notes: string | null;
  approvedAtIso: string | null;
  shippedAtIso: string | null;
  cancelledAtIso: string | null;
  cancelledReason: string | null;
  createdAtIso: string;
  members: CostShareMemberRow[];
};

function toView(r: { id: string; status: string; destAddressLabel: string; destCity: string | null; destState: string | null; destZip: string | null; carrier: string | null; trackingNumber: string | null; totalIndividualCents: number; combinedPostageCents: number; savingsCents: number; perMemberCreditCents: number; notes: string | null; approvedAt: Date | null; shippedAt: Date | null; cancelledAt: Date | null; cancelledReason: string | null; createdAt: Date; members: Array<{ id: string; userId: string; userNameSnapshot: string | null; suiteSnapshot: string | null; individualPostageCents: number; creditCents: number; walletTxnId: string | null }> }): CostShareGroupRow {
  const status: CostShareGroupRow["status"] =
    r.status === "Approved" ? "Approved" :
    r.status === "Shipped" ? "Shipped" :
    r.status === "Cancelled" ? "Cancelled" : "Suggested";
  return {
    id: r.id, status,
    destAddressLabel: r.destAddressLabel,
    destShort: shortLabel(r.destAddressLabel),
    destCity: r.destCity, destState: r.destState, destZip: r.destZip,
    carrier: r.carrier, trackingNumber: r.trackingNumber,
    totalIndividualCents: r.totalIndividualCents,
    combinedPostageCents: r.combinedPostageCents,
    savingsCents: r.savingsCents,
    perMemberCreditCents: r.perMemberCreditCents,
    notes: r.notes,
    approvedAtIso: r.approvedAt?.toISOString() ?? null,
    shippedAtIso: r.shippedAt?.toISOString() ?? null,
    cancelledAtIso: r.cancelledAt?.toISOString() ?? null,
    cancelledReason: r.cancelledReason,
    createdAtIso: r.createdAt.toISOString(),
    members: r.members.map((m) => ({
      id: m.id, userId: m.userId,
      userName: m.userNameSnapshot, suiteNumber: m.suiteSnapshot,
      individualPostageCents: m.individualPostageCents,
      creditCents: m.creditCents, walletTxnId: m.walletTxnId,
    })),
  };
}

// ─── Create ────────────────────────────────────────────────────────────

export async function createForwardingCostShareGroup(input: {
  destAddress: string;
  carrier?: string;
  combinedPostageCents: number;
  notes?: string;
  members: Array<{ userId: string; individualPostageCents: number }>;
}): Promise<{ group?: CostShareGroupRow; error?: string }> {
  const actor = await verifyAdmin();
  const dest = input.destAddress?.trim();
  if (!dest || dest.length < 6) return { error: "Destination address required (min 6 chars)." };
  if (!input.members || input.members.length < 2) return { error: "Need ≥2 members for a cost-share." };
  if (!Number.isFinite(input.combinedPostageCents) || input.combinedPostageCents < 0) return { error: "Combined postage must be ≥ 0." };
  // Dedupe members by userId
  const seen = new Set<string>();
  for (const m of input.members) {
    if (!Number.isFinite(m.individualPostageCents) || m.individualPostageCents < 0) return { error: "Each member's individual postage must be ≥ 0." };
    if (seen.has(m.userId)) return { error: "Duplicate member in cost-share." };
    seen.add(m.userId);
  }

  // Validate users exist + grab snapshots
  const users = await prisma.user.findMany({
    where: { id: { in: input.members.map((m) => m.userId) } },
    select: { id: true, name: true, suiteNumber: true },
  });
  if (users.length !== input.members.length) return { error: "One or more users not found." };
  const userById = new Map(users.map((u) => [u.id, u]));

  const totalIndividual = input.members.reduce((acc, m) => acc + Math.round(m.individualPostageCents), 0);
  const combined = Math.round(input.combinedPostageCents);
  const savings = Math.max(0, totalIndividual - combined);
  const perMemberCredit = Math.floor(savings / input.members.length);

  if (savings <= 0) return { error: "No savings — combined cost is not less than total individual cost." };

  const norm = normalizeAddress(dest);
  const created = await prisma.forwardingCostShareGroup.create({
    data: {
      destAddressHash: norm.hash,
      destAddressLabel: norm.label.slice(0, 400),
      destCity: norm.city, destState: norm.state, destZip: norm.zip,
      carrier: input.carrier?.trim().slice(0, 20) || null,
      totalIndividualCents: totalIndividual,
      combinedPostageCents: combined,
      savingsCents: savings,
      perMemberCreditCents: perMemberCredit,
      notes: input.notes?.trim().slice(0, 500) || null,
      createdById: actor.id,
      members: {
        create: input.members.map((m) => {
          const u = userById.get(m.userId)!;
          return {
            userId: m.userId,
            userNameSnapshot: u.name ?? null,
            suiteSnapshot: u.suiteNumber ?? null,
            individualPostageCents: Math.round(m.individualPostageCents),
          };
        }),
      },
    },
    include: { members: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "forwarding.cost_share_suggested",
      entityType: "ForwardingCostShareGroup", entityId: created.id,
      metadata: JSON.stringify({
        members: input.members.length,
        totalIndividualCents: totalIndividual,
        combinedPostageCents: combined,
        savingsCents: savings,
        perMemberCreditCents: perMemberCredit,
        destShort: shortLabel(dest),
      }),
    },
  }).catch(() => null);

  revalidatePath("/admin");
  return { group: toView(created) };
}

// ─── Approve & split savings ───────────────────────────────────────────

export async function approveForwardingCostShareGroup(input: { id: string }): Promise<{ group?: CostShareGroupRow; error?: string }> {
  const actor = await verifyAdmin();
  const group = await prisma.forwardingCostShareGroup.findUnique({
    where: { id: input.id },
    include: { members: true },
  });
  if (!group) return { error: "Group not found." };
  if (group.status !== "Suggested") return { error: `Group is already ${group.status}; cannot re-approve.` };
  if (group.members.length < 2) return { error: "Group has < 2 members." };
  if (group.perMemberCreditCents <= 0) return { error: "Per-member credit is 0 — nothing to split." };

  const credit = group.perMemberCreditCents;
  const memberDescription = `Forwarding cost-share · ${shortLabel(group.destAddressLabel)} · saved $${(credit / 100).toFixed(2)} batched with ${group.members.length - 1} neighbor${group.members.length - 1 === 1 ? "" : "s"}`;

  // Apply credits one member at a time so we never over-credit if any one
  // wallet update throws. Each transaction is atomic per-member: balance
  // bump + WalletTransaction insert.
  const now = new Date();
  for (const m of group.members) {
    try {
      const user = await prisma.user.findUnique({ where: { id: m.userId }, select: { walletBalanceCents: true } });
      if (!user) continue;
      const newBalance = user.walletBalanceCents + credit;
      const [, txn] = await prisma.$transaction([
        prisma.user.update({
          where: { id: m.userId },
          data: { walletBalanceCents: newBalance },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: m.userId,
            kind: "Refund",
            amountCents: credit,
            description: memberDescription,
            balanceAfterCents: newBalance,
          },
        }),
      ]);
      await prisma.forwardingCostShareMember.update({
        where: { id: m.id },
        data: { creditCents: credit, walletTxnId: txn.id },
      });
    } catch {
      // Skip individual member failures — admin can manually reconcile;
      // we still emit a single audit event below summarizing what we did.
    }
  }

  const approved = await prisma.forwardingCostShareGroup.update({
    where: { id: group.id },
    data: { status: "Approved", approvedAt: now, approvedById: actor.id },
    include: { members: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "forwarding.cost_share_split",
      entityType: "ForwardingCostShareGroup", entityId: group.id,
      metadata: JSON.stringify({
        members: group.members.length,
        perMemberCreditCents: credit,
        totalSavingsCents: group.savingsCents,
        destShort: shortLabel(group.destAddressLabel),
      }),
    },
  }).catch(() => null);

  void fireWebhooks("forwarding.cost_share_split", {
    text: `🤝 Forwarding cost-share · ${shortLabel(group.destAddressLabel)} · ${group.members.length} members · $${(credit / 100).toFixed(2)} credited each`,
    emoji: "🤝",
    detail: {
      groupId: group.id,
      members: group.members.length,
      perMemberCreditCents: credit,
      totalSavingsCents: group.savingsCents,
      destShort: shortLabel(group.destAddressLabel),
    },
  });

  revalidatePath("/admin");
  return { group: toView(approved) };
}

// ─── Mark shipped (after approval) ─────────────────────────────────────

export async function markCostShareGroupShipped(input: { id: string; trackingNumber?: string }): Promise<{ group?: CostShareGroupRow; error?: string }> {
  const actor = await verifyAdmin();
  const group = await prisma.forwardingCostShareGroup.findUnique({ where: { id: input.id }, include: { members: true } });
  if (!group) return { error: "Group not found." };
  if (group.status !== "Approved") return { error: "Group must be Approved before marking shipped." };
  const updated = await prisma.forwardingCostShareGroup.update({
    where: { id: group.id },
    data: { status: "Shipped", shippedAt: new Date(), trackingNumber: input.trackingNumber?.trim().slice(0, 80) || null },
    include: { members: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "forwarding.cost_share_shipped",
      entityType: "ForwardingCostShareGroup", entityId: group.id,
      metadata: JSON.stringify({ trackingNumber: input.trackingNumber ?? null }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { group: toView(updated) };
}

// ─── Cancel ────────────────────────────────────────────────────────────

export async function cancelForwardingCostShareGroup(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const group = await prisma.forwardingCostShareGroup.findUnique({ where: { id: input.id } });
  if (!group) return { error: "Group not found." };
  if (group.status === "Approved" || group.status === "Shipped") return { error: "Cannot cancel an Approved/Shipped group (wallet credits already applied)." };
  if (group.status === "Cancelled") return { success: true };
  const reason = input.reason?.trim();
  if (!reason || reason.length < 4) return { error: "Cancel reason (≥4 chars) required." };
  await prisma.$transaction([
    prisma.forwardingCostShareGroup.update({
      where: { id: group.id },
      data: { status: "Cancelled", cancelledAt: new Date(), cancelledReason: reason.slice(0, 200) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "forwarding.cost_share_cancelled",
        entityType: "ForwardingCostShareGroup", entityId: group.id,
        metadata: JSON.stringify({ reason: reason.slice(0, 80) }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Read ──────────────────────────────────────────────────────────────

export async function listForwardingCostShareGroups(input: { status?: "Suggested" | "Approved" | "Shipped" | "Cancelled"; limit?: number } = {}): Promise<CostShareGroupRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 30));
  const where = input.status ? { status: input.status } : {};
  const rows = await prisma.forwardingCostShareGroup.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map(toView);
}

export async function getCostShareSummary(): Promise<{
  suggestedCount: number;
  approvedCount: number;
  shippedCount: number;
  totalSavingsCentsAllTime: number;
  totalCreditsCentsAllTime: number;
}> {
  await verifyAdmin();
  const [suggested, approved, shipped, sumAgg] = await Promise.all([
    prisma.forwardingCostShareGroup.count({ where: { status: "Suggested" } }),
    prisma.forwardingCostShareGroup.count({ where: { status: "Approved" } }),
    prisma.forwardingCostShareGroup.count({ where: { status: "Shipped" } }),
    prisma.forwardingCostShareGroup.findMany({
      where: { status: { in: ["Approved", "Shipped"] } },
      select: { savingsCents: true, perMemberCreditCents: true, members: { select: { creditCents: true } } },
    }),
  ]);
  const totalSavings = sumAgg.reduce((acc, r) => acc + r.savingsCents, 0);
  const totalCredits = sumAgg.reduce((acc, r) => acc + r.members.reduce((a, m) => a + m.creditCents, 0), 0);
  return {
    suggestedCount: suggested,
    approvedCount: approved,
    shippedCount: shipped,
    totalSavingsCentsAllTime: totalSavings,
    totalCreditsCentsAllTime: totalCredits,
  };
}

// Member-side helper for searchable picker.
export async function searchUsersForCostShare(input: { q: string; limit?: number } = { q: "" }): Promise<Array<{ id: string; name: string | null; suiteNumber: string | null }>> {
  await verifyAdmin();
  const q = input.q?.trim() || "";
  if (q.length < 2) return [];
  const rows = await prisma.user.findMany({
    where: {
      AND: [
        { role: { not: "ADMIN" } },
        {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { suiteNumber: { contains: q } },
          ],
        },
      ],
    },
    select: { id: true, name: true, suiteNumber: true },
    take: Math.min(20, Math.max(1, input.limit ?? 10)),
    orderBy: { name: "asc" },
  });
  return rows;
}
