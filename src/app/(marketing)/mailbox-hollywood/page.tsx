/**
 * iter-228 — "Mailbox Hollywood" hyperlocal SEO page.
 *
 * Targets the entertainment-industry-adjacent local queries:
 *   - "mailbox hollywood"
 *   - "private mailbox hollywood"
 *   - "mailbox rental hollywood"
 *
 * Strategy: we&apos;re a 14-minute drive from Hollywood proper, 5 minutes
 * from Universal Studios, and a few minutes from Burbank&apos;s studio row.
 * Pitch is the entertainment-creator angle: screenplays, residual checks,
 * NDAs, agent mailings, royalty statements — privately, off your home
 * address.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Mailbox for Hollywood Creators — Real Address, Off Your Home",
  description:
    "Private mailbox for Hollywood writers, actors, and creators. 5 min from Universal, 14 min from West Hollywood. Real address, residual checks, NDAs. From $50/mo.",
  openGraph: {
    title: "Mailbox for Hollywood Creators — NOHO Mailbox",
    description:
      "Real address for screenwriters, actors, content creators. 5 min from Universal, 14 min from West Hollywood. From $50/mo.",
    url: "https://nohomailbox.org/mailbox-hollywood",
  },
  alternates: {
    canonical: "https://nohomailbox.org/mailbox-hollywood",
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

export default function MailboxHollywoodPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/mailbox-hollywood#service",
    serviceType: "Private Mailbox Rental",
    name: "Private Mailbox for Hollywood Creators",
    description:
      "Private mailbox with real street address for Hollywood writers, actors, and creators. Five minutes from Universal Studios, 14 minutes from West Hollywood. Residual checks, NDAs, agent mailings handled.",
    url: "https://nohomailbox.org/mailbox-hollywood",
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
      name: "Hollywood",
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
      { "@type": "ListItem", position: 2, name: "Mailbox Hollywood", item: "https://nohomailbox.org/mailbox-hollywood" },
    ],
  };

  const studios = [
    { name: "Universal Studios", drive: "5 min" },
    { name: "Warner Bros. Burbank", drive: "8 min" },
    { name: "Disney Studios", drive: "10 min" },
    { name: "NBCUniversal HQ", drive: "5 min" },
    { name: "Hollywood (90028)", drive: "14 min" },
    { name: "West Hollywood", drive: "20 min" },
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
            <span style={{ color: INK }} className="font-semibold">Mailbox Hollywood</span>
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
            5 min from Universal · 14 min from West Hollywood
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
            Mailbox for{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              Hollywood
            </span>{" "}
            creators — 5 min from Universal, 14 min from West Hollywood.
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
            Writers, actors, directors, editors, content creators — keep your
            home address off WGA filings, residual checks, agent mailings, and
            studio NDAs. NOHO Mailbox is a few minutes from Universal, Warner
            Bros., Disney, NBCUniversal, and Hollywood proper. Real CMRA street
            address — accepted on every studio paperwork form.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve creator mailbox · from $50/mo
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

      {/* Studio reach */}
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
              Closer to the studios than Hollywood is
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Most of the LA production world is actually in Burbank and Universal City. We&apos;re right between them.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {studios.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl p-4 sm:p-5"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <p className="text-[13px] font-bold" style={{ color: INK }}>{s.name}</p>
                <p
                  className="font-extrabold tabular-nums mt-1"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: BLUE,
                    fontSize: "clamp(1.5rem, 4vw, 1.75rem)",
                    lineHeight: 1,
                  }}
                >
                  {s.drive}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why creators pick us */}
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
              Why entertainment pros pick us
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Six things that matter when industry mail is part of your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { title: "Keep your home address off WGA filings", body: "WGA, SAG-AFTRA, DGA filings, residual checks, royalty statements — use ours, not yours. Stops studios, fans, and strangers from finding where you live." },
              { title: "Residual + royalty check handling", body: "Studios send hard-copy residual checks. We sign for them, scan the envelope, and either hold for pickup or forward to your loan-out address." },
              { title: "All carriers, every package", body: "Scripts couriered from agencies, swag from premieres, FedEx-only studio packets — we sign for everything. P.O. Boxes refuse private carriers." },
              { title: "Mail scanning while on set or tour", body: "Shooting in Vancouver, tour in Europe, residency in Vegas — we scan envelopes the day they arrive. Decide what to do from your phone." },
              { title: "Loan-out company address", body: "Need a CA business address for your loan-out S-corp? Our 5062 Lankershim address works for the SOS filing, CTRA, and Schedule C." },
              { title: "Free notary for mailbox holders", body: "Tax forms, NDAs, lease docs — notarized free for mailbox holders. No more $25 stamps at the UPS Store." },
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
            Creator pricing
          </h2>
          <p className="mt-2 max-w-md mx-auto text-[14.5px]" style={{ color: INK_SOFT }}>
            $50/mo gets you a real CMRA address acceptable on every studio form.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              { name: "Small", monthly: "$50", note: "Mail + small packages", popular: false },
              { name: "Medium", monthly: "$80", note: "Most popular · scripts + bigger packages", popular: true },
              { name: "Large", monthly: "$95", note: "Loan-out S-corp · high-volume", popular: false },
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
            Browse the entertainment corridor
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: "hollywood", name: "Hollywood" },
              { slug: "west-hollywood", name: "West Hollywood" },
              { slug: "universal-city", name: "Universal City" },
              { slug: "burbank", name: "Burbank" },
              { slug: "studio-city", name: "Studio City" },
              { slug: "toluca-lake", name: "Toluca Lake" },
              { slug: "north-hollywood", name: "North Hollywood" },
              { slug: "beverly-hills", name: "Beverly Hills" },
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
            Touring or out-of-town? See our{" "}
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
            Off your home address.{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              On the lot
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Set up in 15 minutes. Real CMRA address acceptable on every studio form.
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
