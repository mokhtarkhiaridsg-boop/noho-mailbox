import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { DeliveryTruckIcon, ShoppingBagIcon, StarIcon } from "@/components/BrandIcons";
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
    streetAddress: "5062 Lankershim Blvd",
    addressLocality: "North Hollywood",
    addressRegion: "CA",
    postalCode: "91601",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 34.1664, longitude: -118.3776 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "09:30", closes: "17:30" },
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
      <div className="border-y py-4 overflow-hidden" style={{ background: "#F7E6C2", borderColor: "#D4C4A0" }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, set) => (
            <div key={set} className="flex items-center gap-12 px-6">
              {["USPS", "UPS", "FedEx", "DHL", "Amazon"].map((c) => (
                <span key={`${set}-${c}`} className="text-sm font-black tracking-wide" style={{ color: "#2D1D0F" }}>{c}</span>
              ))}
              {["Mail Scanning", "Forwarding", "Notary", "Business Formation", "Same-Day Delivery"].map((s) => (
                <span key={`${set}-${s}`} className="text-sm font-semibold" style={{ color: "#8B6B3D" }}>{s}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Stats — warm cream twist ─── */}
      <section className="py-16 px-5" style={{ background: "#F7E6C2" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold mb-1" style={{ color: "#2D1D0F" }}>{s.value}</p>
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: "#8B6B3D" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3 Steps — warm dark brown twist ─── */}
      <section className="py-24 px-5" style={{ background: "#2D1D0F" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center font-bold text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#F7E6C2" }}>Simple Setup</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 tracking-tight" style={{ color: "#F7F0E6" }}>
            Get a Mailbox in Minutes
          </h2>
          <p className="text-center mb-14 max-w-sm mx-auto text-[15px] leading-relaxed" style={{ color: "#AFA08F" }}>
            Walk in, sign one form, walk out with keys. That&apos;s it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="relative rounded-2xl p-7 hover-lift transition-all duration-300"
                style={{
                  background: i === 1 ? "#3374B5" : "#F7E6C2",
                  boxShadow: i === 1 ? "0 12px 40px rgba(51,116,181,0.35)" : "0 4px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 font-black text-lg"
                  style={{
                    background: i === 1 ? "rgba(255,255,255,0.2)" : "#2D1D0F",
                    color: i === 1 ? "white" : "#F7E6C2",
                  }}
                >
                  {s.num}
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: i === 1 ? "white" : "#2D1D0F" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: i === 1 ? "rgba(255,255,255,0.75)" : "#6B4F3A" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services Spotlight — warm light twist ─── */}
      <section className="py-24 px-5 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-accent font-bold text-xs uppercase tracking-[0.2em] mb-3">Services</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-light text-center mb-12 tracking-tight">
            More Than a Mailbox
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: <span style={{ color: "#3374B5" }}><DeliveryTruckIcon className="w-10 h-10" /></span>,
                title: "Same-Day Delivery",
                desc: "Get mail and packages delivered to your door. NoHo zone flat rate starting at $5. Open to everyone — no membership required.",
                href: "/delivery",
                cta: "Learn More",
                accent: "#3374B5",
              },
              {
                icon: <span style={{ color: "#B07030" }}><ShoppingBagIcon className="w-10 h-10" /></span>,
                title: "Ship Anything",
                desc: "Compare rates from USPS, UPS, FedEx, and DHL in seconds. Get the best price with dimensions and weight. Print labels in-store.",
                href: "/shipping",
                cta: "Get a Quote",
                accent: "#B07030",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl p-8 hover-lift transition-all duration-300"
                style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", boxShadow: "0 4px 20px rgba(45,29,15,0.06)" }}
              >
                <div className="mb-5">{s.icon}</div>
                <h3 className="font-bold text-xl mb-2" style={{ color: "#2D1D0F" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "#7A6050" }}>{s.desc}</p>
                <Link href={s.href} className="text-sm font-bold inline-flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: s.accent }}>
                  {s.cta} <span className="text-lg">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Plans — blue gradient twist ─── */}
      <section id="plans" className="py-24 px-5" style={{ background: "linear-gradient(160deg, #1a2d4a 0%, #0f1e30 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center font-bold text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#7eb3e8" }}>Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 tracking-tight" style={{ color: "#F7F0E6" }}>
            Pick Your Plan
          </h2>
          <p className="text-center mb-14 max-w-sm mx-auto text-[15px] leading-relaxed" style={{ color: "#8fa8c0" }}>
            All plans include a real street address — not a P.O. Box.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-7 flex flex-col transition-all duration-300 hover-lift"
                style={{
                  background: plan.popular ? "#3374B5" : "rgba(247,230,194,0.08)",
                  border: plan.popular ? "none" : "1px solid rgba(247,230,194,0.15)",
                  boxShadow: plan.popular ? "0 16px 48px rgba(51,116,181,0.45)" : "0 4px 16px rgba(0,0,0,0.2)",
                  marginTop: plan.popular ? "-16px" : "0",
                  marginBottom: plan.popular ? "16px" : "0",
                }}
              >
                {plan.popular && (
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white mb-4 self-start">
                    Most Popular
                  </span>
                )}
                <h3 className="font-black text-xl mb-1" style={{ color: plan.popular ? "white" : "#F7E6C2" }}>
                  {plan.name}
                </h3>
                <p className="text-xs mb-5" style={{ color: plan.popular ? "rgba(255,255,255,0.6)" : "rgba(247,230,194,0.5)" }}>
                  {plan.tagline}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold" style={{ color: plan.popular ? "white" : "#F7E6C2" }}>{plan.price}</span>
                  <span className="text-sm ml-1.5" style={{ color: plan.popular ? "rgba(255,255,255,0.6)" : "rgba(247,230,194,0.5)" }}>{plan.term}</span>
                </div>
                <ul className="space-y-2.5 text-sm flex-1 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: plan.popular ? "rgba(255,255,255,0.8)" : "#F7E6C2" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      <span style={{ color: plan.popular ? "rgba(255,255,255,0.8)" : "rgba(247,230,194,0.7)" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center font-black py-3.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    background: plan.popular ? "#F7E6C2" : "#3374B5",
                    color: plan.popular ? "#2D1D0F" : "white",
                  }}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-sm" style={{ color: "#8fa8c0" }}>
            6-month and 14-month options available —{" "}
            <Link href="/pricing" className="font-bold hover:underline" style={{ color: "#F7E6C2" }}>See all pricing →</Link>
          </p>
        </div>
      </section>

      {/* ─── Perks — cream on warm tan ─── */}
      <section className="py-20 px-5" style={{ background: "#F7E6C2" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-12 tracking-tight" style={{ color: "#2D1D0F" }}>
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-4 p-5 rounded-xl hover-lift transition-all"
                style={{ background: "#FFF9F3", border: "1px solid #D4C4A0", boxShadow: "0 2px 12px rgba(45,29,15,0.08)" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#2D1D0F" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#F7E6C2" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: "#2D1D0F" }}>{p.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#7A6050" }}>{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials — warm off-white with brown accents ─── */}
      <section className="py-20 px-5 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-light text-center mb-12 tracking-tight">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Jessica M.", detail: "Business Box Member", quote: "Finally a mailbox service that actually feels modern. The scanning is fast and the team is incredibly friendly." },
              { name: "David K.", detail: "Premium Box Member", quote: "I use NOHO Mailbox for my law practice. The real street address and same-day notary have been game changers." },
              { name: "Sarah L.", detail: "Basic Box Member", quote: "So easy to sign up and the package notifications are a lifesaver. Worth every penny." },
            ].map((t, i) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 hover-lift transition-all"
                style={{
                  background: i === 1 ? "#2D1D0F" : "#FFF9F3",
                  border: `1px solid ${i === 1 ? "#4a3420" : "#E8DDD0"}`,
                  boxShadow: "0 4px 20px rgba(45,29,15,0.08)",
                }}
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} style={{ color: i === 1 ? "#F7E6C2" : "#B07030" }}><StarIcon className="w-3.5 h-3.5" /></span>
                  ))}
                </div>
                <p className="text-sm italic leading-relaxed mb-5" style={{ color: i === 1 ? "#D4C4A0" : "#7A6050" }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-4" style={{ borderTop: `1px solid ${i === 1 ? "rgba(255,255,255,0.1)" : "#E8DDD0"}` }}>
                  <p className="font-bold text-sm" style={{ color: i === 1 ? "#F7E6C2" : "#2D1D0F" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: i === 1 ? "#8B6B3D" : "#7A6050" }}>{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Business Solutions CTA — deep blue on warm cream ─── */}
      <section className="py-24 px-5 text-center relative overflow-hidden" style={{ background: "#F7E6C2" }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #2D1D0F 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="max-w-2xl mx-auto relative z-10">
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "#8B6B3D" }}>Business Solutions</p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-5 tracking-tight leading-tight" style={{ color: "#2D1D0F" }}>
            Launch Your Business<br />Under One Roof
          </h2>
          <p className="mb-3 max-w-lg mx-auto leading-relaxed text-[15px]" style={{ color: "#7A6050" }}>
            LLC formation, EIN, branding, website, SEO, social media, Google Business — plus 12 months of mail service.
          </p>
          <p className="text-5xl font-extrabold mb-9" style={{ color: "#3374B5" }}>$2,000</p>
          <Link
            href="/business-solutions"
            className="inline-block font-black px-8 py-4 rounded-xl text-white transition-all duration-300 shadow-[0_4px_20px_rgba(51,116,181,0.4)] hover:-translate-y-1"
            style={{ background: "#2D1D0F" }}
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
