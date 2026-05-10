"use server";

/**
 * iter-228 — Suite ↔ printer pairing server actions (Tier 17 #137).
 *
 * Admin claims one Bluetooth thermal printer per suite — when a new
 * MailItem arrives for that suite (or pickup is signed), the existing
 * iter-155 thermal print route fires + targets the paired printer (set
 * as system default by admin before printing).
 *
 * Auto-print integration is opt-in per pairing (autoIntake / autoPickup
 * flags). The actual print job is rendered by `getAutoPrintUrlForMailItem()`
 * which intake/pickup flows can `void window.open()` to fire silently.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type SuitePrinterPairingRow = {
  id: string;
  suiteNumber: string;
  userId: string | null;
  userName: string | null;
  equipmentId: string;
  printerLabel: string;
  printerSerial: string | null;
  printerLocation: string;
  autoIntake: boolean;
  autoPickup: boolean;
  claimedAtIso: string;
  releasedAtIso: string | null;
  releasedReason: string | null;
  notes: string | null;
};

function toView(r: { id: string; suiteNumber: string; equipmentId: string; printerLabel: string; autoIntake: boolean; autoPickup: boolean; claimedAt: Date; releasedAt: Date | null; releasedReason: string | null; notes: string | null }): SuitePrinterPairingRow {
  return {
    id: r.id, suiteNumber: r.suiteNumber, userId: null, userName: null,
    equipmentId: r.equipmentId, printerLabel: r.printerLabel,
    printerSerial: null, printerLocation: "Bureau",
    autoIntake: r.autoIntake, autoPickup: r.autoPickup,
    claimedAtIso: r.claimedAt.toISOString(),
    releasedAtIso: r.releasedAt?.toISOString() ?? null,
    releasedReason: r.releasedReason,
    notes: r.notes,
  };
}

// ─── Admin actions ─────────────────────────────────────────────────────

export async function pairSuiteToPrinter(input: { suiteNumber: string; equipmentId: string; autoIntake?: boolean; autoPickup?: boolean; notes?: string }): Promise<{ row?: SuitePrinterPairingRow; error?: string }> {
  const actor = await verifyAdmin();
  const suite = input.suiteNumber.trim();
  if (!suite) return { error: "Suite # required." };
  const eq = await prisma.equipment.findUnique({ where: { id: input.equipmentId } });
  if (!eq) return { error: "Printer not found." };
  if (eq.category !== "printer") return { error: `Equipment must be category=printer (got ${eq.category}).` };
  if (eq.status !== "active") return { error: `Printer status must be active (got ${eq.status}).` };

  // Release any existing active pairing for this suite first.
  await prisma.suitePrinterPairing.updateMany({
    where: { suiteNumber: suite, releasedAt: null },
    data: { releasedAt: new Date(), releasedById: actor.id, releasedReason: "replaced_by_new_pairing" },
  });

  const created = await prisma.suitePrinterPairing.create({
    data: {
      suiteNumber: suite,
      equipmentId: eq.id,
      printerLabel: eq.name.slice(0, 80),
      autoIntake: input.autoIntake ?? true,
      autoPickup: input.autoPickup ?? true,
      notes: input.notes?.trim().slice(0, 200) || null,
      claimedById: actor.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "suite_printer.paired",
      entityType: "SuitePrinterPairing", entityId: created.id,
      metadata: JSON.stringify({ suite, equipmentId: eq.id, printerLabel: eq.name, autoIntake: input.autoIntake ?? true, autoPickup: input.autoPickup ?? true }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: toView(created) };
}

export async function releaseSuitePrinterPairing(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.suitePrinterPairing.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pairing not found." };
  if (row.releasedAt) return { success: true };
  await prisma.$transaction([
    prisma.suitePrinterPairing.update({
      where: { id: row.id },
      data: { releasedAt: new Date(), releasedById: actor.id, releasedReason: input.reason?.trim().slice(0, 200) || "released_by_admin" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "suite_printer.released",
        entityType: "SuitePrinterPairing", entityId: row.id,
        metadata: JSON.stringify({ suite: row.suiteNumber, equipmentId: row.equipmentId, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function setPairingAutoFlags(input: { id: string; autoIntake?: boolean; autoPickup?: boolean }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.suitePrinterPairing.findUnique({ where: { id: input.id } });
  if (!row || row.releasedAt) return { error: "Pairing not active." };
  const data: { autoIntake?: boolean; autoPickup?: boolean } = {};
  if (typeof input.autoIntake === "boolean") data.autoIntake = input.autoIntake;
  if (typeof input.autoPickup === "boolean") data.autoPickup = input.autoPickup;
  if (Object.keys(data).length === 0) return { error: "Nothing to update." };
  await prisma.suitePrinterPairing.update({ where: { id: row.id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "suite_printer.flags_updated",
      entityType: "SuitePrinterPairing", entityId: row.id,
      metadata: JSON.stringify({ ...data }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { success: true };
}

export async function listSuitePrinterPairings(input: { activeOnly?: boolean; limit?: number } = {}): Promise<SuitePrinterPairingRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 100));
  const where = input.activeOnly !== false ? { releasedAt: null } : {};
  const rows = await prisma.suitePrinterPairing.findMany({
    where,
    orderBy: [{ releasedAt: "asc" }, { suiteNumber: "asc" }],
    take: limit,
  });
  if (rows.length === 0) return [];

  // Enrich with user names + equipment details.
  const suites = Array.from(new Set(rows.map((r) => r.suiteNumber)));
  const equipmentIds = Array.from(new Set(rows.map((r) => r.equipmentId)));
  const [users, equipments] = await Promise.all([
    prisma.user.findMany({ where: { suiteNumber: { in: suites } }, select: { id: true, name: true, suiteNumber: true } }),
    prisma.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, serial: true, location: true } }),
  ]);
  const userBySuite = new Map(users.map((u) => [u.suiteNumber!, u]));
  const equipMap = new Map(equipments.map((e) => [e.id, e]));

  return rows.map((r) => {
    const u = userBySuite.get(r.suiteNumber);
    const e = equipMap.get(r.equipmentId);
    return {
      ...toView(r),
      userId: u?.id ?? null,
      userName: u?.name ?? null,
      printerSerial: e?.serial ?? null,
      printerLocation: e?.location ?? "Bureau",
    };
  });
}

// Returns the auto-print URL for a given mail item if its suite has an
// active pairing with autoIntake=true (or autoPickup=true, depending on
// `kind`). Caller can `window.open(url)` to silently fire the print
// dialog through the existing iter-155 thermal route.
export async function getAutoPrintUrlForMailItem(input: { mailItemId: string; kind: "intake" | "pickup" }): Promise<{ url: string | null }> {
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    include: { user: { select: { suiteNumber: true } } },
  }).catch(() => null);
  if (!item || !item.user?.suiteNumber) return { url: null };

  const pairing = await prisma.suitePrinterPairing.findFirst({
    where: { suiteNumber: item.user.suiteNumber, releasedAt: null },
  }).catch(() => null);
  if (!pairing) return { url: null };
  if (input.kind === "intake" && !pairing.autoIntake) return { url: null };
  if (input.kind === "pickup" && !pairing.autoPickup) return { url: null };

  const base = process.env.AUTH_URL ?? "https://nohomailbox.org";
  return { url: `${base.replace(/\/$/, "")}/admin/print/thermal/${input.kind}/${item.id}` };
}

export async function listAvailablePrinters(): Promise<Array<{ id: string; name: string; serial: string; location: string }>> {
  await verifyAdmin();
  const rows = await prisma.equipment.findMany({
    where: { category: "printer", status: "active" },
    select: { id: true, name: true, serial: true, location: true },
    orderBy: { name: "asc" },
  });
  return rows;
}
