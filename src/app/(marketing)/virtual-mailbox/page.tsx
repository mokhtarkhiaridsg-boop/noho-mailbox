import Link from "next/link";
import type { Metadata } from "next";
import { getVirtualMailbox } from "@/app/actions/virtual-mailbox";
import {
  annualSavings,
  type VirtualMailboxPlan,
} from "@/lib/virtual-mailbox-config";
import VirtualMailboxPlansInteractive from "./VirtualMailboxPlansInteractive";
import { STATE_LLC_PAGES } from "@/lib/state-llc-pages";

export const metadata: Metadata = {
  // Geo-broadened title: "United States" instead of just NoHo so we surface
  // for "virtual mailbox usa" / "virtual mailbox america" / generic queries.
  title: "Virtual Mailbox — Real US Street Address Online (All 50 States)",
  description:
    "Real LA street address, online mail scanning dashboard, and weekly forwarding to any state. From $9.99/mo. Used by digital nomads, remote workers, expats, and foreign LLC owners across all 50 states.",
  keywords: [
    "virtual mailbox",
    "virtual mailbox usa",
    "online mailbox",
    "virtual po box",
    "us mail forwarding",
    "virtual mailbox for digital nomads",
    "virtual mailbox for expats",
    "virtual mailbox for foreign llc",
    "virtual address",
    "remote mail scanning",
  ],
  openGraph: {
    title: "Virtual Mailbox — Real US Address, Forwarded Anywhere",
    description:
      "Real LA street address, mail scanning dashboard, and forwarding to any of all 50 states. From $9.99/mo.",
    url: "https://nohomailbox.org/virtual-mailbox",
  },
  // Without an explicit canonical the root layout's `https://nohomailbox.org`
  // wins and search engines collapse this page into the homepage.
  alternates: { canonical: "https://nohomailbox.org/virtual-mailbox" },
};

// Service + ItemList JSON-LD. ItemList tells Google we have state-by-state
// landing pages and helps surface the right one for "virtual mailbox <state>"
// queries.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://nohomailbox.org/virtual-mailbox#service",
  serviceType: "Virtual Mailbox",
  name: "Virtual Mailbox — Real US Address",
  description:
    "Real California street address with online mail scanning dashboard and forwarding to any US state. Used by digital nomads, remote workers, expats, foreign LLC owners.",
  url: "https://nohomailbox.org/virtual-mailbox",
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
  areaServed: [
    { "@type": "Country", name: "United States" },
    { "@type": "AdministrativeArea", name: "All 50 US states + DC + territories" },
  ],
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
    { "@type": "ListItem", position: 2, name: "Virtual Mailbox", item: "https://nohomailbox.org/virtual-mailbox" },
  ],
};

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

export default async function VirtualMailboxPage() {
  const cfg = await getVirtualMailbox();

  if (!cfg.enabled) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: BG_LIGHT, color: INK }}
      >
        <div className="max-w-md text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BLUE }}>
            Coming soon
          </p>
          <h1 className="mt-2 text-3xl font-black" style={{ fontFamily: "var(--font-baloo), sans-serif" }}>
            Virtual mailbox launching shortly
          </h1>
          <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
            We&apos;re finalising the digital-only tier. In the meantime, our
            in-store mailbox plans give you the same Lankershim Blvd address
            today.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center mt-5 rounded-2xl px-5 h-11 text-[13px] font-black uppercase tracking-[0.06em]"
            style={{
              background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
              color: CREAM,
              boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
            }}
          >
            See in-store plans
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: BG_LIGHT, color: INK }}>
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
        className="px-6 pt-16 pb-12 sm:pt-20 sm:pb-16"
        style={{
          background: `radial-gradient(ellipse at top, ${CREAM_DEEP} 0%, ${BG_LIGHT} 60%, #FFF9F3 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: BLUE }}
          >
            Virtual Mailbox
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-[-0.01em]"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            {cfg.headline}
          </h1>
          <p
            className="mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: INK_SOFT }}
          >
            {cfg.subhead}
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <a
              href="#plans"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                color: CREAM,
                boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
              }}
            >
              See plans
            </a>
            <Link
              href="/signup?plan=virtual"
              // Was background:CREAM on a cream-gradient hero — basically
              // invisible (no border-contrast). Switched to white + a stronger
              // ink border so the secondary CTA stands out from the warm
              // background. Cursor-pointer added so the affordance is clear.
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: "white",
                color: INK,
                border: `1.5px solid ${INK}`,
                boxShadow: "0 4px 14px rgba(45,16,15,0.10)",
              }}
            >
              Get started
            </Link>
          </div>

          {/* Address chip */}
          <div
            className="mt-9 mx-auto inline-flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: "white", border: `1px solid ${BORDER}` }}
          >
            <span
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
              style={{ background: CREAM, color: INK }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22 C12 22 4 14 4 9 a8 8 0 0 1 16 0 c0 5 -8 13 -8 13 z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span>
            <div className="text-left">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: BLUE }}
              >
                {cfg.digitalAddressLabel || "Your address"}
              </p>
              <p className="text-[14px] font-bold" style={{ color: INK }}>
                {cfg.digitalAddressLine}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {cfg.benefits.length > 0 && (
        <section className="px-6 py-14 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {cfg.benefits.map((b, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-5 sm:p-6"
                  style={{
                    background: "white",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "var(--shadow-cream-sm)",
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                    style={{ background: CREAM, color: INK }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12 L10 17 L19 7" />
                    </svg>
                  </span>
                  <h3 className="text-[14px] font-black mb-1.5" style={{ color: INK }}>
                    {b.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Plans (interactive — monthly/annual toggle) */}
      <section id="plans" className="px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: BLUE }}
            >
              Plans
            </p>
            <h2
              className="mt-2 text-3xl sm:text-4xl font-black"
              style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
            >
              Pick a tier — change anytime
            </h2>
            <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
              Cancel or downgrade with one click. Unused months pro-rate to your wallet.
            </p>
          </div>
          <VirtualMailboxPlansInteractive plans={cfg.plans} />
        </div>
      </section>

      {/* FAQ */}
      {cfg.faqs.length > 0 && (
        <section
          className="px-6 py-14 sm:py-16"
          style={{
            background: `linear-gradient(180deg, ${CREAM_DEEP} 0%, ${BG_LIGHT} 100%)`,
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-[11px] font-black uppercase tracking-[0.18em]"
                style={{ color: BLUE }}
              >
                Questions
              </p>
              <h2
                className="mt-2 text-3xl sm:text-4xl font-black"
                style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
              >
                Frequently asked
              </h2>
            </div>
            <div className="space-y-3">
              {cfg.faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl px-5 py-4"
                  style={{
                    background: "white",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "var(--shadow-cream-sm)",
                  }}
                >
                  <summary
                    className="cursor-pointer flex items-center justify-between gap-3 list-none"
                    style={{ color: INK }}
                  >
                    <span className="text-[14px] font-black">{f.question}</span>
                    <svg
                      className="w-4 h-4 transition-transform group-open:rotate-180 shrink-0"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6 L8 11 L13 6" />
                    </svg>
                  </summary>
                  <p
                    className="mt-3 text-[13px] leading-relaxed"
                    style={{ color: INK_SOFT }}
                  >
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Ready when you are.
          </h2>
          <p className="mt-3 text-base" style={{ color: INK_SOFT }}>
            Sign up online in 5 minutes. We&apos;ll guide you through Form 1583 and you&apos;ll be receiving mail by tomorrow.
          </p>
          <Link
            href="/signup?plan=virtual"
            className="mt-7 inline-flex items-center rounded-2xl px-7 h-13 text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
            style={{
              padding: "0 28px",
              height: 52,
              background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
              color: CREAM,
              boxShadow: "0 8px 24px rgba(45,16,15,0.32)",
            }}
          >
            Get my virtual mailbox →
          </Link>
          <p className="mt-4 text-[11px]" style={{ color: INK_FAINT }}>
            No credit-card required to browse. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── STATE FINDER — internal links to /virtual-mailbox/[state] pages ─── */}
      {/* Big topical-authority signal: 53 outbound links from the hub to
          state-targeted landing pages. Each state link is a buying-intent
          query target ("virtual mailbox texas" etc). */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: INK,
                fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)",
              }}
            >
              Virtual mailbox by state
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: INK_SOFT }}>
              Same real LA address, same scanning dashboard. Picking your home
              state lets us tailor forwarding cost + delivery time on the next page.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {STATE_LLC_PAGES.map((s) => (
              <Link
                key={s.slug}
                href={`/virtual-mailbox/${s.slug}`}
                className="group flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-colors"
                style={{
                  background: "#FFFFFF",
                  color: INK,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <span className="text-[13px] font-semibold truncate">{s.name}</span>
                <span
                  className="text-[10.5px] font-bold uppercase tracking-wider shrink-0"
                  style={{ color: BLUE }}
                >
                  {s.abbr}
                </span>
              </Link>
            ))}
          </div>

          <p className="text-center text-[12.5px] mt-8" style={{ color: INK_SOFT }}>
            Not in the US? We also serve international customers —{" "}
            <Link href="/contact" className="font-bold underline" style={{ color: BLUE }}>
              contact us
            </Link>{" "}
            to set up.
          </p>
        </div>
      </section>
    </main>
  );
}

// Re-export so the interactive component can pull plan + savings helpers
// without re-importing from the lib (keeps page deps tight).
export type { VirtualMailboxPlan };
export { annualSavings };
