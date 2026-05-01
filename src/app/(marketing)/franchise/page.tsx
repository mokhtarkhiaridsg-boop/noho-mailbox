import type { Metadata } from "next";
import Link from "next/link";

const offerJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "NOHO Mailbox Franchise Opportunity",
  description:
    "Open a NOHO Mailbox-branded location. We provide the platform, brand, ops manual, training, and ongoing support. You provide the lease + capital.",
  serviceType: "Franchise Licensing",
  provider: {
    "@type": "Organization",
    name: "NOHO Mailbox",
    url: "https://nohomailbox.org",
  },
  offers: {
    "@type": "Offer",
    price: "75000",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    description: "Initial franchise fee + 6% royalty + $500/mo platform fee",
  },
};

export const metadata: Metadata = {
  title: "Open a NOHO Mailbox Franchise — Mailbox + Same-Day Delivery",
  description:
    "Franchise opportunity: open a NOHO Mailbox storefront in your city. Brand + platform + training + ops manual. $75k initial fee, 6% royalty, $500/mo platform fee. Operator-built, USPS-CMRA compliant.",
  openGraph: {
    title: "Franchise NOHO Mailbox",
    description:
      "Operator-built mailbox + delivery + business solutions storefront. Open one in your city.",
    url: "https://nohomailbox.org/franchise",
  },
  alternates: { canonical: "https://nohomailbox.org/franchise" },
};

const economics = [
  { label: "Initial franchise fee", v: "$75,000 one-time" },
  { label: "Royalty", v: "6% of gross monthly revenue" },
  { label: "Platform fee", v: "$500/month per location" },
  { label: "Marketing fund", v: "1% of gross (national co-op)" },
  { label: "Build-out budget", v: "$80k–$150k typical (lease, signage, fixtures)" },
  { label: "Working capital", v: "$30k recommended for first 6 months" },
];

const support = [
  {
    title: "Battle-tested platform",
    body:
      "The same software running NOHO Mailbox at 5062 Lankershim — admin console, member dashboard, CMRA compliance, delivery dispatch, payments, shipping. Production-tested daily.",
  },
  {
    title: "Brand book + signage kit",
    body:
      "Logo, type, color palette, signage specs, business card templates, packaging, uniforms. Drop-in ready for your build-out vendor.",
  },
  {
    title: "Operations manual",
    body:
      "100+ pages: opening checklist, daily routines, customer onboarding, mail intake, package scan flow, CMRA quarterly statement filing, vendor management.",
  },
  {
    title: "5-day training",
    body:
      "On-site at NOHO Mailbox in North Hollywood. You + your store manager learn admin operations, customer service, CMRA compliance, delivery dispatch.",
  },
  {
    title: "Quarterly business review",
    body:
      "30-minute call every quarter. We review your dashboard, identify upsell gaps, share what's working at other locations.",
  },
  {
    title: "Co-op marketing pool",
    body:
      "1% national marketing fund pays for SEO, blog content, ad templates, and brand-level PR. You get the leverage of multi-location budget.",
  },
];

const idealCandidate = [
  "Has $200k+ liquid capital",
  "Wants to own a service-business storefront",
  "Has retail / management experience (not required but helps)",
  "Is in a metro with 50,000+ households (mailbox demand)",
  "Speaks the dominant local language(s) — Spanish, Mandarin, Korean, Russian, Armenian a plus in many CA / NY / TX metros",
];

export default function FranchisePage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />

      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5 animate-fade-up"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            FRANCHISE OPPORTUNITY · BETA
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Open a NOHO Mailbox in{" "}
            <span style={{ color: "#F5A623" }}>your city.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Mailbox rental + same-day delivery + notary + business solutions —
            operator-built and franchise-ready. We bring the platform, brand,
            and training. You bring the lease and capital.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/contact?service=franchise-inquiry"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request the FDD
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              (818) 506-7744
            </a>
          </div>
          <p
            className="text-xs mt-6 max-w-xl mx-auto"
            style={{ color: "rgba(248,242,234,0.45)" }}
          >
            This page is informational only and does not constitute an offer to
            sell a franchise. Franchise sales subject to state registration and
            FDD delivery requirements.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        $75k initial · 6% royalty · $500/mo platform · ~$110k–$230k all-in to open
      </div>

      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            What you get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {support.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-base">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-light-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Investment + economics
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8D8C4",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {economics.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-1 sm:grid-cols-2 px-6 py-4"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid #E8D8C4",
                }}
              >
                <div className="text-sm font-bold" style={{ color: "#7A6050" }}>
                  {row.label}
                </div>
                <div
                  className="text-sm font-extrabold sm:text-right"
                  style={{ color: "#2D100F" }}
                >
                  {row.v}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-light-muted mt-4 text-center">
            Numbers above are estimates. Actual costs vary by metro and lease.
            Full Item 7 disclosure provided in the FDD upon request.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Ideal candidate
          </h2>
          <ul className="space-y-3">
            {idealCandidate.map((c) => (
              <li
                key={c}
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <span
                  className="mt-0.5 text-sm font-bold flex-shrink-0"
                  style={{ color: "#337485" }}
                >
                  ✓
                </span>
                <span className="text-sm text-text-light leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Next step: request the FDD
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            We&apos;ll send the Franchise Disclosure Document, schedule a 30-min
            intro call, and walk you through Item 7 (estimated initial
            investment) and Item 19 (financial performance representations).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?service=franchise-inquiry"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request FDD
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
