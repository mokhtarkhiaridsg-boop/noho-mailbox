// iter-189 — KYC trust-score primitives.
// Lives outside any "use server" file so admin UI + cron sweep + the
// scoring action share the same vocabulary.

export type KycTrustBand = "Trusted" | "Verified" | "Watch" | "At Risk";

export type KycAxis = {
  key: string;
  label: string;
  contribution: number;       // signed, post-cap
  detail: string;             // human-readable
  passed: boolean;            // true = full credit; false = 0/penalty
};

// Score lives in 0-100. Axes contribute positive credit; expirations +
// missing IDs apply penalties. Clamped at the end so a fully-clean
// member lands at exactly 100 and a fully-empty new signup lands near 0.
export type KycTrustResult = {
  userId: string;
  score: number;              // 0-100
  band: KycTrustBand;
  axes: KycAxis[];
  flags: string[];            // axis keys that failed (for at-a-glance triage)
  computedAtIso: string;
};

export function bandFor(score: number): KycTrustBand {
  if (score >= 85) return "Trusted";
  if (score >= 65) return "Verified";
  if (score >= 40) return "Watch";
  return "At Risk";
}

export function bandColor(b: KycTrustBand): { bg: string; fg: string } {
  if (b === "Trusted")  return { bg: "rgba(34,197,94,0.10)",   fg: "#15803d" };
  if (b === "Verified") return { bg: "rgba(25,118,255,0.10)",  fg: "#0F5BD9" };
  if (b === "Watch")    return { bg: "rgba(245,158,11,0.12)",  fg: "#92400e" };
  return { bg: "rgba(239,68,68,0.10)", fg: "#991b1b" };
}
