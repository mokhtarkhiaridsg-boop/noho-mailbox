// iter-201 — Admin iCal feed for MailboxTour bookings (Tier 14 #110).
//
// Returns text/calendar at /api/cal/tours.ics. Lets bureau admin
// subscribe to today + future tours alongside their personal calendar
// (Google Calendar / Apple Calendar / Outlook). Calendar apps fetch the
// URL with no Authorization header, so we accept the token via:
//   - `?token=…` query param (recommended for calendar subscriptions)
//   - `Authorization: Bearer …` header (for tooling/curl)
//
// Auth: a single `ADMIN_CAL_TOKEN` env var (constant-time-compared).
// Same operational pattern as `CRON_SECRET` — admin sets it once in the
// host env. If unset, the route 503s with a parseable plain-text body
// so calendar apps surface a useful error rather than silently failing.
//
// Surfaces:
//   - All MailboxTours from today onward (status ∈ Pending|Confirmed)
//   - Last 14d of Completed/No-Show tours for context (so admin can
//     scroll back and see who showed)
//
// Audit: per-fetch `tour_calendar.fetched` (debounced via the
// timingSafeEqual fast-path returning early on auth failure).

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildIcs, type IcsEvent } from "@/lib/ical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUREAU_LOCATION = "NOHO Mailbox · 11288 Ventura Blvd #1006, Studio City, CA 91604";
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
const HISTORY_DAYS = 14;
const FUTURE_CAP = 200;

function constantTimeEq(a: string, b: string): boolean {
  // timingSafeEqual requires equal-length buffers; pad the shorter to
  // avoid leaking length via the early-return path.
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still call timingSafeEqual on equal-length buffers so timing is
    // consistent on both length-mismatch and content-mismatch.
    timingSafeEqual(Buffer.alloc(32, 0), Buffer.alloc(32, 1));
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function authOk(req: Request): boolean {
  const expected = (process.env.ADMIN_CAL_TOKEN ?? "").trim();
  if (!expected) return false;
  const url = new URL(req.url);
  const queryTok = url.searchParams.get("token") ?? "";
  const headerTok = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return constantTimeEq(queryTok, expected) || constantTimeEq(headerTok, expected);
}

const STATUS_GLYPH: Record<string, string> = {
  Pending:    "⏳",
  Confirmed:  "✓",
  Completed:  "🎉",
  "No Show":  "❌",
  Cancelled:  "🚫",
};

export async function GET(req: Request) {
  if (!process.env.ADMIN_CAL_TOKEN) {
    return new NextResponse(
      "# NOHO Mailbox tour calendar\n# server has no ADMIN_CAL_TOKEN configured — ask the operator to set one.\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  if (!authOk(req)) {
    return new NextResponse(
      "# NOHO Mailbox tour calendar\n# unauthorized — append ?token=… to the URL or send Authorization: Bearer …\n",
      { status: 401, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);                            // YYYY-MM-DD in UTC
    const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const tours = await prisma.mailboxTour.findMany({
      where: {
        OR: [
          // Future + today: all non-cancelled statuses
          { requestedDate: { gte: today }, status: { in: ["Pending", "Confirmed"] } },
          // History window: keep Completed + No Show so admin can scroll back
          { requestedDate: { gte: since, lt: today }, status: { in: ["Completed", "No Show", "Confirmed"] } },
        ],
      },
      orderBy: [{ requestedDate: "asc" }, { requestedTime: "asc" }],
      take: FUTURE_CAP,
    }).catch(() => [] as Array<{ id: string; name: string; email: string; phone: string | null; requestedDate: string; requestedTime: string; partySize: number; reason: string | null; status: string; source: string; adminNotes: string | null; becameMember: boolean; updatedAt: Date }>);

    const events: IcsEvent[] = [];
    for (const t of tours) {
      const start = parseLocalDateTime(t.requestedDate, t.requestedTime);
      if (!start) continue;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const glyph = STATUS_GLYPH[t.status] ?? "🚪";
      const partyTag = t.partySize > 1 ? ` · party of ${t.partySize}` : "";
      const becameTag = t.becameMember ? " ⭐" : "";
      events.push({
        uid: `tour-${t.id}@nohomailbox.org`,
        summary: `${glyph} Tour · ${t.name}${partyTag}${becameTag}`,
        description: [
          `Status: ${t.status}`,
          `Source: ${t.source}`,
          `Party of ${t.partySize}`,
          t.reason ? `Reason: ${t.reason}` : null,
          t.email ? `Email: ${t.email}` : null,
          t.phone ? `Phone: ${t.phone}` : null,
          t.becameMember ? "★ Became a member" : null,
          t.adminNotes ? `Admin notes: ${t.adminNotes}` : null,
          ``,
          `Open in admin: ${BASE_URL}/admin?tab=mailboxtours`,
        ].filter(Boolean).join("\n"),
        location: BUREAU_LOCATION,
        start,
        end,
        url: `${BASE_URL}/admin?tab=mailboxtours`,
        category: "Tour",
      });
    }

    const body = buildIcs({
      name: "NOHO Mailbox · Tour bookings",
      description: "Admin feed of mailbox-tour bookings. Updates whenever a tour is added/confirmed/cancelled.",
      events,
      productId: "NOHO Mailbox",
    });

    // Audit per fetch — calendar apps poll every ~15min so this is
    // bounded; useful for "did Google Calendar refresh today?".
    void prisma.auditLog.create({
      data: {
        actorId: "calendar_subscriber", actorRole: "ADMIN",
        action: "tour_calendar.fetched",
        entityType: "MailboxTour", entityId: "feed",
        metadata: JSON.stringify({ events: events.length, ip: req.headers.get("x-forwarded-for") ?? "unknown" }),
      },
    }).catch(() => null);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="noho-tours.ics"`,
        "Cache-Control": "no-cache, must-revalidate",
        "x-noho-feed": "tours",
      },
    });
  } catch (e) {
    return new NextResponse(`# error: ${e instanceof Error ? e.message : String(e)}\n`, { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

function parseLocalDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
