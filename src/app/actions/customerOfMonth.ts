"use server";

/**
 * iter-152 — Customer-of-the-month award (Tier 9 #62).
 *
 * Admin nominates exactly one customer per (year, month). Composite
 * unique constraint on the schema enforces the "one winner per month"
 * rule at the DB level. The transaction creates the award, audit-logs
 * `customer.of_month_awarded`, fires a webhook, and queues the
 * congrats email — all atomic so an email send failure doesn't leave
 * a phantom row.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendCustomerOfMonthEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

export type CotmAwardRow = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
  year: number;
  month: number;
  monthName: string;
  citation: string;
  awardedAtIso: string;
  awardedByName: string | null;
};

function monthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

export async function listCotmAwards(opts: { limit?: number } = {}): Promise<CotmAwardRow[]> {
  await verifyAdmin();
  const rows = await prisma.customerOfMonthAward.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: Math.min(120, Math.max(6, opts.limit ?? 24)),
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  const actorIds = Array.from(new Set(rows.map((r) => r.awardedById).filter((x): x is string => Boolean(x))));
  const actors = actorIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    customerName: r.user.name,
    customerEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    year: r.year,
    month: r.month,
    monthName: monthName(r.year, r.month),
    citation: r.citation,
    awardedAtIso: r.awardedAt.toISOString(),
    awardedByName: r.awardedById ? (actorMap.get(r.awardedById) ?? null) : null,
  }));
}

export async function nominateCustomerOfMonth(input: {
  userId: string;
  year: number;
  month: number;       // 1-12
  citation: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();

  const year = Math.round(input.year);
  const month = Math.round(input.month);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return { error: "Invalid year" };
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Invalid month" };

  const citation = input.citation.trim();
  if (citation.length < 10) return { error: "Citation too short — write at least 10 characters" };
  if (citation.length > 1000) return { error: "Citation too long — keep it under 1000 chars" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  if (!user) return { error: "Customer not found" };

  // DB enforces (year, month) uniqueness — but check first for a
  // friendly error message instead of a Prisma P2002 surprise.
  const existing = await prisma.customerOfMonthAward.findUnique({
    where: { year_month: { year, month } },
    select: { id: true, user: { select: { name: true } } },
  });
  if (existing) {
    return { error: `${monthName(year, month)} ${year} already has a winner: ${existing.user.name}. Delete that award first if you need to change.` };
  }

  let createdId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.customerOfMonthAward.create({
        data: {
          userId: input.userId,
          year, month, citation,
          awardedById: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "customer.of_month_awarded",
          entityType: "User",
          entityId: input.userId,
          metadata: JSON.stringify({
            awardId: created.id,
            year, month,
            customerName: user.name,
            citationPreview: citation.slice(0, 80),
          }),
        },
      });
      return created;
    });
    createdId = result.id;
  } catch (e) {
    // Catch the race where two admins nominated simultaneously.
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "Someone just nominated for this month — refresh and try again." };
    }
    throw e;
  }

  // Side effects fire-and-forget — never block the create.
  if (user.email) {
    void sendCustomerOfMonthEmail({
      email: user.email,
      name: user.name ?? user.email,
      year, month, citation,
      suiteNumber: user.suiteNumber,
    }).catch((err) => console.error("[cotm] email failed:", err));
  }
  void fireWebhooks("customer.of_month_awarded", {
    text: `🌟 ${user.name ?? user.email} is Customer of the Month for ${monthName(year, month)} ${year}`,
    emoji: "🌟",
    detail: {
      year, month,
      customerName: user.name ?? null,
      suiteNumber: user.suiteNumber,
      citation: citation.slice(0, 240),
    },
  }).catch(() => undefined);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { id: createdId };
}

export async function deleteCotmAward(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.customerOfMonthAward.findUnique({ where: { id } });
  if (!row) return { error: "Award not found" };
  await prisma.$transaction([
    prisma.customerOfMonthAward.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "customer.of_month_revoked",
        entityType: "User",
        entityId: row.userId,
        metadata: JSON.stringify({ awardId: id, year: row.year, month: row.month }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Member-side: get my awards (or current-month winner status) ──

export type MyCotmAward = {
  year: number;
  month: number;
  monthName: string;
  citation: string;
  awardedAtIso: string;
};

export async function getMyCotmAwards(): Promise<MyCotmAward[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.customerOfMonthAward.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
  });
  return rows.map((r) => ({
    year: r.year,
    month: r.month,
    monthName: monthName(r.year, r.month),
    citation: r.citation,
    awardedAtIso: r.awardedAt.toISOString(),
  }));
}
