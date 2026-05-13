// Server-component wrapper around FAQClient — exports proper metadata
// (which "use client" pages can't do) so the FAQ page gets a real
// title, description, OG tags, and embeds the FAQPage JSON-LD blob
// for Google Rich Results.

import type { Metadata } from "next";
import FAQClient from "./FAQClient";
import { FAQS, FAQ_CATEGORIES } from "./faq-data";

export const metadata: Metadata = {
  title: "FAQ — Mailbox, Packages, Notary",
  description:
    "NOHO Mailbox FAQ: sign-up, USPS Form 1583, mail scanning, package holding, same-day delivery zones, plans, notary, and California LLC formation.",
  openGraph: {
    title: "NOHO Mailbox FAQ",
    description:
      "Everything you need to know about mailbox rental, mail scanning, package holding, same-day delivery, notary, and business formation in North Hollywood.",
    url: "https://nohomailbox.org/faq",
  },
  alternates: { canonical: "https://nohomailbox.org/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient faqs={FAQS} categories={FAQ_CATEGORIES} />
    </>
  );
}
