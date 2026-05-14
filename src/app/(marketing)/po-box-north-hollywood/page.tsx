/**
 * iter-228 — "PO Box North Hollywood" comparison page.
 *
 * Targets the dual low-competition local queries the Iter-228 keyword
 * research surfaced:
 *   - "noho po box" (70–110 searches/mo, LOW competition)
 *   - "north hollywood po box" (90–140 searches/mo, LOW competition)
 *
 * Strategy: we can&apos;t out-rank USPS for the bare "PO Box" national term,
 * so we win the comparison query — &quot;PO Box vs Private Mailbox&quot; &amp; &quot;real
 * PO box alternative North Hollywood&quot;. Angle: real street address that
 * accepts UPS/FedEx/Amazon (USPS PO Box rejects 100% of non-USPS
 * carriers), digital scan dashboard, same-day local courier.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "PO Box North Hollywood? Get a Real Address Instead — NOHO Mailbox",
  description:
    "Looking for a North Hollywood PO Box? Get a real 5062 Lankershim street address that accepts UPS, FedEx, Amazon — plus mail scanning, free notary, and same-day delivery. From $50/3 mo.",
  openGraph: {
    title: "PO Box in North Hollywood? Get a Real Address Instead.",
    description:
      "Real street, not a numbered box. Accepts UPS/FedEx/Amazon. From $50/3 mo at 5062 Lankershim.",
    url: "https://nohomailbox.org/po-box-north-hollywood",
  },
  alternates: {
    canonical: "https://nohomailbox.org/po-box-north-hollywood",
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

export default function PoBoxNorthHollywoodPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": "https://nohomailbox.org/po-box-north-hollywood#service",
    serviceType: "Private Mailbox Rental (PO Box Alternative)",
    name: "Real-Address Alternative to a USPS PO Box in North Hollywood",
    description:
      "A real-street-address alternative to a USPS PO Box at 5062 Lankershim Blvd in the NoHo Arts District. Accepts UPS, FedEx, DHL, and Amazon Logistics — packages a USPS PO Box cannot receive. Includes mail scanning, free notary, and same-day local delivery.",
    url: "https://nohomailbox.org/po-box-north-hollywood",
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
      {
        "@type": "ListItem",
        position: 2,
        name: "PO Box North Hollywood",
        item: "https://nohomailbox.org/po-box-north-hollywood",
      },
    ],
  };

  // PO Box vs Private Mailbox comparison rows.
  const compareRows: { label: string; usps: string; noho: string; nohoWins: boolean }[] = [
    {
      label: "Address type",
      usps: "PO Box 1234, North Hollywood",
      noho: "5062 Lankershim Blvd #XXX",
      nohoWins: true,
    },
    {
      label: "Accepts UPS / FedEx / DHL / Amazon",
      usps: "No — USPS only",
      noho: "Yes — every carrier",
      nohoWins: true,
    },
    {
      label: "Online mail scanning",
      usps: "Informed Delivery (USPS only, no inside)",
      noho: "Front + open scans on demand",
      nohoWins: true,
    },
    {
      label: "Package hold limit",
      usps: "10 days max, then returned",
      noho: "Up to 30 days, longer on Business plans",
      nohoWins: true,
    },
    {
      label: "Identity check required",
      usps: "Form 1583 + 2 IDs",
      noho: "Form 1583 + 2 IDs (we notarize free)",
      nohoWins: false,
    },
    {
      label: "Walk-in counter access",
      usps: "Lobby hours only",
      noho: "Mon–Fri 9–6, Sat 10–3",
      nohoWins: true,
    },
    {
      label: "Starting price",
      usps: "$74–$200 / 6 mo (USPS small box)",
      noho: "$50 / 3 mo (Starter)",
      nohoWins: true,
    },
  ];

  // 5 reasons locals pick a real address over a USPS PO Box.
  const reasons = [
    {
      title: "1. Amazon, FedEx, and UPS won&apos;t deliver to a PO Box — ever.",
      body: "Their carrier software literally rejects PO Box addresses. If you sell on Amazon, get vendor samples, or just order online, half your packages won&apos;t arrive. A real street address takes every carrier the same day.",
    },
    {
      title: "2. Banks reject PO Boxes for business accounts.",
      body: "Chase, Wells Fargo, Bank of America, and almost every business bank require a physical street address. Same for Stripe, PayPal Business, Amazon Seller Central, and the California Secretary of State. A USPS PO Box won&apos;t open any of them.",
    },
    {
      title: "3. You see your mail from your phone — no driving to the post office.",
      body: "Every envelope is scanned the day it arrives. Tap Open, Forward, or Shred from your phone. No more dropping by the PO Box twice a week to check if anything came in.",
    },
    {
      title: "4. We hold packages for weeks, not 10 days.",
      body: "USPS returns PO Box mail after 10 days. We hold up to 30 days on the Starter plan, and indefinitely on Business plans. If you travel, that alone is worth the switch.",
    },
    {
      title: "5. Real humans on Lankershim, not a 1-800 line.",
      body: "Family-owned since 2017. Same family, same staff, same counter. When something goes wrong, you talk to the person who took it — not a corporate call center in another time zone.",
    },
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
          style={{
            backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <nav aria-label="Breadcrumb" className="text-[11px] mb-5">
            <Link href="/" style={{ color: INK_FAINT }} className="hover:underline">
              Home
            </Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">
              PO Box North Hollywood
            </span>
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
            The real PO Box alternative · NoHo Arts District
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
            PO Box in{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              North Hollywood
            </span>
            ? Get a real address instead.
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: INK_SOFT }}
          >
            Real street, not a numbered box. Accepts UPS, FedEx, DHL, and
            Amazon — packages a USPS PO Box will never receive. From{" "}
            <strong>$50 / 3 months</strong> at 5062 Lankershim Blvd.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve a real address · $50/3 mo
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path
                  d="M4 10 H16 M12 6 L16 10 L12 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
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
              USPS PO Box vs. NOHO Private Mailbox
            </h2>
            <p
              className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base"
              style={{ color: INK_SOFT }}
            >
              Same neighborhood, same Form 1583. Very different capabilities.
            </p>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
            }}
          >
            <div
              className="grid grid-cols-3 px-4 sm:px-6 py-3 text-[11.5px] font-bold uppercase tracking-[0.14em]"
              style={{ background: SOFT, color: INK_FAINT, borderBottom: `1px solid ${BORDER}` }}
            >
              <div></div>
              <div className="text-center">USPS PO Box</div>
              <div className="text-center" style={{ color: BLUE }}>
                NOHO Mailbox
              </div>
            </div>
            {compareRows.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-3 px-4 sm:px-6 py-3.5 text-[13px] sm:text-[13.5px] items-center"
                style={{
                  borderBottom: i < compareRows.length - 1 ? `1px solid ${BORDER}` : undefined,
                }}
              >
                <div className="font-semibold pr-2" style={{ color: INK }}>
                  {row.label}
                </div>
                <div className="text-center" style={{ color: INK_SOFT }}>
                  {row.usps}
                </div>
                <div
                  className="text-center font-semibold"
                  style={{ color: row.nohoWins ? BLUE : INK_SOFT }}
                >
                  {row.noho}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 reasons */}
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
              Why locals pick this over a USPS PO Box
            </h2>
            <p
              className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base"
              style={{ color: INK_SOFT }}
            >
              Five reasons our neighbors switched.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {reasons.map((card) => (
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
                  style={{
                    color: INK,
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  }}
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

      {/* USPS pricing comparison */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: BG_LIGHT }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: INK,
                fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
              }}
            >
              The price math
            </h2>
            <p
              className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base"
              style={{ color: INK_SOFT }}
            >
              USPS PO Box pricing varies by box size and post office. Here&apos;s
              the 91601 North Hollywood window in 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
              }}
            >
              <p
                className="text-[11.5px] font-bold uppercase tracking-[0.14em]"
                style={{ color: INK_FAINT }}
              >
                USPS PO Box · 91601
              </p>
              <p
                className="font-extrabold tracking-tight mt-1 tabular-nums"
                style={{
                  fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  color: INK,
                  fontSize: "clamp(1.5rem, 4.5vw, 2rem)",
                  lineHeight: 1,
                }}
              >
                $74–$200<span className="text-base font-bold" style={{ color: INK_FAINT }}>/6 mo</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-[13.5px]" style={{ color: INK_SOFT }}>
                <li>• Small box: ~$74 / 6 mo</li>
                <li>• Medium: ~$110 / 6 mo</li>
                <li>• Large: ~$200 / 6 mo</li>
                <li>• No package acceptance (USPS only)</li>
                <li>• No scanning, no forwarding</li>
              </ul>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{
                background: INK,
                color: CREAM,
                border: `1px solid ${INK}`,
                boxShadow: "0 14px 36px rgba(45,16,15,0.20)",
              }}
            >
              <p
                className="text-[11.5px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "#F0DBA9" }}
              >
                NOHO Mailbox · Starter
              </p>
              <p
                className="font-extrabold tracking-tight mt-1 tabular-nums"
                style={{
                  fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                  fontSize: "clamp(1.5rem, 4.5vw, 2rem)",
                  lineHeight: 1,
                }}
              >
                $50<span className="text-base font-bold" style={{ color: "#F0DBA9" }}>/3 mo</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-[13.5px]" style={{ color: "#F0DBA9" }}>
                <li>• Real 91601 street address</li>
                <li>• UPS, FedEx, DHL, Amazon accepted</li>
                <li>• Mail scanning on demand</li>
                <li>• Free notary on Form 1583</li>
                <li>• Walk-in counter Mon–Sat</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: SOFT }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
            }}
          >
            All three plans
          </h2>
          <p className="mt-2 max-w-md mx-auto text-[14.5px]" style={{ color: INK_SOFT }}>
            Walk in any weekday. No setup fee, no annual contract trick.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              { name: "Starter", monthly: "$50", note: "Mail + small packages · 3 months" },
              { name: "Business", monthly: "$80", note: "All packages · free notary" },
              { name: "Premium", monthly: "$95", note: "High-volume · scan + forward" },
            ].map((tier, i) => (
              <div
                key={tier.name}
                className="rounded-2xl p-5 sm:p-6 text-left"
                style={{
                  background: i === 1 ? INK : "#FFFFFF",
                  color: i === 1 ? CREAM : INK,
                  border: `1px solid ${i === 1 ? INK : BORDER}`,
                  boxShadow:
                    i === 1
                      ? "0 14px 36px rgba(45,16,15,0.20)"
                      : "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                {i === 1 && (
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] mb-2"
                    style={{ color: "#F0DBA9" }}
                  >
                    Most popular
                  </span>
                )}
                <p
                  className="text-[13px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: i === 1 ? "#F0DBA9" : INK_FAINT }}
                >
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
                  {tier.monthly}
                  <span
                    className="text-base font-bold"
                    style={{ color: i === 1 ? "#F0DBA9" : INK_FAINT }}
                  >
                    /mo
                  </span>
                </p>
                <p
                  className="text-[13px] mt-3"
                  style={{ color: i === 1 ? "#F0DBA9" : INK_SOFT }}
                >
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
              <path
                d="M4 10 H16 M12 6 L16 10 L12 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Internal links */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: BG_LIGHT }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            }}
          >
            Compare every option
          </h2>
          <p
            className="text-[14px] sm:text-[14.5px] max-w-xl mx-auto mb-7"
            style={{ color: INK_SOFT }}
          >
            Still deciding? Read the matching guides below.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "/private-mailbox/north-hollywood", label: "Private mailbox · North Hollywood" },
              { href: "/mailbox-north-hollywood", label: "Mailbox in North Hollywood" },
              { href: "/virtual-mailbox", label: "Virtual mailbox (remote signup)" },
              { href: "/pricing", label: "All plans · pricing" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold"
                style={{ background: "#FFFFFF", color: INK, border: `1px solid ${BORDER}` }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom dark-brown CTA */}
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
            Skip the PO Box. Get a{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#F0DBA9",
                fontWeight: 400,
              }}
            >
              real address
            </span>
            .
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            5062 Lankershim Blvd, North Hollywood, CA 91601 · Mon–Fri 9–6, Sat 10–3.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{ background: CREAM, color: INK, minHeight: 48 }}
            >
              Start signup
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path
                  d="M4 10 H16 M12 6 L16 10 L12 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
