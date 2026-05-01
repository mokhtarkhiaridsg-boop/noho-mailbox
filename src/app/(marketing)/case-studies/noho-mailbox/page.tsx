import type { Metadata } from "next";
import Link from "next/link";

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Case Study: NOHO Mailbox runs its own storefront on the platform",
  description:
    "How a North Hollywood CMRA built and runs the entire stack — admin, member, compliance, dispatch, billing — on the same software now licensed to other operators.",
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

export const metadata: Metadata = {
  title:
    "Case Study: How NOHO Mailbox Runs Its Storefront on Our Own Platform",
  description:
    "An operating CMRA in North Hollywood runs its admin, member dashboard, compliance, dispatch, and billing on the platform we license to other operators. Honest numbers + lessons.",
  openGraph: {
    title: "Case Study — NOHO Mailbox on Its Own Platform",
    description:
      "An operating CMRA runs the same software now licensed to other operators. Real numbers + workflows.",
    url: "https://nohomailbox.org/case-studies/noho-mailbox",
  },
  alternates: {
    canonical: "https://nohomailbox.org/case-studies/noho-mailbox",
  },
};

const beforeAfter = [
  {
    label: "Customer list",
    before: "Spreadsheet, manual updates",
    after: "Searchable Customers panel · auto-tagging on signup · KYC workflow built-in",
  },
  {
    label: "Mail intake",
    before: "Hand-written log book + emailed alerts",
    after: "Barcode scan via BarcodeDetector · SMS+email package alerts · auto-routed to Mail panel",
  },
  {
    label: "Form 1583 + CMRA quarterly",
    before: "Re-typed each quarter, 4hr/quarter",
    after: "Auto-generated in USPS format · in-house notary · printable receipts",
  },
  {
    label: "Same-day delivery",
    before: "Phone-ordered, paper-routed",
    after: "7-zone instant quote · photo proof of delivery · recurring routes",
  },
  {
    label: "Billing",
    before: "Manual Square invoices",
    after: "Square checkout link from admin · auto-credit wallet on paid · billing audit log",
  },
  {
    label: "Member experience",
    before: "&quot;Call us, we&apos;ll check.&quot;",
    after: "Self-serve dashboard · mail viewer · request forwarding/discard/scan in 3 taps",
  },
];

const numbers = [
  { label: "Admin time saved/week", v: "~12 hours" },
  { label: "Same-day deliveries (avg/wk)", v: "30+" },
  { label: "Plans (Basic / Business / Premium)", v: "3 tiers" },
  { label: "Active customers", v: "growing" },
  { label: "Quarterly compliance audits", v: "Auto-generated" },
];

const lessons = [
  {
    title: "Build operator-first, then sell",
    body:
      "Every feature was needed Wednesday morning before it shipped Friday. No theoretical product manager. The platform exists because we needed it.",
  },
  {
    title: "Mobile-first member dashboard is the moat",
    body:
      "Every other CMRA platform looks like 2014 desktop software. Ours feels like a modern app — and members notice immediately.",
  },
  {
    title: "Square + Shippo + Resend > custom payments",
    body:
      "We don&apos;t reinvent payment processing or shipping labels. We integrate the best vendors and add markup transparency.",
  },
  {
    title: "Compliance is a feature, not a chore",
    body:
      "Auto-generating CMRA quarterly statements in USPS format means we pass postmaster reviews without scrambling. Most operators wing this.",
  },
];

export default function CaseStudyPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
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
            CASE STUDY · OPERATOR-BUILT
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            How NOHO Mailbox runs its{" "}
            <span style={{ color: "#F5A623" }}>own storefront</span> on the platform
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Every CMRA SaaS markets like an experienced platform. We&apos;re a
            real, operating CMRA at 5062 Lankershim Blvd in North Hollywood —
            and we eat our own dog food. Same admin, same member dashboard,
            same compliance, same dispatch.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        5062 Lankershim Blvd, North Hollywood · Mon–Sat · USPS-certified CMRA
      </div>

      {/* Before / After */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            Before vs after
          </h2>
          <p className="text-text-light-muted text-center mb-12 animate-fade-up delay-200">
            What changed in our operations after we replaced spreadsheets with our own platform.
          </p>
          <div className="space-y-3">
            {beforeAfter.map((row, i) => (
              <div
                key={row.label}
                className="rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-start animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <p className="text-sm font-extrabold text-text-light">{row.label}</p>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-widest font-bold mb-1"
                    style={{ color: "#dc2626" }}
                  >
                    Before
                  </p>
                  <p
                    className="text-sm leading-relaxed text-text-light-muted"
                    dangerouslySetInnerHTML={{ __html: row.before }}
                  />
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-widest font-bold mb-1"
                    style={{ color: "#15803d" }}
                  >
                    After
                  </p>
                  <p
                    className="text-sm leading-relaxed text-text-light-muted"
                    dangerouslySetInnerHTML={{ __html: row.after }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            By the numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {numbers.map((n, i) => (
              <div
                key={n.label}
                className="rounded-xl p-5 text-center animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <p
                  className="text-2xl font-extrabold tracking-tight mb-1"
                  style={{ color: "#337485" }}
                >
                  {n.v}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-light-muted">
                  {n.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lessons */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            What we learned building it
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessons.map((l, i) => (
              <div
                key={l.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
                  {l.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: l.body }}
                />
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
            Run your CMRA on the same platform
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            From $299/mo. 30-day trial. We&apos;ll provision your sandbox tenant within 48 hours of demo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/for-cmra-operators/apply"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Apply for the platform
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
              Platform features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
