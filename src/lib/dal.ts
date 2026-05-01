import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retry } from "@/lib/retry";

export const verifySession = cache(async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user;
});

export const verifyAdmin = cache(async () => {
  const user = await verifySession();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
});

/**
 * Verify the user is an active member who can access the dashboard.
 * - Admins always pass.
 * - Free members pass through (they can use services like shop, delivery, notary, messaging).
 * - Paid members with a non-active mailbox → /dashboard/pending.
 */
export const verifyActiveMember = cache(async () => {
  const sessionUser = await verifySession();

  // Admins always allowed
  if (sessionUser.role === "ADMIN") return sessionUser;

  // First DB hit on every dashboard load — wrap in retry to absorb the
  // cold-start / Turso edge transients that surface as 503s when the
  // function takes the connection failure as a fatal error. Idempotent read,
  // safe to retry.
  const user = await retry(() =>
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { plan: true, mailboxStatus: true },
    }),
  );

  // Free members can access dashboard (no mailbox needed)
  if (!user || !user.plan || user.plan === "Free") return sessionUser;

  // Paid members with non-active mailbox go to pending
  if (user.mailboxStatus !== "Active") {
    redirect("/dashboard/pending");
  }

  return sessionUser;
});
