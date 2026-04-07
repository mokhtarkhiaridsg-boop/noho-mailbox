import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const sessionUser = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      plan: true,
      planTerm: true,
      suiteNumber: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const mailItems = await prisma.mailItem.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      from: true,
      date: true,
      type: true,
      status: true,
      scanned: true,
    },
  });

  const addresses = await prisma.forwardingAddress.findMany({
    where: { userId: sessionUser.id },
    select: { id: true, label: true, address: true },
  });

  const bookings = await prisma.notaryBooking.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, date: true, time: true, type: true, status: true },
  });

  // Compute stats
  const totalMail = await prisma.mailItem.count({
    where: { userId: sessionUser.id },
  });
  const unread = await prisma.mailItem.count({
    where: { userId: sessionUser.id, status: "Received" },
  });
  const packages = await prisma.mailItem.count({
    where: {
      userId: sessionUser.id,
      type: "Package",
      status: { in: ["Received", "Awaiting Pickup"] },
    },
  });
  const forwarded = await prisma.mailItem.count({
    where: { userId: sessionUser.id, status: "Forwarded" },
  });

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
