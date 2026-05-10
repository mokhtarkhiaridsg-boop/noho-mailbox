// iter-200 — Public referral landing page (Tier 14 #109).
//
// `/r/{code}` route — meant to be shared by members on social/email/SMS.
// Renders a personalized "Karim invited you to NOHO Mailbox · $10 credit
// when you join" hero, plan picker, and a CTA that deep-links to
// `/signup?ref={code}&plan={selected}` so the existing signup flow
// (which already accepts ?ref=) does the credit attribution.
//
// Public, force-dynamic so the visit-count + audit log fire on every
// load. Falls back to a graceful "code not found" page that still
// drives signup CTA without the bonus.

import Link from "next/link";
import LandingClient from "./LandingClient";
import { lookupReferralLanding } from "@/app/actions/referralLanding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const data = await lookupReferralLanding({ code });
  if (!data.ok) {
    return { title: "Invitation · NOHO Mailbox", description: "Join NOHO Mailbox — your local virtual mailbox in Studio City." };
  }
  return {
    title: `${data.referrerFirstName} invited you · $${data.creditDollars} credit · NOHO Mailbox`,
    description: `${data.referrerFirstName} thinks you'd love NOHO Mailbox. Sign up with code ${data.code} and you both get $${data.creditDollars} in wallet credit.`,
  };
}

export default async function ReferralLandingPage({ params }: Props) {
  const { code } = await params;
  const data = await lookupReferralLanding({ code });
  const upperCode = code.toUpperCase();

  if (!data.ok) {
    return (
      <main style={S.root}>
        <div style={S.card}>
          <p style={S.eyebrow}>Hmm…</p>
          <h1 style={S.h1}>That referral code isn&apos;t valid</h1>
          <p style={S.sub}>
            But you can still sign up for NOHO Mailbox — we&apos;ll give you a tour.
          </p>
          <Link href="/signup" style={S.cta}>Sign up anyway →</Link>
          <p style={S.fineprint}>
            Code: <code style={S.code}>{upperCode}</code> not found. Double-check the link your friend sent you.
          </p>
        </div>
      </main>
    );
  }

  return <LandingClient code={upperCode} referrerFirstName={data.referrerFirstName} referrerSuiteNumber={data.referrerSuiteNumber} creditDollars={data.creditDollars} visitCount={data.visitCount} />;
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: "#2D100F" },
  card: { background: "white", borderRadius: 20, border: "1px solid #E8DDD0", padding: "32px 28px", maxWidth: 460, width: "100%", textAlign: "center" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: 0 },
  h1: { fontSize: 24, fontWeight: 900, letterSpacing: "-.4px", margin: "8px 0 6px" },
  sub: { fontSize: 14, color: "rgba(45,16,15,0.65)", margin: "0 0 18px", lineHeight: 1.5 },
  cta: { display: "inline-block", padding: "11px 24px", background: "#337485", color: "white", textDecoration: "none", borderRadius: 10, fontWeight: 900, fontSize: 14 },
  fineprint: { fontSize: 11, color: "rgba(45,16,15,0.45)", marginTop: 16, lineHeight: 1.4 },
  code: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: "1px 5px", background: "#F4F5F7", borderRadius: 4, color: "#1F2937" },
};
