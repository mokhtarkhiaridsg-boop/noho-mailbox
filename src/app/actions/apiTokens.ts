"use server";

/**
 * iter-166 — Member-facing API token management (Tier 10 #75).
 *
 * Members manage their own bearer tokens from /dashboard → Settings.
 * Plaintext is shown ONCE at creation; only the SHA-256 hash + first
 * 8-char prefix are stored. Every create/revoke writes an AuditLog
 * `member.api_token_*` row so admins can investigate "who minted that".
 *
 * Scope vocabulary + token format primitives live in lib/apiTokens.ts.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  generateToken,
  serializeScopes,
  parseScopes,
  ALL_SCOPE_KEYS,
  type ApiScope,
} from "@/lib/apiTokens";

export type ApiTokenRow = {
  id: string;
  name: string;
  prefix: string;             // display-only, e.g. "noho_a1b2c3d4…"
  scopes: ApiScope[];
  lastUsedAtIso: string | null;
  lastUsedIp: string | null;
  expiresAtIso: string | null;
  revokedAtIso: string | null;
  createdAtIso: string;
  recentUsageCount: number;   // last-24h request count
};

// Load the current member's tokens (newest first). Counts the last-24h
// usage rows in one query so the panel can show a "32 req today" pill
// without paging the full usage log.
export async function listMyApiTokens(): Promise<ApiTokenRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const tokens = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    take: 30,
  });
  if (tokens.length === 0) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usageCounts = await prisma.apiTokenUsage.groupBy({
    by: ["tokenId"],
    where: { tokenId: { in: tokens.map((t) => t.id) }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const usageMap = new Map(usageCounts.map((u) => [u.tokenId, u._count._all]));

  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.tokenPrefix,
    scopes: parseScopes(t.scopesJson),
    lastUsedAtIso: t.lastUsedAt?.toISOString() ?? null,
    lastUsedIp: t.lastUsedIp,
    expiresAtIso: t.expiresAt?.toISOString() ?? null,
    revokedAtIso: t.revokedAt?.toISOString() ?? null,
    createdAtIso: t.createdAt.toISOString(),
    recentUsageCount: usageMap.get(t.id) ?? 0,
  }));
}

export type CreateApiTokenInput = {
  name: string;
  scopes: ApiScope[];
  expiresInDays?: number | null;   // null/undefined = never expire
};

export type CreateApiTokenResult =
  | { ok: true; id: string; plaintext: string; row: ApiTokenRow }
  | { ok: false; error: string };

export async function createApiToken(input: CreateApiTokenInput): Promise<CreateApiTokenResult> {
  const session = await verifySession();
  const userId = session.id!;
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false, error: "Name required (≥2 chars)." };

  const scopes = Array.from(new Set(input.scopes.filter((s) => (ALL_SCOPE_KEYS as string[]).includes(s))));
  if (scopes.length === 0) return { ok: false, error: "Pick at least one scope." };

  // Cap per-user tokens to 10 active — no abuse, no leaderboard for
  // who can mint the most.
  const activeCount = await prisma.apiToken.count({
    where: { userId, revokedAt: null },
  });
  if (activeCount >= 10) {
    return { ok: false, error: "Max 10 active tokens per account. Revoke an old one first." };
  }

  // Expiration: clamp 1-3650 days, null = never.
  let expiresAt: Date | null = null;
  if (input.expiresInDays != null && Number.isFinite(input.expiresInDays)) {
    const d = Math.max(1, Math.min(3650, Math.round(input.expiresInDays)));
    expiresAt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  }

  const { plaintext, prefix, hash } = generateToken();

  const created = await prisma.apiToken.create({
    data: {
      userId, name,
      tokenPrefix: prefix,
      tokenHash: hash,
      scopesJson: serializeScopes(scopes),
      expiresAt,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: session.role ?? "MEMBER",
      action: "member.api_token_created",
      entityType: "ApiToken",
      entityId: created.id,
      metadata: JSON.stringify({ name, scopes, expiresAtIso: expiresAt?.toISOString() ?? null, prefix }),
    },
  });
  revalidatePath("/dashboard");

  const row: ApiTokenRow = {
    id: created.id,
    name: created.name,
    prefix: created.tokenPrefix,
    scopes,
    lastUsedAtIso: null,
    lastUsedIp: null,
    expiresAtIso: created.expiresAt?.toISOString() ?? null,
    revokedAtIso: null,
    createdAtIso: created.createdAt.toISOString(),
    recentUsageCount: 0,
  };
  return { ok: true, id: created.id, plaintext, row };
}

export async function revokeMyApiToken(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const token = await prisma.apiToken.findUnique({ where: { id: input.id } });
  if (!token) return { error: "Token not found." };
  if (token.userId !== userId && session.role !== "ADMIN") {
    return { error: "Not your token to revoke." };
  }
  if (token.revokedAt) return { error: "Already revoked." };

  await prisma.$transaction([
    prisma.apiToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date(), revokedReason: input.reason?.trim().slice(0, 200) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "member.api_token_revoked",
        entityType: "ApiToken",
        entityId: token.id,
        metadata: JSON.stringify({ name: token.name, prefix: token.tokenPrefix, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

export type ApiUsageEntry = {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  durationMs: number | null;
  createdAtIso: string;
};

export async function getMyApiTokenUsage(input: { tokenId: string; limit?: number }): Promise<ApiUsageEntry[]> {
  const session = await verifySession();
  const userId = session.id!;
  // Ownership gate.
  const token = await prisma.apiToken.findUnique({ where: { id: input.tokenId }, select: { userId: true } });
  if (!token || (token.userId !== userId && session.role !== "ADMIN")) return [];
  const limit = Math.max(5, Math.min(200, input.limit ?? 50));
  const rows = await prisma.apiTokenUsage.findMany({
    where: { tokenId: input.tokenId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id, endpoint: r.endpoint, method: r.method, status: r.status,
    ip: r.ip, userAgent: r.userAgent, durationMs: r.durationMs,
    createdAtIso: r.createdAt.toISOString(),
  }));
}
