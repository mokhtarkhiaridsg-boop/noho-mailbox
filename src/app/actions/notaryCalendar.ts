"use server";

/**
 * iter-160 — Notary booking calendar (Tier 10 #70).
 *
 * Builds on the existing iter-29 NotaryBooking schema. Returns slot
 * availability for a date range, atomically creates a booking with a
 * double-book guard, and lets members cancel their own pending /
 * confirmed bookings.
 *
 * Slots: 30-min increments. Hours derived from iter-90 operating-hours
 * (weekly grid + holidays); falls back to a sensible default when the
 * config is empty.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getOperatingHours } from "@/app/actions/operatingHours";

const SLOT_MINUTES = 30;
// Notary needs ~25 minutes per stamp. We leave a buffer on the closing
// edge so the staff isn't booked right up to the door-locking minute.
const CLOSE_BUFFER_MIN = 30;
// Members can't book more than this many days out.
const HORIZON_DAYS = 30;

export type NotarySlot = {
  date: string;       // YYYY-MM-DD
  time: string;       // "HH:MM" 24-hour
  label: string;      // "10:30 AM"
  taken: boolean;
};

export type NotaryDay = {
  date: string;
  weekdayLabel: string;        // "Mon"
  monthDayLabel: string;       // "May 12"
  isOpen: boolean;
  closedReason?: string;       // "Closed Sunday" / holiday label
  slots: NotarySlot[];
};

export type NotaryAvailability = {
  days: NotaryDay[];
  earliestSlot: string | null;   // ISO of the next bookable slot
};

function parseHHMM(s: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function fmtHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function fmt12hr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getNotaryAvailability(input: { dayCount?: number } = {}): Promise<NotaryAvailability> {
  await verifySession();

  const dayCount = Math.max(1, Math.min(HORIZON_DAYS, Math.round(input.dayCount ?? 14)));
  const cfg = await getOperatingHours();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + dayCount);

  // Pull every booking in the window so we can mark slots taken.
  const taken = await prisma.notaryBooking.findMany({
    where: {
      status: { in: ["Pending", "Confirmed"] },
      date: { gte: ymd(today), lt: ymd(horizon) },
    },
    select: { date: true, time: true },
  });
  const takenSet = new Set(taken.map((t) => `${t.date}T${t.time}`));

  const days: NotaryDay[] = [];
  let earliestSlot: string | null = null;
  const now = new Date();

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = ymd(d);
    const dayIdx = d.getDay(); // 0..6
    const weeklyEntry = cfg.weekly[dayIdx];
    const holiday = (cfg.holidays ?? []).find((h) => h.date === dateStr);

    const weekdayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (holiday?.closed) {
      days.push({ date: dateStr, weekdayLabel, monthDayLabel, isOpen: false, closedReason: `${holiday.label} · closed`, slots: [] });
      continue;
    }
    if (!weeklyEntry?.open) {
      days.push({ date: dateStr, weekdayLabel, monthDayLabel, isOpen: false, closedReason: weeklyEntry?.hours ?? "Closed", slots: [] });
      continue;
    }

    // Open/close in minutes — prefer holiday's openClose, else weekly entry's HHMM, else fallback default.
    const open = holiday?.openClose ? parseHHMM(holiday.openClose.open) : (weeklyEntry.openHHMM ? parseHHMM(weeklyEntry.openHHMM) : null);
    const close = holiday?.openClose ? parseHHMM(holiday.openClose.close) : (weeklyEntry.closeHHMM ? parseHHMM(weeklyEntry.closeHHMM) : null);
    if (open == null || close == null || close <= open + SLOT_MINUTES) {
      days.push({ date: dateStr, weekdayLabel, monthDayLabel, isOpen: false, closedReason: weeklyEntry.hours ?? "Closed", slots: [] });
      continue;
    }

    const slots: NotarySlot[] = [];
    const lastSlot = close - CLOSE_BUFFER_MIN;
    for (let m = open; m + SLOT_MINUTES <= lastSlot + SLOT_MINUTES; m += SLOT_MINUTES) {
      // Skip past-time slots on today.
      if (i === 0) {
        const slotDate = new Date(d);
        slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (slotDate <= now) continue;
      }
      const time = fmtHHMM(m);
      const key = `${dateStr}T${time}`;
      const taken = takenSet.has(key);
      const slot: NotarySlot = {
        date: dateStr, time, label: fmt12hr(m), taken,
      };
      slots.push(slot);
      if (!taken && !earliestSlot) {
        const iso = new Date(d);
        iso.setHours(Math.floor(m / 60), m % 60, 0, 0);
        earliestSlot = iso.toISOString();
      }
    }
    days.push({ date: dateStr, weekdayLabel, monthDayLabel, isOpen: true, slots });
  }

  return { days, earliestSlot };
}

export async function createNotaryBookingForSlot(input: {
  date: string;
  time: string;
  type: string;
  notes?: string;
}): Promise<{ id?: string; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Invalid date" };
  if (!/^\d{2}:\d{2}$/.test(input.time)) return { error: "Invalid time" };
  const type = input.type.trim().slice(0, 80);
  if (type.length < 2) return { error: "Document type required" };

  // Don't book in the past.
  const slotDate = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(slotDate.getTime()) || slotDate <= new Date()) {
    return { error: "Slot must be in the future" };
  }

  // Atomic create with double-book check inside the transaction.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const conflict = await tx.notaryBooking.findFirst({
        where: { date: input.date, time: input.time, status: { in: ["Pending", "Confirmed"] } },
        select: { id: true },
      });
      if (conflict) throw new Error("SLOT_TAKEN");
      const row = await tx.notaryBooking.create({
        data: { userId, date: input.date, time: input.time, type },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          actorRole: session.role ?? "MEMBER",
          action: "notary.slot_booked",
          entityType: "NotaryBooking",
          entityId: row.id,
          metadata: JSON.stringify({ date: input.date, time: input.time, type }),
        },
      });
      return row;
    });
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { id: created.id };
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "That slot was just booked — pick another." };
    }
    throw e;
  }
}

export async function cancelMyNotaryBooking(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.notaryBooking.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Booking not found" };
  if (row.userId !== userId && session.role !== "ADMIN") return { error: "Not your booking to cancel" };
  if (row.status === "Cancelled" || row.status === "Completed") {
    return { error: `Already ${row.status.toLowerCase()}` };
  }
  await prisma.$transaction([
    prisma.notaryBooking.update({ where: { id: row.id }, data: { status: "Cancelled" } }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "notary.booking_cancelled",
        entityType: "NotaryBooking",
        entityId: row.id,
        metadata: JSON.stringify({ date: row.date, time: row.time, reason: input.reason?.trim() || null }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export type MyNotaryBooking = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  createdAtIso: string;
};

export async function listMyNotaryBookings(): Promise<MyNotaryBooking[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.notaryBooking.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: 30,
  });
  return rows.map((r) => ({
    id: r.id, date: r.date, time: r.time, type: r.type,
    status: r.status, createdAtIso: r.createdAt.toISOString(),
  }));
}
