"use server";

/**
 * iter-208 — Member-facing supply marketplace (Tier 15 #117).
 *
 * Lets members browse + buy iter-150 supplies (boxes, tape, labels,
 * etc.) at member-tier pricing through their iter-101 wallet. The
 * sale path mirrors iter-150's admin sale movement so POS-side
 * inventory + margin reports stay coherent — same kind="sale" row,
 * same price+cost+tier snapshot, same audit pattern, just with
 * `customerId=session.id` so we know it was a member self-serve buy.
 *
 * Wallet: charged via WalletTransaction kind="Charge" with
 * `description = "Supply purchase: 2× Small box ($1.50/ea)"` so the
 * iter-101 wallet tab renders human-readable history.
 *
 * No new schema. Reuses Supply + SupplyMovement + WalletTransaction.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const MEMBER_TIER_LABELS = ["Member", "Members", "MEMBER"];   // common labels admin might pick
const MAX_QTY_PER_BUY = 50;                                    // sanity cap

export type MemberSupplyRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  // Member-tier price preferred; falls back to default tier; null when no tiers.
  priceCents: number | null;
  tierLabel: string | null;                                    // which tier price comes from
  inStock: boolean;
  notes: string | null;
};

function pickMemberTier(tiers: Array<{ label: string; salePriceCents: number; isDefault: boolean }>): { tierLabel: string; priceCents: number } | null {
  if (tiers.length === 0) return null;
  const member = tiers.find((t) => MEMBER_TIER_LABELS.some((l) => t.label.toLowerCase() === l.toLowerCase()));
  if (member) return { tierLabel: member.label, priceCents: member.salePriceCents };
  const def = tiers.find((t) => t.isDefault) ?? tiers[0]!;
  return { tierLabel: def.label, priceCents: def.salePriceCents };
}

export async function listMemberSupplyShop(): Promise<MemberSupplyRow[]> {
  await verifySession();
  const rows = await prisma.supply.findMany({
    where: { isActive: true },
    include: { priceTiers: true },
    orderBy: [{ onHand: "desc" }, { name: "asc" }],
  });
  return rows.map((s) => {
    const pick = pickMemberTier(s.priceTiers);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      unit: s.unit,
      onHand: s.onHand,
      priceCents: pick?.priceCents ?? null,
      tierLabel: pick?.tierLabel ?? null,
      inStock: s.onHand > 0 && pick != null,                    // require both stock + price to display "buyable"
      notes: s.notes,
    };
  }).filter((r) => r.priceCents != null);                       // members never see supplies without member-visible pricing
}

export type BuyResult = {
  success?: boolean;
  error?: string;
  supplyName?: string;
  qtyBought?: number;
  totalChargedCents?: number;
  newWalletBalanceCents?: number;
  newOnHand?: number;
};

export async function buyMemberSupply(input: { supplyId: string; quantity: number }): Promise<BuyResult> {
  const session = await verifySession();
  const userId = session.id!;
  const qty = Math.round(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Quantity must be positive." };
  if (qty > MAX_QTY_PER_BUY) return { error: `Max ${MAX_QTY_PER_BUY} per purchase.` };

  const supply = await prisma.supply.findUnique({
    where: { id: input.supplyId },
    include: { priceTiers: true },
  });
  if (!supply || !supply.isActive) return { error: "Supply not available." };
  if (supply.onHand < qty) return { error: `Only ${supply.onHand} ${supply.unit}${supply.onHand === 1 ? "" : "s"} on hand.` };

  const pick = pickMemberTier(supply.priceTiers);
  if (!pick) return { error: "This supply isn't priced for member purchase." };
  const totalCents = pick.priceCents * qty;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalanceCents: true, name: true } });
  if (!user) return { error: "User not found." };
  if (user.walletBalanceCents < totalCents) {
    return { error: `Wallet has $${(user.walletBalanceCents / 100).toFixed(2)} but this needs $${(totalCents / 100).toFixed(2)}. Top up your wallet first.` };
  }

  const newOnHand = supply.onHand - qty;
  const newBalance = user.walletBalanceCents - totalCents;
  const description = `Supply purchase: ${qty}× ${supply.name} ($${(pick.priceCents / 100).toFixed(2)}/${supply.unit})`;

  await prisma.$transaction([
    prisma.supply.update({ where: { id: supply.id }, data: { onHand: newOnHand } }),
    prisma.supplyMovement.create({
      data: {
        supplyId: supply.id,
        kind: "sale",
        delta: -qty,
        notes: `Member self-serve via supply marketplace`,
        performedById: userId,
        unitPriceCents: pick.priceCents,
        unitCostCents: supply.costCents ?? null,
        tierLabel: pick.tierLabel,
        customerId: userId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { walletBalanceCents: newBalance },
    }),
    prisma.walletTransaction.create({
      data: {
        userId,
        kind: "Charge",
        amountCents: -totalCents,
        description,
        balanceAfterCents: newBalance,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "supply.member_purchased",
        entityType: "Supply", entityId: supply.id,
        metadata: JSON.stringify({
          supplyName: supply.name, qty,
          unitPriceCents: pick.priceCents, totalCents,
          tierLabel: pick.tierLabel, newOnHand,
        }),
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return {
    success: true,
    supplyName: supply.name,
    qtyBought: qty,
    totalChargedCents: totalCents,
    newWalletBalanceCents: newBalance,
    newOnHand,
  };
}
