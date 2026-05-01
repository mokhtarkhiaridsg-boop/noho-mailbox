import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { retry } from "@/lib/retry";
import { isSquareConfigured } from "@/lib/square";
import { isShippoConfigured } from "@/lib/shippo";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import { getManyConfigs } from "@/app/actions/site-config";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/pricing-config";

// Admin page fans out ~30+ parallel Prisma queries + many Server Actions.
// Bump Vercel function timeout from default (10s hobby / 15s pro) to 60s so
// cold-start + Turso edge transients don't surface as 503s during heavy
// admin workflows like bulk renewal or batch late-fee runs.
export const maxDuration = 60;

export default async function AdminPage() {
  const admin = await verifyAdmin();

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
    rawShippoLabels,
  ] = await retry(() => Promise.all([
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
        planAutoRenew: true,
        walletBalanceCents: true,
        mailboxStatus: true,
        kycStatus: true,
        kycForm1583Url: true,
        kycIdImageUrl: true,
        kycIdImage2Url: true,
        idPrimaryType: true,
        idSecondaryType: true,
        idPrimaryExpDate: true,
        idSecondaryExpDate: true,
        idPrimaryNumber: true,
        idSecondaryNumber: true,
        idPrimaryIssuer: true,
        idSecondaryIssuer: true,
        boxType: true,
        businessName: true,
        businessOwnerName: true,
        businessOwnerRelation: true,
        businessOwnerPhone: true,
        cardLast4: true,
        cardBrand: true,
        cardExpiry: true,
        cardholderName: true,
        cardDiscountPct: true,
        kycNotes: true,
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
    prisma.shippoLabel.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, suiteNumber: true } } },
    }).catch(() => []),
  ]));

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
    mail90d: 0, // populated below from groupBy
    packageCount: pkgMap.get(c.id) ?? 0,
    securityDepositCents: c.securityDepositCents,
    planDueDate: c.planDueDate ?? null,
    planAutoRenew: c.planAutoRenew,
    walletBalanceCents: c.walletBalanceCents,
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
    kycNotes: c.kycNotes ?? null,
    idPrimaryType: c.idPrimaryType ?? null,
    idSecondaryType: c.idSecondaryType ?? null,
    idPrimaryExpDate: c.idPrimaryExpDate ?? null,
    idSecondaryExpDate: c.idSecondaryExpDate ?? null,
    idPrimaryNumber: c.idPrimaryNumber ?? null,
    idSecondaryNumber: c.idSecondaryNumber ?? null,
    idPrimaryIssuer: c.idPrimaryIssuer ?? null,
    idSecondaryIssuer: c.idSecondaryIssuer ?? null,
    boxType: c.boxType ?? null,
    businessName: c.businessName ?? null,
    businessOwnerName: c.businessOwnerName ?? null,
    businessOwnerRelation: c.businessOwnerRelation ?? null,
    businessOwnerPhone: c.businessOwnerPhone ?? null,
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
  const [complianceRows, mailRequestRows, keyRequestRows, rawThreads, rawContacts, siteSettings] = await retry(() => Promise.all([
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
  ]));

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

  // Partners (with their commissions)
  const partnerRows = await ((prisma as unknown) as {
    partner: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        businessName: string;
        contactName: string;
        email: string;
        phone: string | null;
        category: string;
        code: string;
        commissionRate: number;
        status: string;
        notes: string | null;
        createdAt: Date;
        commissions: Array<{
          id: string;
          prospectName: string;
          prospectEmail: string | null;
          prospectPhone: string | null;
          product: string;
          invoiceCents: number;
          commissionCents: number;
          status: string;
          notes: string | null;
          createdAt: Date;
          closedAt: Date | null;
          paidAt: Date | null;
        }>;
      }>>
    }
  }).partner.findMany({
    orderBy: { createdAt: "desc" },
    include: { commissions: { orderBy: { createdAt: "desc" } } },
  }).catch(() => []);

  const partners = partnerRows.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    category: p.category,
    code: p.code,
    commissionRate: p.commissionRate,
    status: p.status,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    commissions: p.commissions.map((c) => ({
      id: c.id,
      prospectName: c.prospectName,
      prospectEmail: c.prospectEmail,
      prospectPhone: c.prospectPhone,
      product: c.product,
      invoiceCents: c.invoiceCents,
      commissionCents: c.commissionCents,
      status: c.status,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    })),
  }));

  // SaaS tenants (CMRA operator applications)
  const tenantRows = await ((prisma as unknown) as {
    tenant: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        name: string;
        slug: string;
        ownerName: string;
        ownerEmail: string;
        ownerPhone: string | null;
        legalCity: string | null;
        legalState: string | null;
        status: string;
        trialEndsAt: Date | null;
        tier: string;
        pricePerMonthCents: number;
        customerCount: number;
        locationCount: number;
        notes: string | null;
        createdAt: Date;
      }>>;
    };
  }).tenant.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);

  const tenants = tenantRows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    ownerName: t.ownerName,
    ownerEmail: t.ownerEmail,
    ownerPhone: t.ownerPhone,
    legalCity: t.legalCity,
    legalState: t.legalState,
    status: t.status,
    trialEndsAt: t.trialEndsAt ? t.trialEndsAt.toISOString() : null,
    tier: t.tier,
    pricePerMonthCents: t.pricePerMonthCents,
    customerCount: t.customerCount,
    locationCount: t.locationCount,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  }));

  // Credit top-up requests (open ones)
  const creditRequestsRaw = await ((prisma as unknown) as {
    creditRequest: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        userId: string;
        amountCents: number;
        status: string;
        squareLink: string | null;
        notes: string | null;
        createdAt: Date;
      }>>
    }
  }).creditRequest.findMany({
    where: { status: { in: ["Pending", "LinkSent"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => [] as Array<{ id: string; userId: string; amountCents: number; status: string; squareLink: string | null; notes: string | null; createdAt: Date }>);

  const creditRequestUsers = await prisma.user.findMany({
    where: { id: { in: creditRequestsRaw.map((r) => r.userId) } },
    select: { id: true, name: true, email: true, phone: true },
  });
  const userById = new Map(creditRequestUsers.map((u) => [u.id, u]));
  const creditRequests = creditRequestsRaw.map((r) => {
    const u = userById.get(r.userId);
    return {
      id: r.id,
      userId: r.userId,
      userName: u?.name ?? "(deleted user)",
      userEmail: u?.email ?? "",
      userPhone: u?.phone ?? null,
      amountCents: r.amountCents,
      status: r.status,
      squareLink: r.squareLink,
      notes: r.notes,
      createdAt: r.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    };
  });

  // Open + recent label orders (pre-paid label flow). We now include "Printed"
  // and "Cancelled" so admin can scroll the full pipeline (the panel filters
  // to "Open" by default but the user can flip the chip).
  const labelOrdersRaw = await ((prisma as unknown) as {
    labelOrder: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string | null;
        toName: string;
        toCity: string;
        toState: string;
        toZip: string;
        carrier: string;
        servicelevel: string;
        shippoCostCents: number;
        customerPriceCents: number;
        marginCents: number;
        status: string;
        squareLink: string | null;
        notes: string | null;
        estimatedDays: number | null;
        weightOz: number;
        lengthIn: number;
        widthIn: number;
        heightIn: number;
        shippoLabelId: string | null;
        createdAt: Date;
        paidAt: Date | null;
        printedAt: Date | null;
      }>>
    }
  }).labelOrder.findMany({
    where: { status: { in: ["AwaitingPayment", "LinkSent", "Paid", "Printed", "Cancelled"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
  }).catch(() => [] as Array<{
    id: string; customerName: string; customerEmail: string; customerPhone: string | null;
    toName: string; toCity: string; toState: string; toZip: string;
    carrier: string; servicelevel: string;
    shippoCostCents: number; customerPriceCents: number; marginCents: number;
    status: string; squareLink: string | null; notes: string | null;
    estimatedDays: number | null; weightOz: number; lengthIn: number; widthIn: number; heightIn: number;
    shippoLabelId: string | null;
    createdAt: Date; paidAt: Date | null; printedAt: Date | null;
  }>);

  // Batch-fetch the ShippoLabel rows for Printed orders so the panel can
  // show tracking + label URL inline (no FK relation per schema comment).
  const printedLabelIds = labelOrdersRaw
    .map((o) => o.shippoLabelId)
    .filter((s): s is string => !!s);
  const printedLabels = printedLabelIds.length === 0
    ? []
    : await prisma.shippoLabel.findMany({
        where: { id: { in: printedLabelIds } },
        select: { id: true, trackingNumber: true, trackingUrl: true, labelUrl: true, status: true },
      }).catch(() => [] as Array<{ id: string; trackingNumber: string; trackingUrl: string; labelUrl: string; status: string }>);
  const labelById = new Map(printedLabels.map((l) => [l.id, l]));

  const labelOrders = labelOrdersRaw.map((o) => {
    const linked = o.shippoLabelId ? labelById.get(o.shippoLabelId) ?? null : null;
    return {
      id: o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      toName: o.toName,
      toCity: o.toCity,
      toState: o.toState,
      toZip: o.toZip,
      carrier: o.carrier,
      servicelevel: o.servicelevel,
      shippoCostCents: o.shippoCostCents,
      customerPriceCents: o.customerPriceCents,
      marginCents: o.marginCents,
      status: o.status,
      squareLink: o.squareLink,
      notes: o.notes,
      estimatedDays: o.estimatedDays,
      weightOz: o.weightOz,
      lengthIn: o.lengthIn,
      widthIn: o.widthIn,
      heightIn: o.heightIn,
      shippoLabelId: o.shippoLabelId,
      trackingNumber: linked?.trackingNumber ?? null,
      trackingUrl: linked?.trackingUrl ?? null,
      labelUrl: linked?.labelUrl ?? null,
      labelStatus: linked?.status ?? null,
      createdAt: o.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      // ISO timestamps so the panel can compute "stuck > 4h" client-side.
      paidAtIso: o.paidAt ? o.paidAt.toISOString() : null,
      printedAtIso: o.printedAt ? o.printedAt.toISOString() : null,
      createdAtIso: o.createdAt.toISOString(),
    };
  });

  // Recent mailbox renewals (most recent 12)
  const mailboxRenewalsRaw = await ((prisma as unknown) as {
    mailboxRenewal: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        userId: string;
        termMonths: number;
        planAtRenewal: string;
        amountCents: number;
        paymentMethod: string;
        paidAt: Date;
        newPlanDueDate: string;
        receiptSentAt: Date | null;
        notes: string | null;
        user: { name: string; suiteNumber: string | null; email: string } | null;
      }>>
    }
  }).mailboxRenewal.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { name: true, suiteNumber: true, email: true } } },
  }).catch(() => [] as Array<{
    id: string; userId: string; termMonths: number; planAtRenewal: string;
    amountCents: number; paymentMethod: string; paidAt: Date;
    newPlanDueDate: string; receiptSentAt: Date | null; notes: string | null;
    user: { name: string; suiteNumber: string | null; email: string } | null;
  }>);

  const mailboxRenewals = mailboxRenewalsRaw.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name ?? "(deleted user)",
    userEmail: r.user?.email ?? "",
    suiteNumber: r.user?.suiteNumber ?? null,
    planAtRenewal: r.planAtRenewal,
    termMonths: r.termMonths,
    amountCents: r.amountCents,
    paymentMethod: r.paymentMethod,
    paidAt: r.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    newPlanDueDate: r.newPlanDueDate,
    receiptSentAt: r.receiptSentAt ? r.receiptSentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
    notes: r.notes,
  }));

  // Customer notes — recent + pinned across all customers (for inline timeline).
  // Capped at 200 rows; the timeline shows only the selected customer's notes
  // client-side, so this is the working set for "any customer the admin opens".
  const customerNotesRaw = await ((prisma as unknown) as {
    customerNote: { findMany: (args: unknown) => Promise<Array<{
      id: string; userId: string; authorName: string | null; kind: string;
      body: string; pinned: boolean; createdAt: Date;
    }>> }
  }).customerNote.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 200,
  }).catch(() => [] as Array<{ id: string; userId: string; authorName: string | null; kind: string; body: string; pinned: boolean; createdAt: Date }>);
  const customerNotes = customerNotesRaw.map((n) => ({
    id: n.id,
    userId: n.userId,
    authorName: n.authorName,
    kind: n.kind,
    body: n.body,
    pinned: !!n.pinned,
    createdAt: n.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  }));

  // Mailbox key inventory + name lookup for issued keys
  const keysRaw = await ((prisma as unknown) as {
    mailboxKey: { findMany: (args: unknown) => Promise<Array<{
      id: string; keyTag: string; suiteNumber: string; status: string;
      issuedToId: string | null; issuedAt: Date | null; returnedAt: Date | null; notes: string | null;
    }>> }
  }).mailboxKey.findMany({
    orderBy: [{ status: "asc" }, { suiteNumber: "asc" }],
    take: 500,
  }).catch(() => [] as Array<{ id: string; keyTag: string; suiteNumber: string; status: string; issuedToId: string | null; issuedAt: Date | null; returnedAt: Date | null; notes: string | null }>);
  const issuedToIds = keysRaw.map((k) => k.issuedToId).filter((x): x is string => !!x);
  const keyHolders = issuedToIds.length
    ? await prisma.user.findMany({ where: { id: { in: issuedToIds } }, select: { id: true, name: true } })
    : [];
  const holderById = new Map(keyHolders.map((u) => [u.id, u.name]));
  const keys = keysRaw.map((k) => ({
    id: k.id,
    keyTag: k.keyTag,
    suiteNumber: k.suiteNumber,
    status: k.status,
    issuedToId: k.issuedToId,
    issuedToName: k.issuedToId ? holderById.get(k.issuedToId) ?? null : null,
    issuedAt: k.issuedAt ? k.issuedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
    returnedAt: k.returnedAt ? k.returnedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
    notes: k.notes,
  }));

  // Walk-in today: aggregate today's COMPLETED Payments by sourceType
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayPayments = await prisma.payment.findMany({
    where: { status: "COMPLETED", syncedAt: { gte: startOfToday } },
    select: { amount: true, sourceType: true },
  }).catch(() => [] as Array<{ amount: number; sourceType: string | null }>);
  const walkInToday = {
    paymentsToday: todayPayments.length,
    cashToday:   todayPayments.filter((p) => p.sourceType === "Cash").reduce((s, p) => s + p.amount, 0),
    cardToday:   todayPayments.filter((p) => p.sourceType === "CardOnFile").reduce((s, p) => s + p.amount, 0),
    squareToday: todayPayments.filter((p) => p.sourceType === "Square" || p.sourceType === "EXTERNAL").reduce((s, p) => s + p.amount, 0),
  };

  // ─── MRR — sum of (plan price ÷ term-in-months) across active customers ──
  // Pull pricing config from SiteConfig if present; fall back to DEFAULT_PRICING.
  // Static import (top of file) — server components don't reliably support
  // dynamic import inside the render path under Next.js 16 / Turbopack.
  let pricingForMrr: PricingConfig = DEFAULT_PRICING;
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: "pricing_v2" } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      // Validate the shape — a malformed config would otherwise crash the
      // whole admin page on the .find() call below.
      if (parsed && Array.isArray(parsed.plans)) {
        pricingForMrr = parsed as PricingConfig;
      }
    }
  } catch {
    // Silent fall-through to DEFAULT_PRICING — better than crashing.
  }
  const planPriceMonthlyCents = (planName: string | null, termRaw: string | null): number | null => {
    if (!planName || !termRaw) return null;
    const term = parseInt(termRaw, 10);
    if (![3, 6, 14].includes(term)) return null;
    const plan = pricingForMrr.plans.find((p) => p.name.toLowerCase() === planName.toLowerCase());
    if (!plan) return null;
    const dollars = plan.prices?.[`term${term}` as "term3" | "term6" | "term14"];
    if (typeof dollars !== "number") return null;
    // Divide-then-round loses ~1 cent per customer at most. Acceptable for
    // display; documented intentionally.
    return Math.round((dollars * 100) / term);
  };
  const activePlanCustomers = customers.filter((c) => c.status === "Active" && c.plan && c.planTerm);
  const mrrCents = activePlanCustomers.reduce(
    (sum, c) => sum + (planPriceMonthlyCents(c.plan, c.planTerm) ?? 0),
    0,
  );

  // ─── Mail volume — count items per user in last 90 days ──────────────────
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentMailRaw = await prisma.mailItem.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: ninetyDaysAgo } },
    _count: { _all: true },
  }).catch(() => [] as Array<{ userId: string; _count: { _all: number } }>);
  const mail90dByUser = new Map<string, number>(recentMailRaw.map((r) => [r.userId, r._count._all]));
  const dormantCount = customers.filter(
    (c) => c.status === "Active" && (mail90dByUser.get(c.id) ?? 0) === 0,
  ).length;
  // Backfill the mail90d field in-place so the panel can surface per-customer counts.
  for (const c of customers) c.mail90d = mail90dByUser.get(c.id) ?? 0;

  // ─── Churn — cancellations in last 30 days vs. active customers ──────────
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Churn = customers in the canonical-cancelled state (both flags set together
  // by cancelCustomerWithRefund) updated within the window. AND not OR — OR
  // would also catch Pending+Inactive transient states.
  const cancellations30d = await prisma.user.count({
    where: {
      mailboxStatus: "Cancelled",
      status: "Inactive",
      updatedAt: { gte: thirtyDaysAgo },
    },
  }).catch(() => 0);
  const activeCount = customers.filter((c) => c.status === "Active").length;
  // Annualized churn = (30d cancellations / active) × 12
  const churnPct = activeCount > 0 ? Math.round((cancellations30d / activeCount) * 12 * 100) : 0;

  // ─── Forwarding distribution — extract US state from each address ──────────
  // Addresses are free-form strings (e.g. "123 Main St, Boston, MA 02101"). We
  // extract the state via a regex looking for 2-letter codes followed by an
  // optional 5-digit zip. Falls back to a simple "Other / unparseable" bucket
  // when the regex doesn't match.
  const forwardingAddresses = await prisma.forwardingAddress.findMany({
    select: { address: true },
    take: 1000,
  }).catch(() => [] as Array<{ address: string }>);
  const stateRegex = /\b([A-Z]{2})\b\s*\d{0,5}\s*$/i; // e.g. "Boston, MA 02101"
  const forwardingByState: Record<string, number> = {};
  for (const fa of forwardingAddresses) {
    const m = fa.address.match(stateRegex);
    const state = (m?.[1] ?? "??").toUpperCase();
    forwardingByState[state] = (forwardingByState[state] ?? 0) + 1;
  }

  // ─── Plan distribution — count active customers per plan ──────────────────
  const planDistribution: Record<string, number> = {};
  for (const c of customers) {
    if (c.status !== "Active") continue;
    const planName = c.plan || "(no plan)";
    planDistribution[planName] = (planDistribution[planName] ?? 0) + 1;
  }

  // ─── Today's till — already collected in walkInToday but expose hourly + 7d
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0);
  const week = await prisma.payment.findMany({
    where: { syncedAt: { gte: sevenDaysAgo } },
    select: { amount: true, sourceType: true, status: true, syncedAt: true },
  }).catch(() => [] as Array<{ amount: number; sourceType: string | null; status: string; syncedAt: Date }>);
  const tillWeek = {
    completedCents: week.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0),
    refundedCents: week.filter((p) => p.status === "REFUNDED").reduce((s, p) => s + p.amount, 0),
    cashCents: week.filter((p) => p.status === "COMPLETED" && p.sourceType === "Cash").reduce((s, p) => s + p.amount, 0),
    cardCents: week.filter((p) => p.status === "COMPLETED" && p.sourceType === "CardOnFile").reduce((s, p) => s + p.amount, 0),
    squareCents: week.filter((p) => p.status === "COMPLETED" && (p.sourceType === "Square" || p.sourceType === "EXTERNAL")).reduce((s, p) => s + p.amount, 0),
    count: week.filter((p) => p.status === "COMPLETED").length,
    refundCount: week.filter((p) => p.status === "REFUNDED").length,
  };

  const recentShippoLabels = (rawShippoLabels as any[]).map((l) => ({
    id: l.id,
    carrier: l.carrier,
    servicelevel: l.servicelevel,
    trackingNumber: l.trackingNumber,
    trackingUrl: l.trackingUrl,
    labelUrl: l.labelUrl,
    amountPaid: l.amountPaid,
    status: l.status,
    toName: l.toName,
    toCity: l.toCity,
    toState: l.toState,
    toZip: l.toZip,
    createdAt: l.createdAt.toISOString(),
    userName: l.user?.name ?? null,
    suiteNumber: l.user?.suiteNumber ?? null,
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
      partners={partners}
      tenants={tenants}
      siteSettings={siteSettings}
      shippoConfigured={isShippoConfigured()}
      recentShippoLabels={recentShippoLabels}
      creditRequests={creditRequests}
      labelOrders={labelOrders}
      mailboxRenewals={mailboxRenewals}
      customerNotes={customerNotes}
      mailboxKeys={keys}
      walkInToday={walkInToday}
      mrrCents={mrrCents}
      dormantCount={dormantCount}
      planDistribution={planDistribution}
      tillWeek={tillWeek}
      churn30dCount={cancellations30d}
      churnAnnualizedPct={churnPct}
      forwardingByState={forwardingByState}
      adminId={admin.id ?? ""}
    />
  );
}
