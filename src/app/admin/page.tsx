import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  await verifyAdmin();

  // Fetch customers with mail/package counts
  const rawCustomers = await prisma.user.findMany({
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
  });

  const customers = await Promise.all(
    rawCustomers.map(async (c) => {
      const packageCount = await prisma.mailItem.count({
        where: { userId: c.id, type: "Package", status: { in: ["Received", "Awaiting Pickup"] } },
      });
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        plan: c.plan ?? "Basic",
        suiteNumber: c.suiteNumber ?? "",
        status: c.status,
        createdAt: c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        mailCount: c._count.mailItems,
        packageCount,
      };
    })
  );

  // Recent mail with user info
  const rawMail = await prisma.mailItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      from: true,
      type: true,
      date: true,
      status: true,
      user: { select: { name: true, suiteNumber: true } },
    },
  });

  const recentMail = rawMail.map((m) => ({
    id: m.id,
    customerName: m.user.name,
    suiteNumber: m.user.suiteNumber ?? "",
    from: m.from,
    type: m.type,
    date: m.date,
    status: m.status,
  }));

  // Notary queue with user names
  const rawNotary = await prisma.notaryBooking.findMany({
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
  });

  const notaryQueue = rawNotary.map((n) => ({
    id: n.id,
    customerName: n.user.name,
    date: n.date,
    time: n.time,
    type: n.type,
    status: n.status,
  }));

  // Delivery orders
  const rawDeliveries = await prisma.deliveryOrder.findMany({
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
  });

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

  // Shop orders
  const rawShop = await prisma.shopOrder.findMany({
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
  });

  const shopOrders = rawShop.map((o) => ({
    id: o.id,
    customerName: o.user.name,
    items: o.items,
    total: o.total,
    status: o.status,
    date: o.date,
  }));

  // Stats
  const activeCustomers = await prisma.user.count({
    where: { role: { not: "ADMIN" }, status: "Active" },
  });

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const mailToday = await prisma.mailItem.count({
    where: { date: todayStr },
  });

  const awaitingPickup = await prisma.mailItem.count({
    where: { status: "Awaiting Pickup" },
  });

  const [basic, business, premium] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Basic" } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Business" } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, plan: "Premium" } }),
  ]);

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
    />
  );
}
