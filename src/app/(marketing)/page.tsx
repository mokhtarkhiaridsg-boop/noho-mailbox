import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { MailboxIcon, HeartBubbleIcon, EnvelopeIcon, DeliveryTruckIcon, ShoppingBagIcon, StarIcon, ShieldIcon } from "@/components/BrandIcons";
import { HomepageClient } from "./homepage-client";

export const metadata: Metadata = {
  title: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
  description:
    "Get a real street address with mail scanning, package alerts, same-day delivery, notary services, and business formation. Starting at $50 for 3 months in North Hollywood, CA.",
  openGraph: {
    title: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
    description:
      "A real street address, digital mail scanning, forwarding, package alerts, notary, and business formation — all in one neighborhood shop.",
    url: "https://nohomailbox.org",
  },
  alternates: { canonical: "https://nohomailbox.org" },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://nohomailbox.org",
  name: "NOHO Mailbox",
  image: "https://nohomailbox.org/icon.svg",
  url: "https://nohomailbox.org",
  telephone: "+1-818-765-1539",
  priceRange: "$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "5250 Lankershim Blvd",
    addressLocality: "North Hollywood",
    addressRegion: "CA",
    postalCode: "91601",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 34.1664, longitude: -118.3776 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "09:00", closes: "17:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "10:00", closes: "13:30" },
  ],
  sameAs: [],
  description: "Private mailbox rental, mail scanning, package handling, same-day delivery, notary, and business formation in North Hollywood, CA.",
};

const steps = [
  { num: "01", title: "Bring 2 Valid IDs", desc: "Two government-issued photo IDs — required by USPS for any mailbox rental.", icon: "id" },
  { num: "02", title: "Sign Form 1583", desc: "A quick federal form authorizing us to receive mail on your behalf.", icon: "form" },
  { num: "03", title: "Get Your Keys", desc: "Walk out with keys and a real street address — active on the spot.", icon: "key" },
];

const plans = [
  {
    name: "Basic", tagline: "Personal use", popular: false,
    price: "$50", term: "for 3 months",
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup"],
  },
  {
    name: "Business", tagline: "Most popular", popular: true,
    price: "$80", term: "for 3 months",
    features: ["Everything in Basic", "Mail forwarding", "Priority handling", "Dedicated suite"],
  },
  {
    name: "Premium", tagline: "Everything included", popular: false,
    price: "$95", term: "for 3 months",
    features: ["Everything in Business", "Priority processing", "Notary discount", "Concierge support"],
  },
];

const perks = [
  { title: "Real Street Address", sub: "Not a P.O. Box — a real suite number you can use for business" },
  { title: "Digital Mail Scanning", sub: "See every piece online before visiting" },
  { title: "Package Alerts", sub: "Instant SMS + email when packages arrive" },
  { title: "Mail Forwarding", sub: "Ship anywhere, domestic or international" },
  { title: "Walk-in Notary", sub: "Same-day appointments, no wait" },
  { title: "Secure Storage", sub: "Held safely in your private suite" },
];

const stats = [
  { value: "4,500+", label: "Packages handled" },
  { value: "99.9%", label: "Delivery accuracy" },
  { value: "< 2hr", label: "Avg same-day delivery" },
  { value: "5.0", label: "Google rating" },
];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center px-5 py-32 bg-bg-dark">
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03] pointer-events-none border border-white" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-scale-in mb-8">
            <Logo className="mx-auto w-full max-w-[200px] drop-shadow-2xl animate-float" />
          </div>

          <p className="animate-fade-up delay-100 text-accent font-semibold text-xs uppercase tracking-[0.25em] mb-5">
            Private Mailbox Rental &middot; North Hollywood, CA
          </p>

          <h1 className="animate-fade-up delay-200 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold text-text-dark leading-[1.05] tracking-tight mb-6">
            Your Address.<br />
            <span className="gradient-text">Your Business.</span><br />
            Your Privacy.
          </h1>

          <p className="animate-fade-up delay-300 text-text-dark-muted text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            A real street address with mail scanning, forwarding, same-day delivery, notary, and full business formation — all from one neighborhood shop.
          </p>

          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#plans"
              className="group relative font-semibold px-8 py-4 rounded-xl text-white text-[15px] bg-accent hover:bg-accent-hover transition-all duration-300 shadow-[0_4px_20px_rgba(51,116,181,0.4)] overflow-hidden"
            >
              <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              See Plans & Pricing
            </Link>
            <Link
              href="/shipping"
              className="font-semibold px-8 py-4 rounded-xl text-text-dark text-[15px] border border-white/[0.12] hover:bg-white/[0.06] transition-all duration-300"
            >
              Get a Shipping Quote
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Carrier Trust Marquee ─── */}
      <div className="bg-bg-dark border-y border-white/[0.06] py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, set) => (
            <div key={set} className="flex items-center gap-12 px-6">
              {["USPS", "UPS", "FedEx", "DHL", "Same-Day Local"].map((c) => (
                <span key={`${set}-${c}`} className="text-sm font-semibold text-text-dark-muted/40 tracking-wide">{c}</span>
              ))}
              {["Mail Scanning", "Forwarding", "Notary", "Business Formation", "Shipping Supplies"].map((s) => (
                <span key={`${set}-${s}`} className="text-sm font-semibold text-text-dark-muted/40 tracking-wide">{s}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Stats ─── */}
      <section className="bg-bg-dark py-16 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-text-dark mb-1">{s.value}</p>
              <p className="text-xs text-text-dark-muted uppercase tracking-wider font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3 Steps ─── */}
      <section className="py-24 px-5 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-accent font-semibold text-xs uppercase tracking-[0.2em] mb-3">Simple Setup</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light text-center mb-4 tracking-tight">
            Get a Mailbox in Minutes
          </h2>
          <p className="text-center text-text-light-muted mb-14 max-w-sm mx-auto text-[15px] leading-relaxed">
            Walk in, sign one form, walk out with keys. That&apos;s it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="relative rounded-2xl p-7 bg-surface-light border border-border-light hover-lift transition-all duration-300"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white font-bold text-lg ${i === 1 ? "bg-accent shadow-[0_4px_16px_rgba(51,116,181,0.35)]" : "bg-text-light"}`}>
                  {s.num}
                </div>
                <h3 className="font-bold text-lg text-text-light mb-2">{s.title}</h3>
                <p className="text-sm text-text-light-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services Spotlight ─── */}
      <section className="py-24 px-5 bg-bg-dark">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-accent font-semibold text-xs uppercase tracking-[0.2em] mb-3">Services</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-dark text-center mb-12 tracking-tight">
            More Than a Mailbox
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: <DeliveryTruckIcon className="w-10 h-10" />,
                title: "Same-Day Delivery",
                desc: "Get mail and packages delivered to your door. NoHo zone flat rate starting at $5. Open to everyone — no membership required.",
                href: "/delivery",
                cta: "Learn More",
              },
              {
                icon: <ShoppingBagIcon className="w-10 h-10" />,
                title: "Ship Anything",
                desc: "Compare rates from USPS, UPS, FedEx, and DHL in seconds. Get the best price with dimensions and weight. Print labels in-store.",
                href: "/shipping",
                cta: "Get a Quote",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl p-7 bg-white/[0.04] border border-white/[0.08] hover-lift transition-all duration-300"
              >
                <div className="mb-4">{s.icon}</div>
                <h3 className="font-bold text-xl text-text-dark mb-2">{s.title}</h3>
                <p className="text-sm text-text-dark-muted leading-relaxed mb-5">{s.desc}</p>
                <Link href={s.href} className="text-accent font-semibold text-sm inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">
                  {s.cta} <span className="text-lg">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Plans ─── */}
      <section id="plans" className="py-24 px-5 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-accent font-semibold text-xs uppercase tracking-[0.2em] mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light text-center mb-4 tracking-tight">
            Pick Your Plan
          </h2>
          <p className="text-center text-text-light-muted mb-14 max-w-sm mx-auto text-[15px] leading-relaxed">
            All plans include a real street address — not a P.O. Box.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 flex flex-col transition-all duration-300 hover-lift ${
                  plan.popular
                    ? "bg-accent text-white md:-mt-4 md:mb-4 shadow-[0_12px_40px_rgba(51,116,181,0.3)]"
                    : "bg-surface-light border border-border-light shadow-[var(--shadow-sm)]"
                }`}
              >
                {plan.popular && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white mb-4 self-start">
                    Most Popular
                  </span>
                )}
                <h3 className={`font-bold text-xl mb-1 ${plan.popular ? "text-white" : "text-text-light"}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs mb-5 ${plan.popular ? "text-white/60" : "text-text-light-muted"}`}>
                  {plan.tagline}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-text-light"}`}>{plan.price}</span>
                  <span className={`text-sm ml-1.5 ${plan.popular ? "text-white/60" : "text-text-light-muted"}`}>{plan.term}</span>
                </div>
                <ul className="space-y-2.5 text-sm flex-1 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <svg className={`w-4 h-4 shrink-0 ${plan.popular ? "text-white/80" : "text-accent"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span className={plan.popular ? "text-white/80" : "text-text-light-muted"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 ${
                    plan.popular
                      ? "bg-white text-accent hover:bg-white/90"
                      : "bg-text-light text-white hover:bg-text-light/90"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-sm text-text-light-muted">
            6-month and 14-month options available —{" "}
            <Link href="/pricing" className="text-accent font-semibold hover:underline">See all pricing →</Link>
          </p>
        </div>
      </section>

      {/* ─── Perks ─── */}
      <section className="py-20 px-5 bg-bg-light border-t border-border-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-light text-center mb-12 tracking-tight">
            What You Get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-4 p-5 rounded-xl bg-surface-light border border-border-light hover-lift transition-all" style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-text-light mb-0.5">{p.title}</p>
                  <p className="text-xs text-text-light-muted leading-relaxed">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 px-5 bg-bg-dark">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-dark text-center mb-12 tracking-tight">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Jessica M.", detail: "Business Box Member", quote: "Finally a mailbox service that actually feels modern. The scanning is fast and the team is incredibly friendly." },
              { name: "David K.", detail: "Premium Box Member", quote: "I use NOHO Mailbox for my law practice. The real street address and same-day notary have been game changers." },
              { name: "Sarah L.", detail: "Basic Box Member", quote: "So easy to sign up and the package notifications are a lifesaver. Worth every penny." },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl p-6 bg-white/[0.04] border border-white/[0.08] hover-lift transition-all">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <StarIcon key={j} className="w-3.5 h-3.5" />
                  ))}
                </div>
                <p className="text-sm text-text-dark-muted italic leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-sm text-text-dark">{t.name}</p>
                  <p className="text-xs text-text-dark-muted">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Business Solutions CTA ─── */}
      <section className="py-24 px-5 bg-bg-dark border-t border-white/[0.06] text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="max-w-2xl mx-auto relative z-10">
          <p className="text-accent font-semibold text-xs uppercase tracking-[0.2em] mb-4">Business Solutions</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-dark mb-5 tracking-tight leading-tight">
            Launch Your Business<br />Under One Roof
          </h2>
          <p className="text-text-dark-muted mb-3 max-w-lg mx-auto leading-relaxed text-[15px]">
            LLC formation, EIN, branding, website, SEO, social media, Google Business — plus 12 months of mail service.
          </p>
          <p className="text-5xl font-extrabold text-accent mb-9">$2,000</p>
          <Link
            href="/business-solutions"
            className="inline-block font-semibold px-8 py-4 rounded-xl text-white bg-accent hover:bg-accent-hover transition-all duration-300 shadow-[0_4px_20px_rgba(51,116,181,0.4)]"
          >
            See What&apos;s Included
          </Link>
        </div>
      </section>

      {/* Client-side scroll animations */}
      <HomepageClient />
    </>
  );
}
