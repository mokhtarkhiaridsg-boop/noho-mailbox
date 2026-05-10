// iter-210 — Suite-info QR landing page (Tier 15 #119).
//
// Public, token-gated. Admin scans the QR label affixed to a mailbox
// door from their phone; this renders a fullscreen mobile-optimized
// info card so they can verify "yep that's Karim's box, last picked
// up 3 days ago, 2 packages waiting".
//
// "AR" is intentionally lightweight: no WebXR dep, no 3D — just a
// massive readable card on a dark backdrop the staff member holds
// up next to the suite door. Same outcome, zero moving parts.

import { getSuiteInfoForAdmin } from "@/app/actions/suiteInfo";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Suite info · NOHO Mailbox",
};

type Props = { params: Promise<{ suiteNumber: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SuiteInfoPage({ params, searchParams }: Props) {
  const { suiteNumber } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const info = await getSuiteInfoForAdmin({ suiteNumber, token });

  if (!info.ok) {
    if (info.reason === "not_configured") {
      return (
        <main style={S.errRoot}>
          <div style={S.errCard}>
            <p style={S.errEyebrow}>⚙️ Server not configured</p>
            <p style={S.errMsg}>SUITE_INFO_TOKEN env var is unset. Ask the operator to configure it before printing labels.</p>
          </div>
        </main>
      );
    }
    if (info.reason === "invalid_token") {
      return (
        <main style={S.errRoot}>
          <div style={S.errCard}>
            <p style={S.errEyebrow}>🔒 Invalid label</p>
            <p style={S.errMsg}>This QR label isn&apos;t signed by the current bureau key. Reprint it from /admin?tab=suitepins.</p>
          </div>
        </main>
      );
    }
    if (info.reason === "vacant") {
      return (
        <main style={S.root}>
          <article style={S.card}>
            <p style={S.eyebrow}>Suite #{suiteNumber}</p>
            <h1 style={{ ...S.h1, color: "#a16207" }}>Vacant</h1>
            <p style={S.sub}>No active member assigned. Use this suite for the next signup.</p>
          </article>
        </main>
      );
    }
    notFound();
  }

  const lastPickup = info.lastPickupAtIso ? new Date(info.lastPickupAtIso) : null;
  const lastPickupLabel = lastPickup
    ? lastPickup.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "Never picked up";
  const daysLabel = info.daysSinceLastPickup == null
    ? "Never"
    : info.daysSinceLastPickup === 0 ? "today"
    : info.daysSinceLastPickup === 1 ? "yesterday"
    : `${info.daysSinceLastPickup} days ago`;

  return (
    <main style={S.root}>
      <article style={S.card}>
        <p style={S.eyebrow}>Suite #{info.suiteNumber}</p>

        {info.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.photoUrl} alt="" style={S.avatar} />
        ) : (
          <div style={S.avatarFallback}>{info.firstName.slice(0, 1).toUpperCase()}</div>
        )}

        <h1 style={S.h1}>{info.firstName}</h1>
        <p style={S.sub}>Member since {info.memberSinceYear}</p>

        <div style={S.factsGrid}>
          <div style={S.fact}>
            <p style={S.factLabel}>Last pickup</p>
            <p style={S.factValue}>{daysLabel}</p>
            <p style={S.factSub}>{lastPickupLabel}</p>
          </div>
          <div style={{ ...S.fact, ...(info.hasOpenPackages ? S.factHot : {}) }}>
            <p style={S.factLabel}>Open packages</p>
            <p style={{ ...S.factValue, color: info.hasOpenPackages ? "#F59E0B" : "rgba(244,245,247,0.85)" }}>
              {info.openPackageCount}
            </p>
            <p style={S.factSub}>{info.hasOpenPackages ? "Awaiting pickup" : "All clear"}</p>
          </div>
        </div>

        {info.bio && (
          <div style={S.bioBox}>
            <p style={S.bioLabel}>📝 Public bio (from neighbor directory)</p>
            <p style={S.bioText}>“{info.bio}”</p>
          </div>
        )}

        <p style={S.foot}>
          Authenticated via signed QR · NOHO Mailbox staff use only
        </p>
      </article>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #0B0F18 0%, #111729 60%, #1A1130 100%)", color: "#F4F5F7", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" },
  card: { background: "rgba(255,255,255,0.04)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.10)", padding: "32px 28px", maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 20px 80px rgba(0,0,0,0.60)" },
  eyebrow: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".30em", textTransform: "uppercase", color: "rgba(244,245,247,0.55)" },
  avatar: { width: 120, height: 120, borderRadius: 999, objectFit: "cover", margin: "16px auto 12px", border: "3px solid #1976FF", boxShadow: "0 0 24px rgba(25,118,255,0.40)" },
  avatarFallback: { width: 120, height: 120, borderRadius: 999, margin: "16px auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 900, color: "white", background: "linear-gradient(135deg, #1976FF, #0F5BD9)", boxShadow: "0 0 24px rgba(25,118,255,0.40)" },
  h1: { fontSize: 56, fontWeight: 900, letterSpacing: "-.02em", margin: "8px 0 4px", color: "white" },
  sub: { fontSize: 14, color: "rgba(244,245,247,0.65)", margin: 0 },
  factsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 22 },
  fact: { background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.08)" },
  factHot: { background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.40)" },
  factLabel: { fontSize: 10, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(244,245,247,0.50)", margin: 0 },
  factValue: { fontSize: 24, fontWeight: 900, color: "white", margin: "4px 0 2px" },
  factSub: { fontSize: 11, color: "rgba(244,245,247,0.55)", margin: 0 },
  bioBox: { background: "rgba(124,58,237,0.10)", borderRadius: 12, padding: "12px 14px", marginTop: 16, border: "1px solid rgba(124,58,237,0.30)", textAlign: "left" },
  bioLabel: { fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#c084fc", margin: 0 },
  bioText: { fontSize: 13, color: "rgba(244,245,247,0.90)", fontStyle: "italic", margin: "4px 0 0" },
  foot: { fontSize: 10, color: "rgba(244,245,247,0.35)", margin: "20px 0 0" },
  errRoot: { minHeight: "100vh", background: "#F4F5F7", color: "#1A1D23", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  errCard: { background: "white", borderRadius: 16, border: "1px solid #ECEEF1", padding: "24px 28px", maxWidth: 400, textAlign: "center" },
  errEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#92400e", margin: 0 },
  errMsg: { fontSize: 13, color: "rgba(45,16,15,0.70)", margin: "8px 0 0", lineHeight: 1.5 },
};
