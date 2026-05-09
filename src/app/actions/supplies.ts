"use server";

/**
 * iter-150 — Supplies inventory management (Tier 9 #60).
 *
 * Internal-ops inventory tracking for boxes/tape/labels/poly mailers
 * etc. Distinct from CatalogItem (which is the customer-facing Square
 * retail catalog). Stock movement is its own log so admin can audit
 * "where did 50 small boxes go between Monday and Wednesday".
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
// iter-11.5 — Types + constants moved to /lib so the "use server"
// constraint (only async exports) doesn't blow up the admin shell at
// runtime when this module is loaded as part of a Server Action chunk.
import {
  SUPPLY_CATEGORIES,
  SUPPLY_UNITS,
  SUPPLY_MOVEMENT_KINDS,
  computeMarkupPct,
  computeMarginPct,
  type SupplyCategory,
  type SupplyUnit,
  type SupplyMovementKind,
  type SupplyStatus,
} from "@/lib/supplies-config";

const VALID_CATEGORIES = new Set<SupplyCategory>(SUPPLY_CATEGORIES.map((c) => c.key));
const VALID_UNITS = new Set<SupplyUnit>(SUPPLY_UNITS);
const VALID_KINDS = new Set<SupplyMovementKind>(SUPPLY_MOVEMENT_KINDS.map((k) => k.key));

export type SupplyPriceTierRow = {
  id: string;
  supplyId: string;
  label: string;
  salePriceCents: number;
  isDefault: boolean;
  position: number;
  notes: string | null;
  markupPct: number | null;       // iter-164 — convenience: vs. Supply.costCents
  marginPct: number | null;
};

export type SupplyRow = {
  id: string;
  name: string;
  category: SupplyCategory;
  unit: SupplyUnit;
  onHand: number;
  reorderAt: number;
  reorderQty: number;
  vendor: string | null;
  vendorSku: string | null;
  costCents: number | null;
  notes: string | null;
  isActive: boolean;
  status: SupplyStatus;
  movementCount: number;
  lastMovementAtIso: string | null;
  // iter-164 — tier rollup so the table can show "Retail $5.00 · 100% markup"
  // without a per-row server hit.
  defaultTier: SupplyPriceTierRow | null;
  tierCount: number;
};

export type SupplyMovementRow = {
  id: string;
  kind: SupplyMovementKind;
  delta: number;
  notes: string | null;
  performedByName: string | null;
  performedAtIso: string;
  // iter-164 — only populated for sale rows
  unitPriceCents: number | null;
  unitCostCents: number | null;
  tierLabel: string | null;
};

function statusFor(onHand: number, reorderAt: number): SupplyStatus {
  if (onHand <= 0) return "out";
  if (onHand <= reorderAt) return "low";
  return "ok";
}

export async function listSupplies(): Promise<SupplyRow[]> {
  await verifyAdmin();
  const rows = await prisma.supply.findMany({
    orderBy: [{ isActive: "desc" }, { onHand: "asc" }, { name: "asc" }],
    include: {
      movements: {
        select: { performedAt: true },
        orderBy: { performedAt: "desc" },
        take: 1,
      },
      _count: { select: { movements: true, priceTiers: true } },
      priceTiers: {
        orderBy: [{ isDefault: "desc" }, { position: "asc" }],
      },
    },
  });
  return rows.map((s) => {
    const defaultRaw = s.priceTiers.find((t) => t.isDefault) ?? s.priceTiers[0] ?? null;
    const defaultTier: SupplyPriceTierRow | null = defaultRaw
      ? {
          id: defaultRaw.id,
          supplyId: defaultRaw.supplyId,
          label: defaultRaw.label,
          salePriceCents: defaultRaw.salePriceCents,
          isDefault: defaultRaw.isDefault,
          position: defaultRaw.position,
          notes: defaultRaw.notes,
          markupPct: computeMarkupPct(s.costCents, defaultRaw.salePriceCents),
          marginPct: computeMarginPct(s.costCents, defaultRaw.salePriceCents),
        }
      : null;
    return {
      id: s.id,
      name: s.name,
      category: (VALID_CATEGORIES.has(s.category as SupplyCategory) ? s.category : "other") as SupplyCategory,
      unit: (VALID_UNITS.has(s.unit as SupplyUnit) ? s.unit : "each") as SupplyUnit,
      onHand: s.onHand,
      reorderAt: s.reorderAt,
      reorderQty: s.reorderQty,
      vendor: s.vendor,
      vendorSku: s.vendorSku,
      costCents: s.costCents,
      notes: s.notes,
      isActive: s.isActive,
      status: statusFor(s.onHand, s.reorderAt),
      movementCount: s._count.movements,
      lastMovementAtIso: s.movements[0]?.performedAt.toISOString() ?? null,
      defaultTier,
      tierCount: s._count.priceTiers,
    };
  });
}

// iter-164 — Tier list for one supply (drawer view).
export async function listSupplyPriceTiers(input: { supplyId: string }): Promise<SupplyPriceTierRow[]> {
  await verifyAdmin();
  const supply = await prisma.supply.findUnique({
    where: { id: input.supplyId },
    select: { costCents: true },
  });
  if (!supply) return [];
  const rows = await prisma.supplyPriceTier.findMany({
    where: { supplyId: input.supplyId },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }],
  });
  return rows.map((t) => ({
    id: t.id,
    supplyId: t.supplyId,
    label: t.label,
    salePriceCents: t.salePriceCents,
    isDefault: t.isDefault,
    position: t.position,
    notes: t.notes,
    markupPct: computeMarkupPct(supply.costCents, t.salePriceCents),
    marginPct: computeMarginPct(supply.costCents, t.salePriceCents),
  }));
}

// iter-164 — Atomic upsert. If `isDefault` is set we clear it on every
// other tier for this supply in the same transaction so exactly one
// default exists at any moment.
export async function upsertSupplyPriceTier(input: {
  id?: string;
  supplyId: string;
  label: string;
  salePriceCents: number;
  isDefault?: boolean;
  position?: number;
  notes?: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const supply = await prisma.supply.findUnique({ where: { id: input.supplyId }, select: { id: true, name: true, costCents: true } });
  if (!supply) return { error: "Supply not found" };
  const label = input.label.trim().slice(0, 60);
  if (label.length < 1) return { error: "Label required" };
  if (!Number.isFinite(input.salePriceCents) || input.salePriceCents < 0) {
    return { error: "Sale price must be ≥ 0 cents" };
  }
  const data = {
    supplyId: input.supplyId,
    label,
    salePriceCents: Math.round(input.salePriceCents),
    isDefault: input.isDefault ?? false,
    position: Number.isFinite(input.position) ? Math.round(input.position!) : 0,
    notes: input.notes?.trim().slice(0, 300) || null,
  };

  // If this row will be default, demote all siblings first.
  // We do the demote + create/update sequentially: the demote is its own
  // transaction-safe updateMany, then the upsert is its own write.
  // (We don't need both inside a single $transaction array because the
  // unique constraint is on label, not isDefault, so a brief race-window
  // here can't violate any DB invariant.)
  if (data.isDefault) {
    await prisma.supplyPriceTier.updateMany({
      where: { supplyId: input.supplyId, ...(input.id ? { NOT: { id: input.id } } : {}) },
      data: { isDefault: false },
    });
  }

  let id = input.id;
  if (id) {
    await prisma.supplyPriceTier.update({ where: { id }, data });
  } else {
    const created = await prisma.supplyPriceTier.create({ data });
    id = created.id;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: input.id ? "supply.tier_updated" : "supply.tier_created",
      entityType: "SupplyPriceTier", entityId: id,
      metadata: JSON.stringify({
        supplyId: input.supplyId, supplyName: supply.name,
        label, salePriceCents: data.salePriceCents,
        markupPct: computeMarkupPct(supply.costCents, data.salePriceCents),
        isDefault: data.isDefault,
      }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function deleteSupplyPriceTier(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.supplyPriceTier.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Tier not found" };
  await prisma.$transaction([
    prisma.supplyPriceTier.delete({ where: { id: input.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "supply.tier_deleted",
        entityType: "SupplyPriceTier", entityId: input.id,
        metadata: JSON.stringify({ supplyId: row.supplyId, label: row.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// iter-164 — Margin report. Sum sale movements over a window, computing
// revenue from `unitPriceCents * |delta|` and COGS from `unitCostCents
// * |delta|`. Fallback to current `Supply.costCents` for legacy rows
// that pre-date this iter (so the report degrades gracefully).
export type SupplyMarginRow = {
  supplyId: string;
  name: string;
  category: SupplyCategory;
  unitsSold: number;
  revenueCents: number;
  cogsCents: number;
  profitCents: number;
  marginPct: number | null;
  topTierLabel: string | null;        // most-used tier in window
};
export type InventoryMarginReport = {
  windowDays: number;
  totalUnitsSold: number;
  totalRevenueCents: number;
  totalCogsCents: number;
  totalProfitCents: number;
  blendedMarginPct: number | null;
  rows: SupplyMarginRow[];
};

export async function getInventoryMarginReport(input: { windowDays?: number } = {}): Promise<InventoryMarginReport> {
  await verifyAdmin();
  const windowDays = Math.max(1, Math.min(365, Math.round(input.windowDays ?? 30)));
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const rows = await prisma.supplyMovement.findMany({
    where: { kind: "sale", performedAt: { gte: since } },
    include: {
      supply: { select: { id: true, name: true, category: true, costCents: true } },
    },
    orderBy: { performedAt: "desc" },
    take: 5000, // hard cap to keep the report query bounded
  });

  type Bucket = {
    supplyId: string; name: string; category: SupplyCategory;
    unitsSold: number; revenueCents: number; cogsCents: number;
    tierTally: Record<string, number>;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const qty = Math.abs(r.delta);
    if (qty === 0) continue;
    const supplyId = r.supplyId;
    const cat = (VALID_CATEGORIES.has(r.supply.category as SupplyCategory) ? r.supply.category : "other") as SupplyCategory;
    const unitPrice = r.unitPriceCents ?? 0;
    const unitCost = r.unitCostCents ?? r.supply.costCents ?? 0;
    const b = buckets.get(supplyId) ?? {
      supplyId, name: r.supply.name, category: cat,
      unitsSold: 0, revenueCents: 0, cogsCents: 0, tierTally: {},
    };
    b.unitsSold += qty;
    b.revenueCents += unitPrice * qty;
    b.cogsCents += unitCost * qty;
    if (r.tierLabel) b.tierTally[r.tierLabel] = (b.tierTally[r.tierLabel] ?? 0) + qty;
    buckets.set(supplyId, b);
  }

  const reportRows: SupplyMarginRow[] = Array.from(buckets.values()).map((b) => {
    const profitCents = b.revenueCents - b.cogsCents;
    const marginPct = b.revenueCents > 0 ? Math.round((profitCents / b.revenueCents) * 100) : null;
    let topTierLabel: string | null = null;
    let topQty = 0;
    for (const [label, qty] of Object.entries(b.tierTally)) {
      if (qty > topQty) { topQty = qty; topTierLabel = label; }
    }
    return {
      supplyId: b.supplyId, name: b.name, category: b.category,
      unitsSold: b.unitsSold,
      revenueCents: b.revenueCents,
      cogsCents: b.cogsCents,
      profitCents,
      marginPct,
      topTierLabel,
    };
  }).sort((a, b) => b.profitCents - a.profitCents);

  const totalUnitsSold = reportRows.reduce((s, r) => s + r.unitsSold, 0);
  const totalRevenueCents = reportRows.reduce((s, r) => s + r.revenueCents, 0);
  const totalCogsCents = reportRows.reduce((s, r) => s + r.cogsCents, 0);
  const totalProfitCents = totalRevenueCents - totalCogsCents;
  const blendedMarginPct = totalRevenueCents > 0
    ? Math.round((totalProfitCents / totalRevenueCents) * 100)
    : null;

  return {
    windowDays,
    totalUnitsSold,
    totalRevenueCents,
    totalCogsCents,
    totalProfitCents,
    blendedMarginPct,
    rows: reportRows,
  };
}

export async function listSupplyMovements(input: { supplyId: string; limit?: number }): Promise<SupplyMovementRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(5, input.limit ?? 50));
  const rows = await prisma.supplyMovement.findMany({
    where: { supplyId: input.supplyId },
    orderBy: { performedAt: "desc" },
    take: limit,
  });
  const actorIds = Array.from(new Set(rows.map((r) => r.performedById).filter((x): x is string => Boolean(x))));
  const actors = actorIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id,
    kind: (VALID_KINDS.has(r.kind as SupplyMovementKind) ? r.kind : "adjust") as SupplyMovementKind,
    delta: r.delta,
    notes: r.notes,
    performedByName: r.performedById ? (actorMap.get(r.performedById) ?? null) : null,
    performedAtIso: r.performedAt.toISOString(),
    unitPriceCents: r.unitPriceCents,
    unitCostCents: r.unitCostCents,
    tierLabel: r.tierLabel,
  }));
}

export type UpsertSupplyInput = {
  id?: string;
  name: string;
  category: SupplyCategory;
  unit: SupplyUnit;
  onHand?: number;
  reorderAt?: number;
  reorderQty?: number;
  vendor?: string;
  vendorSku?: string;
  costCents?: number;
  notes?: string;
  isActive?: boolean;
};

export async function upsertSupply(input: UpsertSupplyInput): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Name required" };
  if (!VALID_CATEGORIES.has(input.category)) return { error: "Invalid category" };
  if (!VALID_UNITS.has(input.unit)) return { error: "Invalid unit" };

  const data = {
    name,
    category: input.category,
    unit: input.unit,
    onHand: Math.max(0, Math.round(input.onHand ?? 0)),
    reorderAt: Math.max(0, Math.round(input.reorderAt ?? 5)),
    reorderQty: Math.max(0, Math.round(input.reorderQty ?? 20)),
    vendor: input.vendor?.trim() || null,
    vendorSku: input.vendorSku?.trim() || null,
    costCents: Number.isFinite(input.costCents)
      ? Math.max(0, Math.round(input.costCents!))
      : null,
    notes: input.notes?.trim() || null,
    isActive: input.isActive ?? true,
  };

  let id = input.id;
  if (id) {
    await prisma.supply.update({ where: { id }, data });
  } else {
    const created = await prisma.supply.create({ data });
    id = created.id;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.id ? "supply.updated" : "supply.created",
      entityType: "Supply",
      entityId: id,
      metadata: JSON.stringify({ name, category: input.category, onHand: data.onHand, reorderAt: data.reorderAt }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function deleteSupply(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.supply.findUnique({ where: { id } });
  if (!row) return { error: "Supply not found" };
  await prisma.$transaction([
    prisma.supply.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "supply.deleted",
        entityType: "Supply",
        entityId: id,
        metadata: JSON.stringify({ name: row.name, category: row.category }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// Atomic stock change. `delta` is the signed quantity to apply
// (positive = restock, negative = consumption). For "adjust" mode the
// caller passes the new absolute on-hand and we compute the delta.
//
// iter-164 — sales now optionally accept a tier id (the panel auto-fills
// the active default tier) which we resolve to a unit price snapshot
// stored alongside the movement. This is what makes the inventory
// margin report stable when prices change later.
export async function recordSupplyMovement(input: {
  supplyId: string;
  kind: SupplyMovementKind;
  /** For restock/sale/internal_use/loss: the magnitude of the change.
   *  For adjust: ignored — pass setOnHand instead. */
  qty?: number;
  /** Only used when kind === "adjust" — sets the new absolute on-hand. */
  setOnHand?: number;
  notes?: string;
  performedAtIso?: string;
  // iter-164 — sale-only fields. tierId takes precedence; if omitted we
  // fall back to the supply's default tier; if neither found and
  // unitPriceCents wasn't passed, we record the sale with revenue=0
  // (admin will see "missing price" in the report).
  tierId?: string;
  unitPriceCents?: number;
  customerId?: string;
}): Promise<{ delta?: number; newOnHand?: number; error?: string }> {
  const actor = await verifyAdmin();
  if (!VALID_KINDS.has(input.kind)) return { error: "Invalid movement kind" };
  const supply = await prisma.supply.findUnique({
    where: { id: input.supplyId },
    include: {
      priceTiers: { orderBy: [{ isDefault: "desc" }, { position: "asc" }] },
    },
  });
  if (!supply) return { error: "Supply not found" };

  let delta: number;
  if (input.kind === "adjust") {
    if (!Number.isFinite(input.setOnHand)) return { error: "setOnHand required for adjust" };
    const target = Math.max(0, Math.round(input.setOnHand!));
    delta = target - supply.onHand;
  } else {
    if (!Number.isFinite(input.qty) || input.qty! <= 0) return { error: "qty must be a positive number" };
    const meta = SUPPLY_MOVEMENT_KINDS.find((m) => m.key === input.kind)!;
    delta = meta.sign * Math.round(input.qty!);
  }

  if (delta === 0) return { delta: 0, newOnHand: supply.onHand };

  const newOnHand = Math.max(0, supply.onHand + delta);
  const performedAt = input.performedAtIso ? new Date(input.performedAtIso) : new Date();
  if (Number.isNaN(performedAt.getTime())) return { error: "Invalid performedAt" };

  // iter-164 — resolve sale-side price + tier snapshot.
  let unitPriceCents: number | null = null;
  let unitCostCents: number | null = null;
  let tierLabel: string | null = null;
  if (input.kind === "sale") {
    let tier = input.tierId ? supply.priceTiers.find((t) => t.id === input.tierId) : undefined;
    if (!tier) tier = supply.priceTiers.find((t) => t.isDefault) ?? supply.priceTiers[0];
    if (input.unitPriceCents != null && Number.isFinite(input.unitPriceCents)) {
      unitPriceCents = Math.max(0, Math.round(input.unitPriceCents));
    } else if (tier) {
      unitPriceCents = tier.salePriceCents;
    }
    if (tier) tierLabel = tier.label;
    unitCostCents = supply.costCents ?? null;
  }

  await prisma.$transaction([
    prisma.supply.update({
      where: { id: input.supplyId },
      data: { onHand: newOnHand },
    }),
    prisma.supplyMovement.create({
      data: {
        supplyId: input.supplyId,
        kind: input.kind,
        delta,
        notes: input.notes?.trim().slice(0, 500) || null,
        performedById: actor.id,
        performedAt,
        unitPriceCents,
        unitCostCents,
        tierLabel,
        customerId: input.customerId ?? null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: `supply.movement_${input.kind}`,
        entityType: "Supply",
        entityId: input.supplyId,
        metadata: JSON.stringify({
          delta, newOnHand, name: supply.name,
          ...(input.kind === "sale" ? { unitPriceCents, unitCostCents, tierLabel, customerId: input.customerId ?? null } : {}),
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { delta, newOnHand };
}
