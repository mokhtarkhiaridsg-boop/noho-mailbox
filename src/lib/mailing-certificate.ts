// iter-187 — Mailing-certificate primitives.
// Lives outside any "use server" file so the public verify page +
// admin issuer share the same constants.

import { randomBytes } from "node:crypto";

// 16-char Crockford-base32 minus 0/O/1/I (same alphabet as iter-176
// dropoff codes — easy to type back over the phone if a printout
// gets smudged).
const VERIFY_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VERIFY_TOKEN_LEN = 16;

export function generateVerifyToken(): string {
  const out: string[] = [];
  while (out.length < VERIFY_TOKEN_LEN) {
    const bytes = randomBytes(VERIFY_TOKEN_LEN * 2);
    for (const byte of bytes) {
      const idx = byte % 32;
      if (idx >= VERIFY_TOKEN_ALPHABET.length) continue;
      out.push(VERIFY_TOKEN_ALPHABET[idx]!);
      if (out.length >= VERIFY_TOKEN_LEN) break;
    }
  }
  return out.join("");
}

export function formatVerifyToken(t: string): string {
  // Pretty print as XXXX-XXXX-XXXX-XXXX so members can read it back.
  if (t.length !== VERIFY_TOKEN_LEN) return t;
  return `${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}`;
}

export function normalizeVerifyToken(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Certificate number format: NMC-YYYY-NNNNNNNN.
// NMC = NOHO Mailing Certificate, year + sequential 8-digit suffix
// (random rather than DB-sequential so we don't lock contention or
// leak issuance volume).
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random8 = randomBytes(4).readUInt32BE(0).toString().padStart(10, "0").slice(0, 8);
  return `NMC-${year}-${random8}`;
}
