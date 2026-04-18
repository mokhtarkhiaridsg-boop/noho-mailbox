import { verifyActiveMember } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const sessionUser = await verifyActiveMember();

  // Run all independent queries in parallel
  const [
    user,
    mailItems,
    addresses,
    bookings,
    totalMail,
    unread,
    packages,
    forwarded,
    cards,
    walletTxns,
    invoices,
    deliveries,
    threadsRaw,
    keyRequests,
  ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          name: true,
          email: true,
          phone: true,
          plan: true,
          planTerm: true,
          suiteNumber: true,
          role: true,
          securityDepositCents: true,
          securityDepositTotalCents: true,
          walletBalanceCents: true,
          defaultCardId: true,
          totpEnabled: true,
          mailboxStatus: true,
          kycStatus: true,
          planDueDate: true,
        },
      }),
      prisma.mailItem.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          from: true,
          date: true,
          type: true,
          status: true,
          scanned: true,
          scanImageUrl: true,
          label: true,
          priority: true,
          junkBlocked: true,
          trackingNumber: true,
          carrier: true,
        },
      }),
      prisma.forwardingAddress.findMany({
        where: { userId: sessionUser.id },
        select: { id: true, label: true, address: true },
      }),
      prisma.notaryBooking.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, date: true, time: true, type: true, status: true },
      }),
      prisma.mailItem.count({ where: { userId: sessionUser.id } }),
      prisma.mailItem.count({ where: { userId: sessionUser.id, status: "Received" } }),
      prisma.mailItem.count({
        where: { userId: sessionUser.id, type: "Package", status: { in: ["Received", "Awaiting Pickup"] } },
      }),
      prisma.mailItem.count({ where: { userId: sessionUser.id, status: "Forwarded" } }),
      prisma.card.findMany({
        where: { userId: sessionUser.id },
        select: { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletTransaction.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          kind: true,
          amountCents: true,
          description: true,
          balanceAfterCents: true,
          createdAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          kind: true,
          description: true,
          totalCents: true,
          status: true,
          sentAt: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      prisma.deliveryOrder.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          destination: true,
          tier: true,
          status: true,
          price: true,
          date: true,
          pickedUpAt: true,
          inTransitAt: true,
          deliveredAt: true,
          podPhotoUrl: true,
        },
      }),
      prisma.messageThread.findMany({
        orderBy: { lastMessageAt: "desc" },
        take: 25,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { attachments: true },
          },
        },
      }),
      prisma.keyRequest.findMany({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, status: true, createdAt: true, feeCents: true },
      }),
    ]);

  // Fetch notifications + vault items separately (tables may not exist on older deploys)
  const [notificationsRaw, vaultItemsRaw] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []),
    prisma.documentVaultItem.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // Filter threads where current user is a participant
  const userId = sessionUser.id!;
  const threads = threadsRaw
    .filter((t) => {
      try {
        const ids = JSON.parse(t.participantIds);
        return Array.isArray(ids) && ids.includes(userId);
      } catch {
        return false;
      }
    })
    .map((t) => ({
      id: t.id,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt.toISOString(),
      preview: t.messages[0]?.body.slice(0, 140) ?? "",
      attachmentCount: t.messages[0]?.attachments.length ?? 0,
      unread: (() => {
        try {
          const ids = JSON.parse(t.unreadForUserIds ?? "[]");
          return Array.isArray(ids) && ids.includes(userId);
        } catch {
          return false;
        }
      })(),
    }));

  return (
    <DashboardClient
      user={{ ...user, planDueDate: user.planDueDate ?? null }}
      mailItems={mailItems}
      addresses={addresses}
      bookings={bookings}
      stats={{ totalMail, unread, packages, forwarded }}
      cards={cards}
      walletTxns={walletTxns.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))}
      invoices={invoices.map((i) => ({
        ...i,
        sentAt: i.sentAt?.toISOString() ?? null,
        paidAt: i.paidAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      }))}
      deliveries={deliveries.map((d) => ({
        ...d,
        pickedUpAt: d.pickedUpAt?.toISOString() ?? null,
        inTransitAt: d.inTransitAt?.toISOString() ?? null,
        deliveredAt: d.deliveredAt?.toISOString() ?? null,
      }))}
      threads={threads}
      keyRequests={keyRequests.map((k) => ({
        ...k,
        createdAt: k.createdAt.toISOString(),
      }))}
      notifications={notificationsRaw.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        link: n.link ?? null,
        createdAt: n.createdAt.toISOString(),
      }))}
      vaultItems={vaultItemsRaw.map((v) => ({
        id: v.id,
        kind: v.kind,
        title: v.title,
        blobUrl: v.blobUrl,
        mimeType: v.mimeType,
        sizeBytes: v.sizeBytes,
        tags: v.tags ?? null,
        createdAt: v.createdAt.toISOString(),
      }))}
    />
  );
}
