"use client";

/**
 * iter-148 — Member-facing welcome video walkthrough (Tier 9 #58).
 *
 * Renders the active onboarding playlist with per-video progress bars.
 * Click any tile to open the inline player; player posts progress at
 * 25/50/75/100 thresholds via `recordVideoView`. Completed videos get
 * a green check + "Watched" badge.
 */

import { useEffect, useRef, useState } from "react";
import { BRAND } from "./types";
import {
  getMyOnboardingPlaylist,
  recordVideoView,
  type MemberPlaylistEntry,
} from "@/app/actions/onboardingVideos";

export default function WelcomePanel() {
  const [items, setItems] = useState<MemberPlaylistEntry[] | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  function refresh() {
    void getMyOnboardingPlaylist().then(setItems).catch(() => setItems([]));
  }
  useEffect(refresh, []);

  const open = items?.find((i) => i.slug === openSlug) ?? null;
  const total = items?.length ?? 0;
  const completed = items?.filter((i) => i.completed).length ?? 0;
  const overallPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl p-6 sm:p-7" style={{ background: "linear-gradient(180deg, #FFFCF3 0%, #FBFAF6 100%)", border: `1px solid ${BRAND.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.blueDeep }}>
          Welcome walkthrough
        </p>
        <h2 className="text-2xl font-black mt-1" style={{ color: BRAND.ink, letterSpacing: "-0.01em" }}>
          {completed === total && total > 0 ? "All caught up — nice." : "Get the most out of your mailbox in 5 minutes"}
        </h2>
        <p className="text-[12.5px] mt-1" style={{ color: BRAND.inkSoft }}>
          A short playlist from the team. Watch in any order — your progress is saved.
        </p>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkFaint }}>
                Progress
              </span>
              <span className="text-[11.5px] font-bold" style={{ color: BRAND.blueDeep }}>
                {completed} / {total} watched · {overallPct}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(45,16,15,0.06)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.blueDeep})` }} />
            </div>
          </div>
        )}
      </section>

      {items == null ? (
        <p className="text-[12px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl px-4 py-8 text-center text-[12.5px]" style={{ background: "white", color: BRAND.inkFaint, border: `1px dashed ${BRAND.border}` }}>
          No videos in the playlist yet — check back soon.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setOpenSlug(v.slug)}
                className="w-full text-left rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, boxShadow: "var(--shadow-cream-sm)" }}
              >
                <div className="relative aspect-video" style={{ background: BRAND.bgDeep }}>
                  {v.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[40px]" style={{ color: BRAND.inkFaint }}>▶</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.30)" }}>
                    <span className="text-white text-[36px]">▶</span>
                  </div>
                  {v.completed && (
                    <span className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ background: "#16A34A", boxShadow: "0 2px 8px rgba(22,163,74,0.4)" }}>
                      ✓ Watched
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[13px] font-black truncate" style={{ color: BRAND.ink }}>{v.title}</p>
                  {v.description && <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: BRAND.inkSoft }}>{v.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(45,16,15,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${v.percentWatched}%`, background: v.completed ? "#16A34A" : BRAND.blue }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: BRAND.inkFaint, minWidth: "2.5em", textAlign: "right" }}>
                      {v.percentWatched}%
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <VideoPlayerModal
          entry={open}
          onClose={() => { setOpenSlug(null); refresh(); }}
        />
      )}
    </div>
  );
}

function VideoPlayerModal({ entry, onClose }: { entry: MemberPlaylistEntry; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportedPct = useRef(entry.percentWatched);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onTimeUpdate() {
      if (!v) return;
      if (!Number.isFinite(v.duration) || v.duration <= 0) return;
      const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
      // Report only when we've crossed a 25% threshold (incl. 100).
      const lastBucket = Math.floor(lastReportedPct.current / 25);
      const newBucket = Math.floor(pct / 25);
      if (newBucket > lastBucket || pct >= 95 && lastReportedPct.current < 95) {
        lastReportedPct.current = pct;
        void recordVideoView({ videoSlug: entry.slug, percentWatched: pct });
      }
    }
    function onEnded() {
      lastReportedPct.current = 100;
      void recordVideoView({ videoSlug: entry.slug, percentWatched: 100 });
    }
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, [entry.slug]);

  // YouTube/Vimeo iframe embeds can't be progress-tracked — render an
  // iframe with a "mark as watched" button under it.
  const isIframe = /youtube\.com|youtu\.be|vimeo\.com/.test(entry.videoUrl);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.85)" }} onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden" style={{ background: "#000" }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-white"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)" }}
        >
          ✕
        </button>
        <div className="aspect-video w-full bg-black">
          {isIframe ? (
            <iframe
              src={entry.videoUrl}
              title={entry.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={entry.videoUrl}
              poster={entry.posterUrl ?? undefined}
              controls
              autoPlay
              className="w-full h-full"
            />
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: "white" }}>
          <div className="min-w-0">
            <p className="text-[14px] font-black truncate" style={{ color: BRAND.ink }}>{entry.title}</p>
            {entry.description && <p className="text-[11.5px] truncate" style={{ color: BRAND.inkFaint }}>{entry.description}</p>}
          </div>
          {isIframe && !entry.completed && (
            <button
              type="button"
              onClick={async () => {
                await recordVideoView({ videoSlug: entry.slug, percentWatched: 100 });
                onClose();
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11.5px] font-black text-white"
              style={{ background: "#16A34A" }}
            >
              ✓ Mark as watched
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
