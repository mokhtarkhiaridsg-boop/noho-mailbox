/**
 * NOHO Mailbox — pre-paid shipping label orders.
 * Types and pricing helpers for the public /shipping flow.
 */

export const MARGIN_MULTIPLIER = 1.10;
export const MIN_MARGIN_CENTS = 100;

export type LabelOrderStatus =
  | "AwaitingPayment"
  | "LinkSent"
  | "Paid"
  | "Printed"
  | "Cancelled";

export type PublicRate = {
  rateObjectId: string;
  carrier: string;
  servicelevel: string;
  shippoCostCents: number;
  customerPriceCents: number;
  marginCents: number;
  estimatedDays: number | null;
  durationTerms: string | null;
};

/** Apply the +10% margin with a minimum $1 floor. */
export function priceWithMargin(shippoCostCents: number): {
  customerPriceCents: number;
  marginCents: number;
} {
  const withMargin = Math.ceil(shippoCostCents * MARGIN_MULTIPLIER);
  const margin = withMargin - shippoCostCents;
  if (margin < MIN_MARGIN_CENTS) {
    return {
      customerPriceCents: shippoCostCents + MIN_MARGIN_CENTS,
      marginCents: MIN_MARGIN_CENTS,
    };
  }
  return { customerPriceCents: withMargin, marginCents: margin };
}
