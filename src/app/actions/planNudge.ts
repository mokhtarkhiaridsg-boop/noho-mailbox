"use server";

/**
 * iter-158 — Plan upgrade nudge (Tier 10 #68).
 *
 * Decides whether the signed-in member is high-volume enough that a
 * plan-upgrade card on the dashboard is helpful (vs. spammy). Reads
 * existing data only — no new schema.
 *
 * Triggers nudge when ALL of:
 *   - currentPlan === "Basic"
 *   - mailItems_last_90d ≥ 10  OR  packages_last_90d ≥ 3
 *
 * Returns the recommended next plan (Business for moderate, Premium
 * for heavy) along with the human-readable reason copy and a
 * comparison snippet the dashboard renders.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type PlanNudgeContext = {
  shouldNudge: boolean;
  currentPlan: string;
  mailCount90d: number;
  packageCount90d: number;
  recommendedPlan: "Business" | "Premium" | null;
  reason: string;
};

export async function getPlanNudgeContext(): Promise<PlanNudgeContext> {
  const session = await verifySession();
  const userId = session.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const currentPlan = user?.plan ?? "Basic";

  const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [mailCount90d, packageCount90d] = await Promise.all([
    prisma.mailItem.count({ where: { userId, createdAt: { gte: ninetyAgo } } }),
    prisma.mailItem.count({ where: { userId, createdAt: { gte: ninetyAgo }, type: "Package" } }),
  ]);

  // Guardrails — only nudge Basic users with material activity.
  if (currentPlan !== "Basic") {
    return {
      shouldNudge: false,
      currentPlan, mailCount90d, packageCount90d,
      recommendedPlan: null,
      reason: "",
    };
  }

  const heavyVolume = packageCount90d >= 10 || mailCount90d >= 30;
  const moderateVolume = packageCount90d >= 3 || mailCount90d >= 10;

  if (!moderateVolume) {
    return {
      shouldNudge: false,
      currentPlan, mailCount90d, packageCount90d,
      recommendedPlan: null,
      reason: "",
    };
  }

  const recommendedPlan: "Business" | "Premium" = heavyVolume ? "Premium" : "Business";
  // Reason copy — human-readable, never accusatory.
  const reasonParts: string[] = [];
  if (packageCount90d >= 1) {
    reasonParts.push(`${packageCount90d} package${packageCount90d === 1 ? "" : "s"}`);
  }
  if (mailCount90d - packageCount90d >= 1) {
    const lettersEtc = mailCount90d - packageCount90d;
    reasonParts.push(`${lettersEtc} mail item${lettersEtc === 1 ? "" : "s"}`);
  }
  const summary = reasonParts.length > 0 ? reasonParts.join(" + ") : `${mailCount90d} items`;
  const reason = heavyVolume
    ? `You've handled ${summary} in 90 days — Premium covers unlimited shipments + priority bureau handling.`
    : `You've handled ${summary} in 90 days — Business unlocks unlimited packages + faster forwarding.`;

  return {
    shouldNudge: true,
    currentPlan, mailCount90d, packageCount90d,
    recommendedPlan,
    reason,
  };
}
