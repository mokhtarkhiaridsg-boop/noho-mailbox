import type { Metadata } from "next";
import Link from "next/link";
import PartnerForm from "./PartnerForm";

export const metadata: Metadata = {
  title: "Partner Program — Earn $300 per Referral",
  description:
    "Refer your clients to NOHO Mailbox for LLC formation, branding, mail, or same-day delivery. We pay 15% on every closed referral — $300 on the bundle, $180/mo on the retainer. Free to join.",
  openGraph: {
    title: "NOHO Mailbox Partner Program — 15% Per Referral",
    description:
      "CPAs, attorneys, web designers, insurance agents — earn 15% per referral when your clients need an LLC, brand, website, or same-day delivery.",
    url: "https://nohomailbox.org/partners",
  },
  alternates: { canonical: "https://nohomailbox.org/partners" },
};

const tiers = [
  {
    title: "Business Solutions Bundle",
    price: "$2,000 close",
    payout: "$300",
    detail:
      "California LLC + EIN + brand book + 5-page website + 12 months of mail at our address. We do the work, you get $300 every time.",
    primary: true,
  },
  {
    title: "Brand Management Retainer",
    price: "$1,200 / month",
    payout: "$180/mo · 12 months",
    detail:
      "Ongoing brand + marketing retainer for your client. You earn $180 every month for the first year — $2,160 lifetime.",
  },
  {
    title: "Mailbox Plan Signup",
    price: "$50 – $295 / term",
    payout: "15% of first term",
    detail:
      "Basic, Business, or Premium mailbox. Paid once when your client&apos;s first term lands.",
  },
  {
    title: "Same-Day Delivery",
    price: "$5+ per run",
    payout: "$1 per run · capped",
    detail:
      "When your client books their first courier with us. Capped at $20/mo per partner so we keep delivery cheap.",
  },
];

const why = [
  {
    title: "You stay in your lane",
    body: "We don&apos;t do tax, immigration, insurance, or real estate. We&apos;re the next step after you finish — your client gets the rest done, you get paid for the hand-off.",
  },
  {
    title: "Paid every other Friday",
    body: "Commissions clear in 14 days, paid via Square transfer or check. We send a copy of the receipt with each payout so the trust compounds.",
  },
  {
    title: "Real shop, real humans",
    body: "Your client walks into 5062 Lankershim, talks to a real person, and leaves with their LLC filed and a brand kit in hand. No LegalZoom hand-offs.",
  },
  {
    title: "No exclusivity, no quotas",
    body: "Send 1 client or 100. Pause whenever. Leave with 30 days&apos; written notice — residual commissions on closed deals continue for the 12-month term.",
  },
];

const faqs = [
  {
    q: "How do you track which client came from me?",
    a: "Three ways, you pick: (1) a 4-letter partner code your clients mention on signup, (2) a checkbox on our intake form, or (3) you email us the prospect&apos;s name and we tag the lead.",
  },
  {
    q: "What if my client never closes?",
    a: "No commission, no obligation either way. Cold leads are free.",
  },
  {
    q: "Do I need a contract?",
    a: "Plain-English partner agreement, one page, signed digitally. Either party can pause or end the program with 30 days&apos; written notice.",
  },
  {
    q: "Can I refer Same-Day Delivery clients too?",
    a: "Yes. Capped at $20/mo so we can keep delivery prices low, but every referral feeds the bigger Business Solutions pipeline anyway.",
  },
  {
    q: "Will you send me marketing materials?",
    a: "Yes — a one-pager, business cards, and a counter sticker on request. We&apos;ll drop them off if you&apos;re in NoHo, Studio City, or Burbank.",
  },
];

export default function PartnersPage() {
  // FAQPage JSON-LD for rich Google results
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a.replace(/&apos;/g, "'"),
      },
    })),
  };
  // Service / Offer JSON-LD describing the partner program itself.
  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "NOHO Mailbox Partner Program",
    description:
      "Earn 15% commission ($300 per Business Solutions Bundle close, $180/mo on Brand Retainer for 12 months) when you refer clients to NOHO Mailbox.",
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
    areaServed: {
      "@type": "City",
      name: "Los Angeles",
    },
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
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
            FREE TO JOIN · NO QUOTAS
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Earn{" "}
            <span style={{ color: "#F5A623" }}>$300</span>{" "}
            every time you send a client.
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            CPAs, attorneys, web designers, insurance agents — when your
            clients need an LLC, a brand, a real LA address, or same-day
            delivery, we close it and pay you 15%. Three blocks from your
            office. Real humans answer the phone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="#apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Apply in 60 seconds
            </Link>
            <Link
              href="#how-it-works"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Cream personality strip */}
      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        15% commission · Paid every other Friday · 12-month residuals on retainers
      </div>

      {/* Tier cards */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What you earn
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            We pay on every product. The Business Solutions Bundle is the big
            one — most partners send 1–3 of these per month and it&apos;s an extra
            $300–$900/month for a 30-second mention.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tiers.map((t, i) => (
              <div
                key={t.title}
                className={`rounded-2xl p-7 hover-lift transition-all animate-fade-up ${
                  i % 2 === 0 ? "delay-100" : "delay-300"
                }`}
                style={
                  t.primary
                    ? {
                        background:
                          "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                        boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
                        color: "#fff",
                      }
                    : {
                        background: "#FFF9F3",
                        border: "1px solid #E8D8C4",
                        boxShadow: "var(--shadow-md)",
                      }
                }
              >
                <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
                  <h3
                    className="font-extrabold tracking-tight text-lg"
                    style={{ color: t.primary ? "#FFE4A0" : "#2D100F" }}
                  >
                    {t.title}
                  </h3>
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: t.primary ? "rgba(255,255,255,0.65)" : "#7A6050",
                    }}
                  >
                    {t.price}
                  </span>
                </div>
                <div
                  className="text-3xl font-extrabold tracking-tight mb-3"
                  style={{ color: t.primary ? "#FFE4A0" : "#337485" }}
                >
                  {t.payout}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: t.primary ? "rgba(255,255,255,0.85)" : "#7A6050",
                  }}
                >
                  {t.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-20 px-4"
        style={{ background: "#FFF9F3" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            How it works
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            From first referral to first payout, the whole loop is under 30 days.
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                n: "1",
                title: "Apply",
                body:
                  "Fill the form below — we review and call you back within 2 business days with your partner code.",
              },
              {
                n: "2",
                title: "Refer",
                body:
                  "Hand a client our card or have them mention your code. They call, walk in, or book online.",
              },
              {
                n: "3",
                title: "We close it",
                body:
                  "We do the LLC, brand, site, mail, or delivery. Your client gets a real handoff, not a website hand-off.",
              },
              {
                n: "4",
                title: "You get paid",
                body:
                  "Within 14 days of cleared funds. Square transfer or check. Receipt attached so trust compounds.",
              },
            ].map((s, i) => (
              <li
                key={s.n}
                className={`relative rounded-2xl p-6 animate-fade-up`}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 100}ms`,
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

      {/* Why partner */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Why pros work with us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {why.map((w, i) => (
              <div
                key={w.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 120}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2">
                  {w.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: w.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Common questions
          </h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="rounded-2xl p-6 group animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <summary className="cursor-pointer font-bold text-text-light text-sm flex items-center justify-between gap-4 list-none">
                  <span>{f.q}</span>
                  <span
                    className="text-accent transition-transform group-open:rotate-45 inline-block text-xl font-light"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p
                  className="mt-3 text-sm text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: f.a }}
                />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Apply form */}
      <section
        id="apply"
        className="py-20 px-4"
        style={{ background: "#110E0B" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 animate-fade-up" style={{ color: "#F8F2EA" }}>
              Apply now
            </h2>
            <p className="animate-fade-up delay-200" style={{ color: "rgba(248,242,234,0.65)" }}>
              We&apos;ll reach out within 2 business days with your code and a quick onboarding call.
            </p>
          </div>
          <PartnerForm />
        </div>
      </section>

      {/* Bottom CTA / fallback contact */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <p className="text-text-light-muted text-sm mb-4">
            Prefer a phone call?
          </p>
          <a
            href="tel:+18185067744"
            className="inline-block text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
            style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
          >
            (818) 506-7744
          </a>
          <p className="text-xs text-text-light-muted mt-4">
            Or walk in: 5062 Lankershim Blvd, North Hollywood, CA 91601 · Mon–Sat
          </p>
        </div>
      </section>
    </div>
  );
}
