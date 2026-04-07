import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isSquareConfigured } from "@/lib/square";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  await verifyAdmin();

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Run ALL independent queries in parallel
  const [
    rawCustomers,
    rawMail,
    rawNotary,
    rawDeliveries,
    rawShop,
    activeCustomers,
    mailToday,
    awaitingPickup,
    basic,
    business,
    premium,
    packageCounts,
    squareLogs,
    linkedCustomers,
    totalPayments,
    catalogItemCount,
    totalRevenueAgg,
    rawPayments,
  ] = await Promise.all([
    // Customers
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        suiteNumber: true,
        status: true,
        createdAt: true,
        _count: { select: { mailItems: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Recent mail
    prisma.mailItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        from: true,
        type: true,
        date: true,
        status: true,
        scanned: true,
        scanImageUrl: true,
        label: true,
        user: { select: { name: true, suiteNumber: true } },
      },
    }),
    // Notary queue
    prisma.notaryBooking.findMany({
      where: { status: { in: ["Pending", "Confirmed"] } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        time: true,
        type: true,
        status: true,
        user: { select: { name: true } },
      },
    }),
    // Delivery orders
    prisma.deliveryOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        customerName: true,
        destination: true,
        zone: true,
        price: true,
        itemType: true,
        courier: true,
        status: true,
        date: true,
        user: { select: { suiteNumber: true } },
      },
    }),
    // Shop orders
    prisma.shopOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        items: true,
        total: true,
        status: true,
        date: true,
        user: { select: { name: true } },
      },
    }),
    // Stats
    prisma.user.count({ where: { role: { not: "ADMIN" }, status: "Active" } }),
    prisma.mailItem.count({ where: { date: todayStr } }),
    prisma.mailItem.count({ where: { status: "Awaiting Pickup" } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Basic" } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Business" } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Premium" } }),
    // Batch package counts (fixes N+1)
    prisma.mailItem.groupBy({
      by: ["userId"],
      where: { type: "Package", status: { in: ["Received", "Awaiting Pickup"] } },
      _count: true,
    }),
    // Square data
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
    prisma.payment.findMany({
      orderBy: { syncedAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        sourceType: true,
        note: true,
        squareCreatedAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  // Build package count lookup map
  const pkgMap = new Map(packageCounts.map((p) => [p.userId, p._count]));

  const customers = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    plan: c.plan ?? "Basic",
    suiteNumber: c.suiteNumber ?? "",
    status: c.status,
    createdAt: c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    mailCount: c._count.mailItems,
    packageCount: pkgMap.get(c.id) ?? 0,
  }));

  const recentMail = rawMail.map((m) => ({
    id: m.id,
    customerName: m.user.name,
    suiteNumber: m.user.suiteNumber ?? "",
    from: m.from,
    type: m.type,
    date: m.date,
    status: m.status,
    scanned: m.scanned,
    scanImageUrl: m.scanImageUrl,
    label: m.label,
  }));

  const notaryQueue = rawNotary.map((n) => ({
    id: n.id,
    customerName: n.user.name,
    date: n.date,
    time: n.time,
    type: n.type,
    status: n.status,
  }));

  const deliveryOrders = rawDeliveries.map((d) => ({
    id: d.id,
    customerName: d.customerName,
    suiteNumber: d.user?.suiteNumber ?? "",
    destination: d.destination,
    zone: d.zone,
    price: d.price,
    itemType: d.itemType,
    courier: d.courier ?? "",
    status: d.status,
    date: d.date,
  }));

  const shopOrders = rawShop.map((o) => ({
    id: o.id,
    customerName: o.user.name,
    items: o.items,
    total: o.total,
    status: o.status,
    date: o.date,
  }));

  const squareStatus = {
    configured: isSquareConfigured(),
    linkedCustomers,
    totalPayments,
    catalogItems: catalogItemCount,
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    recentLogs: squareLogs.map((l) => ({
      id: l.id,
      syncType: l.syncType,
      status: l.status,
      itemsSynced: l.itemsSynced,
      errors: l.errors,
      startedAt: l.startedAt.toISOString(),
      completedAt: l.completedAt?.toISOString() ?? null,
    })),
  };

  const recentPayments = rawPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    sourceType: p.sourceType,
    note: p.note,
    squareCreatedAt: p.squareCreatedAt,
    userName: p.user?.name ?? null,
  }));

  return (
    <AdminDashboardClient
      customers={customers}
      recentMail={recentMail}
      notaryQueue={notaryQueue}
      deliveryOrders={deliveryOrders}
      shopOrders={shopOrders}
      stats={{
        activeCustomers,
        mailToday,
        awaitingPickup,
        planDistribution: { basic, business, premium },
      }}
      squareStatus={squareStatus}
      recentPayments={recentPayments}
    />
  );
}
