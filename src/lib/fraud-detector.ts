// iter-234 — Pure-rules fraud signal detector helpers (Tier 17 #143).
//
// Stateless functions: each one takes a slice of intake/user data and
// returns zero-or-more `RawFraudSignal` candidates. The caller (cron
// sweep) dedupes via `signalKey` upserts into FraudFlag.
//
// All thresholds are tunable constants — reasonable defaults for a CMRA
// of ~200 active suites. Tighten or loosen via TUNING block.

export type Severity = "low" | "medium" | "high" | "critical";

export type RawFraudSignal = {
  signalKey: string;
  signalType: string;
  severity: Severity;
  entityType: "User" | "MailItem" | "Suite";
  entityId: string;
  userId: string | null;
  suiteNumber: string | null;
  summary: string;
  detail: Record<string, unknown>;
  evidenceCount: number;
};

// ─── Tuning ────────────────────────────────────────────────────────────

export const TUNING = {
  HIGH_VOLUME_SAME_SENDER_THRESHOLD: 10,        // packages from one sender to one suite in...
  HIGH_VOLUME_WINDOW_DAYS: 7,                   // ...this many days → flag
  HIGH_VOLUME_CRITICAL_THRESHOLD: 25,           // critical at 25+
  SUSPENDED_ACCOUNT_PACKAGE_LOOKBACK_DAYS: 30,  // any package after suspension within 30d → flag
  LOW_KYC_TRUST_CUTOFF: 30,                     // iter-189 trust ≤30 + high-value → flag
  HIGH_VALUE_DECLARED_CENTS: 50000,             // $500
  CROSS_SUITE_TRACKING_THRESHOLD: 2,            // same tracking# on ≥2 suites → flag
  NEW_ACCOUNT_AGE_DAYS: 7,                      // account < 7 days old
  NEW_ACCOUNT_PACKAGE_SPIKE: 5,                 // ≥5 packages in first week → flag
  RECIPIENT_NAME_MISMATCH_LOOKBACK_DAYS: 30,    // count mismatches in last N days
  RECIPIENT_NAME_MISMATCH_THRESHOLD: 6,         // ≥6 distinct mismatched recipient names → flag
} as const;

// ─── Signal builders ───────────────────────────────────────────────────

export function detectHighVolumeSameSender(input: {
  suiteNumber: string;
  userId: string | null;
  senderName: string;
  packageCount: number;
  windowStart: Date;
  windowEnd: Date;
}): RawFraudSignal | null {
  if (input.packageCount < TUNING.HIGH_VOLUME_SAME_SENDER_THRESHOLD) return null;
  const week = `${input.windowEnd.getUTCFullYear()}-W${getISOWeek(input.windowEnd)}`;
  const senderKey = input.senderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const severity: Severity = input.packageCount >= TUNING.HIGH_VOLUME_CRITICAL_THRESHOLD ? "critical" : input.packageCount >= 18 ? "high" : "medium";
  return {
    signalKey: `high_volume_sender:${input.suiteNumber}:${senderKey}:${week}`,
    signalType: "high_volume_sender",
    severity,
    entityType: "Suite",
    entityId: input.suiteNumber,
    userId: input.userId,
    suiteNumber: input.suiteNumber,
    summary: `${input.packageCount} packages from "${input.senderName}" → suite #${input.suiteNumber} in last ${TUNING.HIGH_VOLUME_WINDOW_DAYS}d`,
    detail: {
      senderName: input.senderName, packageCount: input.packageCount,
      windowStart: input.windowStart.toISOString(),
      windowEnd: input.windowEnd.toISOString(),
      threshold: TUNING.HIGH_VOLUME_SAME_SENDER_THRESHOLD,
    },
    evidenceCount: input.packageCount,
  };
}

export function detectSuspendedAccountActivity(input: {
  userId: string;
  userName: string | null;
  suiteNumber: string | null;
  suspendedAt: Date | null;
  newPackageCount: number;
  latestPackageAt: Date;
}): RawFraudSignal | null {
  if (input.newPackageCount === 0) return null;
  const dateKey = input.latestPackageAt.toISOString().slice(0, 10);
  return {
    signalKey: `suspended_account_activity:${input.userId}:${dateKey}`,
    signalType: "suspended_account_activity",
    severity: input.newPackageCount >= 3 ? "high" : "medium",
    entityType: "User",
    entityId: input.userId,
    userId: input.userId,
    suiteNumber: input.suiteNumber,
    summary: `Suspended account ${input.userName ?? input.userId} (suite #${input.suiteNumber ?? "—"}) received ${input.newPackageCount} package${input.newPackageCount === 1 ? "" : "s"}`,
    detail: {
      suspendedAt: input.suspendedAt?.toISOString() ?? null,
      latestPackageAt: input.latestPackageAt.toISOString(),
      newPackageCount: input.newPackageCount,
    },
    evidenceCount: input.newPackageCount,
  };
}

export function detectLowKycHighValue(input: {
  mailItemId: string;
  userId: string;
  userName: string | null;
  suiteNumber: string | null;
  kycTrustScore: number;
  declaredValueCents: number;
  intakeAt: Date;
}): RawFraudSignal | null {
  if (input.kycTrustScore > TUNING.LOW_KYC_TRUST_CUTOFF) return null;
  if (input.declaredValueCents < TUNING.HIGH_VALUE_DECLARED_CENTS) return null;
  return {
    signalKey: `low_kyc_high_value:${input.mailItemId}`,
    signalType: "low_kyc_high_value",
    severity: input.kycTrustScore <= 15 ? "high" : "medium",
    entityType: "MailItem",
    entityId: input.mailItemId,
    userId: input.userId,
    suiteNumber: input.suiteNumber,
    summary: `Low KYC trust (${input.kycTrustScore}/100) member ${input.userName ?? input.userId} received $${(input.declaredValueCents / 100).toFixed(0)} package`,
    detail: {
      kycTrustScore: input.kycTrustScore,
      declaredValueCents: input.declaredValueCents,
      intakeAt: input.intakeAt.toISOString(),
    },
    evidenceCount: 1,
  };
}

export function detectRecipientMismatch(input: {
  userId: string;
  userName: string | null;
  suiteNumber: string;
  mismatchedRecipientCount: number;
  exampleNames: string[];
  windowEnd: Date;
}): RawFraudSignal | null {
  if (input.mismatchedRecipientCount < TUNING.RECIPIENT_NAME_MISMATCH_THRESHOLD) return null;
  const month = input.windowEnd.toISOString().slice(0, 7);
  return {
    signalKey: `recipient_mismatch:${input.userId}:${month}`,
    signalType: "recipient_mismatch",
    severity: input.mismatchedRecipientCount >= 12 ? "high" : "medium",
    entityType: "User",
    entityId: input.userId,
    userId: input.userId,
    suiteNumber: input.suiteNumber,
    summary: `Suite #${input.suiteNumber} (${input.userName ?? "—"}) received packages addressed to ${input.mismatchedRecipientCount} different recipient names this month`,
    detail: {
      mismatchedRecipientCount: input.mismatchedRecipientCount,
      exampleNames: input.exampleNames.slice(0, 8),
      lookbackDays: TUNING.RECIPIENT_NAME_MISMATCH_LOOKBACK_DAYS,
    },
    evidenceCount: input.mismatchedRecipientCount,
  };
}

export function detectCrossSuiteTracking(input: {
  trackingNumber: string;
  suiteNumbers: string[];
  itemIds: string[];
}): RawFraudSignal | null {
  if (input.suiteNumbers.length < TUNING.CROSS_SUITE_TRACKING_THRESHOLD) return null;
  return {
    signalKey: `cross_suite_tracking:${input.trackingNumber}`,
    signalType: "cross_suite_tracking",
    severity: "high",
    entityType: "MailItem",
    entityId: input.itemIds[0]!,
    userId: null,
    suiteNumber: input.suiteNumbers[0] ?? null,
    summary: `Tracking # ${input.trackingNumber} appears on ${input.suiteNumbers.length} suites (${input.suiteNumbers.slice(0, 3).join(", ")}…)`,
    detail: {
      trackingNumber: input.trackingNumber,
      suiteNumbers: input.suiteNumbers,
      itemIds: input.itemIds,
    },
    evidenceCount: input.suiteNumbers.length,
  };
}

export function detectNewAccountSpike(input: {
  userId: string;
  userName: string | null;
  suiteNumber: string | null;
  accountCreatedAt: Date;
  packageCount: number;
}): RawFraudSignal | null {
  if (input.packageCount < TUNING.NEW_ACCOUNT_PACKAGE_SPIKE) return null;
  const ageDays = (Date.now() - input.accountCreatedAt.getTime()) / (24 * 3600_000);
  if (ageDays > TUNING.NEW_ACCOUNT_AGE_DAYS) return null;
  return {
    signalKey: `new_account_spike:${input.userId}`,
    signalType: "new_account_spike",
    severity: input.packageCount >= 12 ? "high" : "medium",
    entityType: "User",
    entityId: input.userId,
    userId: input.userId,
    suiteNumber: input.suiteNumber,
    summary: `New account ${input.userName ?? input.userId} (${ageDays.toFixed(1)}d old) received ${input.packageCount} packages`,
    detail: {
      accountCreatedAt: input.accountCreatedAt.toISOString(),
      ageDays: Number(ageDays.toFixed(1)),
      packageCount: input.packageCount,
    },
    evidenceCount: input.packageCount,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getISOWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400_000) + 1) / 7);
  return String(wk).padStart(2, "0");
}

export const SIGNAL_TYPE_LABEL: Record<string, { label: string; emoji: string }> = {
  high_volume_sender:        { label: "High volume same sender",      emoji: "📦" },
  suspended_account_activity:{ label: "Suspended account activity",   emoji: "🚫" },
  low_kyc_high_value:        { label: "Low KYC + high value package", emoji: "💎" },
  recipient_mismatch:        { label: "Recipient name mismatch",       emoji: "👤" },
  cross_suite_tracking:      { label: "Cross-suite tracking #",        emoji: "🔀" },
  new_account_spike:         { label: "New account package spike",     emoji: "⚡" },
};

export const SEVERITY_META: Record<Severity, { bg: string; fg: string; label: string }> = {
  low:      { bg: "#F4F5F7",         fg: "#3B4252",     label: "low" },
  medium:   { bg: "rgba(245,158,11,0.10)", fg: "#92400e", label: "MEDIUM" },
  high:     { bg: "rgba(239,68,68,0.10)",  fg: "#b91c1c", label: "HIGH" },
  critical: { bg: "rgba(127,29,29,0.10)",  fg: "#7f1d1d", label: "CRITICAL" },
};

export function severityRank(s: Severity): number {
  return s === "critical" ? 4 : s === "high" ? 3 : s === "medium" ? 2 : 1;
}
