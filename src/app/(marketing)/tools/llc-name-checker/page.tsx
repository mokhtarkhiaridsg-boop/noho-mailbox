import type { Metadata } from "next";
import LLCNameCheckerClient from "./LLCNameCheckerClient";

export const metadata: Metadata = {
  title: "Free California LLC Name Checker — Is Your LLC Name Valid?",
  description:
    "Free instant California LLC name checker. Check if your name meets state requirements (LLC suffix, distinguishability, restricted words) before you file. No login, no email.",
  openGraph: {
    title: "California LLC Name Checker — Free",
    description:
      "Instantly check your proposed California LLC name against state filing requirements. Free, no email required.",
    url: "https://nohomailbox.org/tools/llc-name-checker",
  },
  alternates: {
    canonical: "https://nohomailbox.org/tools/llc-name-checker",
  },
};

export default function LLCNameCheckerPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
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
            FREE TOOL · NO LOGIN
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            California LLC Name Checker
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            Type your proposed LLC name. We check it against the basic California state filing
            rules so you don&apos;t pay $70 to find out it&apos;s rejected.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Heuristic check only · For exact match search visit the{" "}
        <a
          href="https://bizfileonline.sos.ca.gov/search/business"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          California SOS Business Search
        </a>
      </div>

      {/* Tool */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <LLCNameCheckerClient />
        </div>
      </section>

      {/* Educational content */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            What California requires
          </h2>
          <ul className="space-y-3 mb-8">
            {[
              {
                title: "Must end with LLC, L.L.C., or Limited Liability Company",
                body: "California Corporations Code §17701.08(a). Your name must contain one of these designators.",
              },
              {
                title: "Must be distinguishable from existing California LLCs",
                body: "Cannot be the same or substantially similar to a name already on file. The state SOS does the final check; we estimate similarity.",
              },
              {
                title: "Cannot include certain restricted words",
                body: "Bank, trust, trustee, insurance, insurer, mortgage, real estate broker — these typically require additional licensing or are reserved.",
              },
              {
                title: "Cannot contain offensive language",
                body: "Profanity, slurs, or words designed to mislead about the company&apos;s purpose are rejected.",
              },
              {
                title: "Cannot imply government affiliation",
                body: "&quot;FBI&quot;, &quot;Federal&quot;, &quot;State Department&quot;, &quot;Treasury&quot; — anything that implies a government agency.",
              },
            ].map((r) => (
              <li
                key={r.title}
                className="rounded-xl p-4"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-bold text-text-light text-sm mb-1">{r.title}</h3>
                <p
                  className="text-xs text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.body }}
                />
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-light-muted leading-relaxed">
            <strong>Important:</strong> our checker is a heuristic. The California Secretary of
            State runs the final check during your $70 filing. For an exact-match search of
            existing LLCs, use{" "}
            <a
              href="https://bizfileonline.sos.ca.gov/search/business"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "#337485" }}
            >
              bizfileonline.sos.ca.gov
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
