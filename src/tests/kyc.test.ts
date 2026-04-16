import { describe, it, expect } from "vitest";

/**
 * KYC / CMRA compliance business rule tests.
 */

// ── KYC status transitions ────────────────────────────────────────────────────
type KycStatus = "Pending" | "Submitted" | "Approved" | "Rejected";

function canSubmitKyc(currentStatus: KycStatus): boolean {
  return currentStatus === "Pending" || currentStatus === "Rejected";
}

function kycActivatesMailbox(
  kycDecision: "Approved" | "Rejected",
  hasPaidPlan: boolean,
  hasSuite: boolean
): boolean {
  return kycDecision === "Approved" && hasPaidPlan && hasSuite;
}

// ── File validation (mirrors kyc.ts) ─────────────────────────────────────────
const MAX_BYTES = 8 * 1024 * 1024;

function validateKycFile(
  file: { size: number; type: string } | null,
  label: string
): string | null {
  if (!file || file.size === 0) return `${label} is required`;
  if (file.size > MAX_BYTES) return `${label} is larger than 8 MB`;
  return null;
}

// ── ID expiration date validation ────────────────────────────────────────────
function isIdExpired(expDateStr: string | null | undefined): boolean {
  if (!expDateStr) return false; // no exp date = not expired
  const exp = new Date(expDateStr + "T23:59:59");
  return exp < new Date();
}

// ── CMRA compliance checks ────────────────────────────────────────────────────
function meetsMinimumIdRequirement(
  primaryId: { size: number } | null,
  secondaryId: { size: number } | null
): boolean {
  return !!(primaryId && primaryId.size > 0 && secondaryId && secondaryId.size > 0);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("KYC submission eligibility", () => {
  it("allows submission when status is Pending", () => {
    expect(canSubmitKyc("Pending")).toBe(true);
  });

  it("allows re-submission after Rejection", () => {
    expect(canSubmitKyc("Rejected")).toBe(true);
  });

  it("blocks submission when already Submitted or Approved", () => {
    expect(canSubmitKyc("Submitted")).toBe(false);
    expect(canSubmitKyc("Approved")).toBe(false);
  });
});

describe("KYC approval activates mailbox", () => {
  it("activates mailbox when approved + paid plan + suite assigned", () => {
    expect(kycActivatesMailbox("Approved", true, true)).toBe(true);
  });

  it("does not activate on rejection", () => {
    expect(kycActivatesMailbox("Rejected", true, true)).toBe(false);
  });

  it("does not activate without a paid plan", () => {
    expect(kycActivatesMailbox("Approved", false, true)).toBe(false);
  });

  it("does not activate without a suite number", () => {
    expect(kycActivatesMailbox("Approved", true, false)).toBe(false);
  });
});

describe("KYC file validation", () => {
  it("accepts a valid file under 8 MB", () => {
    expect(validateKycFile({ size: 1024 * 1024, type: "image/jpeg" }, "Primary ID")).toBeNull();
  });

  it("rejects null/missing files", () => {
    expect(validateKycFile(null, "Form 1583")).toBeTruthy();
    expect(validateKycFile({ size: 0, type: "image/png" }, "Primary ID")).toBeTruthy();
  });

  it("rejects files over 8 MB", () => {
    const error = validateKycFile({ size: 9 * 1024 * 1024, type: "application/pdf" }, "Form 1583");
    expect(error).toContain("8 MB");
  });
});

describe("ID expiration date", () => {
  it("returns false when no exp date provided", () => {
    expect(isIdExpired(null)).toBe(false);
    expect(isIdExpired(undefined)).toBe(false);
  });

  it("detects a past expiration date as expired", () => {
    expect(isIdExpired("2020-01-01")).toBe(true);
  });

  it("treats a future date as not expired", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const str = future.toISOString().slice(0, 10);
    expect(isIdExpired(str)).toBe(false);
  });
});

describe("CMRA two-ID requirement", () => {
  const validId = { size: 500_000 };

  it("passes when both IDs provided", () => {
    expect(meetsMinimumIdRequirement(validId, validId)).toBe(true);
  });

  it("fails when primary ID is missing", () => {
    expect(meetsMinimumIdRequirement(null, validId)).toBe(false);
  });

  it("fails when secondary ID is missing", () => {
    expect(meetsMinimumIdRequirement(validId, null)).toBe(false);
  });

  it("fails when both are missing", () => {
    expect(meetsMinimumIdRequirement(null, null)).toBe(false);
  });
});
