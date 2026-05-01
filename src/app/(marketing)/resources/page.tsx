import type { Metadata } from "next";
import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Free Resources — Form 1583, LLC Checklist, Mailbox Setup Guide",
  description:
    "Free downloads for small businesses: USPS Form 1583, California LLC formation checklist, mailbox setup guide, and same-day delivery price calculator. No email required.",
  openGraph: {
    title: "Free Small Business Resources — NOHO Mailbox",
    description:
      "Form 1583 PDF, LLC checklist, mailbox setup guide, courier price calculator. Free, no email required.",
    url: "https://nohomailbox.org/resources",
  },
  alternates: { canonical: "https://nohomailbox.org/resources" },
};

const resources = [
  {
    title: "USPS Form 1583 (PDF)",
    body:
      "The official USPS form authorizing a CMRA (us) to receive mail on your behalf. Bring it notarized when you set up your mailbox. We notarize it free for Business and Premium plan customers.",
    badge: "USPS Official",
    href: "https://about.usps.com/forms/ps1583.pdf",
    cta: "Download Form 1583",
    external: true,
  },
  {
    title: "California LLC Formation Checklist",
    body:
      "Step-by-step: pick a name, file Articles of Organization, get your EIN, file Statement of Information, plan for the $800 franchise tax. The full path with current 2026 fees.",
    badge: "Updated 2026",
    href: "/blog/llc-formation-california-2026-guide",
    cta: "Read the checklist",
    external: false,
  },
  {
    title: "Mailbox Setup Guide",
    body:
      "What you need to bring on day one — IDs, address proof, Form 1583. Plus how mail scanning, package alerts, and forwarding actually work.",
    badge: "5 min read",
    href: "/blog/form-1583-explained",
    cta: "Read the guide",
    external: false,
  },
  {
    title: "Same-Day Courier Price Calculator",
    body:
      "Punch in your destination ZIP and instantly see what same-day delivery from us costs — $5 in NoHo, $9–$28 across LA. No login, no commitment.",
    badge: "Free tool",
    href: "/delivery#book",
    cta: "Calculate your run",
    external: false,
  },
  {
    title: "PO Box vs Real Mailbox: 7 Cases",
    body:
      "Where a P.O. Box silently fails — California LLC formation, Amazon Seller Central, banks, the DMV. Plus what to use instead.",
    badge: "Buying guide",
    href: "/blog/po-box-vs-real-mailbox-address",
    cta: "Read the comparison",
    external: false,
  },
  {
    title: "How to Pick a Same-Day Courier",
    body:
      "Flat rate vs zone pricing, walk-in vs dispatch, hidden line items. The 5-minute checklist for choosing a local courier without overpaying.",
    badge: "Buying guide",
    href: "/blog/same-day-courier-north-hollywood",
    cta: "Read the guide",
    external: false,
  },
  {
    title: "7 LA Businesses That Should Never Use a P.O. Box",
    body:
      "Etsy/Amazon sellers, real estate, food businesses, contractors, professionals — the categories where P.O. Boxes silently get rejected.",
    badge: "Quick read",
    href: "/blog/businesses-that-should-never-use-po-box",
    cta: "Read the list",
    external: false,
  },
  {
    title: "Partner Program One-Pager",
    body:
      "If you&apos;re a CPA, attorney, web designer, or insurance agent: $300 per closed referral when your clients need an LLC + brand + website.",
    badge: "For professionals",
    href: "/partners",
    cta: "See the program",
    external: false,
  },
  {
    title: "LLC Cost Calculator (50 states + DC)",
    body:
      "Compare LLC formation costs across all 50 states + DC — filing fees, franchise tax, annual reports, registered agent. Year 1 + 5-year projection.",
    badge: "Free tool · 51 states",
    href: "/tools/llc-cost-calculator",
    cta: "Compare states",
    external: false,
  },
  {
    title: "Should I Form an LLC? Decision Quiz",
    body:
      "9-question interactive quiz with an honest recommendation at the end. About 1 in 5 quiz takers gets &quot;don&apos;t form one yet&quot; — we&apos;ll tell you the truth.",
    badge: "Free quiz · 90 sec",
    href: "/tools/should-i-form-an-llc",
    cta: "Take the quiz",
    external: false,
  },
  {
    title: "Anonymous LLC Explainer",
    body:
      "Wyoming, New Mexico, Delaware — when an anonymous LLC actually matters and when it&apos;s overkill. Plus the operating-state problem most people miss.",
    badge: "LLC strategy",
    href: "/blog/anonymous-llc-how-it-works",
    cta: "Read the explainer",
    external: false,
  },
  {
    title: "1099 Contractor LLC + S-Corp Math",
    body:
      "Real numbers on what an LLC + S-corp election saves a $100k freelancer. Plus the threshold below which it costs more than it saves.",
    badge: "Tax strategy",
    href: "/blog/1099-contractor-llc-s-corp-tax-savings",
    cta: "See the math",
    external: false,
  },
  {
    title: "CMRA Operator Switching Guide (PDF)",
    body:
      "B2B guide for CMRA operators evaluating a switch from iPostal1 / Anytime / PostScan to their own software. Real migration math + 2-week timeline.",
    badge: "B2B operators",
    href: "/for-cmra-operators/migrate",
    cta: "Read the playbook",
    external: false,
  },
];

export default function ResourcesPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Free resources for small businesses
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            No email required. Take what you need.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Made by a real North Hollywood mailroom · 5062 Lankershim Blvd · (818) 506-7744
      </div>

      {/* Optional email capture — value first, capture optional */}
      <section className="px-4 -mt-4 bg-bg-light pt-8">
        <div className="max-w-3xl mx-auto">
          <NewsletterForm source="resources" variant="inline" />
        </div>
      </section>

      {/* Resources grid */}
      <section className="py-12 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((r, i) => (
            <div
              key={r.title}
              className="rounded-2xl p-7 hover-lift animate-fade-up"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-md)",
                animationDelay: `${i * 80}ms`,
              }}
            >
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
                style={{
                  background: "rgba(51,116,133,0.1)",
                  color: "#337485",
                }}
              >
                {r.badge}
              </span>
              <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
                {r.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-light-muted mb-5">
                {r.body}
              </p>
              {r.external ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-sm hover:gap-3 transition-all"
                  style={{ color: "#337485" }}
                >
                  {r.cta} <span>↗</span>
                </a>
              ) : (
                <Link
                  href={r.href}
                  className="inline-flex items-center gap-2 font-bold text-sm hover:gap-3 transition-all"
                  style={{ color: "#337485" }}
                >
                  {r.cta} <span>→</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Need help with the next step?
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            We&apos;re a real shop on Lankershim. Walk in, call, or book a 20-minute consult.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a consult
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
