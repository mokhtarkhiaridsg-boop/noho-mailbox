import Link from "next/link";
import Logo from "@/components/Logo";
import { MailboxIcon, HeartBubbleIcon, EnvelopeIcon, DeliveryTruckIcon, ShoppingBagIcon, StarIcon, ShieldIcon } from "@/components/BrandIcons";

const steps = [
  {
    num: "01",
    title: "Bring 2 Valid IDs",
    desc: "Two government-issued photo IDs — required by USPS for any mailbox rental.",
  },
  {
    num: "02",
    title: "Sign USPS Form 1583",
    desc: "A quick federal form authorizing us to receive mail on your behalf. We provide it in-store.",
  },
  {
    num: "03",
    title: "Pick Up Your Keys",
    desc: "Walk out with your keys and a real street address active on the spot.",
  },
];

const plans = [
  {
    name: "Basic Box",
    tagline: "For personal use",
    prices: [
      { term: "3 Months", price: "$50" },
      { term: "6 Months", price: "$95" },
      { term: "14 Months", price: "$160" },
    ],
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup"],
    highlight: false,
    dark: false,
  },
  {
    name: "Business Box",
    tagline: "Most popular",
    prices: [
      { term: "3 Months", price: "$80" },
      { term: "6 Months", price: "$150" },
      { term: "14 Months", price: "$230" },
    ],
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding"],
    highlight: true,
    dark: false,
  },
  {
    name: "Premium Box",
    tagline: "Everything included",
    prices: [
      { term: "3 Months", price: "$95" },
      { term: "6 Months", price: "$180" },
      { term: "14 Months", price: "$295" },
    ],
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding", "Priority processing", "Notary discount"],
    highlight: false,
    dark: true,
  },
];

const perks = [
  { icon: <MailboxIcon className="w-8 h-8" />, title: "Real Street Address", sub: "Not a P.O. Box — a real suite number" },
  { icon: <EnvelopeIcon className="w-8 h-6" />, title: "Mail Scanning", sub: "See every piece online, anytime" },
  { icon: <HeartBubbleIcon className="w-7 h-7" />, title: "Package Alerts", sub: "SMS + email the moment it arrives" },
  { icon: <EnvelopeIcon className="w-8 h-6" />, title: "Mail Forwarding", sub: "Ship anywhere, domestic or international" },
  { icon: <HeartBubbleIcon className="w-7 h-7" />, title: "Notary On-Site", sub: "Book same-day — no wait" },
  { icon: <MailboxIcon className="w-8 h-8" />, title: "Secure Storage", sub: "Held safely until you pick up" },
];

export default function Home() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section
        className="relative overflow-hidden pt-20 pb-32 px-4 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 15% 90%, rgba(51,116,181,0.35) 0%, transparent 52%), radial-gradient(ellipse at 85% 10%, rgba(247,230,194,0.08) 0%, transparent 45%), linear-gradient(155deg, #1a1108 0%, #2D1D0F 50%, #0d1e35 100%)",
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, #3374B5, transparent)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ background: "radial-gradient(circle, #F7E6C2, transparent)" }} />

        <div className="max-w-3xl mx-auto relative z-10 perspective-container">
          {/* Logo with float animation */}
          <div className="animate-scale-in">
            <div className="animate-float inline-block">
              <Logo className="mx-auto w-full max-w-[260px] sm:max-w-[300px] md:max-w-[360px] mb-10 drop-shadow-2xl" />
            </div>
          </div>

          <h1 className="animate-fade-up delay-200 text-4xl md:text-5xl lg:text-6xl font-black uppercase text-[#F7E6C2] leading-[1.05] tracking-tight mb-5">
            Your Neighborhood<br />Mailbox — Smarter.
          </h1>
          <p className="animate-fade-up delay-300 text-[#F7E6C2]/55 text-base md:text-lg max-w-md mx-auto mb-11 leading-relaxed">
            A real street address. Mail scanning, forwarding, package alerts,
            notary, and full business launch — all in one neighborhood spot.
          </p>

          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#plans"
              className="font-black px-9 py-4 rounded-full text-base text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-shimmer"
              style={{
                background: "linear-gradient(135deg, #3374B5 0%, #2055A0 50%, #3374B5 100%)",
                backgroundSize: "200% 100%",
                boxShadow: "0 4px 24px rgba(51,116,181,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
              }}
            >
              See Plans & Pricing
            </Link>
            <Link
              href="/contact"
              className="font-bold px-9 py-4 rounded-full text-base text-[#F7E6C2] transition-all duration-300 hover:bg-white/10 hover:-translate-y-1"
              style={{ border: "1px solid rgba(247,230,194,0.2)" }}
            >
              Visit Us
            </Link>
          </div>
        </div>

        {/* Decorative brand icons floating in hero */}
        <div className="absolute top-20 left-8 opacity-10 animate-float delay-200 hidden lg:block">
          <EnvelopeIcon className="w-16 h-12" />
        </div>
        <div className="absolute bottom-32 right-12 opacity-10 animate-float delay-500 hidden lg:block">
          <HeartBubbleIcon className="w-14 h-14" />
        </div>
      </section>

      {/* ─── Trust Badges ─── */}
      <section className="py-6 px-4 bg-[#F7E6C2] border-b border-[#2D1D0F]/5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {[
            { icon: <ShieldIcon className="w-5 h-5" />, label: "USPS Approved" },
            { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="1.5"/><path d="M8 12 L11 15 L16 9" stroke="#3374B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Secure Handling" },
            { icon: <StarIcon className="w-5 h-5" />, label: "5-Star Reviews" },
            { icon: <HeartBubbleIcon className="w-5 h-5" />, label: "Locally Owned" },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2">
              {badge.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D1D0F]/50">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3 Steps ─── */}
      <section className="py-24 px-4 bg-[#F7E6C2] perspective-container">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[#3374B5] font-bold text-xs uppercase tracking-[0.2em] mb-3">
            Simple Setup
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase text-[#2D1D0F] text-center mb-4">
            Get a Mailbox in Minutes
          </h2>
          <p className="text-center text-[#2D1D0F]/45 mb-14 max-w-sm mx-auto text-sm leading-relaxed">
            Walk in, sign one form, walk out with keys. That&apos;s it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-[3.25rem] left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px"
              style={{ background: "linear-gradient(90deg, #F7E6C2 0%, rgba(51,116,181,0.4) 50%, #F7E6C2 100%)" }} />

            {steps.map((s, i) => (
              <div
                key={s.num}
                className="relative rounded-3xl p-8 text-center bg-white hover-tilt"
                style={{
                  boxShadow: "0 2px 4px rgba(45,29,15,0.04), 0 8px 24px rgba(45,29,15,0.08), 0 24px 56px rgba(45,29,15,0.06)",
                  border: "1px solid rgba(247,230,194,0.7)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 relative z-10"
                  style={
                    i === 1
                      ? {
                          background: "linear-gradient(135deg, #3374B5, #1e4d8c)",
                          boxShadow: "0 6px 20px rgba(51,116,181,0.5)",
                        }
                      : {
                          background: "linear-gradient(135deg, #F7E6C2, #e8c97a)",
                          boxShadow: "0 6px 16px rgba(247,230,194,0.8)",
                        }
                  }
                >
                  {i === 0 && <span className="text-2xl">🪪</span>}
                  {i === 1 && <EnvelopeIcon className="w-7 h-5" />}
                  {i === 2 && <span className="text-2xl">🗝️</span>}
                </div>
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#3374B5] mb-2">
                  Step {s.num}
                </span>
                <h3 className="font-black text-lg uppercase text-[#2D1D0F] mb-3 leading-tight">
                  {s.title}
                </h3>
                <p className="text-[#2D1D0F]/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── New Services Spotlight ─── */}
      <section
        className="py-20 px-4"
        style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(51,116,181,0.15) 0%, transparent 55%), linear-gradient(155deg, #2D1D0F 0%, #1a1108 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[#3374B5] font-bold text-xs uppercase tracking-[0.2em] mb-3">New</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase text-[#F7E6C2] text-center mb-12">
            More Ways We Help
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="bg-white rounded-2xl p-8 hover-tilt animate-fade-up"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <DeliveryTruckIcon className="w-14 h-14 mb-4" />
              <h3 className="font-black text-xl uppercase text-[#2D1D0F] mb-2">Same-Day Delivery</h3>
              <p className="text-sm text-[#2D1D0F]/60 mb-5 leading-relaxed">
                Get your mail and packages delivered to your door. NoHo zone flat rate starting at $5. Open to everyone.
              </p>
              <Link href="/delivery" className="text-[#3374B5] font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <span>→</span>
              </Link>
            </div>
            <div
              className="bg-white rounded-2xl p-8 hover-tilt animate-fade-up delay-200"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <ShoppingBagIcon className="w-14 h-14 mb-4" />
              <h3 className="font-black text-xl uppercase text-[#2D1D0F] mb-2">Shipping Supplies</h3>
              <p className="text-sm text-[#2D1D0F]/60 mb-5 leading-relaxed">
                Custom envelopes, boxes, bubble wrap, and more. Branded NOHO items available. Everything you need in one spot.
              </p>
              <Link href="/shop" className="text-[#3374B5] font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                Browse Shop <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Plans ─── */}
      <section id="plans" className="py-24 px-4 perspective-container" style={{ background: "linear-gradient(180deg, #F7E6C2 0%, #efe0c5 100%)" }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[#3374B5] font-bold text-xs uppercase tracking-[0.2em] mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase text-[#2D1D0F] text-center mb-4">
            Pick Your Box
          </h2>
          <p className="text-center text-[#2D1D0F]/50 mb-14 max-w-xs mx-auto text-sm leading-relaxed">
            All plans include a real street address — not a P.O. Box.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, idx) => {
              const isHighlight = plan.highlight;
              const isDark = plan.dark;

              const bgStyle = isHighlight
                ? {
                    background: "linear-gradient(160deg, #3374B5 0%, #1a3f7a 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(51,116,181,0.35), 0 24px 64px rgba(51,116,181,0.3), 0 56px 96px rgba(51,116,181,0.14)",
                  }
                : isDark
                ? {
                    background: "linear-gradient(160deg, #2D1D0F 0%, #1a1108 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(247,230,194,0.1) inset, 0 4px 20px rgba(45,29,15,0.2), 0 24px 56px rgba(45,29,15,0.18)",
                  }
                : {
                    background: "white",
                    boxShadow:
                      "0 2px 4px rgba(45,29,15,0.04), 0 10px 28px rgba(45,29,15,0.08), 0 28px 64px rgba(45,29,15,0.06)",
                    border: "1px solid rgba(247,230,194,0.9)",
                  };

              const textColor = isHighlight || isDark ? "rgba(255,255,255,0.85)" : "rgba(45,29,15,0.7)";
              const mutedColor = isHighlight || isDark ? "rgba(255,255,255,0.5)" : "rgba(45,29,15,0.4)";
              const headingColor = isHighlight || isDark ? "#F7E6C2" : "#2D1D0F";
              const rowBg0 = isHighlight ? "rgba(255,255,255,0.18)" : isDark ? "rgba(247,230,194,0.1)" : "rgba(247,230,194,0.55)";
              const rowBgOther = isHighlight ? "rgba(255,255,255,0.08)" : isDark ? "rgba(247,230,194,0.05)" : "rgba(247,230,194,0.25)";
              const checkBg = isHighlight || isDark ? "rgba(255,255,255,0.2)" : "#3374B5";
              const ctaBg = isHighlight ? "white" : isDark ? "#3374B5" : "#3374B5";
              const ctaColor = isHighlight ? "#3374B5" : "white";
              const ctaShadow = isHighlight
                ? "0 4px 16px rgba(255,255,255,0.15)"
                : "0 4px 16px rgba(51,116,181,0.35)";

              return (
                <div
                  key={plan.name}
                  className={`rounded-3xl p-8 flex flex-col hover-tilt ${isHighlight ? "md:-mt-6 md:mb-6" : ""}`}
                  style={bgStyle}
                >
                  {isHighlight && (
                    <span
                      className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 self-start"
                      style={{ background: "rgba(255,255,255,0.22)", color: "white" }}
                    >
                      Most Popular
                    </span>
                  )}

                  {/* Plan icon */}
                  <div className="mb-4">
                    {idx === 0 && <EnvelopeIcon className="w-10 h-8" />}
                    {idx === 1 && <MailboxIcon className="w-10 h-12" />}
                    {idx === 2 && <HeartBubbleIcon className="w-10 h-10" />}
                  </div>

                  <h3 className="font-black text-xl uppercase mb-1" style={{ color: headingColor }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs mb-6" style={{ color: mutedColor }}>
                    {plan.tagline}
                  </p>

                  {/* Pricing rows */}
                  <div className="space-y-2 mb-7">
                    {plan.prices.map((p, i) => (
                      <div
                        key={p.term}
                        className="flex items-center justify-between py-2.5 px-4 rounded-xl text-sm"
                        style={{ background: i === 0 ? rowBg0 : rowBgOther }}
                      >
                        <span style={{ color: mutedColor }}>{p.term}</span>
                        <span className="font-black text-base" style={{ color: headingColor }}>
                          {p.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 text-sm flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 text-white"
                          style={{ background: checkBg }}
                        >
                          ✓
                        </span>
                        <span style={{ color: textColor }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className="block text-center font-black py-3.5 rounded-2xl text-sm transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
                    style={{ background: ctaBg, color: ctaColor, boxShadow: ctaShadow }}
                  >
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center mt-10 text-sm" style={{ color: "rgba(45,29,15,0.45)" }}>
            Compare all tiers in detail —{" "}
            <Link href="/pricing" className="text-[#3374B5] font-bold hover:underline">
              Full pricing page →
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Perks ─── */}
      <section className="py-20 px-4" style={{ background: "linear-gradient(180deg, #FFFDF8 0%, #f5ede0 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HeartBubbleIcon className="w-8 h-8" />
            <h2 className="text-2xl md:text-3xl font-black uppercase text-[#2D1D0F]">
              What You Get
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 perspective-container">
            {perks.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white hover-tilt"
                style={{
                  boxShadow: "0 2px 4px rgba(45,29,15,0.04), 0 6px 18px rgba(45,29,15,0.07)",
                  border: "1px solid rgba(247,230,194,0.7)",
                }}
              >
                <span className="shrink-0 mt-0.5">{p.icon}</span>
                <div>
                  <p className="font-black text-xs text-[#2D1D0F] uppercase tracking-wide leading-tight">
                    {p.title}
                  </p>
                  <p className="text-xs text-[#2D1D0F]/45 mt-1 leading-relaxed">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12">
            <StarIcon className="w-6 h-6" />
            <h2 className="text-2xl md:text-3xl font-black uppercase text-[#2D1D0F]">
              What Our Customers Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Jessica M.", detail: "Business Box Member", quote: "Finally a mailbox service that actually feels modern. The scanning is fast and the team is incredibly friendly." },
              { name: "David K.", detail: "Premium Box Member", quote: "I use NOHO Mailbox for my law practice. The real street address and same-day notary have been game changers." },
              { name: "Sarah L.", detail: "Basic Box Member", quote: "So easy to sign up and the package notifications are a lifesaver. Worth every penny." },
            ].map((t, i) => (
              <div
                key={t.name}
                className={`bg-white rounded-2xl p-6 hover-tilt animate-fade-up ${i === 1 ? "delay-200" : i === 2 ? "delay-400" : ""}`}
                style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <StarIcon key={j} className="w-4 h-4" />
                  ))}
                </div>
                <p className="text-sm text-[#2D1D0F]/70 italic leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="border-t border-[#F7E6C2] pt-4">
                  <p className="font-bold text-sm text-[#2D1D0F]">{t.name}</p>
                  <p className="text-xs text-[#2D1D0F]/40">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Business Solutions CTA ─── */}
      <section
        className="py-24 px-4 relative overflow-hidden text-center"
        style={{
          background:
            "radial-gradient(ellipse at 80% 80%, rgba(51,116,181,0.22) 0%, transparent 55%), linear-gradient(155deg, #2D1D0F 0%, #1a1108 60%, #0d1e35 100%)",
        }}
      >
        {/* Floating decorative icons */}
        <div className="absolute top-16 right-16 opacity-10 animate-float hidden lg:block">
          <MailboxIcon className="w-20 h-24" />
        </div>
        <div className="absolute bottom-20 left-20 opacity-10 animate-float delay-300 hidden lg:block">
          <HeartBubbleIcon className="w-16 h-16" />
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          <MailboxIcon className="w-16 h-20 mx-auto mb-6 opacity-60" />
          <p className="text-[#3374B5] font-bold text-xs uppercase tracking-[0.2em] mb-4">
            Business Solutions
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase text-[#F7E6C2] mb-5 leading-tight">
            Launch Your Business<br />Under One Roof
          </h2>
          <p className="text-[#F7E6C2]/50 mb-3 max-w-lg mx-auto leading-relaxed text-base">
            LLC formation, EIN, branding, website, SEO, social media, Google Business
            — plus 12 months of mail service.
          </p>
          <p className="text-5xl font-black text-[#3374B5] mb-9">$2,000</p>
          <Link
            href="/business-solutions"
            className="inline-block font-black px-10 py-4 rounded-full text-base text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-shimmer"
            style={{
              background: "linear-gradient(135deg, #3374B5 0%, #2055A0 50%, #3374B5 100%)",
              backgroundSize: "200% 100%",
              boxShadow: "0 4px 24px rgba(51,116,181,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
            }}
          >
            See What&apos;s Included
          </Link>
        </div>
      </section>
    </>
  );
}
