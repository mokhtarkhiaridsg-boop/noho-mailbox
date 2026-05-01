import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Start with NOHO Mailbox — Pick Your Path",
  description:
    "Are you a customer, a business owner needing an LLC, a CMRA operator, an affiliate, or a franchise candidate? Pick your path and we&apos;ll get you to the right page.",
  openGraph: {
    title: "Start with NOHO Mailbox",
    description: "Pick your path: customer, business, operator, affiliate, franchise.",
    url: "https://nohomailbox.org/start",
  },
  alternates: { canonical: "https://nohomailbox.org/start" },
};

const lanes = [
  {
    title: "I want a mailbox or same-day delivery",
    sub: "Customer · LA-area",
    body:
      "Real LA street address from $50/3 months. $5 same-day delivery in NoHo. Walk-in storefront at 5062 Lankershim.",
    href: "/pricing",
    cta: "See plans",
    accent: "#337485",
  },
  {
    title: "I need to launch a business",
    sub: "Solopreneur · Realtor · Etsy seller",
    body:
      "$2,000 all-in: California LLC + EIN + brand kit + 5-page website + 12 months of mail at our LA address.",
    href: "/business-solutions",
    cta: "See the bundle",
    accent: "#B07030",
    primary: true,
  },
  {
    title: "I run a CMRA / mailbox business",
    sub: "Operator · Multi-location",
    body:
      "License the same software running NOHO Mailbox. Admin, member dashboard, CMRA compliance, dispatch, billing — from $299/mo.",
    href: "/for-cmra-operators",
    cta: "Platform details",
    accent: "#337485",
  },
  {
    title: "I&apos;m a content creator / niche site",
    sub: "Affiliate · 25–30% commission",
    body:
      "Promote our $2,000 bundle and earn $500/close. Mailbox plans 25%. SaaS 30% × 12mo LTV. 60-day cookie.",
    href: "/affiliates",
    cta: "Affiliate program",
    accent: "#15803d",
  },
  {
    title: "I want to open a franchise",
    sub: "Entrepreneur · $200k+ liquid",
    body:
      "Open a NOHO Mailbox in your city. $75k initial fee + 6% royalty + $500/mo platform. We bring the brand, ops manual, training.",
    href: "/franchise",
    cta: "Franchise info",
    accent: "#92400e",
  },
];

export default function StartPage() {
  return (
    <div className="perspective-container">
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-5 animate-scale-in">
            Pick your path
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            We do five things well. Tell us what you&apos;re here for and we&apos;ll get you to the right page.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Or call (818) 506-7744 — real human Mon–Sat
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto space-y-4">
          {lanes.map((l, i) => (
            <Link
              key={l.title}
              href={l.href}
              className={`group block rounded-2xl p-7 hover-lift transition-all animate-fade-up`}
              style={
                l.primary
                  ? {
                      background: `linear-gradient(145deg, ${l.accent} 0%, #8A5520 100%)`,
                      boxShadow: `0 12px 40px ${l.accent}44`,
                      color: "#fff",
                      animationDelay: `${i * 70}ms`,
                    }
                  : {
                      background: "#FFF9F3",
                      border: "1px solid #E8D8C4",
                      boxShadow: "var(--shadow-md)",
                      animationDelay: `${i * 70}ms`,
                    }
              }
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: l.primary ? "#FFE4A0" : l.accent,
                    }}
                  >
                    {l.sub}
                  </p>
                  <h3
                    className="font-extrabold tracking-tight text-xl md:text-2xl mb-2"
                    style={{ color: l.primary ? "#FFE4A0" : "#2D100F" }}
                    dangerouslySetInnerHTML={{ __html: l.title }}
                  />
                  <p
                    className="text-sm leading-relaxed max-w-2xl"
                    style={{
                      color: l.primary ? "rgba(255,255,255,0.85)" : "#7A6050",
                    }}
                  >
                    {l.body}
                  </p>
                </div>
                <div
                  className="font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all whitespace-nowrap"
                  style={{
                    color: l.primary ? "#FFE4A0" : l.accent,
                  }}
                >
                  {l.cta} <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-text-light-muted mb-4">
            Not sure which fits? Read more about{" "}
            <Link href="/services" className="font-bold underline" style={{ color: "#337485" }}>
              everything we offer
            </Link>{" "}
            or call (818) 506-7744 for a 5-minute conversation.
          </p>
        </div>
      </section>
    </div>
  );
}
