"use server";

/**
 * iter-224 — Per-member preferred-carrier (Tier 16 #133).
 *
 * Member picks a favorite carrier for forwarding (iter-129) → the
 * rate-quote helper consumes the preference + picks the cheapest
 * option WITHIN that carrier family. Falls back to global-cheapest
 * when the preferred carrier doesn't have a quote for the
 * destination.
 *
 * Member has full control via SettingsPanel toggle. Preference is
 * stored on User; admin can also set it on behalf of a member from
 * the customer drawer.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
// Constants + non-async helpers live in lib/ — Next 16 forbids
// non-async exports in "use server" files.
import {
  CARRIER_OPTIONS,
  CARRIER_LABELS,
  asCarrierPreference,
  type CarrierPreference,
} from "@/lib/carrierPreference-types";
// Re-export so existing imports of CARRIER_OPTIONS / CARRIER_LABELS /
// CarrierPreference / asCarrierPreference from the action path keep
// working while we migrate callers.
export { CARRIER_OPTIONS, CARRIER_LABELS, asCarrierPreference };
export type { CarrierPreference };

export async function getMyCarrierPreference(): Promise<{ preferred: CarrierPreference }> {
  const session = await verifySession();
  const u = await prisma.user.findUnique({ where: { id: session.id! }, select: { preferredCarrier: true } });
  return { preferred: asCarrierPreference(u?.preferredCarrier) };
}

export async function setMyCarrierPreference(input: { preferred: string }): Promise<{ success: boolean; preferred: CarrierPreference }> {
  const session = await verifySession();
  const preferred = asCarrierPreference(input.preferred);
  await prisma.user.update({
    where: { id: session.id! },
    data: { preferredCarrier: preferred === "Cheapest" ? null : preferred },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!, actorRole: session.role ?? "MEMBER",
      action: "carrier_preference.updated",
      entityType: "User", entityId: session.id!,
      metadata: JSON.stringify({ preferred }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { success: true, preferred };
}

// Helper used by iter-186 rate-quote hooking. Caller passes the full
// rates array + the member's userId; we re-pick the lowest-cost quote
// within the preferred carrier family. Falls back to the input array's
// already-cheapest pick (caller's responsibility) when no match.
export type RateQuoteOption = {
  carrier: string;
  service: string;
  totalCents: number;
  etaDays: number | null;
  hasInsurance: boolean;
};

export async function pickRateForMember(input: {
  userId: string;
  rates: RateQuoteOption[];
}): Promise<{ picked: RateQuoteOption | null; reason: "preferred" | "fallback_cheapest" | "no_rates" }> {
  if (input.rates.length === 0) return { picked: null, reason: "no_rates" };
  const u = await prisma.user.findUnique({ where: { id: input.userId }, select: { preferredCarrier: true } });
  const pref = asCarrierPreference(u?.preferredCarrier);
  const sortedByPrice = input.rates.slice().sort((a, b) => a.totalCents - b.totalCents);

  if (pref === "Cheapest") return { picked: sortedByPrice[0]!, reason: "preferred" };

  const inFamily = sortedByPrice.filter((r) => r.carrier.toUpperCase() === pref.toUpperCase());
  if (inFamily.length > 0) return { picked: inFamily[0]!, reason: "preferred" };
  return { picked: sortedByPrice[0]!, reason: "fallback_cheapest" };
}
