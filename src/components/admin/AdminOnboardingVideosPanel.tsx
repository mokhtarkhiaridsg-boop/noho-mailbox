"use client";

/**
 * iter-148 — Onboarding video CRUD panel (Tier 9 #58).
 */

import { useEffect, useState, useTransition } from "react";
import {
  listOnboardingVideos,
  upsertOnboardingVideo,
  deleteOnboardingVideo,
  type OnboardingVideoRow,
} from "@/app/actions/onboardingVideos";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  danger: "#EF4444",
};

export default function AdminOnboardingVideosPanel() {
  const [rows, setRows] = useState<OnboardingVideoRow[] | null>(null);
  const [editing, setEditing] = useState<OnboardingVideoRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void listOnboardingVideos().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onDelete(row: OnboardingVideoRow) {
    if (!confirm(`Delete "${row.title}"? View history for ${row.totalViewers} viewer${row.totalViewers === 1 ? "" : "s"} will be lost.`)) return;
    startTransition(async () => {
      const res = await deleteOnboardingVideo(row.id);
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Customers · Onboarding videos
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Welcome video walkthrough
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Curate the playlist new members see in their first week. Day 0 / Day 2 / Day 5 welcome emails link them straight here.
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          + Add video
        </button>
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No videos yet — click +Add video to start the playlist.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const completionPct = r.totalViewers > 0 ? Math.round((r.totalCompleted / r.totalViewers) * 100) : 0;
            return (
              <li key={r.id} className="rounded-2xl p-3 flex items-start gap-3" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: r.isActive ? 1 : 0.55 }}>
                {r.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.posterUrl} alt="" className="shrink-0 w-24 h-14 object-cover rounded-lg" style={{ border: `1px solid ${T.border}` }} />
                ) : (
                  <div className="shrink-0 w-24 h-14 rounded-lg flex items-center justify-center text-[18px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px solid ${T.border}` }}>▶</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkFaint }}>
                      /{r.slug}
                    </span>
                    {!r.isActive && (
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)", color: T.inkFaint }}>
                        paused
                      </span>
                    )}
                  </div>
                  {r.description && <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: T.inkSoft }}>{r.description}</p>}
                  <p className="text-[10.5px] mt-1" style={{ color: T.inkFaint }}>
                    Order: {r.sortIndex} · {r.durationSec > 0 ? `${Math.round(r.durationSec / 60)} min` : "duration not set"} · {r.totalViewers} viewer{r.totalViewers === 1 ? "" : "s"} · {r.totalCompleted} completed ({completionPct}%)
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  <button type="button" onClick={() => setEditing(r)} className="text-[10.5px] font-black px-2 py-1 rounded-md text-white" style={{ background: T.blue }}>
                    Edit
                  </button>
                  <button type="button" disabled={pending} onClick={() => onDelete(r)} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <VideoEditor row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}

function VideoEditor({ row, onClose, onSaved }: {
  row: OnboardingVideoRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(row?.videoUrl ?? "");
  const [posterUrl, setPosterUrl] = useState(row?.posterUrl ?? "");
  const [durationSec, setDurationSec] = useState(row?.durationSec ?? 0);
  const [sortIndex, setSortIndex] = useState(row?.sortIndex ?? 0);
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await upsertOnboardingVideo({
        id: row?.id, slug, title,
        description: description.trim() || undefined,
        videoUrl,
        posterUrl: posterUrl.trim() || undefined,
        durationSec, sortIndex, isActive,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              {row ? "Edit video" : "Add video"}
            </p>
            <h3 className="text-lg font-black" style={{ color: T.ink }}>{row?.title ?? "New playlist entry"}</h3>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome to NOHO Mailbox" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Slug *">
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="welcome-intro" className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="One-line summary the customer sees" className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="Video URL *">
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://… (mp4, YouTube embed, Vimeo)" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <Field label="Poster URL (optional)">
            <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://… (thumbnail image)" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Duration (sec)">
              <input type="number" min={0} value={durationSec} onChange={(e) => setDurationSec(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Sort order">
              <input type="number" min={0} value={sortIndex} onChange={(e) => setSortIndex(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#1976FF]" />
                Visible to members
              </label>
            </Field>
          </div>
          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
        </div>

        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSave} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {pending ? "Saving…" : row ? "Save changes" : "Create video"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
