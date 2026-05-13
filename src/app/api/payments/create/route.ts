import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SquareClient, SquareEnvironment } from "square";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

// iter-12.2 — Defensive env reader. Vercel-pulled env values can carry a
// literal `\n` inside the quoted string (escaped backslash + n), making
// the 64-char Square token render as 66 chars + auth 401. Strip both
// literal `\r/\n` escape sequences and any real whitespace.
function cleanEnv(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/\\[rn]/g, "").replace(/[\r\n\t]/g, "").trim();
}

// Whitelist of allowed amount tiers + a custom cap. Keeps the client
// from quietly charging more than the user agreed to.
const ALLOWED_AMOUNTS = new Set([2500, 5000, 10000, 25000, 50000, 100000]);
const CUSTOM_MIN = 100;       // $1.00
const CUSTOM_MAX = 100000;    // $1,000.00

export async function POST(request: NextRequest) {
  const session = await auth();
  // Allow guests for shop-checkout cases, but require auth for wallet
  // top-ups (so we have a userId to credit).
  const userId = session?.user?.id ?? null;

  try {
    const body = await request.json();
    const sourceId: string = body.sourceId;
    const amount: number = Number(body.amount);
    const currency: string = body.currency || "USD";
    const note: string = body.note || "NOHO Mailbox payment";
    const purpose: "wallet_topup" | "one_off" = body.purpose === "wallet_topup" ? "wallet_topup" : "one_off";

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json({ error: "Missing payment source" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < CUSTOM_MIN || amount > CUSTOM_MAX) {
      return NextResponse.json({ error: `Amount must be $${CUSTOM_MIN / 100}–$${CUSTOM_MAX / 100}` }, { status: 400 });
    }
    // For wallet top-ups, require a preset to prevent surprise charges.
    if (purpose === "wallet_topup" && !ALLOWED_AMOUNTS.has(amount)) {
      return NextResponse.json({ error: "Invalid top-up amount" }, { status: 400 });
    }
    if (purpose === "wallet_topup" && !userId) {
      return NextResponse.json({ error: "Sign in required to top up your wallet" }, { status: 401 });
    }

    const token = cleanEnv(process.env.SQUARE_ACCESS_TOKEN);
    if (!token) {
      return NextResponse.json({ error: "Payment processing not configured" }, { status: 503 });
    }

    const envName = cleanEnv(process.env.SQUARE_ENVIRONMENT).toLowerCase();
    const client = new SquareClient({
      token,
      environment: envName === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    const locationId = cleanEnv(process.env.SQUARE_LOCATION_ID) || undefined;
    const idempotencyKey = randomUUID();

    // iter-12.2 — Square's `payments.create` accepts a verificationToken
    // for 3DS-challenged cards. The client's PaymentForm will pass it
    // when the bank requires SCA. Optional — most US cards skip 3DS.
    const verificationToken: string | undefined =
      typeof body.verificationToken === "string" && body.verificationToken.length > 0
        ? body.verificationToken
        : undefined;

    const result = await client.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: { amount: BigInt(amount), currency: (currency || "USD") as "USD" },
      locationId,
      note,
      ...(verificationToken ? { verificationToken } : {}),
      ...(userId ? { referenceId: userId } : {}),
      autocomplete: true,
    });

    const payment = result.payment;
    const paymentId = payment?.id;
    const paymentStatus = payment?.status ?? "UNKNOWN";

    if (!paymentId) {
      return NextResponse.json({ error: "Square did not return a payment id" }, { status: 502 });
    }

    // Validate that Square charged the amount we asked for. Never trust
    // the response blindly — a code bug or man-in-the-middle could swap
    // amounts. Verify before crediting the wallet.
    // Use BigInt(0) instead of the 0n literal so the file compiles under
     // the project's current TS target (BigInt literals need ES2020+).
    const serverChargedCents = Number(payment?.amountMoney?.amount ?? BigInt(0));
    if (serverChargedCents !== amount) {
      console.error("[payments] amount mismatch", { requested: amount, charged: serverChargedCents, paymentId });
      // Persist the row so admin can reconcile, then refuse to credit wallet.
      await prisma.payment.create({
        data: {
          squarePaymentId: paymentId,
          userId,
          amount: serverChargedCents,
          currency: currency || "USD",
          status: paymentStatus,
          sourceType: payment?.sourceType ?? null,
          receiptUrl: payment?.receiptUrl ?? null,
          note: `[amount mismatch] ${note}`,
          squareCreatedAt: payment?.createdAt ?? new Date().toISOString(),
        },
      });
      return NextResponse.json({
        error: "Payment amount mismatch — contact support",
        paymentId,
      }, { status: 502 });
    }

    // iter-12.2 — Wallet top-up path: atomically (a) persist Payment,
    // (b) bump User.walletBalanceCents, (c) write WalletTransaction
    // ledger row, (d) mark any matching open CreditRequest as Paid,
    // (e) audit log. All inside one $transaction so partial-failure
    // never leaves wallet/ledger drift.
    if (purpose === "wallet_topup" && userId && paymentStatus === "COMPLETED") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalanceCents: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const newBalance = (user.walletBalanceCents ?? 0) + amount;

      const matchingRequest = await prisma.creditRequest.findFirst({
        where: {
          userId,
          amountCents: amount,
          status: { in: ["Pending", "LinkSent"] },
        },
        orderBy: { createdAt: "desc" },
      });

      await prisma.$transaction([
        prisma.payment.create({
          data: {
            squarePaymentId: paymentId,
            userId,
            amount,
            currency: currency || "USD",
            status: paymentStatus,
            sourceType: payment?.sourceType ?? null,
            receiptUrl: payment?.receiptUrl ?? null,
            note: note || "Wallet top-up",
            squareCreatedAt: payment?.createdAt ?? new Date().toISOString(),
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { walletBalanceCents: newBalance },
        }),
        prisma.walletTransaction.create({
          data: {
            id: randomUUID(),
            userId,
            kind: "TopUp",
            amountCents: amount,
            description: `Wallet top-up via Square ($${(amount / 100).toFixed(2)})`,
            balanceAfterCents: newBalance,
          },
        }),
        ...(matchingRequest
          ? [
              prisma.creditRequest.update({
                where: { id: matchingRequest.id },
                data: { status: "Paid", paidAt: new Date() },
              }),
            ]
          : []),
        prisma.auditLog.create({
          data: {
            id: randomUUID(),
            actorId: userId,
            actorRole: "USER",
            action: "wallet.online_topup",
            entityType: "User",
            entityId: userId,
            metadata: JSON.stringify({
              paymentId,
              amountCents: amount,
              prevBalance: user.walletBalanceCents,
              newBalance,
              creditRequestId: matchingRequest?.id ?? null,
            }),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        paymentId,
        receiptUrl: payment?.receiptUrl,
        newBalanceCents: newBalance,
        appliedToCreditRequestId: matchingRequest?.id ?? null,
      });
    }

    // One-off non-wallet path: just persist the Payment row.
    await prisma.payment.create({
      data: {
        squarePaymentId: paymentId,
        userId,
        amount,
        currency: currency || "USD",
        status: paymentStatus,
        sourceType: payment?.sourceType ?? null,
        receiptUrl: payment?.receiptUrl ?? null,
        note: note || null,
        squareCreatedAt: payment?.createdAt ?? new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      paymentId,
      receiptUrl: payment?.receiptUrl,
    });
  } catch (error: unknown) {
    console.error("[payments/create] error:", error);
    // Surface Square's structured error (CARD_DECLINED, CVV_FAILURE, etc.)
    // so the UI can show a friendly message rather than "Payment failed".
    const errors = (error as { errors?: Array<{ detail?: string; code?: string }> }).errors;
    if (Array.isArray(errors) && errors[0]) {
      return NextResponse.json(
        { error: errors[0].detail ?? "Payment failed", code: errors[0].code },
        { status: 402 },
      );
    }
    const msg = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
