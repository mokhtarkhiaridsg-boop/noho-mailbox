import { describe, it, expect } from "vitest";

/**
 * Auth validation logic tests — pure functions only.
 * Server actions (signup/login) require a database + session context
 * and are covered by integration tests.
 */

// ── Password strength rules ──────────────────────────────────────────────────
function isStrongPassword(pw: string): boolean {
  return pw.length >= 8;
}

// ── Email format ─────────────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Plan parsing (mirrors auth.ts logic) ────────────────────────────────────
function parsePlan(plan: string | null | undefined): { planName: string | null; planTerm: string | null; isPaid: boolean } {
  const isPaid = !!plan && plan.length > 0 && plan !== "free";
  if (!isPaid) return { planName: null, planTerm: null, isPaid: false };
  const parts = plan!.split("-");
  const rawName = parts[0] ?? "";
  const planName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const planTerm = parts[1] ?? null;
  return { planName, planTerm, isPaid: true };
}

// ── OAuth redirect classification ────────────────────────────────────────────
function getLoginRedirect(role: string, plan: string | null, mailboxStatus: string): string {
  if (role === "ADMIN") return "/admin";
  if (!plan || plan === "Free") return "/pricing?upgrade=1";
  if (mailboxStatus !== "Active") return "/dashboard/pending";
  return "/dashboard";
}

// ─────────────────────────────────────────────────────────────────────────────

describe("password validation", () => {
  it("accepts passwords of 8+ characters", () => {
    expect(isStrongPassword("abcdefgh")).toBe(true);
    expect(isStrongPassword("P@ssw0rd123")).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(isStrongPassword("abc")).toBe(false);
    expect(isStrongPassword("1234567")).toBe(false);
  });
});

describe("email validation", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("hello@nohomailbox.org")).toBe(true);
    expect(isValidEmail("test+tag@domain.co.uk")).toBe(true);
  });

  it("rejects malformed email addresses", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("no@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("plan parsing", () => {
  it("parses paid plan with term correctly", () => {
    const result = parsePlan("basic-3");
    expect(result.isPaid).toBe(true);
    expect(result.planName).toBe("Basic");
    expect(result.planTerm).toBe("3");
  });

  it("parses paid plan without term", () => {
    const result = parsePlan("premium");
    expect(result.isPaid).toBe(true);
    expect(result.planName).toBe("Premium");
    expect(result.planTerm).toBeNull();
  });

  it("treats 'free' as unpaid", () => {
    expect(parsePlan("free").isPaid).toBe(false);
    expect(parsePlan(null).isPaid).toBe(false);
    expect(parsePlan("").isPaid).toBe(false);
  });

  it("capitalises plan names", () => {
    expect(parsePlan("business-6").planName).toBe("Business");
    expect(parsePlan("basic-14").planName).toBe("Basic");
  });
});

describe("login redirect logic", () => {
  it("sends admins to /admin", () => {
    expect(getLoginRedirect("ADMIN", "Business", "Active")).toBe("/admin");
  });

  it("sends free members to /pricing", () => {
    expect(getLoginRedirect("USER", null, "Pending")).toBe("/pricing?upgrade=1");
    expect(getLoginRedirect("USER", "Free", "Active")).toBe("/pricing?upgrade=1");
  });

  it("sends paid members with pending mailbox to /dashboard/pending", () => {
    expect(getLoginRedirect("USER", "Basic", "Pending")).toBe("/dashboard/pending");
    expect(getLoginRedirect("USER", "Premium", "Assigned")).toBe("/dashboard/pending");
  });

  it("sends active paid members to /dashboard", () => {
    expect(getLoginRedirect("USER", "Business", "Active")).toBe("/dashboard");
  });
});
