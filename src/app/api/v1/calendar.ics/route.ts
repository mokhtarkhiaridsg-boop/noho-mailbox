// iter-180 — Subscribable iCal feed for member appointments.
//
// Returns text/calendar at /api/v1/calendar.ics. Token-gated via the
// iter-166 API token system, BUT calendar apps don't send the
// Authorization header for subscriptions — they fetch the URL as-is.
// So we accept the token as either:
//   - `?token=noho_…` query param (recommended for calendar subscriptions)
//   - `Authorization: Bearer noho_…` header (for tooling)
//
// Required scope: calendar:read
//
// Events surfaced:
//   - iter-29/160 NotaryBooking (date+time → 30-min event)
//   - iter-101 PickupAppointment
//   - iter-173 CarrierPickup (admin-scheduled, but member can see their
//     suite #'s outbound day — useful for batch shipments)
//   - User.planDueDate as a single all-day "renewal due" event
//   - User.idPrimaryExpDate / idSecondaryExpDate as all-day reminders

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyApiToken, logApiUsage, clientIp,
  TOKEN_BRAND_PREFIX, TOKEN_TOTAL_LEN,
} from "@/lib/apiTokens";
import { buildIcs, type IcsEvent } from "@/lib/ical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUREAU_LOCATION = "NOHO Mailbox · 5062 Lankershim Blvd, North Hollywood, CA 91601";
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// Wrapper around iter-166 verifyApiToken that also accepts ?token=…
// query-string auth (calendar apps can't send custom headers on
// subscriptions). We route through verifyApiToken by synthesizing an
// Authorization header when the query param is present.
async function verifyForCalendar(req: Request): Promise<Awaited<ReturnType<typeof verifyApiToken>>> {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken && queryToken.startsWith(TOKEN_BRAND_PREFIX) && queryToken.length === TOKEN_TOTAL_LEN) {
    // Build a synthetic request with the Authorization header so the
    // existing verifier sees the token from the same code path.
    const synthHeaders = new Headers(req.headers);
    synthHeaders.set("authorization", `Bearer ${queryToken}`);
    const synthReq = new Request(req.url, { method: req.method, headers: synthHeaders });
    return verifyApiToken(synthReq, "calendar:read");
  }
  return verifyApiToken(req, "calendar:read");
}

export async function GET(req: Request) {
  const started = Date.now();
  const url = new URL(req.url);
  const auth = await verifyForCalendar(req);
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent");

  if (!auth.ok) {
    void logApiUsage({ tokenId: null, endpoint: url.pathname, method: "GET", status: auth.status, durationMs: Date.now() - started, ip, userAgent: ua });
    // Calendar apps reading a 401 will surface "subscription failed" —
    // give them a parseable plain-text body that helps the user
    // debug.
    return new NextResponse(`# NOHO Mailbox calendar feed\n# ${auth.error}\n# Append ?token=noho_… to the URL.\n`, {
      status: auth.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true, name: true, suiteNumber: true,
        planDueDate: true, idPrimaryExpDate: true, idSecondaryExpDate: true, idPrimaryType: true, idSecondaryType: true,
      },
    });
    if (!user) {
      return new NextResponse("# user_not_found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
    }

    const events: IcsEvent[] = [];

    // ── Notary bookings ─────────────────────────────────────────
    const notary = await prisma.notaryBooking.findMany({
      where: { userId: user.id, status: { notIn: ["Cancelled"] } },
      take: 100,
      orderBy: { date: "desc" },
    });
    for (const b of notary) {
      const start = parseLocalDateTime(b.date, b.time);
      if (!start) continue;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      events.push({
        uid: `notary-${b.id}@nohomailbox.org`,
        summary: `📒 Notary · ${b.type}`,
        description: [
          `NOHO Mailbox notary appointment.`,
          b.notes ? `Member note: ${b.notes}` : null,
          b.checkedInAt ? `Status: Checked in at ${b.checkedInAt.toISOString()}` : `Status: ${b.status}`,
          `Bring a valid government ID. The bureau is at ${BUREAU_LOCATION}.`,
        ].filter(Boolean).join("\n"),
        location: BUREAU_LOCATION,
        start,
        end,
        url: `${BASE_URL}/dashboard?tab=notary`,
        category: "Notary",
      });
    }

    // ── Pickup appointments ────────────────────────────────────
    type PickupRow = { id: string; scheduledAt: Date; durationMin: number; status: string; notes: string | null; guestName: string | null; packageCount: number | null };
    let pickups: PickupRow[] = [];
    try {
      const rows = await prisma.pickupAppointment.findMany({
        where: { userId: user.id, status: { notIn: ["Cancelled"] } },
        select: { id: true, scheduledAt: true, durationMin: true, status: true, notes: true, guestName: true, packageCount: true },
        take: 100,
        orderBy: { scheduledAt: "desc" },
      });
      pickups = rows;
    } catch { /* table mismatch — silent */ }
    for (const p of pickups) {
      const start = p.scheduledAt;
      const end = new Date(start.getTime() + (p.durationMin ?? 15) * 60 * 1000);
      events.push({
        uid: `pickup-${p.id}@nohomailbox.org`,
        summary: `📦 Pickup · NOHO Mailbox${p.packageCount ? ` (${p.packageCount} pkg)` : ""}`,
        description: [
          `Scheduled package pickup.`,
          p.guestName ? `Guest: ${p.guestName}` : null,
          p.notes ? `Member note: ${p.notes}` : null,
          `Suite #${user.suiteNumber ?? "—"} at ${BUREAU_LOCATION}`,
        ].filter(Boolean).join("\n"),
        location: BUREAU_LOCATION,
        start,
        end,
        url: `${BASE_URL}/dashboard?tab=packages`,
        category: "Pickup",
      });
    }

    // ── Plan renewal date ─────────────────────────────────────
    if (user.planDueDate) {
      const d = parseAllDay(user.planDueDate);
      if (d) {
        events.push({
          uid: `plan-renewal-${user.id}-${user.planDueDate}@nohomailbox.org`,
          summary: `💳 Mailbox renewal due`,
          description: `Your NOHO Mailbox plan renews today. We'll notify you separately about the actual charge.`,
          location: BUREAU_LOCATION,
          start: d,
          allDay: true,
          url: `${BASE_URL}/dashboard?tab=settings`,
          category: "Renewal",
        });
      }
    }

    // ── ID expiration reminders ────────────────────────────────
    if (user.idPrimaryExpDate) {
      const d = parseAllDay(user.idPrimaryExpDate);
      if (d) events.push({
        uid: `id-primary-${user.id}-${user.idPrimaryExpDate}@nohomailbox.org`,
        summary: `🪪 ${user.idPrimaryType ?? "ID"} expires`,
        description: `Your primary ID on file with NOHO Mailbox expires today. Bring an updated copy to the bureau.`,
        start: d,
        allDay: true,
        url: `${BASE_URL}/dashboard?tab=settings`,
        category: "ID",
      });
    }
    if (user.idSecondaryExpDate) {
      const d = parseAllDay(user.idSecondaryExpDate);
      if (d) events.push({
        uid: `id-secondary-${user.id}-${user.idSecondaryExpDate}@nohomailbox.org`,
        summary: `🪪 ${user.idSecondaryType ?? "Secondary ID"} expires`,
        description: `Your secondary ID on file with NOHO Mailbox expires today.`,
        start: d,
        allDay: true,
        url: `${BASE_URL}/dashboard?tab=settings`,
        category: "ID",
      });
    }

    const body = buildIcs({
      name: `NOHO Mailbox · ${user.name}`,
      description: `Notary, pickups, and key dates for suite #${user.suiteNumber ?? "—"}.`,
      events,
      productId: "NOHO Mailbox",
    });

    void logApiUsage({ tokenId: auth.tokenId, endpoint: url.pathname, method: "GET", status: 200, durationMs: Date.now() - started, ip, userAgent: ua });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="noho-mailbox.ics"`,
        "Cache-Control": "no-cache, must-revalidate",
        "x-noho-api": "v1",
      },
    });
  } catch (e) {
    void logApiUsage({ tokenId: auth.tokenId, endpoint: url.pathname, method: "GET", status: 500, durationMs: Date.now() - started, ip, userAgent: ua });
    return new NextResponse(`# error: ${e instanceof Error ? e.message : String(e)}\n`, { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

// Member-supplied date/time fields are local YYYY-MM-DD + HH:MM (24h).
// We treat them as bureau-local America/Los_Angeles, and emit the
// resulting UTC instant. JS Date doesn't natively do TZ; we emit "as
// if the bureau is local on the server" which is correct for our
// hosting setup. (Future hardening: explicit TZID property + VTIMEZONE.)
function parseLocalDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAllDay(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Use UTC midnight so the all-day event lands on the right calendar
  // square in any timezone.
  const [y, m, day] = date.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(Date.UTC(y, m - 1, day));
}
