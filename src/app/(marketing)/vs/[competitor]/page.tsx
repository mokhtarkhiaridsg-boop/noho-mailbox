import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COMPETITOR_PAGES,
  getCompetitor,
  getAllCompetitorSlugs,
} from "@/lib/competitor-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllCompetitorSlugs().map((competitor) => ({ competitor }));
}

type Params = { params: Promise<{ competitor: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { competitor } = await params;
  const meta = getCompetitor(competitor);
  if (!meta) return { title: "Comparison not found" };

  return {
    title: `NOHO Mailbox vs ${meta.competitorName} — Honest Side-by-Side`,
    description: `${meta.competitorName} vs NOHO Mailbox. Real comparison: pricing, features, walk-in, same-day delivery, B2B SaaS. ${meta.ourAngle.slice(0, 100)}`,
    openGraph: {
      title: `NOHO Mailbox vs ${meta.competitorName}`,
      description: meta.ourAngle.slice(0, 160),
      url: `https://nohomailbox.org/vs/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/vs/${meta.slug}`,
    },
  };
}

export default async function CompetitorVsPage({ params }: Params) {
  const { competitor } = await params;
  const meta = getCompetitor(competitor);
  if (!meta) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `NOHO Mailbox vs ${meta.competitorName} — Honest Comparison`,
    description: meta.ourAngle,
    author: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
    datePublished: "2026-04-29",
    publisher: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            HONEST COMPARISON · UPDATED 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-5">
            NOHO Mailbox vs {meta.competitorName}
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg">
            {meta.ourAngle}
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        {meta.competitorName}: {meta.competitorTag}
      </div>

      {/* Comparison table */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            Side-by-side
          </h2>
          <div
            className="overflow-x-auto rounded-2xl"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <table className="w-full text-sm" style={{ background: "#FFFFFF" }}>
              <thead>
                <tr style={{ background: "#F8F2EA" }}>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#337485" }}
                  >
                    NOHO Mailbox
                  </th>
                  <th
                    className="text-left p-4 font-black uppercase tracking-wider text-[11px]"
                    style={{ color: "#7A6050" }}
                  >
                    {meta.competitorName}
                  </th>
                </tr>
              </thead>
              <tbody>
                {meta.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid #E8D8C4",
                      background: row.usWins
                        ? "rgba(51,116,133,0.05)"
                        : "transparent",
                    }}
                  >
                    <td className="p-4 align-top font-bold text-text-light">
                      {row.feature}
                    </td>
                    <td
                      className="p-4 align-top"
                      style={{
                        color: row.usWins ? "#337485" : "#2D100F",
                        fontWeight: row.usWins ? 800 : 500,
                      }}
                    >
                      {row.us}
                    </td>
                    <td className="p-4 align-top text-text-light-muted">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Best of each */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="rounded-2xl p-7"
            style={{
              background: "rgba(51,116,133,0.05)",
              border: "1px solid rgba(51,116,133,0.18)",
            }}
          >
            <h3
              className="font-extrabold tracking-tight text-base mb-4"
              style={{ color: "#337485" }}
            >
              Where we&apos;re honestly better
            </h3>
            <ul className="space-y-2">
              {meta.ourBest.map((b) => (
                <li
                  key={b}
                  className="text-sm flex items-start gap-2"
                  style={{ color: "#23596A" }}
                >
                  <span className="mt-1 font-bold">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl p-7"
            style={{
              background: "rgba(122,96,80,0.05)",
              border: "1px solid rgba(122,96,80,0.18)",
            }}
          >
            <h3
              className="font-extrabold tracking-tight text-base mb-4"
              style={{ color: "#7A6050" }}
            >
              Where {meta.competitorName} wins
            </h3>
            <ul className="space-y-2">
              {meta.theirBest.map((b) => (
                <li
                  key={b}
                  className="text-sm flex items-start gap-2"
                  style={{ color: "#7A6050" }}
                >
                  <span className="mt-1 font-bold">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Switch pitch */}
      <section className="py-16 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-7"
          style={{
            background: "#FFF9F3",
            border: "1px solid #E8D8C4",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h3 className="text-xl font-extrabold tracking-tight text-text-light mb-3">
            Should you switch?
          </h3>
          <p className="text-sm text-text-light-muted leading-relaxed whitespace-pre-line">
            {meta.switchPitch}
          </p>
        </div>
      </section>

      {/* Other comparisons */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-8">
            More comparisons
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {COMPETITOR_PAGES.filter((c) => c.slug !== meta.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/vs/${c.slug}`}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  color: "#7A6050",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                vs {c.competitorName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            {meta.cta.title}
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            {meta.cta.body}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={meta.cta.href}
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              {meta.cta.label}
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
