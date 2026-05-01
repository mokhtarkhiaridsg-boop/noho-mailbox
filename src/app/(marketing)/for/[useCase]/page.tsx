import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUseCase,
  getAllUseCaseSlugs,
} from "@/lib/use-case-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllUseCaseSlugs().map((useCase) => ({ useCase }));
}

type Params = { params: Promise<{ useCase: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { useCase } = await params;
  const meta = getUseCase(useCase);
  if (!meta) return { title: "Not found" };

  return {
    title: `Real Address for ${meta.persona} — NOHO Mailbox LA`,
    description: `${meta.hero.sub.replace(/&apos;/g, "'").slice(0, 155)}`,
    openGraph: {
      title: `Real Address for ${meta.persona}`,
      description: meta.hero.headline.replace(/&apos;/g, "'"),
      url: `https://nohomailbox.org/for/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/for/${meta.slug}`,
    },
  };
}

export default async function UseCasePage({ params }: Params) {
  const { useCase } = await params;
  const meta = getUseCase(useCase);
  if (!meta) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a.replace(/&apos;/g, "'"),
      },
    })),
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5 animate-fade-up"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            {meta.hero.eyebrow.toUpperCase()}
          </span>
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in"
            dangerouslySetInnerHTML={{ __html: meta.hero.headline }}
          />
          <p
            className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200"
            dangerouslySetInnerHTML={{ __html: meta.hero.sub }}
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href={meta.primaryCta.href}
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              {meta.primaryCta.label}
            </Link>
            <Link
              href={meta.secondaryCta.href}
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {meta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Real LA address · USPS-CMRA · Notarized 1583 included · Mon-Sat walk-in
      </div>

      {/* Problem */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light mb-4 animate-fade-up">
            {meta.problem.title}
          </h2>
          <p
            className="text-text-light-muted text-lg leading-relaxed animate-fade-up delay-200"
            dangerouslySetInnerHTML={{ __html: meta.problem.body }}
          />
        </div>
      </section>

      {/* Why our address */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Why our address fits {meta.persona}
          </h2>
          <ul className="space-y-3">
            {meta.whyOurAddress.map((b, i) => (
              <li
                key={i}
                className="flex gap-3 items-start rounded-xl p-4 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                  style={{ background: "#15803d" }}
                >
                  ✓
                </span>
                <span
                  className="text-text-light text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: b }}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bundle angle */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-8 animate-fade-up"
            style={{
              background: "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
              boxShadow: "0 12px 40px #B0703044",
              color: "#fff",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#FFE4A0" }}
            >
              $2,000 BUSINESS LAUNCH BUNDLE
            </p>
            <h3
              className="font-extrabold tracking-tight text-2xl mb-3"
              style={{ color: "#FFE4A0" }}
            >
              Want the whole launch handled?
            </h3>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: "rgba(255,255,255,0.85)" }}
              dangerouslySetInnerHTML={{ __html: meta.bundleAngle }}
            />
            <Link
              href="/business-solutions"
              className="inline-block font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "#FFE4A0",
                color: "#2D100F",
              }}
            >
              See the bundle →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Frequently asked
          </h2>
          <div className="space-y-3">
            {meta.faq.map((f, i) => (
              <details
                key={i}
                className="rounded-xl p-5 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <summary className="font-bold text-text-light cursor-pointer">
                  {f.q}
                </summary>
                <p
                  className="text-sm text-text-light-muted leading-relaxed mt-3"
                  dangerouslySetInnerHTML={{ __html: f.a }}
                />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-bg-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-dark mb-3 animate-fade-up">
            Ready when you are
          </h2>
          <p
            className="text-text-dark-muted mb-8 animate-fade-up delay-200"
          >
            Walk in: 5062 Lankershim Blvd, North Hollywood CA 91601 · Mon-Sat ·
            Or call (818) 506-7744.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up delay-400">
            <Link
              href={meta.primaryCta.href}
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              {meta.primaryCta.label}
            </Link>
            <Link
              href={meta.secondaryCta.href}
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {meta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
