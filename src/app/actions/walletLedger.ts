"use server";

/**
 * iter-133 — Wallet ledger (Tier 8 #46).
 *
 * Returns the full transaction history for the signed-in member with a
 * computed running balance from the FIRST transaction forward, plus
 * per-period summary tiles. Backs the printable wallet-statement page at
 * /dashboard/wallet/ledger.
 *
 * Re-uses patterns shipped earlier in the loop:
 *   - verifySession() gating from src/lib/dal
 *   - prisma direct read (no transaction needed — read-only)
 *   - audit logging via inline helper, fire-and-forget so the page render
 *     never blocks on the log write
 *   - Sort DESC for display, but balanceAfterCents is already persisted
 *     by every WalletTransaction write so we don't need to recompute
 *     server-side. We just expose it.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type WalletLedgerEntry = {
  id: string;
  kind: string;             // "TopUp" | "Charge" | "DepositCharge" | "DepositRefund" | "Refund"
  description: string;
  amountCents: number;      // signed
  balanceAfterCents: number;
  invoiceId: string | null;
  createdAt: string;        // ISO
};

export type WalletLedgerSummary = {
  openingBalanceCents: number;     // balance just before the earliest entry shown
  closingBalanceCents: number;     // current wallet balance
  totalCreditedCents: number;      // sum of positive amounts in window
  totalDebitedCents: number;       // sum of |negative| amounts in window
  netChangeCents: number;          // credits - debits
  entryCount: number;
  earliestAt: string | null;       // ISO
  latestAt: string | null;         // ISO
};

export type WalletLedger = {
  user: {
    id: string;
    name: string;
    email: string;
    suiteNumber: string | null;
    plan: string | null;
    walletBalanceCents: number;
    securityDepositCents: number;
    mailboxAssignedAt: string | null;
  };
  entries: WalletLedgerEntry[];     // sorted DESC by createdAt
  summary: WalletLedgerSummary;
  generatedAt: string;              // ISO
  range: { fromIso: string | null; toIso: string | null };
};

export async function getWalletLedger(opts?: {
  fromIso?: string;
  toIso?: string;
}): Promise<WalletLedger> {
  const session = await verifySession();
  const userId = session.id!;

  const fromIso = opts?.fromIso ?? null;
  const toIso = opts?.toIso ?? null;

  const fromDate = fromIso ? new Date(fromIso) : null;
  const toDate = toIso ? new Date(toIso) : null;

  // Member info — kept minimal, enough to render the hero block.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      plan: true,
      walletBalanceCents: true,
      securityDepositCents: true,
      mailboxAssignedAt: true,
    },
  });
  if (!user) throw new Error("User not found");

  // Transactions in the requested window (or all time).
  const where: Record<string, unknown> = { userId };
  if (fromDate || toDate) {
    const dateClause: Record<string, Date> = {};
    if (fromDate) dateClause.gte = fromDate;
    if (toDate) dateClause.lte = toDate;
    where.createdAt = dateClause;
  }

  const txns = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      amountCents: true,
      description: true,
      balanceAfterCents: true,
      invoiceId: true,
      createdAt: true,
    },
  });

  const entries: WalletLedgerEntry[] = txns.map((t) => ({
    id: t.id,
    kind: t.kind,
    description: t.description,
    amountCents: t.amountCents,
    balanceAfterCents: t.balanceAfterCents,
    invoiceId: t.invoiceId,
    createdAt: t.createdAt.toISOString(),
  }));

  // Summary computation — credits/debits over the window.
  let totalCreditedCents = 0;
  let totalDebitedCents = 0;
  for (const e of entries) {
    if (e.amountCents >= 0) totalCreditedCents += e.amountCents;
    else totalDebitedCents += Math.abs(e.amountCents);
  }

  // Opening balance = balanceAfterCents of the earliest entry in the
  // window MINUS its own delta. (entries is DESC, so earliest = last.)
  // If no entries in window, opening == closing == current balance.
  let openingBalanceCents = user.walletBalanceCents;
  if (entries.length > 0) {
    const earliest = entries[entries.length - 1]!;
    openingBalanceCents = earliest.balanceAfterCents - earliest.amountCents;
  }

  const summary: WalletLedgerSummary = {
    openingBalanceCents,
    closingBalanceCents: user.walletBalanceCents,
    totalCreditedCents,
    totalDebitedCents,
    netChangeCents: totalCreditedCents - totalDebitedCents,
    entryCount: entries.length,
    earliestAt: entries.length > 0 ? entries[entries.length - 1]!.createdAt : null,
    latestAt: entries.length > 0 ? entries[0]!.createdAt : null,
  };

  // Audit log — fire and forget. Page render never waits on it.
  void prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: "MEMBER",
      action: "wallet.ledger_viewed",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({
        fromIso,
        toIso,
        entryCount: entries.length,
        netChangeCents: summary.netChangeCents,
      }),
    },
  }).catch((err) => {
    console.error("[walletLedger] audit failed:", err);
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      suiteNumber: user.suiteNumber,
      plan: user.plan,
      walletBalanceCents: user.walletBalanceCents,
      securityDepositCents: user.securityDepositCents,
      mailboxAssignedAt: user.mailboxAssignedAt
        ? user.mailboxAssignedAt.toISOString()
        : null,
    },
    entries,
    summary,
    generatedAt: new Date().toISOString(),
    range: { fromIso, toIso },
  };
}
