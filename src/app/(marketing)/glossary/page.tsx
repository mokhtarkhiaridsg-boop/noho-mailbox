import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Glossary — CMRA, Form 1583, EIN, S-Corp & More | NOHO Mailbox",
  description:
    "Plain-English definitions for the technical terms you'll see in mailbox + business formation: CMRA, Form 1583, EIN, S-corp election, registered agent, franchise tax, USPS-CMRA certification.",
  openGraph: {
    title: "Glossary — NOHO Mailbox",
    description:
      "Plain-English definitions of mailbox + business formation jargon: CMRA, Form 1583, EIN, S-corp, and more.",
    url: "https://nohomailbox.org/glossary",
  },
  alternates: { canonical: "https://nohomailbox.org/glossary" },
};

type Term = {
  slug: string; // anchor
  term: string;
  short: string; // 1-sentence
  long: string; // 2-3 sentence explanation
  related?: { label: string; href: string }[];
};

const TERMS: Term[] = [
  {
    slug: "cmra",
    term: "CMRA",
    short: "Commercial Mail Receiving Agency. A USPS-certified business that legally holds and forwards mail for customers.",
    long:
      "A CMRA is registered with the USPS to receive mail on behalf of customers under a notarized Form 1583. Major banks, Etsy, Amazon, Stripe, and other platforms require addresses tied to USPS-CMRA certified businesses (not P.O. Boxes or unverified mailboxes). NOHO Mailbox is a USPS-CMRA at 5062 Lankershim Blvd in North Hollywood.",
    related: [
      { label: "Form 1583 explained", href: "/blog/form-1583-explained" },
      { label: "P.O. Box vs CMRA", href: "/blog/po-box-vs-real-mailbox-address" },
    ],
  },
  {
    slug: "form-1583",
    term: "USPS Form 1583",
    short: "The notarized form authorizing a CMRA to legally receive mail on your behalf.",
    long:
      "USPS Form 1583 (Application for Delivery of Mail Through Agent) must be notarized in person with two forms of ID and filed with the CMRA. The CMRA keeps it on file for 4+ years. Without it, USPS won't deliver to that mailbox in your name. We provide free notary on Business + Premium plans.",
    related: [
      { label: "Form 1583 walkthrough", href: "/blog/form-1583-explained" },
      { label: "Form 1583 notary checklist", href: "/blog/form-1583-notary-checklist" },
    ],
  },
  {
    slug: "ein",
    term: "EIN (Employer Identification Number)",
    short: "Federal tax ID for your business, like a Social Security Number for the LLC.",
    long:
      "An EIN is issued by the IRS and is required for opening a business bank account, hiring W-2 employees, filing business taxes, and most B2B contracts. Free to apply at IRS.gov (10 minutes online if you have an SSN). Paid services charge $50-$70 to do this for you. We include EIN in the $2k Business Launch Bundle.",
    related: [
      { label: "California LLC formation guide", href: "/blog/llc-formation-california-2026-guide" },
    ],
  },
  {
    slug: "llc",
    term: "LLC (Limited Liability Company)",
    short: "A business structure that creates legal separation between owners and the business.",
    long:
      "If your LLC gets sued, the plaintiff can usually only reach the LLC's assets — not your personal home, car, or savings. Default tax treatment: pass-through (income flows to your personal taxes). Cost in California: $70 filing + $800/yr franchise tax + $20 every 2 years for Statement of Information.",
    related: [
      { label: "Should I form an LLC? Quiz", href: "/tools/should-i-form-an-llc" },
      { label: "California LLC vs sole prop", href: "/blog/llc-vs-sole-prop-decision-framework" },
    ],
  },
  {
    slug: "s-corp-election",
    term: "S-Corp Election",
    short: "A tax election (Form 2553) that lets your LLC pay you a salary + distributions, saving self-employment tax.",
    long:
      "Default LLC taxation = pay 15.3% self-employment tax on all profits. S-corp election = pay yourself a 'reasonable salary' (subject to payroll tax) + take rest as distributions (no SE tax). Net savings typically $5-15k/year at $80k+ income. Must file Form 2553 by March 15 of the year you want it to apply.",
    related: [
      { label: "1099 contractor S-corp tax math", href: "/blog/1099-contractor-llc-s-corp-tax-savings" },
    ],
  },
  {
    slug: "registered-agent",
    term: "Registered Agent",
    short: "A real physical address in your LLC&apos;s state where legal mail (lawsuits, state notices) gets delivered.",
    long:
      "Every LLC needs one. Must be a real physical address (P.O. Box rejected) in the state of formation. You can be your own registered agent if you have a published address there, but most non-resident LLCs hire a service ($50-$300/yr). Different from a 'principal office' (where the business actually operates).",
    related: [
      { label: "LLC Cost Calculator (50 states)", href: "/tools/llc-cost-calculator" },
    ],
  },
  {
    slug: "franchise-tax",
    term: "Franchise Tax",
    short: "An annual flat tax some states charge LLCs regardless of revenue.",
    long:
      "California's $800/year franchise tax is the most famous one — applies to every LLC even with $0 revenue. Other states charge less ($0 in many, $300 in Delaware, $100 in Tennessee). Pay by 15th day of 4th month after formation. Late = penalties + dissolution risk.",
    related: [
      { label: "LLC Cost Calculator (50 states)", href: "/tools/llc-cost-calculator" },
    ],
  },
  {
    slug: "operating-agreement",
    term: "Operating Agreement",
    short: "An internal document defining how the LLC is owned, managed, and operated.",
    long:
      "Required by law in some states (CA recommends but doesn't require). Even single-member LLCs benefit — defines profit/loss splits, member exit terms, decision-making rules. We include in the $2k Business Launch Bundle (custom-drafted to your business).",
    related: [
      { label: "$2k Business Launch Bundle", href: "/business-solutions" },
    ],
  },
  {
    slug: "annual-report",
    term: "Annual Report (or Statement of Information)",
    short: "A periodic state filing keeping your LLC in 'good standing' with the secretary of state.",
    long:
      "California: every 2 years, $20, called Statement of Information (LLC-12). Other states: yearly, fees range $0-$300. Late filings result in penalties; chronic late filings result in administrative dissolution of the LLC.",
    related: [
      { label: "California LLC formation guide", href: "/blog/llc-formation-california-2026-guide" },
    ],
  },
  {
    slug: "anonymous-llc",
    term: "Anonymous LLC",
    short: "An LLC where member names don&apos;t appear on public state records.",
    long:
      "Available in Wyoming, New Mexico, and Delaware (NOT California). Useful for real-estate investors, public figures, asset-protection strategies. Doesn't make the LLC truly anonymous — IRS, banks, and courts can still compel disclosure — but keeps members off public registries that journalists, tenants, and creditors search.",
    related: [
      { label: "Anonymous LLC explained", href: "/blog/anonymous-llc-how-it-works" },
      { label: "DE vs WY vs NM LLC compared", href: "/blog/delaware-vs-wyoming-vs-new-mexico-llc" },
    ],
  },
  {
    slug: "form-2553",
    term: "Form 2553 (S-Corp Election)",
    short: "The IRS form that elects S-corp tax treatment for your LLC.",
    long:
      "File with the IRS within 75 days of forming the LLC OR by March 15 of the year you want S-corp treatment to begin. Once approved, your LLC files an S-corp tax return (Form 1120-S) instead of pass-through. You become an employee of your own company; pay yourself a reasonable salary + distributions.",
    related: [
      { label: "1099 contractor S-corp math", href: "/blog/1099-contractor-llc-s-corp-tax-savings" },
    ],
  },
  {
    slug: "ca-foreign-llc",
    term: "Foreign LLC (in California)",
    short: "An LLC formed in another state that does business in California must register as a 'foreign LLC' with CA.",
    long:
      "If you form a Wyoming or New Mexico LLC but operate in California (you live in CA, your customers are in CA, your office is in CA), you must register as a foreign LLC in CA — which means CA's $800/yr franchise tax applies anyway. This is why 'incorporate in Wyoming for the savings' often doesn't work for CA-based founders.",
    related: [
      { label: "DE vs WY vs NM LLC compared", href: "/blog/delaware-vs-wyoming-vs-new-mexico-llc" },
    ],
  },
  {
    slug: "form-1099-nec",
    term: "Form 1099-NEC",
    short: "Tax form sent to independent contractors who earned $600+ in a year.",
    long:
      "Replaces the old Form 1099-MISC for contractor earnings (effective 2020). If you&apos;re a 1099 contractor, every client who paid you $600+ sends you a 1099-NEC by January 31. You file these with your personal taxes (Schedule C if sole-prop, or with your LLC return).",
    related: [
      { label: "Real address for affiliate marketers", href: "/blog/real-address-for-affiliate-marketers" },
    ],
  },
  {
    slug: "form-1099-k",
    term: "Form 1099-K",
    short: "Tax form sent by payment processors (Stripe, PayPal, Etsy, Amazon) reporting your gross sales.",
    long:
      "If you process $X in payments through Stripe / PayPal / Etsy / Amazon (threshold varies by year and state), they send you and the IRS a 1099-K. Report this on your business taxes. Match against your Stripe / Etsy reports to catch any errors.",
    related: [
      { label: "Etsy shop startup costs", href: "/blog/etsy-shop-startup-costs-2026" },
    ],
  },
  {
    slug: "doing-business-as",
    term: "DBA (Doing Business As) / Fictitious Business Name",
    short: "A registered alternative name for a sole proprietorship or LLC.",
    long:
      "Lets you legally operate under a brand name different from your legal name (sole prop) or the LLC&apos;s legal name. File with your county for ~$25-$50 + publish in a local newspaper for 4 weeks (CA requirement). Doesn&apos;t create a separate legal entity — just a name registration.",
    related: [
      { label: "California LLC vs sole prop", href: "/blog/llc-vs-sole-prop-decision-framework" },
    ],
  },
];

export default function GlossaryPage() {
  const definitionJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "NOHO Mailbox Glossary",
    hasDefinedTerm: TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.long.replace(/&apos;/g, "'"),
      url: `https://nohomailbox.org/glossary#${t.slug}`,
    })),
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definitionJsonLd) }}
      />

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
            GLOSSARY
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            Plain-English definitions
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg">
            Mailbox + LLC + tax terms explained without jargon. If you
            see one of these terms on our site or in a form and aren&apos;t
            sure what it means, the answer&apos;s here.
          </p>
        </div>
      </section>

      {/* Term index */}
      <section className="py-12 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-light-muted mb-3">
            Jump to a term
          </h2>
          <div className="flex flex-wrap gap-2">
            {TERMS.map((t) => (
              <a
                key={t.slug}
                href={`#${t.slug}`}
                className="text-xs font-bold px-3 py-1 rounded-full transition-all hover:-translate-y-0.5"
                style={{
                  background: "#FFF9F3",
                  color: "#2D100F",
                  border: "1px solid #E8D8C4",
                }}
              >
                {t.term}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Definitions */}
      <section className="py-12 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto space-y-6">
          {TERMS.map((t) => (
            <div
              key={t.slug}
              id={t.slug}
              className="rounded-2xl p-6 scroll-mt-20"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h2 className="font-extrabold tracking-tight text-text-light text-xl mb-2">
                {t.term}
              </h2>
              <p
                className="text-base text-text-light leading-relaxed mb-3 italic"
                style={{ color: "#7A6050" }}
                dangerouslySetInnerHTML={{ __html: t.short }}
              />
              <p
                className="text-sm text-text-light-muted leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: t.long }}
              />
              {t.related && t.related.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {t.related.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="text-xs font-bold underline"
                      style={{ color: "#337485" }}
                    >
                      {r.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-dark mb-3">
            Term we missed?
          </h2>
          <p className="text-text-dark-muted mb-6">
            If there&apos;s a term you&apos;ve seen on our site that should
            be here, let us know. We update this regularly.
          </p>
          <Link
            href="/contact"
            className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 inline-block"
            style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
          >
            Suggest a term
          </Link>
        </div>
      </section>
    </div>
  );
}
