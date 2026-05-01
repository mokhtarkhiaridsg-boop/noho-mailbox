import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { HomepageClient } from "./homepage-client";
import { OpenClosedSign } from "@/components/OpenClosedSign";
import { StatsCounter } from "@/components/StatsCounter";
import { HeroMailbox } from "@/components/HeroMailbox";
import { AiShield, AiBolt, AiTruck, AiClock, AiPin, AiEnvelope, AiHeart } from "@/components/AnimatedIcons";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
  description:
    "Real street address, mail scanning, same-day delivery, notary & business formation. Plans from $50 · North Hollywood, CA.",
  openGraph: {
    title: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
    description:
      "Real street address, mail scanning, forwarding, notary & business formation in North Hollywood.",
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
  telephone: "+1-818-506-7744",
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
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:30",
      closes: "13:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "14:00",
      closes: "17:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "13:30",
    },
  ],
  description:
    "Private mailbox rental, mail scanning, package handling, same-day delivery, notary, and business formation in North Hollywood, CA.",
};

// ──────────────────────────────────────────────────────────────────────────
// Subject-relevant SVG icons (no emojis)
// ──────────────────────────────────────────────────────────────────────────

function PinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
function PhoneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z" />
    </svg>
  );
}
function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}
function StampIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TruckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinejoin="round" d="M3 7h11v9H3zM14 11h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  );
}
function BoltIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}
function StarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.5 5.79 21l2.39-7.15L2 9.36h7.61z" />
    </svg>
  );
}

// Animated envelope that gently rocks; on group-hover the flap opens
// and a corner of a letter slides out. Pure CSS, no JS.
function AnimatedEnvelope() {
  return (
    <div className="group relative w-[88px] h-[68px] cursor-default" aria-hidden="true">
      {/* Letter peeks up on group-hover */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[58px] h-[42px] rounded-[3px] transition-all duration-500 ease-out group-hover:-translate-y-5"
        style={{
          background: "white",
          boxShadow: "0 1px 0 rgba(45,16,15,0.15)",
          border: "1.5px solid #2D100F",
        }}
      >
        <div
          className="absolute top-2 left-2 right-2 h-[2px] rounded"
          style={{ background: "#337485", opacity: 0.55 }}
        />
        <div
          className="absolute top-5 left-2 right-3 h-[2px] rounded"
          style={{ background: "rgba(45,16,15,0.2)" }}
        />
        <div
          className="absolute top-8 left-2 right-6 h-[2px] rounded"
          style={{ background: "rgba(45,16,15,0.2)" }}
        />
      </div>

      {/* Envelope body */}
      <svg
        viewBox="0 0 88 68"
        className="absolute inset-0 w-full h-full"
        fill="none"
      >
        <rect
          x="2"
          y="14"
          width="84"
          height="52"
          rx="4"
          fill="#F7E6C2"
          stroke="#2D100F"
          strokeWidth="3"
        />
        {/* Bottom flap edges */}
        <path
          d="M2 64 L44 38 L86 64"
          stroke="#2D100F"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
          opacity="0.4"
        />
      </svg>

      {/* Top flap — rotates open on group-hover */}
      <svg
        viewBox="0 0 88 68"
        className="absolute inset-0 w-full h-full origin-top transition-transform duration-500 ease-out group-hover:[transform:rotateX(180deg)]"
        style={{ transformOrigin: "44px 14px" }}
        fill="none"
      >
        <path
          d="M2 14 L44 44 L86 14 Z"
          fill="#F7E6C2"
          stroke="#2D100F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wax seal */}
      <div
        className="absolute right-2 top-2 w-3.5 h-3.5 rounded-full transition-transform duration-300 group-hover:scale-125"
        style={{ background: "#337485", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
      />
    </div>
  );
}

// "POSTED" rubber-stamp impression that fades in + rotates slightly on hover
function PostedStamp({ light }: { light?: boolean }) {
  const c = light ? "#F7E6C2" : "#337485";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-2 top-4 opacity-0 -rotate-[8deg] scale-95 transition-all duration-500 group-hover:opacity-90 group-hover:rotate-[-15deg] group-hover:scale-100"
    >
      <div
        className="px-3 py-1 rounded-md text-[10px] font-black tracking-[0.3em]"
        style={{
          color: c,
          border: `2px solid ${c}`,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        POSTED
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Brand-consistent visual primitives
// ──────────────────────────────────────────────────────────────────────────

function WaveDivider({
  top,
  bottom,
  flip = false,
}: {
  top: string;
  bottom: string;
  flip?: boolean;
}) {
  return (
    <div style={{ background: top, lineHeight: 0 }}>
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: "64px",
          transform: flip ? "scaleY(-1)" : "none",
        }}
        aria-hidden="true"
      >
        <path
          d="M0,32 C240,64 480,0 720,32 C960,64 1200,0 1440,32 L1440,64 L0,64 Z"
          fill={bottom}
        />
      </svg>
    </div>
  );
}

// Postage stamp card with perforated edges. The bg = popular ? brown : white.
function StampCard({
  children,
  popular,
}: {
  children: React.ReactNode;
  popular?: boolean;
}) {
  const bg = popular ? "#2D100F" : "white";
  const punch = "#F7E6C2"; // cream punch-out matches the section bg
  return (
    <div
      className="stamp-card group relative transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg]"
      style={{ filter: "drop-shadow(0 8px 24px rgba(45,16,15,0.15))" }}
    >
      <PostedStamp light={popular} />
      {/* Perforated edge — top */}
      <svg
        viewBox="0 0 320 10"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "10px" }}
        aria-hidden="true"
      >
        <rect width="320" height="10" fill={bg} />
        {Array.from({ length: 20 }, (_, i) => (
          <circle key={i} cx={8 + i * 15.8} cy={5} r={5} fill={punch} />
        ))}
      </svg>
      {/* Body with side perfs */}
      <div
        style={{
          background: bg,
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute left-[-28px] top-0 bottom-0 flex flex-col justify-around"
            style={{ width: 14 }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: punch, marginLeft: -6 }}
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="absolute right-[-28px] top-0 bottom-0 flex flex-col justify-around"
            style={{ width: 14 }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: punch, marginRight: -6 }}
              />
            ))}
          </div>
          <div className="py-7">{children}</div>
        </div>
      </div>
      {/* Perforated edge — bottom */}
      <svg
        viewBox="0 0 320 10"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "10px" }}
        aria-hidden="true"
      >
        <rect width="320" height="10" fill={bg} />
        {Array.from({ length: 20 }, (_, i) => (
          <circle key={i} cx={8 + i * 15.8} cy={5} r={5} fill={punch} />
        ))}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Data
// ──────────────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Basic",
    price: "$50",
    term: "/ 3 mo",
    tagline: "Solo & remote workers",
    features: [
      "Real Lankershim Blvd address",
      "Mail scanning dashboard",
      "Package alerts (SMS + email)",
      "In-store pickup",
    ],
    popular: false,
  },
  {
    name: "Business",
    price: "$80",
    term: "/ 3 mo",
    tagline: "LLCs & small businesses",
    features: [
      "Everything in Basic",
      "Mail forwarding worldwide",
      "Priority handling",
      "Dedicated suite #",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: "$95",
    term: "/ 3 mo",
    tagline: "High-volume sellers",
    features: [
      "Everything in Business",
      "Same-day delivery credits",
      "Notary discount (15%)",
      "Concierge support line",
    ],
    popular: false,
  },
];

const stats = [
  { value: "4,500+", label: "Packages Handled", sub: "this year" },
  { value: "99.9%", label: "On-Time Intake", sub: "verified SLA" },
  { value: "< 2 hr", label: "Same-Day Window", sub: "in NoHo" },
  { value: "5.0 ★", label: "Google Rating", sub: "100% 5-star" },
];

// ──────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────

async function getShippedTodayCount(): Promise<number> {
  // Live count of NOHO labels shipped today (local time). Pulled into the
  // landing-page strip as a small social-proof signal: real shipments are
  // moving through the storefront. Best-effort — Prisma errors fall through
  // to 0 so the strip still renders.
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return await prisma.shippoLabel.count({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: "refunded" },
      },
    });
  } catch {
    return 0;
  }
}

export default async function Home() {
  const shippedTodayCount = await getShippedTodayCount();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      {/* Page-scoped keyframes for subject-relevant animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes envelope-rock {
              0%, 100% { transform: rotate(-2deg) translateY(0); }
              50% { transform: rotate(2deg) translateY(-4px); }
            }
            .envelope-rock { animation: envelope-rock 5s ease-in-out infinite; transform-origin: 50% 100%; }
            @media (prefers-reduced-motion: reduce) {
              .envelope-rock { animation: none; }
            }
            @keyframes flag-wave {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(8deg); }
            }
            .truck-drive { animation: truck-drive 8s linear infinite; }
            @keyframes truck-drive {
              0% { transform: translateX(-30%); }
              100% { transform: translateX(120%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .truck-drive { animation: none; transform: translateX(0); }
            }
          `,
        }}
      />

      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-5 pt-16 pb-12 sm:pt-20 sm:pb-0 min-h-[88vh] sm:min-h-[92vh]"
        style={{ background: "#F7E6C2" }}
      >
        {/* Dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(45,16,15,0.1) 1.5px, transparent 1.5px)",
            backgroundSize: "26px 26px",
          }}
        />
        {/* Decorative rings */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ border: "60px solid #337485", opacity: 0.06 }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ border: "40px solid #2D100F", opacity: 0.05 }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="animate-bounce-in mb-6">
            <Logo className="mx-auto w-[280px] sm:w-[340px] drop-shadow-lg" />
          </div>

          <div className="animate-fade-up delay-100 inline-flex items-center gap-2 mb-6">
            <span
              className="text-[10px] font-black uppercase tracking-[0.24em] px-4 py-2 rounded-full inline-flex items-center gap-1.5"
              style={{ background: "#2D100F", color: "#F7E6C2" }}
            >
              <PinIcon className="w-3 h-3" />
              5062 Lankershim · North Hollywood, CA
            </span>
          </div>

          <h1
            className="animate-fade-up delay-200 font-extrabold leading-[1.05] tracking-tight mb-5"
            style={{
              fontSize: "clamp(2.6rem, 6.5vw, 5rem)",
              color: "#2D100F",
              fontFamily: "var(--font-baloo), sans-serif",
            }}
          >
            Your Address.
            <br />
            <span style={{ color: "#337485" }}>Your Privacy.</span>
          </h1>

          <p
            className="animate-fade-up delay-300 leading-relaxed mb-8 max-w-md mx-auto"
            style={{ fontSize: "17px", color: "rgba(45,16,15,0.62)" }}
          >
            Private mailbox rental with mail scanning, same-day delivery,
            walk-in notary, and full business formation — all from one
            neighborhood shop.
          </p>

          {/* Primary CTAs */}
          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link
              href="/signup" data-ripple="true"
              className="font-black px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: "#2D100F",
                color: "#F7E6C2",
                boxShadow: "0 6px 28px rgba(45,16,15,0.28)",
              }}
            >
              Request a Mailbox →
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:bg-black/5 inline-flex items-center justify-center gap-2 cursor-pointer"
              style={{
                border: "2px solid rgba(45,16,15,0.18)",
                color: "#2D100F",
              }}
            >
              <PhoneIcon className="w-4 h-4" /> (818) 506-7744
            </a>
          </div>

          <p
            className="animate-fade-up delay-500 text-[12px] mb-5"
            style={{ color: "rgba(45,16,15,0.5)" }}
          >
            30-second form · No credit card · Suite # ready in 15 minutes
          </p>

          {/* Shipping + tracking quick-strip — secondary CTAs for visitors
              who came specifically to ship or check a package. Sits below the
              primary "Request a Mailbox" pair so it doesn't compete, but
              still above the fold for above-the-fold discovery. */}
          <div
            className="animate-fade-up delay-500 mx-auto mb-7 inline-flex items-center gap-2 px-2 py-1.5 rounded-full"
            style={{
              background: "#F7E6C2",
              border: "1px solid rgba(45,16,15,0.12)",
            }}
          >
            <span className="text-[10.5px] font-black uppercase tracking-wider px-2" style={{ color: "rgba(45,16,15,0.55)" }}>
              Shipping
            </span>
            <Link
              href="/shipping"
              className="text-[12px] font-black px-3 py-1.5 rounded-full text-white transition-all hover:scale-[1.03]"
              style={{ background: "#337485", boxShadow: "0 2px 8px rgba(51,116,133,0.30)" }}
            >
              Get a quote →
            </Link>
            <Link
              href="/track"
              className="text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors hover:bg-white/40"
              style={{ color: "#2D100F" }}
            >
              Track a shipment →
            </Link>
            {shippedTodayCount > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(22,163,74,0.12)",
                  color: "#15803d",
                  border: "1px solid rgba(22,163,74,0.30)",
                }}
                title={`${shippedTodayCount} package${shippedTodayCount === 1 ? "" : "s"} shipped from this storefront today`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#16a34a", boxShadow: "0 0 6px rgba(22,163,74,0.60)" }} />
                {shippedTodayCount} shipped today
              </span>
            )}
          </div>

          {/* Trust row */}
          <div
            className="animate-fade-up delay-500 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-[12px] font-semibold"
            style={{ color: "rgba(45,16,15,0.65)" }}
          >
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className="w-3.5 h-3.5 text-[#F5A623]" />
              ))}
              <span className="ml-1" style={{ color: "#2D100F" }}>
                5.0 on Google
              </span>
            </span>
            <span>·</span>
            <span>USPS-authorized CMRA</span>
            <span>·</span>
            <span>Locally owned</span>
          </div>

          {/* Floating animated envelope — interactive, opens on hover */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-24 right-[8%] envelope-rock"
          >
            <AnimatedEnvelope />
          </div>

          {/* Mini mailbox — flag flicks every ~7s, hover holds it up */}
          <div className="hidden lg:block absolute bottom-32 left-[6%]">
            <HeroMailbox />
          </div>
        </div>

        {/* Wave into stats */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ lineHeight: 0 }}
        >
          <svg
            viewBox="0 0 1440 56"
            preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: "56px" }}
            aria-hidden="true"
          >
            <path
              d="M0,28 C360,56 720,0 1080,28 C1260,42 1380,14 1440,28 L1440,56 L0,56 Z"
              fill="#2D100F"
            />
          </svg>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section
        className="py-16 px-5 relative overflow-hidden"
        style={{ background: "#2D100F" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(247,230,194,0.05) 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:gap-x-4 text-center">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="animate-fade-up relative"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {i > 0 && (
                  <div
                    aria-hidden="true"
                    className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-10 w-px"
                    style={{ background: "rgba(247,230,194,0.12)" }}
                  />
                )}
                <p
                  className="font-extrabold mb-1"
                  style={{
                    fontSize: "clamp(2rem,3.5vw,2.75rem)",
                    color: "#F7E6C2",
                    fontFamily: "var(--font-baloo), sans-serif",
                    lineHeight: 1,
                  }}
                >
                  <StatsCounter value={s.value} />
                </p>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em] mt-2"
                  style={{ color: "rgba(247,230,194,0.65)" }}
                >
                  {s.label}
                </p>
                <p
                  className="text-[10px] font-medium mt-0.5"
                  style={{ color: "rgba(247,230,194,0.3)" }}
                >
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider top="#2D100F" bottom="#F7E6C2" />

      {/* ─── PLANS (postage stamps) ─── */}
      <section
        id="plans"
        className="py-20 px-5 overflow-hidden"
        style={{ background: "#F7E6C2" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: "#337485",
              }}
            >
              Choose Your Plan
            </p>
            <h2
              className="animate-fade-up font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                color: "#2D100F",
              }}
            >
              Every Plan, Real Address
            </h2>
            <p
              className="animate-fade-up delay-100 mt-3 text-[15px]"
              style={{ color: "rgba(45,16,15,0.5)" }}
            >
              Not a P.O. Box — a real suite number you can use anywhere.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`animate-fade-up ${plan.popular ? "md:-mt-3" : ""}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <StampCard popular={plan.popular}>
                  {plan.popular && (
                    <div className="flex justify-center mb-4">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                        style={{ background: "#337485", color: "white" }}
                      >
                        ★ Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-2">
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
                      style={{
                        color: plan.popular
                          ? "rgba(247,230,194,0.55)"
                          : "rgba(45,16,15,0.45)",
                      }}
                    >
                      {plan.tagline}
                    </p>
                    <h3
                      className="font-black text-2xl mb-1"
                      style={{
                        color: plan.popular ? "#F7E6C2" : "#2D100F",
                        fontFamily: "var(--font-baloo), sans-serif",
                      }}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-end justify-center gap-1">
                      <span
                        className="font-extrabold"
                        style={{
                          fontSize: "2.75rem",
                          color: plan.popular ? "#F7E6C2" : "#2D100F",
                          fontFamily: "var(--font-baloo), sans-serif",
                        }}
                      >
                        {plan.price}
                      </span>
                      <span
                        className="text-sm mb-1.5"
                        style={{
                          color: plan.popular
                            ? "rgba(247,230,194,0.45)"
                            : "rgba(45,16,15,0.45)",
                        }}
                      >
                        {plan.term}
                      </span>
                    </div>
                    <p
                      className="text-[10px] mt-1 font-bold"
                      style={{
                        color: plan.popular
                          ? "rgba(247,230,194,0.55)"
                          : "rgba(45,16,15,0.5)",
                      }}
                    >
                      + $15 one-time key fee
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-sm mt-5 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: plan.popular ? "#337485" : "#F7E6C2",
                          }}
                        >
                          <svg
                            className="w-2 h-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={plan.popular ? "white" : "#2D100F"}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span
                          style={{
                            color: plan.popular
                              ? "rgba(247,230,194,0.78)"
                              : "rgba(45,16,15,0.78)",
                          }}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup" data-ripple="true"
                    className="block text-center font-black py-3.5 rounded-2xl text-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{
                      background: plan.popular ? "#337485" : "#2D100F",
                      color: plan.popular ? "white" : "#F7E6C2",
                      boxShadow: plan.popular
                        ? "0 6px 20px rgba(51,116,133,0.35)"
                        : "none",
                    }}
                  >
                    Choose {plan.name}
                  </Link>
                </StampCard>
              </div>
            ))}
          </div>

          <p
            className="text-center mt-10 text-sm"
            style={{ color: "rgba(45,16,15,0.4)" }}
          >
            6-month &amp; 14-month plans available —{" "}
            <Link
              href="/pricing"
              className="font-black hover:underline cursor-pointer"
              style={{ color: "#337485" }}
            >
              See all pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        className="py-20 px-5 relative overflow-hidden"
        style={{ background: "#F7E6C2" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: "#337485",
              }}
            >
              Simple &amp; Fast
            </p>
            <h2
              className="animate-fade-up font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                color: "#2D100F",
              }}
            >
              From Signup to Suite in 15 Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                step: "01",
                title: "Pick Your Plan",
                desc: "Choose Basic, Business, or Premium. 3, 6, or 14 month terms — no long contracts.",
                icon: (
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    className="w-16 h-16"
                    aria-hidden="true"
                  >
                    <rect x="10" y="14" width="44" height="36" rx="6" fill="white" stroke="#2D100F" strokeWidth="3" />
                    <rect x="18" y="24" width="18" height="3" rx="1.5" fill="#337485" />
                    <rect x="18" y="32" width="28" height="3" rx="1.5" fill="#2D100F" opacity="0.2" />
                    <rect x="18" y="38" width="22" height="3" rx="1.5" fill="#2D100F" opacity="0.2" />
                    <circle cx="48" cy="45" r="7" fill="#337485" />
                    <path d="M44 45 L47 48 L52 43" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Verify Your ID",
                desc: "Bring two government IDs. We notarize USPS Form 1583 in-store for free — required by USPS for every CMRA.",
                icon: (
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    className="w-16 h-16"
                    aria-hidden="true"
                  >
                    <rect x="8" y="16" width="48" height="32" rx="4" fill="white" stroke="#2D100F" strokeWidth="3" />
                    <circle cx="20" cy="30" r="5" fill="#337485" opacity="0.3" stroke="#337485" strokeWidth="2" />
                    <rect x="30" y="25" width="20" height="3" rx="1.5" fill="#2D100F" opacity="0.4" />
                    <rect x="30" y="32" width="16" height="3" rx="1.5" fill="#2D100F" opacity="0.2" />
                    <rect x="14" y="40" width="36" height="3" rx="1.5" fill="#2D100F" opacity="0.2" />
                    <path d="M48 8 L58 8 L58 18" stroke="#337485" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M44 12 L56 12" stroke="#337485" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Get Your Suite #",
                desc: "Walk out with a real Lankershim Blvd address. Mail scanning dashboard, SMS alerts, same-day delivery — live.",
                icon: (
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    className="w-16 h-16"
                    aria-hidden="true"
                  >
                    <rect x="10" y="18" width="44" height="36" rx="4" fill="#337485" stroke="#2D100F" strokeWidth="3" />
                    <rect x="16" y="26" width="32" height="14" rx="2" fill="#F7E6C2" />
                    <circle cx="24" cy="33" r="2" fill="#2D100F" />
                    <rect x="30" y="31" width="16" height="2" rx="1" fill="#2D100F" opacity="0.4" />
                    <rect x="30" y="35" width="12" height="2" rx="1" fill="#2D100F" opacity="0.4" />
                    <path d="M20 46 L20 50 M28 46 L28 50 M36 46 L36 50 M44 46 L44 50" stroke="#2D100F" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="52" cy="14" r="6" fill="#2D100F" />
                    <path d="M49 14 L51 16 L55 12" stroke="#F7E6C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className="step-card relative animate-fade-up text-center transition-transform duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-5 shadow-lg"
                  style={{
                    background: "white",
                    boxShadow: "0 12px 32px rgba(45,16,15,0.12)",
                  }}
                >
                  {s.icon}
                </div>
                <div
                  className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-[0.2em] mb-3"
                  style={{ background: "rgba(51,116,133,0.12)", color: "#337485" }}
                >
                  STEP {s.step}
                </div>
                <h3
                  className="font-black text-xl mb-2"
                  style={{
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed max-w-xs mx-auto"
                  style={{ color: "rgba(45,16,15,0.62)" }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 font-black px-7 py-3.5 rounded-2xl text-[14px] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              style={{
                background: "#337485",
                color: "white",
                boxShadow: "0 6px 24px rgba(51,116,133,0.32)",
              }}
            >
              See the Full Walkthrough →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section
        className="py-20 px-5 relative overflow-hidden"
        style={{ background: "#F7E6C2" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            {/* Family-owned heritage pill — Tunisian red, restrained Apple-minimal */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: "rgba(231,0,19,0.08)",
                color: "#C70011",
                border: "1px solid rgba(231,0,19,0.18)",
              }}
            >
              <AiHeart className="w-3.5 h-3.5" />
              Family-owned in NoHo
            </span>
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: "#337485",
              }}
            >
              Why NOHO Mailbox
            </p>
            <h2
              className="animate-fade-up font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                color: "#2D100F",
              }}
            >
              The neighborhood shop, with the dashboard.
            </h2>
            <p className="animate-fade-up delay-100 mt-3 text-[15px] max-w-2xl mx-auto" style={{ color: "rgba(45,16,15,0.62)" }}>
              UPS Store-grade reliability, iPostal1-grade software, walk-in-friendly people. Plus everything below — written down so you can hold us to it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                Icon: AiShield,
                title: "USPS-authorized CMRA",
                body: "Federally registered to receive mail on your behalf. Form 1583 notarized in-store at no charge.",
              },
              {
                Icon: AiBolt,
                title: "15-minute setup, suite live same day",
                body: "Walk in with two IDs, walk out with a real Lankershim Blvd suite number you can use anywhere.",
              },
              {
                Icon: AiTruck,
                title: "$5 same-day delivery in NoHo",
                body: "Courier-dropped to your door. Flat $5 in NoHo, $10–$24 elsewhere in LA. Tracked the whole way.",
              },
              {
                Icon: AiEnvelope,
                title: "Walk-in notary",
                body: "California-commissioned notary on staff. No appointment needed during business hours.",
              },
              {
                Icon: AiPin,
                title: "Real Lankershim Blvd address — not a P.O. Box",
                body: "Use it on your driver's license, LLC filings, Amazon seller account, and bank statements.",
              },
              {
                Icon: AiClock,
                title: "We answer the phone",
                body: "Mon–Fri 9:30am–5:30pm (lunch 1:30–2pm) · Sat 10am–1:30pm. Call (818) 506-7744 — a person picks up, not a robot.",
              },
            ].map((b, i) => (
              <div
                key={b.title}
                className="animate-fade-up group relative p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  background: "white",
                  boxShadow: "0 8px 28px rgba(45,16,15,0.08)",
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(51,116,133,0.08)" }}
                  >
                    <b.Icon className="w-9 h-9" />
                  </div>
                  <div>
                    <h3
                      className="font-extrabold text-[17px] mb-1"
                      style={{
                        color: "#2D100F",
                        fontFamily: "var(--font-baloo), sans-serif",
                      }}
                    >
                      {b.title}
                    </h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: "rgba(45,16,15,0.65)" }}>
                      {b.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Service-pillars */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {[
              { Icon: ShieldIcon, label: "USPS-Authorized CMRA" },
              { Icon: StampIcon, label: "CA Notary Public" },
              { Icon: TruckIcon, label: "Same-Day Courier" },
              { Icon: BoltIcon, label: "Instant Activation" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(45,16,15,0.06)",
                  border: "1.5px solid rgba(45,16,15,0.1)",
                  color: "#337485",
                }}
              >
                <b.Icon className="w-4 h-4" />
                <span
                  className="text-[11px] font-black tracking-wider uppercase"
                  style={{ color: "rgba(45,16,15,0.7)" }}
                >
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VISIT US (walk-in conversion) ─── */}
      <section
        className="py-20 px-5 relative overflow-hidden"
        style={{ background: "#F7E6C2" }}
      >
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up">
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: "#337485",
              }}
            >
              Stop By
            </p>
            <h2
              className="font-extrabold tracking-tight mb-4"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
                color: "#2D100F",
              }}
            >
              Or just walk in.
            </h2>
            <p
              className="text-[15px] leading-relaxed mb-6"
              style={{ color: "rgba(45,16,15,0.65)" }}
            >
              Bring two government IDs. Pay at the counter. Walk out with a
              real suite number active that afternoon.
            </p>

            <ul className="space-y-2.5 mb-7">
              {[
                "5062 Lankershim Blvd, North Hollywood, CA 91601",
                "Mon–Fri 9:30am–5:30pm (break 1:30–2pm) · Sat 10–1:30",
                "(818) 506-7744",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-3 text-[14px]"
                  style={{ color: "#2D100F" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#337485" }}
                  />
                  {line}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://maps.google.com/?q=5062+Lankershim+Blvd+North+Hollywood+CA+91601"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-black px-6 py-3.5 rounded-2xl text-[14px] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                style={{
                  background: "#2D100F",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 22px rgba(45,16,15,0.28)",
                }}
              >
                Get Directions →
              </a>
              <a
                href="tel:+18185067744"
                className="inline-flex items-center justify-center gap-2 font-bold px-6 py-3.5 rounded-2xl text-[14px] transition-colors duration-200 hover:bg-black/5 cursor-pointer"
                style={{
                  border: "2px solid rgba(45,16,15,0.18)",
                  color: "#2D100F",
                }}
              >
                <PhoneIcon className="w-4 h-4" /> Call Before You Come
              </a>
            </div>
          </div>

          <div
            className="animate-fade-up delay-100 aspect-[4/3] rounded-3xl overflow-hidden"
            style={{
              background: "white",
              boxShadow: "0 18px 40px rgba(45,16,15,0.15)",
              border: "1.5px solid rgba(45,16,15,0.1)",
            }}
          >
            <iframe
              src="https://www.google.com/maps?q=5062+Lankershim+Blvd+North+Hollywood+CA+91601&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="NOHO Mailbox location map"
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </div>
      </section>

      <WaveDivider top="#F7E6C2" bottom="#2D100F" />

      {/* ─── BUSINESS CTA ─── */}
      <section
        className="py-20 px-5 relative overflow-hidden"
        style={{ background: "#2D100F" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(247,230,194,0.07) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ border: "40px solid #337485", opacity: 0.1 }}
        />

        <div className="max-w-xl mx-auto text-center relative z-10">
          <p
            className="mb-3 font-black"
            style={{
              fontFamily: "var(--font-pacifico), cursive",
              fontSize: "1.2rem",
              color: "#337485",
            }}
          >
            Business Solutions
          </p>
          <h2
            className="animate-fade-up font-extrabold tracking-tight leading-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "#F7E6C2",
            }}
          >
            Launch Your Business
            <br />
            Under One Roof
          </h2>
          <p
            className="animate-fade-up delay-100 text-[15px] leading-relaxed mb-4 max-w-md mx-auto"
            style={{ color: "rgba(247,230,194,0.55)" }}
          >
            LLC, EIN, branding, website, SEO, Google Business — plus 12 months
            of mail service.
          </p>
          <p
            className="animate-fade-up delay-200 font-extrabold mb-8"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(3rem, 6vw, 4rem)",
              color: "#337485",
            }}
          >
            $2,000
          </p>
          <Link
            href="/business-solutions"
            className="animate-fade-up delay-300 inline-block font-black px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            style={{
              background: "#F7E6C2",
              color: "#2D100F",
              boxShadow: "0 6px 24px rgba(247,230,194,0.18)",
            }}
          >
            See What&apos;s Included →
          </Link>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 px-5" style={{ background: "#F7E6C2" }}>
        <div
          className="max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center"
          style={{
            background: "white",
            boxShadow: "0 24px 60px rgba(45,16,15,0.15)",
            border: "1.5px solid rgba(45,16,15,0.08)",
          }}
        >
          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
              color: "#2D100F",
            }}
          >
            Ready for your suite #?
          </h2>
          <p
            className="text-[15px] leading-relaxed mb-7 max-w-md mx-auto"
            style={{ color: "rgba(45,16,15,0.65)" }}
          >
            30-second request form. We&apos;ll text you within 1 business day to
            schedule your visit — or finish online with a Square link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup" data-ripple="true"
              className="inline-flex items-center justify-center font-black px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              style={{
                background: "#2D100F",
                color: "#F7E6C2",
                boxShadow: "0 6px 28px rgba(45,16,15,0.28)",
              }}
            >
              Request a Mailbox →
            </Link>
            <a
              href="tel:+18185067744"
              className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-2xl text-[15px] transition-colors duration-200 hover:bg-black/5 cursor-pointer"
              style={{
                border: "2px solid rgba(45,16,15,0.18)",
                color: "#2D100F",
              }}
            >
              <PhoneIcon className="w-4 h-4" /> (818) 506-7744
            </a>
          </div>
        </div>
      </section>

      {/* ─── STICKY MOBILE CTA ─── */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2"
        style={{
          background:
            "linear-gradient(to top, #F7E6C2 0%, #F7E6C2 60%, transparent 100%)",
        }}
      >
        <div
          className="flex gap-2 rounded-2xl p-2"
          style={{
            background: "white",
            border: "1.5px solid rgba(45,16,15,0.1)",
            boxShadow: "0 18px 40px rgba(45,16,15,0.18)",
          }}
        >
          <Link
            href="/signup" data-ripple="true"
            className="flex-1 inline-flex items-center justify-center font-black rounded-xl text-[14px] active:scale-[0.98] cursor-pointer"
            style={{ background: "#2D100F", color: "#F7E6C2", height: 46 }}
          >
            Request a Mailbox
          </Link>
          <a
            href="tel:+18185067744"
            aria-label="Call NOHO Mailbox"
            className="grid place-items-center rounded-xl active:scale-[0.98] cursor-pointer"
            style={{
              border: "1.5px solid rgba(45,16,15,0.18)",
              color: "#2D100F",
              height: 46,
              width: 46,
            }}
          >
            <PhoneIcon className="w-5 h-5" />
          </a>
        </div>
      </div>

      <HomepageClient />
      <OpenClosedSign />
    </>
  );
}
