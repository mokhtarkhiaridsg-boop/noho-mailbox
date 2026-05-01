import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About NOHO Mailbox — A Real LA CMRA, Built by Operators",
  description:
    "We&apos;re an operating CMRA at 5062 Lankershim Blvd in North Hollywood. We process ~500 active mailboxes + run same-day delivery + license our software stack to other operators.",
  openGraph: {
    title: "About NOHO Mailbox",
    description:
      "Real LA CMRA operating ~500 active mailboxes + same-day courier service + B2B SaaS for operators.",
    url: "https://nohomailbox.org/about",
  },
  alternates: { canonical: "https://nohomailbox.org/about" },
};

const milestones = [
  {
    year: "2022",
    title: "Storefront opens at 5062 Lankershim",
    body:
      "Started as a small CMRA in North Hollywood — a few dozen mailboxes, a single counter staff person, no software beyond what came out of the box from iPostal1.",
  },
  {
    year: "2023",
    title: "Same-day delivery launches",
    body:
      "Added local courier service after customers kept asking. Started at $5 flat in NoHo. Grew into a 5-zone delivery operation covering most of LA County.",
  },
  {
    year: "2024",
    title: "Built our own software stack",
    body:
      "Replaced iPostal1 with custom software built specifically for operating CMRA + same-day delivery from one storefront. Took 6 months. Cut platform fees by ~30% of gross revenue.",
  },
  {
    year: "2025",
    title: "Started licensing software to other operators",
    body:
      "Operators we knew started asking if they could use our stack. We licensed the platform to the first operator in Q1 2025. Now serving operators in 4 states.",
  },
  {
    year: "2026",
    title: "Today",
    body:
      "~500 active mailboxes. 50+ B2B same-day delivery accounts. 6+ CMRA operators on our SaaS license. $2,000 Business Launch Bundle for solo founders. Affiliate + partner programs running.",
  },
];

const numbers = [
  { v: "500+", l: "Active mailboxes" },
  { v: "$28k", l: "Monthly recurring revenue (storefront)" },
  { v: "50+", l: "B2B same-day delivery accounts" },
  { v: "6+", l: "Licensed CMRA operators" },
  { v: "0", l: "USPS audit findings (across 3 audits)" },
  { v: "Mon-Sat", l: "Walk-in counter open" },
];

export default function AboutPage() {
  return (
    <div className="perspective-container">
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            ABOUT US
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            We&apos;re an operating CMRA. Not a platform. Not a network.
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg">
            5062 Lankershim Blvd, North Hollywood. ~500 active mailboxes. A
            walk-in counter. Same-day delivery drivers. A software stack we
            built to run our own business — and now license to other CMRA
            operators.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Real building · Real staff · Real customers · Real walk-in counter
      </div>

      {/* Numbers */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10">
            What we run today
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {numbers.map((n) => (
              <div
                key={n.l}
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <p
                  className="text-3xl md:text-4xl font-extrabold tracking-tight"
                  style={{ color: "#337485" }}
                >
                  {n.v}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-light-muted mt-2">
                  {n.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            Why we exist
          </h2>
          <p className="text-text-light text-base leading-relaxed mb-4">
            We started as a small CMRA in North Hollywood because nobody else
            was running one well in our part of LA. The big national networks
            (iPostal1, Anytime Mailbox, Earth Class Mail) work fine if
            you&apos;re anywhere in the US — but they take 20-40% of every
            transaction, and the local operator quality varies wildly.
          </p>
          <p className="text-text-light text-base leading-relaxed mb-4">
            We wanted something different: a single, real, walk-in storefront
            with one operator who owns the customer experience start to
            finish. Real address. Real receipts. Real human at the counter.
            Real software underneath.
          </p>
          <p className="text-text-light text-base leading-relaxed mb-4">
            Two years in, we&apos;d outgrown the off-the-shelf platforms and
            built our own. Six months of engineering later, we had something
            that ran our business better and cost less. Other operators started
            asking if they could use it. So now we license it.
          </p>
          <p className="text-text-light text-base leading-relaxed">
            That&apos;s the company in 4 paragraphs. We&apos;re a real CMRA
            first. The B2B SaaS, the $2k Business Launch Bundle, the affiliate
            program, the partner program — all of those are extensions of the
            same operation. Battle-tested in our own production before we sell
            it.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-10">
            How we got here
          </h2>
          <ol className="space-y-5">
            {milestones.map((m) => (
              <li key={m.year} className="flex gap-5">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-white text-sm"
                  style={{ background: "#337485" }}
                >
                  {m.year}
                </div>
                <div>
                  <h3 className="font-extrabold tracking-tight text-text-light text-base mb-1">
                    {m.title}
                  </h3>
                  <p className="text-sm text-text-light-muted leading-relaxed">
                    {m.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What we sell */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            Five things we sell
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                t: "Mailbox plans",
                b: "Real LA address from $50/3 months. USPS-CMRA. Walk-in counter. For solopreneurs, freelancers, e-commerce sellers, digital nomads.",
                href: "/pricing",
              },
              {
                t: "$2k Business Launch Bundle",
                b: "California LLC + EIN + brand + 5-page website + 12 months mail. 14-day timeline. For founders launching a business.",
                href: "/business-solutions",
              },
              {
                t: "Same-day delivery",
                b: "$5 flat in NoHo, $9.75-$24 across LA. For solo attorneys, florists, real estate, medical practices, print shops.",
                href: "/delivery",
              },
              {
                t: "CMRA SaaS",
                b: "License our software stack. $299-$1,499/mo flat. For CMRA operators tired of giving up margin to networks.",
                href: "/for-cmra-operators",
              },
              {
                t: "Affiliate + Partner programs",
                b: "25-30% commission for content creators. $300/close for CPAs / attorneys / web designers.",
                href: "/affiliates",
              },
              {
                t: "Franchise + Enterprise",
                b: "Open a NOHO Mailbox in your city ($75k initial fee). Or license our platform at enterprise scale (custom quote).",
                href: "/franchise",
              },
            ].map((c) => (
              <Link
                key={c.t}
                href={c.href}
                className="rounded-xl p-5 hover-lift transition-all"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-1">
                  {c.t}
                </h3>
                <p className="text-sm text-text-light-muted leading-relaxed">
                  {c.b}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Visit / contact */}
      <section className="py-16 px-4 bg-bg-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-dark mb-4">
            Come by.
          </h2>
          <p className="text-text-dark-muted mb-6 leading-relaxed">
            5062 Lankershim Blvd, North Hollywood CA 91601. Mon-Sat. We&apos;re
            on the west side of Lankershim, between Magnolia and Otsego. 4
            parking spots in front, free street parking after 6pm.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:8185067744"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Call (818) 506-7744
            </a>
            <Link
              href="/contact"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Send a message
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
