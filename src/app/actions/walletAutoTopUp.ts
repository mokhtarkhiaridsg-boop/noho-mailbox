"use server";

// iter-112 — Wallet auto-top-up.
//
// Member sets a threshold + auto top-up amount. When wallet falls below
// the threshold, the daily cron creates a CreditRequest (existing iter-?
// flow) for the top-up amount and emails the member + alerts admin via
// webhook. Admin then handles the Square payment link the same way they
// do any other credit request — the auto-top-up just removes the "I
// have to remember to ask for credits" friction.
//
// Reuses iter-95 audit + iter-103 webhook + iter-111 email layout.

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

const MIN_THRESHOLD_CENTS = 500;       // $5
const MAX_THRESHOLD_CENTS = 10000;     // $100 — above this, auto-top-up's a bad fit
const MIN_AMOUNT_CENTS = 2500;         // $25
const MAX_AMOUNT_CENTS = 25000;        // $250
const RE_FIRE_COOLDOWN_HRS = 24;       // don't spam — at most one auto top-up per day per user

// ─── Member: read settings ───────────────────────────────────────────────
export type WalletAutoTopUpStatus = {
  enabled: boolean;
  thresholdCents: number | null;
  amountCents: number | null;
  walletBalanceCents: number;
  lastFiredAtIso: string | null;
};

export async function getMyWalletAutoTopUp(): Promise<WalletAutoTopUpStatus> {
  const session = await verifySession();
  if (!session.id) return { enabled: false, thresholdCents: null, amountCents: null, walletBalanceCents: 0, lastFiredAtIso: null };
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      walletTopUpThresholdCents: true,
      walletTopUpAmountCents: true,
      walletTopUpLastFiredAt: true,
      walletBalanceCents: true,
    },
  });
  if (!u) return { enabled: false, thresholdCents: null, amountCents: null, walletBalanceCents: 0, lastFiredAtIso: null };
  const enabled = u.walletTopUpThresholdCents != null && u.walletTopUpAmountCents != null;
  return {
    enabled,
    thresholdCents: u.walletTopUpThresholdCents,
    amountCents: u.walletTopUpAmountCents,
    walletBalanceCents: u.walletBalanceCents,
    lastFiredAtIso: u.walletTopUpLastFiredAt?.toISOString() ?? null,
  };
}

// ─── Member: write settings ──────────────────────────────────────────────
export async function setMyWalletAutoTopUp(input:
  | { enabled: true; thresholdCents: number; amountCents: number }
  | { enabled: false }
): Promise<{ error?: string; ok?: boolean }> {
  const session = await verifySession();
  const userId = session.id!;

  if (!input.enabled) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletTopUpThresholdCents: null, walletTopUpAmountCents: null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: userId,
          actorRole: session.role,
          action: "wallet.auto_top_up_disabled",
          entityType: "User",
          entityId: userId,
          metadata: JSON.stringify({}),
        },
      }),
    ]);
    revalidatePath("/dashboard");
    return { ok: true };
  }

  const t = Math.round(input.thresholdCents);
  const a = Math.round(input.amountCents);
  if (!Number.isFinite(t) || t < MIN_THRESHOLD_CENTS || t > MAX_THRESHOLD_CENTS) {
    return { error: `Threshold must be between $${(MIN_THRESHOLD_CENTS / 100).toFixed(0)} and $${(MAX_THRESHOLD_CENTS / 100).toFixed(0)}` };
  }
  if (!Number.isFinite(a) || a < MIN_AMOUNT_CENTS || a > MAX_AMOUNT_CENTS) {
    return { error: `Top-up amount must be between $${(MIN_AMOUNT_CENTS / 100).toFixed(0)} and $${(MAX_AMOUNT_CENTS / 100).toFixed(0)}` };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletTopUpThresholdCents: t, walletTopUpAmountCents: a },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "wallet.auto_top_up_enabled",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({ thresholdCents: t, amountCents: a }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── System: cron sweep ──────────────────────────────────────────────────
// Pull every user with auto-top-up configured + wallet < threshold +
// hasn't fired in last 24h. For each: create a CreditRequest (idempotent
// against existing Pending/LinkSent), email the customer, ping admin webhook.
export async function runWalletAutoTopUpSweep(): Promise<{
  scanned: number;
  triggered: number;
  skipped: { alreadyPending: number; recentlyFired: number };
}> {
  const candidates = await prisma.user.findMany({
    where: {
      walletTopUpThresholdCents: { not: null },
      walletTopUpAmountCents: { not: null },
    },
    select: {
      id: true, name: true, email: true, suiteNumber: true,
      walletBalanceCents: true, walletTopUpThresholdCents: true,
      walletTopUpAmountCents: true, walletTopUpLastFiredAt: true,
    },
  });

  const now = Date.now();
  const cooldownMs = RE_FIRE_COOLDOWN_HRS * 60 * 60 * 1000;
  let triggered = 0;
  const skipped = { alreadyPending: 0, recentlyFired: 0 };

  for (const u of candidates) {
    const threshold = u.walletTopUpThresholdCents!;
    const amount = u.walletTopUpAmountCents!;
    if (u.walletBalanceCents >= threshold) continue;
    if (u.walletTopUpLastFiredAt && now - u.walletTopUpLastFiredAt.getTime() < cooldownMs) {
      skipped.recentlyFired += 1;
      continue;
    }

    // Don't double-create if member already has a Pending or LinkSent
    // request — that one will fulfill the same need.
    const existing = await prisma.creditRequest.findFirst({
      where: { userId: u.id, status: { in: ["Pending", "LinkSent"] } },
    });
    if (existing) {
      skipped.alreadyPending += 1;
      continue;
    }

    await prisma.$transaction([
      // Create the CreditRequest the same way requestCredits() does.
      prisma.creditRequest.create({
        data: {
          id: crypto.randomUUID(),
          userId: u.id,
          amountCents: amount,
          status: "Pending",
          notes: `Auto top-up · wallet $${(u.walletBalanceCents / 100).toFixed(2)} fell below $${(threshold / 100).toFixed(2)}`,
        },
      }),
      prisma.user.update({
        where: { id: u.id },
        data: { walletTopUpLastFiredAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: "system",
          actorRole: "SYSTEM",
          action: "wallet.auto_top_up_fired",
          entityType: "User",
          entityId: u.id,
          metadata: JSON.stringify({
            thresholdCents: threshold,
            amountCents: amount,
            walletBalanceCents: u.walletBalanceCents,
          }),
        },
      }),
    ]);

    // Best-effort: email customer + ping admin Slack.
    void (async () => {
      if (u.email) {
        try {
          await sendEmail({
            to: u.email,
            subject: `Auto top-up · $${(amount / 100).toFixed(2)} request created — NOHO Mailbox`,
            kind: "wallet_auto_top_up_fired",
            userId: u.id,
            html: emailFired({
              firstName: (u.name ?? "there").split(" ")[0],
              suiteNumber: u.suiteNumber ?? "—",
              walletBalanceCents: u.walletBalanceCents,
              thresholdCents: threshold,
              amountCents: amount,
            }),
          });
        } catch (e) { console.error("[runWalletAutoTopUpSweep] email failed:", e); }
      }
      try {
        await fireWebhooks("wallet.auto_top_up_fired", {
          text: `💳 Auto top-up triggered for *${u.name ?? "(unknown)"}* (suite #${u.suiteNumber ?? "—"}) · wallet $${(u.walletBalanceCents / 100).toFixed(2)} → request $${(amount / 100).toFixed(2)}`,
          emoji: "💳",
          url: `${BASE_URL}/admin?tab=credits`,
          detail: { userId: u.id, walletBalanceCents: u.walletBalanceCents, requestedCents: amount, threshold },
        });
      } catch (e) { console.error("[runWalletAutoTopUpSweep] webhook failed:", e); }
    })();

    triggered += 1;
  }

  return { scanned: candidates.length, triggered, skipped };
}

// ─── Email ────────────────────────────────────────────────────────────────
function emailFired(args: {
  firstName: string;
  suiteNumber: string;
  walletBalanceCents: number;
  thresholdCents: number;
  amountCents: number;
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
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;">Auto top-up triggered ✓</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, your NOHO wallet just dropped below your auto top-up threshold so we created a $${(args.amountCents / 100).toFixed(2)} top-up request for you.</p>
          <div style="background:#eff6ff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Current wallet:</strong> $${(args.walletBalanceCents / 100).toFixed(2)}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Threshold:</strong> $${(args.thresholdCents / 100).toFixed(2)}</p>
            <p style="margin:0;font-size:13px;color:#334155;"><strong>Top-up:</strong> $${(args.amountCents / 100).toFixed(2)}</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#334155;font-weight:700;">What happens next</p>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">An admin will text/email you a Square payment link within one business day. Once you pay, the wallet credit happens automatically and your auto-renew + storage fees keep running smoothly.</p>
          <a href="${BASE_URL}/dashboard?tab=wallet" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">Open wallet</a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Want to change the threshold or pause auto top-up? Settings → Wallet auto top-up.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
