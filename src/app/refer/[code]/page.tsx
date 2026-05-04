// iter-98 — Public referral landing page.
//
// Friend taps "Join with my code" link from the referrer's share. We
// resolve the code → show "Sarah invited you · $10 on us" + the
// referrer's first name + a CTA to sign up that pre-fills the code.

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

export default async function ReferLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cleaned = code.toUpperCase().trim();
  const referral = await prisma.referral.findUnique({
    where: { code: cleaned },
    select: {
      code: true,
      creditCents: true,
      refereeId: true,
      referrer: { select: { name: true, suiteNumber: true } },
    },
  });

  // 404-ish soft state: page renders even if the code is unknown so
  // anyone fat-fingering the URL still lands on a friendly screen.
  const valid = !!referral;
  const claimed = !!referral?.refereeId;
  const referrerFirst = referral?.referrer.name?.split(" ")[0] ?? "A friend";
  const credit = referral?.creditCents ?? 1000;
  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F8F2EA",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: NOHO_INK,
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(45,16,15,0.10)", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 11, marginBottom: 16 }}>
          ← NOHO Mailbox
        </Link>

        <div
          style={{
            background: "white",
            border: "1px solid rgba(45,16,15,0.10)",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
            Friend referral
          </p>
          {valid && !claimed ? (
            <>
              <h1 style={{ margin: "10px 0 0", fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em" }}>
                {referrerFirst} invited you
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 16, color: "rgba(45,16,15,0.65)" }}>
                Get <strong style={{ color: NOHO_INK }}>{fmt(credit)} on the house</strong> when you sign up — and {referrerFirst} gets the same when you do.
              </p>

              <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.30)" }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#92400e" }}>
                  Your referral code
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, letterSpacing: "0.04em" }}>
                  {cleaned}
                </p>
              </div>

              <Link
                href={`/signup?ref=${encodeURIComponent(cleaned)}`}
                style={{
                  display: "block",
                  marginTop: 18,
                  padding: "14px 18px",
                  background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 14,
                  fontWeight: 900,
                  fontSize: 15,
                  boxShadow: "0 6px 16px rgba(35,89,106,0.30)",
                }}
              >
                Sign up & claim {fmt(credit)} →
              </Link>

              <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", textAlign: "left", fontSize: 12.5, color: "rgba(45,16,15,0.65)", lineHeight: 1.6 }}>
                <li>· Real Lankershim Blvd street address — not a P.O. Box</li>
                <li>· Mail scans, package handling, forwarding worldwide</li>
                <li>· Same-day delivery in NoHo</li>
                <li>· Notary, faxing, copies, shop supplies</li>
              </ul>
            </>
          ) : claimed ? (
            <>
              <h1 style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.01em" }}>
                This code's already been used
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "rgba(45,16,15,0.65)" }}>
                But you can still sign up — and once you're in, you'll get your own referral code to share.
              </p>
              <Link
                href="/signup"
                style={{ display: "block", marginTop: 18, padding: "12px 16px", background: NOHO_BLUE_DEEP, color: "white", textDecoration: "none", borderRadius: 12, fontWeight: 900, fontSize: 14 }}
              >
                Sign up →
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.01em" }}>
                Code not recognized
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "rgba(45,16,15,0.65)" }}>
                Double-check the link your friend sent you. You can still sign up directly.
              </p>
              <Link
                href="/signup"
                style={{ display: "block", marginTop: 18, padding: "12px 16px", background: NOHO_BLUE_DEEP, color: "white", textDecoration: "none", borderRadius: 12, fontWeight: 900, fontSize: 14 }}
              >
                Sign up →
              </Link>
            </>
          )}
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: "rgba(45,16,15,0.45)", textAlign: "center" }}>
          NOHO Mailbox · 5062 Lankershim Blvd · NoHo, CA 91601
        </p>
      </div>
    </div>
  );
}
