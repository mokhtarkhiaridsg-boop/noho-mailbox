/**
 * iter-228 — "Mailbox near me" hyperlocal SEO page.
 *
 * Targets the realistic SERP queries we CAN rank for on page 1 in the
 * SFV/NoHo geo:
 *   - "mailbox near me"
 *   - "private mailbox near me"
 *   - "mailbox rental near me"
 *
 * Strategy: Google personalizes "near me" results — anyone within ~5 mi
 * of 5062 Lankershim will see us when our LocalBusiness + Service
 * schema is dialled in. Pitch the storefront + same-day local courier
 * (which makes "near me" meaningful even if the searcher is 8 mi out).
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Mailbox Near Me — Private Mailbox in North Hollywood, CA",
  description:
    "Looking for a mailbox near you in LA? NOHO Mailbox is at 5062 Lankershim Blvd, North Hollywood — real address, package handling, same-day local courier. From $50/mo.",
  openGraph: {
    title: "Mailbox Near Me — NOHO Mailbox (North Hollywood)",
    description:
      "Real street address, package handling, free notary, same-day local courier across LA. 5062 Lankershim Blvd, NoHo.",
    url: "https://nohomailbox.org/mailbox-near-me",
  },
  alternates: {
    canonical: "https://nohomailbox.org/mailbox-near-me",
  },
};

// Color tokens — match the rest of the public site (cream + brown iPad-OS).
const CREAM = "#F7E6C2";
const BG_LIGHT = "#FFFDF8";
const SOFT = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#7A6B57";
const BLUE = "#337485";

export default function MailboxNearMePage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/mailbox-near-me#service",
    serviceType: "Private Mailbox Rental",
    name: "Mailbox Near Me — NOHO Mailbox",
    description:
      "Private mailbox with real street address, package acceptance, online dashboard, free notary, and same-day courier delivery across Los Angeles County.",
    url: "https://nohomailbox.org/mailbox-near-me",
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

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://nohomailbox.org#localbusiness",
    name: "NOHO Mailbox",
    image: "https://nohomailbox.org/opengraph-image",
    url: "https://nohomailbox.org",
    telephone: "+1-818-506-7744",
    priceRange: "$50–$95",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5062 Lankershim Blvd",
      addressLocality: "North Hollywood",
      addressRegion: "CA",
      postalCode: "91601",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 34.1640,
      longitude: -118.3759,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "15:00",
      },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://nohomailbox.org" },
      { "@type": "ListItem", position: 2, name: "Mailbox Near Me", item: "https://nohomailbox.org/mailbox-near-me" },
    ],
  };

  const stats = [
    { label: "Address", value: "5062 Lankershim" },
    { label: "City", value: "North Hollywood" },
    { label: "ZIP", value: "91601" },
    { label: "Courier reach", value: "All of LA County" },
  ];

  return (
    <div style={{ background: BG_LIGHT }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
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
            <span style={{ color: INK }} className="font-semibold">Mailbox Near Me</span>
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
            Real storefront · Open today
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
            Looking for a mailbox near you?{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              You&apos;re in North Hollywood
            </span>
            .
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
            NOHO Mailbox is a real CMRA-licensed storefront at 5062 Lankershim
            Blvd. If you searched <em>mailbox near me</em> from anywhere in the
            San Fernando Valley, Hollywood, Burbank, or central LA — we&apos;re probably
            the closest one. And if we&apos;re not, our same-day courier brings the
            mailbox to your door instead.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve a mailbox · from $50/mo
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=5062+Lankershim+Blvd+North+Hollywood+CA+91601"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{
                background: "#FFFFFF",
                color: INK,
                border: `1px solid ${BORDER}`,
                minHeight: 48,
              }}
            >
              Get directions
            </a>
          </div>

          <p className="mt-5 text-[12.5px]" style={{ color: INK_FAINT }}>
            Family-owned since 2017 · CMRA-licensed · USPS Form 1583 in-house
          </p>
        </div>
      </section>

      {/* Map + stats */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)" }}
            >
              <iframe
                title="NOHO Mailbox storefront map"
                src="https://www.google.com/maps?q=5062+Lankershim+Blvd+North+Hollywood+CA+91601&output=embed"
                width="100%"
                height="320"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ border: 0, display: "block" }}
              />
            </div>
            <div
              className="rounded-2xl p-6 sm:p-7"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <h2
                className="font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                  color: INK,
                  fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                }}
              >
                Where we are
              </h2>
              <p className="mt-2 text-[14px]" style={{ color: INK_SOFT }}>
                Right on Lankershim, half a block from the NoHo Arts District
                Metro stop. Easy parking on Magnolia.
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl px-3 py-2.5" style={{ background: SOFT, border: `1px solid ${BORDER}` }}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: INK_FAINT }}>{s.label}</dt>
                    <dd className="text-[14px] font-bold mt-0.5" style={{ color: INK }}>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <a
                href="tel:+18185067744"
                className="mt-6 inline-flex items-center gap-2 font-bold px-5 py-3 rounded-xl"
                style={{ background: INK, color: CREAM }}
              >
                Call (818) 506-7744
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why locals pick us */}
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
              Why locals pick the mailbox down the street
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Five reasons folks driving past on Lankershim end up signing the lease.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { title: "Real street address (not a P.O. Box)", body: "5062 Lankershim Blvd #XXX — a real number you can put on bank apps, Stripe, Amazon, business licenses. P.O. Boxes get rejected." },
              { title: "We accept every carrier", body: "UPS, FedEx, DHL, Amazon, USPS — all of them. P.O. Boxes refuse private carriers. We sign for packages and SMS you when they land." },
              { title: "Same-day courier across LA", body: "Don&apos;t want to drive in? Our courier brings your mail and packages to your door same-day across LA County. Flat rates by zone." },
              { title: "Free notary on-site", body: "USPS Form 1583, contracts, affidavits — bring your ID, get it notarized. Free for mailbox holders." },
              { title: "Mail scanning + online dashboard", body: "Don&apos;t want to come in at all? We scan envelopes the day they arrive. Tap Open / Forward / Shred from your phone." },
              { title: "Family-owned since 2017", body: "Not a Postnet or UPS Store franchise. Owned and run by the same family for 8 years — talk to a human when you call." },
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
                <h3
                  className="font-extrabold text-[15px] mb-2"
                  style={{ color: INK, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: card.title }}
                />
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
            Walk-in pricing, no setup fee. All plans include the real address, package handling, scanning, and dashboard access.
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
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{ background: "#FFFFFF", color: INK, border: `1px solid ${BORDER}`, minHeight: 48 }}
            >
              See full pricing
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve mailbox
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Local internal links */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: SOFT }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-extrabold tracking-tight text-center mb-6 sm:mb-8"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            }}
          >
            Or browse by neighborhood
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "north-hollywood", name: "North Hollywood" },
              { slug: "burbank", name: "Burbank" },
              { slug: "studio-city", name: "Studio City" },
              { slug: "hollywood", name: "Hollywood" },
              { slug: "sherman-oaks", name: "Sherman Oaks" },
              { slug: "toluca-lake", name: "Toluca Lake" },
              { slug: "universal-city", name: "Universal City" },
              { slug: "valley-village", name: "Valley Village" },
            ].map((n) => (
              <Link
                key={n.slug}
                href={`/private-mailbox/${n.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors"
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {n.name}
              </Link>
            ))}
          </div>
          <p className="text-center text-[12.5px] mt-6" style={{ color: INK_SOFT }}>
            Need a US address without visiting? See our{" "}
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
            Stop driving past it.{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              Reserve yours
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Walk in any weekday or sign up online in 4 minutes. 5062 Lankershim Blvd, NoHo.
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
