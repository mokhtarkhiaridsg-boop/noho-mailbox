"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function formatInvoiceNumber(seq: number) {
  const year = new Date().getFullYear();
  return `NOHO-${year}-${String(seq).padStart(4, "0")}`;
}

export async function generateInvoice(input: {
  userId: string;
  kind: string;
  description: string;
  amountCents: number;
  taxCents?: number;
  dueAt?: string;
}) {
  await verifyAdmin();
  const total = await prisma.invoice.count();
  const number = formatInvoiceNumber(total + 1);
  const tax = input.taxCents ?? 0;
  const inv = await prisma.invoice.create({
    data: {
      userId: input.userId,
      number,
      kind: input.kind,
      description: input.description,
      amountCents: input.amountCents,
      taxCents: tax,
      totalCents: input.amountCents + tax,
      status: "Draft",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  revalidatePath("/admin");
  return { success: true, invoiceId: inv.id, number };
}

export async function sendInvoice(invoiceId: string) {
  await verifyAdmin();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "Sent", sentAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function payInvoice(invoiceId: string) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.userId !== userId) return { error: "Not authorized" };
  if (invoice.status === "Paid") return { error: "Already paid" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalanceCents: true },
  });
  if (!user) return { error: "User not found" };
  if (user.walletBalanceCents < invoice.totalCents) {
    return { error: "Insufficient wallet balance" };
  }

  const newBal = user.walletBalanceCents - invoice.totalCents;
  await prisma.user.update({
    where: { id: userId },
    data: { walletBalanceCents: newBal },
  });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "Paid", paidAt: new Date() },
  });
  await prisma.walletTransaction.create({
    data: {
      userId,
      kind: "Charge",
      amountCents: -invoice.totalCents,
      description: `Invoice ${invoice.number}`,
      balanceAfterCents: newBal,
      invoiceId,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
