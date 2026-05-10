"use client";

/**
 * iter-226 — Admin roadmap CRUD panel (Tier 16 #135).
 */

import { useEffect, useState, useTransition } from "react";
import {
  listRoadmapAllForAdmin,
  adminAddRoadmapItem,
  adminUpdateRoadmapItem,
  adminRemoveRoadmapItem,
  type RoadmapItemRow,
} from "@/app/actions/publicRoadmap";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const STATUSES = ["Idea", "Planned", "InProgress", "Shipped", "Declined"] as const;

export default function AdminRoadmapPanel() {
  const [rows, setRows] = useState<RoadmapItemRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");

  function refresh() {
    void listRoadmapAllForAdmin().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onAdd() {
    if (!newTitle.trim() || newDesc.trim().length < 5) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminAddRoadmapItem({ title: newTitle, description: newDesc, category: newCategory.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Added "${newTitle}"`); setNewTitle(""); setNewDesc(""); setNewCategory(""); setShowAdd(false); refresh(); }
    });
  }
  function onStatus(r: RoadmapItemRow, status: typeof STATUSES[number]) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminUpdateRoadmapItem({ id: r.id, status });
      if (res.error) setError(res.error);
      else { setInfo(`✓ ${r.title} → ${status}`); refresh(); }
    });
  }
  function onRemove(r: RoadmapItemRow) {
    if (!confirm(`Remove "${r.title}" from the roadmap?`)) return;
    startTransition(async () => {
      const res = await adminRemoveRoadmapItem({ id: r.id });
      if (res.error) setError(res.error); else { setInfo(`Removed`); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          System · Public roadmap
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Public roadmap</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Curate features visible at the public <a href="/roadmap" target="_blank" rel="noopener noreferrer" className="font-bold" style={{ color: T.blue }}>/roadmap</a> route. Members upvote — admin moves through Idea → Planned → InProgress → Shipped.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>+ Add roadmap item</p>
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-[10.5px] font-bold px-2 py-0.5 rounded-md" style={{ background: showAdd ? T.surfaceAlt : T.blue, color: showAdd ? T.inkSoft : "white", border: `1px solid ${showAdd ? T.border : T.blue}` }}>
            {showAdd ? "Cancel" : "+ New"}
          </button>
        </div>
        {showAdd && (
          <div className="mt-2 space-y-1.5">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={80}
              placeholder="Title (≤80 chars)" className="w-full px-3 py-1.5 rounded-lg text-[12.5px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={500} rows={2}
              placeholder="Short description (≤500 chars)" className="w-full px-3 py-1.5 rounded-lg text-[12px] resize-none" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={40}
              placeholder="Category (optional, e.g. Mobile / Billing)" className="w-full px-3 py-1.5 rounded-lg text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <button type="button" onClick={onAdd} disabled={busy || !newTitle.trim()} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              Add
            </button>
          </div>
        )}
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No items yet. Add one above to start collecting member votes.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded" style={{ background: r.status === "Shipped" ? "rgba(34,197,94,0.10)" : r.status === "InProgress" ? "rgba(245,158,11,0.10)" : r.status === "Planned" ? "rgba(25,118,255,0.10)" : "rgba(122,130,144,0.10)", color: r.status === "Shipped" ? "#15803d" : r.status === "InProgress" ? "#92400e" : r.status === "Planned" ? "#0F5BD9" : "#3B4252" }}>
                      {r.status}
                    </span>
                    <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.title}</span>
                    {r.category && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>{r.category}</span>}
                    <span className="text-[10.5px] font-mono font-black" style={{ color: T.blue }}>▲ {r.voteCount}</span>
                  </div>
                  <p className="text-[11.5px] mt-1" style={{ color: T.inkSoft }}>{r.description}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <select value={r.status} onChange={(e) => onStatus(r, e.target.value as typeof STATUSES[number])} disabled={busy}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => onRemove(r)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
