"use client";

/**
 * iter-200 — Referral landing page client component (Tier 14 #109).
 *
 * The page itself is server-rendered for SEO + meta tags; this client
 * piece handles:
 *   - Plan picker state
 *   - Visit-count fire-and-forget on mount
 *   - "Open NOHO Mailbox map" deep link
 *
 * Brand-locked: warm cream/brown palette + brand-blue accents. Big,
 * scannable hero; one CTA. Designed to convert in <30 seconds on
 * mobile.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { recordReferralLandingVisit } from "@/app/actions/referralLanding";

const PLAN_OPTIONS = [
  { id: "virtual",  label: "Virtual",  sub: "Mail handled remotely",     priceLabel: "from $9.99/mo" },
  { id: "basic",    label: "Basic",    sub: "Small box, in-person",      priceLabel: "from $50 / 3mo" },
  { id: "business", label: "Business", sub: "Medium box · branding-friendly", priceLabel: "from $80 / 3mo" },
  { id: "premium",  label: "Premium",  sub: "Large box · top tier",      priceLabel: "from $95 / 3mo" },
] as const;

type PlanId = typeof PLAN_OPTIONS[number]["id"];

type Props = {
  code: string;
  referrerFirstName: string;
  referrerSuiteNumber: string | null;
  creditDollars: number;
  visitCount: number;
  // Weekday/Saturday hours summary string, derived from live config in the
  // server wrapper. Falls back at the call site if config is unavailable.
  hoursSummary: string;
};

export default function LandingClient({ code, referrerFirstName, referrerSuiteNumber, creditDollars, visitCount, hoursSummary }: Props) {
  const [plan, setPlan] = useState<PlanId>("basic");

  useEffect(() => {
    void recordReferralLandingVisit({ code }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signupHref = `/signup?ref=${encodeURIComponent(code)}&plan=${plan}`;

  return (
    <main style={S.root}>
      <article style={S.card}>
        <div style={S.heroBanner}>
          <p style={S.heroEyebrow}>📬 NOHO Mailbox</p>
          <p style={S.heroBonus}>${creditDollars} bonus when you join</p>
        </div>

        <div style={S.body}>
          <p style={S.eyebrow}>Personal invitation</p>
          <h1 style={S.h1}>
            <strong>{referrerFirstName}</strong> wants you to try NOHO Mailbox
          </h1>
          <p style={S.sub}>
            {referrerFirstName} loves their mailbox at NOHO and just sent you their personal referral code.
            Sign up with it and <strong>you both get ${creditDollars} in wallet credit</strong> instantly — no hoops.
          </p>

          <div style={S.codeBox}>
            <p style={S.codeEyebrow}>Your bonus code</p>
            <p style={S.codeBig}>{code}</p>
            {referrerSuiteNumber && (
              <p style={S.codeSub}>From suite #{referrerSuiteNumber}</p>
            )}
          </div>

          <p style={S.pickEyebrow}>Pick a plan ({referrerFirstName} can help you decide if you&apos;re unsure)</p>
          <div style={S.planGrid}>
            {PLAN_OPTIONS.map((p) => {
              const active = plan === p.id;
              return (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                  style={{ ...S.planBtn, ...(active ? S.planBtnActive : {}) }}>
                  <span style={{ ...S.planLabel, color: active ? "white" : "#2D100F" }}>{p.label}</span>
                  <span style={{ ...S.planSub, color: active ? "rgba(255,255,255,0.85)" : "rgba(45,16,15,0.55)" }}>{p.sub}</span>
                  <span style={{ ...S.planPrice, color: active ? "rgba(255,255,255,0.95)" : "#23596A" }}>{p.priceLabel}</span>
                </button>
              );
            })}
          </div>

          <Link href={signupHref} style={S.cta}>
            Claim my ${creditDollars} bonus →
          </Link>
          <p style={S.fineprint}>
            Bonus auto-applies once you complete signup. Need to think? <Link href="/how-it-works" style={S.link}>See how it works</Link>.
          </p>

          <hr style={S.divider} />

          <div style={S.locationBox}>
            <p style={S.locationEyebrow}>📍 Your local mailbox</p>
            <p style={S.locationName}>NOHO Mailbox · North Hollywood, CA</p>
            <p style={S.locationAddr}>5062 Lankershim Blvd · 91601</p>
            <p style={S.locationHours}>{hoursSummary}</p>
            <a href="https://maps.google.com/?q=5062+Lankershim+Blvd+North+Hollywood+CA+91601" target="_blank" rel="noopener noreferrer" style={S.mapsBtn}>
              Open in Maps ↗
            </a>
          </div>

          <p style={S.proof}>
            🌟 {visitCount === 0 ? "You're the first" : visitCount === 1 ? "1 person" : `${visitCount.toLocaleString()} people`} visited this invitation. Be next.
          </p>
        </div>
      </article>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "32px 16px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
    color: "#2D100F",
  },
  card: { background: "white", borderRadius: 20, border: "1px solid #E8DDD0", maxWidth: 480, width: "100%", overflow: "hidden", boxShadow: "0 12px 48px rgba(45,16,15,0.10)" },
  heroBanner: { background: "linear-gradient(135deg, #337485 0%, #23596A 100%)", padding: "20px 28px", textAlign: "center" },
  heroEyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", margin: 0 },
  heroBonus: { color: "white", fontSize: 22, fontWeight: 900, letterSpacing: "-.3px", margin: "4px 0 0" },
  body: { padding: "28px 28px 32px" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: 0 },
  h1: { fontSize: 24, fontWeight: 900, letterSpacing: "-.4px", margin: "8px 0 6px", lineHeight: 1.2 },
  sub: { fontSize: 14, color: "rgba(45,16,15,0.7)", margin: "0 0 18px", lineHeight: 1.55 },
  codeBox: { background: "#F7E6C2", borderRadius: 12, padding: "14px 18px", textAlign: "center", margin: "16px 0 22px" },
  codeEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(45,16,15,0.65)", margin: 0 },
  codeBig: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 24, fontWeight: 900, letterSpacing: ".10em", color: "#23596A", margin: "4px 0" },
  codeSub: { fontSize: 11, color: "rgba(45,16,15,0.55)", margin: 0 },
  pickEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)", margin: "0 0 10px" },
  planGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 },
  planBtn: { display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 14px", background: "white", border: "1px solid #E8DDD0", borderRadius: 12, cursor: "pointer", textAlign: "left" },
  planBtnActive: { background: "#337485", border: "1px solid #337485", boxShadow: "0 6px 18px rgba(51,116,133,0.30)" },
  planLabel: { fontSize: 13, fontWeight: 900, lineHeight: 1.1 },
  planSub: { fontSize: 10.5, marginTop: 2 },
  planPrice: { fontSize: 10.5, fontWeight: 800, marginTop: 4 },
  cta: { display: "block", textAlign: "center", padding: "14px 24px", background: "#E70013", color: "white", textDecoration: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, letterSpacing: ".02em", boxShadow: "0 8px 24px rgba(231,0,19,0.30)" },
  fineprint: { fontSize: 11, color: "rgba(45,16,15,0.55)", marginTop: 12, textAlign: "center", lineHeight: 1.4 },
  link: { color: "#23596A", fontWeight: 700 },
  divider: { border: 0, borderTop: "1px dashed #E8DDD0", margin: "22px 0 16px" },
  locationBox: { background: "#F4F5F7", borderRadius: 12, padding: "12px 16px" },
  locationEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)", margin: 0 },
  locationName: { fontSize: 13.5, fontWeight: 900, margin: "4px 0 2px" },
  locationAddr: { fontSize: 12, color: "rgba(45,16,15,0.7)", margin: 0 },
  locationHours: { fontSize: 11.5, color: "rgba(45,16,15,0.55)", margin: "2px 0 8px" },
  mapsBtn: { display: "inline-block", padding: "6px 12px", background: "white", border: "1px solid #E8DDD0", borderRadius: 8, color: "#23596A", textDecoration: "none", fontSize: 11.5, fontWeight: 800 },
  proof: { fontSize: 11, color: "rgba(45,16,15,0.45)", textAlign: "center", margin: "16px 0 0" },
};
