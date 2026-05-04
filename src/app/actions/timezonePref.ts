"use server";

// iter-123 — Customer time-zone preference.
//
// Two server actions + a tiny helper used by email senders to format
// dates against the customer's TZ. Default falls back to the bureau's
// TZ from the iter-90 operating-hours config.

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getOperatingHours } from "./operatingHours";

// Validate via Intl.DateTimeFormat — throws on bad TZ. We accept "" to
// mean "clear back to default".
function isValidTimeZone(tz: string): boolean {
  if (!tz) return true;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function setMyTimeZone(input: { timeZone: string }): Promise<{ error?: string; ok?: boolean; timeZone: string | null }> {
  const session = await verifySession();
  const userId = session.id!;
  const tz = input.timeZone.trim();
  if (!isValidTimeZone(tz)) return { error: `Invalid timezone: ${tz}`, timeZone: null };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { timeZone: tz || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: tz ? "user.timezone_set" : "user.timezone_cleared",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({ timeZone: tz || null }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true, timeZone: tz || null };
}

export async function getMyTimeZoneStatus(): Promise<{
  userTimeZone: string | null;
  bureauTimeZone: string;
  effectiveTimeZone: string;
}> {
  const session = await verifySession();
  const cfg = await getOperatingHours();
  if (!session.id) return { userTimeZone: null, bureauTimeZone: cfg.timezone, effectiveTimeZone: cfg.timezone };
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { timeZone: true },
  });
  return {
    userTimeZone: u?.timeZone ?? null,
    bureauTimeZone: cfg.timezone,
    effectiveTimeZone: u?.timeZone || cfg.timezone,
  };
}
