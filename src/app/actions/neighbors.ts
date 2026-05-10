"use server";

/**
 * iter-209 — Mailbox neighbor introductions (Tier 15 #118).
 *
 * Reciprocal opt-in directory. Members who opt in see other opted-in
 * members; non-opted-in members see + are invisible. Member-to-member
 * messaging through a server-side relay so the target's email is
 * never exposed to the sender's client.
 *
 * Audit: `neighbor.{opted_in,updated,opted_out,messaged}` per action.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

export type NeighborProfileView = {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  photoUrl: string | null;
  status: "Active" | "Hidden";
  suiteNumber: string | null;
  joinedYear: number;
  consentedAtIso: string;
};

function asStatus(s: string): NeighborProfileView["status"] {
  if (s === "Hidden") return "Hidden";
  return "Active";
}

function rowToView(r: { id: string; userId: string; displayName: string; bio: string; photoUrl: string | null; status: string; consentedAt: Date; user: { suiteNumber: string | null; mailboxAssignedAt: Date | null; createdAt: Date } | null }): NeighborProfileView {
  const joinedAt = r.user?.mailboxAssignedAt ?? r.user?.createdAt ?? new Date();
  return {
    id: r.id, userId: r.userId,
    displayName: r.displayName, bio: r.bio, photoUrl: r.photoUrl,
    status: asStatus(r.status),
    suiteNumber: r.user?.suiteNumber ?? null,
    joinedYear: joinedAt.getUTCFullYear(),
    consentedAtIso: r.consentedAt.toISOString(),
  };
}

// ─── Self ──────────────────────────────────────────────────────────────

export async function getMyNeighborProfile(): Promise<NeighborProfileView | null> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.neighborProfile.findUnique({
    where: { userId },
    include: { user: { select: { suiteNumber: true, mailboxAssignedAt: true, createdAt: true } } },
  });
  return row ? rowToView(row) : null;
}

export async function upsertMyNeighborProfile(input: { displayName: string; bio: string; photoUrl?: string }): Promise<{ row?: NeighborProfileView; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const displayName = input.displayName.trim().slice(0, 40);
  if (displayName.length < 1) return { error: "Display name required." };
  const bio = input.bio.trim().slice(0, 300);
  if (bio.length < 1) return { error: "Add a short bio so neighbors know what you're about." };
  const photoUrl = input.photoUrl?.trim() ?? null;
  if (photoUrl && (photoUrl.length > 600 || !/^https?:\/\//i.test(photoUrl))) return { error: "Photo URL must be https:// and ≤600 chars." };

  const existing = await prisma.neighborProfile.findUnique({ where: { userId } });
  const upserted = await prisma.neighborProfile.upsert({
    where: { userId },
    create: { userId, displayName, bio, photoUrl, status: "Active" },
    update: { displayName, bio, photoUrl, status: "Active" },
    include: { user: { select: { suiteNumber: true, mailboxAssignedAt: true, createdAt: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: existing ? "neighbor.updated" : "neighbor.opted_in",
      entityType: "NeighborProfile", entityId: upserted.id,
      metadata: JSON.stringify({ displayName, bioLength: bio.length, hasPhoto: !!photoUrl }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { row: rowToView(upserted) };
}

export async function optOutMyNeighborProfile(): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.neighborProfile.findUnique({ where: { userId } });
  if (!row) return { error: "No profile to opt out of." };
  await prisma.$transaction([
    prisma.neighborProfile.update({ where: { userId }, data: { status: "Hidden" } }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "neighbor.opted_out",
        entityType: "NeighborProfile", entityId: row.id,
        metadata: JSON.stringify({ status: "Hidden" }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Directory + messaging ────────────────────────────────────────────

export type ListNeighborsResult = {
  optedIn: boolean;                                       // is the current user opted in?
  count: number;
  neighbors: NeighborProfileView[];
};

export async function listNeighbors(): Promise<ListNeighborsResult> {
  const session = await verifySession();
  const userId = session.id!;
  const me = await prisma.neighborProfile.findUnique({ where: { userId } });
  const optedIn = !!me && me.status === "Active";
  if (!optedIn) return { optedIn: false, count: 0, neighbors: [] };

  const rows = await prisma.neighborProfile.findMany({
    where: { status: "Active", userId: { not: userId } },
    include: { user: { select: { suiteNumber: true, mailboxAssignedAt: true, createdAt: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return {
    optedIn: true,
    count: rows.length,
    neighbors: rows.map(rowToView),
  };
}

const MAX_BODY_CHARS = 1500;
const MAX_SUBJECT_CHARS = 100;
const MAX_DM_PER_DAY = 20;                                 // sanity rate-limit per sender

export async function messageNeighbor(input: { targetUserId: string; subject: string; body: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  if (input.targetUserId === userId) return { error: "Can't message yourself." };

  const subject = input.subject.trim().slice(0, MAX_SUBJECT_CHARS);
  if (subject.length < 2) return { error: "Subject required." };
  const body = input.body.trim().slice(0, MAX_BODY_CHARS);
  if (body.length < 5) return { error: "Message too short." };

  // Both sender + target must be opted in for the relay to work.
  const [me, them] = await Promise.all([
    prisma.neighborProfile.findUnique({ where: { userId } }),
    prisma.neighborProfile.findUnique({
      where: { userId: input.targetUserId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  if (!me || me.status !== "Active") return { error: "You need to opt in to the directory first." };
  if (!them || them.status !== "Active") return { error: "That neighbor isn't opted in (or has hidden their profile)." };
  if (!them.user?.email) return { error: "Neighbor's contact info isn't deliverable." };

  // Rate limit: count DMs from this sender today.
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const sentToday = await prisma.auditLog.count({
    where: { actorId: userId, action: "neighbor.messaged", createdAt: { gte: since } },
  });
  if (sentToday >= MAX_DM_PER_DAY) return { error: `Daily DM limit reached (${MAX_DM_PER_DAY}/day). Try again tomorrow.` };

  // Pull sender display name via own profile.
  const fromName = me.displayName;
  const toName = them.user.name.split(/\s+/)[0] ?? them.user.name;
  const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

  const html = `<!doctype html><html><body style="margin:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:white;border-radius:14px;border:1px solid #E8DDD0;padding:28px 32px;">
      <tr><td>
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#23596A;">📬 Message from a neighbor</p>
        <h1 style="margin:6px 0 4px;font-size:22px;font-weight:900;letter-spacing:-.4px;">Hi ${escapeHtml(toName)}, ${escapeHtml(fromName)} sent you a note</h1>
        <p style="margin:0 0 14px;font-size:13px;color:rgba(45,16,15,.55);">via the NOHO Mailbox neighbor directory</p>
        <div style="background:#F4F5F7;border-left:3px solid #337485;border-radius:6px;padding:14px 18px;margin:14px 0;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:#7A8290;">Subject</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#1F2937;">${escapeHtml(subject)}</p>
        </div>
        <div style="font-size:14px;line-height:1.55;color:#2D100F;white-space:pre-wrap;">${escapeHtml(body)}</div>
        <p style="margin:18px 0;text-align:center;">
          <a href="${BASE_URL}/dashboard?tab=neighbors" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">Reply via the directory →</a>
        </p>
        <p style="margin:14px 0 0;font-size:10px;color:rgba(45,16,15,.45);line-height:1.4;">
          You're receiving this because you opted in to the NOHO Mailbox neighbor directory. Hide your profile in <a href="${BASE_URL}/dashboard?tab=neighbors" style="color:#23596A;">dashboard settings</a> to stop these messages.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;

  const sendRes = await sendEmail({
    kind: "neighbor_dm",
    to: them.user.email,
    userId: them.user.id,
    subject: `[Neighbor · ${fromName}] ${subject}`,
    html,
  }).catch((e) => ({ status: "failed", error: e instanceof Error ? e.message : String(e) }));

  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "neighbor.messaged",
      entityType: "NeighborProfile", entityId: them.id,
      metadata: JSON.stringify({ subject, bodyLength: body.length, sendStatus: ("status" in sendRes) ? sendRes.status : "unknown" }),
    },
  }).catch(() => null);

  return { success: true };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
