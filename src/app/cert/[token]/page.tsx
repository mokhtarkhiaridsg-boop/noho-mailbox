// iter-187 — Public mailing-certificate verify page (Tier 13 #96).
// /cert/<verifyToken> — no auth. Anyone with the token can render +
// print this page as legal proof of receipt. Renders revoked status
// loudly when admin has invalidated it.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getMailingCertificateByToken } from "@/app/actions/mailingCertificate";
import { generateCode128 } from "@/lib/barcode128";
import { formatVerifyToken } from "@/lib/mailing-certificate";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_GOLD = "#D4A017";

export default async function CertVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await getMailingCertificateByToken({ token });
  if (!c) return notFound();

  const barcodeSvg = generateCode128(c.verifyToken, {
    height: 80, moduleWidth: 2, showText: false, margin: 12,
    foreground: "#000", background: "transparent",
  });
  const dateLabel = new Date(`${c.itemDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const issuedAtLabel = new Date(c.createdAtIso).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const isRevoked = !!c.revokedAtIso;

  return (
    <div style={{ minHeight: "100vh", background: "#F8F2EA", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: NOHO_INK, padding: "32px 16px" }}>
      <style>{`
        @media print {
          @page { size: 8.5in 11in; margin: 0.4in; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .cert, .cert * { visibility: visible !important; }
          .cert {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important; height: 100% !important;
            margin: 0 !important; padding: 0 !important;
            box-shadow: none !important; border: none !important;
            box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" className="no-print" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(45,16,15,0.10)", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 11, marginBottom: 12 }}>
          ← NOHO Mailbox
        </Link>

        {isRevoked && (
          <div className="no-print" style={{ marginBottom: 14, padding: "14px 18px", background: "rgba(231,0,19,0.10)", border: "2px solid #E70013", borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#991b1b" }}>
              ⚠️ This certificate has been REVOKED.
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7f1d1d" }}>
              Revoked {new Date(c.revokedAtIso!).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}{c.revokedReason ? ` · ${c.revokedReason}` : ""}. Do not rely on this document.
            </p>
          </div>
        )}

        <div className="cert" style={{
          background: "white",
          border: `1px solid rgba(45,16,15,0.10)`,
          borderRadius: 12, padding: "0.5in",
          boxShadow: "0 8px 24px rgba(45,16,15,0.10)",
          minHeight: "10in",
          display: "flex", flexDirection: "column",
          position: "relative",
        }}>
          {/* Watermark — REVOKED stamp diagonal across body when applicable */}
          {isRevoked && (
            <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <span style={{ fontSize: 100, fontWeight: 900, color: "rgba(231,0,19,0.18)", letterSpacing: "0.30em", transform: "rotate(-22deg)", whiteSpace: "nowrap" }}>
                REVOKED
              </span>
            </div>
          )}

          {/* Header */}
          <header style={{ borderBottom: `2px solid ${NOHO_BLUE_DEEP}`, paddingBottom: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
                NOHO Mailbox · Bureau of Mailing Records
              </p>
              <h1 style={{ margin: "6px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", color: NOHO_INK }}>
                Certificate of Mailing Receipt
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
                Issued under the chain-of-custody policy of NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601 · USA
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.45)" }}>
                Certificate №
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, letterSpacing: "0.05em" }}>
                {c.certificateNumber}
              </p>
            </div>
          </header>

          {/* Statement */}
          <section style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: NOHO_INK, position: "relative", zIndex: 1 }}>
            <p style={{ margin: 0 }}>
              The undersigned bureau hereby certifies that the following piece of mail was lawfully received,
              logged into chain-of-custody, and addressed to the intended recipient on the date stated below.
              This certificate is true and correct as of the date and time of issue.
            </p>
          </section>

          {/* Details grid */}
          <section style={{ marginTop: 18, position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Recipient" value={c.recipientName} sub={c.recipientSuite ? `Suite #${c.recipientSuite} · NOHO Mailbox` : "NOHO Mailbox"} />
              <Field label="Sender (as stamped)" value={c.senderName} />
              <Field label="Item type" value={c.itemType} />
              <Field label="Date received" value={dateLabel} />
              {c.carrier && <Field label="Carrier" value={c.carrier} />}
              {c.trackingNumber && <Field label="Tracking #" value={c.trackingNumber} mono />}
              {c.weightOz != null && <Field label="Weight" value={`${(c.weightOz / 16).toFixed(2)} lb (${c.weightOz} oz)`} />}
              <Field label="Issued at" value={issuedAtLabel} />
            </div>

            {c.notes && (
              <p style={{ marginTop: 14, padding: "10px 12px", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.30)", borderRadius: 8, fontSize: 12, fontStyle: "italic", color: "#7C4D00" }}>
                Custodian's note: {c.notes}
              </p>
            )}

            {c.exteriorImageUrl && (
              <div style={{ marginTop: 14, textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.exteriorImageUrl} alt="Mail item exterior" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 8, border: "1px solid rgba(45,16,15,0.15)" }} />
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(45,16,15,0.55)" }}>Photographic evidence captured at intake.</p>
              </div>
            )}
          </section>

          {/* Verify barcode + URL */}
          <section style={{ marginTop: "auto", paddingTop: 24, borderTop: `1px solid rgba(45,16,15,0.10)`, position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.45)" }}>
                  Verify online
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, wordBreak: "break-all" }}>
                  https://nohomailbox.org/cert/{c.verifyToken}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>
                  Anyone can scan the barcode or visit the URL to confirm authenticity.
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 900, letterSpacing: "0.10em", color: NOHO_INK }}>
                  {formatVerifyToken(c.verifyToken)}
                </p>
              </div>
              <div style={{ width: 180 }} dangerouslySetInnerHTML={{ __html: barcodeSvg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;" ').replace(/\swidth="\d+"\s/, " ").replace(/\sheight="\d+"\s/, " ") }} />
            </div>

            {/* Sigil + signature line */}
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${NOHO_BLUE_DEEP}, ${NOHO_BLUE})`, display: "grid", placeItems: "center", boxShadow: `0 4px 12px ${NOHO_BLUE}40` }} aria-hidden>
                <span style={{ color: "white", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.3 }}>
                  NOHO<br/>Bureau<br/>Sigil
                </span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
                  This certificate was generated by the NOHO Mailbox custody system. The sigil + verify URL together
                  attest to the authenticity of this document.
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(45,16,15,0.45)" }}>
                  Custody system v1 · cert №{c.certificateNumber}
                </p>
              </div>
            </div>
          </section>
        </div>

        <PrintButton />

        <p className="no-print" style={{ marginTop: 14, fontSize: 11, color: "rgba(45,16,15,0.45)", textAlign: "center" }}>
          NOHO Mailbox · 5062 Lankershim Blvd · NoHo, CA 91601 · (818) 506-7744 · nohomailbox.org
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(45,16,15,0.03)", border: "1px solid rgba(45,16,15,0.08)", borderRadius: 8 }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
        {label}
      </p>
      <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: NOHO_INK, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined, wordBreak: "break-word" }}>
        {value}
      </p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>{sub}</p>}
    </div>
  );
}
