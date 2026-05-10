"use client";

/**
 * iter-211 — Admin door-camera walk-in queue (Tier 15 #120).
 *
 * Lists OCR'd door-camera captures by status. Per-row shows the
 * frame thumb + extracted text + AI hints + suggested member. Admin
 * confirms match (links capture to a User), dismisses (false
 * positive), or re-runs OCR if the model bombed.
 *
 * Test-image upload form for admin to manually feed a frame URL
 * (production wires camera trigger via the action directly).
 */

import { useEffect, useState, useTransition } from "react";
import {
  listDoorWalkInOcr,
  submitDoorWalkInImage,
  confirmDoorWalkInMatch,
  dismissDoorWalkIn,
  rerunDoorWalkInOcr,
  type DoorWalkInOcrRow,
} from "@/app/actions/doorWalkInOcr";

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
  warning: "#F59E0B",
  danger: "#EF4444",
};

const STATUS_FILTERS: Array<{ id: "all" | DoorWalkInOcrRow["status"]; label: string }> = [
  { id: "Pending", label: "Pending" },
  { id: "Matched", label: "Matched" },
  { id: "Dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
];

export default function AdminDoorWalkInPanel() {
  const [filter, setFilter] = useState<"all" | DoorWalkInOcrRow["status"]>("Pending");
  const [rows, setRows] = useState<DoorWalkInOcrRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");

  function refresh() {
    void listDoorWalkInOcr({ status: filter === "all" ? undefined : filter, limit: 60 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onUpload() {
    if (!uploadUrl.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await submitDoorWalkInImage({ imageUrl: uploadUrl.trim() });
      if (res.error) { setError(res.error); return; }
      const reasonNote = res.ocrOk === false ? ` · OCR failed (${res.ocrReason})` : (res.suggestedSuiteNumber ? ` · suggested suite #${res.suggestedSuiteNumber}` : "");
      setInfo(`✓ Captured${reasonNote}`);
      setUploadUrl("");
      refresh();
    });
  }

  function onConfirm(r: DoorWalkInOcrRow) {
    if (!r.matchedUserId) {
      const id = prompt("No suggested member. Paste the User ID to link:") ?? "";
      if (!id.trim()) return;
      setError(null); setInfo(null);
      startTransition(async () => {
        const res = await confirmDoorWalkInMatch({ id: r.id, userId: id.trim() });
        if (res.error) setError(res.error); else { setInfo("✓ Matched"); refresh(); }
      });
      return;
    }
    startTransition(async () => {
      const res = await confirmDoorWalkInMatch({ id: r.id, userId: r.matchedUserId! });
      if (res.error) setError(res.error); else { setInfo(`✓ Matched to ${r.matchedUserName ?? "member"}`); refresh(); }
    });
  }
  function onDismiss(r: DoorWalkInOcrRow) {
    const reason = prompt("Reason (optional, e.g. 'UPS driver'):") ?? "";
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await dismissDoorWalkIn({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error); else { setInfo("Dismissed"); refresh(); }
    });
  }
  function onRerun(r: DoorWalkInOcrRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await rerunDoorWalkInOcr({ id: r.id });
      if (res.error) setError(res.error); else { setInfo("✓ OCR re-ran"); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Door camera
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Door-camera walk-ins</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          When iter-156 DoorAccess logs an unknown attempt OR an integration uploads a camera frame, Vision OCRs the visible text (pickup pass, ID, badge) and suggests a member match. Confirm or dismiss from this queue.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>📤 Test with an image URL</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)}
            placeholder="https://… (door cam frame)"
            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <button type="button" onClick={onUpload} disabled={busy || !uploadUrl.trim()}
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Analyzing…" : "Run OCR"}
          </button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: T.inkFaint }}>
          Production: wire your door-camera trigger to call <code className="font-mono">submitDoorWalkInImage</code> directly with the captured frame URL.
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: filter === f.id ? T.blue : "white",
              color: filter === f.id ? "white" : T.ink,
              border: `1px solid ${filter === f.id ? T.blue : T.border}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 Empty — no captures in this view.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start gap-3 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="" className="w-32 h-24 rounded-lg object-cover shrink-0" style={{ border: `1px solid ${T.border}` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9.5px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === "Matched" ? "rgba(34,197,94,0.10)" : r.status === "Dismissed" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                        color: r.status === "Matched" ? "#15803d" : r.status === "Dismissed" ? T.danger : "#92400e",
                      }}>
                      {r.status}
                    </span>
                    <span className="text-[10px]" style={{ color: T.inkFaint }}>
                      {new Date(r.capturedAtIso).toLocaleString()}
                    </span>
                    {r.ocrConfidence != null && (
                      <span className="text-[10px] font-mono" style={{ color: T.inkFaint }}>
                        OCR conf {Math.round(r.ocrConfidence * 100)}%
                      </span>
                    )}
                  </div>

                  {r.hints && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.hints.suiteNumber && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.blueDeep }}>📍 #{r.hints.suiteNumber}</span>}
                      {r.hints.memberName && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.ink }}>👤 {r.hints.memberName}</span>}
                      {r.hints.idType && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>🪪 {r.hints.idType}</span>}
                      {r.hints.hasFace && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>👁️ face</span>}
                    </div>
                  )}

                  {r.matchedUserName && (
                    <p className="text-[11.5px] mt-1" style={{ color: T.ink }}>
                      <strong style={{ color: r.status === "Matched" ? "#15803d" : T.blue }}>
                        {r.status === "Matched" ? "✓ " : "🎯 Suggested: "}
                      </strong>
                      {r.matchedUserName}{r.matchedSuiteNumber && <span className="font-mono"> · #{r.matchedSuiteNumber}</span>}
                    </p>
                  )}
                  {r.ocrText && (
                    <details className="mt-1">
                      <summary className="text-[10px] font-bold cursor-pointer" style={{ color: T.inkFaint }}>↓ Full OCR text</summary>
                      <pre className="text-[10px] font-mono mt-1 p-2 rounded whitespace-pre-wrap" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>{r.ocrText}</pre>
                    </details>
                  )}
                  {r.notes && <p className="text-[10px] italic mt-1" style={{ color: T.inkFaint }}>📝 {r.notes}</p>}
                </div>
                {r.status === "Pending" && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => onConfirm(r)} disabled={busy}
                      className="text-[10.5px] font-black px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                      {r.matchedUserId ? `✓ Match ${r.matchedSuiteNumber ? "#" + r.matchedSuiteNumber : ""}`.trim() : "Match…"}
                    </button>
                    <button type="button" onClick={() => onDismiss(r)} disabled={busy}
                      className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                      Dismiss
                    </button>
                    <button type="button" onClick={() => onRerun(r)} disabled={busy}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-md disabled:opacity-50"
                      style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                      ↻ Re-OCR
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
