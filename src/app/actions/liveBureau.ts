"use server";

/**
 * iter-154 — Live bureau status (Tier 9 #64).
 *
 * Powers the public /open landing page. Combines:
 *  - iter-90 isOpenNow() result (open/closing_soon/closed/holiday)
 *  - admin-set "staff on duty" name (new SiteConfig key)
 *  - awaiting-pickup count as a friendly queue-depth signal
 *  - this-week's hours table for the page footer
 *
 * Public — no auth gate. The page is meant to be linked from the
 * marketing site so anyone can check "are they open right now?".
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { isOpenNow, type OpenStatus, type DayHours, type OperatingHoursConfig } from "@/lib/operating-hours";

const STAFF_ON_DUTY_KEY = "staffOnDuty";

export type LiveBureauStatus = {
  status: OpenStatus;
  todayLabel: string;
  holidayLabel: string | null;
  minutesUntilClose: number | null;
  weeklyHours: Array<{ day: string; hours: string; isToday: boolean; open: boolean }>;
  staffOnDuty: string | null;
  awaitingPickupCount: number;
  generatedAtIso: string;
  timezone: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getLiveBureauStatus(): Promise<LiveBureauStatus> {
  const cfg: OperatingHoursConfig = await getOperatingHours();
  const liveResult = isOpenNow(cfg);

  // Today index in the bureau's timezone.
  const todayShort = new Intl.DateTimeFormat("en-US", { timeZone: cfg.timezone, weekday: "short" })
    .format(new Date()).toLowerCase();
  const todayIdx = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(todayShort);

  // Read both the staffOnDuty key and the awaiting-pickup count in
  // parallel to keep the page snappy.
  const [staffRow, awaitingPickupCount] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { key: STAFF_ON_DUTY_KEY }, select: { value: true } }).catch(() => null),
    prisma.mailItem.count({ where: { status: "Awaiting Pickup" } }).catch(() => 0),
  ]);

  const weeklyHours = cfg.weekly.map((day: DayHours, i: number) => ({
    day: DAY_NAMES[i] ?? "—",
    hours: day.hours ?? (day.open ? "Open" : "Closed"),
    isToday: i === todayIdx,
    open: day.open,
  }));

  return {
    status: liveResult.status,
    todayLabel: liveResult.todayLabel,
    holidayLabel: liveResult.holiday?.label ?? null,
    minutesUntilClose: liveResult.minutesUntilClose ?? null,
    weeklyHours,
    staffOnDuty: (staffRow?.value ?? "").trim() || null,
    awaitingPickupCount,
    generatedAtIso: new Date().toISOString(),
    timezone: cfg.timezone,
  };
}

// Admin: set / clear the "staff on duty" name shown on the public page.
export async function setStaffOnDuty(input: { name: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const name = input.name.trim().slice(0, 80);
  await prisma.siteConfig.upsert({
    where: { key: STAFF_ON_DUTY_KEY },
    create: { key: STAFF_ON_DUTY_KEY, value: name },
    update: { value: name },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "bureau.staff_on_duty_set",
      entityType: "SiteConfig",
      entityId: STAFF_ON_DUTY_KEY,
      metadata: JSON.stringify({ name: name || null }),
    },
  });
  revalidatePath("/open");
  revalidatePath("/admin");
  return { success: true };
}
