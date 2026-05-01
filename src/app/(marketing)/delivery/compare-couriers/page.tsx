import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NOHO Mailbox vs ClockWork, California Courier, Jet, Ways Messenger",
  description:
    "Honest side-by-side comparison of LA same-day courier services for small businesses. Pricing, ETA, walk-in vs dispatch, minimums, and what each one is actually best for.",
  openGraph: {
    title: "Best Same-Day Courier in LA — Honest Comparison",
    description:
      "NOHO Mailbox vs ClockWork, California Courier, Jet Delivery, Ways Messenger — pricing, service area, walk-in, minimums.",
    url: "https://nohomailbox.org/delivery/compare-couriers",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/compare-couriers",
  },
  keywords:
    "best same day courier los angeles, ClockWork Express vs, California Courier Services review, courier comparison LA, courier san fernando valley, NoHo same day delivery comparison",
};

type CompetitorRow = {
  name: string;
  url?: string;
  pricing: string;
  eta: string;
  area: string;
  minimum: string;
  walkIn: string;
  member: string;
  bestFor: string;
};

const competitors: CompetitorRow[] = [
  {
    name: "NOHO Mailbox",
    url: "https://nohomailbox.org",
    pricing: "$5 flat NoHo · $9.75–$24 across LA",
    eta: "30–150 min by zone",
    area: "NoHo · Studio City · Burbank · Sherman Oaks · Toluca Lake · Valley Village · Mid LA",
    minimum: "None · No membership",
    walkIn: "Yes — 5062 Lankershim Blvd, Mon–Sat",
    member: "No",
    bestFor:
      "Small businesses inside NoHo + adjacent zips. 1–10 runs/week. Fixed pricing, real human, walk-in drop-off.",
  },
  {
    name: "ClockWork Express",
    url: "https://www.clockworkexpress.com/",
    pricing: "Quote-based, minimums apply",
    eta: "1–4 hours typical",
    area: "All of Southern California, 24/7",
    minimum: "Yes — typically $25–$40",
    walkIn: "No — dispatch only",
    member: "Optional account",
    bestFor:
      "Enterprise medical (HIPAA, OSHA), 24/7 hospital labs, large corporate accounts running 50+ deliveries/week.",
  },
  {
    name: "California Courier Services",
    url: "https://www.californiacourierservices.com/",
    pricing: "Quote-based, zone minimums",
    eta: "Same-day, no specific window",
    area: "All of California, 24/7",
    minimum: "Yes — typically $30+",
    walkIn: "No — dispatch only",
    member: "Optional account",
    bestFor:
      "Enterprise B2B, statewide. Heavy on medical, legal, and corporate volume.",
  },
  {
    name: "Jet Delivery",
    url: "https://www.jetdelivery.com/locations/ca/hollywood/",
    pricing: "Quote-based, freight + parcel",
    eta: "Same-day typical",
    area: "Hollywood, NoHo, Burbank, Sherman Oaks",
    minimum: "Yes",
    walkIn: "No — dispatch only",
    member: "Account-based",
    bestFor:
      "Freight and large-package same-day. Better for pallet/oversize than letter/document runs.",
  },
  {
    name: "Ways Messenger",
    url: "https://waysmessenger.com/",
    pricing: "Per-mile + zone, $20+ typical",
    eta: "Same-day, on-demand 24/7",
    area: "All of LA County",
    minimum: "Yes — $20+",
    walkIn: "No — dispatch only",
    member: "Account-based",
    bestFor:
      "On-demand 24/7 LA-wide. Good if you need late-night or Sunday courier.",
  },
];

const decisionMatrix = [
  {
    if: "You run 1–10 deliveries/week inside NoHo, Studio City, Burbank",
    pick: "NOHO Mailbox",
    why: "$5 flat in NoHo beats every minimum-based courier by 60–80%",
  },
  {
    if: "You need 24/7 medical specimen courier with HIPAA + OSHA",
    pick: "ClockWork Express",
    why: "25-year medical specialty, certified drivers, refrigerated transport",
  },
  {
    if: "You need to move pallets or oversize freight same-day",
    pick: "Jet Delivery",
    why: "Equipped for freight, not just parcel/document",
  },
  {
    if: "You need 11pm or Sunday courier inside LA County",
    pick: "Ways Messenger",
    why: "True 24/7 on-demand. We close Sat 1:30pm.",
  },
  {
    if: "You're a small attorney, florist, real estate agent, or print shop in NoHo",
    pick: "NOHO Mailbox",
    why: "Walk-in counter, real human, flat $5 in NoHo, first run free, no membership.",
  },
  {
    if: "You ship enterprise volume statewide with corporate billing",
    pick: "ClockWork Express or California Courier",
    why: "Built for enterprise account management, contracts, NET-30 billing.",
  },
];

export default function CompareCouriersPage() {
  // Comparison + LocalBusiness JSON-LD for richer Google results.
  const compareJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Same-Day Courier in LA — Comparison",
    description:
      "Side-by-side comparison of NOHO Mailbox, ClockWork Express, California Courier Services, Jet Delivery, and Ways Messenger.",
    author: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
    datePublished: "2026-04-29",
    publisher: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            COMPARISON · UPDATED 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-5">
            Best same-day courier in LA — honest comparison
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg">
            We&apos;re one of the options. We won&apos;t pretend we&apos;re the
            best for every use case. Here&apos;s where each LA courier
            actually wins.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Last updated April 2026 · Phone numbers and prices verified directly
      </div>

      {/* Quick decision matrix */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-3">
            Quick decision: which one for you?
          </h2>
          <p className="text-text-light-muted mb-8">
            Skip the matrix below if you just want a recommendation.
          </p>
          <div className="space-y-3">
            {decisionMatrix.map((d, i) => (
              <div
                key={i}
                className="rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-start animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <p className="text-sm md:col-span-1 text-text-light-muted">
                  <strong className="text-text-light">If</strong> {d.if}
                </p>
                <p className="text-sm md:col-span-1 font-extrabold" style={{ color: "#337485" }}>
                  Pick {d.pick}
                </p>
                <p className="text-xs text-text-light-muted md:col-span-1 leading-relaxed">
                  {d.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed matrix */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-8">
            Side-by-side comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl" style={{ boxShadow: "var(--shadow-md)" }}>
            <table className="w-full text-sm" style={{ background: "#FFFFFF" }}>
              <thead>
                <tr style={{ background: "#F8F2EA" }}>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Courier
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Pricing
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    ETA
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Service area
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Walk-in?
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Best for
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr
                    key={c.name}
                    style={{
                      borderTop: "1px solid #E8D8C4",
                      background:
                        c.name === "NOHO Mailbox"
                          ? "rgba(51,116,133,0.04)"
                          : "transparent",
                    }}
                  >
                    <td className="p-4 align-top">
                      <p
                        className="font-extrabold"
                        style={{
                          color: c.name === "NOHO Mailbox" ? "#337485" : "#2D100F",
                        }}
                      >
                        {c.name}
                        {c.name === "NOHO Mailbox" && (
                          <span
                            className="ml-2 inline-block px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-full font-bold"
                            style={{
                              background: "rgba(245,166,35,0.2)",
                              color: "#F5A623",
                            }}
                          >
                            That&apos;s us
                          </span>
                        )}
                      </p>
                      {c.url && (
                        <a
                          href={c.url}
                          target={c.name === "NOHO Mailbox" ? "_self" : "_blank"}
                          rel={c.name === "NOHO Mailbox" ? undefined : "noopener noreferrer"}
                          className="text-[11px] hover:underline"
                          style={{ color: "#7A6050" }}
                        >
                          {c.url.replace(/https?:\/\//, "").replace(/\/$/, "")}{" "}
                          {c.name !== "NOHO Mailbox" && "↗"}
                        </a>
                      )}
                    </td>
                    <td className="p-4 align-top text-text-light-muted">{c.pricing}</td>
                    <td className="p-4 align-top text-text-light-muted">{c.eta}</td>
                    <td className="p-4 align-top text-text-light-muted">{c.area}</td>
                    <td className="p-4 align-top text-text-light-muted">{c.walkIn}</td>
                    <td className="p-4 align-top text-text-light-muted">{c.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-light-muted mt-4">
            Pricing verified by phone in April 2026. Quote-based couriers may
            negotiate down for high-volume accounts. Always confirm with the
            specific courier before booking.
          </p>
        </div>
      </section>

      {/* Where we lose */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-3">
            Where we&apos;re honestly not the right fit
          </h2>
          <p className="text-text-light-muted mb-6">
            We&apos;re a hyperlocal storefront. There are categories where the
            big regional couriers genuinely beat us:
          </p>
          <ul className="space-y-3 mb-8">
            {[
              {
                t: "Enterprise medical (HIPAA + OSHA)",
                b: "ClockWork Express owns this. They have BAA agreements, refrigerated vehicles, and 24/7 dispatch trained on specimen handling. We do not handle PHI.",
              },
              {
                t: "Statewide same-day to multiple cities",
                b: "California Courier Services covers all of California, with operations in San Diego, San Francisco, and Sacramento. We&apos;re LA County only.",
              },
              {
                t: "Sunday or after-1:30pm Saturday",
                b: "We&apos;re closed Sundays and after 1:30pm Saturdays. Ways Messenger and ClockWork run 24/7.",
              },
              {
                t: "Pallet / oversize freight",
                b: "Jet Delivery and similar freight-rated couriers have the trucks and dock equipment. Our delivery vehicles are sized for parcels, documents, and small packages.",
              },
            ].map((r) => (
              <li
                key={r.t}
                className="rounded-xl p-4"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-bold text-text-light text-sm mb-1">{r.t}</h3>
                <p
                  className="text-xs text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.b }}
                />
              </li>
            ))}
          </ul>
          <p
            className="text-sm rounded-xl p-4"
            style={{
              background: "rgba(51,116,133,0.06)",
              border: "1px solid rgba(51,116,133,0.18)",
              color: "#23596A",
            }}
          >
            <strong>Translation:</strong> if you&apos;re an enterprise account,
            statewide operator, 24/7 medical, or freight customer — go with one
            of the others. If you&apos;re a small business in NoHo / Studio City
            / Burbank running 1–10 small deliveries a week, we&apos;ll save you
            real money.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            If we&apos;re the right fit, first run is on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            $5 flat in NoHo, $9.75–$24 across the Valley, no membership.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a delivery
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
