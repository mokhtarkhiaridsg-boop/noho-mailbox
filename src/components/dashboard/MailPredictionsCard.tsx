"use client";

/**
 * iter-204 — Sender-side mail predictions card (Tier 14 #113).
 *
 * Surfaces the top 3-6 predicted incoming senders with confidence
 * chip + estimated arrival window + "Set up auto-forward" CTA that
 * deep-links to the forwarding settings panel. Renders ZERO when the
 * member has no predictions (new accounts or sparse senders).
 */

import { useEffect, useState } from "react";
import { BRAND } from "./types";
import { getMyMailPredictions, type MailPrediction } from "@/app/actions/mailPredictions";

const CAT_META: Record<MailPrediction["category"], { emoji: string; label: string }> = {
  package: { emoji: "📦", label: "Package" },
  letter:  { emoji: "✉️", label: "Letter" },
  mixed:   { emoji: "📬", label: "Mixed" },
};

const CONF_META: Record<MailPrediction["confidenceLabel"], { bg: string; fg: string; label: string }> = {
  high:   { bg: "rgba(34,197,94,0.12)",  fg: "#15803d", label: "High confidence" },
  medium: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Likely" },
  low:    { bg: "rgba(122,130,144,0.10)", fg: "#3B4252", label: "Possible" },
};

export default function MailPredictionsCard() {
  const [rows, setRows] = useState<MailPrediction[] | null>(null);

  useEffect(() => {
    void getMyMailPredictions().then(setRows).catch(() => setRows([]));
  }, []);

  if (rows == null || rows.length === 0) return null;

  const inHorizon = rows.filter((r) => r.withinHorizon);
  const others = rows.filter((r) => !r.withinHorizon);

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Smart predictions · Inbound mail
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            Based on your history, here&apos;s what&apos;s likely coming
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            We track which senders mail you regularly and forecast the next arrival window. Pre-stage forwarding for snowbird season or a trip — no surprises.
          </p>
        </div>
      </div>

      {inHorizon.length > 0 && (
        <ul className="mt-3 space-y-2">
          {inHorizon.map((r) => <PredictionRow key={r.normalizedSender} r={r} highlight />)}
        </ul>
      )}
      {others.length > 0 && (
        <details className="mt-3">
          <summary className="text-[11px] font-bold cursor-pointer inline-block" style={{ color: BRAND.inkSoft }}>
            ↓ {others.length} more recurring sender{others.length === 1 ? "" : "s"} (further out than 14d)
          </summary>
          <ul className="mt-2 space-y-2">
            {others.map((r) => <PredictionRow key={r.normalizedSender} r={r} />)}
          </ul>
        </details>
      )}
    </section>
  );
}

function PredictionRow({ r, highlight }: { r: MailPrediction; highlight?: boolean }) {
  const cat = CAT_META[r.category];
  const conf = CONF_META[r.confidenceLabel];
  const windowStart = new Date(r.windowStartIso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const windowEnd = new Date(r.windowEndIso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const sameDay = windowStart === windowEnd;

  return (
    <li className="rounded-xl p-3 flex items-start justify-between gap-2 flex-wrap"
      style={{ background: highlight ? "rgba(51,116,133,0.06)" : "white", border: `1px solid ${highlight ? BRAND.blue : BRAND.border}` }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: BRAND.brownSoft, color: BRAND.inkSoft }}>
            {cat.emoji} {cat.label}
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.10em]" style={{ background: conf.bg, color: conf.fg }}>
            {conf.label}
          </span>
          <span className="text-[10px]" style={{ color: BRAND.inkFaint }}>· {Math.round(r.confidence * 100)}%</span>
        </div>
        <p className="text-[12.5px] font-black mt-1 truncate" style={{ color: BRAND.ink }}>
          {r.senderDisplay}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          {r.daysUntilEstimate === 0 ? "Expected today or tomorrow" : `Expected in ~${r.daysUntilEstimate}d`}
          {!sameDay && <> · window: {windowStart} → {windowEnd}</>}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>
          {r.arrivalCount} arrivals in last 180d · every ~{r.avgCadenceDays}d {r.cadenceStdDevDays > 0 && `(±${r.cadenceStdDevDays}d)`}
        </p>
      </div>
      <a href="/dashboard?tab=settings" className="text-[10.5px] font-black px-2.5 py-1 rounded-md text-white shrink-0" style={{ background: BRAND.blue, textDecoration: "none" }}>
        Pre-forward →
      </a>
    </li>
  );
}
