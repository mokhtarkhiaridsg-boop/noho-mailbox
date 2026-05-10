"use client";

// iter-115 — Customer photo album panel.
//
// Grid of every package + scanned-mail photo for the member. Filter chips
// (All / Packages / Mail) + load-more pagination + click-for-lightbox.

import { useEffect, useMemo, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getMyPhotoAlbum, getMyPhotoAlbumGroupedBySender, type AlbumFilter, type AlbumPhoto, type AlbumSenderGroup } from "@/app/actions/photoAlbum";

type ViewMode = "flat" | "by-sender";

export default function PhotosPanel() {
  const [filter, setFilter] = useState<AlbumFilter>("all");
  const [view, setView] = useState<ViewMode>("flat");
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [pending, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<AlbumPhoto | null>(null);
  // iter-178 — sender-grouped state
  const [groups, setGroups] = useState<AlbumSenderGroup[] | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  function loadFirst(f: AlbumFilter) {
    setPhotos([]); setNextOffset(0);
    startTransition(async () => {
      const res = await getMyPhotoAlbum({ filter: f, offset: 0 });
      setPhotos(res.photos);
      setTotal(res.total);
      setNextOffset(res.nextOffset);
    });
  }

  function loadMore() {
    if (nextOffset == null) return;
    startTransition(async () => {
      const res = await getMyPhotoAlbum({ filter, offset: nextOffset });
      setPhotos((prev) => [...prev, ...res.photos]);
      setNextOffset(res.nextOffset);
    });
  }

  function loadGroups(f: AlbumFilter) {
    setGroups(null);
    startTransition(async () => {
      const res = await getMyPhotoAlbumGroupedBySender({ filter: f });
      setGroups(res.groups);
    });
  }

  useEffect(() => {
    if (view === "flat") loadFirst(filter);
    else loadGroups(filter);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [filter, view]);

  // iter-178 — When a group is opened, filter the flat photos list to
  // only that group's items. Avoids a second server roundtrip — we
  // already have full pagination on the flat side.
  const openGroup = useMemo(() => groups?.find((g) => g.key === openGroupKey) ?? null, [groups, openGroupKey]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          Mailbox · Photo album
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: BRAND.ink }}>Your mailbox photos</h2>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Every package exterior + scanned-mail image we've taken for you. Tap any photo to view full-size.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* iter-162 — Bulk ZIP download. The route GET-streams a ZIP
            of every photo on your account; opening in a new tab lets
            the browser handle the download dialog without disrupting
            the dashboard scroll. */}
        <a
          href="/api/photos/export"
          download
          className="ml-auto order-last sm:order-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-black"
          style={{
            background: "white",
            color: BRAND.blueDeep,
            border: `1px solid ${BRAND.blue}50`,
            textDecoration: "none",
            boxShadow: "0 1px 4px rgba(51,116,133,0.10)",
          }}
        >
          ⬇ Download all (.zip)
        </a>
        {(["all", "packages", "mail"] as AlbumFilter[]).map((f) => {
          const active = filter === f;
          const label = f === "all" ? "All" : f === "packages" ? "Packages" : "Mail";
          return (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: active ? BRAND.blue : "white",
                color: active ? "white" : BRAND.ink,
                border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
              }}>
              {label}
            </button>
          );
        })}
        {/* iter-178 — view toggle: flat grid vs sender-grouped */}
        <span className="w-px h-5 mx-0.5" style={{ background: BRAND.border }} />
        {(["flat", "by-sender"] as ViewMode[]).map((v) => {
          const active = view === v;
          const label = v === "flat" ? "📷 Grid" : "📁 By sender";
          return (
            <button key={v} type="button" onClick={() => { setView(v); setOpenGroupKey(null); }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: active ? BRAND.blueDeep : "white",
                color: active ? "white" : BRAND.ink,
                border: `1px solid ${active ? BRAND.blueDeep : BRAND.border}`,
              }}>
              {label}
            </button>
          );
        })}
        <span className="ml-2 text-[11px]" style={{ color: BRAND.inkSoft }}>
          {view === "flat"
            ? (pending && photos.length === 0 ? "Loading…" : `${photos.length} of ${total} photos`)
            : (pending && groups == null ? "Loading…" : `${groups?.length ?? 0} senders · ${(groups ?? []).reduce((s, g) => s + g.photoCount, 0)} photos`)
          }
        </span>
      </div>

      {/* iter-178 — Sender-grouped view branch */}
      {view === "by-sender" && groups != null && (
        openGroup ? (
          <SenderGroupDetail group={openGroup} onClose={() => setOpenGroupKey(null)} onOpenLightbox={setLightbox} />
        ) : (
          <div>
            {groups.length === 0 ? (
              <div className="rounded-2xl bg-white border p-8 text-center" style={{ borderColor: BRAND.border }}>
                <p className="text-[24px] mb-2">📁</p>
                <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>No senders yet</p>
                <p className="text-[11.5px] mt-1" style={{ color: BRAND.inkSoft }}>
                  Once we capture your first photo, we'll group them by sender so you can browse "all my Amazon packages".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {groups.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setOpenGroupKey(g.key)}
                    className="relative rounded-2xl overflow-hidden text-left p-3 hover:shadow-md transition-shadow"
                    style={{ background: "white", border: `1px solid ${BRAND.border}` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="shrink-0 inline-flex items-center justify-center rounded-xl"
                        style={{
                          width: 44, height: 44,
                          background: `${g.accent}18`,
                          border: `2px solid ${g.accent}40`,
                          fontSize: 24,
                        }}
                        aria-hidden
                      >
                        {g.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black truncate" style={{ color: BRAND.ink }}>{g.bucket}</p>
                        <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
                          <strong style={{ color: BRAND.ink }}>{g.itemCount}</strong> shipments · {g.photoCount} photos
                        </p>
                        <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>
                          since {new Date(g.firstSeenIso).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {g.samplePhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-0.5 mt-2.5 rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
                        {g.samplePhotos.slice(0, 3).map((p, i) => (
                          <div key={`${p.mailItemId}:${i}`} className="aspect-square overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {view === "flat" && (
      <>

      {photos.length === 0 && !pending ? (
        <div className="rounded-2xl bg-white border p-8 text-center" style={{ borderColor: BRAND.border }}>
          <p className="text-[24px] mb-2">📷</p>
          <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>No photos yet</p>
          <p className="text-[11.5px] mt-1" style={{ color: BRAND.inkSoft }}>
            We'll capture every package's exterior + every scanned letter and you'll see them all here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <button
              key={`${p.mailItemId}:${p.imageKind}:${i}`}
              type="button"
              onClick={() => setLightbox(p)}
              className="relative rounded-xl overflow-hidden aspect-square group"
              style={{ border: `1px solid ${BRAND.border}`, background: "white" }}
              aria-label={`Open photo from ${p.from} on ${p.date}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Mailbox photo · ${p.from}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)" }}>
                <p className="text-[10.5px] font-black truncate" style={{ color: "white" }}>
                  {p.from}
                </p>
                <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {p.date} · {p.imageKind === "exterior" ? "📦" : "📄"} {p.type}
                </p>
              </div>
              {p.status === "Picked Up" && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(22,163,74,0.85)", color: "white" }}>
                  ✓ Picked up
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {nextOffset != null && (
        <div className="text-center">
          <button type="button" onClick={loadMore} disabled={pending}
            className="px-5 py-2.5 rounded-full text-[12px] font-black border disabled:opacity-50"
            style={{ borderColor: BRAND.blue, color: BRAND.blueDeep, background: "white" }}>
            {pending ? "Loading…" : `Load ${Math.min(30, total - photos.length)} more`}
          </button>
        </div>
      )}

      </>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          role="dialog"
          aria-label="Photo viewer"
          onClick={() => setLightbox(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={`Mailbox photo · ${lightbox.from}`}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="rounded-xl px-4 py-2 max-w-full"
              style={{ background: "rgba(255,255,255,0.95)" }}>
              <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>{lightbox.from}</p>
              <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
                {lightbox.date} · {lightbox.type} · {lightbox.imageKind === "exterior" ? "Exterior" : "Scan"}
                {lightbox.trackingNumber && (
                  <span className="ml-2 font-mono" style={{ color: BRAND.blueDeep }}>
                    {lightbox.carrier} {lightbox.trackingNumber}
                  </span>
                )}
                <span className="ml-2 font-black" style={{ color: lightbox.status === "Picked Up" ? "#15803d" : BRAND.inkSoft }}>
                  · {lightbox.status}
                </span>
              </p>
            </div>
            <button type="button" onClick={() => setLightbox(null)}
              className="px-3 py-1.5 rounded-full text-[12px] font-bold"
              style={{ background: "white", color: BRAND.ink }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// iter-178 — When a sender group is opened, show its full gallery
// with a back button + summary. Photos are pulled from the group's
// pre-loaded sample set (capped at 6); for the long tail, we steer
// members to the flat grid view via the footer note.
function SenderGroupDetail({ group, onClose, onOpenLightbox }: {
  group: AlbumSenderGroup;
  onClose: () => void;
  onOpenLightbox: (p: AlbumPhoto) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
          ← All senders
        </button>
        <span
          className="inline-flex items-center justify-center rounded-lg"
          style={{ width: 32, height: 32, background: `${group.accent}18`, border: `2px solid ${group.accent}40`, fontSize: 18 }}
          aria-hidden
        >
          {group.emoji}
        </span>
        <h3 className="text-base font-black" style={{ color: BRAND.ink }}>{group.bucket}</h3>
        <span className="text-[11px]" style={{ color: BRAND.inkSoft }}>
          · {group.itemCount} shipments · {group.photoCount} photos
        </span>
      </div>
      {group.samplePhotos.length === 0 ? (
        <div className="rounded-2xl bg-white border p-8 text-center" style={{ borderColor: BRAND.border }}>
          <p className="text-[12px]" style={{ color: BRAND.inkFaint }}>No photos in this bucket.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {group.samplePhotos.map((p, i) => (
            <button
              key={`${p.mailItemId}:${p.imageKind}:${i}`}
              type="button"
              onClick={() => onOpenLightbox(p)}
              className="relative rounded-xl overflow-hidden aspect-square group"
              style={{ border: `1px solid ${BRAND.border}`, background: "white" }}
              aria-label={`Open photo from ${p.from} on ${p.date}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Mailbox photo · ${p.from}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)" }}>
                <p className="text-[10.5px] font-black truncate" style={{ color: "white" }}>{p.from}</p>
                <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {p.date} · {p.imageKind === "exterior" ? "📦" : "📄"} {p.type}
                </p>
              </div>
              {p.status === "Picked Up" && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.85)", color: "white" }}>
                  ✓ Picked up
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {group.itemCount > group.samplePhotos.length && (
        <p className="mt-3 text-center text-[11px]" style={{ color: BRAND.inkFaint }}>
          Showing {group.samplePhotos.length} most-recent photos.{" "}
          <span style={{ color: BRAND.blueDeep }}>Switch to 📷 Grid view</span> to scroll the rest of {group.itemCount} shipments.
        </p>
      )}
    </div>
  );
}
