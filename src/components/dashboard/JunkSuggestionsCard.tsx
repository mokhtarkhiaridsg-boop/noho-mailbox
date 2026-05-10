"use client";

/**
 * iter-202 — Junk-rule promotion suggestion card (Tier 14 #111).
 *
 * Renders ZERO when the member has no pending suggestions (≥3 manual
 * junk reports for the same sender, no rule yet). When suggestions
 * exist, renders one card per sender with the count + a one-tap
 * "Yes, auto-discard" button → creates a real JunkSender rule via
 * the existing iter-149 path + marks reports promoted.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyJunkSuggestions,
  promoteJunkSuggestion,
  dismissJunkSuggestion,
  type JunkSuggestion,
} from "@/app/actions/junkReports";

export default function JunkSuggestionsCard() {
  const [suggestions, setSuggestions] = useState<JunkSuggestion[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void getMyJunkSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }
  useEffect(refresh, []);

  function onPromote(s: JunkSuggestion) {
    setInfo(null);
    startTransition(async () => {
      const res = await promoteJunkSuggestion({ normalizedSender: s.normalizedSender });
      if (res.success) {
        setInfo(`✓ Auto-discarding from "${s.senderDisplay}" going forward`);
        refresh();
      }
    });
  }
  function onDismiss(s: JunkSuggestion) {
    setInfo(null);
    startTransition(async () => {
      await dismissJunkSuggestion({ normalizedSender: s.normalizedSender });
      setInfo(`Dismissed — won't suggest "${s.senderDisplay}" again`);
      refresh();
    });
  }

  if (suggestions == null || suggestions.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border, background: "#FFFBEA" }}>
      <div className="flex items-start gap-2 flex-wrap mb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#92400e" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#F59E0B", boxShadow: "0 0 6px #F59E0B" }} />
            Smart suggestion · Junk learning
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            Want to auto-discard from {suggestions.length === 1 ? "this sender" : `these ${suggestions.length} senders`} going forward?
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            We noticed you&apos;ve blocked {suggestions[0]?.reportCount ?? 0}+ pieces from the same sender. One tap turns it into a permanent rule — or dismiss if it&apos;s a one-off.
          </p>
        </div>
      </div>

      {info && <p className="text-[11.5px] font-semibold mb-2" style={{ color: "#15803d" }}>{info}</p>}

      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.normalizedSender} className="rounded-xl p-3 flex items-start justify-between gap-2 flex-wrap"
            style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>
                {s.senderDisplay}
              </p>
              <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                Blocked <strong>{s.reportCount}×</strong> · first {new Date(s.firstReportedAtIso).toLocaleDateString()} · last {new Date(s.lastReportedAtIso).toLocaleDateString()}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>
                Future mail from this sender will be auto-marked junk and skipped during forwarding batches.
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => onPromote(s)} disabled={busy}
                className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
                ✓ Auto-discard
              </button>
              <button type="button" onClick={() => onDismiss(s)} disabled={busy}
                className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                style={{ background: "transparent", color: BRAND.inkFaint }}>
                Not now
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
