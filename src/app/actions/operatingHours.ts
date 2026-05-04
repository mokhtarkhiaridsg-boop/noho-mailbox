"use server";

// iter-90 — Operating-hours server actions.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_HOURS,
  OPERATING_HOURS_KEY,
  parseHoursConfig,
  type OperatingHoursConfig,
  type Holiday,
} from "@/lib/operating-hours";

// Public — anyone can read the current hours (used by marketing footer +
// member dashboard banners).
export async function getOperatingHours(): Promise<OperatingHoursConfig> {
  const row = await prisma.siteConfig.findUnique({ where: { key: OPERATING_HOURS_KEY } });
  return parseHoursConfig(row?.value);
}

// Admin: replace the whole config (typically called by AdminOperatingHoursPanel).
export async function updateOperatingHours(input: OperatingHoursConfig): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();

  // Validate weekly array length.
  if (!Array.isArray(input.weekly) || input.weekly.length !== 7) {
    return { error: "Weekly hours must have 7 day rows (Sun..Sat)" };
  }
  // Validate timezone — IANA tz parser is built into Intl.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
  } catch {
    return { error: `Invalid IANA timezone: ${input.timezone}` };
  }

  await prisma.siteConfig.upsert({
    where: { key: OPERATING_HOURS_KEY },
    update: { value: JSON.stringify(input) },
    create: { key: OPERATING_HOURS_KEY, value: JSON.stringify(input) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "site.operating_hours_updated",
      entityType: "SiteConfig",
      entityId: OPERATING_HOURS_KEY,
      metadata: JSON.stringify({ holidayCount: input.holidays.length, timezone: input.timezone }),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// Admin: append a single holiday (handy for the holiday list editor).
export async function addHoliday(holiday: Holiday): Promise<{ error?: string; success?: boolean }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) {
    return { error: "Date must be YYYY-MM-DD" };
  }
  const current = await getOperatingHours();
  const exists = current.holidays.find((h) => h.date === holiday.date);
  const next: OperatingHoursConfig = {
    ...current,
    holidays: exists
      ? current.holidays.map((h) => (h.date === holiday.date ? holiday : h))
      : [...current.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date)),
  };
  return updateOperatingHours(next);
}

export async function removeHoliday(date: string): Promise<{ error?: string; success?: boolean }> {
  const current = await getOperatingHours();
  const next: OperatingHoursConfig = {
    ...current,
    holidays: current.holidays.filter((h) => h.date !== date),
  };
  return updateOperatingHours(next);
}

// Admin: reset to defaults.
export async function resetOperatingHours(): Promise<{ success: boolean }> {
  await verifyAdmin();
  await prisma.siteConfig.upsert({
    where: { key: OPERATING_HOURS_KEY },
    update: { value: JSON.stringify(DEFAULT_HOURS) },
    create: { key: OPERATING_HOURS_KEY, value: JSON.stringify(DEFAULT_HOURS) },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
