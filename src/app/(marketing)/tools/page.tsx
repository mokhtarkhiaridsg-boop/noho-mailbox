import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Tools — LLC Name Checker, Delivery Calculator, More",
  description:
    "Free tools for small businesses: California LLC name checker, same-day delivery cost calculator, mailbox plan picker. No login, no email required.",
  openGraph: {
    title: "Free Small Business Tools — NOHO Mailbox",
    description:
      "California LLC name checker, delivery calculator, mailbox plan picker. Free tools for LA small businesses.",
    url: "https://nohomailbox.org/tools",
  },
  alternates: { canonical: "https://nohomailbox.org/tools" },
};

const tools = [
  {
    title: "California LLC Name Checker",
    body:
      "Type your proposed LLC name, get instant feedback on California state filing requirements (LLC suffix, restricted words, government implications). Avoid the $70 rejection.",
    href: "/tools/llc-name-checker",
    badge: "Free · No login",
    cta: "Check a name",
    primary: true,
  },
  {
    title: "Mailbox ROI Calculator",
    body:
      "How much is package theft + mail handling actually costing you? Interactive calculator factors in LA porch piracy rates (13% avg), your time, and your hourly rate. Most people are losing more than they think.",
    href: "/tools/mailbox-roi-calculator",
    badge: "Free tool",
    cta: "Calculate my loss",
    primary: false,
  },
  {
    title: "LLC Cost Calculator (50 states + DC)",
    body:
      "Compare LLC formation costs across all 50 states + DC — filing fees, franchise tax, annual reports, registered agent. Year 1 + 5-year projection. The fastest way to see if your home state is cheaper than Delaware/Wyoming/NM.",
    href: "/tools/llc-cost-calculator",
    badge: "Free tool · 51 states",
    cta: "Compare states",
    primary: false,
  },
  {
    title: "Should I Form an LLC? (Decision Quiz)",
    body:
      "9-question interactive quiz with an honest answer at the end. We&apos;ll tell you &quot;don&apos;t form one yet&quot; if that&apos;s the right call — about 1 in 5 quiz takers gets that result. No email required.",
    href: "/tools/should-i-form-an-llc",
    badge: "Free quiz · 90 sec",
    cta: "Take the quiz",
    primary: false,
  },
  {
    title: "Same-Day Delivery Cost Calculator",
    body:
      "Punch in your destination ZIP and instantly see what same-day delivery from us costs — $5 inside NoHo, $9–$28 across LA. No commitment.",
    href: "/delivery#book",
    badge: "Live pricing",
    cta: "Calculate cost",
    primary: false,
  },
  {
    title: "Mailbox Plan Picker (5-Q Quiz)",
    body:
      "5-question interactive quiz that recommends the right plan — Basic, Business, or Premium — based on your use case, mail volume, and notarization needs. Honest fit, not the priciest option.",
    href: "/tools/mailbox-plan-picker",
    badge: "Free quiz · 60 sec",
    cta: "Take the quiz",
    primary: false,
  },
  {
    title: "Plan Comparison Table",
    body:
      "Compare Basic, Business, and Premium plans side-by-side. Notary, scanning, forwarding, same-day delivery features.",
    href: "/compare",
    badge: "Live pricing",
    cta: "Compare plans",
    primary: false,
  },
  {
    title: "P.O. Box vs Real Address Checker",
    body:
      "Quick guide to which California businesses can use a P.O. Box and which need a real CMRA address. Etsy, Amazon, banking, DMV — all covered.",
    href: "/blog/po-box-vs-real-mailbox-address",
    badge: "Buying guide",
    cta: "Read the guide",
    primary: false,
  },
  {
    title: "Etsy Shop Cost Calculator",
    body:
      "Honest year-1 cost breakdown for an LA-based Etsy shop — Etsy fees, $800 California LLC franchise tax, real address, brand kit. Cheap path vs do-it-right path.",
    href: "/blog/etsy-shop-startup-costs-2026",
    badge: "Cost guide",
    cta: "See the math",
    primary: false,
  },
  {
    title: "USPS Form 1583 Walkthrough",
    body:
      "Step-by-step explanation of the USPS form authorizing a CMRA to receive mail for you. Covers the most common rejection reasons.",
    href: "/blog/form-1583-explained",
    badge: "Walkthrough",
    cta: "Read the guide",
    primary: false,
  },
];

export default function ToolsPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Free tools for small businesses
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Calculators, checkers, and guides we use every day — now public.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        No login, no email, no upsell — just useful.
      </div>

      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((t, i) => (
            <Link
              key={t.title}
              href={t.href}
              className={`group rounded-2xl p-7 hover-lift animate-fade-up transition-all`}
              style={
                t.primary
                  ? {
                      background:
                        "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                      boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
                      color: "#fff",
                      animationDelay: `${i * 80}ms`,
                    }
                  : {
                      background: "#FFF9F3",
                      border: "1px solid #E8D8C4",
                      boxShadow: "var(--shadow-md)",
                      animationDelay: `${i * 80}ms`,
                    }
              }
            >
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
                style={
                  t.primary
                    ? {
                        background: "rgba(255,255,255,0.18)",
                        color: "#FFE4A0",
                      }
                    : {
                        background: "rgba(51,116,133,0.1)",
                        color: "#337485",
                      }
                }
              >
                {t.badge}
              </span>
              <h3
                className="font-extrabold tracking-tight mb-2 text-lg"
                style={{ color: t.primary ? "#FFE4A0" : "#2D100F" }}
              >
                {t.title}
              </h3>
              <p
                className="text-sm leading-relaxed mb-5"
                style={{
                  color: t.primary ? "rgba(255,255,255,0.85)" : "#7A6050",
                }}
              >
                {t.body}
              </p>
              <span
                className="inline-flex items-center gap-2 font-bold text-sm group-hover:gap-3 transition-all"
                style={{ color: t.primary ? "#FFE4A0" : "#337485" }}
              >
                {t.cta} <span>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-3">
            Want a custom tool for your business?
          </h2>
          <p className="text-text-light-muted mb-8 max-w-xl mx-auto">
            Our Business Solutions Bundle includes a 5-page website plus brand
            book — and we can wire in custom calculators or quote forms.
          </p>
          <Link
            href="/business-solutions"
            className="inline-block text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
            style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
          >
            See the bundle →
          </Link>
        </div>
      </section>
    </div>
  );
}
