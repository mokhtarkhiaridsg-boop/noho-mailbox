import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about NOHO Mailbox — pricing, USPS Form 1583, mail forwarding, package handling, notary services, and more.",
  openGraph: {
    title: "Frequently Asked Questions — NOHO Mailbox",
    description: "Find answers about mailbox rental, pricing, mail forwarding, and all NOHO Mailbox services.",
    url: "https://nohomailbox.org/faq",
  },
  alternates: { canonical: "https://nohomailbox.org/faq" },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
