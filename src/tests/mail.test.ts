import { describe, it, expect } from "vitest";

/**
 * Mail status and request logic tests — pure business rules.
 */

// ── Status colour mapping (mirrors DashboardClient) ──────────────────────────
function statusCategory(status: string): "done" | "pending" | "active" | "held" | "default" {
  if (status === "Forwarded" || status === "Picked Up" || status === "Scanned") return "done";
  if (status === "Awaiting Pickup" || status === "Ready for Pickup") return "active";
  if (status.includes("Requested")) return "pending";
  if (status === "Held") return "held";
  return "default";
}

// ── Mail request kind mapping ─────────────────────────────────────────────────
const REQUEST_TO_STATUS: Record<string, string> = {
  Scan: "Scanned",
  Forward: "Forwarded",
  Discard: "Discarded",
  Pickup: "Picked Up",
  Hold: "Held",
  Shred: "Shredded",
  Deposit: "Deposited",
};

function fulfillmentStatus(kind: string): string {
  return REQUEST_TO_STATUS[kind] ?? "Completed";
}

// ── Mail type validation ──────────────────────────────────────────────────────
const VALID_TYPES = ["Letter", "Package"];
const isValidMailType = (t: string) => VALID_TYPES.includes(t);

// ── Date formatting (mirrors logMail) ────────────────────────────────────────
function formatMailDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("mail status categories", () => {
  it("marks forwarded/picked-up/scanned as done", () => {
    expect(statusCategory("Forwarded")).toBe("done");
    expect(statusCategory("Picked Up")).toBe("done");
    expect(statusCategory("Scanned")).toBe("done");
  });

  it("marks awaiting/ready-for-pickup as active", () => {
    expect(statusCategory("Awaiting Pickup")).toBe("active");
    expect(statusCategory("Ready for Pickup")).toBe("active");
  });

  it("marks requested statuses as pending", () => {
    expect(statusCategory("Forward Requested")).toBe("pending");
    expect(statusCategory("Scan Requested")).toBe("pending");
    expect(statusCategory("X Requested")).toBe("pending");
  });

  it("marks held as held", () => {
    expect(statusCategory("Held")).toBe("held");
  });

  it("marks received as default", () => {
    expect(statusCategory("Received")).toBe("default");
  });
});

describe("request fulfillment status mapping", () => {
  it("maps every request kind to the correct final status", () => {
    expect(fulfillmentStatus("Scan")).toBe("Scanned");
    expect(fulfillmentStatus("Forward")).toBe("Forwarded");
    expect(fulfillmentStatus("Discard")).toBe("Discarded");
    expect(fulfillmentStatus("Pickup")).toBe("Picked Up");
    expect(fulfillmentStatus("Hold")).toBe("Held");
    expect(fulfillmentStatus("Shred")).toBe("Shredded");
    expect(fulfillmentStatus("Deposit")).toBe("Deposited");
  });

  it("falls back to 'Completed' for unknown kinds", () => {
    expect(fulfillmentStatus("Unknown")).toBe("Completed");
  });
});

describe("mail type validation", () => {
  it("accepts Letter and Package", () => {
    expect(isValidMailType("Letter")).toBe(true);
    expect(isValidMailType("Package")).toBe(true);
  });

  it("rejects other strings", () => {
    expect(isValidMailType("Parcel")).toBe(false);
    expect(isValidMailType("")).toBe(false);
  });
});

describe("mail date formatting", () => {
  it("formats dates in 'Mon DD' style", () => {
    const date = new Date("2025-06-15T12:00:00Z");
    const formatted = formatMailDate(date);
    // en-US short: "Jun 15"
    expect(formatted).toMatch(/Jun/i);
    expect(formatted).toContain("15");
  });

  it("does not include the year", () => {
    const formatted = formatMailDate(new Date("2025-01-01T00:00:00Z"));
    expect(formatted).not.toContain("2025");
  });
});
