"use server";

/**
 * iter-186 — Member ↔ admin chat thread on a billing dispute (Tier 12 #95).
 *
 * Both sides can post on a StorageFeeDispute. Read receipts on each
 * side power the "N unread" badges. Email + admin webhook fire on
 * cross-role posts (member → admin gets a Slack ping; admin → member
 * gets an email so they don't miss it before the next sign-in).
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export type DisputeMessageRow = {
  id: string;
  disputeId: string;
  authorId: string;
  authorRole: "MEMBER" | "ADMIN";
  authorName: string | null;
  body: string;
  readByMemberAtIso: string | null;
  readByAdminAtIso: string | null;
  createdAtIso: string;
};

export type DisputeThreadView = {
  disputeId: string;
  status: string;
  feeCents: number;
  reason: string;
  filedById: string;
  filedByName: string | null;
  resolution: string | null;
  resolvedAtIso: string | null;
  messages: DisputeMessageRow[];
  unreadForViewer: number;
};

async function loadAuthorNames(authorIds: string[]): Promise<Map<string, string>> {
  const distinct = Array.from(new Set(authorIds));
  if (distinct.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: distinct } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

function isClosed(status: string): boolean {
  return status === "Waived" || status === "Upheld";
}

// ─── Member: read my thread for a dispute ────────────────────────────
export async function getMyDisputeThread(input: { disputeId: string }): Promise<DisputeThreadView | null> {
  const session = await verifySession();
  const userId = session.id!;
  const dispute = await prisma.storageFeeDispute.findUnique({
    where: { id: input.disputeId },
    include: { messages: { orderBy: { createdAt: "asc" } }, filedBy: { select: { name: true } } },
  });
  if (!dispute) return null;
  if (dispute.filedById !== userId && session.role !== "ADMIN") return null;

  const names = await loadAuthorNames(dispute.messages.map((m) => m.authorId));
  const messages: DisputeMessageRow[] = dispute.messages.map((m) => ({
    id: m.id, disputeId: m.disputeId,
    authorId: m.authorId,
    authorRole: m.authorRole === "ADMIN" ? "ADMIN" : "MEMBER",
    authorName: names.get(m.authorId) ?? null,
    body: m.body,
    readByMemberAtIso: m.readByMemberAt?.toISOString() ?? null,
    readByAdminAtIso: m.readByAdminAt?.toISOString() ?? null,
    createdAtIso: m.createdAt.toISOString(),
  }));
  const unreadForViewer = messages.filter((m) => m.authorRole !== "MEMBER" && !m.readByMemberAtIso).length;

  return {
    disputeId: dispute.id,
    status: dispute.status,
    feeCents: dispute.feeCents,
    reason: dispute.reason,
    filedById: dispute.filedById,
    filedByName: dispute.filedBy?.name ?? null,
    resolution: dispute.resolution,
    resolvedAtIso: dispute.resolvedAt?.toISOString() ?? null,
    messages,
    unreadForViewer,
  };
}

// ─── Admin: read any thread ──────────────────────────────────────────
export async function getAdminDisputeThread(input: { disputeId: string }): Promise<DisputeThreadView | null> {
  await verifyAdmin();
  const dispute = await prisma.storageFeeDispute.findUnique({
    where: { id: input.disputeId },
    include: { messages: { orderBy: { createdAt: "asc" } }, filedBy: { select: { name: true } } },
  });
  if (!dispute) return null;
  const names = await loadAuthorNames(dispute.messages.map((m) => m.authorId));
  const messages: DisputeMessageRow[] = dispute.messages.map((m) => ({
    id: m.id, disputeId: m.disputeId,
    authorId: m.authorId,
    authorRole: m.authorRole === "ADMIN" ? "ADMIN" : "MEMBER",
    authorName: names.get(m.authorId) ?? null,
    body: m.body,
    readByMemberAtIso: m.readByMemberAt?.toISOString() ?? null,
    readByAdminAtIso: m.readByAdminAt?.toISOString() ?? null,
    createdAtIso: m.createdAt.toISOString(),
  }));
  const unreadForViewer = messages.filter((m) => m.authorRole !== "ADMIN" && !m.readByAdminAtIso).length;

  return {
    disputeId: dispute.id,
    status: dispute.status,
    feeCents: dispute.feeCents,
    reason: dispute.reason,
    filedById: dispute.filedById,
    filedByName: dispute.filedBy?.name ?? null,
    resolution: dispute.resolution,
    resolvedAtIso: dispute.resolvedAt?.toISOString() ?? null,
    messages,
    unreadForViewer,
  };
}

// ─── Post a message (auto-detects role from session) ────────────────
export async function postDisputeMessage(input: { disputeId: string; body: string }): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const session = await verifySession();
  const body = input.body.trim().slice(0, 2000);
  if (body.length < 2) return { ok: false, error: "Message required (≥2 chars)." };
  const dispute = await prisma.storageFeeDispute.findUnique({
    where: { id: input.disputeId },
    include: { filedBy: { select: { id: true, name: true, email: true } } },
  });
  if (!dispute) return { ok: false, error: "Dispute not found." };
  if (isClosed(dispute.status)) return { ok: false, error: `Dispute is ${dispute.status} — thread is closed.` };

  const isAdmin = session.role === "ADMIN";
  if (!isAdmin && dispute.filedById !== session.id) return { ok: false, error: "Not your dispute." };
  const role = isAdmin ? "ADMIN" : "MEMBER";

  // When the author posts, mark THEIR side as read up to + including
  // this message (their own posts are obviously read by themselves).
  const now = new Date();
  const created = await prisma.disputeMessage.create({
    data: {
      disputeId: dispute.id,
      authorId: session.id!,
      authorRole: role,
      body,
      readByMemberAt: role === "MEMBER" ? now : null,
      readByAdminAt:  role === "ADMIN"  ? now : null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id ?? "unknown",
      actorRole: role,
      action: role === "ADMIN" ? "dispute.admin_replied" : "dispute.member_replied",
      entityType: "DisputeMessage",
      entityId: created.id,
      metadata: JSON.stringify({ disputeId: dispute.id, bodyLength: body.length }),
    },
  });

  // Cross-role notification side effects (fire-and-forget).
  if (role === "MEMBER") {
    // Member → admin: ping the admin Slack/Discord/Pushover channel so
    // staff see it in the room they're already monitoring.
    void fireWebhooks("storage.dispute_filed", {
      text: `💬 *${dispute.filedBy?.name ?? "Member"}* replied on storage dispute #${dispute.id.slice(0, 8)} — "${body.slice(0, 140)}"`,
      emoji: "💬",
      detail: {
        disputeId: dispute.id,
        userId: dispute.filedById,
        feeCents: dispute.feeCents,
      },
    });
  } else {
    // Admin → member: email + member webhook so they catch it before
    // next sign-in.
    if (dispute.filedBy?.email) {
      void sendEmail({
        to: dispute.filedBy.email,
        subject: `New reply on your storage fee dispute`,
        kind: "dispute_admin_reply",
        userId: dispute.filedById,
        html: buildAdminReplyEmail(dispute.filedBy.name, body, dispute.feeCents, dispute.id),
      }).catch(() => undefined);
    }
    void fireMemberWebhooks(dispute.filedById, "test.ping", {
      text: `💬 NOHO replied to your storage dispute — open the dashboard to read it.`,
      url: `${BASE_URL}/dashboard?tab=packages`,
      detail: { kind: "dispute_admin_reply", disputeId: dispute.id, bodyPreview: body.slice(0, 100) },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, messageId: created.id };
}

// ─── Mark messages read (viewer-side) ────────────────────────────────
// Walks every message authored by the OTHER role + sets the viewer's
// readAt. Idempotent — re-calling is cheap.
export async function markDisputeRead(input: { disputeId: string }): Promise<{ marked: number }> {
  const session = await verifySession();
  const dispute = await prisma.storageFeeDispute.findUnique({
    where: { id: input.disputeId }, select: { id: true, filedById: true },
  });
  if (!dispute) return { marked: 0 };
  const isAdmin = session.role === "ADMIN";
  if (!isAdmin && dispute.filedById !== session.id) return { marked: 0 };
  const now = new Date();
  if (isAdmin) {
    const result = await prisma.disputeMessage.updateMany({
      where: { disputeId: dispute.id, authorRole: "MEMBER", readByAdminAt: null },
      data: { readByAdminAt: now },
    });
    return { marked: result.count };
  } else {
    const result = await prisma.disputeMessage.updateMany({
      where: { disputeId: dispute.id, authorRole: "ADMIN", readByMemberAt: null },
      data: { readByMemberAt: now },
    });
    return { marked: result.count };
  }
}

// ─── Admin: list disputes with unread count for the queue ────────────
export type AdminDisputeQueueRow = {
  id: string;
  filedByName: string;
  feeCents: number;
  status: string;
  unreadFromMember: number;
  lastMessageAtIso: string | null;
  createdAtIso: string;
};
export async function listAdminDisputeQueue(input: { status?: "Open" | "Waived" | "Upheld" | "all" } = {}): Promise<AdminDisputeQueueRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") where.status = input.status;
  else where.status = "Open"; // default to open
  const rows = await prisma.storageFeeDispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      filedBy: { select: { name: true } },
      messages: { select: { authorRole: true, readByAdminAt: true, createdAt: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    filedByName: r.filedBy?.name ?? "(unknown)",
    feeCents: r.feeCents,
    status: r.status,
    unreadFromMember: r.messages.filter((m) => m.authorRole === "MEMBER" && !m.readByAdminAt).length,
    lastMessageAtIso: r.messages.length > 0 ? r.messages[r.messages.length - 1]!.createdAt.toISOString() : null,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// ─── Email template ──────────────────────────────────────────────────
function buildAdminReplyEmail(name: string, body: string, feeCents: number, disputeId: string): string {
  const firstName = name.split(" ")[0] || "there";
  const dollars = (feeCents / 100).toFixed(2);
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,#337485,#23596A);padding:24px 28px;">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F7E6C2;">NOHO Mailbox · Storage dispute</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:white;">New reply from NOHO 💬</h1>
  </td></tr>
  <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p>Hi ${firstName}, our team replied to your dispute on the $${dollars} storage fee.</p>
    <blockquote style="margin:16px 0;padding:14px 16px;border-left:3px solid #337485;background:#f7faff;color:#3A1816;font-style:italic;white-space:pre-wrap;">${body.replace(/</g, "&lt;")}</blockquote>
    <a href="${BASE_URL}/dashboard?tab=packages" style="display:inline-block;margin-top:8px;background:#337485;color:white;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:100px;">Open dispute thread</a>
    <p style="margin:18px 0 0;font-size:12px;color:#5C4540;">Reply right back from your dashboard — we'll get the thread sorted same day.</p>
    <p style="margin:8px 0 0;font-size:10px;color:#9aa5b8;">Thread ID: ${disputeId}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
