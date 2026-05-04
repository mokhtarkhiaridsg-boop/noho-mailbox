"use server";

// iter-111 — Recurring billing.
//
// Builds on existing iter-(billing.ts) pieces:
//   - User.planAutoRenew + planDueDate already exist
//   - runAutoRenewal(userId) already exists (admin-gated, charges wallet)
//   - sendMailboxRenewalReceipt already exists for receipts
//
// What this iter adds:
//   1. Member-side toggle (setMyAutoRenew) — customer self-enables auto-
//      renew from the dashboard
//   2. Cron-friendly system entrypoints (runAutoRenewSystemSweep +
//      runAutoRenewReminderSweep) — callable from /api/cron routes with
//      CRON_SECRET, no verifyAdmin so the daily cron runs unattended
//   3. 7-day-out reminder email so customers aren't surprised
//   4. Audit + webhook on each toggle

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic: 9500,
  Business: 17500,
  Premium: 27500,
};

// ─── Member: opt-in / opt-out ────────────────────────────────────────────
export async function setMyAutoRenew(enabled: boolean): Promise<{ error?: string; autoRenew?: boolean }> {
  const session = await verifySession();
  const userId = session.id!;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { planAutoRenew: true, walletBalanceCents: true, plan: true, planTerm: true, planDueDate: true, name: true, email: true, suiteNumber: true },
  });
  if (!u) return { error: "User not found" };
  if (u.planAutoRenew === enabled) return { autoRenew: enabled };

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { planAutoRenew: enabled } }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: enabled ? "billing.auto_renew_enabled" : "billing.auto_renew_disabled",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({
          plan: u.plan,
          planTerm: u.planTerm,
          planDueDate: u.planDueDate,
          walletBalanceCents: u.walletBalanceCents,
        }),
      },
    }),
  ]);

  // Fire-and-forget side effects.
  void (async () => {
    try {
      if (enabled && u.email) {
        await sendEmail({
          to: u.email,
          subject: "Auto-renew enabled — NOHO Mailbox",
          kind: "auto_renew_enabled",
          userId,
          html: emailEnabled({
            firstName: (u.name ?? "there").split(" ")[0],
            suiteNumber: u.suiteNumber ?? "—",
            plan: u.plan ?? "—",
            termMonths: parseInt(u.planTerm ?? "1") || 1,
            chargeCents: chargeAmountFor(u.plan, u.planTerm),
            nextChargeDate: u.planDueDate ?? "—",
          }),
        });
      }
    } catch (e) { console.error("[setMyAutoRenew] email failed:", e); }
  })();

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { autoRenew: enabled };
}

// ─── Member: read status ─────────────────────────────────────────────────
export async function getMyAutoRenewStatus(): Promise<{
  enabled: boolean;
  plan: string | null;
  termMonths: number;
  nextChargeDate: string | null;
  estimatedChargeCents: number;
  walletBalanceCents: number;
  canCoverFromWallet: boolean;
}> {
  const session = await verifySession();
  if (!session.id) {
    return { enabled: false, plan: null, termMonths: 0, nextChargeDate: null, estimatedChargeCents: 0, walletBalanceCents: 0, canCoverFromWallet: false };
  }
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { planAutoRenew: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
  });
  if (!u) {
    return { enabled: false, plan: null, termMonths: 0, nextChargeDate: null, estimatedChargeCents: 0, walletBalanceCents: 0, canCoverFromWallet: false };
  }
  const charge = chargeAmountFor(u.plan, u.planTerm);
  const term = parseInt(u.planTerm ?? "1") || 1;
  return {
    enabled: u.planAutoRenew,
    plan: u.plan,
    termMonths: term,
    nextChargeDate: u.planDueDate,
    estimatedChargeCents: charge,
    walletBalanceCents: u.walletBalanceCents,
    canCoverFromWallet: u.walletBalanceCents >= charge,
  };
}

// ─── System: cron sweep — charges anyone whose plan is due today ─────────
// No verifyAdmin gate — the cron route uses CRON_SECRET. Iterates serially
// to avoid a thundering herd of Square calls.
export async function runAutoRenewSystemSweep(): Promise<{
  candidates: number;
  succeeded: number;
  failed: number;
  failures: Array<{ userId: string; reason: string }>;
}> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const due = await prisma.user.findMany({
    where: {
      planAutoRenew: true,
      planDueDate: { not: null, lte: todayStr },
      status: { in: ["Active", "Expired"] },
    },
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
    orderBy: { planDueDate: "asc" },
    take: 200,
  });

  const failures: Array<{ userId: string; reason: string }> = [];
  let succeeded = 0;
  for (const u of due) {
    try {
      const r = await chargeOneAutoRenewal(u);
      if (r.ok) {
        succeeded += 1;
        void fireWebhooks("billing.auto_renewed", {
          text: `🔁 Auto-renewed *${u.name}* (suite #${u.suiteNumber ?? "—"}) · $${(r.chargedCents / 100).toFixed(2)} from wallet`,
          emoji: "🔁",
          detail: { userId: u.id, plan: u.plan, chargedCents: r.chargedCents, newDueDate: r.newDueDate },
        });
      } else {
        failures.push({ userId: u.id, reason: r.reason });
      }
    } catch (e) {
      failures.push({ userId: u.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { candidates: due.length, succeeded, failed: failures.length, failures };
}

// ─── System: cron sweep — sends 7-day-out reminder email ─────────────────
export async function runAutoRenewReminderSweep(): Promise<{
  candidates: number;
  emailed: number;
}> {
  const today = new Date();
  const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureStr = future.toISOString().slice(0, 10);
  // Hit users whose due date is exactly 7 days out.
  const due = await prisma.user.findMany({
    where: {
      planAutoRenew: true,
      planDueDate: futureStr,
      status: { in: ["Active", "Expired"] },
    },
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true, cardLast4: true, cardBrand: true },
    take: 200,
  });

  let emailed = 0;
  for (const u of due) {
    if (!u.email) continue;
    const charge = chargeAmountFor(u.plan, u.planTerm);
    try {
      await sendEmail({
        to: u.email,
        subject: `Auto-renew on ${u.planDueDate} — $${(charge / 100).toFixed(2)} — NOHO Mailbox`,
        kind: "auto_renew_reminder",
        userId: u.id,
        html: emailReminder({
          firstName: (u.name ?? "there").split(" ")[0],
          suiteNumber: u.suiteNumber ?? "—",
          plan: u.plan ?? "—",
          termMonths: parseInt(u.planTerm ?? "1") || 1,
          chargeCents: charge,
          dueDate: u.planDueDate ?? "",
          walletBalanceCents: u.walletBalanceCents,
          cardLast4: u.cardLast4,
          cardBrand: u.cardBrand,
        }),
      });
      emailed += 1;
    } catch (e) {
      console.error("[runAutoRenewReminderSweep] email failed:", e);
    }
  }
  return { candidates: due.length, emailed };
}

// ─── Internal: charge one customer's recurring renewal ───────────────────
// Wallet-first (mirrors existing runAutoRenewal logic), keeps the renewal
// row + audit + plan-due-date update atomic.
async function chargeOneAutoRenewal(u: {
  id: string;
  name: string;
  email: string;
  suiteNumber: string | null;
  plan: string | null;
  planTerm: string | null;
  planDueDate: string | null;
  walletBalanceCents: number;
}): Promise<{ ok: true; chargedCents: number; newDueDate: string } | { ok: false; reason: string }> {
  if (!u.plan) return { ok: false, reason: "no_plan" };
  if (!u.planDueDate) return { ok: false, reason: "no_due_date" };
  const charge = chargeAmountFor(u.plan, u.planTerm);
  if (u.walletBalanceCents < charge) {
    return { ok: false, reason: `wallet_insufficient_$${(charge / 100).toFixed(2)}` };
  }

  const term = parseInt(u.planTerm ?? "1") || 1;
  const newDue = new Date(u.planDueDate + "T00:00:00Z");
  newDue.setUTCMonth(newDue.getUTCMonth() + term);
  const newDueStr = newDue.toISOString().slice(0, 10);
  const newBal = u.walletBalanceCents - charge;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: u.id },
      data: { walletBalanceCents: newBal, planDueDate: newDueStr, status: "Active" },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: u.id,
        kind: "Charge",
        amountCents: -charge,
        description: `Auto-renew · ${u.plan} · ${term}mo`,
        balanceAfterCents: newBal,
      },
    }),
    prisma.mailboxRenewal.create({
      data: {
        userId: u.id,
        termMonths: term,
        planAtRenewal: u.plan,
        amountCents: charge,
        paymentMethod: "Wallet",
        paidAt: new Date(),
        prevPlanDueDate: u.planDueDate,
        newPlanDueDate: newDueStr,
        newPlanExpiresAt: newDue,
        notes: "Auto-renew (cron)",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: "system",
        actorRole: "SYSTEM",
        action: "billing.auto_renewed",
        entityType: "User",
        entityId: u.id,
        metadata: JSON.stringify({
          plan: u.plan,
          termMonths: term,
          chargeCents: charge,
          prevPlanDueDate: u.planDueDate,
          newPlanDueDate: newDueStr,
        }),
      },
    }),
  ]);

  // Best-effort receipt email (non-blocking).
  void (async () => {
    try {
      await sendEmail({
        to: u.email,
        subject: `Renewed · ${u.plan} · ${term}mo — NOHO Mailbox`,
        kind: "auto_renew_receipt",
        userId: u.id,
        html: emailReceipt({
          firstName: (u.name ?? "there").split(" ")[0],
          suiteNumber: u.suiteNumber ?? "—",
          plan: u.plan ?? "—",
          termMonths: term,
          chargeCents: charge,
          newDueDate: newDueStr,
          walletBalanceAfterCents: newBal,
        }),
      });
    } catch (e) { console.error("[chargeOneAutoRenewal] receipt failed:", e); }
  })();

  return { ok: true, chargedCents: charge, newDueDate: newDueStr };
}

function chargeAmountFor(plan: string | null, term: string | null): number {
  if (!plan) return 0;
  const monthly = PLAN_MONTHLY_CENTS[plan] ?? PLAN_MONTHLY_CENTS.Basic;
  const months = parseInt(term ?? "1") || 1;
  return monthly * months;
}

// ─── Email templates ─────────────────────────────────────────────────────
function emailEnabled(args: {
  firstName: string;
  suiteNumber: string;
  plan: string;
  termMonths: number;
  chargeCents: number;
  nextChargeDate: string;
}) {
  return wrap(`Auto-renew is on ✓`, `
    <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, your NOHO Mailbox plan is set to renew automatically — no action needed when the bill is due.</p>
    <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Plan:</strong> ${args.plan} · ${args.termMonths}mo term</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Next charge:</strong> ${args.nextChargeDate}</p>
      <p style="margin:0;font-size:13px;color:#334155;"><strong>Estimated:</strong> $${(args.chargeCents / 100).toFixed(2)} from your NOHO wallet</p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">We'll email you 7 days before the charge as a heads-up. Turn off any time from the Settings tab.</p>
    ${btn(`${BASE_URL}/dashboard?tab=settings`, "Manage")}
  `);
}

function emailReminder(args: {
  firstName: string;
  suiteNumber: string;
  plan: string;
  termMonths: number;
  chargeCents: number;
  dueDate: string;
  walletBalanceCents: number;
  cardLast4: string | null;
  cardBrand: string | null;
}) {
  const canCover = args.walletBalanceCents >= args.chargeCents;
  return wrap(`Heads up: auto-renew on ${args.dueDate}`, `
    <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, your NOHO Mailbox plan auto-renews in 7 days.</p>
    <div style="background:#eff6ff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:14px;color:#0e2240;"><strong>${args.dueDate}:</strong> charge $${(args.chargeCents / 100).toFixed(2)}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Plan:</strong> ${args.plan} · ${args.termMonths}mo term · suite #${args.suiteNumber}</p>
      <p style="margin:0;font-size:13px;color:${canCover ? "#15803d" : "#92400e"};"><strong>Wallet:</strong> $${(args.walletBalanceCents / 100).toFixed(2)} ${canCover ? "✓ covers it" : "⚠️ needs top-up"}</p>
      ${args.cardLast4 ? `<p style="margin:6px 0 0;font-size:13px;color:#334155;"><strong>Card on file:</strong> ${args.cardBrand ?? "Card"} •••• ${args.cardLast4}</p>` : ""}
    </div>
    ${canCover
      ? `<p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">Sit tight — we'll handle it on the day. You'll get a receipt email after.</p>`
      : `<p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;"><strong>Action needed:</strong> top up your wallet (or pause auto-renew) before ${args.dueDate} so the charge succeeds.</p>`
    }
    ${btn(`${BASE_URL}/dashboard?tab=wallet`, canCover ? "View wallet" : "Top up wallet")}
  `);
}

function emailReceipt(args: {
  firstName: string;
  suiteNumber: string;
  plan: string;
  termMonths: number;
  chargeCents: number;
  newDueDate: string;
  walletBalanceAfterCents: number;
}) {
  return wrap(`Renewed ✓ · $${(args.chargeCents / 100).toFixed(2)}`, `
    <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, your NOHO Mailbox plan has been auto-renewed.</p>
    <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:14px;color:#0e2240;"><strong>Charged:</strong> $${(args.chargeCents / 100).toFixed(2)}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Plan:</strong> ${args.plan} · ${args.termMonths}mo · suite #${args.suiteNumber}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Next due:</strong> ${args.newDueDate}</p>
      <p style="margin:0;font-size:13px;color:#334155;"><strong>Wallet balance:</strong> $${(args.walletBalanceAfterCents / 100).toFixed(2)}</p>
    </div>
    ${btn(`${BASE_URL}/dashboard?tab=invoices`, "View invoices")}
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
