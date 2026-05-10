"use client";

/**
 * iter-210 — Admin printable QR-label generator for suite-info doors
 * (Tier 15 #119). Distinct from iter-182 AdminSuitePinsPanel which
 * manages per-suite sticky notes for intake.
 *
 * Two helpers:
 *   - "Print sheet" form: enter from/to suite range → opens
 *     /admin/print/suite-pins?from=N&to=M in a new tab for printing
 *   - "Try a single suite" form: enter one suite, see the resolved
 *     /suite-info URL (with token) — useful to test or share
 */

import { useState, useTransition } from "react";
import { getSuiteInfoUrl } from "@/app/actions/suiteInfo";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  warning: "#F59E0B",
  danger: "#EF4444",
  success: "#22C55E",
};

export default function AdminSuitePinLabelsPanel() {
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(24);
  const [single, setSingle] = useState("");
  const [singleUrl, setSingleUrl] = useState<{ url: string | null; configured: boolean } | null>(null);
  const [busy, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function lookupSingle() {
    if (!single.trim()) return;
    startTransition(async () => {
      const res = await getSuiteInfoUrl({ suiteNumber: single.trim() });
      setSingleUrl(res);
    });
  }
  function copyUrl() {
    if (!singleUrl?.url) return;
    void navigator.clipboard.writeText(singleUrl.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Suite Pin Labels
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          scan and go
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · Avery 5160 sheets
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: T.inkFaint }}>
          Print Avery-5160-format QR sticker sheets to affix to each mailbox door. When you scan a label with your phone, you see the assigned member&apos;s name + last pickup + open packages — no rummaging through the customer list during in-person pickup.
        </p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>📄 Print a sheet</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: T.inkSoft }}>
            From #
            <input type="number" min={1} max={9999} value={from} onChange={(e) => setFrom(parseInt(e.target.value, 10) || 1)}
              className="w-20 px-2 py-1 rounded-lg text-[12px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </label>
          <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: T.inkSoft }}>
            To #
            <input type="number" min={1} max={9999} value={to} onChange={(e) => setTo(parseInt(e.target.value, 10) || 1)}
              className="w-20 px-2 py-1 rounded-lg text-[12px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </label>
          <a href={`/admin/print/suite-pins?from=${from}&to=${to}`} target="_blank" rel="noopener noreferrer"
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue, textDecoration: "none" }}>
            Open print sheet ↗
          </a>
          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>{Math.max(0, to - from + 1)} labels · {Math.ceil(Math.max(0, to - from + 1) / 24)} page(s)</span>
        </div>
        <p className="text-[10.5px] mt-2" style={{ color: T.inkFaint }}>
          Sheet auto-fires the print dialog. Choose <strong>Save as PDF</strong> if you want to email to a print shop, or <strong>Print</strong> with your label printer + Avery 5160 sheets loaded.
        </p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>🔍 Try a single suite</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={single} onChange={(e) => setSingle(e.target.value)} placeholder="e.g. 042"
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono w-32" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <button type="button" onClick={lookupSingle} disabled={busy || !single.trim()}
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blueDeep }}>
            {busy ? "Looking…" : "Get URL"}
          </button>
        </div>
        {singleUrl && !singleUrl.configured && (
          <p className="text-[11.5px] font-semibold mt-2" style={{ color: T.danger }}>
            ⚠️ SUITE_INFO_TOKEN env var not set on the server. Configure it (any random 32+ char string) and reload.
          </p>
        )}
        {singleUrl?.url && (
          <div className="mt-2 space-y-1">
            <code className="block text-[10.5px] break-all rounded p-2 font-mono" style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}>
              {singleUrl.url}
            </code>
            <div className="flex gap-2">
              <button type="button" onClick={copyUrl} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white" style={{ background: copied ? T.success : T.blue }}>
                {copied ? "✓ Copied!" : "📋 Copy URL"}
              </button>
              <a href={singleUrl.url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}`, textDecoration: "none" }}>
                Open in new tab ↗
              </a>
            </div>
            <p className="text-[10px]" style={{ color: T.inkFaint }}>
              Token is suite-specific — a label printed for #042 won&apos;t work on #100. Rotate by changing SUITE_INFO_TOKEN on the server (and reprinting all labels).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
