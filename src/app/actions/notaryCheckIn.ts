"use server";

/**
 * iter-174 — Notary witness check-in (Tier 11 #83).
 *
 * Companion to iter-160's NotaryBookingCalendar. When a member arrives
 * for their notary appointment, admin taps "Check in" → captures a
 * timestamp + the ID type presented + optional witness name. After
 * the notarization, admin attaches a Blob URL to the signed-document
 * scan and taps "Complete" — that freezes the row.
 *
 * Audit trail on every state transition. Member webhook fires
 * `appointment.upcoming` event with `kind: "notary_completed"` so
 * power-users can pipe receipts into their tooling.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";

const ID_TYPES = ["DL", "Passport", "State ID", "Military", "Other"] as const;
type IdType = typeof ID_TYPES[number];

export type NotaryCheckInRow = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
  date: string;
  time: string;
  type: string;
  status: string;
  notes: string | null;
  createdAtIso: string;
  checkedInAtIso: string | null;
  idPresented: IdType | null;
  idPresentedNumber: string | null;
  signedDocumentUrl: string | null;
  completedAtIso: string | null;
  witnessName: string | null;
  noShowAtIso: string | null;
  noShowReason: string | null;
  adminNotes: string | null;
};

export async function listNotaryCheckIns(input: { date?: string; status?: string | "all" } = {}): Promise<NotaryCheckInRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.date) where.date = input.date;
  if (input.status && input.status !== "all") where.status = input.status;
  const rows = await prisma.notaryBooking.findMany({
    where,
    orderBy: [{ date: "desc" }, { time: "asc" }],
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, suiteNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    customerName: r.user.name,
    customerEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    date: r.date,
    time: r.time,
    type: r.type,
    status: r.status,
    notes: r.notes,
    createdAtIso: r.createdAt.toISOString(),
    checkedInAtIso: r.checkedInAt?.toISOString() ?? null,
    idPresented: (ID_TYPES as readonly string[]).includes(r.idPresented ?? "") ? (r.idPresented as IdType) : null,
    idPresentedNumber: r.idPresentedNumber,
    signedDocumentUrl: r.signedDocumentUrl,
    completedAtIso: r.completedAt?.toISOString() ?? null,
    witnessName: r.witnessName,
    noShowAtIso: r.noShowAt?.toISOString() ?? null,
    noShowReason: r.noShowReason,
    adminNotes: r.adminNotes,
  }));
}

export async function checkInNotaryBooking(input: {
  id: string;
  idPresented: IdType;
  idPresentedNumber?: string;
  witnessName?: string;
  adminNotes?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  if (!(ID_TYPES as readonly string[]).includes(input.idPresented)) return { error: "Invalid ID type." };
  const row = await prisma.notaryBooking.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Booking not found." };
  if (row.completedAt) return { error: "Booking is already completed." };
  if (row.status === "Cancelled") return { error: "Booking is cancelled." };

  const data = {
    status: "Checked In",
    checkedInAt: new Date(),
    checkedInById: actor.id ?? null,
    idPresented: input.idPresented,
    idPresentedNumber: input.idPresentedNumber?.trim().slice(0, 40) || null,
    witnessName: input.witnessName?.trim().slice(0, 80) || null,
    adminNotes: input.adminNotes?.trim().slice(0, 500) || null,
    noShowAt: null,
    noShowReason: null,
  };
  await prisma.$transaction([
    prisma.notaryBooking.update({ where: { id: row.id }, data }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "notary.checked_in",
        entityType: "NotaryBooking",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, idPresented: input.idPresented, hasWitness: !!data.witnessName, type: row.type }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function attachSignedDocument(input: { id: string; signedDocumentUrl: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const url = input.signedDocumentUrl.trim();
  try { new URL(url); } catch { return { error: "Invalid URL." }; }
  const row = await prisma.notaryBooking.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Booking not found." };
  if (row.completedAt) return { error: "Booking already complete." };
  await prisma.$transaction([
    prisma.notaryBooking.update({ where: { id: row.id }, data: { signedDocumentUrl: url } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "notary.signed_doc_attached",
        entityType: "NotaryBooking",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, urlHost: new URL(url).host }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function completeNotaryBooking(input: { id: string; signedDocumentUrl?: string; adminNotes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.notaryBooking.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Booking not found." };
  if (row.completedAt) return { error: "Already completed." };
  if (!row.checkedInAt) return { error: "Member must be checked in before completion." };
  const newDocUrl = input.signedDocumentUrl?.trim() || row.signedDocumentUrl;
  if (newDocUrl) {
    try { new URL(newDocUrl); } catch { return { error: "Invalid signed-document URL." }; }
  }
  const adminNotes = input.adminNotes?.trim().slice(0, 500) ?? row.adminNotes;
  const data = {
    status: "Completed",
    completedAt: new Date(),
    completedById: actor.id ?? null,
    signedDocumentUrl: newDocUrl,
    adminNotes,
  };
  await prisma.$transaction([
    prisma.notaryBooking.update({ where: { id: row.id }, data }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "notary.completed",
        entityType: "NotaryBooking",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, type: row.type, hasDoc: !!newDocUrl }),
      },
    }),
  ]);

  // Member webhook — power-users pipe notary completions into their
  // own tooling. Reuse the appointment.upcoming channel with kind
  // detail so subscribers can disambiguate.
  void fireMemberWebhooks(row.userId, "appointment.upcoming", {
    text: `✓ Notary appointment complete · ${row.type}`,
    url: "https://nohomailbox.org/dashboard?tab=services",
    detail: {
      bookingId: row.id,
      kind: "notary_completed",
      type: row.type,
      date: row.date,
      time: row.time,
      hasDoc: !!newDocUrl,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function noShowNotaryBooking(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.notaryBooking.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Booking not found." };
  if (row.completedAt) return { error: "Cannot mark completed booking as no-show." };
  const reason = input.reason?.trim().slice(0, 300) || null;
  await prisma.$transaction([
    prisma.notaryBooking.update({
      where: { id: row.id },
      data: { status: "No Show", noShowAt: new Date(), noShowReason: reason, checkedInAt: null, idPresented: null, idPresentedNumber: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "notary.no_show",
        entityType: "NotaryBooking",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, type: row.type, reason }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// Admin-side counters for the panel header.
export async function getNotaryCheckInCounts(): Promise<{ todayBooked: number; todayCheckedIn: number; todayCompleted: number; pendingNow: number }> {
  await verifyAdmin();
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const rows = await prisma.notaryBooking.findMany({
    where: { date: todayYmd },
    select: { status: true, checkedInAt: true, completedAt: true },
  });
  return {
    todayBooked: rows.length,
    todayCheckedIn: rows.filter((r) => r.checkedInAt && !r.completedAt).length,
    todayCompleted: rows.filter((r) => !!r.completedAt).length,
    pendingNow: rows.filter((r) => r.status === "Pending" || r.status === "Confirmed").length,
  };
}
