"use client";

/**
 * iter-157 — Geo-radius marketing flyer panel (Tier 10 #67).
 *
 * Admin types a 5-digit ZIP, panel fetches market intel + renders a
 * print-ready letter-sized (8.5×11) flyer targeted at that ZIP. The
 * flyer auto-personalizes the headline ("Hello, NoHo neighbors at
 * 91601") + carries our brand pitch + QR code to a UTM-tagged signup.
 * Print via window.print() — works on any inkjet/laser printer.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getZipMarketIntel,
  getTopZipsByActivity,
  type ZipMarketIntel,
} from "@/app/actions/zipMarketIntel";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  cream: "#F7E6C2",
  brown: "#2D100F",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

export default function AdminMarketingFlyerPanel() {
  const [zipInput, setZipInput] = useState("");
  const [intel, setIntel] = useState<ZipMarketIntel | null>(null);
  const [topZips, setTopZips] = useState<Array<{ zip: string; deliveries: number; pct: number }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void getTopZipsByActivity(8).then(setTopZips).catch(() => setTopZips([]));
  }, []);

  function lookup(zip: string) {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await getZipMarketIntel({ zip });
      if (!res.ok) { setErrorMsg(res.error); setIntel(null); return; }
      setIntel(res.intel);
      setZipInput(res.intel.zip);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookup(zipInput);
  }

  function onPrint() {
    if (typeof window !== "undefined") window.print();
  }

  // Best-guess city/neighborhood label by leading 3 digits. Generic for
  // any ZIP we don't recognize.
  const cityLabel = useMemo(() => zipCityLabel(intel?.zip ?? ""), [intel]);

  return (
    <div className="space-y-4">
      {/* Print-only @page rule — when admin clicks Print, only the
          flyer block stays visible. The control surface above hides. */}
      <style jsx global>{`
        @media print {
          @page { size: Letter; margin: 0.5in; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .flyer-print, .flyer-print * { visibility: visible !important; }
          .flyer-print { position: absolute !important; inset: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Marketing · Flyer generator
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Geo-radius door-hanger flyer
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Type a ZIP, see customer-density signals, and print a Letter-sized targeted flyer ready for distribution.
        </p>
      </div>

      <div className="no-print rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <form onSubmit={onSubmit} className="flex items-center gap-2 flex-wrap">
          <label className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            ZIP
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="91601"
            maxLength={5}
            className="w-[8em] px-3 py-2 rounded-lg text-sm font-mono tabular-nums"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <button type="submit" disabled={pending || zipInput.length !== 5} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {pending ? "Looking up…" : "Get intel"}
          </button>
          {intel && (
            <button type="button" onClick={onPrint} className="ml-auto text-[11.5px] font-black px-3 py-2 rounded-lg text-white" style={{ background: T.success }}>
              🖨 Print flyer
            </button>
          )}
        </form>

        {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}

        {intel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Deliveries to ZIP" value={intel.deliveriesToZip} accent={T.blue} />
            <Tile label="Forwarding lines" value={intel.forwardingAddrCount} accent={T.blueDeep} />
            <Tile label="% of all deliveries" value={`${intel.pctOfBureauActivity}%`} accent={T.success} />
            <Tile label="Adjacent ZIPs found" value={intel.topAdjacentZips.length} accent={T.warning} />
          </div>
        )}

        {intel && intel.topAdjacentZips.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
              Adjacent ZIPs (same first 3 digits)
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {intel.topAdjacentZips.map((z) => (
                <li key={z.zip}>
                  <button type="button" onClick={() => lookup(z.zip)} className="text-[11px] font-mono font-bold px-2 py-1 rounded-md" style={{ background: "white", color: T.blueDeep, border: `1px solid ${T.border}` }}>
                    {z.zip} <span className="opacity-60 tabular-nums">({z.deliveries})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topZips.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
              Top ZIPs by bureau activity — pick one to flyer
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {topZips.map((z) => (
                <li key={z.zip}>
                  <button type="button" onClick={() => lookup(z.zip)} className="text-[11px] font-mono font-bold px-2 py-1 rounded-md" style={{ background: "white", color: T.blueDeep, border: `1px solid ${T.border}` }}>
                    {z.zip} <span className="opacity-60 tabular-nums">{z.pct}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ─── Flyer canvas ─── 8.5×11 Letter, mostly visible on screen
            via a tighter scale; print CSS clamps to actual paper size. */}
      {intel && (
        <Flyer zip={intel.zip} cityLabel={cityLabel} />
      )}
    </div>
  );
}

function zipCityLabel(zip: string): string {
  if (!zip) return "";
  if (zip.startsWith("916")) return "North Hollywood / Valley";
  if (zip.startsWith("914")) return "San Fernando Valley";
  if (zip.startsWith("913")) return "Glendale / Burbank";
  if (zip.startsWith("900")) return "Los Angeles";
  if (zip.startsWith("902")) return "Beverly Hills / Westside";
  if (zip.startsWith("9")) return "Greater LA";
  return "";
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[20px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

// 8.5×11 letter-sized print-ready flyer. We render at scale on screen
// (max 540px wide) but @page rules + flyer-print class clamp to the
// actual paper size when printing.
function Flyer({ zip, cityLabel }: { zip: string; cityLabel: string }) {
  const utmUrl = `https://nohomailbox.org/?utm_source=flyer&utm_medium=print&utm_campaign=zip${zip}`;
  // Inline QR via a public no-CORS service. We could swap to qrcode lib
  // later if we want to render server-side, but inline keeps the
  // component self-contained.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(utmUrl)}&color=2D100F&bgcolor=F7E6C2`;

  return (
    <div
      className="flyer-print mx-auto rounded-2xl overflow-hidden"
      style={{
        width: "min(100%, 540px)",
        aspectRatio: "8.5 / 11",
        background: NOHO_CREAM,
        boxShadow: "0 18px 50px rgba(45,16,15,0.25)",
        position: "relative",
        padding: 0,
        color: NOHO_INK,
      }}
    >
      <div
        style={{
          width: "100%", height: "100%",
          position: "relative",
          padding: "8% 8% 6%",
          display: "flex", flexDirection: "column", gap: "3%",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        }}
      >
        {/* Decorative corners */}
        <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "30%", aspectRatio: "1", background: `radial-gradient(circle at top right, ${NOHO_BLUE}40 0%, transparent 70%)` }} />
        <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, width: "40%", aspectRatio: "1", background: `radial-gradient(circle at bottom left, ${NOHO_BLUE_DEEP}30 0%, transparent 70%)` }} />

        {/* Eyebrow */}
        <p style={{ margin: 0, fontSize: "1.4cqw", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: NOHO_BLUE_DEEP, position: "relative", zIndex: 1 }}>
          NOHO Mailbox · Real street address
        </p>

        {/* Big headline */}
        <h1 style={{ margin: 0, fontSize: "5.5cqw", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.02, color: NOHO_INK, position: "relative", zIndex: 1 }}>
          Hello,
          <br />
          {cityLabel || "NoHo"} neighbors
          <br />
          at <span style={{ color: NOHO_BLUE }}>{zip}</span>.
        </h1>

        {/* Pitch */}
        <p style={{ margin: 0, fontSize: "1.9cqw", lineHeight: 1.45, fontWeight: 600, color: NOHO_INK, maxWidth: "85%", position: "relative", zIndex: 1 }}>
          Stop using a P.O. Box. Get a <strong>real street address</strong> at NOHO Mailbox — receive packages from <strong>any carrier</strong>, see scanned mail in your phone, and forward anywhere on demand.
        </p>

        {/* Three benefits */}
        <ul style={{
          margin: 0, padding: 0, listStyle: "none",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2%",
          position: "relative", zIndex: 1,
        }}>
          {[
            { e: "📦", h: "Every carrier", b: "USPS · UPS · FedEx · DHL · Amazon" },
            { e: "📱", h: "Mail in your phone", b: "Scans, forwarding, package alerts" },
            { e: "🏪", h: "Real address", b: "Use for biz, banking, ID" },
          ].map((b) => (
            <li key={b.h} style={{ background: "white", padding: "4% 4%", borderRadius: "1.5cqw", border: `1px solid ${NOHO_INK}10` }}>
              <span style={{ fontSize: "3.5cqw", display: "block" }}>{b.e}</span>
              <p style={{ margin: "2% 0 0", fontSize: "1.7cqw", fontWeight: 900, color: NOHO_INK }}>{b.h}</p>
              <p style={{ margin: "0.5% 0 0", fontSize: "1.3cqw", color: NOHO_INK + "B0" }}>{b.b}</p>
            </li>
          ))}
        </ul>

        {/* Pricing strip */}
        <div style={{
          background: NOHO_INK, color: NOHO_CREAM,
          padding: "3% 4%", borderRadius: "1.5cqw",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3%",
          flexWrap: "wrap",
          position: "relative", zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "1.3cqw", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.85 }}>
              Plans from
            </p>
            <p style={{ margin: "1% 0 0", fontSize: "5cqw", fontWeight: 900, letterSpacing: "-0.02em" }}>
              $50<span style={{ fontSize: "2cqw" }}>/mo</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "3%", flexWrap: "wrap" }}>
            {["Basic · $50", "Business · $90", "Premium · $145"].map((tier) => (
              <span key={tier} style={{
                fontSize: "1.4cqw", fontWeight: 700,
                padding: "1.5% 3%", borderRadius: "999px",
                background: NOHO_CREAM, color: NOHO_INK,
              }}>
                {tier}
              </span>
            ))}
          </div>
        </div>

        {/* CTA + QR */}
        <div style={{
          marginTop: "auto",
          display: "grid", gridTemplateColumns: "1fr auto", gap: "5%",
          alignItems: "center",
          position: "relative", zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "1.3cqw", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
              Sign up online
            </p>
            <p style={{ margin: "1% 0 0", fontSize: "2.4cqw", fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.01em" }}>
              nohomailbox.org
            </p>
            <p style={{ margin: "1% 0 0", fontSize: "1.5cqw", fontWeight: 700, color: NOHO_INK }}>
              5062 Lankershim Blvd · North Hollywood, CA 91601
            </p>
            <p style={{ margin: "0.5% 0 0", fontSize: "1.5cqw", fontWeight: 700, color: NOHO_INK }}>
              (818) 506-7744
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="" style={{
            width: "16cqw", height: "16cqw",
            background: NOHO_CREAM,
            padding: "2%",
            borderRadius: "1.5cqw",
            border: `2px solid ${NOHO_INK}`,
          }} />
        </div>
      </div>
    </div>
  );
}
