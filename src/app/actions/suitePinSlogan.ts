"use server";

/**
 * iter-232 — Custom suite-pin slogan server actions (Tier 17 #141).
 *
 * 1-line slogan that prints under the suite # on every intake / pickup
 * thermal receipt (iter-155) + Avery 5160 sticker-sheet labels (iter-
 * 210). Member-editable from settings; admin-editable from the
 * customer panel.
 *
 * Sanitization keeps emoji + spaces, strips control chars, caps at 80
 * chars. Empty string clears the slogan (sets DB column to NULL).
 *
 * Reuses iter-228-style atomic update + audit pattern.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sanitizeSlogan, SLOGAN_MAX_LEN } from "@/lib/suite-pin-slogan";

export type SuitePinSloganView = {
  slogan: string | null;
  suiteNumber: string | null;
  charsUsed: number;
  charsRemaining: number;
};

function toView(slogan: string | null, suiteNumber: string | null): SuitePinSloganView {
  const len = slogan?.length ?? 0;
  return {
    slogan: slogan ?? null,
    suiteNumber: suiteNumber ?? null,
    charsUsed: len,
    charsRemaining: Math.max(0, SLOGAN_MAX_LEN - len),
  };
}

// ─── Member ────────────────────────────────────────────────────────────

export async function getMySuitePinSlogan(): Promise<SuitePinSloganView> {
  const me = await verifySession();
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { suitePinSlogan: true, suiteNumber: true } });
  return toView(u?.suitePinSlogan ?? null, u?.suiteNumber ?? null);
}

export async function setMySuitePinSlogan(input: { slogan: string }): Promise<{ view?: SuitePinSloganView; error?: string }> {
  const me = await verifySession();
  const cleaned = sanitizeSlogan(input.slogan ?? "");
  if (cleaned.length > SLOGAN_MAX_LEN) return { error: `Slogan must be ≤ ${SLOGAN_MAX_LEN} characters.` };
  const value = cleaned.length === 0 ? null : cleaned;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: me.id },
      data: { suitePinSlogan: value },
    }),
    prisma.auditLog.create({
      data: {
        actorId: me.id, actorRole: "MEMBER",
        action: value === null ? "user.slogan_cleared" : "user.slogan_changed",
        entityType: "User", entityId: me.id,
        metadata: JSON.stringify({ slogan: value, len: value?.length ?? 0, source: "self" }),
      },
    }),
  ]);
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { suitePinSlogan: true, suiteNumber: true } });
  revalidatePath("/dashboard");
  return { view: toView(u?.suitePinSlogan ?? null, u?.suiteNumber ?? null) };
}

// ─── Admin ─────────────────────────────────────────────────────────────

export async function adminSetSuitePinSlogan(input: { userId: string; slogan: string }): Promise<{ view?: SuitePinSloganView; error?: string }> {
  const actor = await verifyAdmin();
  const cleaned = sanitizeSlogan(input.slogan ?? "");
  if (cleaned.length > SLOGAN_MAX_LEN) return { error: `Slogan must be ≤ ${SLOGAN_MAX_LEN} characters.` };
  const value = cleaned.length === 0 ? null : cleaned;
  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, suiteNumber: true } });
  if (!target) return { error: "Customer not found." };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { suitePinSlogan: value },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: value === null ? "user.slogan_cleared" : "user.slogan_changed",
        entityType: "User", entityId: target.id,
        metadata: JSON.stringify({ slogan: value, len: value?.length ?? 0, source: "admin" }),
      },
    }),
  ]);
  revalidatePath("/admin"); revalidatePath("/dashboard");
  return { view: toView(value, target.suiteNumber) };
}
