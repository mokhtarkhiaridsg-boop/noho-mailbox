import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "NOHO Mailbox Platform — SaaS for CMRA Operators",
  description:
    "License the NOHO Mailbox software platform — admin console, customer dashboard, mail intake, delivery dispatch, Square + Shippo integrations, CMRA-compliance reporting. Built and battle-tested by an operating CMRA.",
  serviceType: "B2B SaaS",
  provider: {
    "@type": "Organization",
    name: "NOHO Mailbox",
    url: "https://nohomailbox.org",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5062 Lankershim Blvd",
      addressLocality: "North Hollywood",
      addressRegion: "CA",
      postalCode: "91601",
      addressCountry: "US",
    },
    telephone: "+1-818-506-7744",
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "299.00",
    highPrice: "1499.00",
    offerCount: 3,
  },
};

export const metadata: Metadata = {
  title: "Software Platform for CMRA Operators — License the NOHO Stack",
  description:
    "License the same software running NOHO Mailbox: admin console, member dashboard, CMRA quarterly reporting, mail scanning, Shippo + Square + Resend integrations. From $299/mo per location.",
  openGraph: {
    title: "License the NOHO Mailbox Platform — For CMRA Operators",
    description:
      "Stop running your CMRA on spreadsheets. License the same battle-tested software powering NOHO Mailbox.",
    url: "https://nohomailbox.org/for-cmra-operators",
  },
  alternates: { canonical: "https://nohomailbox.org/for-cmra-operators" },
};

const stack = [
  {
    title: "Admin console",
    body:
      "Customer management, mail intake (with barcode scanner via BarcodeDetector), package alerts, quarterly CMRA statements (auto-generated), Shippo label printing, Square payment links, message threads.",
  },
  {
    title: "Customer dashboard",
    body:
      "Mail viewer with high-res scans, package alerts, forward / discard / hold requests, recurring delivery, vacation hold, junk-sender block, wallet credits, document vault.",
  },
  {
    title: "CMRA compliance",
    body:
      "Auto-generated quarterly statements with USPS-formatted addresses, CMRA-required ID and Form 1583 storage, audit log, exportable for postmaster review.",
  },
  {
    title: "Delivery dispatch",
    body:
      "7-zone same-day delivery with editable zones, instant quote API, recurring routes, photo proof of delivery, ETA windows.",
  },
  {
    title: "Payments + shipping",
    body:
      "Square checkout (manual link flow), Shippo label purchase, refund, multi-carrier (USPS / UPS / FedEx / DHL), label margin markup.",
  },
  {
    title: "Compliance + audit",
    body:
      "PII vault for ID images, KYC flow, role-based admin access, complete audit log on every customer action.",
  },
];

const tiers = [
  {
    name: "Solo",
    price: "$299",
    sub: "/month per location",
    features: [
      "Up to 250 active customers",
      "1 admin seat",
      "Email support (24h response)",
      "Hosted on shared infra",
      "Square + Shippo + Resend integration",
      "Quarterly CMRA reporting",
    ],
    primary: false,
  },
  {
    name: "Multi-Location",
    price: "$799",
    sub: "/month per location",
    features: [
      "Up to 1,000 active customers / location",
      "Unlimited admin seats",
      "Phone support (Mon-Fri 9-5 PT)",
      "Custom subdomain + brand kit",
      "API access",
      "Operator dashboard across locations",
      "Quarterly compliance audit prep",
    ],
    primary: true,
  },
  {
    name: "Enterprise",
    price: "$1,499+",
    sub: "/month per location",
    features: [
      "Unlimited customers",
      "Dedicated infrastructure",
      "SLA + named CSM",
      "White-label",
      "Custom integrations",
      "On-site training",
      "Quarterly business review",
    ],
    primary: false,
  },
];

const why = [
  {
    title: "Built by an operating CMRA",
    body:
      "We&apos;re NOHO Mailbox at 5062 Lankershim. Every feature exists because we needed it Wednesday morning. No theoretical product manager — operator-built.",
  },
  {
    title: "USPS-CMRA compliance baked in",
    body:
      "Form 1583, Form 1583-A, quarterly statement formatting, audit trail — designed to pass postmaster review without manual cleanup.",
  },
  {
    title: "All integrations production-tested",
    body:
      "Square checkout, Shippo (rates / labels / refunds), Resend (transactional + marketing), Turso (libSQL multi-region), NextAuth, Vercel Blob — all battle-tested daily.",
  },
  {
    title: "Mobile-first member dashboard",
    body:
      "Most CMRA software is desktop-only and ugly. Yours doesn&apos;t have to be. Members get a real app-like experience that retains them.",
  },
];

const target = [
  {
    title: "CMRAs running on spreadsheets",
    body:
      "If your customer list lives in Excel, you&apos;re leaving $1k–$10k/month of upsell on the table — recurring delivery, mail scanning, forwarding, package alerts, business solutions.",
  },
  {
    title: "UPS Store / PostalAnnex franchisees",
    body:
      "Looking to add real CMRA capabilities + same-day local delivery without paying corporate&apos;s tax on every line item. License the stack as a side-by-side independent operation.",
  },
  {
    title: "New CMRA operators",
    body:
      "Skip 6–12 months of building software. Open with our platform from day one and spend your time on customers, not code.",
  },
  {
    title: "Multi-location operators",
    body:
      "If you have 3+ stores, your software bill is probably $5k–$20k/month across plans, postage labels, payment processors. Consolidate on one platform.",
  },
];

export default function ForCmraOperatorsPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      {/* Hero */}
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
            B2B SAAS · FOR CMRA OPERATORS
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Run your CMRA on{" "}
            <span style={{ color: "#F5A623" }}>real software.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            License the same platform that runs NOHO Mailbox at 5062 Lankershim
            — admin console, member dashboard, CMRA compliance, delivery
            dispatch, Square + Shippo + Resend integrations. Built by an
            operating CMRA, for operating CMRAs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a 30-min demo
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

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        From $299/mo · Production-tested daily · USPS-CMRA compliance baked in
      </div>

      {/* Stack */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What you get
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            The complete stack — admin, member, compliance, dispatch, payments —
            ready on day one.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stack.map((s, i) => (
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

      {/* Tiers */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-2xl p-7 hover-lift animate-fade-up flex flex-col`}
                style={
                  t.primary
                    ? {
                        background:
                          "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                        boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
                        color: "#fff",
                        animationDelay: `${i * 80}ms`,
                      }
                    : {
                        background: "#FFFFFF",
                        border: "1px solid #E8D8C4",
                        boxShadow: "var(--shadow-md)",
                        animationDelay: `${i * 80}ms`,
                      }
                }
              >
                <h3
                  className="font-extrabold tracking-tight text-xl mb-2"
                  style={{ color: t.primary ? "#FFE4A0" : "#2D100F" }}
                >
                  {t.name}
                </h3>
                <p
                  className="text-4xl font-extrabold tracking-tight mb-1"
                  style={{ color: t.primary ? "#FFE4A0" : "#337485" }}
                >
                  {t.price}
                </p>
                <p
                  className="text-xs mb-5"
                  style={{
                    color: t.primary ? "rgba(255,255,255,0.7)" : "#7A6050",
                  }}
                >
                  {t.sub}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="text-sm flex items-start gap-2"
                      style={{
                        color: t.primary ? "rgba(255,255,255,0.85)" : "#7A6050",
                      }}
                    >
                      <span
                        className="mt-1 w-3 h-3 flex-shrink-0"
                        style={{
                          color: t.primary ? "#FFE4A0" : "#337485",
                        }}
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/for-cmra-operators/apply"
                  className="block text-center font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5"
                  style={
                    t.primary
                      ? {
                          background: "#FFE4A0",
                          color: "#5A3A12",
                        }
                      : {
                          background: "#337485",
                          color: "#FFFFFF",
                        }
                  }
                >
                  Book demo
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Who this is for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {target.map((t, i) => (
              <div
                key={t.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
                  {t.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-light-muted">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Why our platform vs build-your-own
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {why.map((w, i) => (
              <div
                key={w.title}
                className="rounded-xl p-5 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-bold text-text-light text-base mb-1">
                  {w.title}
                </h3>
                <p className="text-sm text-text-light-muted leading-relaxed">
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            See it running on a real CMRA
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            30-minute demo of the platform powering an operating CMRA. We&apos;ll
            run through admin, customer, compliance, and dispatch — and quote
            your migration based on your customer count.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a 30-min demo
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
