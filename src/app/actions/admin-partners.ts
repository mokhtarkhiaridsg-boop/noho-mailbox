"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generatePartnerCode(businessName: string): string {
  const base = businessName
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "NOHO";
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}-${suffix}`;
}

// ─── Partner CRUD ─────────────────────────────────────────────────────────────

export async function adminCreatePartner(input: {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  category: string;
  commissionRate?: number;
  notes?: string;
}) {
  await verifyAdmin();

  const existing = await prisma.partner.findUnique({ where: { email: input.email } });
  if (existing) {
    return { error: `A partner with email ${input.email} already exists.` };
  }

  // Generate a unique code
  let code = generatePartnerCode(input.businessName);
  let attempts = 0;
  while (await prisma.partner.findUnique({ where: { code } })) {
    code = generatePartnerCode(input.businessName);
    if (++attempts > 5) {
      return { error: "Could not generate a unique partner code." };
    }
  }

  const partner = await prisma.partner.create({
    data: {
      id: cuid(),
      businessName: input.businessName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone || null,
      category: input.category,
      code,
      commissionRate: input.commissionRate ?? 0.15,
      status: "active",
      notes: input.notes || null,
    },
  });

  revalidatePath("/admin");
  return { success: true, partnerId: partner.id, code };
}

export async function adminUpdatePartner(
  partnerId: string,
  data: {
    businessName?: string;
    contactName?: string;
    phone?: string | null;
    category?: string;
    commissionRate?: number;
    status?: string;
    notes?: string | null;
  }
) {
  await verifyAdmin();
  await prisma.partner.update({ where: { id: partnerId }, data });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminDeletePartner(partnerId: string) {
  await verifyAdmin();
  await prisma.partner.delete({ where: { id: partnerId } });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminListPartners() {
  await verifyAdmin();
  return prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      commissions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ─── Partner commission tracking ─────────────────────────────────────────────

export async function adminLogCommission(input: {
  partnerId: string;
  prospectName: string;
  prospectEmail?: string;
  prospectPhone?: string;
  product: string;
  invoiceCents: number;
  status?: string;
  notes?: string;
}) {
  await verifyAdmin();

  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
    select: { commissionRate: true },
  });
  if (!partner) return { error: "Partner not found." };

  const commissionCents = Math.round(input.invoiceCents * partner.commissionRate);

  await prisma.partnerCommission.create({
    data: {
      id: cuid(),
      partnerId: input.partnerId,
      prospectName: input.prospectName,
      prospectEmail: input.prospectEmail || null,
      prospectPhone: input.prospectPhone || null,
      product: input.product,
      invoiceCents: input.invoiceCents,
      commissionCents,
      status: input.status ?? "lead",
      notes: input.notes || null,
    },
  });

  revalidatePath("/admin");
  return { success: true, commissionCents };
}

export async function adminUpdateCommissionStatus(
  commissionId: string,
  status: "lead" | "quoted" | "closed" | "cancelled" | "paid"
) {
  await verifyAdmin();

  const data: Record<string, unknown> = { status };
  if (status === "closed") data.closedAt = new Date();
  if (status === "paid") data.paidAt = new Date();

  await prisma.partnerCommission.update({ where: { id: commissionId }, data });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminDeleteCommission(commissionId: string) {
  await verifyAdmin();
  await prisma.partnerCommission.delete({ where: { id: commissionId } });
  revalidatePath("/admin");
  return { success: true };
}

// ─── Approve a partner-program contact submission and create a Partner row ──

export async function adminApprovePartnerApplication(input: {
  contactSubmissionId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  category: string;
  commissionRate?: number;
  notes?: string;
}) {
  await verifyAdmin();

  const result = await adminCreatePartner({
    businessName: input.businessName,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    category: input.category,
    commissionRate: input.commissionRate,
    notes: input.notes,
  });

  if ("error" in result) return result;

  // Mark the contact submission as handled by appending a note.
  try {
    const sub = await prisma.contactSubmission.findUnique({
      where: { id: input.contactSubmissionId },
    });
    if (sub) {
      const updatedMessage = `${sub.message}\n\n[APPROVED — Partner created with code ${result.code} on ${new Date().toISOString().slice(0, 10)}]`;
      await prisma.contactSubmission.update({
        where: { id: input.contactSubmissionId },
        data: { message: updatedMessage },
      });
    }
  } catch {
    // Non-fatal.
  }

  return result;
}
