import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Same-Day Local Delivery",
  description:
    "Same-day mail and package delivery anywhere in the San Fernando Valley. Get your items brought to your door — no trip to the store needed.",
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
