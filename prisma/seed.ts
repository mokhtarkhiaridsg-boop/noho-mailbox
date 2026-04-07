import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";

const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.contactSubmission.deleteMany();
  await prisma.forwardingAddress.deleteMany();
  await prisma.shopOrder.deleteMany();
  await prisma.deliveryOrder.deleteMany();
  await prisma.notaryBooking.deleteMany();
  await prisma.mailItem.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 12);
  const adminHash = await bcrypt.hash("admin123", 12);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@noho.com",
      passwordHash: adminHash,
      role: "ADMIN",
      plan: "Premium",
      suiteNumber: "001",
      status: "Active",
    },
  });

  // Customers matching mock data
  const john = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      phone: "(818) 555-0100",
      passwordHash: hash,
      plan: "Business",
      planTerm: "6",
      suiteNumber: "247",
      status: "Active",
      createdAt: new Date("2026-01-12"),
    },
  });

  const maria = await prisma.user.create({
    data: {
      name: "Maria Garcia",
      email: "maria@garcia.co",
      passwordHash: hash,
      plan: "Premium",
      planTerm: "6",
      suiteNumber: "312",
      status: "Active",
      createdAt: new Date("2026-02-03"),
    },
  });

  const david = await prisma.user.create({
    data: {
      name: "David Kim",
      email: "david@kimlaw.com",
      passwordHash: hash,
      plan: "Business",
      planTerm: "3",
      suiteNumber: "189",
      status: "Active",
      createdAt: new Date("2026-03-01"),
    },
  });

  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Johnson",
      email: "sarah.j@gmail.com",
      passwordHash: hash,
      plan: "Basic",
      planTerm: "3",
      suiteNumber: "055",
      status: "Expired",
      createdAt: new Date("2025-09-05"),
    },
  });

  const alex = await prisma.user.create({
    data: {
      name: "Alex Chen",
      email: "alex@startup.io",
      passwordHash: hash,
      plan: "Premium",
      planTerm: "14",
      suiteNumber: "401",
      status: "Active",
      createdAt: new Date("2026-03-15"),
    },
  });

  const lisa = await prisma.user.create({
    data: {
      name: "Lisa Wang",
      email: "lisa@wang.design",
      passwordHash: hash,
      plan: "Basic",
      planTerm: "6",
      suiteNumber: "102",
      status: "Active",
      createdAt: new Date("2025-12-20"),
    },
  });

  console.log("  ✓ Users created");

  // Mail items (admin recentMail[] mock data)
  await prisma.mailItem.createMany({
    data: [
      { userId: john.id, from: "IRS", type: "Letter", date: "Mar 31", status: "Scanned", scanned: true },
      { userId: maria.id, from: "Amazon", type: "Package", date: "Mar 31", status: "Awaiting Pickup", scanned: false },
      { userId: alex.id, from: "FedEx", type: "Package", date: "Mar 30", status: "Awaiting Pickup", scanned: false },
      { userId: david.id, from: "Chase Bank", type: "Letter", date: "Mar 30", status: "Scanned", scanned: true },
      { userId: lisa.id, from: "State of CA", type: "Letter", date: "Mar 29", status: "Forwarded", scanned: true },
      { userId: john.id, from: "Amazon", type: "Package", date: "Mar 29", status: "Picked Up", scanned: false },
      { userId: maria.id, from: "Wells Fargo", type: "Letter", date: "Mar 28", status: "Scanned", scanned: true },
      { userId: sarah.id, from: "USPS", type: "Letter", date: "Mar 28", status: "Held", scanned: false },
      // Additional items for John's dashboard (user mailItems[])
      { userId: john.id, from: "IRS", type: "Letter", date: "Mar 28", status: "Scanned", scanned: true },
      { userId: john.id, from: "Chase Bank", type: "Letter", date: "Mar 27", status: "Scanned", scanned: true },
      { userId: john.id, from: "Amazon", type: "Package", date: "Mar 26", status: "Awaiting Pickup", scanned: false },
      { userId: john.id, from: "State Farm", type: "Letter", date: "Mar 25", status: "Scanned", scanned: true },
      { userId: john.id, from: "USPS", type: "Letter", date: "Mar 24", status: "Forwarded", scanned: true },
      // Bulk historical items for realistic counts
      ...Array.from({ length: 15 }, (_, i) => ({
        userId: john.id,
        from: ["Bank of America", "DMV", "IRS", "Amazon", "USPS"][i % 5],
        type: i % 4 === 0 ? "Package" as const : "Letter" as const,
        date: `Mar ${10 + i}`,
        status: "Picked Up",
        scanned: true,
      })),
      ...Array.from({ length: 25 }, (_, i) => ({
        userId: maria.id,
        from: ["Amazon", "Wells Fargo", "Target", "Netflix", "USPS"][i % 5],
        type: i % 3 === 0 ? "Package" as const : "Letter" as const,
        date: `Mar ${5 + (i % 20)}`,
        status: "Picked Up",
        scanned: true,
      })),
    ],
  });

  console.log("  ✓ Mail items created");

  // Notary bookings
  await prisma.notaryBooking.createMany({
    data: [
      { userId: maria.id, date: "Apr 2", time: "10:00 AM", type: "Real Estate", status: "Confirmed" },
      { userId: david.id, date: "Apr 2", time: "2:30 PM", type: "Business Agreement", status: "Confirmed" },
      { userId: alex.id, date: "Apr 3", time: "11:00 AM", type: "Legal Document", status: "Pending" },
    ],
  });

  console.log("  ✓ Notary bookings created");

  // Delivery orders
  await prisma.deliveryOrder.createMany({
    data: [
      { userId: john.id, customerName: "John Doe", phone: "(818) 555-0100", email: "john@example.com", destination: "123 Main St, LA", zip: "91601", zone: "NoHo", price: 5.0, itemType: "Package", status: "Delivered", date: "Mar 31", courier: "DoorDash" },
      { userId: maria.id, customerName: "Maria Garcia", phone: "(818) 555-0200", email: "maria@garcia.co", destination: "456 Vine St, Hollywood", zip: "90028", zone: "Extended", price: 9.75, itemType: "Package", status: "In Transit", date: "Mar 31", courier: "DoorDash" },
      { userId: alex.id, customerName: "Alex Chen", phone: "(818) 555-0300", email: "alex@startup.io", destination: "789 Sunset Blvd, LA", zip: "90028", zone: "Extended", price: 13.50, itemType: "Package", status: "Pending", date: "Apr 1", courier: "Uber" },
      { userId: lisa.id, customerName: "Lisa Wang", phone: "(818) 555-0400", email: "lisa@wang.design", destination: "321 Vineland Ave, NoHo", zip: "91601", zone: "NoHo", price: 5.0, itemType: "Letter", status: "Delivered", date: "Mar 30", courier: "DoorDash" },
      { userId: david.id, customerName: "David Kim", phone: "(818) 555-0500", email: "david@kimlaw.com", destination: "555 Burbank Blvd, Burbank", zip: "91502", zone: "Extended", price: 11.25, itemType: "Documents", status: "Delivered", date: "Mar 29", courier: "Uber" },
    ],
  });

  console.log("  ✓ Delivery orders created");

  // Shop orders
  await prisma.shopOrder.createMany({
    data: [
      { userId: john.id, items: "Small Box ×2, Packing Tape", total: 10.50, status: "Completed", date: "Mar 30" },
      { userId: lisa.id, items: "NOHO Branded Envelopes ×1", total: 8.50, status: "Completed", date: "Mar 29" },
      { userId: david.id, items: "Large Box, Bubble Wrap, Labels", total: 18.50, status: "Ready", date: "Mar 31" },
      { userId: maria.id, items: "Poly Mailers ×1, Custom Tape", total: 27.00, status: "Pending", date: "Apr 1" },
    ],
  });

  console.log("  ✓ Shop orders created");

  // Forwarding addresses for John (from dashboard mock)
  await prisma.forwardingAddress.createMany({
    data: [
      { userId: john.id, label: "Home", address: "123 Main St, Los Angeles, CA 90001" },
      { userId: john.id, label: "Office", address: "456 Vine St, Suite 200, Hollywood, CA 90028" },
    ],
  });

  console.log("  ✓ Forwarding addresses created");
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
