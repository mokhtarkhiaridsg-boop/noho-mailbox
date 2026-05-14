/**
 * iter-228 — "Mailbox North Hollywood" hyperlocal SEO page.
 *
 * Targets the strongest brand-adjacent local queries:
 *   - "mailbox north hollywood"
 *   - "noho mailbox" (the brand name surface)
 *   - "private mailbox north hollywood"
 *   - "mailbox rental noho"
 *
 * Strategy: this is our home turf — strongest E-E-A-T signal possible.
 * Lean into landmarks (Lankershim, Magnolia, NoHo Arts District, Metro
 * Red Line), 8-year operating history, family ownership.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Mailbox North Hollywood — Family-Owned at 5062 Lankershim",
  description:
    "The original North Hollywood mailbox. Family-owned since 2017 at 5062 Lankershim Blvd in the NoHo Arts District. Real address, packages, scanning. From $50/mo.",
  openGraph: {
    title: "NOHO Mailbox — North Hollywood&apos;s Family-Owned Mailbox",
    description:
      "8 years on Lankershim. Real address, every carrier accepted, free notary. From $50/mo.",
    url: "https://nohomailbox.org/mailbox-north-hollywood",
  },
  alternates: {
    canonical: "https://nohomailbox.org/mailbox-north-hollywood",
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

export default function MailboxNorthHollywoodPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/mailbox-north-hollywood#service",
    serviceType: "Private Mailbox Rental",
    name: "Private Mailbox in North Hollywood",
    description:
      "Family-owned private mailbox at 5062 Lankershim Blvd in the NoHo Arts District. Real street address, package handling, scanning, free notary, and same-day courier.",
    url: "https://nohomailbox.org/mailbox-north-hollywood",
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
      name: "North Hollywood",
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
      { "@type": "ListItem", position: 2, name: "Mailbox North Hollywood", item: "https://nohomailbox.org/mailbox-north-hollywood" },
    ],
  };

  const landmarks = [
    { name: "NoHo Arts District", distance: "0.4 mi" },
    { name: "NoHo Metro (Red Line)", distance: "0.5 mi" },
    { name: "Magnolia Blvd", distance: "0.3 mi" },
    { name: "Lankershim & Magnolia", distance: "0.1 mi" },
    { name: "Universal Studios", distance: "3.7 mi" },
    { name: "Burbank Studios", distance: "3.4 mi" },
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
            <span style={{ color: INK }} className="font-semibold">Mailbox North Hollywood</span>
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
            Family-owned since 2017 · NoHo Arts District
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
            The original{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              North Hollywood
            </span>{" "}
            mailbox — family-owned at 5062 Lankershim.
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
            We&apos;re the NoHo mailbox. Not a UPS Store, not a Postnet — same
            family, same storefront, same block of Lankershim for eight years.
            Half a mile from the NoHo Metro stop, around the corner from
            Magnolia, and a short drive from every studio in the valley.
            5062 Lankershim Blvd, North Hollywood, CA 91601.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve a NoHo mailbox · from $50/mo
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
        </div>
      </section>

      {/* Landmarks */}
      <section className="px-5 sm:px-6 py-10 sm:py-14" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-center font-extrabold tracking-tight mb-6"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            }}
          >
            Right here in NoHo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {landmarks.map((l) => (
              <div
                key={l.name}
                className="rounded-2xl p-4 sm:p-5 text-center"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <p className="text-[13px] font-bold" style={{ color: INK }}>{l.name}</p>
                <p
                  className="font-extrabold tabular-nums mt-1"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: BLUE,
                    fontSize: "clamp(1.25rem, 3.5vw, 1.5rem)",
                    lineHeight: 1,
                  }}
                >
                  {l.distance}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why NoHo picks us */}
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
              Why North Hollywood picks us
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Eight years of getting NoHo&apos;s mail right.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { title: "Real 91601 street address", body: "5062 Lankershim Blvd #XXX. Use it on bank apps, business filings, Stripe, Amazon. Not a P.O. Box — banks accept it." },
              { title: "All carriers accepted", body: "USPS, UPS, FedEx, DHL, Amazon — every package, every time. We sign and text you the moment it lands." },
              { title: "Free notary on Lankershim", body: "USPS Form 1583, lease docs, affidavits — notarized free for mailbox holders. Walk in with your ID." },
              { title: "Mail scanning", body: "Touring, on set, or just busy? We scan envelopes the day they arrive. Tap Open / Forward / Shred from your phone." },
              { title: "Same-day courier across the valley", body: "Don&apos;t want to come in? Our courier brings mail and packages to your NoHo, Burbank, or Studio City door same-day." },
              { title: "Family-owned, not a franchise", body: "Eight years on Lankershim. Same family, same staff. You&apos;ll talk to a human who knows you — not a corporate call center." },
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
            NoHo pricing
          </h2>
          <p className="mt-2 max-w-md mx-auto text-[14.5px]" style={{ color: INK_SOFT }}>
            Walk in any weekday, no setup fee, no annual contract trick.
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
            Full pricing
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
              <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Internal links */}
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
            Or browse the rest of the valley
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "north-hollywood", name: "North Hollywood" },
              { slug: "valley-village", name: "Valley Village" },
              { slug: "toluca-lake", name: "Toluca Lake" },
              { slug: "studio-city", name: "Studio City" },
              { slug: "burbank", name: "Burbank" },
              { slug: "universal-city", name: "Universal City" },
              { slug: "sherman-oaks", name: "Sherman Oaks" },
              { slug: "van-nuys", name: "Van Nuys" },
              { slug: "hollywood", name: "Hollywood" },
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
            See you on{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              Lankershim
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            5062 Lankershim Blvd, North Hollywood, CA 91601. Mon–Fri 9–6, Sat 10–3.
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
