import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "$2,000 LLC + Brand + Website Bundle | NOHO Mailbox",
  description:
    "Complete California LLC formation, EIN, brand book, 5-page website, and 12 months of mail at our LA street address — $2,000 flat. Real shop in NoHo, not a LegalZoom hand-off.",
  openGraph: {
    title: "$2,000 Business Launch Bundle — NOHO Mailbox",
    description:
      "California LLC + EIN + brand book + 5-page website + 12 months of mail at our LA address — $2,000 flat. Walk in for a 20-min consult.",
    url: "https://nohomailbox.org/business-solutions",
  },
  alternates: { canonical: "https://nohomailbox.org/business-solutions" },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Business Launch Bundle — LLC + Brand + Website + Mail",
  description:
    "Complete California LLC formation (state filing + EIN), brand book (logo + colors + type + 50 business cards), 5-page website on your domain, and 12 months of mail at our LA street address.",
  provider: {
    "@type": "LocalBusiness",
    name: "NOHO Mailbox",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5062 Lankershim Blvd",
      addressLocality: "North Hollywood",
      addressRegion: "CA",
      postalCode: "91601",
      addressCountry: "US",
    },
    telephone: "+1-818-506-7744",
    url: "https://nohomailbox.org",
  },
  areaServed: {
    "@type": "City",
    name: "Los Angeles",
  },
  offers: {
    "@type": "Offer",
    price: "2000",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What's included in the $2,000 Business Launch Bundle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "California LLC filing (state $70 fee included), EIN with the IRS, brand book with logo and colors and type, 50 printed business cards, a 5-page website on your domain, and 12 months of mail at our 5062 Lankershim Blvd address with free Form 1583 notary.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Typically 14–21 days end-to-end. LLC filing is 4–6 weeks at the state, but your EIN, brand book, website, and mail address are live within 7–14 days.",
      },
    },
    {
      "@type": "Question",
      name: "Are there ongoing fees beyond the $2,000?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "California requires an $800/year franchise tax for any LLC. After your first 12 months of included mail, mailbox renewal is $80/3 months on the Business plan. Domain renewal is yours (typically $12/yr). Web hosting is included for the first year.",
      },
    },
    {
      "@type": "Question",
      name: "Who owns the brand and website assets?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You do — 100%. We hand off all source files (logo SVG, brand book PDF, website code), and the domain is registered in your name. We don't lock you in.",
      },
    },
    {
      "@type": "Question",
      name: "Can I bundle just part of it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Standalone services: brand kit + website only ($1,400 for current Business-tier mailbox customers, $1,700 for new customers); LLC formation + EIN only ($350 + state fees); ongoing brand management retainer at $1,200/month.",
      },
    },
  ],
};

export default function BusinessSolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
