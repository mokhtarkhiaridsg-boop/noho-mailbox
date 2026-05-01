"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Cast prisma to access the new tenant tables; Prisma client may need re-gen
// in some deploys but the cast keeps types loose where the schema is fresh.
type TenantClient = {
  tenant: {
    findMany: (args?: unknown) => Promise<Array<Record<string, unknown>>>;
    findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
    update: (args: unknown) => Promise<Record<string, unknown>>;
    delete: (args: unknown) => Promise<unknown>;
    count: (args?: unknown) => Promise<number>;
  };
  tenantBillingEvent: {
    create: (args: unknown) => Promise<unknown>;
  };
};

const c = (prisma as unknown) as TenantClient;

export async function adminListTenants() {
  await verifyAdmin();
  const tenants = await c.tenant.findMany({
    orderBy: { createdAt: "desc" },
  });
  return tenants;
}

export async function adminUpdateTenantStatus(
  tenantId: string,
  status: "trial" | "active" | "paused" | "terminated"
) {
  await verifyAdmin();
  await c.tenant.update({
    where: { id: tenantId },
    data: { status, updatedAt: new Date() },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminUpdateTenantTier(
  tenantId: string,
  tier: "Solo" | "Multi-Location" | "Enterprise",
  pricePerMonthCents: number
) {
  await verifyAdmin();
  await c.tenant.update({
    where: { id: tenantId },
    data: { tier, pricePerMonthCents, updatedAt: new Date() },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminUpdateTenantNotes(
  tenantId: string,
  notes: string
) {
  await verifyAdmin();
  await c.tenant.update({
    where: { id: tenantId },
    data: { notes, updatedAt: new Date() },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminLogTenantBilling(input: {
  tenantId: string;
  kind: string;
  amountCents: number;
  description?: string;
  stripeId?: string;
}) {
  await verifyAdmin();
  await c.tenantBillingEvent.create({
    data: {
      id: cuid(),
      tenantId: input.tenantId,
      kind: input.kind,
      amountCents: input.amountCents,
      description: input.description ?? null,
      stripeId: input.stripeId ?? null,
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminDeleteTenant(tenantId: string) {
  await verifyAdmin();
  await c.tenant.delete({ where: { id: tenantId } });
  revalidatePath("/admin");
  return { success: true };
}
