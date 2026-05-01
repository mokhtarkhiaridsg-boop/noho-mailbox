import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Recurring Delivery Routes",
  description:
    "Daily, weekly, or biweekly recurring courier routes for LA businesses — set it once, we run it. Best for law firms with daily court runs, escrow with daily check drops, and dental offices with lab-work schedules.",
  serviceType: "Scheduled Recurring Courier",
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
  areaServed: [
    { "@type": "City", name: "North Hollywood" },
    { "@type": "City", name: "Studio City" },
    { "@type": "City", name: "Burbank" },
    { "@type": "City", name: "Sherman Oaks" },
    { "@type": "City", name: "Toluca Lake" },
  ],
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "20.00",
    highPrice: "120.00",
    offerCount: 3,
  },
};

export const metadata: Metadata = {
  title: "Recurring Delivery Routes — Daily, Weekly, Biweekly · NOHO Mailbox",
  description:
    "Set a recurring courier route once and we run it on schedule. Daily court runs for law firms, weekly lab pickups for dental offices, biweekly escrow drops. From $20/run · prepaid blocks save up to 25%.",
  openGraph: {
    title: "Recurring Delivery Routes — NOHO Mailbox",
    description:
      "Daily / weekly / biweekly courier routes on schedule. Set once, we run it. Discount blocks for prepaid volume.",
    url: "https://nohomailbox.org/delivery/recurring-routes",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/recurring-routes",
  },
};

const cadences = [
  {
    label: "Daily",
    sub: "Mon–Fri or 5×/week",
    pitch:
      "Best for law firms with daily court runs, escrow with daily check drops, hospital labs (non-PHI) with daily supply pickups.",
    examples: [
      "Stanley Mosk Court → your firm at 4:30pm",
      "Daily lab → dental office (non-PHI items only)",
      "Bank cashier&apos;s check → escrow each morning",
    ],
    pricing: "From $20/run · 5×/week = $100/wk · ~$400/mo",
  },
  {
    label: "Weekly",
    sub: "Same day every week",
    pitch:
      "Real-estate weekly lockbox swaps, weekly catalog or sample drops, weekly print shop client deliveries.",
    examples: [
      "Friday lockbox key cycle for property managers",
      "Tuesday wholesale flower drop at retail florists",
      "Thursday print-shop client batch",
    ],
    pricing: "From $20/run · 1×/week = $80/mo",
  },
  {
    label: "Biweekly",
    sub: "Every other week",
    pitch:
      "Lower-volume but predictable — paychecks to remote staff, biweekly inventory transfers, accounting document pickup.",
    examples: [
      "Biweekly accounting paperwork from CPA",
      "Biweekly inventory transfer between two stores",
      "Biweekly check pickup for remote contractors",
    ],
    pricing: "From $20/run · 2×/month = $40/mo",
  },
];

const why = [
  {
    title: "One conversation, no daily booking",
    body:
      "Set the route once. We auto-run it on the cadence you set. Pause anytime from the member dashboard, no penalty.",
  },
  {
    title: "Prepaid block discounts",
    body:
      "Prepay 20 runs and save 10%. Prepay 50 and save 20%. Prepay 100 and save 25%. Lock cost predictability for your books.",
  },
  {
    title: "First-priority dispatch",
    body:
      "Recurring routes are scheduled before walk-in jobs. Your driver shows up at the same time every cycle.",
  },
  {
    title: "Replaces a part-time driver",
    body:
      "Most clients hire a part-time errand person at $25/hr. A recurring route at $80/wk is ~25% the cost for the same regular tempo.",
  },
];

export default function RecurringRoutesPage() {
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
            RECURRING ROUTES · SET-AND-FORGET
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Set the route once.{" "}
            <span style={{ color: "#F5A623" }}>We run it.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Daily, weekly, biweekly delivery routes for businesses with
            predictable schedules. From $80/month. Cheaper than a part-time
            errand person, more reliable than a one-off courier each time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Set up a route
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
        Daily · Weekly · Biweekly · Pause from dashboard · Prepay 100 saves 25%
      </div>

      {/* Cadences */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Pick your cadence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cadences.map((c, i) => (
              <div
                key={c.label}
                className="rounded-2xl p-7 hover-lift animate-fade-up flex flex-col"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div>
                  <h3
                    className="font-extrabold tracking-tight text-2xl mb-1"
                    style={{ color: "#337485" }}
                  >
                    {c.label}
                  </h3>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ color: "#7A6050" }}
                  >
                    {c.sub}
                  </p>
                  <p className="text-sm text-text-light-muted leading-relaxed mb-4">
                    {c.pitch}
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {c.examples.map((ex) => (
                      <li
                        key={ex}
                        className="text-xs text-text-light-muted flex items-start gap-2"
                      >
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: "#337485" }}
                        />
                        <span dangerouslySetInnerHTML={{ __html: ex }} />
                      </li>
                    ))}
                  </ul>
                </div>
                <p
                  className="mt-auto pt-4 border-t text-xs font-bold"
                  style={{ borderColor: "#E8D8C4", color: "#7A6050" }}
                >
                  {c.pricing}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why recurring */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Why recurring beats per-run
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
                <h3 className="font-bold text-text-light text-base mb-1">{w.title}</h3>
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
            Talk to us about your route
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            10 minutes on the phone and we&apos;ll spec the schedule, quote the
            block, and ship the first run this week.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:+18185067744"
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
              Or send a message
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
