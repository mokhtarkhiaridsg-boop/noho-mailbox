"use server";

/**
 * iter-181 — Mailbox tour booking (Tier 12 #90).
 *
 * Public no-auth form on the marketing site lets prospects request a
 * 15-min walkthrough. Admin sees them in a queue, confirms (which
 * fires a friendly confirmation email), then marks completed +
 * optionally flags `becameMember` after the prospect signs up.
 *
 * Conversion attribution: when a converted prospect's email matches
 * a real User row, admin can link them via `becameUserId` so we can
 * later compute "tour → signup" conversion rate.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const RATE_LIMIT_PER_IP_PER_HR = 4;
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
const BUREAU_LOCATION = "5062 Lankershim Blvd, North Hollywood, CA 91601";

export type MailboxTourRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  requestedDate: string;
  requestedTime: string;
  partySize: number;
  reason: string | null;
  status: "Pending" | "Confirmed" | "Completed" | "No Show" | "Cancelled";
  source: string;
  confirmedAtIso: string | null;
  completedAtIso: string | null;
  becameMember: boolean;
  becameUserId: string | null;
  noShowAtIso: string | null;
  cancelledAtIso: string | null;
  cancelReason: string | null;
  adminNotes: string | null;
  createdAtIso: string;
};

const VALID_STATUSES = ["Pending", "Confirmed", "Completed", "No Show", "Cancelled"] as const;
function castStatus(s: string): MailboxTourRow["status"] {
  return (VALID_STATUSES as readonly string[]).includes(s) ? (s as MailboxTourRow["status"]) : "Pending";
}

function toRow(r: { id: string; name: string; email: string; phone: string | null; requestedDate: string; requestedTime: string; partySize: number; reason: string | null; status: string; source: string; confirmedAt: Date | null; completedAt: Date | null; becameMember: boolean; becameUserId: string | null; noShowAt: Date | null; cancelledAt: Date | null; cancelReason: string | null; adminNotes: string | null; createdAt: Date }): MailboxTourRow {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    requestedDate: r.requestedDate,
    requestedTime: r.requestedTime,
    partySize: r.partySize,
    reason: r.reason,
    status: castStatus(r.status),
    source: r.source,
    confirmedAtIso: r.confirmedAt?.toISOString() ?? null,
    completedAtIso: r.completedAt?.toISOString() ?? null,
    becameMember: r.becameMember,
    becameUserId: r.becameUserId,
    noShowAtIso: r.noShowAt?.toISOString() ?? null,
    cancelledAtIso: r.cancelledAt?.toISOString() ?? null,
    cancelReason: r.cancelReason,
    adminNotes: r.adminNotes,
    createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── Public: request a tour ────────────────────────────────────────
export type RequestTourInput = {
  name: string;
  email: string;
  phone?: string;
  requestedDate: string;          // YYYY-MM-DD
  requestedTime: string;          // HH:MM
  partySize?: number;
  reason?: string;
};

export type RequestTourResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function requestMailboxTour(input: RequestTourInput): Promise<RequestTourResult> {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false, error: "Name required." };
  const email = input.email.trim().slice(0, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Valid email required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.requestedDate)) return { ok: false, error: "Invalid date." };
  if (!/^\d{2}:\d{2}$/.test(input.requestedTime)) return { ok: false, error: "Invalid time." };
  // Don't accept dates in the past.
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (input.requestedDate < todayYmd) return { ok: false, error: "Pick a future date." };

  const phone = input.phone?.trim().slice(0, 40) || null;
  const partySize = Math.max(1, Math.min(10, Math.round(input.partySize ?? 1)));
  const reason = input.reason?.trim().slice(0, 500) || null;

  // Rate-limit per IP via AuditLog scan (no PII column on the row
  // itself for the rate ledger).
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip")) ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 200) ?? null;
  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.auditLog.count({
      where: { action: "tour.requested", createdAt: { gte: since }, metadata: { contains: `"ip":"${ip}"` } },
    });
    if (recent >= RATE_LIMIT_PER_IP_PER_HR) {
      return { ok: false, error: "Too many tour requests from this device. Try again later." };
    }
  }

  const created = await prisma.mailboxTour.create({
    data: {
      name, email, phone, requestedDate: input.requestedDate, requestedTime: input.requestedTime,
      partySize, reason, ip, userAgent,
      status: "Pending", source: "web",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: "public", actorRole: "PUBLIC",
      action: "tour.requested",
      entityType: "MailboxTour",
      entityId: created.id,
      metadata: JSON.stringify({ name, email, requestedDate: input.requestedDate, requestedTime: input.requestedTime, ip }),
    },
  });
  // Auto-acknowledgment to prospect. We don't auto-confirm — admin
  // approves so we can match against operating hours / staff coverage.
  void sendEmail({
    to: email,
    subject: "Got it — tour request received",
    kind: "tour_acknowledged",
    userId: null,
    html: buildTourAcknowledgmentEmail(name, input.requestedDate, input.requestedTime, partySize, reason),
  }).catch(() => undefined);
  // Admin Slack/Discord ping so they don't miss it.
  void fireWebhooks("door.code_issued", {
    text: `🎟 Tour requested · *${name}* (${email}) · ${input.requestedDate} ${input.requestedTime} · party of ${partySize}${reason ? `\n"${reason}"` : ""}`,
    emoji: "🎟",
    detail: { tourId: created.id, name, email, phone, requestedDate: input.requestedDate, requestedTime: input.requestedTime, partySize, reason },
  });
  revalidatePath("/admin");
  return { ok: true, id: created.id };
}

// ─── Admin: queue + state transitions ──────────────────────────────
export async function listMailboxTours(input: { status?: MailboxTourRow["status"] | "all" } = {}): Promise<MailboxTourRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") where.status = input.status;
  const rows = await prisma.mailboxTour.findMany({
    where,
    orderBy: [{ status: "asc" }, { requestedDate: "asc" }, { requestedTime: "asc" }],
    take: 100,
  });
  return rows.map(toRow);
}

export async function confirmMailboxTour(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxTour.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Tour not found." };
  if (row.status === "Confirmed") return { error: "Already confirmed." };
  if (row.status === "Completed" || row.status === "Cancelled" || row.status === "No Show") {
    return { error: `Cannot confirm a ${row.status.toLowerCase()} tour.` };
  }
  await prisma.$transaction([
    prisma.mailboxTour.update({
      where: { id: row.id },
      data: { status: "Confirmed", confirmedAt: new Date(), confirmedById: actor.id ?? null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "tour.confirmed",
        entityType: "MailboxTour",
        entityId: row.id,
        metadata: JSON.stringify({ name: row.name, email: row.email, requestedDate: row.requestedDate, requestedTime: row.requestedTime }),
      },
    }),
  ]);
  // Confirmation email to prospect.
  void sendEmail({
    to: row.email,
    subject: "Confirmed — your NOHO Mailbox tour",
    kind: "tour_confirmed",
    userId: null,
    html: buildTourConfirmEmail(row.name, row.requestedDate, row.requestedTime, row.partySize),
  }).catch(() => undefined);
  revalidatePath("/admin");
  return { success: true };
}

export async function markTourCompleted(input: { id: string; becameMember?: boolean; becameUserId?: string; adminNotes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxTour.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Tour not found." };
  if (row.status === "Completed") return { error: "Already completed." };
  await prisma.$transaction([
    prisma.mailboxTour.update({
      where: { id: row.id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        completedById: actor.id ?? null,
        becameMember: input.becameMember ?? false,
        becameUserId: input.becameMember && input.becameUserId ? input.becameUserId : null,
        adminNotes: input.adminNotes?.trim().slice(0, 500) ?? row.adminNotes,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: input.becameMember ? "tour.completed_converted" : "tour.completed",
        entityType: "MailboxTour",
        entityId: row.id,
        metadata: JSON.stringify({ name: row.name, email: row.email, becameMember: input.becameMember, becameUserId: input.becameUserId ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function markTourNoShow(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxTour.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Tour not found." };
  if (row.status === "Completed") return { error: "Cannot mark completed tour as no-show." };
  await prisma.$transaction([
    prisma.mailboxTour.update({
      where: { id: row.id },
      data: { status: "No Show", noShowAt: new Date(), adminNotes: input.reason?.trim().slice(0, 500) ?? row.adminNotes },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "tour.no_show",
        entityType: "MailboxTour",
        entityId: row.id,
        metadata: JSON.stringify({ name: row.name, email: row.email, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function cancelMailboxTour(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.mailboxTour.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Tour not found." };
  if (row.status === "Cancelled") return { error: "Already cancelled." };
  if (row.status === "Completed") return { error: "Cannot cancel completed tour." };
  await prisma.$transaction([
    prisma.mailboxTour.update({
      where: { id: row.id },
      data: { status: "Cancelled", cancelledAt: new Date(), cancelReason: input.reason?.trim().slice(0, 300) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "tour.cancelled",
        entityType: "MailboxTour",
        entityId: row.id,
        metadata: JSON.stringify({ name: row.name, email: row.email, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// Header counters for the panel.
export async function getMailboxTourCounts(): Promise<{ pending: number; confirmedToday: number; completedThisMonth: number; conversionRate30d: number }> {
  await verifyAdmin();
  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const [pending, confirmedToday, completedThisMonth, completed30d, converted30d] = await Promise.all([
    prisma.mailboxTour.count({ where: { status: "Pending" } }),
    prisma.mailboxTour.count({ where: { status: "Confirmed", requestedDate: todayYmd } }),
    prisma.mailboxTour.count({ where: { status: "Completed", completedAt: { gte: monthStart } } }),
    prisma.mailboxTour.count({ where: { status: "Completed", completedAt: { gte: thirtyAgo } } }),
    prisma.mailboxTour.count({ where: { status: "Completed", completedAt: { gte: thirtyAgo }, becameMember: true } }),
  ]);
  const conversionRate30d = completed30d > 0 ? Math.round((converted30d / completed30d) * 100) : 0;
  return { pending, confirmedToday, completedThisMonth, conversionRate30d };
}

// ─── Email templates ────────────────────────────────────────────────
function buildTourAcknowledgmentEmail(name: string, date: string, time: string, partySize: number, reason: string | null): string {
  const firstName = name.split(" ")[0] || "there";
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,#337485,#23596A);padding:24px 28px;">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F7E6C2;">NOHO Mailbox · Tour request</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:white;">Got it, ${firstName} 👋</h1>
  </td></tr>
  <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p>Thanks for asking to come by. We'll review and email a confirmation within a few hours.</p>
    <div style="margin:14px 0;padding:14px 16px;border-radius:12px;background:#F4EEE3;border:1px solid #E8DDD0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#2D100F;">
        <tr><td style="padding:4px 0;width:40%;color:#7A6050;">When</td><td style="padding:4px 0;font-weight:800;">${dateLabel}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Time</td><td style="padding:4px 0;font-weight:800;">${time}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Party</td><td style="padding:4px 0;font-weight:800;">${partySize}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Where</td><td style="padding:4px 0;font-weight:800;">${BUREAU_LOCATION}</td></tr>
      </table>
    </div>
    ${reason ? `<p style="margin:0 0 12px;padding:10px 12px;border-left:3px solid #337485;background:#f7faff;font-style:italic;color:#3A1816;">You said: "${reason.replace(/</g, "&lt;")}"</p>` : ""}
    <p>Plan on 15 minutes — we'll show you the mailboxes, the package room, the notary station, and answer anything you've got.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#5C4540;">Need to reschedule? Reply to this email and we'll sort it the same day.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buildTourConfirmEmail(name: string, date: string, time: string, partySize: number): string {
  const firstName = name.split(" ")[0] || "there";
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,#22C55E,#15803d);padding:24px 28px;">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.92);">NOHO Mailbox · Tour confirmed</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:white;">See you ${firstName}! 🎟</h1>
  </td></tr>
  <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p>Your tour is confirmed.</p>
    <div style="margin:14px 0;padding:14px 16px;border-radius:12px;background:#F4EEE3;border:1px solid #E8DDD0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#2D100F;">
        <tr><td style="padding:4px 0;width:40%;color:#7A6050;">When</td><td style="padding:4px 0;font-weight:800;">${dateLabel}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Time</td><td style="padding:4px 0;font-weight:800;">${time}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Party</td><td style="padding:4px 0;font-weight:800;">${partySize}</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Where</td><td style="padding:4px 0;font-weight:800;">${BUREAU_LOCATION}</td></tr>
      </table>
    </div>
    <a href="https://maps.apple.com/?q=NOHO+Mailbox+5062+Lankershim+Blvd+North+Hollywood+CA" style="display:inline-block;margin-top:8px;background:#337485;color:white;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:100px;">Open in Maps</a>
    <p style="margin:16px 0 0;font-size:12px;color:#5C4540;">If something comes up, reply to this email or call (818) 506-7744 — we're flexible.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
