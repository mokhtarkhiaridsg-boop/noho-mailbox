import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Supplies Shop",
  description:
    "Boxes, envelopes, tape, bubble wrap, and packing materials — everything you need to ship, available in-store at NOHO Mailbox.",
  openGraph: {
    title: "Shop Shipping Supplies — NOHO Mailbox",
    description: "Buy boxes, envelopes, tape, and packing materials at NOHO Mailbox in North Hollywood.",
    url: "https://nohomailbox.org/shop",
  },
  alternates: { canonical: "https://nohomailbox.org/shop" },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
