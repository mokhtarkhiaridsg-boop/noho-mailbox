import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About NOHO Mailbox — A Real LA CMRA, Built by Operators",
  description:
    "Operating CMRA at 5062 Lankershim Blvd in NoHo: ~500 active mailboxes, same-day delivery across LA, and a software stack we license to other operators.",
  openGraph: {
    title: "About NOHO Mailbox",
    description:
      "Real LA CMRA operating ~500 active mailboxes + same-day courier service + B2B SaaS for operators.",
    url: "https://nohomailbox.org/about",
  },
  alternates: { canonical: "https://nohomailbox.org/about" },
};

// Organization JSON-LD — drives the brand panel + sitelinks block in
// Google. Re-asserts the LocalBusiness anchor from the homepage so
// search engines connect the about-page to the storefront.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://nohomailbox.org#organization",
  name: "NOHO Mailbox",
  legalName: "NOHO Mailbox LLC",
  url: "https://nohomailbox.org",
  logo: "https://nohomailbox.org/icon.svg",
  foundingDate: "2022",
  founders: [{ "@type": "Person", name: "Mokhtar Khiari" }],
  description:
    "Independent operating CMRA in North Hollywood, CA. ~500 active mailboxes, same-day delivery across LA, walk-in notary, and a B2B SaaS platform licensed to other CMRA operators.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "5062 Lankershim Blvd",
    addressLocality: "North Hollywood",
    addressRegion: "CA",
    postalCode: "91601",
    addressCountry: "US",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+1-818-506-7744",
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: ["en"],
    },
  ],
  sameAs: [
    "https://www.facebook.com/nohomailbox",
    "https://www.instagram.com/nohomailbox",
    "https://twitter.com/nohomailbox",
    "https://www.google.com/maps/place/NOHO+Mailbox",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://nohomailbox.org" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://nohomailbox.org/about" },
  ],
};

const milestones = [
  {
    year: "2022",
    title: "Storefront opens at 5062 Lankershim",
    body:
      "Started as a small CMRA in North Hollywood — a few dozen mailboxes, a single counter staff person, no software beyond what came out of the box from iPostal1.",
  },
  {
    year: "2023",
    title: "Same-day delivery launches",
    body:
      "Added local courier service after customers kept asking. Started at $5 flat in NoHo. Grew into a 5-zone delivery operation covering most of LA County.",
  },
  {
    year: "2024",
    title: "Built our own software stack",
    body:
      "Replaced iPostal1 with custom software built specifically for operating CMRA + same-day delivery from one storefront. Took 6 months. Cut platform fees by ~30% of gross revenue.",
  },
  {
    year: "2025",
    title: "Started licensing software to other operators",
    body:
      "Operators we knew started asking if they could use our stack. We licensed the platform to the first operator in Q1 2025. Now serving operators in 4 states.",
  },
  {
    year: "2026",
    title: "Today",
    body:
      "~500 active mailboxes. 50+ B2B same-day delivery accounts. 6+ CMRA operators on our SaaS license. $2,000 Business Launch Bundle for solo founders. Affiliate + partner programs running.",
  },
];

const numbers = [
  { v: "500+", l: "Active mailboxes" },
  { v: "$28k", l: "Monthly recurring revenue (storefront)" },
  { v: "50+", l: "B2B same-day delivery accounts" },
  { v: "6+", l: "Licensed CMRA operators" },
  { v: "0", l: "USPS audit findings (across 3 audits)" },
  { v: "Mon-Sat", l: "Walk-in counter open" },
];

export default function AboutPage() {
  return (
    <div className="perspective-container" style={{ background: "#FFFDF8" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero — cream + brown iPad-OS */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span
            className="inline-flex px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] rounded-full mb-4"
            style={{
              background: "rgba(51,116,133,0.10)",
              color: "#337485",
              border: "1px solid rgba(51,116,133,0.28)",
            }}
          >
            About us
          </span>
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(1.875rem, 5.5vw, 3rem)",
              lineHeight: 1.1,
            }}
          >
            We&apos;re an operating CMRA.{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#337485", fontWeight: 400 }}>
              not a platform
            </span>
            . Not a network.
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            5062 Lankershim Blvd, North Hollywood. ~500 active mailboxes. A
            walk-in counter. Same-day delivery drivers. A software stack we
            built to run our own business — and now license to other CMRA
            operators.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-5 sm:px-6 text-center text-[12.5px] sm:text-sm font-semibold"
        style={{ background: "#2D100F", color: "#F7E6C2" }}
      >
        Real building &middot; Real staff &middot; Real customers &middot; Real walk-in counter
      </div>

      {/* Numbers */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFFDF8" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10">
            What we run today
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {numbers.map((n) => (
              <div
                key={n.l}
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <p
                  className="text-3xl md:text-4xl font-extrabold tracking-tight"
                  style={{ color: "#337485" }}
                >
                  {n.v}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-light-muted mt-2">
                  {n.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            Why we exist
          </h2>
          <p className="text-text-light text-base leading-relaxed mb-4">
            We started as a small CMRA in North Hollywood because nobody else
            was running one well in our part of LA. The big national networks
            (iPostal1, Anytime Mailbox, Earth Class Mail) work fine if
            you&apos;re anywhere in the US — but they take 20-40% of every
            transaction, and the local operator quality varies wildly.
          </p>
          <p className="text-text-light text-base leading-relaxed mb-4">
            We wanted something different: a single, real, walk-in storefront
            with one operator who owns the customer experience start to
            finish. Real address. Real receipts. Real human at the counter.
            Real software underneath.
          </p>
          <p className="text-text-light text-base leading-relaxed mb-4">
            Two years in, we&apos;d outgrown the off-the-shelf platforms and
            built our own. Six months of engineering later, we had something
            that ran our business better and cost less. Other operators started
            asking if they could use it. So now we license it.
          </p>
          <p className="text-text-light text-base leading-relaxed">
            That&apos;s the company in 4 paragraphs. We&apos;re a real CMRA
            first. The B2B SaaS, the $2k Business Launch Bundle, the affiliate
            program, the partner program — all of those are extensions of the
            same operation. Battle-tested in our own production before we sell
            it.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFFDF8" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-10">
            How we got here
          </h2>
          <ol className="space-y-5">
            {milestones.map((m) => (
              <li key={m.year} className="flex gap-5">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-white text-sm"
                  style={{ background: "#337485" }}
                >
                  {m.year}
                </div>
                <div>
                  <h3 className="font-extrabold tracking-tight text-text-light text-base mb-1">
                    {m.title}
                  </h3>
                  <p className="text-sm text-text-light-muted leading-relaxed">
                    {m.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What we sell */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            Five things we sell
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                t: "Mailbox plans",
                b: "Real LA address from $50/3 months. USPS-CMRA. Walk-in counter. For solopreneurs, freelancers, e-commerce sellers, digital nomads.",
                href: "/pricing",
              },
              {
                t: "$2k Business Launch Bundle",
                b: "California LLC + EIN + brand + 5-page website + 12 months mail. 14-day timeline. For founders launching a business.",
                href: "/business-solutions",
              },
              {
                t: "Same-day delivery",
                b: "$5 flat in NoHo, $9–$28 across LA (7-zone tier). For solo attorneys, florists, real estate, medical practices, print shops.",
                href: "/delivery",
              },
              {
                t: "CMRA SaaS",
                b: "License our software stack. $299-$1,499/mo flat. For CMRA operators tired of giving up margin to networks.",
                href: "/for-cmra-operators",
              },
              {
                t: "Affiliate + Partner programs",
                b: "25-30% commission for content creators. $300/close for CPAs / attorneys / web designers.",
                href: "/affiliates",
              },
              {
                t: "Franchise + Enterprise",
                b: "Open a NOHO Mailbox in your city ($75k initial fee). Or license our platform at enterprise scale (custom quote).",
                href: "/franchise",
              },
            ].map((c) => (
              <Link
                key={c.t}
                href={c.href}
                className="rounded-xl p-5 hover-lift transition-all"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-1">
                  {c.t}
                </h3>
                <p className="text-sm text-text-light-muted leading-relaxed">
                  {c.b}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Visit / contact — dark brown CTA */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#F7E6C2",
              fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
              lineHeight: 1.05,
            }}
          >
            Come by{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              and say hi
            </span>
          </h2>
          <p className="mt-3 text-[14px] sm:text-base leading-relaxed" style={{ color: "#F0DBA9" }}>
            5062 Lankershim Blvd, North Hollywood CA 91601. Mon&ndash;Sat. We&apos;re on
            the west side of Lankershim, between Magnolia and Otsego. 4 parking spots
            in front, free street parking after 6pm.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <a
              href="tel:18185067744"
              className="font-bold px-6 py-3.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              style={{ background: "#F7E6C2", color: "#2D100F", minHeight: 48 }}
            >
              Call (818) 506-7744
            </a>
            <Link
              href="/contact"
              className="font-bold px-6 py-3.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              style={{
                background: "rgba(247,230,194,0.10)",
                color: "#F7E6C2",
                border: "1px solid rgba(247,230,194,0.30)",
                minHeight: 48,
              }}
            >
              Send a message
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
