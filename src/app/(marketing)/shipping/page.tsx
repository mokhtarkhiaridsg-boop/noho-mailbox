import type { Metadata } from "next";
import { ShippingQuoteClient } from "./shipping-client";

export const metadata: Metadata = {
  title: "Shipping Quote — NOHO Mailbox",
  description:
    "Compare shipping rates from USPS, UPS, FedEx, and DHL. Get an instant quote with dimensions and weight. Same-day local delivery available.",
  openGraph: {
    title: "Get a Shipping Quote — NOHO Mailbox",
    description:
      "Instant shipping rate comparison. Enter your package details and get quotes from all major carriers plus same-day local delivery.",
    url: "https://nohomailbox.org/shipping",
  },
  alternates: { canonical: "https://nohomailbox.org/shipping" },
};

export default function ShippingPage() {
  return <ShippingQuoteClient />;
}
