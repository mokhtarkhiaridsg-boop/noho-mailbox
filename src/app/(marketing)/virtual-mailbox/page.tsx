import Link from "next/link";
import type { Metadata } from "next";
import { getVirtualMailbox } from "@/app/actions/virtual-mailbox";
import {
  annualSavings,
  type VirtualMailboxPlan,
} from "@/lib/virtual-mailbox-config";
import VirtualMailboxPlansInteractive from "./VirtualMailboxPlansInteractive";

export const metadata: Metadata = {
  title: "Virtual Mailbox — NOHO Mailbox",
  description:
    "Get a real Lankershim Blvd street address, an online dashboard, and unlimited mail forwarding — without ever leaving home. From $9.99/mo.",
};

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

export default async function VirtualMailboxPage() {
  const cfg = await getVirtualMailbox();

  if (!cfg.enabled) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: BG_LIGHT, color: INK }}
      >
        <div className="max-w-md text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BLUE }}>
            Coming soon
          </p>
          <h1 className="mt-2 text-3xl font-black" style={{ fontFamily: "var(--font-baloo), sans-serif" }}>
            Virtual mailbox launching shortly
          </h1>
          <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
            We&apos;re finalising the digital-only tier. In the meantime, our
            in-store mailbox plans give you the same Lankershim Blvd address
            today.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center mt-5 rounded-2xl px-5 h-11 text-[13px] font-black uppercase tracking-[0.06em]"
            style={{
              background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
              color: CREAM,
              boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
            }}
          >
            See in-store plans
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: BG_LIGHT, color: INK }}>
      {/* Hero */}
      <section
        className="px-6 pt-16 pb-12 sm:pt-20 sm:pb-16"
        style={{
          background: `radial-gradient(ellipse at top, ${CREAM_DEEP} 0%, ${BG_LIGHT} 60%, #FFF9F3 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: BLUE }}
          >
            Virtual Mailbox
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-[-0.01em]"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            {cfg.headline}
          </h1>
          <p
            className="mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: INK_SOFT }}
          >
            {cfg.subhead}
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <a
              href="#plans"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                color: CREAM,
                boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
              }}
            >
              See plans
            </a>
            <Link
              href="/signup?plan=virtual"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em]"
              style={{
                background: CREAM,
                color: INK,
                border: `1px solid ${BORDER}`,
              }}
            >
              Get started
            </Link>
          </div>

          {/* Address chip */}
          <div
            className="mt-9 mx-auto inline-flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: "white", border: `1px solid ${BORDER}` }}
          >
            <span
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
              style={{ background: CREAM, color: INK }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22 C12 22 4 14 4 9 a8 8 0 0 1 16 0 c0 5 -8 13 -8 13 z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span>
            <div className="text-left">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: BLUE }}
              >
                {cfg.digitalAddressLabel || "Your address"}
              </p>
              <p className="text-[14px] font-bold" style={{ color: INK }}>
                {cfg.digitalAddressLine}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {cfg.benefits.length > 0 && (
        <section className="px-6 py-14 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {cfg.benefits.map((b, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-5 sm:p-6"
                  style={{
                    background: "white",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "var(--shadow-cream-sm)",
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                    style={{ background: CREAM, color: INK }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12 L10 17 L19 7" />
                    </svg>
                  </span>
                  <h3 className="text-[14px] font-black mb-1.5" style={{ color: INK }}>
                    {b.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Plans (interactive — monthly/annual toggle) */}
      <section id="plans" className="px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: BLUE }}
            >
              Plans
            </p>
            <h2
              className="mt-2 text-3xl sm:text-4xl font-black"
              style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
            >
              Pick a tier — change anytime
            </h2>
            <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
              Cancel or downgrade with one click. Unused months pro-rate to your wallet.
            </p>
          </div>
          <VirtualMailboxPlansInteractive plans={cfg.plans} />
        </div>
      </section>

      {/* FAQ */}
      {cfg.faqs.length > 0 && (
        <section
          className="px-6 py-14 sm:py-16"
          style={{
            background: `linear-gradient(180deg, ${CREAM_DEEP} 0%, ${BG_LIGHT} 100%)`,
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-[11px] font-black uppercase tracking-[0.18em]"
                style={{ color: BLUE }}
              >
                Questions
              </p>
              <h2
                className="mt-2 text-3xl sm:text-4xl font-black"
                style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
              >
                Frequently asked
              </h2>
            </div>
            <div className="space-y-3">
              {cfg.faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl px-5 py-4"
                  style={{
                    background: "white",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "var(--shadow-cream-sm)",
                  }}
                >
                  <summary
                    className="cursor-pointer flex items-center justify-between gap-3 list-none"
                    style={{ color: INK }}
                  >
                    <span className="text-[14px] font-black">{f.question}</span>
                    <svg
                      className="w-4 h-4 transition-transform group-open:rotate-180 shrink-0"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6 L8 11 L13 6" />
                    </svg>
                  </summary>
                  <p
                    className="mt-3 text-[13px] leading-relaxed"
                    style={{ color: INK_SOFT }}
                  >
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Ready when you are.
          </h2>
          <p className="mt-3 text-base" style={{ color: INK_SOFT }}>
            Sign up online in 5 minutes. We&apos;ll guide you through Form 1583 and you&apos;ll be receiving mail by tomorrow.
          </p>
          <Link
            href="/signup?plan=virtual"
            className="mt-7 inline-flex items-center rounded-2xl px-7 h-13 text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
            style={{
              padding: "0 28px",
              height: 52,
              background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
              color: CREAM,
              boxShadow: "0 8px 24px rgba(45,16,15,0.32)",
            }}
          >
            Get my virtual mailbox →
          </Link>
          <p className="mt-4 text-[11px]" style={{ color: INK_FAINT }}>
            No credit-card required to browse. Cancel anytime.
          </p>
        </div>
      </section>
    </main>
  );
}

// Re-export so the interactive component can pull plan + savings helpers
// without re-importing from the lib (keeps page deps tight).
export type { VirtualMailboxPlan };
export { annualSavings };
