"use client";

/**
 * iter-207 — Member opt-in card for the lobby selfie wall (Tier 15 #116).
 *
 * Shows current state (none / Pending / Approved) + opt-in form
 * (photo URL + display-name override + consent checkbox) + revoke
 * button. Renders in member dashboard SettingsPanel.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyLobbyWallEntry,
  optInToLobbyWall,
  revokeMyLobbyWallEntry,
  type LobbyWallEntryView,
} from "@/app/actions/lobbyWall";

export default function LobbyWallOptInCard() {
  const [entry, setEntry] = useState<LobbyWallEntryView | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void getMyLobbyWallEntry().then(setEntry).catch(() => setEntry(null));
  }
  useEffect(refresh, []);

  function onSubmit() {
    setError(null); setInfo(null);
    if (!consent) { setError("Please confirm consent before opting in."); return; }
    if (!photoUrl.trim()) { setError("Photo URL required."); return; }
    startTransition(async () => {
      const res = await optInToLobbyWall({ photoUrl: photoUrl.trim(), displayName: displayName.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo("✓ Submitted! Admin will review and approve shortly.");
      setShowForm(false); setPhotoUrl(""); setDisplayName(""); setConsent(false);
      refresh();
    });
  }

  function onRevoke() {
    if (!confirm("Remove your photo from the wall? You can opt back in anytime.")) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await revokeMyLobbyWallEntry();
      if (res.error) { setError(res.error); return; }
      setInfo("Removed from the wall");
      refresh();
    });
  }

  if (entry === undefined) return null;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
          <span>📷</span> Lobby Selfie Wall
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Opt in to be featured on the public <a href="/wall" target="_blank" rel="noopener noreferrer" className="font-bold" style={{ color: BRAND.blueDeep }}>community wall</a> + the lobby kiosk loop. We&apos;ll show your first name + suite # + "since {new Date().getFullYear()}" sticker.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      {entry ? (
        <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          <div className="flex items-start gap-3 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: `1px solid ${BRAND.border}` }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                style={{ background: entry.status === "Approved" ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.10)", color: entry.status === "Approved" ? "#15803d" : "#92400e" }}>
                {entry.status === "Approved" ? "✓ Live on the wall" : "⏳ Awaiting admin review"}
              </p>
              <p className="text-[12.5px] font-black mt-1" style={{ color: BRAND.ink }}>{entry.displayName}</p>
              <p className="text-[10.5px]" style={{ color: BRAND.inkFaint }}>
                Submitted {new Date(entry.consentedAtIso).toLocaleDateString()}
                {entry.suiteNumber && <span className="font-mono"> · #{entry.suiteNumber}</span>}
                {" · since "}{entry.joinedYear}
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            <button type="button" onClick={() => setShowForm(true)} disabled={busy}
              className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
              style={{ background: BRAND.bg, color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
              Update photo
            </button>
            <button type="button" onClick={onRevoke} disabled={busy}
              className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
              Remove from wall
            </button>
          </div>
        </div>
      ) : !showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="text-xs font-black px-4 py-2 rounded-xl text-white" style={{ background: BRAND.blue }}>
          Opt in to the wall
        </button>
      ) : null}

      {showForm && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Photo URL *</p>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={600}
              placeholder="https://… (square crop works best)"
              className="w-full rounded-lg px-3 py-2 text-[12px] font-mono" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
          </div>
          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Display name (optional override)</p>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
              placeholder="defaults to your first name"
              className="w-full rounded-lg px-3 py-2 text-[12px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
          </div>
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-[11px]" style={{ color: BRAND.inkSoft }}>
              I consent to have this photo displayed on the public community wall and the lobby kiosk loop. I can revoke anytime.
            </span>
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="text-xs font-bold" style={{ color: BRAND.inkFaint }}>Cancel</button>
            <button type="button" onClick={onSubmit} disabled={busy || !consent || !photoUrl.trim()}
              className="text-xs font-black px-4 py-1.5 rounded-xl text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {busy ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
