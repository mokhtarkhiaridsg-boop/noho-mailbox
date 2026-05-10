"use client";

/**
 * iter-224 — Member carrier-preference picker (Tier 16 #133).
 *
 * Card on SettingsPanel. 5-option chip selector (Cheapest is default).
 * On change, persists to User.preferredCarrier + revalidates dashboard.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyCarrierPreference,
  setMyCarrierPreference,
  CARRIER_OPTIONS,
  CARRIER_LABELS,
  type CarrierPreference,
} from "@/app/actions/carrierPreference";

export default function CarrierPreferenceCard() {
  const [preferred, setPreferred] = useState<CarrierPreference | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void getMyCarrierPreference().then((r) => setPreferred(r.preferred)).catch(() => setPreferred("Cheapest"));
  }, []);

  function pick(c: CarrierPreference) {
    if (c === preferred) return;
    setInfo(null);
    startTransition(async () => {
      const res = await setMyCarrierPreference({ preferred: c });
      if (res.success) {
        setPreferred(res.preferred);
        setInfo(c === "Cheapest" ? "✓ Back to lowest-cost across carriers" : `✓ Forwards default to ${c} when available`);
      }
    });
  }

  if (!preferred) return null;

  return (
    <div className="rounded-2xl p-4" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
          🚚 Preferred carrier
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          When forwarding mail (iter-129), we&apos;ll pick the cheapest option <em>within</em> your favorite carrier family. Falls back to global cheapest when your pick isn&apos;t available.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {CARRIER_OPTIONS.map((c) => {
          const meta = CARRIER_LABELS[c];
          const active = preferred === c;
          return (
            <button key={c} type="button" onClick={() => pick(c)} disabled={busy}
              className="rounded-xl p-2.5 flex flex-col items-center gap-0.5 disabled:opacity-50"
              style={{
                background: active ? BRAND.blue : "white",
                color: active ? "white" : BRAND.ink,
                border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
                cursor: "pointer",
              }}>
              <span style={{ fontSize: 18 }} aria-hidden>{meta.emoji}</span>
              <span className="text-[11.5px] font-black">{meta.label}</span>
              <span className="text-[9.5px]" style={{ color: active ? "rgba(255,255,255,0.85)" : BRAND.inkFaint, textAlign: "center", lineHeight: 1.2 }}>{meta.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
