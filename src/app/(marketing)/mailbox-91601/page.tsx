/**
 * iter-228 — ZIP-specific "mailbox 91601" hyperlocal SEO page.
 *
 * Targets the dead-on-intent local SERP queries:
 *   - "mailbox 91601"
 *   - "mailbox in 91601"
 *   - "private mailbox 91601"
 *   - "po box 91601"
 *
 * Strategy: we ARE in 91601 — this is the strongest local trust signal
 * Google has for ranking us. Pitch the storefront as literally "on the
 * same block" as the searcher.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Mailbox 91601 — Private Mailbox on the Same Block",
  description:
    "Private mailbox in 91601? NOHO Mailbox is at 5062 Lankershim Blvd — the same ZIP, same neighborhood, same block as you. Real address, packages, scanning. From $50/mo.",
  openGraph: {
    title: "Mailbox in 91601 — NOHO Mailbox",
    description:
      "We&apos;re right in 91601. Real address, package handling, scanning, free notary. 5062 Lankershim Blvd, NoHo.",
    url: "https://nohomailbox.org/mailbox-91601",
  },
  alternates: {
    canonical: "https://nohomailbox.org/mailbox-91601",
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

export default function Mailbox91601Page() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/mailbox-91601#service",
    serviceType: "Private Mailbox Rental",
    name: "Private Mailbox in 91601",
    description:
      "Private mailbox with real 91601 street address, package acceptance from all carriers, online dashboard, scanning, and free notary. NOHO Mailbox is located in 91601.",
    url: "https://nohomailbox.org/mailbox-91601",
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
      "@type": "PostalCodeArea",
      postalCode: "91601",
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
      { "@type": "ListItem", position: 2, name: "Mailbox 91601", item: "https://nohomailbox.org/mailbox-91601" },
    ],
  };

  const stats = [
    { label: "Our ZIP", value: "91601" },
    { label: "Your ZIP", value: "91601" },
    { label: "Walk time", value: "<10 min" },
    { label: "Drive time", value: "<3 min" },
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
            <span style={{ color: INK }} className="font-semibold">Mailbox 91601</span>
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
            ZIP 91601 · North Hollywood
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
            Private mailbox in{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              91601
            </span>{" "}
            — real address, same block as you.
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
            NOHO Mailbox is at 5062 Lankershim Blvd, North Hollywood, CA{" "}
            <strong style={{ color: INK }}>91601</strong>. Same ZIP as you.
            If you live or run a business in 91601, this is the mailbox you walk
            to — not drive. Real street address that USPS, UPS, FedEx, DHL, and
            Amazon all deliver to.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve a 91601 mailbox · from $50/mo
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

      {/* Stats */}
      <section className="px-5 sm:px-6 py-10 sm:py-14" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 sm:p-5 text-center"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: INK_FAINT }}>{s.label}</p>
                <p
                  className="font-extrabold tabular-nums mt-1"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: INK,
                    fontSize: "clamp(1.5rem, 4.5vw, 2rem)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why 91601 locals pick us */}
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
              Why 91601 residents pick us
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Five reasons folks on Lankershim, Magnolia, and Vineland walk in instead of opening a P.O. Box.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { title: "Real 91601 street address", body: "5062 Lankershim Blvd #XXX, North Hollywood, CA 91601 — a real address you can put on bank, business, and Stripe applications. P.O. Boxes routinely get rejected." },
              { title: "Accept packages from any carrier", body: "USPS, UPS, FedEx, DHL, Amazon — we sign for them and text you the moment they land. P.O. Boxes refuse private carriers entirely." },
              { title: "Same ZIP = no postage delays", body: "Local mail between 91601 ZIPs is delivered next-day. If you&apos;re forwarding mail to your home in 91601, it&apos;s same-day or next-morning." },
              { title: "Walk-in pickup with photo ID", body: "Stop by anytime Mon–Fri 9–6, Sat 10–3. Show photo ID, get your mail. No appointment, no hassle." },
              { title: "Free notary for mailbox holders", body: "USPS Form 1583, lease agreements, affidavits, ID verifications — notarized free. Most other CMRAs in 91601 charge $15–25 per stamp." },
              { title: "Mail scanning if you can&apos;t come in", body: "Travelling or just lazy? We scan envelopes the day they arrive. Tap from your phone to Open / Forward / Shred." },
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
            91601 walk-in pricing
          </h2>
          <p className="mt-2 max-w-md mx-auto text-[14.5px]" style={{ color: INK_SOFT }}>
            No setup fee. All plans include the real 91601 address, package handling, scanning, and dashboard.
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
            Full pricing details
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
            Nearby ZIPs we serve
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "/private-mailbox/north-hollywood", label: "North Hollywood (91601)" },
              { href: "/private-mailbox/valley-village", label: "Valley Village (91607)" },
              { href: "/private-mailbox/toluca-lake", label: "Toluca Lake (91602)" },
              { href: "/private-mailbox/burbank", label: "Burbank (91502)" },
              { href: "/private-mailbox/studio-city", label: "Studio City (91604)" },
              { href: "/private-mailbox/universal-city", label: "Universal City (91608)" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold"
                style={{ background: "#FFFFFF", color: INK, border: `1px solid ${BORDER}` }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-center text-[12.5px] mt-6" style={{ color: INK_SOFT }}>
            Or get a US address without coming in — see our{" "}
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
            91601 mailbox,{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              opened today
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Walk in with your ID and we&apos;ll have you set up in 15 minutes.
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
