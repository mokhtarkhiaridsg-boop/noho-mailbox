import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const sessionUser = await verifySession();

  // Run all independent queries in parallel
  const [user, mailItems, addresses, bookings, totalMail, unread, packages, forwarded] =
    await Promise.all([
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
    ]);

  if (!user) {
    throw new Error("User not found");
  }

  return (
    <DashboardClient
      user={user}
      mailItems={mailItems}
      addresses={addresses}
      bookings={bookings}
      stats={{ totalMail, unread, packages, forwarded }}
    />
  );
}
