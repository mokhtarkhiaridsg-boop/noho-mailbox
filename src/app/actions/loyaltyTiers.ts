"use server";

/**
 * iter-175 — Member loyalty tiers (Tier 11 #84).
 *
 * Compute each member's loyalty tier from existing tables (no new
 * input data required) — tenure × payment punctuality × upsells. Cron
 * sweep updates User.loyaltyTier + appends a LoyaltyTierAssignment
 * history row, and fires a promotion email + member webhook when the
 * tier increases.
 *
 * Demotions also write a row but never fire emails — we never want a
 * member to receive a "you've been downgraded" notice. Their dashboard
 * card shows the new tier silently and the next renewal will reflect
 * the lower discount.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";
import { getCustomerHealthScore } from "@/app/actions/customerHealthScore";
import {
  TIER_META,
  TIER_REQUIREMENTS,
  TIER_RENEWAL_DISCOUNT,
  LOYALTY_TIERS,
  tierIndex,
  nextTierAbove,
  type LoyaltyTier,
  type LoyaltyAxis,
} from "@/lib/loyalty-config";

export type LoyaltyAxisResult = LoyaltyAxis & { met: boolean; detail?: string };
export type LoyaltyTierComputation = {
  userId: string;
  tier: LoyaltyTier;
  axesByTier: Record<LoyaltyTier, LoyaltyAxisResult[]>;
  scoreSnapshot: number | null;
  nextTier: LoyaltyTier | null;
  remainingForNext: LoyaltyAxisResult[];   // axes still failing for the next tier
};

// ─── Compute (single member) ─────────────────────────────────────────
export async function computeMemberLoyaltyTier(userId: string): Promise<LoyaltyTierComputation | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, plan: true, mailboxStatus: true,
      createdAt: true, status: true,
    },
  });
  if (!user) return null;

  // Tenure in days from createdAt.
  const tenureDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Active overdue invoices (Sent + dueAt past).
  const today = new Date();
  let overdueCount = 0;
  try {
    overdueCount = await prisma.invoice.count({
      where: { userId, status: "Sent", dueAt: { lt: today } },
    });
  } catch { /* invoice schema differences swallowed */ }

  // Mail engagement: count of items in last 90 days.
  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  let engagement90d = 0;
  try {
    engagement90d = await prisma.mailItem.count({
      where: { userId, createdAt: { gte: ninetyAgo } },
    });
  } catch { /* swallow */ }

  // Health score (iter-140) snapshot.
  let healthScore: number | null = null;
  try {
    const hs = await getCustomerHealthScore(userId);
    healthScore = hs?.score ?? null;
  } catch { /* swallow */ }

  const isActive = user.mailboxStatus !== "Cancelled" && user.status !== "Cancelled";
  const planRaw = user.plan ?? null;
  const plan = (planRaw ?? "").toLowerCase();
  const paidPlan = ["basic", "premium", "business"].includes(plan);
  const premiumPlan = ["premium", "business"].includes(plan);

  // Helper: axis-key → met-or-not. Centralized so each tier reuses the
  // same predicates without duplicating logic. Captures locals (not
  // `user.*`) so TS narrowing survives the closure.
  function axisMet(key: string): { met: boolean; detail?: string } {
    switch (key) {
      case "active":     return { met: isActive, detail: isActive ? "Active" : "Cancelled" };
      case "tenure6":    return { met: tenureDays >= 180, detail: `${tenureDays}d / 180d` };
      case "tenure12":   return { met: tenureDays >= 365, detail: `${tenureDays}d / 365d` };
      case "tenure24":   return { met: tenureDays >= 730, detail: `${tenureDays}d / 730d` };
      case "noOverdue":  return { met: overdueCount === 0, detail: overdueCount === 0 ? "0 overdue" : `${overdueCount} overdue` };
      case "paidPlan":   return { met: paidPlan, detail: planRaw ?? "no plan" };
      case "premiumPlan": return { met: premiumPlan, detail: planRaw ?? "no plan" };
      case "engagement": return { met: engagement90d >= 1, detail: `${engagement90d} items / 90d` };
      case "highHealth": return { met: (healthScore ?? 0) >= 80, detail: healthScore == null ? "no score" : `score ${healthScore}` };
      default: return { met: false, detail: "unknown axis" };
    }
  }

  // Build per-tier axis results + find the highest tier where ALL met.
  const axesByTier: Record<LoyaltyTier, LoyaltyAxisResult[]> = {} as Record<LoyaltyTier, LoyaltyAxisResult[]>;
  let highest: LoyaltyTier = "Bronze";
  for (const tier of LOYALTY_TIERS) {
    const results: LoyaltyAxisResult[] = TIER_REQUIREMENTS[tier].map((a) => ({
      ...a,
      ...axisMet(a.key),
    }));
    axesByTier[tier] = results;
    const allMet = results.every((r) => r.met);
    if (allMet) highest = tier;
  }

  const next = nextTierAbove(highest);
  const remainingForNext = next ? axesByTier[next].filter((a) => !a.met) : [];

  return {
    userId,
    tier: highest,
    axesByTier,
    scoreSnapshot: healthScore,
    nextTier: next,
    remainingForNext,
  };
}

// ─── Persist + notify on promotion ───────────────────────────────────
async function persistTierIfChanged(comp: LoyaltyTierComputation, triggeredBy: "system" | "admin" | "manual"): Promise<{ promoted: boolean; previousTier: LoyaltyTier | null }> {
  const user = await prisma.user.findUnique({
    where: { id: comp.userId },
    select: { name: true, email: true, suiteNumber: true, loyaltyTier: true },
  });
  if (!user) return { promoted: false, previousTier: null };

  const prev = (user.loyaltyTier as LoyaltyTier | null) ?? null;
  if (prev === comp.tier) return { promoted: false, previousTier: prev }; // no change

  const promoted = !prev || tierIndex(comp.tier) > tierIndex(prev);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: comp.userId },
      data: { loyaltyTier: comp.tier, loyaltyTierAt: new Date() },
    }),
    prisma.loyaltyTierAssignment.create({
      data: {
        userId: comp.userId,
        tier: comp.tier,
        previousTier: prev,
        scoreSnapshot: comp.scoreSnapshot,
        triggeredBy,
        reasonsJson: JSON.stringify(comp.axesByTier[comp.tier].map((a) => ({ key: a.key, label: a.label, met: a.met, detail: a.detail }))),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: triggeredBy === "system" ? "system" : "admin",
        actorRole: triggeredBy === "system" ? "SYSTEM" : "ADMIN",
        action: promoted ? "loyalty.promoted" : "loyalty.demoted",
        entityType: "User",
        entityId: comp.userId,
        metadata: JSON.stringify({ previousTier: prev, newTier: comp.tier, scoreSnapshot: comp.scoreSnapshot }),
      },
    }),
  ]);

  // Promotion-only side effects: email + member webhook. Never fire
  // anything on demote — we don't want a "you've been downgraded" ping.
  if (promoted && user.email) {
    const meta = TIER_META[comp.tier];
    void sendEmail({
      to: user.email,
      subject: `🎉 You've been promoted to ${meta.label} ${meta.emoji}`,
      html: buildPromotionEmail(user.name, comp.tier),
      kind: `loyalty_promoted:${comp.tier}`,
      userId: comp.userId,
    }).catch(() => undefined);
    void fireMemberWebhooks(comp.userId, "plan.expiring_soon", {
      text: `🎉 You've earned ${meta.label} ${meta.emoji} — ${meta.tagline}`,
      url: "https://nohomailbox.org/dashboard",
      detail: { kind: "loyalty_promoted", previousTier: prev, newTier: comp.tier, discountPercent: TIER_RENEWAL_DISCOUNT[comp.tier] },
    });
  }

  return { promoted, previousTier: prev };
}

function buildPromotionEmail(name: string, tier: LoyaltyTier): string {
  const meta = TIER_META[tier];
  const firstName = name.split(" ")[0] || "there";
  const benefitsHtml = meta.benefits.map((b) => `<li style="padding:4px 0;">${b}</li>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,${meta.accent},${meta.fg});padding:32px 40px;text-align:center;">
    <p style="margin:0;font-size:48px;line-height:1;">${meta.emoji}</p>
    <p style="margin:8px 0 0;font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Loyalty tier · NOHO Mailbox</p>
    <h1 style="margin:6px 0 0;font-size:32px;font-weight:900;color:white;letter-spacing:-0.5px;">You're now ${meta.label}</h1>
    <p style="margin:6px 0 0;font-size:15px;color:rgba(255,255,255,0.92);font-style:italic;">${meta.tagline}</p>
  </td></tr>
  <tr><td style="padding:32px 40px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p style="margin:0 0 16px;">Hi ${firstName}, thank you for being one of our most loyal members.</p>
    <p style="margin:0 0 12px;font-weight:800;">What unlocks today:</p>
    <ul style="margin:0 0 16px 0;padding:0 0 0 20px;color:#2D100F;">${benefitsHtml}</ul>
    <p style="margin:0 0 12px;">Your renewal discount is now <strong>${TIER_RENEWAL_DISCOUNT[tier]}%</strong> — auto-applied next billing cycle.</p>
    <a href="https://nohomailbox.org/dashboard" style="display:inline-block;margin-top:8px;background:#337485;color:white;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">Open dashboard</a>
  </td></tr>
  <tr><td style="background:#F8F2EA;padding:18px 28px;border-top:1px solid #E8DDD0;font-size:11px;color:#5C4540;text-align:center;">
    NOHO Mailbox · 5062 Lankershim Blvd · NoHo, CA 91601 · (818) 506-7744
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Member-side ─────────────────────────────────────────────────────
export async function getMyLoyaltyTier(): Promise<LoyaltyTierComputation | null> {
  const session = await verifySession();
  return computeMemberLoyaltyTier(session.id!);
}

// ─── Admin: manual recompute for one user (e.g. customer disputes) ───
export async function recomputeUserLoyaltyTier(input: { userId: string }): Promise<{ success?: boolean; error?: string; promoted?: boolean }> {
  await verifyAdmin();
  const comp = await computeMemberLoyaltyTier(input.userId);
  if (!comp) return { error: "User not found." };
  const r = await persistTierIfChanged(comp, "admin");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, promoted: r.promoted };
}

// ─── Cron-callable: recompute everyone, write history, fire emails ──
export type LoyaltySweepResult = {
  scanned: number;
  promoted: number;
  demoted: number;
  unchanged: number;
  failed: number;
};

export async function runLoyaltyTierSweep(): Promise<LoyaltySweepResult> {
  const out: LoyaltySweepResult = { scanned: 0, promoted: 0, demoted: 0, unchanged: 0, failed: 0 };
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true, loyaltyTier: true },
  });
  for (const u of users) {
    out.scanned += 1;
    try {
      const comp = await computeMemberLoyaltyTier(u.id);
      if (!comp) { out.failed += 1; continue; }
      const prev = (u.loyaltyTier as LoyaltyTier | null) ?? null;
      if (prev === comp.tier) { out.unchanged += 1; continue; }
      const r = await persistTierIfChanged(comp, "system");
      if (r.promoted) out.promoted += 1;
      else out.demoted += 1;
    } catch {
      out.failed += 1;
    }
  }
  return out;
}

// ─── Admin: list current tier distribution + recent promotions ───────
export type TierDistribution = {
  tier: LoyaltyTier;
  count: number;
};

export async function getLoyaltyTierDistribution(): Promise<{ distribution: TierDistribution[]; recentPromotions: Array<{ userId: string; userName: string; tier: LoyaltyTier; previousTier: LoyaltyTier | null; createdAtIso: string }> }> {
  await verifyAdmin();
  const counts = await prisma.user.groupBy({
    by: ["loyaltyTier"],
    where: { role: { not: "ADMIN" } },
    _count: { _all: true },
  });
  const distribution: TierDistribution[] = LOYALTY_TIERS.map((t) => ({
    tier: t,
    count: counts.find((c) => c.loyaltyTier === t)?._count._all ?? 0,
  }));
  const recent = await prisma.loyaltyTierAssignment.findMany({
    where: { OR: [{ previousTier: null }, { previousTier: { not: null } }] },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { name: true } } },
  });
  return {
    distribution,
    recentPromotions: recent.map((r) => ({
      userId: r.userId,
      userName: r.user.name,
      tier: r.tier as LoyaltyTier,
      previousTier: (r.previousTier as LoyaltyTier | null) ?? null,
      createdAtIso: r.createdAt.toISOString(),
    })),
  };
}
