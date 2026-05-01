import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Enterprise Same-Day Courier Contracts",
  description:
    "Enterprise courier and mail-handling contracts for law firms, hospital systems, financial institutions, and corporate accounts in Greater LA. Volume pricing, NET-30 billing, dedicated dispatch.",
  serviceType: "Enterprise B2B Courier",
  provider: {
    "@type": "LocalBusiness",
    name: "NOHO Mailbox",
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
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Enterprise Accounts",
  },
};

export const metadata: Metadata = {
  title: "Enterprise Courier Contracts — Volume Pricing, NET-30, LA Coverage",
  description:
    "Enterprise same-day courier contracts for LA law firms, hospital systems, banks, and corporate offices. Volume pricing, dedicated dispatch, NET-30 billing, monthly invoices.",
  openGraph: {
    title: "Enterprise Courier Contracts — NOHO Mailbox",
    description:
      "Volume pricing for LA law firms, hospitals, banks. NET-30 billing, dedicated dispatch.",
    url: "https://nohomailbox.org/enterprise",
  },
  alternates: { canonical: "https://nohomailbox.org/enterprise" },
};

const segments = [
  {
    title: "Law firm networks",
    body:
      "Multi-attorney firms with daily court runs across Stanley Mosk, San Fernando, Burbank, Glendale courts. Volume pricing per run, NET-30 invoicing, named account manager.",
  },
  {
    title: "Hospital systems (non-PHI)",
    body:
      "Cedars, Adventist, Kaiser regional admin offices for non-PHI courier — supplies, equipment between offices, gifts, marketing materials. We do not handle PHI without a BAA.",
  },
  {
    title: "Financial institutions",
    body:
      "Daily check pickups, treasury document runs, escrow + title coordination, mortgage doc moves. Banks & lenders with predictable daily flows.",
  },
  {
    title: "Property management",
    body:
      "Multi-unit residential and commercial property managers needing daily mail handling, lockbox key swaps, vendor coordination across LA portfolios.",
  },
  {
    title: "Hospitality + events",
    body:
      "Hotel groups (deliveries to guest rooms within zone), event production (last-minute signage, swag, supplies), catering equipment (non-perishable).",
  },
  {
    title: "Corporate offices",
    body:
      "HR document delivery, mail intake for satellite offices, internal courier between branches, document destruction handoffs.",
  },
];

const advantages = [
  {
    title: "Volume pricing",
    body:
      "$10–$18/run flat for $1k+/mo accounts (vs $25–$40 minimums at ClockWork / California Courier). 30%+ savings on standard volume.",
  },
  {
    title: "NET-30 billing",
    body:
      "Monthly invoice instead of per-run charges. Easier AP processing, predictable budget. Free if you pay within terms.",
  },
  {
    title: "Dedicated dispatch",
    body:
      "Named account manager who knows your routes, your contacts, your edge cases. Phone, email, or SMS — no ticket queue.",
  },
  {
    title: "SLA + audit trail",
    body:
      "Photo proof of delivery, on-time SLAs by zone, monthly performance report. Quarterly business review.",
  },
];

const onboarding = [
  {
    n: "1",
    title: "Discovery call (30 min)",
    body:
      "Walk through your typical run patterns — origin / destination / cadence / volume. We map it to our zones.",
  },
  {
    n: "2",
    title: "Custom proposal",
    body:
      "Volume-priced quote with SLA, monthly cap, NET-30 terms. Sent within 48 hours.",
  },
  {
    n: "3",
    title: "Pilot week",
    body:
      "Start with 1–2 weeks of pilot runs. We tune dispatch and timing to your actual workflow before full contract.",
  },
  {
    n: "4",
    title: "Sign + go live",
    body:
      "Master Service Agreement signed, dedicated account manager assigned, monthly invoicing begins.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
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
            ENTERPRISE · LA COVERAGE · NET-30
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Enterprise courier{" "}
            <span style={{ color: "#F5A623" }}>built for volume.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Custom contracts for LA law firms, hospital admin offices, banks,
            and corporate accounts. Volume pricing 30%+ below the regional
            couriers. NET-30 billing. Dedicated dispatch. Photo proof on every
            run.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/contact?service=enterprise-quote"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request a custom quote
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
        Volume pricing · NET-30 · Dedicated dispatch · LA County coverage
      </div>

      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Who we serve
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((s, i) => (
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Why enterprise accounts switch to us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((a, i) => (
              <div
                key={a.title}
                className="rounded-xl p-5 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-bold text-text-light text-base mb-1">
                  {a.title}
                </h3>
                <p className="text-sm text-text-light-muted leading-relaxed">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Onboarding
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {onboarding.map((s, i) => (
              <li
                key={s.n}
                className="relative rounded-2xl p-6 animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div
                  className="absolute -top-4 -left-2 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white"
                  style={{ background: "#337485" }}
                >
                  {s.n}
                </div>
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-base mt-3">
                  {s.title}
                </h3>
                <p className="text-sm text-text-light-muted leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Get a custom quote in 48 hours
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            30-minute call to map your run patterns. Volume-priced proposal in
            48 hours. Pilot week first if you want to test before signing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?service=enterprise-quote"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request a quote
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
