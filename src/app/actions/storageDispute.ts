"use server";

// iter-105 — Storage-fee dispute workflow.
//
// Customer files a dispute against a storage fee that was applied at
// pickup time (iter-87 set MailItem.feeChargedCents). Admin reviews the
// queue, then either WAIVES (refunds wallet + audit) or UPHOLDS (no
// money moves, audit only). Both sides get email notifications.
//
// Reuses iter-95/100/101 audit/email/webhook patterns.

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
const DAYS_TO_DISPUTE = 30;

// Types live in `@/lib/storage-dispute-types` because "use server" files
// in Next.js 16 can ONLY export async functions. Local re-import keeps
// the type names available inside this module's function signatures
// without re-exporting them from the server-action boundary.
import type { MyDisputeRow, AdminDisputeRow } from "@/lib/storage-dispute-types";

// ─── Member: file a dispute ──────────────────────────────────────────────
export async function fileMyStorageDispute(input: {
  mailItemId: string;
  reason: string;
}): Promise<{ error?: string; disputeId?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const reason = input.reason.trim();
  if (reason.length < 10) return { error: "Tell us at least a sentence about why you're disputing." };
  if (reason.length > 2000) return { error: "Keep the reason under 2000 characters." };

  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: {
      id: true, userId: true, feeChargedCents: true, status: true,
      trackingNumber: true, carrier: true, createdAt: true, date: true,
      user: { select: { name: true, email: true, suiteNumber: true } },
    },
  });
  if (!item) return { error: "Package not found" };
  if (item.userId !== userId) return { error: "Not your package" };
  if (item.feeChargedCents == null || item.feeChargedCents <= 0) {
    return { error: "No storage fee was charged on this package — nothing to dispute." };
  }
  // Window: 30 days from item.createdAt.
  const ageMs = Date.now() - item.createdAt.getTime();
  if (ageMs > DAYS_TO_DISPUTE * 24 * 60 * 60 * 1000) {
    return { error: `Dispute window has closed (must file within ${DAYS_TO_DISPUTE} days of intake).` };
  }
  // No duplicate Open disputes for the same item.
  const open = await prisma.storageFeeDispute.findFirst({
    where: { mailItemId: input.mailItemId, status: "Open" },
    select: { id: true },
  });
  if (open) return { error: "You've already filed a dispute on this package — admin is reviewing." };

  const created = await prisma.$transaction(async (tx) => {
    const d = await tx.storageFeeDispute.create({
      data: {
        mailItemId: input.mailItemId,
        filedById: userId,
        feeCents: item.feeChargedCents!,
        reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "storage.dispute_filed",
        entityType: "StorageFeeDispute",
        entityId: d.id,
        metadata: JSON.stringify({
          mailItemId: input.mailItemId,
          feeCents: item.feeChargedCents,
          tracking: item.trackingNumber ?? null,
        }),
      },
    });
    return d;
  });

  // Best-effort: confirmation email to member + alert to admins via webhook bridge.
  void (async () => {
    try {
      await sendEmail({
        to: item.user.email,
        subject: `Dispute received · we're reviewing the $${(item.feeChargedCents! / 100).toFixed(2)} storage fee — NOHO Mailbox`,
        kind: "storage_dispute_filed",
        userId,
        html: emailFiled({
          firstName: (item.user.name ?? "there").split(" ")[0],
          suiteNumber: item.user.suiteNumber ?? "—",
          feeCents: item.feeChargedCents!,
          reason,
          tracking: item.trackingNumber ?? "(no tracking)",
        }),
      });
    } catch (e) { console.error("[fileMyStorageDispute] email failed:", e); }
    try {
      await fireWebhooks("storage.dispute_filed", {
        text: `*${item.user.name ?? "(unknown)"}* (suite #${item.user.suiteNumber ?? "—"}) disputed a $${(item.feeChargedCents! / 100).toFixed(2)} storage fee · "${reason.slice(0, 80)}${reason.length > 80 ? "…" : ""}"`,
        emoji: "⚖️",
        url: `${BASE_URL}/admin?tab=disputes`,
        detail: { mailItemId: input.mailItemId, feeCents: item.feeChargedCents, suiteNumber: item.user.suiteNumber },
      });
    } catch (e) { console.error("[fileMyStorageDispute] webhook failed:", e); }
  })();

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { disputeId: created.id };
}

// ─── Member: list mine + map to MailItem ─────────────────────────────────
export async function getMyStorageDisputes(): Promise<Record<string, MyDisputeRow>> {
  const session = await verifySession();
  if (!session.id) return {};
  const rows = await prisma.storageFeeDispute.findMany({
    where: { filedById: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const out: Record<string, MyDisputeRow> = {};
  for (const r of rows) {
    out[r.mailItemId] = {
      id: r.id,
      mailItemId: r.mailItemId,
      status: r.status as MyDisputeRow["status"],
      feeCents: r.feeCents,
      refundCents: r.refundCents,
      reason: r.reason,
      resolution: r.resolution,
      createdAtIso: r.createdAt.toISOString(),
      resolvedAtIso: r.resolvedAt?.toISOString() ?? null,
    };
  }
  return out;
}

// ─── Admin: queue ────────────────────────────────────────────────────────
export async function listAdminStorageDisputes(input: {
  status?: "Open" | "Waived" | "Upheld" | "all";
} = {}): Promise<{ rows: AdminDisputeRow[]; openCount: number; waivedRefundedCents: number }> {
  await verifyAdmin();
  const filter = input.status ?? "Open";
  const rows = await prisma.storageFeeDispute.findMany({
    where: filter === "all" ? {} : { status: filter },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const itemIds = Array.from(new Set(rows.map((r) => r.mailItemId)));
  const userIds = Array.from(new Set([
    ...rows.map((r) => r.filedById),
    ...rows.map((r) => r.resolvedById).filter((x): x is string => Boolean(x)),
  ]));
  const [items, users] = await Promise.all([
    itemIds.length === 0 ? [] : prisma.mailItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, trackingNumber: true, carrier: true, date: true, status: true },
    }),
    userIds.length === 0 ? [] : prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, suiteNumber: true },
    }),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i] as const));
  const userById = new Map(users.map((u) => [u.id, u] as const));

  const [openCount, waivedAgg] = await Promise.all([
    prisma.storageFeeDispute.count({ where: { status: "Open" } }),
    prisma.storageFeeDispute.aggregate({
      where: { status: "Waived" },
      _sum: { refundCents: true },
    }),
  ]);

  return {
    openCount,
    waivedRefundedCents: waivedAgg._sum.refundCents ?? 0,
    rows: rows.map((r) => {
      const item = itemById.get(r.mailItemId);
      const filer = userById.get(r.filedById);
      const resolver = r.resolvedById ? userById.get(r.resolvedById) : undefined;
      return {
        id: r.id,
        mailItemId: r.mailItemId,
        status: r.status as AdminDisputeRow["status"],
        feeCents: r.feeCents,
        refundCents: r.refundCents,
        reason: r.reason,
        resolution: r.resolution,
        createdAtIso: r.createdAt.toISOString(),
        resolvedAtIso: r.resolvedAt?.toISOString() ?? null,
        filedByName: filer?.name ?? "(unknown)",
        filedByEmail: filer?.email ?? "(unknown)",
        suiteNumber: filer?.suiteNumber ?? null,
        itemSummary: item ? `${item.carrier ?? "Pkg"} ${item.trackingNumber ?? ""} · intake ${item.date}` : "(item missing)",
        resolvedByName: resolver?.name ?? null,
      };
    }),
  };
}

// ─── Admin: resolve ──────────────────────────────────────────────────────
export async function adminResolveStorageDispute(input: {
  id: string;
  decision: "Waived" | "Upheld";
  note?: string | null;
  // Default refund = full feeCents when Waived. Admin can override (e.g.
  // partial refund).
  refundCentsOverride?: number | null;
}): Promise<{ error?: string; success?: boolean; refundedCents?: number }> {
  const actor = await verifyAdmin();
  const dispute = await prisma.storageFeeDispute.findUnique({
    where: { id: input.id },
    select: {
      id: true, status: true, feeCents: true, mailItemId: true, filedById: true,
      filedBy: { select: { name: true, email: true, suiteNumber: true, walletBalanceCents: true } },
    },
  });
  if (!dispute) return { error: "Dispute not found" };
  if (dispute.status !== "Open") return { error: `Dispute already resolved (${dispute.status.toLowerCase()})` };

  const note = input.note?.trim() || null;
  let refundCents: number | null = null;

  if (input.decision === "Waived") {
    refundCents = Math.max(0, Math.min(
      dispute.feeCents,
      input.refundCentsOverride != null ? input.refundCentsOverride : dispute.feeCents,
    ));

    await prisma.$transaction(async (tx) => {
      // Credit wallet (raise balance).
      const updated = await tx.user.update({
        where: { id: dispute.filedById },
        data: { walletBalanceCents: { increment: refundCents! } },
        select: { walletBalanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId: dispute.filedById,
          kind: "Refund",
          amountCents: refundCents!,
          description: `Storage fee waived (dispute #${dispute.id.slice(0, 6)})`,
          balanceAfterCents: updated.walletBalanceCents,
        },
      });
      await tx.storageFeeDispute.update({
        where: { id: dispute.id },
        data: {
          status: "Waived",
          resolvedAt: new Date(),
          resolvedById: actor.id,
          resolution: note,
          refundCents,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "storage.dispute_waived",
          entityType: "StorageFeeDispute",
          entityId: dispute.id,
          metadata: JSON.stringify({
            mailItemId: dispute.mailItemId,
            feeCents: dispute.feeCents,
            refundCents,
            note,
          }),
        },
      });
    });
  } else {
    // Upheld — no money moves, just close the dispute.
    await prisma.$transaction([
      prisma.storageFeeDispute.update({
        where: { id: dispute.id },
        data: {
          status: "Upheld",
          resolvedAt: new Date(),
          resolvedById: actor.id,
          resolution: note,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "storage.dispute_upheld",
          entityType: "StorageFeeDispute",
          entityId: dispute.id,
          metadata: JSON.stringify({
            mailItemId: dispute.mailItemId,
            feeCents: dispute.feeCents,
            note,
          }),
        },
      }),
    ]);
  }

  // Notify member of decision.
  void (async () => {
    try {
      await sendEmail({
        to: dispute.filedBy.email,
        subject: input.decision === "Waived"
          ? `Storage fee waived · $${((refundCents ?? 0) / 100).toFixed(2)} credited to your wallet — NOHO Mailbox`
          : `Storage fee upheld · we reviewed your dispute — NOHO Mailbox`,
        kind: input.decision === "Waived" ? "storage_dispute_waived" : "storage_dispute_upheld",
        userId: dispute.filedById,
        html: emailResolved({
          firstName: (dispute.filedBy.name ?? "there").split(" ")[0],
          suiteNumber: dispute.filedBy.suiteNumber ?? "—",
          feeCents: dispute.feeCents,
          decision: input.decision,
          refundCents: refundCents ?? 0,
          adminNote: note,
        }),
      });
    } catch (e) { console.error("[adminResolveStorageDispute] email failed:", e); }
  })();

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, refundedCents: refundCents ?? 0 };
}

// ─── Email templates ─────────────────────────────────────────────────────
function emailFiled(args: {
  firstName: string;
  suiteNumber: string;
  feeCents: number;
  reason: string;
  tracking: string;
}) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;">We received your dispute ✓</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, thanks for letting us know. An admin will review and respond within 2 business days.</p>
          <div style="background:#fef9c3;border-left:3px solid #f59e0b;border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Tracking:</strong> ${args.tracking}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Fee in dispute:</strong> $${(args.feeCents / 100).toFixed(2)}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#334155;"><strong>Your note:</strong></p>
            <p style="margin:4px 0 0;font-size:13px;color:#334155;line-height:1.5;font-style:italic;">${args.reason.slice(0, 600)}</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#334155;font-weight:700;">What happens next</p>
          <ul style="margin:0 0 16px;padding-left:18px;font-size:13px;color:#334155;line-height:1.55;">
            <li>We review the shelf history + intake-to-pickup interval.</li>
            <li>If we agree the fee was applied in error, we waive it and credit your wallet.</li>
            <li>If we uphold the fee, we'll reply with the reasoning so you can take it from there.</li>
          </ul>
          <a href="${BASE_URL}/dashboard?tab=packages" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">View packages</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function emailResolved(args: {
  firstName: string;
  suiteNumber: string;
  feeCents: number;
  decision: "Waived" | "Upheld";
  refundCents: number;
  adminNote: string | null;
}) {
  const waived = args.decision === "Waived";
  const banner = waived
    ? { bg: "#f0fdf4", border: "#16a34a", ink: "#15803d", title: "Dispute resolved — fee waived ✓" }
    : { bg: "#fef2f2", border: "#dc2626", ink: "#991b1b", title: "Dispute resolved — fee upheld" };
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${banner.ink};">${banner.title}</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, here's the outcome of your storage-fee dispute.</p>
          <div style="background:${banner.bg};border-left:3px solid ${banner.border};border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Original fee:</strong> $${(args.feeCents / 100).toFixed(2)}</p>
            ${waived ? `<p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Refunded:</strong> $${(args.refundCents / 100).toFixed(2)} credited to your wallet</p>` : ""}
            ${args.adminNote ? `<p style="margin:8px 0 0;font-size:13px;color:#334155;"><strong>Admin note:</strong></p><p style="margin:4px 0 0;font-size:13px;color:#334155;line-height:1.5;">${args.adminNote}</p>` : ""}
          </div>
          ${waived
            ? `<p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">The credit is already on your account — apply it to a future intake or shipping label any time.</p>`
            : `<p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">If you have new information you'd like us to consider, reply to this email and we'll re-open the case.</p>`
          }
          <a href="${BASE_URL}/dashboard?tab=wallet" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">${waived ? "View wallet" : "Reply to admin"}</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
