import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIntlSaasPage,
  getAllIntlSaasSlugs,
} from "@/lib/international-saas-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllIntlSaasSlugs().map((country) => ({ country }));
}

type Params = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { country } = await params;
  const meta = getIntlSaasPage(country);
  if (!meta) return { title: "Country not found" };

  // `inCountry` reads naturally after prepositions like "in" / "to" — for
  // most countries it's the same as `country`, but for entries like the UK
  // or "Other countries" the data file overrides it ("the United Kingdom",
  // "any other country") so the rendered copy stays grammatical.
  const inCountry = meta.countryAfterPrep || meta.country;
  return {
    title: `CMRA / Mailbox Operator SaaS for ${meta.country}`,
    description: `License CMRA / private-mailbox / virtual-office software in ${inCountry}. Dashboard, dispatch, billing, compliance — $299/mo flat. Stripe Connect, local currency.`,
    openGraph: {
      title: `CMRA SaaS for ${meta.country} — NOHO Mailbox`,
      description: `Operator software for mailbox / private-mailbox / virtual-office businesses in ${inCountry}. $299/mo flat.`,
      url: `https://nohomailbox.org/international/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/international/${meta.slug}`,
    },
  };
}

export default async function InternationalPage({ params }: Params) {
  const { country } = await params;
  const meta = getIntlSaasPage(country);
  if (!meta) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a.replace(/&apos;/g, "'"),
      },
    })),
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-6xl mb-3 block">{meta.flag}</span>
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            CMRA SAAS · {meta.country.toUpperCase()}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            Operator software for mailbox businesses in {meta.countryAfterPrep || meta.country}
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg">
            Same battle-tested software running NOHO Mailbox in Los Angeles —
            licensed at $299/mo flat to {meta.country === "Other countries" ? "operators worldwide" : `${meta.country} operators`}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request demo
            </Link>
            <Link
              href="/for-cmra-operators"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Full pricing + features
            </Link>
          </div>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        $299–$1,499 / mo flat USD · No revenue share · Stripe Connect for local currency
      </div>

      {/* Market */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-4">
            The {meta.country} market
          </h2>
          <p className="text-text-light text-base leading-relaxed mb-4">
            {meta.marketDescription}
          </p>
          <div
            className="rounded-xl p-4 mt-4"
            style={{ background: "#FFF9F3", border: "1px solid #E8D8C4" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-text-light-muted mb-1">
              Market size
            </p>
            <p className="text-lg font-extrabold text-text-light">
              {meta.marketSize}
            </p>
          </div>
        </div>
      </section>

      {/* CMRA equivalent */}
      <section className="py-12 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-light mb-3">
            What we&apos;re calling &quot;CMRA&quot; in {meta.country}
          </h2>
          <p
            className="text-text-light-muted text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: meta.cmraEquivalent }}
          />
        </div>
      </section>

      {/* Top networks / competitors */}
      <section className="py-12 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-light mb-4">
            Local networks you might compete with
          </h2>
          <ul className="space-y-2">
            {meta.topNetworks.map((n) => (
              <li
                key={n}
                className="rounded-xl p-3 text-sm font-semibold text-text-light"
                style={{ background: "#FFF9F3", border: "1px solid #E8D8C4" }}
              >
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pitch */}
      <section className="py-12 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-light mb-3">
            Why our software fits
          </h2>
          <p
            className="text-text-light text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: meta.ourPitch }}
          />
        </div>
      </section>

      {/* Pricing / Payment / Legal */}
      <section className="py-12 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { t: "Pricing", b: meta.pricingNote, c: "#337485" },
            { t: "Payments", b: meta.paymentNote, c: "#15803d" },
            { t: "Legal / compliance", b: meta.legalNote, c: "#7A6050" },
          ].map((row) => (
            <div
              key={row.t}
              className="rounded-xl p-4"
              style={{ background: "#FFFFFF", border: "1px solid #E8D8C4" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: row.c }}
              >
                {row.t}
              </p>
              <p
                className="text-sm text-text-light leading-relaxed"
                dangerouslySetInnerHTML={{ __html: row.b }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10">
            FAQ
          </h2>
          <div className="space-y-3">
            {meta.faq.map((f, i) => (
              <details
                key={i}
                className="rounded-xl p-5"
                style={{ background: "#FFFFFF", border: "1px solid #E8D8C4" }}
              >
                <summary className="font-bold text-text-light cursor-pointer">
                  {f.q}
                </summary>
                <p
                  className="text-sm text-text-light-muted leading-relaxed mt-3"
                  dangerouslySetInnerHTML={{ __html: f.a }}
                />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-dark mb-4">
            Ready to license?
          </h2>
          <p className="text-text-dark-muted mb-6">
            30-min demo. Real product walkthrough. Migration playbook included.
            Operators in {meta.country} priority for our 2026 expansion roadmap.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Request demo
            </Link>
            <a
              href="mailto:real@nohomailbox.org"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Email us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
