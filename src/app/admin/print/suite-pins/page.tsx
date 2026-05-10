/**
 * iter-210 — Printable QR-label sheet for suite-info doors (Tier 15 #119).
 *
 * Admin opens `/admin/print/suite-pins?from=1&to=24` to get a sticker-
 * sheet-formatted page (3 cols × 8 rows = 24 labels per Letter page,
 * 2.5"×1" each, matches Avery 5160 layout). Each label has the suite
 * # in big mono + a QR pointing to /suite-info/{suite}?token=…
 *
 * Auto-prints on load via the iter-155 AutoPrint pattern. Admin
 * peels and sticks one label per mailbox door.
 */

import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { generateSuiteInfoUrls } from "@/app/actions/suiteInfo";
import AutoPrint from "../insurance-claim/[id]/AutoPrint";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PrintSuitePinsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const from = parseInt(typeof sp.from === "string" ? sp.from : "1", 10) || 1;
  const to = parseInt(typeof sp.to === "string" ? sp.to : "24", 10) || 24;
  const data = await generateSuiteInfoUrls({ rangeMin: from, rangeMax: to });

  if (!data.configured) {
    return (
      <main style={S.errRoot}>
        <div style={S.errCard}>
          <p style={S.errEyebrow}>⚙️ Setup needed</p>
          <p style={S.errMsg}>Set the <code style={S.code}>SUITE_INFO_TOKEN</code> env var (any random 32+ char string) before printing labels. The token signs each QR so a label only works for the suite it was printed for.</p>
        </div>
      </main>
    );
  }
  if (data.rows.length === 0) {
    redirect("/admin?tab=suitepins");
  }

  const labels = await Promise.all(data.rows.map(async (r) => ({
    suite: r.suiteNumber,
    slogan: r.slogan,
    qr: await QRCode.toDataURL(r.url, { width: 110, margin: 0, errorCorrectionLevel: "M" }),
  })));

  return (
    <main style={S.page}>
      <AutoPrint />
      <header style={S.banner} className="print-hide">
        <div>
          <p style={S.bannerEyebrow}>📄 Suite-pin labels · Print-to-PDF preview</p>
          <p style={S.bannerSub}>3 cols × 8 rows = 24 labels per Letter page (Avery 5160). Auto-print fires on load.</p>
        </div>
        <a href="/admin?tab=suitepins" style={S.bannerBack}>← Back</a>
      </header>

      <div style={S.sheet}>
        {labels.map((l) => (
          <div key={l.suite} style={S.label}>
            <div style={S.labelLeft}>
              <p style={S.labelEyebrow}>NOHO Mailbox</p>
              <p style={S.labelSuite}>#{l.suite}</p>
              {/* iter-232: 1-line member-set slogan under the suite #. */}
              {l.slogan && <p style={S.labelSlogan}>{l.slogan}</p>}
              <p style={S.labelHint}>Scan to verify</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.qr} alt={`QR for suite ${l.suite}`} style={S.labelQr} />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          @page { size: Letter; margin: 0.5in 0.19in 0.5in 0.19in; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#F4F5F7", minHeight: "100vh", padding: "24px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' },
  banner: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, maxWidth: 720, margin: "0 auto 16px", padding: "12px 18px", background: "white", borderRadius: 12, border: "1px solid #ECEEF1" },
  bannerEyebrow: { margin: 0, fontSize: 12, fontWeight: 800, color: "#0F5BD9" },
  bannerSub: { margin: "4px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" },
  bannerBack: { fontSize: 11, fontWeight: 800, padding: "6px 12px", background: "#F4F5F7", color: "#3B4252", border: "1px solid #ECEEF1", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" },
  sheet: { background: "white", maxWidth: 720, margin: "0 auto", padding: "24px 18px", borderRadius: 6, boxShadow: "0 8px 28px rgba(0,0,0,0.08)", border: "1px solid #ECEEF1", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 },
  label: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", border: "1px dashed #d1d5db", borderRadius: 4, height: 96 },
  labelLeft: { flex: 1, minWidth: 0 },
  labelEyebrow: { margin: 0, fontSize: 8, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A8290" },
  labelSuite: { margin: "2px 0", fontSize: 28, fontWeight: 900, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "-.02em", color: "#1F2937", lineHeight: 1 },
  labelSlogan: { margin: "1px 0 2px", fontSize: 8, fontStyle: "italic", color: "#5B21B6", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  labelHint: { margin: 0, fontSize: 8, color: "#7A8290" },
  labelQr: { width: 78, height: 78 },
  errRoot: { minHeight: "100vh", background: "#F4F5F7", color: "#1A1D23", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  errCard: { background: "white", borderRadius: 16, border: "1px solid #ECEEF1", padding: "24px 28px", maxWidth: 460, textAlign: "center" },
  errEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#92400e", margin: 0 },
  errMsg: { fontSize: 13, color: "rgba(45,16,15,0.70)", margin: "8px 0 0", lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: "1px 5px", background: "#F4F5F7", borderRadius: 4, color: "#1F2937", fontSize: 12 },
};
