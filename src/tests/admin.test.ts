import { describe, it, expect } from "vitest";

/**
 * Admin business rule tests — pure functions extracted from admin logic.
 */

// ── Suite number validation ──────────────────────────────────────────────────
function isValidSuiteNumber(suite: string): boolean {
  return suite.trim().length > 0;
}

// ── Mailbox status transitions ───────────────────────────────────────────────
type MailboxStatus = "Pending" | "Assigned" | "Active" | "Suspended";

const VALID_MAILBOX_STATUSES: MailboxStatus[] = ["Pending", "Assigned", "Active", "Suspended"];

function isValidMailboxStatus(s: string): s is MailboxStatus {
  return VALID_MAILBOX_STATUSES.includes(s as MailboxStatus);
}

function canAccessDashboard(mailboxStatus: MailboxStatus): boolean {
  return mailboxStatus === "Active";
}

// ── Plan due date parsing ────────────────────────────────────────────────────
function isDueDateOverdue(planDueDate: string | null | undefined): boolean {
  if (!planDueDate) return false;
  return new Date(planDueDate + "T23:59:59") < new Date();
}

// ── Bulk assignment helper ───────────────────────────────────────────────────
function nextAvailableSuite(taken: Set<string>, start: number): number {
  let n = start;
  while (taken.has(String(n))) n += 1;
  return n;
}

// ── Customer suspend/reactivate state ────────────────────────────────────────
function suspendCustomerState(): { status: string; mailboxStatus: MailboxStatus } {
  return { status: "Expired", mailboxStatus: "Suspended" };
}
function reactivateCustomerState(): { status: string; mailboxStatus: MailboxStatus } {
  return { status: "Active", mailboxStatus: "Active" };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("suite number validation", () => {
  it("accepts numeric and alphanumeric suite numbers", () => {
    expect(isValidSuiteNumber("24")).toBe(true);
    expect(isValidSuiteNumber("3009")).toBe(true);
    expect(isValidSuiteNumber("A1")).toBe(true);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidSuiteNumber("")).toBe(false);
    expect(isValidSuiteNumber("   ")).toBe(false);
  });
});

describe("mailbox status validation", () => {
  it("accepts the four valid statuses", () => {
    expect(isValidMailboxStatus("Pending")).toBe(true);
    expect(isValidMailboxStatus("Assigned")).toBe(true);
    expect(isValidMailboxStatus("Active")).toBe(true);
    expect(isValidMailboxStatus("Suspended")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isValidMailboxStatus("Closed")).toBe(false);
    expect(isValidMailboxStatus("")).toBe(false);
  });
});

describe("dashboard access gate", () => {
  it("allows access only for Active mailbox", () => {
    expect(canAccessDashboard("Active")).toBe(true);
  });

  it("blocks access for Pending / Assigned / Suspended", () => {
    expect(canAccessDashboard("Pending")).toBe(false);
    expect(canAccessDashboard("Assigned")).toBe(false);
    expect(canAccessDashboard("Suspended")).toBe(false);
  });
});

describe("plan due date overdue check", () => {
  it("returns false when no due date set", () => {
    expect(isDueDateOverdue(null)).toBe(false);
    expect(isDueDateOverdue(undefined)).toBe(false);
  });

  it("returns true for a past date", () => {
    expect(isDueDateOverdue("2020-01-01")).toBe(true);
  });

  it("returns false for a future date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isDueDateOverdue(future.toISOString().slice(0, 10))).toBe(false);
  });
});

describe("bulk mailbox assignment — next available suite", () => {
  it("finds next suite when start is free", () => {
    const taken = new Set(["1", "2", "4"]);
    expect(nextAvailableSuite(taken, 3)).toBe(3);
  });

  it("skips taken suites", () => {
    const taken = new Set(["3", "4", "5"]);
    expect(nextAvailableSuite(taken, 3)).toBe(6);
  });

  it("returns start suite when set is empty", () => {
    expect(nextAvailableSuite(new Set(), 100)).toBe(100);
  });
});

describe("suspend / reactivate customer state", () => {
  it("sets correct suspend state", () => {
    const state = suspendCustomerState();
    expect(state.status).toBe("Expired");
    expect(state.mailboxStatus).toBe("Suspended");
  });

  it("sets correct reactivate state", () => {
    const state = reactivateCustomerState();
    expect(state.status).toBe("Active");
    expect(state.mailboxStatus).toBe("Active");
  });
});
