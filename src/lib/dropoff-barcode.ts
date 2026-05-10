// iter-176 — Dropoff barcode primitives.
// Lives outside any "use server" file so the public kiosk page + the
// admin scan handler share the same constants without dragging in
// async-only constraints.

import { randomBytes } from "node:crypto";

// Crockford-ish base32 minus 0/O/1/I to avoid scan ambiguity.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Code length: 12 chars. Search space ~32^12 ≈ 1.15 quintillion.
// Chunked as XXXX-XXXX-XXXX in print so members can read it back over
// the phone if a barcode is smudged.
export const DROPOFF_CODE_LEN = 12;
export const DROPOFF_EXPIRY_DAYS = 14;

export function generateDropoffCode(): string {
  const out: string[] = [];
  // Pull twice as many bytes as chars so rejection-sampling stays fast.
  while (out.length < DROPOFF_CODE_LEN) {
    const b = randomBytes(DROPOFF_CODE_LEN * 2);
    for (const byte of b) {
      const idx = byte % 32;
      if (idx >= ALPHABET.length) continue;
      out.push(ALPHABET[idx]!);
      if (out.length >= DROPOFF_CODE_LEN) break;
    }
  }
  return out.join("");
}

// Pretty format: ABCD-EFGH-JKLM
export function formatDropoffCode(c: string): string {
  if (c.length !== DROPOFF_CODE_LEN) return c;
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

// Strip dashes / lowercase → canonical form for DB lookup.
export function normalizeDropoffCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export const DROPOFF_CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Amazon", "Other"] as const;
export type DropoffCarrier = typeof DROPOFF_CARRIERS[number];
