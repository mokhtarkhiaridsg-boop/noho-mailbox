/**
 * iter-226 — Virtual mailbox state landing pages.
 *
 * SEO problem we're solving: ranking purely for "private mailbox North
 * Hollywood" left us invisible on every out-of-state query. People
 * Googling "virtual mailbox texas" / "virtual mailbox new york" / etc.
 * are the bigger market — digital nomads, remote workers, foreign-LLC
 * owners who want a US street address, expats who need US mail handled.
 *
 * Strategy: don't pretend to have a TX/NY address (we'd lose trust).
 * Pitch is honest — "real California street address, forwarded weekly
 * to your [State] home". Targets the buyer who's in [State] but needs
 * a non-PO-box, scannable US address.
 *
 * Renders ~53 static pages, one per US state + DC + territory using
 * the same STATE_LLC_PAGES data source that powers business-solutions
 * state pages. Each gets:
 *  - State-specific H1 + meta title/desc
 *  - Service + Breadcrumb JSON-LD
 *  - State-tax context (NOHO can use the state's residency angle)
 *  - Pricing card pointing to the main /virtual-mailbox config
 *  - Internal links back to the main hub + neighbouring states
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATE_LLC_PAGES, getStateLLC, getAllStateSlugs } from "@/lib/state-llc-pages";
import { getVirtualMailbox } from "@/app/actions/virtual-mailbox";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllStateSlugs().map((state) => ({ state }));
}

type Params = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state } = await params;
  const meta = getStateLLC(state);
  if (!meta) return { title: "State not found" };

  // Title structure matches what high-volume queries actually look for:
  //   "virtual mailbox texas" / "virtual mailbox in texas" / "virtual mailbox tx"
  // Keep the state name + abbr both surface-able for the SERP snippet.
  const title = `Virtual Mailbox for ${meta.name} (${meta.abbr}) — Real US Address + Mail Forwarding`;
  const description = `Get a real California street address with weekly mail forwarding to your ${meta.name} home. Online dashboard, unlimited scanning, package handling. From $9.99/mo. Used by ${meta.name} digital nomads, remote workers, expats, and foreign LLC owners.`;

  return {
    title,
    description,
    openGraph: {
      title: `Virtual Mailbox for ${meta.name} — NOHO Mailbox`,
      description,
      url: `https://nohomailbox.org/virtual-mailbox/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/virtual-mailbox/${meta.slug}`,
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

export default async function VirtualMailboxStatePage({ params }: Params) {
  const { state } = await params;
  const meta = getStateLLC(state);
  if (!meta) notFound();

  const cfg = await getVirtualMailbox().catch(() => null);
  const startingFrom =
    cfg?.plans?.[0]?.monthly != null
      ? `$${cfg.plans[0].monthly.toFixed(2).replace(".00", "")}/mo`
      : "$9.99/mo";

  // Service JSON-LD — Google renders a service-card with provider,
  // price, areaServed when present. Targets the "virtual mailbox <state>"
  // SERP.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://nohomailbox.org/virtual-mailbox/${meta.slug}#service`,
    serviceType: "Virtual Mailbox",
    name: `Virtual Mailbox for ${meta.name} Residents`,
    description: `Real California street address with weekly mail forwarding to ${meta.name}. Unlimited online scanning, package handling, USPS Form 1583 included.`,
    url: `https://nohomailbox.org/virtual-mailbox/${meta.slug}`,
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
      "@type": "AdministrativeArea",
      name: meta.name,
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://nohomailbox.org" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Virtual Mailbox",
        item: "https://nohomailbox.org/virtual-mailbox",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: meta.name,
        item: `https://nohomailbox.org/virtual-mailbox/${meta.slug}`,
      },
    ],
  };

  // Pick 6 neighbour states for internal linking — random-ish but
  // deterministic so the rendered HTML stays stable across builds.
  const others = STATE_LLC_PAGES.filter((s) => s.slug !== meta.slug).slice(0, 6);

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
            <Link href="/virtual-mailbox" style={{ color: INK_FAINT }} className="hover:underline">Virtual Mailbox</Link>
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
            Virtual mailbox · {meta.abbr}
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
            Virtual mailbox for{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              {meta.name}
            </span>{" "}
            residents
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: INK_SOFT }}
          >
            Real California street address, scanned mail dashboard, and weekly
            forwarding to your {meta.name} home. Used by digital nomads, remote
            workers, expats, and foreign LLC owners who need a US address that
            actually accepts packages.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Get a virtual mailbox · {startingFrom}
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* Why a CA address for [State] residents */}
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
              Why {meta.name} residents pick a California address
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Same reasons LA-based folks use us — plus a few specific to {meta.abbr}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                title: "Privacy for your home address",
                body: `Don't list your ${meta.name} home on Amazon, Stripe, banks, or business filings. Use our LA address instead — your home stays off public records.`,
              },
              {
                title: "Real packages, not a P.O. Box",
                body: `UPS, FedEx, DHL, Amazon, USPS — we accept all of them. P.O. Boxes refuse private carriers. Critical for ${meta.name}-based e-commerce sellers using FBA / FBM.`,
              },
              {
                title: "Online dashboard from anywhere",
                body: `Log in from ${meta.name} (or anywhere), see every piece of mail scanned within hours, choose Scan / Forward / Shred / Recycle per item.`,
              },
              {
                title: "Weekly forwarding to your home",
                body: `We batch-forward to your ${meta.name} address weekly (or on-demand). Flat rate per pound — no surprise fees.`,
              },
              {
                title: "Foreign LLC + multi-state operations",
                body: `If you're forming an LLC outside of ${meta.name}, a real CMRA address is required for the state filing. ${meta.realAddressNote}`,
              },
              {
                title: "Digital nomad / RV life proof",
                body: `Live on the road in ${meta.name} or beyond? A stable US address that follows you online makes everything (banks, DMV, IRS) easier.`,
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

      {/* How forwarding to [State] works */}
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
              How forwarding to {meta.name} works
            </h2>
          </div>
          <ol className="space-y-4 sm:space-y-5">
            {[
              { n: "01", title: "Mail arrives at our LA storefront", body: `Carriers drop it Mon–Sat. We scan the outside within hours and notify you by SMS or email.` },
              { n: "02", title: "Decide from your dashboard", body: `Open mail → scan contents ($2/page). Keep → we hold it. Forward → goes to your ${meta.name} address in the next weekly batch. Shred → securely destroyed.` },
              { n: "03", title: "Weekly forward to your home", body: `Mondays we batch all your "forward" items and ship to your ${meta.name} address. USPS Priority is typical; FedEx 2-day available on request.` },
              { n: "04", title: "Tracked, capped, predictable", body: `Every forward gets a tracking number. Flat $5 handling + actual postage. ${meta.abbr} delivery typically 2–4 business days from LA.` },
            ].map((s) => (
              <li
                key={s.n}
                className="flex gap-4 sm:gap-5 items-start rounded-2xl p-5 sm:p-6"
                style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <span
                  className="font-extrabold leading-none tabular-nums shrink-0"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: "#F0DBA9",
                    fontSize: "clamp(2rem, 5vw, 2.75rem)",
                  }}
                >
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[15px] sm:text-base mb-1" style={{ color: INK, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}>
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
            All plans include the real LA address, scanned mail dashboard, and weekly forwarding to {meta.name}. Pick by mail volume.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
            {[
              { name: "Solo", monthly: "$9.99", note: "Up to 25 mail items/mo", popular: false },
              { name: "Pro", monthly: "$19.99", note: "Up to 100 mail items/mo · priority scans", popular: true },
              { name: "Business", monthly: "$29.99", note: "Unlimited · same-day scans · multi-user", popular: false },
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
            Start your {meta.name} virtual mailbox
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
              <path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Other states */}
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
            Also serving these states
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((s) => (
              <Link
                key={s.slug}
                href={`/virtual-mailbox/${s.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors"
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {s.name}
                <span className="text-[10px] font-bold uppercase" style={{ color: BLUE }}>
                  {s.abbr}
                </span>
              </Link>
            ))}
          </div>
          <p className="text-center text-[12.5px] mt-6" style={{ color: INK_SOFT }}>
            Or{" "}
            <Link href="/virtual-mailbox" className="font-bold underline" style={{ color: BLUE }}>
              browse the main virtual mailbox hub
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
            Get your {meta.name} virtual mailbox{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              today
            </span>
          </h2>
          <p className="mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
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
