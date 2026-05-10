"use client";

/**
 * iter-236 — Member-side weekly outbound digest opt-in card.
 *
 * Toggle: send me a Sunday-morning email recap of every package I
 * shipped via NOHO this week. Preview button shows what next Sunday's
 * email would look like (count + total spent + recipient list); also
 * "Send me one now" for instant gratification.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyOutboundDigestPreview,
  setMyOutboundDigestOptIn,
  sendMyOutboundDigestNow,
  type OutboundDigestPreview,
} from "@/app/actions/outboundDigest";

export default function OutboundDigestCard() {
  const [view, setView] = useState<OutboundDigestPreview | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void getMyOutboundDigestPreview().then(setView).catch(() => setView(null));
  }
  useEffect(refresh, []);

  function toggle(next: boolean) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setMyOutboundDigestOptIn({ optIn: next });
      if (res.error) setError(res.error);
      else { setInfo(next ? "✓ Subscribed · first digest fires next Sunday" : "✓ Unsubscribed"); refresh(); }
    });
  }

  function sendNow() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await sendMyOutboundDigestNow();
      if (res.error) setError(res.error);
      else setInfo(`✓ Recap of ${res.count} package${res.count === 1 ? "" : "s"} sent to your email`);
    });
  }

  if (!view) return null;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.blueDeep }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blueDeep, boxShadow: `0 0 6px ${BRAND.blueDeep}` }} />
          📦 Weekly shipment digest
        </p>
        <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
          Sunday-morning recap of everything you shipped
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          One clean email every Sunday with carrier, tracking, recipient, cost, and receipt link for every package you shipped that week. Bookmark for tax records.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

      <label className="mt-3 flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={view.optIn} onChange={(e) => toggle(e.target.checked)} disabled={busy} className="w-4 h-4 accent-[#337485]" />
        <span className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>
          Send me the weekly digest
        </span>
        {view.lastSentAtIso && (
          <span className="text-[10.5px] ml-2" style={{ color: BRAND.inkFaint }}>
            · last sent {new Date(view.lastSentAtIso).toLocaleDateString()}
          </span>
        )}
      </label>

      {/* Preview tile */}
      <div className="mt-3 rounded-xl p-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
        <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: BRAND.inkFaint }}>
          Preview · this week ({new Date(view.windowStartIso).toLocaleDateString()} → {new Date(view.windowEndIso).toLocaleDateString()})
        </p>
        <div className="mt-2 flex items-baseline gap-3 flex-wrap">
          <p className="font-mono font-black tabular-nums" style={{ fontSize: 24, color: BRAND.blue }}>{view.count}</p>
          <p className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>package{view.count === 1 ? "" : "s"}</p>
          {view.count > 0 && (
            <>
              <span style={{ color: BRAND.inkFaint }}>·</span>
              <p className="font-mono font-black" style={{ fontSize: 18, color: "#15803d" }}>${(view.totalCents / 100).toFixed(2)}</p>
              <p className="text-[11px] font-bold" style={{ color: BRAND.inkSoft }}>postage</p>
            </>
          )}
        </div>
        {view.rows.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {view.rows.slice(0, 5).map((r) => (
              <li key={r.id} className="text-[11px] flex items-center justify-between gap-2" style={{ color: BRAND.inkSoft }}>
                <span className="truncate"><span className="font-mono" style={{ color: BRAND.blueDeep }}>{r.carrier}</span> · {r.toName} · {r.toCity}, {r.toState}</span>
                <span className="font-mono font-bold shrink-0" style={{ color: BRAND.ink }}>${(r.amountPaidCents / 100).toFixed(2)}</span>
              </li>
            ))}
            {view.rows.length > 5 && <li className="text-[10.5px] italic" style={{ color: BRAND.inkFaint }}>+ {view.rows.length - 5} more in the email</li>}
          </ul>
        ) : (
          <p className="text-[11px] mt-2 italic" style={{ color: BRAND.inkFaint }}>No outbound shipments this week. The digest only fires when there's something to recap.</p>
        )}
        {view.count > 0 && (
          <button type="button" onClick={sendNow} disabled={busy}
            className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: "white", color: BRAND.blue, border: `1px solid ${BRAND.blue}40` }}>
            ✉ Send me one now
          </button>
        )}
      </div>
    </section>
  );
}
