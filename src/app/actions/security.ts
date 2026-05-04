"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  generateSecret,
  generateUri,
  verifyToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  findRecoveryHashIndex,
} from "@/lib/totp";

// iter-96: Enrollment now also generates 10 one-time recovery codes,
// returns plaintext to the UI ONCE for the customer to print/save, and
// stores hashed copies. Audit-logged.
export async function enable2FA(): Promise<{
  success?: boolean;
  error?: string;
  secret?: string;
  uri?: string;
  recoveryCodes?: string[];
}> {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const secret = generateSecret();
  const recovery = generateRecoveryCodes(10);
  const hashed = recovery.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: secret,
      totpEnabled: false, // not enabled until confirmed by token
      totpRecoveryCodes: JSON.stringify(hashed),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: sessionUser.role,
      action: "auth.totp_enrollment_started",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ recoveryCodeCount: recovery.length }),
    },
  });
  return {
    success: true,
    secret,
    uri: generateUri(secret, sessionUser.email ?? userId),
    recoveryCodes: recovery, // plaintext, ONLY shown this once
  };
}

export async function confirm2FA(token: string): Promise<{ success?: boolean; error?: string }> {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) return { error: "Run enable first" };
  if (!verifyToken(user.totpSecret, token)) return { error: "Invalid code" };
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: sessionUser.role,
      action: "auth.totp_enabled",
      entityType: "User",
      entityId: userId,
    },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

// iter-96: disable accepts EITHER a TOTP code OR a recovery code. The
// recovery path is what saves admin if they lose their phone.
export async function disable2FA(codeOrRecovery: string): Promise<{ success?: boolean; error?: string; usedRecovery?: boolean }> {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, totpRecoveryCodes: true },
  });
  if (!user?.totpSecret || !user.totpEnabled) return { error: "Not enabled" };

  const trimmed = codeOrRecovery.trim();
  const isNumeric = /^\d{6}$/.test(trimmed);
  let usedRecovery = false;

  if (isNumeric) {
    if (!verifyToken(user.totpSecret, trimmed)) return { error: "Invalid code" };
  } else {
    const hashes: string[] = (() => { try { return user.totpRecoveryCodes ? JSON.parse(user.totpRecoveryCodes) : []; } catch { return []; } })();
    const idx = findRecoveryHashIndex(trimmed, hashes);
    if (idx < 0) return { error: "Invalid code" };
    usedRecovery = true;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabled: false, totpRecoveryCodes: null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: sessionUser.role,
      action: "auth.totp_disabled",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ usedRecovery }),
    },
  });
  revalidatePath("/dashboard");
  return { success: true, usedRecovery };
}

// iter-96: Step-up verify — for any sensitive action (key.lost, wallet
// refund, etc.) call this to require a fresh code from the current
// admin. Returns true on success. Recovery codes are single-use:
// when one is consumed we remove it from the stored hash list.
export async function stepUpTotpVerify(codeOrRecovery: string): Promise<{ ok: boolean; usedRecovery?: boolean; remainingRecoveryCodes?: number; error?: string }> {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, totpRecoveryCodes: true },
  });
  if (!user?.totpEnabled || !user.totpSecret) {
    // Step-up requested for an account without 2FA — block by policy.
    return { ok: false, error: "2FA not enabled for this account" };
  }
  const trimmed = (codeOrRecovery ?? "").trim();
  if (/^\d{6}$/.test(trimmed)) {
    if (!verifyToken(user.totpSecret, trimmed)) return { ok: false, error: "Invalid code" };
    return { ok: true };
  }
  // Recovery path — single-use.
  const hashes: string[] = (() => { try { return user.totpRecoveryCodes ? JSON.parse(user.totpRecoveryCodes) : []; } catch { return []; } })();
  const idx = findRecoveryHashIndex(trimmed, hashes);
  if (idx < 0) return { ok: false, error: "Invalid code" };
  const remaining = [...hashes.slice(0, idx), ...hashes.slice(idx + 1)];
  await prisma.user.update({
    where: { id: userId },
    data: { totpRecoveryCodes: JSON.stringify(remaining) },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: sessionUser.role,
      action: "auth.totp_recovery_used",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ remaining: remaining.length }),
    },
  });
  return { ok: true, usedRecovery: true, remainingRecoveryCodes: remaining.length };
}

// Read for the UI to know whether to render "Enabled" or "Disabled".
export async function getMy2FAStatus(): Promise<{ enabled: boolean; recoveryCodesRemaining: number | null }> {
  const sessionUser = await verifySession();
  const u = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { totpEnabled: true, totpRecoveryCodes: true },
  });
  let remaining: number | null = null;
  if (u?.totpRecoveryCodes) {
    try { remaining = (JSON.parse(u.totpRecoveryCodes) as string[]).length; } catch { remaining = null; }
  }
  return { enabled: !!u?.totpEnabled, recoveryCodesRemaining: remaining };
}
