"use server";

// iter-121 — Affiliate earnings dashboard.
//
// Reads existing Partner + PartnerCommission rows (no schema changes)
// and rolls them up into:
//   - Per-partner stat cards (total earned, paid, owed, leads, closed)
//   - Top-line metrics (lifetime paid, current owed, top partner, active count)
//   - Monthly bar series (last 12 months of closed commissions)
//   - Payout queue (closed-but-not-paid commissions, oldest first)

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type PartnerEarnings = {
  partnerId: string;
  businessName: string;
  contactName: string;
  email: string;
  category: string;
  status: string;
  code: string;
  commissionRate: number;
  totalEarnedCents: number;       // commissions across closed + paid
  paidCents: number;
  owedCents: number;              // closed but not paid
  leadCount: number;
  closedCount: number;
  lastActivityIso: string | null;
};

export type MonthlySeriesPoint = {
  monthIso: string;               // "YYYY-MM"
  monthLabel: string;             // "Apr"
  closedCents: number;
  paidCents: number;
};

export type PayoutQueueRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  prospectName: string;
  product: string;
  closedAtIso: string | null;
  commissionCents: number;
  ageDays: number;
};

export type AffiliateRollup = {
  partners: PartnerEarnings[];
  monthly: MonthlySeriesPoint[];
  payoutQueue: PayoutQueueRow[];
  totals: {
    lifetimePaidCents: number;
    currentOwedCents: number;
    activePartners: number;
    leadsThisMonth: number;
    closedThisMonth: number;
  };
};

export async function getAffiliateRollup(): Promise<AffiliateRollup> {
  await verifyAdmin();
  const [partners, commissions] = await Promise.all([
    prisma.partner.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.partnerCommission.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const byPartnerId = new Map<string, PartnerEarnings>();
  for (const p of partners) {
    byPartnerId.set(p.id, {
      partnerId: p.id,
      businessName: p.businessName,
      contactName: p.contactName,
      email: p.email,
      category: p.category,
      status: p.status,
      code: p.code,
      commissionRate: p.commissionRate,
      totalEarnedCents: 0,
      paidCents: 0,
      owedCents: 0,
      leadCount: 0,
      closedCount: 0,
      lastActivityIso: null,
    });
  }

  // Monthly bucketing (last 12 months including current).
  const now = new Date();
  const monthBuckets: MonthlySeriesPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      monthIso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      monthLabel: d.toLocaleString("en-US", { month: "short" }),
      closedCents: 0,
      paidCents: 0,
    });
  }
  function bucketFor(d: Date): MonthlySeriesPoint | undefined {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return monthBuckets.find((b) => b.monthIso === k);
  }

  let leadsThisMonth = 0;
  let closedThisMonth = 0;
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const payoutQueue: PayoutQueueRow[] = [];

  for (const c of commissions) {
    const slot = byPartnerId.get(c.partnerId);
    if (!slot) continue;
    if (c.status === "lead" || c.status === "quoted") slot.leadCount += 1;
    if (c.status === "closed" || c.status === "paid") {
      slot.closedCount += 1;
      slot.totalEarnedCents += c.commissionCents;
    }
    if (c.status === "paid") slot.paidCents += c.commissionCents;
    if (c.status === "closed") {
      slot.owedCents += c.commissionCents;
      payoutQueue.push({
        id: c.id,
        partnerId: c.partnerId,
        partnerName: slot.businessName,
        prospectName: c.prospectName,
        product: c.product,
        closedAtIso: c.closedAt?.toISOString() ?? null,
        commissionCents: c.commissionCents,
        ageDays: c.closedAt ? Math.floor((Date.now() - c.closedAt.getTime()) / (24 * 60 * 60 * 1000)) : 0,
      });
    }

    // Last activity = latest of createdAt / closedAt / paidAt.
    const candidate = c.paidAt ?? c.closedAt ?? c.updatedAt ?? c.createdAt;
    if (!slot.lastActivityIso || candidate.toISOString() > slot.lastActivityIso) {
      slot.lastActivityIso = candidate.toISOString();
    }

    // Monthly bucketing — bucket by closedAt for "closed" line, paidAt for "paid".
    if (c.closedAt) {
      const b = bucketFor(c.closedAt);
      if (b) b.closedCents += c.commissionCents;
    }
    if (c.paidAt) {
      const b = bucketFor(c.paidAt);
      if (b) b.paidCents += c.commissionCents;
    }

    // Headline counts for the current month.
    if (c.createdAt >= startOfThisMonth) {
      if (c.status === "lead" || c.status === "quoted") leadsThisMonth += 1;
    }
    if (c.closedAt && c.closedAt >= startOfThisMonth) closedThisMonth += 1;
  }

  // Sort payout queue oldest-first (admin pays oldest invoices first).
  payoutQueue.sort((a, b) => b.ageDays - a.ageDays);

  // Sort partners leaderboard-style: highest lifetime earnings first.
  const partnerArr = Array.from(byPartnerId.values())
    .sort((a, b) => b.totalEarnedCents - a.totalEarnedCents);

  // Totals.
  const lifetimePaidCents = partnerArr.reduce((s, p) => s + p.paidCents, 0);
  const currentOwedCents = partnerArr.reduce((s, p) => s + p.owedCents, 0);
  const activePartners = partnerArr.filter((p) => p.status === "active").length;

  return {
    partners: partnerArr,
    monthly: monthBuckets,
    payoutQueue,
    totals: {
      lifetimePaidCents,
      currentOwedCents,
      activePartners,
      leadsThisMonth,
      closedThisMonth,
    },
  };
}

// Mark a single commission paid — flips status + writes paidAt + audit.
export async function markCommissionPaid(input: { commissionId: string }): Promise<{ error?: string; ok?: boolean }> {
  const actor = await verifyAdmin();
  const c = await prisma.partnerCommission.findUnique({
    where: { id: input.commissionId },
    select: { id: true, status: true, partnerId: true, commissionCents: true, prospectName: true },
  });
  if (!c) return { error: "Commission not found" };
  if (c.status === "paid") return { error: "Already paid" };
  if (c.status !== "closed") return { error: "Only closed commissions can be marked paid" };

  await prisma.$transaction([
    prisma.partnerCommission.update({
      where: { id: c.id },
      data: { status: "paid", paidAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id ?? "unknown",
        actorRole: actor.role,
        action: "partner.commission_paid",
        entityType: "PartnerCommission",
        entityId: c.id,
        metadata: JSON.stringify({
          partnerId: c.partnerId,
          prospectName: c.prospectName,
          commissionCents: c.commissionCents,
        }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}
