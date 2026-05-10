"use client";

/**
 * iter-209 — Mailbox neighbor introductions panel (Tier 15 #118).
 *
 * Reciprocal opt-in directory. If member hasn't opted in: shows
 * opt-in CTA with bio editor. If opted in: shows directory + per-
 * neighbor "Send a message" modal that relays through server.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyNeighborProfile,
  upsertMyNeighborProfile,
  optOutMyNeighborProfile,
  listNeighbors,
  messageNeighbor,
  type NeighborProfileView,
  type ListNeighborsResult,
} from "@/app/actions/neighbors";

export default function NeighborsPanel() {
  const [me, setMe] = useState<NeighborProfileView | null | undefined>(undefined);
  const [list, setList] = useState<ListNeighborsResult | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile editor
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // DM modal
  const [dmTarget, setDmTarget] = useState<NeighborProfileView | null>(null);
  const [dmSubject, setDmSubject] = useState("");
  const [dmBody, setDmBody] = useState("");

  function refresh() {
    void getMyNeighborProfile().then(setMe).catch(() => setMe(null));
    void listNeighbors().then(setList).catch(() => setList({ optedIn: false, count: 0, neighbors: [] }));
  }
  useEffect(refresh, []);

  function openEditor() {
    setDisplayName(me?.displayName ?? "");
    setBio(me?.bio ?? "");
    setPhotoUrl(me?.photoUrl ?? "");
    setEditing(true);
  }

  function onSave() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await upsertMyNeighborProfile({ displayName, bio, photoUrl: photoUrl.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo("✓ Profile saved · you're in the directory");
      setEditing(false);
      refresh();
    });
  }

  function onOptOut() {
    if (!confirm("Hide your profile from the directory? You can re-opt in anytime.")) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await optOutMyNeighborProfile();
      if (res.error) { setError(res.error); return; }
      setInfo("Profile hidden");
      refresh();
    });
  }

  function onSendDm() {
    if (!dmTarget) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await messageNeighbor({ targetUserId: dmTarget.userId, subject: dmSubject, body: dmBody });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Sent to ${dmTarget.displayName}`);
      setDmTarget(null); setDmSubject(""); setDmBody("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-white border p-6" style={{ borderColor: BRAND.border }}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          Community · Neighbors
        </p>
        <h2 className="text-xl font-black tracking-tight mt-1" style={{ color: BRAND.ink }}>Your bureau neighbors</h2>
        <p className="text-[12px] mt-1" style={{ color: BRAND.inkSoft }}>
          Opt in to meet other NOHO members. You&apos;ll see their first name + suite # + bio, and you can DM them through us — no email addresses ever shared. Reciprocal: only opted-in members can see each other.
        </p>

        {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
        {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

        {/* My profile */}
        <div className="mt-4">
          {me === undefined ? (
            <p className="text-[12px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
          ) : !me || me.status === "Hidden" ? (
            !editing ? (
              <button type="button" onClick={openEditor} className="text-xs font-black px-4 py-2 rounded-xl text-white" style={{ background: BRAND.blue }}>
                {me?.status === "Hidden" ? "Re-open my profile" : "Opt in to the directory"}
              </button>
            ) : (
              <ProfileEditor displayName={displayName} setDisplayName={setDisplayName} bio={bio} setBio={setBio} photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} busy={busy} onSave={onSave} onCancel={() => setEditing(false)} />
            )
          ) : (
            <div className="rounded-xl p-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
              <div className="flex items-start gap-3 flex-wrap">
                {me.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover" style={{ border: `1px solid ${BRAND.border}` }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>✓ Visible to neighbors</p>
                  <p className="text-[14px] font-black mt-1" style={{ color: BRAND.ink }}>{me.displayName}</p>
                  <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>
                    {me.suiteNumber && <span className="font-mono">#{me.suiteNumber} · </span>}since {me.joinedYear}
                  </p>
                  <p className="text-[12px] mt-1 italic" style={{ color: BRAND.inkSoft }}>“{me.bio}”</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!editing && <button type="button" onClick={openEditor} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>Edit</button>}
                  <button type="button" onClick={onOptOut} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>Hide profile</button>
                </div>
              </div>
              {editing && <div className="mt-2"><ProfileEditor displayName={displayName} setDisplayName={setDisplayName} bio={bio} setBio={setBio} photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} busy={busy} onSave={onSave} onCancel={() => setEditing(false)} /></div>}
            </div>
          )}
        </div>
      </div>

      {/* Directory */}
      <div className="rounded-3xl bg-white border p-6" style={{ borderColor: BRAND.border }}>
        <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>The directory</h3>
        {!list ? (
          <p className="text-[12px] mt-2" style={{ color: BRAND.inkFaint }}>Loading…</p>
        ) : !list.optedIn ? (
          <p className="text-[12px] mt-2" style={{ color: BRAND.inkSoft }}>Opt in above to unlock the directory.</p>
        ) : list.neighbors.length === 0 ? (
          <p className="text-[12px] italic mt-2" style={{ color: BRAND.inkSoft }}>You&apos;re the first to opt in. Encourage your bureau-mates!</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {list.neighbors.map((n) => (
              <li key={n.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
                {n.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" style={{ border: `1px solid ${BRAND.border}` }} />
                ) : (
                  <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-[16px] font-black" style={{ background: BRAND.blueSoft, color: BRAND.blueDeep, border: `1px solid ${BRAND.border}` }}>
                    {n.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{n.displayName}</p>
                  <p className="text-[10.5px]" style={{ color: BRAND.inkFaint }}>
                    {n.suiteNumber && <span className="font-mono">#{n.suiteNumber} · </span>}since {n.joinedYear}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: BRAND.inkSoft }}>{n.bio}</p>
                </div>
                <button type="button" onClick={() => { setDmTarget(n); setDmSubject(""); setDmBody(""); }} disabled={busy}
                  className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white shrink-0 disabled:opacity-50" style={{ background: BRAND.blue }}>
                  ✉️ Message
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DM modal */}
      {dmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }} onClick={() => setDmTarget(null)}>
          <div className="rounded-2xl bg-white max-w-md w-full p-5" style={{ border: `1px solid ${BRAND.border}` }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[0.20em]" style={{ color: BRAND.blueDeep }}>📬 Send a message to a neighbor</p>
            <h3 className="text-base font-black mt-1" style={{ color: BRAND.ink }}>Hi, {dmTarget.displayName}</h3>
            <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkFaint }}>Goes to their NOHO email. Their address is never shared with you.</p>
            <div className="mt-3 space-y-2">
              <input value={dmSubject} onChange={(e) => setDmSubject(e.target.value)} maxLength={100}
                placeholder="Subject"
                className="w-full rounded-lg px-3 py-2 text-[13px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              <textarea value={dmBody} onChange={(e) => setDmBody(e.target.value)} maxLength={1500} rows={5}
                placeholder="Hi! I'm in suite #X — wanted to introduce myself…"
                className="w-full rounded-lg px-3 py-2 text-[12.5px] resize-none" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              <p className="text-[9.5px] text-right" style={{ color: BRAND.inkFaint }}>{dmBody.length}/1500</p>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setDmTarget(null)} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ color: BRAND.inkSoft, background: "transparent" }}>Cancel</button>
              <button type="button" onClick={onSendDm} disabled={busy || !dmSubject.trim() || !dmBody.trim()}
                className="text-[11.5px] font-black px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
                {busy ? "Sending…" : "Send →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileEditor({ displayName, setDisplayName, bio, setBio, photoUrl, setPhotoUrl, busy, onSave, onCancel }: {
  displayName: string; setDisplayName: (s: string) => void;
  bio: string; setBio: (s: string) => void;
  photoUrl: string; setPhotoUrl: (s: string) => void;
  busy: boolean; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
      <div>
        <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Display name *</p>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
          placeholder="e.g. Karim S."
          className="w-full rounded-lg px-3 py-2 text-[13px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
      </div>
      <div>
        <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Short bio (≤300 chars) *</p>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3}
          placeholder="e.g. Founder of a small candle brand · always need extra boxes"
          className="w-full rounded-lg px-3 py-2 text-[12.5px] resize-none" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        <p className="text-[9.5px] text-right" style={{ color: BRAND.inkFaint }}>{bio.length}/300</p>
      </div>
      <div>
        <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Photo URL (optional)</p>
        <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={600}
          placeholder="https://…"
          className="w-full rounded-lg px-3 py-2 text-[12px] font-mono" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs font-bold" style={{ color: BRAND.inkFaint }}>Cancel</button>
        <button type="button" onClick={onSave} disabled={busy || !displayName.trim() || !bio.trim()}
          className="text-xs font-black px-4 py-1.5 rounded-xl text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
