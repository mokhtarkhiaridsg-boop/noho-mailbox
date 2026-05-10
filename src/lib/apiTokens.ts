// iter-166 — API token primitives.
//
// Lives outside any "use server" boundary so HTTP route handlers can
// import `verifyApiToken()` for bearer-auth without dragging in the
// server-action plumbing. Hashing + format constants stay here too so
// member UI + server actions agree on what a token looks like.
//
// Token format: `noho_` prefix + 8-char display prefix + 32 hex
// random chars = 46 chars total. Body is base32-Crockford-ish (alphanumeric
// without ambiguous chars). The first 8 of the body double as a unique
// lookup key in the database — we never query the full token, only its
// prefix, then constant-time compare the SHA-256 of the candidate
// against the stored hash.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const TOKEN_BRAND_PREFIX = "noho_";
export const TOKEN_PREFIX_LEN = 8;        // first 8 hex chars of the body
export const TOKEN_BODY_LEN = 32;         // remaining hex chars
export const TOKEN_TOTAL_LEN = TOKEN_BRAND_PREFIX.length + TOKEN_PREFIX_LEN + TOKEN_BODY_LEN;

// All available scopes. Member UI shows checkboxes; verifyApiToken()
// checks the requested scope against the token's stored scopesJson.
export const API_SCOPES = [
  { key: "profile:read",  label: "Profile",      description: "Name, suite, plan, contact info" },
  { key: "mail:read",     label: "Mail",         description: "All mail items + scan URLs" },
  { key: "packages:read", label: "Packages",     description: "Active + historical packages" },
  { key: "billing:read",  label: "Billing",      description: "Invoices + wallet balance" },
  { key: "calendar:read", label: "Calendar",     description: "Subscribable iCal feed (notary + pickups + renewals)" },
] as const;
export type ApiScope = typeof API_SCOPES[number]["key"];
export const ALL_SCOPE_KEYS: ApiScope[] = API_SCOPES.map((s) => s.key as ApiScope);

export type GeneratedToken = {
  plaintext: string;        // shown ONCE to the user
  prefix: string;           // 8 chars, stored as tokenPrefix
  hash: string;             // SHA-256 hex of the full plaintext, stored as tokenHash
};

export function generateToken(): GeneratedToken {
  // Generate 20 random bytes → 40 hex chars; we use 8 as prefix + 32 as body.
  const bytes = randomBytes(20).toString("hex"); // 40 hex chars
  const prefix = bytes.slice(0, TOKEN_PREFIX_LEN);
  const body = bytes.slice(TOKEN_PREFIX_LEN, TOKEN_PREFIX_LEN + TOKEN_BODY_LEN);
  const plaintext = `${TOKEN_BRAND_PREFIX}${prefix}${body}`;
  const hash = hashToken(plaintext);
  return { plaintext, prefix, hash };
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function parseScopes(json: string | null | undefined): ApiScope[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ApiScope => typeof x === "string" && (ALL_SCOPE_KEYS as string[]).includes(x));
  } catch {
    return [];
  }
}

export function serializeScopes(scopes: ApiScope[]): string {
  return JSON.stringify(Array.from(new Set(scopes.filter((s) => (ALL_SCOPE_KEYS as string[]).includes(s)))));
}

// Pull the bearer token off the request. Accepts both `Authorization`
// and `X-Api-Token` (some API clients can't set Authorization easily).
export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-api-token");
  if (x) return x.trim();
  return null;
}

export type ApiTokenVerifyResult =
  | { ok: true; userId: string; tokenId: string; scopes: ApiScope[] }
  | { ok: false; status: number; error: string };

// Single source of truth for API request authentication. Lookup by
// prefix → constant-time compare the full hash → check expiry/revocation
// → verify scope → log usage (fire-and-forget). Always logs even on
// failure so admins can see brute-force attempts.
export async function verifyApiToken(req: Request, requiredScope: ApiScope): Promise<ApiTokenVerifyResult> {
  const plaintext = extractBearerToken(req);
  if (!plaintext) {
    return { ok: false, status: 401, error: "Missing bearer token. Pass `Authorization: Bearer <token>`." };
  }
  if (!plaintext.startsWith(TOKEN_BRAND_PREFIX) || plaintext.length !== TOKEN_TOTAL_LEN) {
    return { ok: false, status: 401, error: "Malformed token." };
  }
  const prefix = plaintext.slice(TOKEN_BRAND_PREFIX.length, TOKEN_BRAND_PREFIX.length + TOKEN_PREFIX_LEN);
  const candidateHash = hashToken(plaintext);

  const token = await prisma.apiToken.findUnique({
    where: { tokenPrefix: prefix },
    select: { id: true, userId: true, tokenHash: true, scopesJson: true, revokedAt: true, expiresAt: true },
  });
  if (!token) {
    return { ok: false, status: 401, error: "Invalid token." };
  }

  // Constant-time equality check. Both buffers MUST be the same length;
  // SHA-256 hex is always 64 chars, so we're safe.
  const a = Buffer.from(token.tokenHash, "hex");
  const b = Buffer.from(candidateHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Invalid token." };
  }
  if (token.revokedAt) {
    return { ok: false, status: 401, error: "Token revoked." };
  }
  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 401, error: "Token expired." };
  }
  const scopes = parseScopes(token.scopesJson);
  if (!scopes.includes(requiredScope)) {
    return { ok: false, status: 403, error: `Token missing required scope '${requiredScope}'.` };
  }
  return { ok: true, userId: token.userId, tokenId: token.id, scopes };
}

// Fire-and-forget usage logger. Called from the route handler at the
// end of each request — bumps the token's `lastUsedAt` and writes a
// usage row. We swallow errors so logging can never crash a real
// response.
export async function logApiUsage(args: {
  tokenId: string | null;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  if (!args.tokenId) return;
  try {
    await prisma.$transaction([
      prisma.apiTokenUsage.create({
        data: {
          tokenId: args.tokenId,
          endpoint: args.endpoint,
          method: args.method,
          status: args.status,
          ip: args.ip ?? null,
          userAgent: args.userAgent?.slice(0, 200) ?? null,
          durationMs: args.durationMs,
        },
      }),
      prisma.apiToken.update({
        where: { id: args.tokenId },
        data: { lastUsedAt: new Date(), lastUsedIp: args.ip ?? null },
      }),
    ]);
  } catch {
    /* swallow */
  }
}

// Best-effort IP extraction. Vercel forwards via `x-forwarded-for`,
// other proxies use `x-real-ip`. We never trust the client's `x-real-ip`
// in production but for usage logging it's adequate.
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}
