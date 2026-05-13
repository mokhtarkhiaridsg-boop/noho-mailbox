// Server-component wrapper around ShopClient — exports proper
// metadata (which "use client" pages can't do) so the shop page gets
// a real title, description, and OG tags.

import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shipping Supplies — Boxes, Envelopes, Tape",
  description:
    "Shipping supplies in-store at NOHO Mailbox: envelopes, boxes, padded mailers, packing tape, bubble wrap, fragile stickers, and branded items. Walk in or message us.",
  openGraph: {
    title: "NOHO Mailbox · Shipping Supplies",
    description:
      "Custom envelopes, boxes, packing materials, and NOHO-branded items — everything you need in one spot.",
    url: "https://nohomailbox.org/shop",
  },
  alternates: { canonical: "https://nohomailbox.org/shop" },
};

export default function ShopPage() {
  return <ShopClient />;
}
