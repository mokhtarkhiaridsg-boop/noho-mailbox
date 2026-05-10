"use client";

/**
 * iter-221 — Member opt-in to bureau-wide junk sharing (Tier 16 #130).
 *
 * Tiny settings card with a toggle. When ON, mail from senders the
 * bureau has flagged via crowdsourced learning (≥10 unique reporters)
 * gets auto-marked junkBlocked at intake.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getMyJunkSharingPreference, setMyJunkSharingPreference } from "@/app/actions/bureauJunkSenders";

export default function JunkSharingCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    void getMyJunkSharingPreference().then((r) => setEnabled(r.enabled)).catch(() => setEnabled(true));
  }, []);

  if (enabled === null) return null;

  function toggle() {
    startTransition(async () => {
      const next = !enabled;
      const res = await setMyJunkSharingPreference({ enabled: next });
      if (res.success) setEnabled(next);
    });
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
            🤝 Shared junk learning
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            When other NOHO members tag a sender as junk 10+ times, we auto-block that sender for you too. Lifts the work from your shoulders.
          </p>
        </div>
        <button type="button" onClick={toggle} disabled={busy}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50"
          style={{
            background: enabled ? "#15803d" : "white",
            color: enabled ? "white" : BRAND.inkSoft,
            border: `1px solid ${enabled ? "#15803d" : BRAND.border}`,
          }}>
          {enabled ? "✓ Enabled" : "Off — enable"}
        </button>
      </div>
    </div>
  );
}
