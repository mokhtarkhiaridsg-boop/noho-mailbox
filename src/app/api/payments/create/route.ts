import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SquareClient } from "square";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();

  try {
    const body = await request.json();
    const { sourceId, amount, currency, note } = body;

    if (!sourceId || !amount) {
      return NextResponse.json({ error: "Missing payment source or amount" }, { status: 400 });
    }

    const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: "Payment processing not configured" }, { status: 503 });
    }

    const client = new SquareClient({
      token,
      environment:
        process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
    });

    // Create payment with Square
    const locationId = process.env.SQUARE_LOCATION_ID?.trim();

    const result = await client.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amount), // amount in cents
        currency: currency || "USD",
      },
      locationId: locationId || undefined,
      note: note || "NOHO Mailbox payment",
    });

    const payment = result.payment;
    const paymentId = payment?.id;

    // Store payment in our database
    if (paymentId) {
      await prisma.payment.create({
        data: {
          squarePaymentId: paymentId,
          userId: session?.user?.id ?? null,
          amount: Number(amount),
          currency: currency || "USD",
          status: payment?.status ?? "COMPLETED",
          sourceType: payment?.sourceType ?? null,
          receiptUrl: payment?.receiptUrl ?? null,
          note: note || null,
          squareCreatedAt: payment?.createdAt ?? new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentId,
      receiptUrl: payment?.receiptUrl,
    });
  } catch (error: unknown) {
    console.error("Payment error:", error);
    const msg = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
