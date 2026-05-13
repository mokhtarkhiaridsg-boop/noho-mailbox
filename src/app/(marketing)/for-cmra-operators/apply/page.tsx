import type { Metadata } from "next";
import TenantApplicationForm from "./TenantApplicationForm";

export const metadata: Metadata = {
  title: "Apply for the NOHO Mailbox CMRA Platform — 30-Day Trial",
  description:
    "Apply to license the NOHO Mailbox platform for your CMRA. 30-day trial. Sandbox tenant provisioned within 48 hours, with full onboarding support.",
  openGraph: {
    title: "Apply — NOHO Mailbox CMRA Platform",
    description: "30-day trial. Sandbox tenant provisioned in 48 hours.",
    url: "https://nohomailbox.org/for-cmra-operators/apply",
  },
  alternates: {
    canonical: "https://nohomailbox.org/for-cmra-operators/apply",
  },
};

export default function ApplyPage() {
  return (
    <div className="perspective-container">
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(51,116,133,0.10)",
              color: "#337485",
              border: "1px solid rgba(51,116,133,0.28)",
            }}
          >
            APPLICATION · 30-DAY TRIAL
          </span>
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
            }}
          >
            Apply to license the platform
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            We&apos;ll provision your sandbox tenant within 48 hours. 30-day
            trial. Cancel anytime, no commitment.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Sandbox provisioned in 48 hours · 30-day trial · Cancel anytime
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <TenantApplicationForm />
        </div>
      </section>

      <section className="py-12 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-extrabold tracking-tight text-text-light mb-3">
            What happens after you apply
          </h2>
          <ol className="space-y-2 text-sm text-text-light-muted list-decimal list-inside">
            <li>We email you within 1 business day with a calendar link for a 30-min demo + onboarding intake.</li>
            <li>On the call: we walk through the platform live, identify your migration needs, and quote your monthly tier.</li>
            <li>Within 48 hours of demo: your sandbox tenant is provisioned at <code className="text-xs bg-white/50 px-1 rounded">[your-slug].nohomailbox.org</code> with branded customer dashboard.</li>
            <li>30-day trial. Migrate your customers (we help). At day 30 you accept terms and start the subscription, or walk away.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
