"use server";

/**
 * iter-215 — Bureau identity server actions (Tier 15 #124).
 *
 * Read is public (used by /api/bureau/[bureauId]/info); write is
 * admin-gated. Audit on every update so franchise rebrands have a
 * trail.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  BUREAU_IDENTITY_KEY,
  DEFAULT_BUREAU_IDENTITY,
  parseBureauIdentity,
  type BureauIdentity,
} from "@/lib/bureau-identity";

export async function getBureauIdentity(): Promise<BureauIdentity> {
  const row = await prisma.siteConfig.findUnique({ where: { key: BUREAU_IDENTITY_KEY } }).catch(() => null);
  return parseBureauIdentity(row?.value);
}

export async function updateBureauIdentity(input: Partial<BureauIdentity>): Promise<{ row?: BureauIdentity; error?: string }> {
  const actor = await verifyAdmin();
  const current = await getBureauIdentity();
  const merged: BureauIdentity = { ...current, ...input };
  // Re-validate by round-tripping through parser.
  const validated = parseBureauIdentity(JSON.stringify(merged));

  await prisma.siteConfig.upsert({
    where: { key: BUREAU_IDENTITY_KEY },
    update: { value: JSON.stringify(validated) },
    create: { key: BUREAU_IDENTITY_KEY, value: JSON.stringify(validated) },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "bureau_identity.updated",
      entityType: "SiteConfig", entityId: BUREAU_IDENTITY_KEY,
      metadata: JSON.stringify({ bureauId: validated.bureauId, name: validated.name, changed: Object.keys(input) }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  revalidatePath("/");
  return { row: validated };
}

export async function resetBureauIdentity(): Promise<{ row: BureauIdentity }> {
  const actor = await verifyAdmin();
  await prisma.siteConfig.upsert({
    where: { key: BUREAU_IDENTITY_KEY },
    update: { value: JSON.stringify(DEFAULT_BUREAU_IDENTITY) },
    create: { key: BUREAU_IDENTITY_KEY, value: JSON.stringify(DEFAULT_BUREAU_IDENTITY) },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "bureau_identity.reset",
      entityType: "SiteConfig", entityId: BUREAU_IDENTITY_KEY,
      metadata: JSON.stringify({}),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: DEFAULT_BUREAU_IDENTITY };
}
