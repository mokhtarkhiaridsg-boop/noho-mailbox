"use server";

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  isSquareConfigured,
  getSquareCustomers,
  getSquarePayments,
  getSquareCatalog,
  isSquareError,
} from "@/lib/square";
import { revalidatePath } from "next/cache";

export type SyncResult = {
  success: boolean;
  syncType: string;
  itemsSynced: number;
  error?: string;
};

async function createSyncLog(syncType: string) {
  return prisma.squareSyncLog.create({
    data: { syncType, status: "running" },
  });
}

async function completeSyncLog(id: string, itemsSynced: number, error?: string) {
  await prisma.squareSyncLog.update({
    where: { id },
    data: {
      status: error ? "failed" : "completed",
      itemsSynced,
      errors: error ?? null,
      completedAt: new Date(),
    },
  });
}

export async function syncSquareCustomers(): Promise<SyncResult> {
  await verifyAdmin();

  if (!isSquareConfigured()) {
    return { success: false, syncType: "customers", itemsSynced: 0, error: "Square not configured. Add SQUARE_ACCESS_TOKEN to environment variables." };
  }

  const log = await createSyncLog("customers");
  try {
    const customers = await getSquareCustomers();
    let synced = 0;

    for (const c of customers) {
      if (!c.emailAddress) continue;

      const name = [c.givenName, c.familyName].filter(Boolean).join(" ") || "Unknown";

      // Try to link to existing user by email, or update squareCustomerId
      const existing = await prisma.user.findUnique({
        where: { email: c.emailAddress },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            squareCustomerId: c.id,
            phone: existing.phone || c.phoneNumber || null,
          },
        });
        synced++;
      }
      // Note: we don't create new users from Square — they need to sign up on the website
    }

    await completeSyncLog(log.id, synced);
    revalidatePath("/admin");
    return { success: true, syncType: "customers", itemsSynced: synced };
  } catch (err) {
    const msg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
    await completeSyncLog(log.id, 0, msg);
    return { success: false, syncType: "customers", itemsSynced: 0, error: msg };
  }
}

export async function syncSquarePayments(): Promise<SyncResult> {
  await verifyAdmin();

  if (!isSquareConfigured()) {
    return { success: false, syncType: "payments", itemsSynced: 0, error: "Square not configured." };
  }

  const log = await createSyncLog("payments");
  try {
    // Get last sync time to only fetch new payments
    const lastSync = await prisma.squareSyncLog.findFirst({
      where: { syncType: "payments", status: "completed" },
      orderBy: { completedAt: "desc" },
    });
    const beginTime = lastSync?.completedAt
      ? new Date(lastSync.completedAt.getTime() - 60000).toISOString() // 1 min overlap
      : undefined;

    const payments = await getSquarePayments(beginTime);
    let synced = 0;

    for (const p of payments) {
      // Try to link payment to a user via Square customer ID
      let userId: string | null = null;
      if (p.customerId) {
        const user = await prisma.user.findFirst({
          where: { squareCustomerId: p.customerId },
          select: { id: true },
        });
        userId = user?.id ?? null;
      }

      // On UPDATE only: don't clobber a previously-set userId with null. An
      // admin may have manually linked a Square payment to the right user
      // (because Square's customerId wasn't on the row at first), and a
      // subsequent sync where Square still doesn't know the customer would
      // overwrite that manual link with null. Preserve the existing link
      // unless we have a fresh, non-null value to write.
      const updateData: Record<string, unknown> = {
        status: p.status,
        amount: p.amount,
        syncedAt: new Date(),
      };
      if (userId !== null) {
        updateData.userId = userId;
      }

      await prisma.payment.upsert({
        where: { squarePaymentId: p.id },
        create: {
          squarePaymentId: p.id,
          userId,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          sourceType: p.sourceType ?? null,
          receiptUrl: p.receiptUrl ?? null,
          note: p.note ?? null,
          squareCreatedAt: p.createdAt,
        },
        update: updateData,
      });
      synced++;
    }

    await completeSyncLog(log.id, synced);
    revalidatePath("/admin");
    return { success: true, syncType: "payments", itemsSynced: synced };
  } catch (err) {
    const msg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
    await completeSyncLog(log.id, 0, msg);
    return { success: false, syncType: "payments", itemsSynced: 0, error: msg };
  }
}

export async function syncSquareCatalog(): Promise<SyncResult> {
  await verifyAdmin();

  if (!isSquareConfigured()) {
    return { success: false, syncType: "catalog", itemsSynced: 0, error: "Square not configured." };
  }

  const log = await createSyncLog("catalog");
  try {
    const items = await getSquareCatalog();
    let synced = 0;

    for (const item of items) {
      await prisma.catalogItem.upsert({
        where: { squareCatalogId: item.id },
        create: {
          squareCatalogId: item.id,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          currency: item.currency,
          category: item.category ?? null,
          imageUrl: item.imageUrl ?? null,
        },
        update: {
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          category: item.category ?? null,
          imageUrl: item.imageUrl ?? null,
          syncedAt: new Date(),
        },
      });
      synced++;
    }

    await completeSyncLog(log.id, synced);
    revalidatePath("/admin");
    return { success: true, syncType: "catalog", itemsSynced: synced };
  } catch (err) {
    const msg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
    await completeSyncLog(log.id, 0, msg);
    return { success: false, syncType: "catalog", itemsSynced: 0, error: msg };
  }
}

export async function syncAll(): Promise<SyncResult[]> {
  await verifyAdmin();
  const results: SyncResult[] = [];
  results.push(await syncSquareCustomers());
  results.push(await syncSquarePayments());
  results.push(await syncSquareCatalog());
  return results;
}

export async function getSquareStatus() {
  await verifyAdmin();

  const configured = isSquareConfigured();

  const [recentLogs, linkedCustomers, totalPayments, catalogItems, totalRevenue] =
    await Promise.all([
      prisma.squareSyncLog.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
      prisma.user.count({ where: { squareCustomerId: { not: null } } }),
      prisma.payment.count(),
      prisma.catalogItem.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      }),
    ]);

  return {
    configured,
    linkedCustomers,
    totalPayments,
    catalogItems,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      syncType: l.syncType,
      status: l.status,
      itemsSynced: l.itemsSynced,
      errors: l.errors,
      startedAt: l.startedAt.toISOString(),
      completedAt: l.completedAt?.toISOString() ?? null,
    })),
  };
}
