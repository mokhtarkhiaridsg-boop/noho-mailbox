import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifySignature(body: string, signature: string | null): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!key || !signature) return false;

  const url = process.env.SQUARE_WEBHOOK_URL?.trim() ?? "";
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(url + body);
  const expected = hmac.digest("base64");
  return signature === expected;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  // Verify webhook signature if key is configured
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (key && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(body);
    const type = event.type as string;
    const data = event.data?.object;

    switch (type) {
      case "customer.created":
      case "customer.updated": {
        const customer = data?.customer;
        if (customer?.email_address) {
          const existing = await prisma.user.findUnique({
            where: { email: customer.email_address },
          });
          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                squareCustomerId: customer.id,
                phone: existing.phone || customer.phone_number || null,
              },
            });
          }
        }
        break;
      }

      case "payment.completed":
      case "payment.updated": {
        const payment = data?.payment;
        if (payment) {
          let userId: string | null = null;
          if (payment.customer_id) {
            const user = await prisma.user.findFirst({
              where: { squareCustomerId: payment.customer_id },
              select: { id: true },
            });
            userId = user?.id ?? null;
          }

          await prisma.payment.upsert({
            where: { squarePaymentId: payment.id },
            create: {
              squarePaymentId: payment.id,
              userId,
              amount: Number(payment.amount_money?.amount ?? 0),
              currency: payment.amount_money?.currency ?? "USD",
              status: payment.status ?? "UNKNOWN",
              sourceType: payment.source_type ?? null,
              receiptUrl: payment.receipt_url ?? null,
              note: payment.note ?? null,
              squareCreatedAt: payment.created_at ?? new Date().toISOString(),
            },
            update: {
              status: payment.status,
              amount: Number(payment.amount_money?.amount ?? 0),
              userId,
              syncedAt: new Date(),
            },
          });
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge silently
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Square webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
