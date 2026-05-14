/**
 * iter-227 — Virtual mailbox PERSONA landing pages.
 *
 * Targets buyer-intent queries:
 *   "virtual mailbox for amazon seller"
 *   "virtual mailbox for digital nomad"
 *   "virtual mailbox for expat"
 *   "virtual mailbox for foreign llc"
 * etc.
 *
 * Sibling of /virtual-mailbox/[state] (geo-keyed) — this one is keyed
 * by buyer persona, which captures higher-intent search traffic.
 *
 * Each persona page renders:
 *  - Hero with persona-specific painPoint + benefit
 *  - "Why <persona> pick us" feature cards
 *  - FAQ accordion (also drives FAQPage rich-result via JSON-LD)
 *  - Pricing teaser
 *  - "Also covering" — internal links to sibling personas
 *  - Dark-brown bottom CTA
 *
 * JSON-LD emitted: Service, FAQPage, BreadcrumbList.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PERSONAS,
  getPersona,
  getAllPersonaSlugs,
} from "@/lib/persona-pages";
import { getVirtualMailbox } from "@/app/actions/virtual-mailbox";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPersonaSlugs().map((persona) => ({ persona }));
}

type Params = { params: Promise<{ persona: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { persona } = await params;
  const meta = getPersona(persona);
  if (!meta) return { title: "Persona not found" };

  // Title structure mirrors how buyers search:
  //   "virtual mailbox for amazon seller"
  //   "virtual mailbox for digital nomad"
  // Plus a benefit-1-liner so the SERP snippet pre-sells.
  const title = `Virtual Mailbox for ${meta.name} · ${meta.benefit.split(".")[0]}`;
  const description = `${meta.painPoint} ${meta.benefit} Real LA street address, scanned mail dashboard, weekly forwarding. From $9.99/mo.`.slice(
    0,
    300,
  );

  return {
    title,
    description,
    openGraph: {
      title: `Virtual Mailbox for ${meta.name} — NOHO Mailbox`,
      description,
      url: `https://nohomailbox.org/virtual-mailbox/for/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/virtual-mailbox/for/${meta.slug}`,
    },
  };
}

// Color tokens — match the rest of the public site.
const CREAM = "#F7E6C2";
const BG_LIGHT = "#FFFDF8";
const SOFT = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#7A6B57";
const BLUE = "#337485";
const GREEN = "#3F7B4A";

export default async function VirtualMailboxPersonaPage({ params }: Params) {
  const { persona } = await params;
  const meta = getPersona(persona);
  if (!meta) notFound();

  const cfg = await getVirtualMailbox().catch(() => null);
  const startingFrom =
    cfg?.plans?.[0]?.monthly != null
      ? `$${cfg.plans[0].monthly.toFixed(2).replace(".00", "")}/mo`
      : "$9.99/mo";

  // Service JSON-LD — Google renders a service-card with provider,
  // price, audienceType when present. Targets the persona SERP.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://nohomailbox.org/virtual-mailbox/for/${meta.slug}#service`,
    serviceType: "Virtual Mailbox",
    name: `Virtual Mailbox for ${meta.name}`,
    description: `${meta.painPoint} ${meta.benefit}`,
    url: `https://nohomailbox.org/virtual-mailbox/for/${meta.slug}`,
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
    audience: {
      "@type": "Audience",
      audienceType: meta.name,
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "9.99",
      highPrice: "29.99",
      offerCount: 3,
      availability: "https://schema.org/InStock",
    },
  };

  // FAQPage JSON-LD — biggest rich-result lever. Each persona's 3 Qs
  // become a SERP accordion if Google likes them.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://nohomailbox.org",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Virtual Mailbox",
        item: "https://nohomailbox.org/virtual-mailbox",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "For",
        item: "https://nohomailbox.org/virtual-mailbox/for",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: meta.name,
        item: `https://nohomailbox.org/virtual-mailbox/for/${meta.slug}`,
      },
    ],
  };

  // Sibling personas for internal linking. Deterministic.
  const others = PERSONAS.filter((p) => p.slug !== meta.slug).slice(0, 6);

  return (
    <div style={{ background: BG_LIGHT }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
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
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-[11px] mb-5">
            <Link href="/" style={{ color: INK_FAINT }} className="hover:underline">
              Home
            </Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <Link
              href="/virtual-mailbox"
              style={{ color: INK_FAINT }}
              className="hover:underline"
            >
              Virtual Mailbox
            </Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">
              {meta.name}
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
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: BLUE }}
            />
            Virtual mailbox · for {meta.noun}s
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
            Virtual mailbox{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              for {meta.name}
            </span>
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: INK_SOFT }}
          >
            {meta.painPoint}
          </p>
          <p
            className="mt-3 max-w-2xl mx-auto text-[14.5px] sm:text-base font-semibold"
            style={{ color: INK }}
          >
            {meta.benefit}
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Get a virtual mailbox · {startingFrom}
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
              href="/virtual-mailbox"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{
                background: "#FFFFFF",
                color: INK,
                border: `1px solid ${BORDER}`,
                minHeight: 48,
              }}
            >
              See plans & features
            </Link>
          </div>
        </div>
      </section>

      {/* Why <persona> pick us — feature cards */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: BG_LIGHT }}
      >
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
              Why {meta.name} pick us
            </h2>
            <p
              className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base"
              style={{ color: INK_SOFT }}
            >
              Specific benefits we built for the {meta.noun} workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {meta.features.map((feature) => (
              <div
                key={feature}
                className="rounded-2xl p-5 sm:p-6 flex items-start gap-3"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 28,
                    height: 28,
                    background: "rgba(63,123,74,0.12)",
                    color: GREEN,
                  }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                    <path
                      d="M4 10.5 L8 14.5 L16 6.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p
                  className="text-[14px] sm:text-[14.5px] leading-relaxed"
                  style={{ color: INK }}
                >
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ accordion — also drives FAQPage rich result */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: SOFT }}
      >
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
              FAQs for {meta.name}
            </h2>
            <p
              className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base"
              style={{ color: INK_SOFT }}
            >
              The questions {meta.noun}s ask most before signing up.
            </p>
          </div>

          <div className="space-y-3">
            {meta.faq.map((f, idx) => (
              <details
                key={f.q}
                className="rounded-2xl group"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                open={idx === 0}
              >
                <summary
                  className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5"
                  style={{ color: INK }}
                >
                  <span
                    className="font-extrabold text-[14.5px] sm:text-base"
                    style={{
                      fontFamily:
                        "var(--font-baloo), 'Baloo 2', sans-serif",
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    className="shrink-0 inline-flex items-center justify-center rounded-full transition-transform group-open:rotate-45"
                    style={{
                      width: 28,
                      height: 28,
                      background: "rgba(51,116,133,0.10)",
                      color: BLUE,
                    }}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                      <path
                        d="M10 4 V16 M4 10 H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <div
                  className="px-5 pb-5 sm:px-6 sm:pb-6 text-[14px] leading-relaxed"
                  style={{ color: INK_SOFT }}
                >
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: BG_LIGHT }}
      >
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
          <p
            className="mt-2 max-w-md mx-auto text-[14.5px]"
            style={{ color: INK_SOFT }}
          >
            All plans include the real LA address, scanned mail dashboard, and weekly forwarding. Pick by mail volume.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              {
                name: "Solo",
                monthly: "$9.99",
                note: "Up to 25 mail items/mo",
                popular: false,
              },
              {
                name: "Pro",
                monthly: "$19.99",
                note: "Up to 100 mail items/mo · priority scans",
                popular: true,
              },
              {
                name: "Business",
                monthly: "$29.99",
                note: "Unlimited · same-day scans · multi-user",
                popular: false,
              },
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
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] mb-2"
                    style={{ color: "#F0DBA9" }}
                  >
                    Most popular
                  </span>
                )}
                <p
                  className="text-[13px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: tier.popular ? "#F0DBA9" : INK_FAINT }}
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
                    style={{ color: tier.popular ? "#F0DBA9" : INK_FAINT }}
                  >
                    /mo
                  </span>
                </p>
                <p
                  className="text-[13px] mt-3"
                  style={{ color: tier.popular ? "#F0DBA9" : INK_SOFT }}
                >
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
            Start your virtual mailbox
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

      {/* Also covering — sibling personas */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: SOFT }}
      >
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-extrabold tracking-tight text-center mb-6 sm:mb-8"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: INK,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            }}
          >
            Also covering
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/virtual-mailbox/for/${p.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors"
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {p.name}
              </Link>
            ))}
          </div>
          <p
            className="text-center text-[12.5px] mt-6"
            style={{ color: INK_SOFT }}
          >
            Or{" "}
            <Link
              href="/virtual-mailbox"
              className="font-bold underline"
              style={{ color: BLUE }}
            >
              browse the main virtual mailbox hub
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{
          background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)",
        }}
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
            Start your virtual mailbox{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#F0DBA9",
                fontWeight: 400,
              }}
            >
              today
            </span>
          </h2>
          <p
            className="mt-3 text-[14px] sm:text-base"
            style={{ color: "#F0DBA9" }}
          >
            Setup takes 15 minutes. Federal Form 1583 handled digitally. No paper, no notary trip.
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
