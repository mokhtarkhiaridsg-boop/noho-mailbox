import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isSquareConfigured } from "@/lib/square";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import { getManyConfigs } from "@/app/actions/site-config";

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
        phone: true,
        plan: true,
        planTerm: true,
        suiteNumber: true,
        status: true,
        createdAt: true,
        securityDepositCents: true,
        planDueDate: true,
        mailboxStatus: true,
        kycStatus: true,
        kycForm1583Url: true,
        kycIdImageUrl: true,
        kycIdImage2Url: true,
        cardLast4: true,
        cardBrand: true,
        cardExpiry: true,
        cardholderName: true,
        cardDiscountPct: true,
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
    phone: c.phone ?? null,
    plan: c.plan ?? "Basic",
    planTerm: c.planTerm ?? null,
    suiteNumber: c.suiteNumber ?? "",
    status: c.status,
    createdAt: c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    mailCount: c._count.mailItems,
    packageCount: pkgMap.get(c.id) ?? 0,
    securityDepositCents: c.securityDepositCents,
    planDueDate: c.planDueDate ?? null,
    mailboxStatus: c.mailboxStatus,
    kycStatus: c.kycStatus,
    kycForm1583Url: c.kycForm1583Url ?? null,
    kycIdImageUrl: c.kycIdImageUrl ?? null,
    kycIdImage2Url: c.kycIdImage2Url ?? null,
    cardLast4: c.cardLast4 ?? null,
    cardBrand: c.cardBrand ?? null,
    cardExpiry: c.cardExpiry ?? null,
    cardholderName: c.cardholderName ?? null,
    cardDiscountPct: c.cardDiscountPct,
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

  // ─── iPostal1-parity admin queues ───
  const [complianceRows, mailRequestRows, keyRequestRows, rawThreads, rawContacts, siteSettings] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [
          { kycStatus: { in: ["Submitted", "Pending"] } },
          { mailboxStatus: { in: ["Pending", "Assigned"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        kycStatus: true,
        kycForm1583Url: true,
        kycIdImageUrl: true,
        mailboxStatus: true,
        suiteNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.mailRequest.findMany({
      where: { status: "Pending" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: { select: { name: true, suiteNumber: true } },
        mailItem: { select: { from: true } },
      },
    }),
    prisma.keyRequest.findMany({
      where: { status: { in: ["Pending", "Approved"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    }),
    // Message threads where admin is participant
    prisma.messageThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    // Contact form submissions
    prisma.contactSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // Site settings from DB
    getManyConfigs([
      "store.name", "store.address", "store.phone", "store.email", "store.hours",
      "notif.mailArrived", "notif.smsPackages", "notif.dailySummary", "notif.notaryReminders",
      "carrier.usps", "carrier.ups", "carrier.fedex", "carrier.dhl",
    ]),
  ]);

  const complianceQueue = complianceRows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    plan: c.plan,
    kycStatus: c.kycStatus,
    kycForm1583Url: c.kycForm1583Url,
    kycIdImageUrl: c.kycIdImageUrl,
    mailboxStatus: c.mailboxStatus,
    suiteNumber: c.suiteNumber,
    createdAt: c.createdAt.toISOString(),
  }));

  const mailRequests = mailRequestRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    userName: r.user.name,
    suiteNumber: r.user.suiteNumber,
    mailFrom: r.mailItem.from,
  }));

  const keyRequests = keyRequestRows.map((k) => ({
    id: k.id,
    status: k.status,
    reason: k.reason,
    feeCents: k.feeCents,
    createdAt: k.createdAt.toISOString(),
    userId: k.userId,
    userName: k.user.name,
  }));

  const messageThreads = rawThreads.map((t: any) => ({
    id: t.id,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    preview: t.messages[0]?.body?.slice(0, 120) ?? "",
    senderId: t.messages[0]?.senderId ?? null,
    participantIds: t.participantIds,
    unreadForUserIds: t.unreadForUserIds,
  }));

  const contactSubmissions = rawContacts.map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    service: c.service,
    message: c.message,
    createdAt: c.createdAt.toISOString(),
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
      complianceQueue={complianceQueue}
      mailRequests={mailRequests}
      keyRequests={keyRequests}
      messageThreads={messageThreads}
      contactSubmissions={contactSubmissions}
      siteSettings={siteSettings}
    />
  );
}
