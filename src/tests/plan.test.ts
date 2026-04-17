import { describe, it, expect } from "vitest";
import { getPlanStatus, planStatusMessage } from "@/lib/plan";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("getPlanStatus", () => {
  it("returns 'active' when no due date is set", () => {
    expect(getPlanStatus(null)).toBe("active");
    expect(getPlanStatus(undefined)).toBe("active");
  });

  it("returns 'active' when due date is more than 14 days away", () => {
    expect(getPlanStatus(daysFromNow(20))).toBe("active");
    expect(getPlanStatus(daysFromNow(30))).toBe("active");
  });

  it("returns 'warning' when due date is 1-13 days away", () => {
    expect(getPlanStatus(daysFromNow(13))).toBe("warning");
    expect(getPlanStatus(daysFromNow(7))).toBe("warning");
    expect(getPlanStatus(daysFromNow(1))).toBe("warning");
  });

  it("returns 'grace' when plan expired 1-9 days ago", () => {
    expect(getPlanStatus(daysFromNow(-1))).toBe("grace");
    expect(getPlanStatus(daysFromNow(-5))).toBe("grace");
    expect(getPlanStatus(daysFromNow(-9))).toBe("grace");
  });

  it("returns 'expired' when plan expired 11+ days ago", () => {
    expect(getPlanStatus(daysFromNow(-11))).toBe("expired");
    expect(getPlanStatus(daysFromNow(-30))).toBe("expired");
  });

  it("returns 'active' for an invalid date string", () => {
    expect(getPlanStatus("not-a-date")).toBe("active");
  });
});

describe("planStatusMessage", () => {
  it("returns a message containing the due date for warning status", () => {
    const date = daysFromNow(5);
    const msg = planStatusMessage(date, "warning");
    expect(msg).toContain(date);
    expect(msg.toLowerCase()).toContain("renew");
  });

  it("returns a grace message with days remaining", () => {
    const date = daysFromNow(-3);
    const msg = planStatusMessage(date, "grace");
    expect(msg.toLowerCase()).toContain("grace");
  });

  it("returns a suspended message for expired status", () => {
    const date = daysFromNow(-15);
    const msg = planStatusMessage(date, "expired");
    expect(msg.toLowerCase()).toContain("suspend");
  });
});
