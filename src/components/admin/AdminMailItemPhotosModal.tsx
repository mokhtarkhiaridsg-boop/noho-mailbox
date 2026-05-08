"use client";

/**
 * iter-135 — Admin multi-photo gallery editor for a MailItem.
 *
 * Self-contained modal: admin pastes/uploads extra photo angles (back of
 * package, label close-up, contents, damage), sees them as thumbs with
 * inline label + remove. Reuses the iPad-OS T-token palette + matches
 * the AdminMailPanel chrome.
 *
 * The modal does its own data fetching via the iter-135 server actions
 * (listExtraPhotos / addExtraPhoto / removeExtraPhoto / relabelExtraPhoto)
 * so AdminMailPanel doesn't need any new threading; just open it with
 * a mailItemId.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import {
  listExtraPhotos,
  addExtraPhoto,
  removeExtraPhoto,
  relabelExtraPhoto,
  type ExtraPhoto,
} from "@/app/actions/mailItemPhotos";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  danger: "#EF4444",
};

const PRESET_LABELS = ["Back", "Label close-up", "Contents", "Damage", "Side", "Top"] as const;

type Props = {
  mailItemId: string;
  packageFrom?: string;
  primaryUrl?: string | null;
  onClose: () => void;
  onChanged?: (total: number) => void;
};

export default function AdminMailItemPhotosModal({
  mailItemId,
  packageFrom,
  primaryUrl,
  onClose,
  onChanged,
}: Props) {
  const [photos, setPhotos] = useState<ExtraPhoto[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelDraft, setEditingLabelDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function refresh() {
    void listExtraPhotos(mailItemId)
      .then((p) => setPhotos(p))
      .catch(() => setPhotos([]));
  }
  useEffect(refresh, [mailItemId]);

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function notifyChange(total: number) {
    onChanged?.(total);
  }

  function onAddUrl() {
    const url = draftUrl.trim();
    if (!url) { setErrorMsg("Photo URL required"); return; }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await addExtraPhoto({ mailItemId, url, label: draftLabel.trim() || undefined });
      if (res.error) { setErrorMsg(res.error); return; }
      setDraftUrl("");
      setDraftLabel("");
      refresh();
      if (res.total != null) notifyChange(res.total);
    });
  }

  async function onUploadFile(file: File) {
    setErrorMsg(null);
    setUploading(true);
    try {
      // Reuse the existing intake upload endpoint; it returns { url } per
      // dashboard pattern. Falls back to a clear error message on failure.
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${body.slice(0, 80)}`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Upload returned no URL");
      const add = await addExtraPhoto({ mailItemId, url: data.url, label: draftLabel.trim() || undefined });
      if (add.error) throw new Error(add.error);
      setDraftLabel("");
      refresh();
      if (add.total != null) notifyChange(add.total);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onRemove(photoId: string) {
    if (!confirm("Remove this photo from the package gallery?")) return;
    setBusyId(photoId);
    startTransition(async () => {
      const res = await removeExtraPhoto({ mailItemId, photoId });
      setBusyId(null);
      if (res.error) { setErrorMsg(res.error); return; }
      refresh();
      if (res.total != null) notifyChange(res.total);
    });
  }

  function onSaveLabel(photoId: string) {
    setBusyId(photoId);
    startTransition(async () => {
      const res = await relabelExtraPhoto({ mailItemId, photoId, label: editingLabelDraft });
      setBusyId(null);
      if (res.error) { setErrorMsg(res.error); return; }
      setEditingLabelId(null);
      setEditingLabelDraft("");
      refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Multi-photo gallery
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {packageFrom ? `Package from ${packageFrom}` : "Package photos"}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
              Primary photo stays on the row. Up to 10 supplemental angles (back, label, contents, damage).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black transition-colors hover:bg-[#F4F5F7]"
            style={{ color: T.inkSoft }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Existing gallery */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
              Current gallery
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {/* Primary photo (read-only — managed by intake) */}
              {primaryUrl && (
                <div className="relative aspect-square rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={primaryUrl} alt="Primary" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.85)", color: "white" }}>
                    Primary
                  </span>
                </div>
              )}
              {photos === null ? (
                <div className="text-[11px] col-span-full" style={{ color: T.inkFaint }}>Loading…</div>
              ) : photos.length === 0 ? (
                <div className="text-[11px] col-span-full p-3 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
                  No extra photos yet — add one below.
                </div>
              ) : (
                photos.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group" style={{ border: `1px solid ${T.border}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label ?? "Extra photo"} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 px-2 py-1 flex items-end justify-between gap-1.5" style={{ background: "linear-gradient(to top, rgba(15,23,42,0.85), transparent)" }}>
                      {editingLabelId === p.id ? (
                        <input
                          autoFocus
                          value={editingLabelDraft}
                          onChange={(e) => setEditingLabelDraft(e.target.value)}
                          onBlur={() => onSaveLabel(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onSaveLabel(p.id);
                            else if (e.key === "Escape") { setEditingLabelId(null); setEditingLabelDraft(""); }
                          }}
                          className="flex-1 min-w-0 text-[10.5px] px-1.5 py-0.5 rounded border-0 outline-none"
                          style={{ background: "white", color: T.ink }}
                          maxLength={60}
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left text-[10.5px] font-bold text-white truncate"
                          onClick={() => { setEditingLabelId(p.id); setEditingLabelDraft(p.label ?? ""); }}
                          title="Click to rename"
                        >
                          {p.label || <span className="opacity-60">(unlabeled)</span>}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending && busyId === p.id}
                        onClick={() => onRemove(p.id)}
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black text-white disabled:opacity-50"
                        style={{ background: T.danger }}
                        aria-label="Remove photo"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add new */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Add a photo
            </p>

            {/* Quick-pick label chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setDraftLabel(l)}
                  className="text-[10.5px] font-bold px-2 py-1 rounded-full transition-colors"
                  style={{
                    background: draftLabel === l ? T.blue : "white",
                    color: draftLabel === l ? "white" : T.inkSoft,
                    border: `1px solid ${draftLabel === l ? T.blue : T.border}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Custom label (optional, e.g. 'Damage on side')"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              maxLength={60}
              className="w-full text-[12px] px-2.5 py-2 rounded-lg outline-none"
              style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
            />

            <div className="flex flex-col sm:flex-row gap-2">
              {/* URL paste path */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL (https://… or /uploads/…)"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  className="flex-1 min-w-0 text-[12px] px-2.5 py-2 rounded-lg outline-none"
                  style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
                  onKeyDown={(e) => { if (e.key === "Enter") onAddUrl(); }}
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={onAddUrl}
                  className="shrink-0 px-3 py-2 rounded-lg text-[11.5px] font-black text-white disabled:opacity-50"
                  style={{ background: T.blue }}
                >
                  Add URL
                </button>
              </div>

              {/* File upload path */}
              <div className="flex">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadFile(f);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading || pending}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg text-[11.5px] font-black disabled:opacity-50"
                  style={{ background: "white", color: T.blueDeep, border: `1px solid ${T.border}` }}
                >
                  {uploading ? "Uploading…" : "Upload file"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[11px] font-semibold" style={{ color: T.danger }}>
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${T.border}` }}>
          <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
            {photos === null ? "—" : `${photos.length} extra photo${photos.length === 1 ? "" : "s"}`}
            {primaryUrl && " · primary attached"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg"
            style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
