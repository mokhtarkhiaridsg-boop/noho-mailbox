"use server";

// iter-122 — Member self-service mailbox suite transfer.
//
// Member files a request for a different suite #. We compute the
// vacant slots from the current occupied range (reuses the iter-117
// occupancy logic), let them pick one + write a reason, then queue
// the request for admin. Admin approves → atomic User.suiteNumber
// update + MailboxKey reassignment hint + audit + notification email.

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// ─── Vacant slots (reuses iter-117 logic locally — keep self-contained) ──
export async function getVacantSuiteNumbers(): Promise<{ suite: string; rank: number }[]> {
  await verifySession();
  const users = await prisma.user.findMany({
    where: { role: "USER", suiteNumber: { not: null } },
    select: { suiteNumber: true },
  });
  const occupied = new Set(users.map((u) => u.suiteNumber!).filter(Boolean));
  const ranks = Array.from(occupied)
    .map((s) => parseInt(s.match(/(\d+)/)?.[1] ?? "", 10))
    .filter((n) => Number.isFinite(n));
  if (ranks.length === 0) return [];
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  const vacant: { suite: string; rank: number }[] = [];
  for (let n = min; n <= max; n += 1) {
    const padded = String(n).padStart(3, "0");
    if (!occupied.has(padded) && !occupied.has(String(n))) {
      vacant.push({ suite: padded, rank: n });
    }
  }
  return vacant;
}

// ─── Member: file ────────────────────────────────────────────────────────
export async function requestSuiteTransfer(input: {
  toSuite: string;
  reason: string;
}): Promise<{ error?: string; requestId?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const target = input.toSuite.trim();
  const reason = input.reason.trim();
  if (!target) return { error: "Pick a target suite" };
  if (reason.length < 10) return { error: "Tell us why in at least a sentence (10+ chars)" };
  if (reason.length > 500) return { error: "Keep the reason under 500 characters" };

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, suiteNumber: true },
  });
  if (!u) return { error: "User not found" };
  if (!u.suiteNumber) return { error: "You don't have a suite assigned yet" };
  if (u.suiteNumber === target) return { error: "That's your current suite" };

  // Check vacancy.
  const occupier = await prisma.user.findFirst({
    where: { suiteNumber: target },
    select: { id: true },
  });
  if (occupier) return { error: `Suite #${target} is taken — pick a vacant one` };

  // Block duplicate Pending requests.
  const open = await prisma.suiteTransferRequest.findFirst({
    where: { userId, status: "Pending" },
  });
  if (open) return { error: "You already have a pending request — admin's reviewing." };

  const created = await prisma.$transaction(async (tx) => {
    const r = await tx.suiteTransferRequest.create({
      data: { userId, fromSuite: u.suiteNumber!, toSuite: target, reason },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "suite.transfer_requested",
        entityType: "SuiteTransferRequest",
        entityId: r.id,
        metadata: JSON.stringify({ fromSuite: u.suiteNumber, toSuite: target }),
      },
    });
    return r;
  });

  // Best-effort: confirmation email + admin webhook ping.
  void (async () => {
    try {
      await sendEmail({
        to: u.email,
        subject: `Suite transfer request received · #${u.suiteNumber} → #${target} — NOHO Mailbox`,
        kind: "suite_transfer_filed",
        userId,
        html: emailFiled({
          firstName: (u.name ?? "there").split(" ")[0],
          fromSuite: u.suiteNumber!,
          toSuite: target,
          reason,
        }),
      });
    } catch (e) { console.error("[requestSuiteTransfer] email failed:", e); }
    try {
      await fireWebhooks("suite.transfer_requested", {
        text: `🔀 *${u.name}* wants to move from suite #${u.suiteNumber} → #${target} · "${reason.slice(0, 80)}${reason.length > 80 ? "…" : ""}"`,
        emoji: "🔀",
        url: `${BASE_URL}/admin?tab=suitetransfers`,
        detail: { userId, fromSuite: u.suiteNumber, toSuite: target },
      });
    } catch (e) { console.error("[requestSuiteTransfer] webhook failed:", e); }
  })();

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { requestId: created.id };
}

// ─── Member: read my pending ─────────────────────────────────────────────
export async function getMySuiteTransfer(): Promise<{
  pending: { id: string; fromSuite: string; toSuite: string; reason: string; createdAtIso: string } | null;
  history: Array<{ id: string; fromSuite: string; toSuite: string; status: string; decisionNote: string | null; createdAtIso: string; decidedAtIso: string | null }>;
}> {
  const session = await verifySession();
  if (!session.id) return { pending: null, history: [] };
  const rows = await prisma.suiteTransferRequest.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const pending = rows.find((r) => r.status === "Pending");
  return {
    pending: pending ? {
      id: pending.id,
      fromSuite: pending.fromSuite,
      toSuite: pending.toSuite,
      reason: pending.reason,
      createdAtIso: pending.createdAt.toISOString(),
    } : null,
    history: rows.filter((r) => r.status !== "Pending").slice(0, 5).map((r) => ({
      id: r.id,
      fromSuite: r.fromSuite,
      toSuite: r.toSuite,
      status: r.status,
      decisionNote: r.decisionNote,
      createdAtIso: r.createdAt.toISOString(),
      decidedAtIso: r.decidedAt?.toISOString() ?? null,
    })),
  };
}

// ─── Member: cancel ──────────────────────────────────────────────────────
export async function cancelMySuiteTransfer(id: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await verifySession();
  const r = await prisma.suiteTransferRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found" };
  if (r.userId !== session.id) return { error: "Not yours" };
  if (r.status !== "Pending") return { error: "Already decided" };
  await prisma.$transaction([
    prisma.suiteTransferRequest.update({
      where: { id },
      data: { status: "Cancelled", decidedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.id ?? "unknown",
        actorRole: session.role,
        action: "suite.transfer_cancelled",
        entityType: "SuiteTransferRequest",
        entityId: id,
        metadata: JSON.stringify({ fromSuite: r.fromSuite, toSuite: r.toSuite, by: "user" }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Admin: queue ────────────────────────────────────────────────────────
export type AdminTransferRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  fromSuite: string;
  toSuite: string;
  reason: string;
  status: string;
  decisionNote: string | null;
  decidedAtIso: string | null;
  decidedByName: string | null;
  createdAtIso: string;
  vacantNow: boolean;        // does the target suite still have no occupant?
};

export async function listAdminSuiteTransfers(input: {
  status?: "Pending" | "Approved" | "Denied" | "Cancelled" | "all";
} = {}): Promise<{ rows: AdminTransferRow[]; pendingCount: number }> {
  await verifyAdmin();
  const filter = input.status ?? "Pending";
  const rows = await prisma.suiteTransferRequest.findMany({
    where: filter === "all" ? {} : { status: filter },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const userIds = Array.from(new Set([
    ...rows.map((r) => r.userId),
    ...rows.map((r) => r.decidedById).filter((x): x is string => Boolean(x)),
  ]));
  const targetSuites = Array.from(new Set(rows.map((r) => r.toSuite)));
  const [users, currentOccupiers, pendingCount] = await Promise.all([
    userIds.length === 0 ? [] : prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }),
    targetSuites.length === 0 ? [] : prisma.user.findMany({
      where: { suiteNumber: { in: targetSuites } },
      select: { suiteNumber: true },
    }),
    prisma.suiteTransferRequest.count({ where: { status: "Pending" } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u] as const));
  const occupiedSet = new Set(currentOccupiers.map((u) => u.suiteNumber).filter((s): s is string => Boolean(s)));

  return {
    pendingCount,
    rows: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: userById.get(r.userId)?.name ?? "(unknown)",
      userEmail: userById.get(r.userId)?.email ?? "(unknown)",
      fromSuite: r.fromSuite,
      toSuite: r.toSuite,
      reason: r.reason,
      status: r.status,
      decisionNote: r.decisionNote,
      decidedAtIso: r.decidedAt?.toISOString() ?? null,
      decidedByName: r.decidedById ? (userById.get(r.decidedById)?.name ?? null) : null,
      createdAtIso: r.createdAt.toISOString(),
      vacantNow: !occupiedSet.has(r.toSuite),
    })),
  };
}

// ─── Admin: approve ──────────────────────────────────────────────────────
export async function adminApproveTransfer(input: { id: string; note?: string | null }): Promise<{ error?: string; ok?: boolean }> {
  const actor = await verifyAdmin();
  const r = await prisma.suiteTransferRequest.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, userId: true, fromSuite: true, toSuite: true },
  });
  if (!r) return { error: "Request not found" };
  if (r.status !== "Pending") return { error: `Already ${r.status.toLowerCase()}` };

  // Re-check vacancy at decision time — race-safe.
  const occupier = await prisma.user.findFirst({
    where: { suiteNumber: r.toSuite },
    select: { id: true },
  });
  if (occupier) return { error: `Suite #${r.toSuite} is no longer vacant` };

  // Atomic: swap suite + close request + audit.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: r.userId },
      data: { suiteNumber: r.toSuite },
    }),
    prisma.suiteTransferRequest.update({
      where: { id: r.id },
      data: {
        status: "Approved",
        decidedAt: new Date(),
        decidedById: actor.id,
        decisionNote: input.note?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id ?? "unknown",
        actorRole: actor.role,
        action: "suite.transfer_approved",
        entityType: "SuiteTransferRequest",
        entityId: r.id,
        metadata: JSON.stringify({
          targetUserId: r.userId,
          fromSuite: r.fromSuite,
          toSuite: r.toSuite,
          note: input.note ?? null,
        }),
      },
    }),
  ]);

  // Notify member.
  const u = await prisma.user.findUnique({
    where: { id: r.userId }, select: { name: true, email: true },
  });
  void (async () => {
    if (u?.email) {
      try {
        await sendEmail({
          to: u.email,
          subject: `Suite transfer approved · you're now in #${r.toSuite} — NOHO Mailbox`,
          kind: "suite_transfer_approved",
          userId: r.userId,
          html: emailDecided({
            firstName: (u.name ?? "there").split(" ")[0],
            decision: "Approved",
            fromSuite: r.fromSuite,
            toSuite: r.toSuite,
            note: input.note ?? null,
          }),
        });
      } catch (e) { console.error("[adminApproveTransfer] email failed:", e); }
    }
  })();

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Admin: deny ─────────────────────────────────────────────────────────
export async function adminDenyTransfer(input: { id: string; note?: string | null }): Promise<{ error?: string; ok?: boolean }> {
  const actor = await verifyAdmin();
  const r = await prisma.suiteTransferRequest.findUnique({ where: { id: input.id } });
  if (!r) return { error: "Request not found" };
  if (r.status !== "Pending") return { error: `Already ${r.status.toLowerCase()}` };

  await prisma.$transaction([
    prisma.suiteTransferRequest.update({
      where: { id: r.id },
      data: {
        status: "Denied",
        decidedAt: new Date(),
        decidedById: actor.id,
        decisionNote: input.note?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id ?? "unknown",
        actorRole: actor.role,
        action: "suite.transfer_denied",
        entityType: "SuiteTransferRequest",
        entityId: r.id,
        metadata: JSON.stringify({
          targetUserId: r.userId,
          fromSuite: r.fromSuite,
          toSuite: r.toSuite,
          note: input.note ?? null,
        }),
      },
    }),
  ]);

  const u = await prisma.user.findUnique({
    where: { id: r.userId }, select: { name: true, email: true },
  });
  void (async () => {
    if (u?.email) {
      try {
        await sendEmail({
          to: u.email,
          subject: `Suite transfer not approved — NOHO Mailbox`,
          kind: "suite_transfer_denied",
          userId: r.userId,
          html: emailDecided({
            firstName: (u.name ?? "there").split(" ")[0],
            decision: "Denied",
            fromSuite: r.fromSuite,
            toSuite: r.toSuite,
            note: input.note ?? null,
          }),
        });
      } catch (e) { console.error("[adminDenyTransfer] email failed:", e); }
    }
  })();

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Email templates ─────────────────────────────────────────────────────
function emailFiled(args: { firstName: string; fromSuite: string; toSuite: string; reason: string }): string {
  return wrap(`Suite transfer request received`, `
    <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, we got your request to move suites. Admin reviews within 1 business day.</p>
    <div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>From:</strong> #${args.fromSuite}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>To:</strong> #${args.toSuite}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#334155;"><strong>Your reason:</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#334155;line-height:1.5;font-style:italic;">${args.reason}</p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#334155;">If approved, your packages keep coming — only the suite # on your label changes. We'll re-key your mailbox at the counter when you stop in.</p>
    ${btn(`${BASE_URL}/dashboard?tab=settings`, "View status")}
  `);
}

function emailDecided(args: { firstName: string; decision: "Approved" | "Denied"; fromSuite: string; toSuite: string; note: string | null }): string {
  const ok = args.decision === "Approved";
  const banner = ok
    ? { bg: "#f0fdf4", border: "#16a34a", ink: "#15803d", title: `You're now in suite #${args.toSuite} ✓` }
    : { bg: "#fef2f2", border: "#dc2626", ink: "#991b1b", title: "Suite transfer not approved" };
  return wrap(banner.title, `
    <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, here's the outcome of your suite transfer request.</p>
    <div style="background:${banner.bg};border-left:3px solid ${banner.border};border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>From:</strong> #${args.fromSuite}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>To:</strong> #${args.toSuite}</p>
      ${args.note ? `<p style="margin:8px 0 0;font-size:13px;color:#334155;"><strong>Admin note:</strong></p><p style="margin:4px 0 0;font-size:13px;color:#334155;line-height:1.5;">${args.note}</p>` : ""}
    </div>
    ${ok
      ? `<p style="margin:0 0 16px;font-size:13px;color:#334155;">Update any addresses you've shared with senders. Stop by the counter to swap your mailbox key.</p>`
      : `<p style="margin:0 0 16px;font-size:13px;color:#334155;">Your current suite stays unchanged. Reply to this email if you'd like to discuss.</p>`}
    ${btn(`${BASE_URL}/dashboard?tab=settings`, "Open dashboard")}
  `);
}

function wrap(title: string, inner: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;letter-spacing:-0.5px;">${title}</h1>
          ${inner}
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm · (818) 506-7744</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function btn(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:8px;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:0.2px;">${text}</a>`;
}
