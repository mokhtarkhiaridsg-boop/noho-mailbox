/**
 * Square sync — core logic, NO admin gate.
 *
 * The server actions in src/app/actions/square.ts wrap these with
 * verifyAdmin() so admin UI calls pass through that gate. The Vercel
 * cron route at /api/cron/square-sync calls these directly because cron
 * runs without a session — and verifyAdmin() would `redirect("/login")`
 * which throws inside an API route.
 *
 * Either entrypoint records the same SquareSyncLog rows so the admin
 * panel's sync history surfaces both manual + cron runs uniformly.
 */

import { prisma } from "@/lib/prisma";
import {
  isSquareConfigured,
  getSquareCustomers,
  getSquarePayments,
  getSquareCatalog,
  isSquareError,
} from "@/lib/square";

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

export async function runSyncSquareCustomers(): Promise<SyncResult> {
  if (!isSquareConfigured()) {
    return { success: false, syncType: "customers", itemsSynced: 0, error: "Square not configured." };
  }
  const log = await createSyncLog("customers");
  let synced = 0;
  let errMsg: string | undefined;
  try {
    const customers = await getSquareCustomers();
    for (const c of customers) {
      const composedEmail = c.emailAddress ?? `${c.id}@square.placeholder`;
      const composedName = [c.givenName, c.familyName].filter(Boolean).join(" ") || "Square Customer";
      const existing = await prisma.user.findFirst({ where: { squareCustomerId: c.id } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name: composedName, email: composedEmail, phone: c.phoneNumber ?? null, updatedAt: new Date() },
        });
      }
      synced++;
    }
  } catch (err) {
    errMsg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
  } finally {
    await completeSyncLog(log.id, synced, errMsg).catch(() => { /* swallow */ });
  }
  return errMsg
    ? { success: false, syncType: "customers", itemsSynced: synced, error: errMsg }
    : { success: true, syncType: "customers", itemsSynced: synced };
}

export async function runSyncSquarePayments(): Promise<SyncResult> {
  if (!isSquareConfigured()) {
    return { success: false, syncType: "payments", itemsSynced: 0, error: "Square not configured." };
  }
  const log = await createSyncLog("payments");
  let synced = 0;
  let errMsg: string | undefined;
  try {
    const dbHasPayments = (await prisma.payment.count()) > 0;
    const lastSync = dbHasPayments
      ? await prisma.squareSyncLog.findFirst({
          where: { syncType: "payments", status: "completed", itemsSynced: { gt: 0 } },
          orderBy: { completedAt: "desc" },
        })
      : null;
    const beginTime = lastSync?.completedAt
      ? new Date(lastSync.completedAt.getTime() - 60000).toISOString()
      : undefined;

    const payments = await getSquarePayments(beginTime);

    const customerIds = Array.from(
      new Set(payments.map((p) => p.customerId).filter((id): id is string => Boolean(id))),
    );
    const linkedUsers = customerIds.length > 0
      ? await prisma.user.findMany({
          where: { squareCustomerId: { in: customerIds } },
          select: { id: true, squareCustomerId: true },
        })
      : [];
    const userIdByCustomerId = new Map<string, string>();
    for (const u of linkedUsers) {
      if (u.squareCustomerId) userIdByCustomerId.set(u.squareCustomerId, u.id);
    }

    for (const p of payments) {
      const userId = p.customerId ? userIdByCustomerId.get(p.customerId) ?? null : null;
      const updateData: Record<string, unknown> = {
        status: p.status,
        amount: p.amount,
        syncedAt: new Date(),
      };
      if (userId !== null) updateData.userId = userId;
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
  } catch (err) {
    errMsg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
  } finally {
    // ALWAYS close the log row — never leak `running`. Catches even
    // the case where the catch's earlier completeSyncLog itself failed
    // (which is what hung 36 rows in production).
    await completeSyncLog(log.id, synced, errMsg).catch(() => { /* swallow — better stale row than crash */ });
  }
  return errMsg
    ? { success: false, syncType: "payments", itemsSynced: synced, error: errMsg }
    : { success: true, syncType: "payments", itemsSynced: synced };
}

export async function runSyncSquareCatalog(): Promise<SyncResult> {
  if (!isSquareConfigured()) {
    return { success: false, syncType: "catalog", itemsSynced: 0, error: "Square not configured." };
  }
  const log = await createSyncLog("catalog");
  let synced = 0;
  let errMsg: string | undefined;
  try {
    const items = await getSquareCatalog();
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
  } catch (err) {
    errMsg = isSquareError(err) ? err.message : err instanceof Error ? err.message : String(err);
  } finally {
    await completeSyncLog(log.id, synced, errMsg).catch(() => { /* swallow */ });
  }
  return errMsg
    ? { success: false, syncType: "catalog", itemsSynced: synced, error: errMsg }
    : { success: true, syncType: "catalog", itemsSynced: synced };
}
