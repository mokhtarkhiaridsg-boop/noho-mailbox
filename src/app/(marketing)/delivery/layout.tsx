import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Same-Day Delivery — $5 NoHo, $9–$28 LA",
  description:
    "Same-day courier in the San Fernando Valley + Greater LA. $5 NoHo, $9–$28 across LA. No membership, no contract, walk-in storefront at 5062 Lankershim Blvd.",
  openGraph: {
    title: "Same-Day Delivery — NOHO Mailbox",
    description: "Same-day local delivery in the San Fernando Valley. Your mail and packages, delivered to your door.",
    url: "https://nohomailbox.org/delivery",
  },
  alternates: { canonical: "https://nohomailbox.org/delivery" },
};

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
