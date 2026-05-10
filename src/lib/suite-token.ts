// iter-210 — Suite-info QR token (Tier 15 #119).
//
// Signs + verifies short tokens used by the printed QR labels stuck
// on each mailbox door. When admin scans a label with their phone,
// the token validates against `SUITE_INFO_TOKEN` env (HMAC-SHA256)
// and the page renders the assigned member's info card.
//
// Why HMAC + not just "secret in URL": the suite # itself is in the
// URL, and we want the label printed for suite #042 to ONLY work
// for suite #042. So we sign `${suite}.${nonce}` so a token from
// suite #042's label can't be replayed against suite #100. Tokens
// don't expire (labels stay on the door for years) but rotate when
// the env var changes.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = (): string => (process.env.SUITE_INFO_TOKEN ?? "").trim();

export function signSuiteToken(suiteNumber: string): string | null {
  const sec = SECRET();
  if (!sec) return null;
  const cleanSuite = suiteNumber.trim();
  if (!cleanSuite) return null;
  const sig = createHmac("sha256", sec).update(cleanSuite).digest("base64url");
  // Compact 16-char prefix is plenty of entropy (96 bits) and keeps the
  // QR-encoded URL small enough to scan reliably from across the lobby.
  return sig.slice(0, 16);
}

export function verifySuiteToken(suiteNumber: string, token: string): boolean {
  const expected = signSuiteToken(suiteNumber);
  if (!expected) return false;
  // Constant-time compare with equal-length-buffer padding to prevent
  // timing leaks on length-mismatch fast path.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token.trim(), "utf8");
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(16, 0), Buffer.alloc(16, 1));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function isSuiteTokenConfigured(): boolean {
  return SECRET().length > 0;
}
