"use client";

/**
 * iter-232 — Custom suite-pin slogan member card.
 *
 * Shown on the member dashboard (or settings panel). Live-preview shows
 * what the slogan will look like under the suite # on the printed
 * receipt + Avery 5160 sticker. 8 emoji presets one-tap fill the field.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMySuitePinSlogan,
  setMySuitePinSlogan,
  type SuitePinSloganView,
} from "@/app/actions/suitePinSlogan";
import { SLOGAN_PRESETS, SLOGAN_MAX_LEN, sanitizeSlogan } from "@/lib/suite-pin-slogan";

export default function SuitePinSloganCard() {
  const [view, setView] = useState<SuitePinSloganView | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    void getMySuitePinSlogan().then((v) => { setView(v); setDraft(v.slogan ?? ""); }).catch(() => setView({ slogan: null, suiteNumber: null, charsUsed: 0, charsRemaining: SLOGAN_MAX_LEN }));
  }
  useEffect(load, []);

  function onSave() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setMySuitePinSlogan({ slogan: draft });
      if (res.error) setError(res.error);
      else { setInfo(res.view?.slogan ? "✓ Slogan saved · prints on next receipt" : "✓ Slogan cleared"); setView(res.view ?? null); }
    });
  }

  function onClear() {
    setDraft("");
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setMySuitePinSlogan({ slogan: "" });
      if (res.error) setError(res.error);
      else { setInfo("✓ Slogan cleared"); setView(res.view ?? null); }
    });
  }

  function applyPreset(p: (typeof SLOGAN_PRESETS)[number]) {
    setDraft(`${p.emoji} ${p.text}`);
  }

  if (!view) return null;
  const cleaned = sanitizeSlogan(draft);
  const remaining = Math.max(0, SLOGAN_MAX_LEN - cleaned.length);
  const dirty = (cleaned || null) !== view.slogan;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#5B21B6" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#5B21B6", boxShadow: "0 0 6px #5B21B6" }} />
          🎨 Suite-pin slogan
        </p>
        <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
          Your 1-liner under the suite #
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Prints on every intake / pickup receipt + on the Avery 5160 sticker stuck to your mailbox door. Make it yours — emoji welcome.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

      {/* Live preview — mimics the printed sticker */}
      <div className="mt-3 p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: "#FFFEF5", border: "1px dashed #d1d5db" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: "#7A8290" }}>NOHO Mailbox</p>
          <p className="font-mono font-black tabular-nums" style={{ fontSize: 28, color: "#1F2937", lineHeight: 1, letterSpacing: "-0.02em" }}>#{view.suiteNumber ?? "—"}</p>
          {cleaned && <p className="italic" style={{ fontSize: 10, color: "#5B21B6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleaned}</p>}
          <p className="text-[8px] mt-1" style={{ color: "#7A8290" }}>Scan to verify</p>
        </div>
        <div style={{ width: 60, height: 60, background: "#000", borderRadius: 4, display: "grid", placeItems: "center" }}>
          <span style={{ color: "white", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>QR</span>
        </div>
      </div>

      {/* Preset chips */}
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: BRAND.inkSoft }}>One-tap presets</p>
        <div className="flex flex-wrap gap-1.5">
          {SLOGAN_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p)}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md"
              style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
              {p.emoji} {p.text}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="mt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="✨ Your slogan…"
          maxLength={SLOGAN_MAX_LEN + 20}
          className="w-full px-3 py-2 rounded-lg text-[13px]"
          style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px]">
          <span style={{ color: remaining < 10 ? "#b45309" : BRAND.inkFaint }}>
            {cleaned.length}/{SLOGAN_MAX_LEN} chars
          </span>
          <div className="flex gap-1.5">
            {view.slogan && (
              <button type="button" onClick={onClear} disabled={busy}
                className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                style={{ background: "white", color: "#b91c1c", border: "1px solid #EF444440" }}>
                Clear
              </button>
            )}
            <button type="button" onClick={onSave} disabled={busy || !dirty}
              className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: "#5B21B6" }}>
              {busy ? "Saving…" : view.slogan ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
