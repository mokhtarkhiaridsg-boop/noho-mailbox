import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Case Studies — NOHO Mailbox Customers + Operators",
  description:
    "Real outcomes from NOHO Mailbox customers, partners, and CMRA operators using our software. Revenue growth, cost savings, time saved.",
  openGraph: {
    title: "Case Studies — NOHO Mailbox",
    description:
      "Real outcomes from customers, partners, and CMRA operators using our platform.",
    url: "https://nohomailbox.org/case-studies",
  },
  alternates: { canonical: "https://nohomailbox.org/case-studies" },
};

const studies = [
  {
    slug: "noho-mailbox",
    badge: "CMRA SaaS — Self-operating proof",
    title: "How NOHO Mailbox Runs ~500 Boxes + Same-Day Courier on Our Own Software",
    sub: "Operating proof point: $43k MRR, 2-person ops team, 4 years live, 0 USPS audit findings.",
    metric: "$43k",
    metricLabel: "Combined MRR",
    body:
      "We built the CMRA platform we now license. Every feature is battle-tested in our own production CMRA before we offer it to operators. This case study walks through the full ops stack — how 2 people manage ~500 active boxes plus 50+ B2B same-day delivery accounts.",
    href: "/case-studies/noho-mailbox",
  },
];

export default function CaseStudiesIndexPage() {
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
            CASE STUDIES · REAL NUMBERS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            Real outcomes. Real numbers.
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            We don&apos;t do hypothetical case studies. Every story here has
            named customers, real revenue, and real operational data.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto space-y-4">
          {studies.map((s, i) => (
            <Link
              key={s.slug}
              href={s.href}
              className="block rounded-2xl p-7 hover-lift transition-all animate-fade-up"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-md)",
                animationDelay: `${i * 70}ms`,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#337485" }}
              >
                {s.badge}
              </p>
              <h3 className="font-extrabold tracking-tight text-text-light text-xl md:text-2xl mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-text-light-muted mb-4">{s.sub}</p>
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p
                    className="text-2xl font-extrabold tracking-tight tabular-nums"
                    style={{ color: "#15803d" }}
                  >
                    {s.metric}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-light-muted">
                    {s.metricLabel}
                  </p>
                </div>
                <p className="text-sm text-text-light-muted leading-relaxed flex-1 min-w-[200px]">
                  {s.body}
                </p>
              </div>
              <div
                className="mt-4 text-sm font-bold inline-flex items-center gap-2"
                style={{ color: "#337485" }}
              >
                Read case study →
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-4">
            More case studies in development
          </h2>
          <p className="text-text-light-muted mb-6 leading-relaxed">
            We publish case studies only when the customer signs off and the
            data is complete enough to be useful — not before. New stories
            we&apos;re currently writing:
          </p>
          <ul className="space-y-2 text-left max-w-xl mx-auto text-sm text-text-light-muted">
            <li>
              ✦ Solo attorney saving 6 hrs/week on court runs (in review)
            </li>
            <li>
              ✦ Etsy seller from $2k → $14k/mo with our $2k bundle (in review)
            </li>
            <li>
              ✦ CMRA operator switching from iPostal1 (data being collected
              over 90 days)
            </li>
            <li>
              ✦ Florist Mother&apos;s Day overflow runs (seasonal — publishing
              after May 2026)
            </li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-dark mb-3">
            Ready to be a case study?
          </h2>
          <p className="text-text-dark-muted mb-6 leading-relaxed">
            We compensate customers who do detailed case studies (1-2 hours
            of interview time). Reply to any email or call (818) 506-7744
            if you&apos;re open to it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/pricing"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              See plans
            </Link>
            <Link
              href="/business-solutions"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              $2k Launch Bundle
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
