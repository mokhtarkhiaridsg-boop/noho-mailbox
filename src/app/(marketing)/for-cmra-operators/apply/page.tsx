import type { Metadata } from "next";
import TenantApplicationForm from "./TenantApplicationForm";

export const metadata: Metadata = {
  title: "Apply for the NOHO Mailbox CMRA Platform — 30-Day Trial",
  description:
    "Apply to license the NOHO Mailbox platform for your CMRA. 30-day trial included. We&apos;ll provision a sandbox tenant within 48 hours and walk you through onboarding.",
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
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
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
            APPLICATION · 30-DAY TRIAL
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-5">
            Apply to license the platform
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
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
