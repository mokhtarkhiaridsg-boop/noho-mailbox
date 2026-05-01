import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Migrate to NOHO Mailbox Platform — From iPostal1, Anytime Mailbox, Spreadsheets",
  description:
    "Step-by-step migration guides for moving your CMRA from iPostal1, Anytime Mailbox, MyMailManager, UPS Store software, or spreadsheets to the NOHO Mailbox Platform. Free migration on the first 10 customers.",
  openGraph: {
    title: "Migrate to NOHO Mailbox Platform",
    description:
      "From iPostal1, Anytime Mailbox, MyMailManager, or spreadsheets — we handle the migration.",
    url: "https://nohomailbox.org/for-cmra-operators/migrate",
  },
  alternates: {
    canonical: "https://nohomailbox.org/for-cmra-operators/migrate",
  },
};

const sources = [
  {
    from: "iPostal1",
    pain: "Per-piece scan + forwarding fees ($2/scan, postage + 25–50%) eat into your margins. No same-day delivery. Limited customization on member dashboard.",
    steps: [
      "Export your customer list as CSV from iPostal1 admin",
      "We map their fields to ours (suite #, plan tier, KYC status, ID images)",
      "We import customers in bulk + send each a welcome email with their NOHO Mailbox login",
      "Run side-by-side for 30 days while old subscriptions run out",
      "Cut over fully when last iPostal1 cycle expires",
    ],
    timeline: "2–4 weeks total",
  },
  {
    from: "Anytime Mailbox",
    pain: "Network operator share + limited admin customization + no same-day delivery.",
    steps: [
      "Export your location's customer roster",
      "We adapt their per-customer plan tiers to ours",
      "Provision their custom subdomain (e.g. yourshop.nohomailbox.org)",
      "Migrate ID images and KYC records via secure transfer",
      "Send branded onboarding email to each customer",
    ],
    timeline: "2–3 weeks total",
  },
  {
    from: "MyMailManager",
    pain: "Older platform, no mobile member dashboard, manual quarterly reporting.",
    steps: [
      "Export customer list (MMM admin → Reports → Export)",
      "Mass-import to our admin via CSV upload",
      "We auto-generate Form 1583 records from your existing IDs on file",
      "First quarterly report runs through our auto-generator",
    ],
    timeline: "3–5 weeks total (longer due to data quality)",
  },
  {
    from: "UPS Store / corporate software",
    pain: "Corporate tax on every line item. Limited CMRA features. Member dashboard not customizable.",
    steps: [
      "Run NOHO Mailbox platform side-by-side as your independent operation",
      "Open new mailbox customers on our platform; let UPS Store side run down",
      "Use our admin for CMRA-specific features (recurring delivery, brand-management retainer, etc.)",
      "Most franchisees stay UPS Store for shipping + run NOHO Mailbox for everything else",
    ],
    timeline: "Indefinite — sandbox-and-grow strategy",
  },
  {
    from: "Spreadsheets / paper",
    pain: "Manual everything. Quarterly compliance is a nightmare. No customer self-service.",
    steps: [
      "We send you a CSV template (name, email, suite #, plan, ID type, ID expiration)",
      "You fill in your existing customers (4–8 hours for ~200 customers)",
      "We import and provision",
      "You scan IDs and Form 1583s during the next visit (or batch over a week)",
      "We migrate quarterly statements going forward",
    ],
    timeline: "4–6 weeks (depends on data backlog)",
  },
  {
    from: "Custom-built software",
    pain: "Maintenance burden, no integrations updates, your developer left.",
    steps: [
      "API export of your customer table to CSV/JSON",
      "We map their schema to ours (custom mapping per customer)",
      "Re-host email/SMS notifications via our Resend + Twilio infrastructure",
      "Full feature parity within 2 weeks; advanced features migrated thereafter",
    ],
    timeline: "4–8 weeks (depends on custom complexity)",
  },
];

const offer = [
  "Free migration assistance on the first 10 design-partner customers",
  "30-day trial — no commit until day 31",
  "Side-by-side run period at no additional cost (your old platform finishes its cycle)",
  "Customer-facing rebrand (welcome emails go out under your name, not ours)",
  "$99/mo first-90-days promo if you migrate from iPostal1 or Anytime Mailbox",
];

export default function MigratePage() {
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
            MIGRATION · FREE FOR FIRST 10 CUSTOMERS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Migrate from{" "}
            <span style={{ color: "#F5A623" }}>iPostal1, Anytime Mailbox,</span>{" "}
            or spreadsheets
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            We handle the migration. Your customers get a branded welcome
            email. Your old platform runs out its cycle. You don&apos;t lose
            mail, customers, or sleep.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Start migration
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
        Free migration · 30-day trial · No data loss · Side-by-side period
      </div>

      {/* Free migration offer */}
      <section className="py-16 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-8 md:p-10"
          style={{
            background: "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
            color: "#fff",
            boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
          }}
        >
          <h2
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#FFE4A0" }}
          >
            What we offer
          </h2>
          <ul className="space-y-2.5">
            {offer.map((o) => (
              <li
                key={o}
                className="text-sm flex items-start gap-2"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                <span style={{ color: "#FFE4A0" }} className="mt-0.5 font-bold">✓</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Per-source migration */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            Migration paths by source
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            We&apos;ve done all of these before. Pick your starting point.
          </p>
          <div className="space-y-6">
            {sources.map((s, i) => (
              <div
                key={s.from}
                className="rounded-2xl p-7 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                  <h3 className="text-xl font-extrabold tracking-tight text-text-light">
                    From <span style={{ color: "#337485" }}>{s.from}</span>
                  </h3>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#7A6050" }}
                  >
                    {s.timeline}
                  </span>
                </div>
                <p
                  className="text-sm rounded-xl p-3 mb-4"
                  style={{
                    background: "rgba(220,38,38,0.04)",
                    border: "1px solid rgba(220,38,38,0.15)",
                    color: "#7f1d1d",
                  }}
                >
                  <strong>Why people switch: </strong>
                  {s.pain}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#15803d" }}>
                  Migration steps
                </p>
                <ol className="space-y-1.5">
                  {s.steps.map((step, j) => (
                    <li
                      key={j}
                      className="text-sm flex items-start gap-2 text-text-light-muted"
                    >
                      <span
                        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold"
                        style={{
                          background: "rgba(51,116,133,0.12)",
                          color: "#337485",
                        }}
                      >
                        {j + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Tell us where you are now, we&apos;ll handle the rest.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Free migration on the first 10 design-partner customers. 30-day trial. We don&apos;t make money until you do.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Start migration
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
