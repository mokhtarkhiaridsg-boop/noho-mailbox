import type { Metadata } from "next";
import Link from "next/link";
import AffiliateForm from "./AffiliateForm";

export const metadata: Metadata = {
  title: "Affiliate Program — Earn 25–30% Per Sale | NOHO Mailbox",
  description:
    "Earn 25–30% commission on every NOHO Mailbox customer you refer. Mailbox plans, Same-Day Delivery, $2,000 Business Launch Bundle, and CMRA SaaS — high AOV, 60-day cookie window, monthly payouts.",
  openGraph: {
    title: "NOHO Mailbox Affiliate Program",
    description: "25–30% commission · 60-day cookie · Monthly payouts.",
    url: "https://nohomailbox.org/affiliates",
  },
  alternates: { canonical: "https://nohomailbox.org/affiliates" },
};

const products = [
  {
    name: "Mailbox plans",
    avgPrice: "$50–$295 / 3-month term",
    commission: "25%",
    body:
      "Earn $12.50–$73.75 per signup. High repeat — most customers renew.",
  },
  {
    name: "Same-day delivery",
    avgPrice: "$5–$24 / run",
    commission: "$1 per first run, capped",
    body:
      "Best when you have a local LA audience that runs many small deliveries.",
  },
  {
    name: "Business Launch Bundle",
    avgPrice: "$2,000 one-time",
    commission: "25% = $500",
    body:
      "Highest-AOV product. Best for side-hustle / Etsy / freelance / realtor audiences.",
  },
  {
    name: "Brand Retainer",
    avgPrice: "$1,200 / mo",
    commission: "25% × 12 mo = $3,600 LTV",
    body:
      "Recurring revenue. Best for content creators with established small-business audiences.",
  },
  {
    name: "CMRA Platform SaaS",
    avgPrice: "$299–$1,499 / mo",
    commission: "30% × 12 mo",
    body:
      "$1,076–$5,400 LTV per close. Best for B2B podcast / newsletter audiences in CMRA / virtual mailbox space.",
  },
];

const ideal = [
  {
    title: "Side-hustle / freelance content creators",
    body:
      "Audience asks &quot;how do I form an LLC?&quot; — answer is our Business Launch Bundle.",
  },
  {
    title: "Etsy / Amazon seller YouTubers",
    body:
      "Audience needs a real address that works on Etsy + Amazon Seller Central — our mailbox plan solves it.",
  },
  {
    title: "Real estate independence content",
    body:
      "Realtors going solo need LLC + brand + DRE-acceptable address. Our $2k bundle is designed for them.",
  },
  {
    title: "LA / California local newsletters",
    body:
      "Local newsletters serve our exact geography. Same-day delivery + walk-in mailbox.",
  },
  {
    title: "Indie B2B SaaS / CMRA / virtual mailbox podcasts",
    body:
      "B2B audience with CMRA operators is a perfect fit for our Platform SaaS — highest commission tier.",
  },
];

const how = [
  {
    n: "1",
    title: "Apply",
    body: "Fill the form. We review your channel, audience, and fit.",
  },
  {
    n: "2",
    title: "Get your tracking link",
    body:
      "Within 2 business days, we email back with a unique tracking URL like nohomailbox.org/?aff=YOURCODE.",
  },
  {
    n: "3",
    title: "Promote",
    body:
      "Share your link in YouTube descriptions, blog posts, podcast notes, social. We provide screenshot assets and copy templates.",
  },
  {
    n: "4",
    title: "Get paid",
    body:
      "Monthly payouts via PayPal or Stripe Express. Net-30 after the customer&apos;s refund window closes (15 days).",
  },
];

export default function AffiliatesPage() {
  return (
    <div className="perspective-container">
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
            AFFILIATE PROGRAM · 25–30% COMMISSION
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Earn{" "}
            <span style={{ color: "#F5A623" }}>$500 per Bundle</span>{" "}
            you refer.
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Content creators, niche site operators, podcasters — promote NOHO
            Mailbox to your audience and earn 25–30% commission on every close.
            Highest-AOV product is our $2,000 Business Launch Bundle ($500/close)
            and our CMRA SaaS ($1,076–$5,400 LTV/close).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="#apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Apply now
            </Link>
            <Link
              href="#products"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Commission rates
            </Link>
          </div>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Free to join · 60-day cookie window · Monthly payouts via PayPal or Stripe Express
      </div>

      {/* Products */}
      <section id="products" className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What you can promote
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            5 revenue streams. Pick the one that fits your audience.
          </p>
          <div className="space-y-3">
            {products.map((p, i) => (
              <div
                key={p.name}
                className="rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light text-base">
                  {p.name}
                </h3>
                <p className="text-sm text-text-light-muted">{p.avgPrice}</p>
                <p
                  className="text-base font-extrabold"
                  style={{ color: "#15803d" }}
                >
                  {p.commission}
                </p>
                <p className="text-xs text-text-light-muted leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal partners */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Ideal affiliate audiences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideal.map((p, i) => (
              <div
                key={p.title}
                className="rounded-xl p-5 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-bold text-text-light mb-1">{p.title}</h3>
                <p
                  className="text-sm text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: p.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            How it works
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {how.map((s, i) => (
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

      {/* Apply */}
      <section id="apply" className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 animate-fade-up"
              style={{ color: "#F8F2EA" }}
            >
              Apply now
            </h2>
            <p
              className="animate-fade-up delay-200"
              style={{ color: "rgba(248,242,234,0.65)" }}
            >
              We review every application personally — we want partners we can
              actually grow with, not link farms.
            </p>
          </div>
          <AffiliateForm />
        </div>
      </section>
    </div>
  );
}
