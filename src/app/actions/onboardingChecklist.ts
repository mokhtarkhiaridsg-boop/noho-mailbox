"use server";

// iter-114 — Member onboarding checklist.
//
// Derives a "what's left to set up" list from the member's current user
// row + a few side queries (referrals, notif prefs). No schema changes —
// every item is computed from data we already have. Returns enough to
// drive the dashboard checklist card: per-item done/pending + a deep
// link to where the member would go to complete it.

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ChecklistItem = {
  key: ChecklistKey;
  label: string;
  description: string;
  done: boolean;
  href: string;
  emoji: string;
};

export type ChecklistKey =
  | "phone"
  | "id_uploaded"
  | "form_1583"
  | "kyc_approved"
  | "notif_prefs"
  | "two_factor"
  | "auto_renew"
  | "refer_friend";

export type ChecklistResult = {
  items: ChecklistItem[];
  doneCount: number;
  totalCount: number;
  percentComplete: number;
  allDone: boolean;
};

export async function getMyOnboardingChecklist(): Promise<ChecklistResult> {
  const session = await verifySession();
  if (!session.id) {
    return { items: [], doneCount: 0, totalCount: 0, percentComplete: 0, allDone: false };
  }
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      phone: true,
      kycIdImageUrl: true,
      kycForm1583Url: true,
      kycStatus: true,
      notifPrefs: true,
      totpEnabled: true,
      planAutoRenew: true,
    },
  });
  if (!u) {
    return { items: [], doneCount: 0, totalCount: 0, percentComplete: 0, allDone: false };
  }
  const referralCount = await prisma.referral.count({
    where: { referrerId: session.id, refereeId: { not: null } },
  });

  const items: ChecklistItem[] = [
    {
      key: "phone",
      label: "Add a phone number",
      description: "We'll text you when packages arrive (opt-in).",
      done: Boolean(u.phone && u.phone.trim()),
      href: "/dashboard?tab=settings",
      emoji: "📱",
    },
    {
      key: "id_uploaded",
      label: "Upload primary ID",
      description: "Driver's license, passport, or state ID.",
      done: Boolean(u.kycIdImageUrl),
      href: "/dashboard?tab=settings",
      emoji: "🪪",
    },
    {
      key: "form_1583",
      label: "Sign Form 1583",
      description: "USPS-required for any CMRA mailbox.",
      done: Boolean(u.kycForm1583Url),
      href: "/dashboard?tab=settings",
      emoji: "📄",
    },
    {
      key: "kyc_approved",
      label: "Pass KYC review",
      description: "Admin reviews your ID + 1583 within 1 business day.",
      done: u.kycStatus === "Approved",
      href: "/dashboard?tab=settings",
      emoji: "✅",
    },
    {
      key: "notif_prefs",
      label: "Set notification preferences",
      description: "Choose email / SMS / in-app per event type.",
      done: Boolean(u.notifPrefs && u.notifPrefs.trim() && u.notifPrefs !== "{}"),
      href: "/dashboard?tab=settings",
      emoji: "🔔",
    },
    {
      key: "two_factor",
      label: "Enable two-factor auth",
      description: "Adds a 6-digit code to every sign-in.",
      done: u.totpEnabled,
      href: "/dashboard?tab=settings",
      emoji: "🔐",
    },
    {
      key: "auto_renew",
      label: "Turn on auto-renew",
      description: "Never miss a renewal again.",
      done: u.planAutoRenew,
      href: "/dashboard?tab=settings",
      emoji: "🔁",
    },
    {
      key: "refer_friend",
      label: "Refer a friend",
      description: "Both get a $10 wallet credit on signup.",
      done: referralCount > 0,
      href: "/dashboard?tab=settings",
      emoji: "🎁",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percentComplete = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return {
    items,
    doneCount,
    totalCount,
    percentComplete,
    allDone: doneCount === totalCount,
  };
}
