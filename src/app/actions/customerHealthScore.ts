"use server";

/**
 * iter-140 — Customer health score (Tier 8 #52).
 *
 * Single composite metric per customer that surfaces in the admin
 * customer list (sortable + colored) and the per-customer drawer
 * (full breakdown). Computed from existing tables — no new schema.
 *
 * Score axes (signed, capped):
 *   tenure          0 → +20    (months since mailbox assigned, /36 *20)
 *   payment         -25 → +25  (% paid-on-time over last 12mo invoices)
 *   overdueInvoice  -25 → 0    (penalty per Sent invoice past dueAt)
 *   disputes        -15 → 0    (penalty per Open StorageFeeDispute)
 *   satisfaction    0 → +15    (avg PickupSurvey 1-5 rating, /5 *15)
 *   engagement      0 → +10    (mail items in last 90d, /20 *10)
 *   standing        0 → +10    (KYC Approved +5, auto-topup +3, totp +2)
 *
 * Raw range: -65 to +95. We normalize to 0-100 with the formula
 *   normalized = round((raw + 65) / 160 * 100)
 *
 * Buckets:
 *   80-100  Excellent
 *   60-79   Healthy
 *   40-59   Watch
 *   0-39    At Risk
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type HealthBucket = "Excellent" | "Healthy" | "Watch" | "At Risk";

export type HealthAxis = {
  key: "tenure" | "payment" | "overdueInvoice" | "disputes" | "satisfaction" | "engagement" | "standing";
  label: string;
  contribution: number; // signed, post-cap
  detail: string;       // human-readable
};

export type CustomerHealthScore = {
  userId: string;
  raw: number;          // signed raw -65..+95
  score: number;        // normalized 0-100
  bucket: HealthBucket;
  axes: HealthAxis[];
  computedAtIso: string;
};

const RAW_MIN = -65;
const RAW_MAX = 95;
const RAW_RANGE = RAW_MAX - RAW_MIN;

function bucketFor(score: number): HealthBucket {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Watch";
  return "At Risk";
}

export async function getCustomerHealthScores(opts: { userIds?: string[] } = {}): Promise<CustomerHealthScore[]> {
  await verifyAdmin();

  // Pull every member (or the requested subset) plus the columns we need
  // to compute the standing axis.
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(opts.userIds && opts.userIds.length > 0 ? { id: { in: opts.userIds } } : {}),
    },
    select: {
      id: true,
      kycStatus: true,
      mailboxAssignedAt: true,
      totpEnabled: true,
      walletTopUpThresholdCents: true,
      walletTopUpAmountCents: true,
    },
  });

  if (users.length === 0) return [];
  const userIds = users.map((u) => u.id);
  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const ninetyAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Batched aggregations — single query per axis instead of N+1.
  const [invoices, openDisputes, surveyAggs, mailCounts] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: yearAgo },
        status: { in: ["Sent", "Paid"] },
      },
      select: { userId: true, status: true, dueAt: true, paidAt: true },
    }),
    prisma.storageFeeDispute.groupBy({
      by: ["filedById"],
      where: { filedById: { in: userIds }, status: "Open" },
      _count: { _all: true },
    }),
    prisma.pickupSurvey.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, submittedAt: { not: null, gte: yearAgo }, rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.mailItem.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, createdAt: { gte: ninetyAgo } },
      _count: { _all: true },
    }),
  ]);

  const invoicesByUser = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const list = invoicesByUser.get(inv.userId) ?? [];
    list.push(inv);
    invoicesByUser.set(inv.userId, list);
  }
  const disputesByUser = new Map(openDisputes.map((d) => [d.filedById, d._count._all]));
  const surveyByUser = new Map(surveyAggs.map((s) => [s.userId, { avg: s._avg.rating ?? 0, n: s._count._all }]));
  const mailByUser = new Map(mailCounts.map((m) => [m.userId, m._count._all]));

  return users.map((u) => {
    const axes: HealthAxis[] = [];

    // ── tenure ──────────────────────────────────────────────────────
    const tenureMonths = u.mailboxAssignedAt
      ? Math.max(0, Math.round((now.getTime() - u.mailboxAssignedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 0;
    const tenureCapped = Math.min(36, tenureMonths);
    const tenureContrib = Math.round((tenureCapped / 36) * 20);
    axes.push({
      key: "tenure",
      label: "Tenure",
      contribution: tenureContrib,
      detail: u.mailboxAssignedAt
        ? `${tenureMonths} month${tenureMonths === 1 ? "" : "s"} as a member${tenureMonths >= 36 ? " (capped)" : ""}`
        : "No mailbox assigned yet",
    });

    // ── payment + overdueInvoice ────────────────────────────────────
    const myInvoices = invoicesByUser.get(u.id) ?? [];
    const paidInvoices = myInvoices.filter((i) => i.status === "Paid" && i.paidAt);
    const overdueSent = myInvoices.filter((i) => i.status === "Sent" && i.dueAt && i.dueAt < now);
    const onTimePaid = paidInvoices.filter((i) => !i.dueAt || (i.paidAt && i.paidAt <= i.dueAt));
    let paymentContrib = 0;
    let paymentDetail = "No invoices in past 12 months";
    if (paidInvoices.length > 0) {
      const onTimePct = onTimePaid.length / paidInvoices.length;
      // Map 0%→-25, 50%→0, 100%→+25
      paymentContrib = Math.round((onTimePct - 0.5) * 50);
      paymentDetail = `${onTimePaid.length}/${paidInvoices.length} invoices paid on time (${Math.round(onTimePct * 100)}%)`;
    }
    axes.push({ key: "payment", label: "Payment punctuality", contribution: paymentContrib, detail: paymentDetail });

    const overduePenalty = -Math.min(25, overdueSent.length * 8);
    axes.push({
      key: "overdueInvoice",
      label: "Overdue invoices",
      contribution: overduePenalty,
      detail: overdueSent.length === 0
        ? "No invoices past due"
        : `${overdueSent.length} invoice${overdueSent.length === 1 ? "" : "s"} past due`,
    });

    // ── disputes ────────────────────────────────────────────────────
    const openDisputeCount = disputesByUser.get(u.id) ?? 0;
    const disputePenalty = -Math.min(15, openDisputeCount * 5);
    axes.push({
      key: "disputes",
      label: "Open disputes",
      contribution: disputePenalty,
      detail: openDisputeCount === 0
        ? "No open disputes"
        : `${openDisputeCount} open storage-fee dispute${openDisputeCount === 1 ? "" : "s"}`,
    });

    // ── satisfaction ────────────────────────────────────────────────
    const survey = surveyByUser.get(u.id);
    let satisfactionContrib = 0;
    let satisfactionDetail = "No pickup surveys submitted yet";
    if (survey && survey.n > 0) {
      const avg5 = Math.max(0, Math.min(5, survey.avg));
      satisfactionContrib = Math.round((avg5 / 5) * 15);
      satisfactionDetail = `Avg ${avg5.toFixed(1)}★ across ${survey.n} pickup survey${survey.n === 1 ? "" : "s"}`;
    }
    axes.push({ key: "satisfaction", label: "Pickup satisfaction", contribution: satisfactionContrib, detail: satisfactionDetail });

    // ── engagement ──────────────────────────────────────────────────
    const mail90d = mailByUser.get(u.id) ?? 0;
    const engagementContrib = Math.round((Math.min(20, mail90d) / 20) * 10);
    axes.push({
      key: "engagement",
      label: "Recent activity",
      contribution: engagementContrib,
      detail: `${mail90d} mail item${mail90d === 1 ? "" : "s"} in past 90 days`,
    });

    // ── standing ────────────────────────────────────────────────────
    let standingContrib = 0;
    const standingParts: string[] = [];
    if (u.kycStatus === "Approved") { standingContrib += 5; standingParts.push("KYC approved"); }
    if (u.walletTopUpThresholdCents && u.walletTopUpAmountCents) {
      standingContrib += 3; standingParts.push("auto-topup on");
    }
    if (u.totpEnabled) { standingContrib += 2; standingParts.push("2FA on"); }
    axes.push({
      key: "standing",
      label: "Account standing",
      contribution: standingContrib,
      detail: standingParts.length === 0 ? "No bonuses (incomplete profile)" : standingParts.join(" · "),
    });

    const raw = axes.reduce((sum, a) => sum + a.contribution, 0);
    const score = Math.max(0, Math.min(100, Math.round(((raw - RAW_MIN) / RAW_RANGE) * 100)));
    return {
      userId: u.id,
      raw,
      score,
      bucket: bucketFor(score),
      axes,
      computedAtIso: now.toISOString(),
    };
  });
}

// Convenience for the drawer — single-user fetch.
export async function getCustomerHealthScore(userId: string): Promise<CustomerHealthScore | null> {
  const list = await getCustomerHealthScores({ userIds: [userId] });
  return list[0] ?? null;
}
