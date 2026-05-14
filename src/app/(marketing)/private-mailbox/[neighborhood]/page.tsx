/**
 * iter-227 — Hyper-local neighborhood landing pages.
 *
 * Companion to iter-226 (virtual-mailbox state pages). Where iter-226
 * targets out-of-state "virtual mailbox <state>" queries, this set
 * targets the opposite end of the funnel: low-competition local
 * phrases like "private mailbox burbank", "mailbox rental studio city",
 * "private mailbox sherman oaks".
 *
 * Strategy: we're at 5062 Lankershim in NoHo — a few miles from every
 * one of these neighborhoods. Pages are honest about that ("we ARE
 * in NoHo, X mi / Y min from {name}") so we don't burn trust pretending
 * to have a Burbank storefront. Also pitches our same-day courier
 * delivery, which is the actual differentiator for these adjacent areas.
 *
 * Renders ~15 static pages, one per neighborhood. Each gets:
 *  - Neighborhood-specific H1 + meta
 *  - Service + Breadcrumb JSON-LD with City areaServed
 *  - Distance / drive-time stats grid (the hook)
 *  - Pricing teaser → /pricing
 *  - Nearby neighborhood internal links
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NEIGHBORHOODS,
  getNeighborhood,
  getAllNeighborhoodSlugs,
} from "@/lib/neighborhood-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllNeighborhoodSlugs().map((neighborhood) => ({ neighborhood }));
}

type Params = { params: Promise<{ neighborhood: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { neighborhood } = await params;
  const meta = getNeighborhood(neighborhood);
  if (!meta) return { title: "Neighborhood not found" };

  // Title format mirrors what local-intent SERPs actually look like:
  //   "private mailbox burbank" / "mailbox rental burbank"
  const title = `Private Mailbox in ${meta.name} — Real Address ${meta.driveTime} from ${meta.name} · NOHO Mailbox`;
  const description = `Looking for a private mailbox ${meta.name}? NOHO Mailbox is ${meta.distance} (${meta.driveTime}) from ${meta.name}, with same-day courier delivery to ${meta.zip}. Real street address, package acceptance, online dashboard, free notary. From $50/mo.`;

  return {
    title,
    description,
    openGraph: {
      title: `Private Mailbox in ${meta.name} — NOHO Mailbox`,
      description,
      url: `https://nohomailbox.org/private-mailbox/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/private-mailbox/${meta.slug}`,
    },
  };
}

// Color tokens — match the rest of the public site (cream + brown iPad-OS).
const CREAM = "#F7E6C2";
const BG_LIGHT = "#FFFDF8";
const SOFT = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#7A6B57";
const BLUE = "#337485";

export default async function PrivateMailboxNeighborhoodPage({ params }: Params) {
  const { neighborhood } = await params;
  const meta = getNeighborhood(neighborhood);
  if (!meta) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://nohomailbox.org/private-mailbox/${meta.slug}#service`,
    serviceType: "Private Mailbox Rental",
    name: `Private Mailbox for ${meta.name} Residents`,
    description: `Private mailbox with real street address, package acceptance, online dashboard, and same-day courier delivery to ${meta.name} (${meta.zip}). ${meta.distance} from ${meta.name}.`,
    url: `https://nohomailbox.org/private-mailbox/${meta.slug}`,
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
      name: meta.name,
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
        name: "Private Mailbox",
        item: "https://nohomailbox.org/pricing",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: meta.name,
        item: `https://nohomailbox.org/private-mailbox/${meta.slug}`,
      },
    ],
  };

  // Nearby neighborhoods — match against our slug list so the links
  // only point at pages that actually exist. Falls back to a small
  // sample of other slugs if nothing matches.
  const allSlugs = new Set(getAllNeighborhoodSlugs());
  const nearbySlugs = meta.nearbyAreas
    .map((a) => a.toLowerCase().replace(/\s+/g, "-"))
    .filter((s) => allSlugs.has(s) && s !== meta.slug);
  const fallbackNearby = NEIGHBORHOODS.filter(
    (n) => n.slug !== meta.slug && !nearbySlugs.includes(n.slug)
  )
    .slice(0, Math.max(0, 4 - nearbySlugs.length))
    .map((n) => n.slug);
  const renderNearby = [...nearbySlugs, ...fallbackNearby]
    .slice(0, 6)
    .map((slug) => NEIGHBORHOODS.find((n) => n.slug === slug)!)
    .filter(Boolean);

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
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-[11px] mb-5">
            <Link href="/" style={{ color: INK_FAINT }} className="hover:underline">Home</Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <Link href="/pricing" style={{ color: INK_FAINT }} className="hover:underline">Private Mailbox</Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">{meta.name}</span>
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
            {meta.distance} · {meta.driveTime} from {meta.name}
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
            Private mailbox for{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              {meta.name}
            </span>
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: INK_SOFT }}
          >
            We&apos;re honest: our storefront is in North Hollywood, not in {meta.name}.
            But we&apos;re just {meta.distance} away ({meta.driveTime} drive), and we offer
            same-day courier delivery into {meta.zip}. Most {meta.name} customers
            never need to visit — packages and scans come to them.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Reserve your {meta.name} mailbox · from $50
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

          <p className="mt-5 text-[12.5px]" style={{ color: INK_FAINT }}>
            {meta.notes}
          </p>
        </div>
      </section>

      {/* Why {name} residents pick us */}
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
              Why {meta.name} residents pick us
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              The five things that matter when picking a private mailbox in {meta.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                title: "Privacy from your home address",
                body: `Don't list your ${meta.name} home address on Amazon, Stripe, Etsy, your business filings, or your driver's license. Use our 5062 Lankershim address instead — your real address stays off public records.`,
              },
              {
                title: "Real packages from every carrier",
                body: `UPS, FedEx, DHL, Amazon, USPS — we accept all of them, no exceptions. P.O. Boxes refuse private carriers, which kills returns and FBA shipments. Critical for ${meta.name}-based e-commerce.`,
              },
              {
                title: "Online dashboard, mail scans, control",
                body: `Every piece of mail photographed within hours of arrival. From your phone in ${meta.name}, choose Scan / Forward / Shred / Recycle per item. No driving over to check an empty box.`,
              },
              {
                title: `Same-day courier delivery to ${meta.name}`,
                body: `Got a package or document you need today? Our NOHO Delivery couriers run ${meta.zip} routes daily. Flat-rate, tracked, and SMS-updated. ${meta.driveTime} from us to your door.`,
              },
              {
                title: "Free notary, included with every plan",
                body: `Every mailbox holder gets free in-person notary at our storefront — no per-stamp fee. ${meta.distance} drive from ${meta.name}, no appointment required during business hours.`,
              },
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
                <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How close are we */}
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
              How close are we to {meta.name}?
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              5062 Lankershim Blvd, North Hollywood — easy access from {meta.name} via the 101 / 134 / 170.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Distance", value: meta.distance, sub: `From 5062 Lankershim to ${meta.name}` },
              { label: "Drive time", value: meta.driveTime, sub: "Typical, off-peak — add 5–15 min at rush" },
              { label: "Primary ZIP", value: meta.zip, sub: "Same-day courier coverage zone" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-5 sm:p-6 text-center"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: INK_FAINT }}>
                  {stat.label}
                </p>
                <p
                  className="font-extrabold tabular-nums mt-1"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: INK,
                    fontSize: "clamp(1.75rem, 5.5vw, 2.5rem)",
                    lineHeight: 1.05,
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-[12.5px] mt-2" style={{ color: INK_SOFT }}>
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-[12.5px] mt-6" style={{ color: INK_FAINT }}>
            Or skip the drive entirely —{" "}
            <Link href="/delivery" className="font-bold underline" style={{ color: BLUE }}>
              same-day courier delivery
            </Link>{" "}
            brings your packages straight to {meta.zip}.
          </p>
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
            All plans include the real street address, scanned mail dashboard, free notary, and same-day courier eligibility to {meta.name}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              { name: "Basic", monthly: "$50", note: "Personal use · standard scan volume", popular: false },
              { name: "Business", monthly: "$80", note: "LLC + business use · priority scans · check deposits", popular: true },
              { name: "Premium", monthly: "$95", note: "Unlimited · same-day scans · concierge handling", popular: false },
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
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
            style={{ background: INK, color: CREAM, minHeight: 48 }}
          >
            Reserve your {meta.name} mailbox
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
              <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Nearby areas */}
      {renderNearby.length > 0 && (
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
              Also serving nearby areas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {renderNearby.map((n) => (
                <Link
                  key={n.slug}
                  href={`/private-mailbox/${n.slug}`}
                  className="rounded-2xl p-4 sm:p-5 transition-colors"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <p className="font-extrabold text-[15px]" style={{ color: INK, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}>
                    {n.name}
                  </p>
                  <p className="text-[12px] mt-1 tabular-nums" style={{ color: INK_FAINT }}>
                    {n.distance} · {n.driveTime}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            Reserve your {meta.name} mailbox{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              today
            </span>
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            {meta.driveTime} drive from {meta.name}, or have it delivered same-day to {meta.zip}. Bring CIN/ID, sign Form 1583, walk out with keys.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl"
              style={{ background: CREAM, color: INK, minHeight: 48 }}
            >
              Reserve now
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
