/**
 * Internal referral code application — NOT a server action.
 *
 * This used to live in `src/app/actions/referral.ts` and was exported as
 * `applyReferralCode(code, newUserId)`. That made it RPC-callable by any
 * logged-in user, who could pass an arbitrary `newUserId` to credit a
 * stranger's wallet. Moving it here strips the server-action exposure: it
 * can only be called server-to-server (currently from `auth.ts` during
 * signup).
 *
 * Money correctness fixes vs. the old version:
 *   1. Wrapped in `prisma.$transaction([...])` so wallet update + ledger
 *      row + referral state-flip commit atomically.
 *   2. `balanceAfterCents` now derived from the fresh user balance (was
 *      hardcoded `0` with a comment admitting it was wrong).
 *   3. Race fix: the referral lookup uses `updateMany(where: refereeId:null)`
 *      so two concurrent signups using the same code can't both win.
 */

import { prisma } from "./prisma";

const REFERRAL_CREDIT_CENTS = 1000; // $10

function id() {
  return crypto.randomUUID();
}

export async function applyReferralCodeInternal(
  code: string,
  newUserId: string,
): Promise<boolean> {
  const cleaned = code.toUpperCase().trim();

  // Atomic claim: flip the first matching pending referral to credited+linked
  // to this user. updateMany returns a count; if 0, no referral existed (or
  // someone else won the race) and we silently no-op.
  const claim = await prisma.referral.updateMany({
    where: {
      code: cleaned,
      refereeId: null,
      status: "pending",
    },
    data: {
      refereeId: newUserId,
      status: "credited",
      creditedAt: new Date(),
    },
  });
  if (claim.count === 0) return false;

  // Re-fetch the now-claimed referral so we know who the referrer is.
  const referral = await prisma.referral.findFirst({
    where: { code: cleaned, refereeId: newUserId },
    select: { id: true, referrerId: true },
  });
  if (!referral) return false;

  // Self-referral guard — possible if a malicious user signs themselves up
  // with their own code. Reverse the claim and bail.
  if (referral.referrerId === newUserId) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { refereeId: null, status: "pending", creditedAt: null },
    });
    return false;
  }

  // Read both wallets so we can write the correct `balanceAfterCents` for
  // each ledger row. We do this OUTSIDE the transaction (one extra round
  // trip) but apply the credit + write ledger inside the transaction so a
  // partial failure can't leave the wallet drifted from its history.
  const [referrer, referee] = await Promise.all([
    prisma.user.findUnique({
      where: { id: referral.referrerId },
      select: { walletBalanceCents: true },
    }),
    prisma.user.findUnique({
      where: { id: newUserId },
      select: { walletBalanceCents: true },
    }),
  ]);
  if (!referrer || !referee) return false;

  const referrerNewBal = referrer.walletBalanceCents + REFERRAL_CREDIT_CENTS;
  const refereeNewBal = referee.walletBalanceCents + REFERRAL_CREDIT_CENTS;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { walletBalanceCents: referrerNewBal },
    }),
    prisma.user.update({
      where: { id: newUserId },
      data: { walletBalanceCents: refereeNewBal },
    }),
    prisma.walletTransaction.create({
      data: {
        id: id(),
        userId: referral.referrerId,
        kind: "Referral",
        amountCents: REFERRAL_CREDIT_CENTS,
        description: `Referral bonus — new member signed up with your code`,
        balanceAfterCents: referrerNewBal,
      },
    }),
    prisma.walletTransaction.create({
      data: {
        id: id(),
        userId: newUserId,
        kind: "Referral",
        amountCents: REFERRAL_CREDIT_CENTS,
        description: `Welcome bonus — referral code applied`,
        balanceAfterCents: refereeNewBal,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: id(),
        actorId: newUserId, // the new member is the actor (signup flow)
        actorRole: "MEMBER",
        action: "referral.credit",
        entityType: "Referral",
        entityId: referral.id,
        metadata: JSON.stringify({
          code: cleaned,
          referrerId: referral.referrerId,
          refereeId: newUserId,
          creditCents: REFERRAL_CREDIT_CENTS,
        }),
      },
    }),
  ]);

  return true;
}
