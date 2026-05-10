// iter-166 — GET /api/v1/me — basic profile snapshot.
// Requires `profile:read` scope.

import { prisma } from "@/lib/prisma";
import { withApiToken } from "../_handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiToken("profile:read", async ({ userId }) => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true,
      suiteNumber: true, plan: true, status: true,
      mailboxStatus: true, planDueDate: true,
      createdAt: true,
    },
  });
  if (!u) return { error: "user_not_found" };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    suiteNumber: u.suiteNumber,
    plan: u.plan,
    status: u.status,
    mailboxStatus: u.mailboxStatus,
    planDueDate: u.planDueDate,
    memberSince: u.createdAt.toISOString(),
  };
});
