"use server";

/**
 * iter-192 — Member-side forwarding address book (Tier 13 #101).
 *
 * Promotes iter-129's minimal {label, address} CRUD into a full
 * book: per-row default flag (exactly one per user), optional
 * recipientName override, category enum for visual grouping, free-
 * text notes, lastUsedAt stamped by iter-170 batch sweeps.
 *
 * Default-flag semantics: exactly one default per user. Setting an
 * address as default demotes all siblings inside the same
 * transaction. The first address a member adds is auto-default.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const CATEGORIES = ["home", "work", "snowbird", "family", "storage", "other"] as const;
export type AddressCategory = typeof CATEGORIES[number];

export type ForwardingAddressRow = {
  id: string;
  label: string;
  address: string;
  recipientName: string | null;
  category: AddressCategory | null;
  notes: string | null;
  isDefault: boolean;
  lastUsedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

function castCategory(c: string | null | undefined): AddressCategory | null {
  if (!c) return null;
  return (CATEGORIES as readonly string[]).includes(c) ? (c as AddressCategory) : null;
}

function toRow(r: { id: string; label: string; address: string; recipientName: string | null; category: string | null; notes: string | null; isDefault: boolean; lastUsedAt: Date | null; createdAt: Date; updatedAt: Date }): ForwardingAddressRow {
  return {
    id: r.id,
    label: r.label,
    address: r.address,
    recipientName: r.recipientName,
    category: castCategory(r.category),
    notes: r.notes,
    isDefault: r.isDefault,
    lastUsedAtIso: r.lastUsedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    updatedAtIso: r.updatedAt.toISOString(),
  };
}

export async function listMyForwardingAddresses(): Promise<ForwardingAddressRow[]> {
  const session = await verifySession();
  const rows = await prisma.forwardingAddress.findMany({
    where: { userId: session.id! },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    take: 30,
  });
  return rows.map(toRow);
}

export type UpsertAddressInput = {
  id?: string;
  label: string;
  address: string;
  recipientName?: string;
  category?: AddressCategory;
  notes?: string;
  isDefault?: boolean;
};

export async function upsertMyForwardingAddress(input: UpsertAddressInput): Promise<{ id?: string; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const label = input.label.trim().slice(0, 80);
  if (label.length < 1) return { error: "Label required (e.g. 'Snowbird condo')." };
  const address = input.address.trim().slice(0, 600);
  if (address.length < 5) return { error: "Address required." };
  const category = input.category && (CATEGORIES as readonly string[]).includes(input.category) ? input.category : null;

  const data = {
    label,
    address,
    recipientName: input.recipientName?.trim().slice(0, 80) || null,
    category,
    notes: input.notes?.trim().slice(0, 300) || null,
  };

  // Default-flag semantics: when input.isDefault=true OR this is the
  // member's first address, ensure exactly one default exists.
  let id = input.id;
  let isFirstAddress = false;
  if (!id) {
    isFirstAddress = (await prisma.forwardingAddress.count({ where: { userId } })) === 0;
  }
  const wantDefault = input.isDefault === true || isFirstAddress;

  await prisma.$transaction(async (tx) => {
    if (wantDefault) {
      await tx.forwardingAddress.updateMany({
        where: { userId, NOT: id ? { id } : undefined },
        data: { isDefault: false },
      });
    }
    if (id) {
      await tx.forwardingAddress.update({
        where: { id },
        data: { ...data, ...(input.isDefault === true ? { isDefault: true } : {}) },
      });
    } else {
      const created = await tx.forwardingAddress.create({
        data: { ...data, userId, isDefault: wantDefault },
      });
      id = created.id;
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: session.role ?? "MEMBER",
      action: input.id ? "forwarding_address.updated" : "forwarding_address.created",
      entityType: "ForwardingAddress",
      entityId: id ?? "(unknown)",
      metadata: JSON.stringify({ label, category, isDefault: wantDefault }),
    },
  });
  revalidatePath("/dashboard");
  return { id };
}

export async function setMyForwardingAddressDefault(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.forwardingAddress.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Address not found." };
  if (row.userId !== userId) return { error: "Not your address." };
  if (row.isDefault) return { success: true };

  await prisma.$transaction([
    prisma.forwardingAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.forwardingAddress.update({ where: { id: row.id }, data: { isDefault: true } }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "forwarding_address.default_changed",
        entityType: "ForwardingAddress",
        entityId: row.id,
        metadata: JSON.stringify({ label: row.label }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteMyForwardingAddress(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.forwardingAddress.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Address not found." };
  if (row.userId !== userId) return { error: "Not your address." };

  // If the row being deleted IS the default, promote another address
  // (most-recently used) to default so the member always has a fallback.
  await prisma.$transaction(async (tx) => {
    await tx.forwardingAddress.delete({ where: { id: row.id } });
    if (row.isDefault) {
      const next = await tx.forwardingAddress.findFirst({
        where: { userId },
        orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
      });
      if (next) {
        await tx.forwardingAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: session.role ?? "MEMBER",
      action: "forwarding_address.deleted",
      entityType: "ForwardingAddress",
      entityId: row.id,
      metadata: JSON.stringify({ label: row.label, wasDefault: row.isDefault }),
    },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
