import { describe, it, expect } from "vitest";

/**
 * Delivery pricing and zone logic tests.
 */

// ── Delivery status progression ──────────────────────────────────────────────
type DeliveryStatus = "Pending" | "Picked Up" | "In Transit" | "Delivered";

const STATUS_ORDER: DeliveryStatus[] = ["Pending", "Picked Up", "In Transit", "Delivered"];

function isValidStatusTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
}

function isDeliveryComplete(status: DeliveryStatus): boolean {
  return status === "Delivered";
}

// ── Delivery tier labels ──────────────────────────────────────────────────────
type DeliveryTier = "Standard" | "Rush" | "WhiteGlove";

const TIER_LABELS: Record<DeliveryTier, string> = {
  Standard: "Standard",
  Rush: "Rush (Same-Day)",
  WhiteGlove: "White Glove",
};

function tierLabel(tier: DeliveryTier): string {
  return TIER_LABELS[tier];
}

// ── Price formatting ──────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// ── POD (proof of delivery) availability ────────────────────────────────────
function hasPod(status: DeliveryStatus, podPhotoUrl: string | null): boolean {
  return status === "Delivered" && !!podPhotoUrl;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("delivery status transitions", () => {
  it("allows forward transitions", () => {
    expect(isValidStatusTransition("Pending", "Picked Up")).toBe(true);
    expect(isValidStatusTransition("Picked Up", "In Transit")).toBe(true);
    expect(isValidStatusTransition("In Transit", "Delivered")).toBe(true);
  });

  it("allows skipping intermediate statuses", () => {
    expect(isValidStatusTransition("Pending", "Delivered")).toBe(true);
    expect(isValidStatusTransition("Pending", "In Transit")).toBe(true);
  });

  it("blocks backward transitions", () => {
    expect(isValidStatusTransition("Delivered", "In Transit")).toBe(false);
    expect(isValidStatusTransition("In Transit", "Pending")).toBe(false);
    expect(isValidStatusTransition("Picked Up", "Pending")).toBe(false);
  });

  it("blocks same-status transition", () => {
    expect(isValidStatusTransition("Pending", "Pending")).toBe(false);
    expect(isValidStatusTransition("Delivered", "Delivered")).toBe(false);
  });
});

describe("delivery completion", () => {
  it("marks only 'Delivered' as complete", () => {
    expect(isDeliveryComplete("Delivered")).toBe(true);
  });

  it("marks all other statuses as incomplete", () => {
    expect(isDeliveryComplete("Pending")).toBe(false);
    expect(isDeliveryComplete("Picked Up")).toBe(false);
    expect(isDeliveryComplete("In Transit")).toBe(false);
  });
});

describe("delivery tier labels", () => {
  it("returns correct label for each tier", () => {
    expect(tierLabel("Standard")).toBe("Standard");
    expect(tierLabel("Rush")).toContain("Rush");
    expect(tierLabel("WhiteGlove")).toContain("White Glove");
  });
});

describe("price formatting", () => {
  it("formats whole dollar amounts", () => {
    expect(formatPrice(5)).toBe("$5.00");
    expect(formatPrice(24)).toBe("$24.00");
  });

  it("formats fractional prices", () => {
    expect(formatPrice(12.5)).toBe("$12.50");
    expect(formatPrice(0.99)).toBe("$0.99");
  });
});

describe("proof of delivery", () => {
  it("has POD when delivered with photo", () => {
    expect(hasPod("Delivered", "https://blob.vercel.com/pod.jpg")).toBe(true);
  });

  it("no POD when delivered but no photo", () => {
    expect(hasPod("Delivered", null)).toBe(false);
  });

  it("no POD when not yet delivered", () => {
    expect(hasPod("In Transit", "https://blob.vercel.com/pod.jpg")).toBe(false);
  });
});
