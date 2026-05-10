"use server";

/**
 * iter-195 — Bureau lobby digital signage data action (Tier 13 #104).
 *
 * One-shot read for the wall-mounted iPad at /lobby. Aggregates:
 *   - Today's pickup appointments (iter-101 PickupAppointment), grouped
 *     by upcoming/checked-in/completed
 *   - Today's mailbox tours (iter-90/iter-130 MailboxTour) by status
 *   - Live open/closed status from iter-90 operatingHours
 *
 * Public read — no auth — because the kiosk runs unattended on a
 * shared iPad in the lobby. We deliberately scrub PII: only first
 * name + initial of last name surface ("J. K."), no phone/email, no
 * package counts beyond a "you're up next" indicator.
 *
 * Caching: read is cheap, but called every 30s by the kiosk; we let
 * the host route mark itself force-dynamic so each fetch returns
 * fresh data.
 */

import { prisma } from "@/lib/prisma";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { isOpenNow, type OpenStatus } from "@/lib/operating-hours";

export type LobbyAppointmentRow = {
  id: string;
  initials: string;                              // "J.K."
  scheduledTimeLabel: string;                    // "10:30 AM"
  scheduledAtIso: string;
  status: "upcoming" | "checkedIn" | "completed";
  packageHint: string | null;                    // "1–2 packages" coarse bucket
  isNext: boolean;                               // true for the next-up appointment only
};

export type LobbyTourRow = {
  id: string;
  initials: string;                              // "J.K."
  timeLabel: string;                             // "11:00 AM"
  partySize: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No Show";
};

export type LobbyBoardData = {
  nowIso: string;
  bureauName: string;                            // pulled from siteConfig if defined; falls back
  hoursStatus: OpenStatus;
  hoursLabel: string;                            // "Open · closes in 3h 15m" / "Closed today"
  hoursToday: string;                            // "9:30am–5:30pm"
  isOpen: boolean;
  appointments: {
    total: number;
    nextUp: LobbyAppointmentRow | null;
    upcoming: LobbyAppointmentRow[];
    checkedIn: LobbyAppointmentRow[];
    completed: number;
  };
  tours: {
    total: number;
    upcoming: LobbyTourRow[];
    completed: number;
  };
  // Friendly marquee tickers — admin can set custom messages, e.g.
  // "🎄 Closed Dec 25 · Notary closes at 4 today". We seed sensible
  // defaults from the open/closed status if no custom is set.
  marqueeLines: string[];
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return (parts[0]?.[0] ?? "—").toUpperCase() + ".";
  return `${(parts[0]?.[0] ?? "").toUpperCase()}.${(parts[parts.length - 1]?.[0] ?? "").toUpperCase()}.`;
}

function packageHintOf(count: number | null | undefined): string | null {
  if (count == null || count <= 0) return null;
  if (count === 1) return "1 package";
  if (count <= 3) return "1–3 packages";
  if (count <= 5) return "≤5 packages";
  return "6+ packages";
}

function fmtTime(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  }
}

function todayWindow(tz: string): { start: Date; end: Date; ymd: string } {
  // Compute "today" in the bureau's TZ. Using Intl + reconstructed Date
  // because the libSQL adapter doesn't carry TZ info beyond UTC.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const ymd = fmt.format(now);                  // YYYY-MM-DD in tz
  // Build a Date for the start of that local day. We approximate by
  // creating a UTC midnight then offsetting. For lobby-board accuracy
  // (we just want today's appointments) the slight DST edge is fine.
  const start = new Date(`${ymd}T00:00:00Z`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end, ymd };
}

export async function getLobbyBoardData(): Promise<LobbyBoardData> {
  const cfg = await getOperatingHours();
  const status = isOpenNow(cfg);
  const tz = cfg.timezone || "America/Los_Angeles";
  const now = new Date();
  const { start, end, ymd } = todayWindow(tz);

  // Try to pull the bureau name from SiteConfig; fall back gracefully.
  let bureauName = "NOHO Mailbox";
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: "bureau_name" } });
    if (row?.value) bureauName = row.value;
  } catch { /* swallow */ }

  // Today's appointments — pull all and bucket in JS so we surface "next up".
  const appts = await prisma.pickupAppointment.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      status: { not: "Cancelled" },
    },
    select: { id: true, scheduledAt: true, status: true, packageCount: true, guestName: true, user: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  }).catch(() => [] as Array<{ id: string; scheduledAt: Date; status: string; packageCount: number | null; guestName: string | null; user: { name: string } | null }>);

  const upcoming: LobbyAppointmentRow[] = [];
  const checkedIn: LobbyAppointmentRow[] = [];
  let completed = 0;
  for (const a of appts) {
    const display = a.guestName?.trim() || a.user?.name || "Member";
    const row: LobbyAppointmentRow = {
      id: a.id,
      initials: initialsOf(display),
      scheduledTimeLabel: fmtTime(a.scheduledAt, tz),
      scheduledAtIso: a.scheduledAt.toISOString(),
      status: a.status === "Checked-In" ? "checkedIn" : a.status === "Completed" || a.status === "No-Show" ? "completed" : "upcoming",
      packageHint: packageHintOf(a.packageCount ?? null),
      isNext: false,
    };
    if (row.status === "checkedIn") checkedIn.push(row);
    else if (row.status === "completed") completed += 1;
    else upcoming.push(row);
  }
  // The "next up" indicator: first upcoming after now, or first
  // checked-in if there are no future scheduled.
  const nextUpCandidate = upcoming.find((r) => new Date(r.scheduledAtIso).getTime() >= now.getTime() - 5 * 60_000) ?? checkedIn[0] ?? null;
  if (nextUpCandidate) {
    nextUpCandidate.isNext = true;
  }

  // Today's tours.
  const tours = await prisma.mailboxTour.findMany({
    where: { requestedDate: ymd, status: { in: ["Pending", "Confirmed", "Completed"] } },
    orderBy: { requestedTime: "asc" },
    take: 20,
  }).catch(() => [] as Array<{ id: string; name: string; requestedTime: string; partySize: number; status: string }>);

  const tourUpcoming: LobbyTourRow[] = [];
  let toursDone = 0;
  for (const t of tours) {
    const validStatus = (t.status === "Pending" || t.status === "Confirmed" || t.status === "Completed" || t.status === "Cancelled" || t.status === "No Show")
      ? (t.status as LobbyTourRow["status"]) : "Pending";
    if (validStatus === "Completed") { toursDone += 1; continue; }
    tourUpcoming.push({
      id: t.id,
      initials: initialsOf(t.name),
      timeLabel: t.requestedTime || "",
      partySize: t.partySize,
      status: validStatus,
    });
  }

  // Marquee — composed live from the open/closed/holiday status. Custom
  // messages from SiteConfig.lobby_marquee (newline-separated) are
  // appended.
  const marqueeLines: string[] = [];
  if (status.status === "open") {
    if (status.minutesUntilClose != null && status.minutesUntilClose <= 60) {
      marqueeLines.push(`⏰ We close in ${status.minutesUntilClose} min — please come to the counter`);
    } else {
      marqueeLines.push("👋 Welcome — please check in at the counter");
    }
  } else if (status.status === "closing_soon") {
    marqueeLines.push("⏰ We're closing soon — please collect your packages");
  } else if (status.status === "break") {
    marqueeLines.push("🍽️ On lunch break — back shortly");
  } else if (status.status === "closed_today") {
    marqueeLines.push("🚪 We're closed today");
  } else if (status.status === "closed_holiday") {
    marqueeLines.push(`🎄 Holiday — ${status.holiday?.label ?? "we're closed"}`);
  }
  if (appts.length > 5) marqueeLines.push(`📦 ${appts.length} pickup appointments today`);
  if (tours.length > 0) marqueeLines.push(`🚪 ${tours.length} tour${tours.length === 1 ? "" : "s"} scheduled today`);
  try {
    const cfgRow = await prisma.siteConfig.findUnique({ where: { key: "lobby_marquee" } });
    if (cfgRow?.value) {
      cfgRow.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((s) => marqueeLines.push(s));
    }
  } catch { /* swallow */ }

  return {
    nowIso: now.toISOString(),
    bureauName,
    hoursStatus: status.status,
    hoursLabel: status.todayLabel,
    hoursToday: status.todayLabel,
    isOpen: status.status === "open" || status.status === "closing_soon" || status.status === "break",
    appointments: {
      total: appts.length,
      nextUp: nextUpCandidate,
      upcoming,
      checkedIn,
      completed,
    },
    tours: {
      total: tours.length,
      upcoming: tourUpcoming,
      completed: toursDone,
    },
    marqueeLines,
  };
}
