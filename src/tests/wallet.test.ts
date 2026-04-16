import { describe, it, expect } from "vitest";

/**
 * Wallet and payment calculation tests.
 */

// ── Wallet balance maths ──────────────────────────────────────────────────────
function applyCharge(balanceCents: number, chargeCents: number): number {
  return Math.max(0, balanceCents - chargeCents);
}

function applyTopUp(balanceCents: number, topUpCents: number): number {
  if (topUpCents <= 0) throw new Error("Top-up amount must be positive");
  return balanceCents + topUpCents;
}

// ── Invoice total calculation ────────────────────────────────────────────────
function calcInvoiceTotal(amountCents: number, taxCents: number): number {
  return amountCents + taxCents;
}

// ── Security deposit logic ───────────────────────────────────────────────────
const DEPOSIT_AMOUNT_CENTS = 5000; // $50
const KEY_FEE_CENTS = 2500;        // $25

function chargeKeyReplacement(depositCents: number): { newDeposit: number; charged: number } {
  const charged = Math.min(KEY_FEE_CENTS, depositCents);
  return { newDeposit: depositCents - charged, charged };
}

// ── Amount formatting ─────────────────────────────────────────────────────────
function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("wallet balance", () => {
  it("correctly subtracts a charge", () => {
    expect(applyCharge(10000, 3000)).toBe(7000);
  });

  it("floors at zero — never goes negative", () => {
    expect(applyCharge(1000, 5000)).toBe(0);
    expect(applyCharge(0, 100)).toBe(0);
  });

  it("correctly adds a top-up", () => {
    expect(applyTopUp(5000, 10000)).toBe(15000);
    expect(applyTopUp(0, 2000)).toBe(2000);
  });

  it("throws on non-positive top-up", () => {
    expect(() => applyTopUp(5000, 0)).toThrow();
    expect(() => applyTopUp(5000, -100)).toThrow();
  });
});

describe("invoice total", () => {
  it("sums amount and tax", () => {
    expect(calcInvoiceTotal(9500, 500)).toBe(10000);
  });

  it("handles zero tax", () => {
    expect(calcInvoiceTotal(2000, 0)).toBe(2000);
  });
});

describe("security deposit & key fee", () => {
  it("charges $25 key fee from full deposit", () => {
    const { newDeposit, charged } = chargeKeyReplacement(DEPOSIT_AMOUNT_CENTS);
    expect(charged).toBe(KEY_FEE_CENTS);
    expect(newDeposit).toBe(DEPOSIT_AMOUNT_CENTS - KEY_FEE_CENTS);
  });

  it("partial charge when deposit is less than key fee", () => {
    const { newDeposit, charged } = chargeKeyReplacement(1000);
    expect(charged).toBe(1000);
    expect(newDeposit).toBe(0);
  });

  it("zero charge on empty deposit", () => {
    const { newDeposit, charged } = chargeKeyReplacement(0);
    expect(charged).toBe(0);
    expect(newDeposit).toBe(0);
  });
});

describe("currency formatting", () => {
  it("formats cents as dollar strings", () => {
    expect(centsToDisplay(5000)).toBe("$50.00");
    expect(centsToDisplay(2500)).toBe("$25.00");
    expect(centsToDisplay(199)).toBe("$1.99");
    expect(centsToDisplay(0)).toBe("$0.00");
  });
});
