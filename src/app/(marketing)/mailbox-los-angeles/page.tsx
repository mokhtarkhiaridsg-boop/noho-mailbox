/**
 * iter-228 — "Mailbox Los Angeles" hyperlocal SEO page.
 *
 * Targets the realistic LA-metro local SERP queries:
 *   - "mailbox los angeles"
 *   - "private mailbox los angeles"
 *   - "mailbox rental LA"
 *   - "mailbox service los angeles"
 *
 * Strategy: don't pretend to be in DTLA or on the westside — be honest
 * that we&apos;re a NoHo storefront with LA-wide same-day courier reach.
 * That courier reach is the differentiator: an LA-based customer never
 * needs to drive to NoHo if they don&apos;t want to.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Private Mailbox Los Angeles — Real Address + Same-Day Courier",
  description:
    "A real Los Angeles mailbox with same-day courier delivery anywhere in LA County. Package handling, scanning, free notary. Central NoHo location. From $50/mo.",
  openGraph: {
    title: "Private Mailbox in Los Angeles — NOHO Mailbox",
    description:
      "Real LA street address, same-day courier across the county. From $50/mo.",
    url: "https://nohomailbox.org/mailbox-los-angeles",
  },
  alternates: {
    canonical: "https://nohomailbox.org/mailbox-los-angeles",
  },
};

const CREAM = "#F7E6C2";
const BG_LIGHT = "#FFFDF8";
const SOFT = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#7A6B57";
const BLUE = "#337485";

export default function MailboxLosAngelesPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/mailbox-los-angeles#service",
    serviceType: "Private Mailbox Rental",
    name: "Private Mailbox for Los Angeles",
    description:
      "Private mailbox with a real Los Angeles street address, package handling, online dashboard, scanning, and same-day courier delivery across LA County.",
    url: "https://nohomailbox.org/mailbox-los-angeles",
    provider: {
      "@type": "LocalBusiness",
      "@id": "https://nohomailbox.org#localbusiness",
      name: "NOHO Mailbox",
      telephone: "+1-818-506-7744",
      address: {
        "@type": "PostalAddress",
        streetAddress: "5062 Lankershim Blvd",
        addressLocality: "North Hollywood",
        addressRegion: "CA",
        postalCode: "91601",
        addressCountry: "US",
      },
    },
    areaServed: {
      "@type": "City",
      name: "Los Angeles",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "50",
      highPrice: "95",
      offerCount: 3,
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://nohomailbox.org" },
      { "@type": "ListItem", position: 2, name: "Mailbox Los Angeles", item: "https://nohomailbox.org/mailbox-los-angeles" },
    ],
  };

  const reachStats = [
    { area: "Downtown LA", drive: "30 min", courier: "Same-day" },
    { area: "Santa Monica", drive: "35 min", courier: "Same-day" },
    { area: "Beverly Hills", drive: "25 min", courier: "Same-day" },
    { area: "Hollywood", drive: "14 min", courier: "Same-day" },
    { area: "Burbank", drive: "10 min", courier: "Same-day" },
    { area: "Pasadena", drive: "25 min", courier: "Same-day" },
  ];

  return (
    <div style={{ background: BG_LIGHT }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
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
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <nav aria-label="Breadcrumb" className="text-[11px] mb-5">
            <Link href="/" style={{ color: INK_FAINT }} className="hover:underline">Home</Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">Mailbox Los Angeles</span>
          </nav>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-[10.5px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: "rgba(51,116,133,0.10)",
              color: BLUE,
              border: `1px solid rgba(51,116,133,0.28)`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
            All of LA County · Same-day courier
          </span>

          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.875rem, 5.5vw, 3rem)",
              lineHeight: 1.05,
            }}
          >
            A real{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              Los Angeles
            </span>{" "}
            mailbox — centrally located, same-day courier.
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
            Our storefront sits at 5062 Lankershim in North Hollywood — about
            as central to LA as it gets. From here we cover all of LA County
            with same-day courier delivery: Hollywood, Burbank, Studio City,
            Downtown, Santa Monica, the westside, the valley. Pick the address
            once and use it for everything.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve LA mailbox · from $50/mo
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{
                background: "#FFFFFF",
                color: INK,
                border: `1px solid ${BORDER}`,
                minHeight: 48,
              }}
            >
              See all plans
            </Link>
          </div>
        </div>
      </section>

      {/* LA reach grid */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: INK,
                fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
              }}
            >
              We reach every corner of LA
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Pick up from NoHo, or have us courier the package straight to your door.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {reachStats.map((s) => (
              <div
                key={s.area}
                className="rounded-2xl p-5"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: INK_FAINT }}>{s.area}</p>
                <p className="text-[15px] font-bold mt-2" style={{ color: INK }}>{s.drive} drive</p>
                <p className="text-[12.5px] mt-1" style={{ color: BLUE }}>{s.courier} courier</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why LA pros pick us */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: SOFT }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: INK,
                fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
              }}
            >
              Why LA pros pick a NoHo mailbox
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Centrally located, family-owned, and the price is half of what UPS Store charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { title: "One LA address for everything", body: "Banks, Stripe, Amazon, Cal-DMV, LLC filings, residency proof — one consistent street address that works across all of it." },
              { title: "Same-day courier across the county", body: "Don&apos;t drive 30 minutes to NoHo. We courier mail and packages to your DTLA, Beverly Hills, Santa Monica, or westside address same-day." },
              { title: "Every carrier accepted", body: "USPS, UPS, FedEx, DHL, Amazon — all of them. P.O. Boxes refuse private carriers. We sign and SMS." },
              { title: "Free notary", body: "Form 1583, lease docs, affidavits — included for mailbox holders. Most LA notaries charge $15–25 a stamp." },
              { title: "Scanning + dashboard", body: "Travel or just hate driving? We scan envelopes the day they arrive. Open / Forward / Shred from your phone." },
              { title: "Half what UPS Store charges", body: "$50/mo small box vs. ~$120/mo at most UPS Stores in LA proper. Same compliance, real CMRA license." },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <h3 className="font-extrabold text-[15px] mb-2" style={{ color: INK, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}>
                  {card.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: INK_SOFT }}
                  dangerouslySetInnerHTML={{ __html: card.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
            }}
          >
            Pricing
          </h2>
          <p className="mt-2 max-w-md mx-auto text-[14.5px]" style={{ color: INK_SOFT }}>
            Less than half what UPS Store charges in LA proper.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              { name: "Small", monthly: "$50", note: "Mail + small packages", popular: false },
              { name: "Medium", monthly: "$80", note: "Most popular · all packages", popular: true },
              { name: "Large", monthly: "$95", note: "High-volume · business accounts", popular: false },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl p-5 sm:p-6 text-left"
                style={{
                  background: tier.popular ? INK : "#FFFFFF",
                  color: tier.popular ? CREAM : INK,
                  border: `1px solid ${tier.popular ? INK : BORDER}`,
                  boxShadow: tier.popular
                    ? "0 14px 36px rgba(45,16,15,0.20)"
                    : "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                {tier.popular && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#F0DBA9" }}>
                    Most popular
                  </span>
                )}
                <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: tier.popular ? "#F0DBA9" : INK_FAINT }}>
                  {tier.name}
                </p>
                <p
                  className="font-extrabold tracking-tight mt-1 tabular-nums"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    fontSize: "clamp(2rem, 6vw, 2.75rem)",
                    lineHeight: 1,
                  }}
                >
                  {tier.monthly}<span className="text-base font-bold" style={{ color: tier.popular ? "#F0DBA9" : INK_FAINT }}>/mo</span>
                </p>
                <p className="text-[13px] mt-3" style={{ color: tier.popular ? "#F0DBA9" : INK_SOFT }}>
                  {tier.note}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
            style={{ background: INK, color: CREAM, minHeight: 48 }}
          >
            See full pricing
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
              <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* LA internal links */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: SOFT }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight mb-6 sm:mb-8"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            }}
          >
            Browse by LA neighborhood
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "los-angeles", name: "Los Angeles" },
              { slug: "hollywood", name: "Hollywood" },
              { slug: "west-hollywood", name: "West Hollywood" },
              { slug: "beverly-hills", name: "Beverly Hills" },
              { slug: "santa-monica", name: "Santa Monica" },
              { slug: "pasadena", name: "Pasadena" },
              { slug: "burbank", name: "Burbank" },
              { slug: "studio-city", name: "Studio City" },
              { slug: "north-hollywood", name: "North Hollywood" },
              { slug: "sherman-oaks", name: "Sherman Oaks" },
              { slug: "glendale", name: "Glendale" },
              { slug: "universal-city", name: "Universal City" },
            ].map((n) => (
              <Link
                key={n.slug}
                href={`/private-mailbox/${n.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold"
                style={{ background: "#FFFFFF", color: INK, border: `1px solid ${BORDER}` }}
              >
                {n.name}
              </Link>
            ))}
          </div>
          <p className="text-center text-[12.5px] mt-6" style={{ color: INK_SOFT }}>
            Out of state? See our{" "}
            <Link href="/virtual-mailbox" className="font-bold underline" style={{ color: BLUE }}>
              virtual mailbox plans
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: CREAM,
              fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
              lineHeight: 1.05,
            }}
          >
            One mailbox for{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              all of LA
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Sign up online in 4 minutes or call us during business hours.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{ background: CREAM, color: INK, minHeight: 48 }}
            >
              Start signup
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="tel:+18185067744"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{
                background: "rgba(247,230,194,0.10)",
                color: CREAM,
                border: "1px solid rgba(247,230,194,0.30)",
                minHeight: 48,
              }}
            >
              Or call (818) 506-7744
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
