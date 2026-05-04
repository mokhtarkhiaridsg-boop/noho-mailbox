"use server";

// iter-101 — Pickup-time scheduling.
//
// Customers book a 15-minute pickup slot; admin sees a sorted queue
// and can check them in / mark complete / no-show. Slots are derived
// from the OperatingHoursConfig (iter-90) so closures + lunch breaks
// + holidays automatically apply. Reuses iter-100's audit pattern,
// iter-89's email shape, and iter-84's notification preferences.

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getOperatingHours } from "./operatingHours";
import type { OperatingHoursConfig } from "@/lib/operating-hours";
import { fireWebhooks } from "@/lib/webhooks";

const SLOT_MIN = 15;
const MAX_DAYS_AHEAD = 14;     // members can book up to 2 weeks out
const MAX_BOOKINGS_PER_DAY = 4; // per slot — 4 simultaneous customers max
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// ─── Slot derivation ──────────────────────────────────────────────────────
// Returns the set of slot start times for a given local date ("YYYY-MM-DD"),
// in UTC ISO strings, after subtracting the lunch break and any holiday
// override. Past slots (<= now+30min) are filtered out client-side via
// getAvailableSlots() so the same helper can also be used by the admin
// queue if it ever wants to render an empty grid.

function dayHoursFor(cfg: OperatingHoursConfig, isoDate: string) {
  const holiday = cfg.holidays.find((h) => h.date === isoDate);
  if (holiday) {
    if (holiday.closed) return null;
    if (holiday.openClose) {
      return { open: true, openHHMM: holiday.openClose.open, closeHHMM: holiday.openClose.close, breakHHMM: undefined as [string, string] | undefined };
    }
  }
  // Resolve weekday in the bureau timezone — Date constructed from ISO is UTC,
  // but Intl.DateTimeFormat with the bureau tz gives us the right wkday.
  const ref = new Date(`${isoDate}T12:00:00Z`); // noon UTC anchor inside the day
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: cfg.timezone, weekday: "short" });
  const wk = fmt.format(ref).toLowerCase().slice(0, 3);
  const idx = ["sun","mon","tue","wed","thu","fri","sat"].indexOf(wk);
  const day = cfg.weekly[idx];
  if (!day || !day.open || !day.openHHMM || !day.closeHHMM) return null;
  return { open: true, openHHMM: day.openHHMM, closeHHMM: day.closeHHMM, breakHHMM: day.breakHHMM };
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Convert a "YYYY-MM-DD" + "HH:MM" + tz → UTC Date.
// Uses a known offset trick: format the same instant in tz, compare to UTC.
function localToUtc(isoDate: string, hhmm: string, tz: string): Date {
  // Build a Date that *looks like* the local wall-clock time, then offset
  // by the tz's offset at that instant.
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  // Start with a guess: treat the local time as if it were UTC.
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  // Find the offset between that guess interpreted in the target tz vs. UTC.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = dtf.formatToParts(guess);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const tzAsUtc = Date.UTC(
    parseInt(get("year"), 10),
    parseInt(get("month"), 10) - 1,
    parseInt(get("day"), 10),
    parseInt(get("hour"), 10),
    parseInt(get("minute"), 10),
    0,
  );
  const offsetMin = (tzAsUtc - guess.getTime()) / 60_000;
  return new Date(guess.getTime() - offsetMin * 60_000);
}

export type AvailableSlot = {
  startIso: string;        // UTC ISO
  startLocal: string;      // "9:30am"
  durationMin: number;     // 15
  remaining: number;       // how many concurrent bookings still available (0 = full)
};

export async function getAvailableSlots(input: { date: string }): Promise<{ slots: AvailableSlot[]; tz: string; closed?: string } > {
  const session = await verifySession();
  if (!session.id) return { slots: [], tz: "America/Los_Angeles", closed: "Sign-in required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { slots: [], tz: "America/Los_Angeles", closed: "Bad date" };

  const cfg = await getOperatingHours();
  const day = dayHoursFor(cfg, input.date);
  if (!day) return { slots: [], tz: cfg.timezone, closed: "Closed that day" };

  const o = parseHHMM(day.openHHMM);
  const c = parseHHMM(day.closeHHMM);
  if (o == null || c == null) return { slots: [], tz: cfg.timezone, closed: "Bad hours config" };
  const bs = day.breakHHMM ? parseHHMM(day.breakHHMM[0]) : null;
  const be = day.breakHHMM ? parseHHMM(day.breakHHMM[1]) : null;

  // Bookings on that local date — pull a 24h window in UTC to be safe.
  const dayStartUtc = localToUtc(input.date, "00:00", cfg.timezone);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.pickupAppointment.findMany({
    where: {
      scheduledAt: { gte: dayStartUtc, lt: dayEndUtc },
      status: { in: ["Scheduled", "Checked-In"] },
    },
    select: { scheduledAt: true },
  });
  const counts = new Map<number, number>();
  for (const r of existing) {
    const k = r.scheduledAt.getTime();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const nowMs = Date.now();
  const slots: AvailableSlot[] = [];
  for (let t = o; t + SLOT_MIN <= c; t += SLOT_MIN) {
    // Skip break window.
    if (bs != null && be != null && t >= bs && t < be) continue;
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    const utc = localToUtc(input.date, `${hh}:${mm}`, cfg.timezone);
    if (utc.getTime() <= nowMs + 30 * 60 * 1000) continue; // 30-min lead time

    const taken = counts.get(utc.getTime()) ?? 0;
    const remaining = Math.max(0, MAX_BOOKINGS_PER_DAY - taken);
    const startLocal = new Intl.DateTimeFormat("en-US", {
      timeZone: cfg.timezone, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(utc).toLowerCase().replace(" ", "");
    slots.push({ startIso: utc.toISOString(), startLocal, durationMin: SLOT_MIN, remaining });
  }
  return { slots, tz: cfg.timezone };
}

// ─── Member: book ─────────────────────────────────────────────────────────
export async function bookPickupAppointment(input: {
  startIso: string;       // exact slot UTC iso from getAvailableSlots
  packageCount?: number | null;
  guestName?: string | null;
  notes?: string | null;
}): Promise<{ error?: string; appointmentId?: string }> {
  const session = await verifySession();
  const userId = session.id!;

  const scheduledAt = new Date(input.startIso);
  if (isNaN(scheduledAt.getTime())) return { error: "Invalid slot time" };
  if (scheduledAt.getTime() < Date.now() + 15 * 60 * 1000) return { error: "Slot is in the past or too soon" };

  const maxAhead = Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (scheduledAt.getTime() > maxAhead) return { error: `Pick a slot within ${MAX_DAYS_AHEAD} days` };

  // Capacity check — raceable with concurrent bookings, but the audit
  // captures the conflict and admin can reschedule.
  const taken = await prisma.pickupAppointment.count({
    where: { scheduledAt, status: { in: ["Scheduled", "Checked-In"] } },
  });
  if (taken >= MAX_BOOKINGS_PER_DAY) return { error: "That slot just filled — pick another." };

  // One scheduled appointment per user at a time (prevents double-booking
  // by accident; user can cancel + rebook freely).
  const existingMine = await prisma.pickupAppointment.findFirst({
    where: { userId, status: "Scheduled", scheduledAt: { gte: new Date() } },
    select: { id: true, scheduledAt: true },
  });
  if (existingMine) {
    return { error: `You already have a pickup scheduled. Cancel it first.` };
  }

  const [appt, user] = await prisma.$transaction([
    prisma.pickupAppointment.create({
      data: {
        userId,
        scheduledAt,
        durationMin: SLOT_MIN,
        packageCount: input.packageCount ?? null,
        guestName: input.guestName?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, suiteNumber: true, notifPrefs: true } }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "pickup.appointment_created",
        entityType: "PickupAppointment",
        entityId: "(pending)",
        metadata: JSON.stringify({
          scheduledAtIso: scheduledAt.toISOString(),
          packageCount: input.packageCount ?? null,
          hasGuest: Boolean(input.guestName?.trim()),
        }),
      },
    }),
  ]);

  // Best-effort post-tx side effects: in-app notification + email.
  void (async () => {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: "pickup_appointment_confirmed", // Notification.type is a free String column in schema
          title: "Pickup scheduled",
          body: `Your pickup is set for ${formatLocal(scheduledAt, "America/Los_Angeles")}.`,
          link: `${BASE_URL}/dashboard?tab=settings`,
        },
      });
    } catch (e) { console.error("[bookPickupAppointment] notif failed:", e); }

    if (user) {
      // iter-103: outbound webhook bridge.
      try {
        await fireWebhooks("appointment.booked", {
          text: `*${user.name ?? "(unknown)"}* (suite #${user.suiteNumber ?? "—"}) booked pickup · ${formatLocal(scheduledAt, "America/Los_Angeles")}`,
          emoji: "🗓",
          detail: {
            userId: user.id,
            suiteNumber: user.suiteNumber,
            scheduledAtIso: scheduledAt.toISOString(),
            packageCount: input.packageCount ?? null,
            guestName: input.guestName ?? null,
          },
        });
      } catch (e) { console.error("[bookPickupAppointment] webhook failed:", e); }
      try {
        await sendEmail({
          to: user.email,
          subject: `Pickup scheduled · ${formatLocal(scheduledAt, "America/Los_Angeles")} — NOHO Mailbox`,
          kind: "pickup_appointment_confirmed",
          userId: user.id,
          html: emailConfirm({
            firstName: (user.name ?? "there").split(" ")[0],
            suiteNumber: user.suiteNumber ?? "—",
            scheduledAtLocal: formatLocal(scheduledAt, "America/Los_Angeles"),
            packageCount: input.packageCount ?? null,
            guestName: input.guestName?.trim() || null,
            notes: input.notes?.trim() || null,
          }),
        });
      } catch (e) { console.error("[bookPickupAppointment] email failed:", e); }
    }
  })();

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { appointmentId: appt.id };
}

// ─── Member: list mine ────────────────────────────────────────────────────
export async function getMyPickupAppointments(): Promise<Array<{
  id: string; scheduledAtIso: string; scheduledAtLocal: string; status: string;
  packageCount: number | null; guestName: string | null; notes: string | null;
}>> {
  const session = await verifySession();
  if (!session.id) return [];
  const rows = await prisma.pickupAppointment.findMany({
    where: { userId: session.id },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    scheduledAtIso: r.scheduledAt.toISOString(),
    scheduledAtLocal: formatLocal(r.scheduledAt, "America/Los_Angeles"),
    status: r.status,
    packageCount: r.packageCount,
    guestName: r.guestName,
    notes: r.notes,
  }));
}

// ─── Member: cancel ───────────────────────────────────────────────────────
export async function cancelMyPickupAppointment(id: string): Promise<{ error?: string; success?: boolean }> {
  const session = await verifySession();
  const userId = session.id!;
  const appt = await prisma.pickupAppointment.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, scheduledAt: true },
  });
  if (!appt) return { error: "Appointment not found" };
  if (appt.userId !== userId) return { error: "Not your appointment" };
  if (appt.status !== "Scheduled") return { error: `Can't cancel a ${appt.status.toLowerCase()} appointment` };

  await prisma.$transaction([
    prisma.pickupAppointment.update({
      where: { id },
      data: { status: "Cancelled", cancelledAt: new Date(), cancelledBy: "user" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "pickup.appointment_cancelled",
        entityType: "PickupAppointment",
        entityId: id,
        metadata: JSON.stringify({ scheduledAtIso: appt.scheduledAt.toISOString(), by: "user" }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

// ─── Admin: queue + transitions ───────────────────────────────────────────
export type AdminPickupRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  scheduledAtIso: string;
  scheduledAtLocal: string;
  status: string;
  packageCount: number | null;
  guestName: string | null;
  notes: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
};

export async function listAdminPickupQueue(input: { from?: string; to?: string } = {}): Promise<{
  rows: AdminPickupRow[];
  todayCount: number;
  upcomingCount: number;
}> {
  await verifyAdmin();
  const fromDate = input.from ? new Date(input.from) : new Date(Date.now() - 2 * 60 * 60 * 1000);
  const toDate = input.to ? new Date(input.to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const rows = await prisma.pickupAppointment.findMany({
    where: { scheduledAt: { gte: fromDate, lte: toDate } },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const users = userIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  const byId = new Map(users.map((u) => [u.id, u] as const));

  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const todayCount = rows.filter((r) => r.scheduledAt >= startOfToday && r.scheduledAt < endOfToday && (r.status === "Scheduled" || r.status === "Checked-In")).length;
  const upcomingCount = rows.filter((r) => r.scheduledAt >= endOfToday && r.status === "Scheduled").length;

  return {
    rows: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: byId.get(r.userId)?.name ?? "(unknown)",
      userEmail: byId.get(r.userId)?.email ?? "(unknown)",
      suiteNumber: byId.get(r.userId)?.suiteNumber ?? null,
      scheduledAtIso: r.scheduledAt.toISOString(),
      scheduledAtLocal: formatLocal(r.scheduledAt, "America/Los_Angeles"),
      status: r.status,
      packageCount: r.packageCount,
      guestName: r.guestName,
      notes: r.notes,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
    todayCount,
    upcomingCount,
  };
}

async function adminTransition(id: string, newStatus: "Checked-In" | "Completed" | "No-Show" | "Cancelled", actionTag: string) {
  const actor = await verifyAdmin();
  const appt = await prisma.pickupAppointment.findUnique({
    where: { id },
    select: { id: true, status: true, scheduledAt: true, userId: true },
  });
  if (!appt) return { error: "Appointment not found" };

  const data: Record<string, unknown> = { status: newStatus };
  if (newStatus === "Checked-In") data.checkedInAt = new Date();
  if (newStatus === "Completed") data.completedAt = new Date();
  if (newStatus === "Cancelled") {
    data.cancelledAt = new Date();
    data.cancelledBy = "admin";
  }

  await prisma.$transaction([
    prisma.pickupAppointment.update({ where: { id }, data }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: actionTag,
        entityType: "PickupAppointment",
        entityId: id,
        metadata: JSON.stringify({
          fromStatus: appt.status,
          toStatus: newStatus,
          scheduledAtIso: appt.scheduledAt.toISOString(),
          targetUserId: appt.userId,
        }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function adminCheckInPickup(id: string) { return adminTransition(id, "Checked-In", "pickup.appointment_checked_in"); }
export async function adminCompletePickup(id: string) { return adminTransition(id, "Completed", "pickup.appointment_completed"); }
export async function adminNoShowPickup(id: string)   { return adminTransition(id, "No-Show", "pickup.appointment_no_show"); }
export async function adminCancelPickup(id: string)   { return adminTransition(id, "Cancelled", "pickup.appointment_cancelled"); }

// ─── helpers ──────────────────────────────────────────────────────────────
function formatLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
}

function emailConfirm(args: {
  firstName: string;
  suiteNumber: string;
  scheduledAtLocal: string;
  packageCount: number | null;
  guestName: string | null;
  notes: string | null;
}) {
  const extras: string[] = [];
  if (args.packageCount != null) extras.push(`<p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Estimated packages:</strong> ${args.packageCount}</p>`);
  if (args.guestName) extras.push(`<p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Guest doing pickup:</strong> ${args.guestName}</p>`);
  if (args.notes) extras.push(`<p style="margin:0 0 0;font-size:13px;color:#334155;"><strong>Note:</strong> ${args.notes}</p>`);

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;letter-spacing:-0.5px;">Pickup scheduled ✓</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, we'll have your packages ready at the counter at the time below. Please bring a photo ID.</p>
          <div style="background:#eff6ff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:14px;color:#0e2240;"><strong>When:</strong> ${args.scheduledAtLocal}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            ${extras.join("\n")}
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#334155;font-weight:700;">Need to change it?</p>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">Cancel from your dashboard any time before the slot. We'll save the spot for someone else.</p>
          <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;margin-top:8px;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">Manage appointment</a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">5062 Lankershim Blvd · NoHo, CA 91601 · (818) 506-7744</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
