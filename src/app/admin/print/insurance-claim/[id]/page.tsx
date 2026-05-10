/**
 * iter-203 — Printable insurance-claim package (Tier 14 #112).
 *
 * Full-bleed A4 PDF-optimized claim package: cover header, claim
 * facts grid, sender/recipient block, evidence bullet list, photo
 * grid, internal notes. Designed to be saved as PDF via the browser's
 * native "Print to PDF" so admin can upload one file to the carrier
 * portal instead of cobbling together screenshots.
 *
 * Auto-fires window.print() on mount via the iter-155 AutoPrint
 * pattern. Print stylesheet hides on-screen-only elements (the
 * "back" button, the "this is what will print" header banner) so
 * the PDF is clean.
 */

import { verifyAdmin } from "@/lib/dal";
import { notFound } from "next/navigation";
import { getInsuranceClaim } from "@/app/actions/insuranceClaim";
import {
  CARRIER_PORTAL_URLS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
} from "@/lib/insurance-claim";
import AutoPrint from "./AutoPrint";

export const dynamic = "force-dynamic";

export default async function PrintInsuranceClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;
  const detail = await getInsuranceClaim({ id });
  if (!detail) return notFound();
  const { row, prefill, evidence } = detail;

  const generatedAt = new Date().toLocaleString();
  const portalUrl = CARRIER_PORTAL_URLS[row.carrier] || "";

  return (
    <main style={S.page}>
      <AutoPrint />

      {/* Screen-only banner — vanishes on print */}
      <header style={S.screenBanner} className="print-hide">
        <div>
          <p style={S.bannerEyebrow}>📄 Insurance claim package · Print-to-PDF preview</p>
          <p style={S.bannerSub}>
            This page auto-opens the print dialog. Choose <strong>"Save as PDF"</strong> as the destination → upload the resulting file to the carrier portal.
          </p>
        </div>
        <a href={`/admin?tab=insclaims`} style={S.bannerBackBtn}>← Back to claims</a>
      </header>

      {/* Print body */}
      <article style={S.sheet}>
        <div style={S.coverHead}>
          <div>
            <p style={S.coverEyebrow}>NOHO Mailbox · Insurance Claim Package</p>
            <h1 style={S.coverH1}>
              {row.carrier} · {CLAIM_TYPE_LABELS[row.claimType]}
            </h1>
            <p style={S.coverSub}>
              Claim ID <code style={S.code}>{row.id}</code>
              {row.carrierClaimNumber && <> · Carrier claim # <code style={S.code}>{row.carrierClaimNumber}</code></>}
            </p>
          </div>
          <div style={S.coverStatus}>
            <p style={{ ...S.statusPill, ...statusPillStyle(row.status) }}>{CLAIM_STATUS_LABELS[row.status]}</p>
            <p style={S.coverDate}>Generated {generatedAt}</p>
          </div>
        </div>

        <Section title="📦 Package facts">
          <Grid>
            <KV label="Tracking #" value={prefill.trackingNumber ?? "—"} mono />
            <KV label="Carrier" value={row.carrier} />
            <KV label="Claim type" value={CLAIM_TYPE_LABELS[row.claimType]} />
            <KV label="Intake at NOHO" value={new Date(prefill.intakeDateIso).toLocaleString()} />
            <KV label="Days since intake" value={`${prefill.daysSinceIntake}d`} />
            {prefill.filingWindowDays != null && (
              <KV
                label="Filing window"
                value={`${prefill.filingWindowDays}d (${prefill.filingWindowExceeded ? "EXCEEDED ⚠️" : "ok"})`}
                accent={prefill.filingWindowExceeded ? "#b91c1c" : "#15803d"}
              />
            )}
            <KV label="Weight" value={prefill.weightOz != null ? `${prefill.weightOz}oz` : "—"} />
            <KV label="Dimensions" value={prefill.dimensions ?? "—"} />
            <KV label="Declared value" value={`$${prefill.declaredValueDollars}`} />
            <KV label="Claimed amount" value={`$${prefill.claimedAmountDollars}`} accent="#0F5BD9" />
          </Grid>
        </Section>

        <Section title="👥 Sender / recipient">
          <Grid>
            <KV label="Sender" value={prefill.senderName} />
            <KV label="Recipient" value={prefill.recipientName} />
            {row.suiteNumber && <KV label="Suite" value={`#${row.suiteNumber}`} mono />}
            {row.userName && <KV label="Member" value={row.userName} />}
          </Grid>
        </Section>

        <Section title="✏️ Description (paste into 'describe issue' field)">
          <p style={S.descBlock}>{prefill.description}</p>
        </Section>

        <Section title="📝 Evidence (paste into 'describe damage' field or upload as separate doc)">
          <ul style={S.evidenceList}>
            {prefill.evidenceList.map((line, i) => (
              <li key={i} style={S.evidenceItem}>{line}</li>
            ))}
          </ul>
        </Section>

        {evidence.photos.length > 0 && (
          <Section title={`📷 Photos (${evidence.photos.length})`}>
            <div style={S.photoGrid}>
              {evidence.photos.map((p, i) => (
                <figure key={i} style={S.photoFig}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.label} style={S.photo} />
                  <figcaption style={S.caption}>{p.label}</figcaption>
                </figure>
              ))}
            </div>
          </Section>
        )}

        {row.notes && (
          <Section title="🗒️ Internal notes">
            <p style={S.notes}>{row.notes}</p>
          </Section>
        )}

        <footer style={S.footer}>
          <p>
            NOHO Mailbox · 11288 Ventura Blvd #1006, Studio City, CA 91604 · (818) 506-7744 · nohomailbox.org
          </p>
          {portalUrl && <p style={S.footerLink}>Carrier portal: {portalUrl}</p>}
          <p style={S.footerStamp}>Package generated {generatedAt} · NOHO Mailbox claim {row.id}</p>
        </footer>
      </article>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          @page { size: Letter; margin: 0.55in 0.55in 0.55in 0.55in; }
          body { background: white !important; }
          article { box-shadow: none !important; border: none !important; padding: 0 !important; }
          img { page-break-inside: avoid; }
          section, figure { page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <h2 style={S.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={S.grid}>{children}</div>;
}

function KV({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div style={S.kv}>
      <p style={S.kvLabel}>{label}</p>
      <p style={{ ...S.kvValue, fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : undefined, color: accent ?? "#1A1D23" }}>{value}</p>
    </div>
  );
}

function statusPillStyle(status: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    Draft:  { bg: "#F4F5F7",                 fg: "#3B4252" },
    Filed:  { bg: "rgba(25,118,255,0.14)",  fg: "#0F5BD9" },
    Paid:   { bg: "rgba(34,197,94,0.18)",   fg: "#15803d" },
    Denied: { bg: "rgba(239,68,68,0.14)",   fg: "#b91c1c" },
    Closed: { bg: "rgba(107,114,128,0.14)", fg: "#374151" },
  };
  const s = map[status] ?? map.Draft!;
  return { background: s.bg, color: s.fg };
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#F4F5F7", minHeight: "100vh", padding: "24px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: "#1A1D23" },
  screenBanner: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, maxWidth: 720, margin: "0 auto 16px", padding: "12px 18px", background: "white", borderRadius: 12, border: "1px solid #ECEEF1" },
  bannerEyebrow: { margin: 0, fontSize: 12, fontWeight: 800, color: "#0F5BD9" },
  bannerSub: { margin: "4px 0 0", fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 1.4 },
  bannerBackBtn: { fontSize: 11, fontWeight: 800, padding: "6px 12px", background: "#F4F5F7", color: "#3B4252", border: "1px solid #ECEEF1", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" },
  sheet: { background: "white", maxWidth: 720, margin: "0 auto", padding: "32px 36px", borderRadius: 6, boxShadow: "0 8px 28px rgba(0,0,0,0.08)", border: "1px solid #ECEEF1" },
  coverHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1F2937", paddingBottom: 14, marginBottom: 18, gap: 16 },
  coverEyebrow: { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#7A8290" },
  coverH1: { margin: "4px 0 4px", fontSize: 20, fontWeight: 900, letterSpacing: "-.3px" },
  coverSub: { margin: 0, fontSize: 11, color: "rgba(0,0,0,0.55)" },
  coverStatus: { textAlign: "right" },
  statusPill: { display: "inline-block", padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: ".10em", textTransform: "uppercase", margin: 0 },
  coverDate: { margin: "6px 0 0", fontSize: 10, color: "#7A8290" },
  section: { marginTop: 18 },
  sectionTitle: { margin: "0 0 8px", fontSize: 12, fontWeight: 900, letterSpacing: ".06em", color: "#1F2937", borderBottom: "1px dashed #ECEEF1", paddingBottom: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  kv: { background: "#F4F5F7", borderRadius: 6, padding: "8px 10px" },
  kvLabel: { margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A8290" },
  kvValue: { margin: "2px 0 0", fontSize: 12, fontWeight: 700 },
  descBlock: { margin: 0, fontSize: 12, lineHeight: 1.55, padding: "10px 12px", background: "#F4F5F7", borderRadius: 6, whiteSpace: "pre-wrap" },
  evidenceList: { margin: 0, paddingLeft: 18 },
  evidenceItem: { fontSize: 11.5, lineHeight: 1.55, color: "#1A1D23", marginBottom: 2 },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 4 },
  photoFig: { margin: 0, padding: 6, background: "#F4F5F7", borderRadius: 6, border: "1px solid #ECEEF1" },
  photo: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 4 },
  caption: { fontSize: 9.5, color: "#7A8290", textAlign: "center", marginTop: 4 },
  notes: { margin: 0, fontSize: 12, fontStyle: "italic", color: "#3B4252", padding: "10px 12px", background: "#F4F5F7", borderRadius: 6 },
  footer: { marginTop: 20, paddingTop: 12, borderTop: "1px solid #ECEEF1", fontSize: 10, color: "#7A8290", textAlign: "center" },
  footerLink: { margin: "4px 0 0", wordBreak: "break-all" },
  footerStamp: { margin: "6px 0 0", fontSize: 9 },
  code: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: "1px 4px", background: "#F4F5F7", borderRadius: 3, fontSize: 10.5 },
};
