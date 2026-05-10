// iter-214 — Public alumni unsubscribe (Tier 15 #123).
//
// One-click unsubscribe. The token is a 16-char base64url so it's
// short enough for an email-link without leaking PII.

import { unsubscribeAlumniByToken } from "@/app/actions/alumni";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function AlumniUnsubscribePage({ params }: Props) {
  const { token } = await params;
  const res = await unsubscribeAlumniByToken({ token });

  return (
    <main style={S.root}>
      <article style={S.card}>
        {res.ok ? (
          <>
            <p style={S.eyebrow}>📬 NOHO Mailbox · Alumni</p>
            <h1 style={S.h1}>{res.alreadyUnsubscribed ? "You're already unsubscribed" : "You're unsubscribed"}</h1>
            <p style={S.sub}>
              {res.name ? `${res.name}, we'll` : "We'll"} stop sending the quarterly check-in newsletter. We&apos;ll still keep your records on file for the CMRA-required 5y retention window — that&apos;s a legal requirement we can&apos;t opt out of, but you won&apos;t hear from us again.
            </p>
            <p style={S.foot}>
              Changed your mind? <a href="/signup" style={S.link}>Sign back up</a> anytime.
            </p>
          </>
        ) : (
          <>
            <p style={S.eyebrow}>Hmm…</p>
            <h1 style={S.h1}>Invalid unsubscribe link</h1>
            <p style={S.sub}>This link doesn&apos;t match any alumni record. If you&apos;re still receiving emails, reply to one and we&apos;ll fix it manually.</p>
          </>
        )}
      </article>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" },
  card: { background: "white", borderRadius: 20, border: "1px solid #E8DDD0", padding: "32px 28px", maxWidth: 460, width: "100%", textAlign: "center" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: 0 },
  h1: { fontSize: 24, fontWeight: 900, letterSpacing: "-.4px", margin: "8px 0 6px" },
  sub: { fontSize: 14, color: "rgba(45,16,15,0.65)", margin: "0 0 18px", lineHeight: 1.55 },
  foot: { fontSize: 12, color: "rgba(45,16,15,0.55)", margin: 0 },
  link: { color: "#23596A", fontWeight: 700 },
};
