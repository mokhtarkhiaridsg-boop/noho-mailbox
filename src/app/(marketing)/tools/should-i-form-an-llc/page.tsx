import type { Metadata } from "next";
import LLCQuizClient from "./LLCQuizClient";

export const metadata: Metadata = {
  title: "Should I Form an LLC? — Free Decision Quiz | NOHO Mailbox",
  description:
    "Free 9-question quiz answers whether you actually need an LLC. Honest framework: revenue thresholds, liability risk, asset protection. No email required.",
  openGraph: {
    title: "Should I Form an LLC? Free Decision Quiz",
    description:
      "9 questions, honest answer. Most freelancers don&apos;t need an LLC — find out if you do.",
    url: "https://nohomailbox.org/tools/should-i-form-an-llc",
  },
  alternates: { canonical: "https://nohomailbox.org/tools/should-i-form-an-llc" },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Should I Form an LLC? Decision Quiz",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Interactive 9-question quiz that returns an honest recommendation on whether you should form an LLC based on revenue, liability, asset risk, and business model.",
};

export default function ShouldIFormAnLLCPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
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
            FREE QUIZ · 90 SECONDS · NO EMAIL
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            Do you actually need an LLC?
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            9 questions. Honest answer at the end. We&apos;ll tell you{" "}
            <strong>"don&apos;t form an LLC"</strong> if that&apos;s the right call —
            about 1 in 5 quiz takers gets that answer.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Honest framework · No upsell ambush at the end · Built by people who run real LLCs
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <LLCQuizClient />
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            How we score
          </h2>
          <p className="text-text-light-muted text-base leading-relaxed mb-4">
            We assign points for each answer, then compare your total to three
            thresholds:
          </p>
          <ul className="space-y-3">
            {[
              {
                t: "0-5 points: Don&apos;t form an LLC yet",
                b: "Stay sole-prop. The $800/year California franchise tax (or your state equivalent) costs more than the protection saves you at this stage.",
              },
              {
                t: "6-12 points: Form one when revenue clears $30k",
                b: "You&apos;re close to the threshold where LLC math works. Form when revenue is consistent — not at the first paid invoice.",
              },
              {
                t: "13+ points: Form now",
                b: "Multiple risk factors stack. The annual franchise tax is well-spent insurance. We can do the whole bundle for $2,000 or you can DIY for ~$890.",
              },
            ].map((r) => (
              <li
                key={r.t}
                className="rounded-xl p-4"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3
                  className="font-bold text-text-light text-sm mb-1"
                  dangerouslySetInnerHTML={{ __html: r.t }}
                />
                <p
                  className="text-xs text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.b }}
                />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-text-light-muted/70">
            <strong>Disclaimer:</strong> This quiz is informational, not legal
            or tax advice. Verify your specific situation with a CPA or
            attorney. The framework is conservative — when in doubt, we err
            toward "wait until you really need it."
          </p>
        </div>
      </section>
    </div>
  );
}
