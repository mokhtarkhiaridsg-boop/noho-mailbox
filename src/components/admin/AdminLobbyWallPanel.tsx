"use client";

/**
 * iter-207 — Admin moderation panel for the lobby selfie wall.
 *
 * Filters by Pending/Approved/Removed. Per-row approve/remove actions
 * + photo thumbnail + display name + suite # + joined year + consent
 * timestamp. Audit-driven.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAdminLobbyWallEntries,
  approveLobbyWallEntry,
  adminRemoveLobbyWallEntry,
  type LobbyWallEntryView,
} from "@/app/actions/lobbyWall";

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

const STATUS_FILTERS: Array<{ id: "all" | LobbyWallEntryView["status"]; label: string }> = [
  { id: "Pending", label: "Pending" },
  { id: "Approved", label: "Approved" },
  { id: "Removed", label: "Removed" },
  { id: "all", label: "All" },
];

export default function AdminLobbyWallPanel() {
  const [filter, setFilter] = useState<"all" | LobbyWallEntryView["status"]>("Pending");
  const [rows, setRows] = useState<LobbyWallEntryView[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listAdminLobbyWallEntries({ status: filter === "all" ? undefined : filter }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onApprove(r: LobbyWallEntryView) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await approveLobbyWallEntry({ id: r.id });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Approved ${r.displayName}`); refresh(); }
    });
  }
  function onRemove(r: LobbyWallEntryView) {
    const reason = prompt(`Remove "${r.displayName}" from the wall? Reason (optional):`);
    if (reason === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminRemoveLobbyWallEntry({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`Removed ${r.displayName}`); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Marketing · Lobby wall
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Lobby selfie wall</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Member-submitted photos for the public <a href="/wall" target="_blank" rel="noopener noreferrer" className="font-bold" style={{ color: T.blue }}>/wall</a> route + lobby kiosk loop. Review pending submissions before they go live.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

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
          🌟 Nothing in this view.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photoUrl} alt="" className="w-20 h-20 rounded-lg object-cover" style={{ border: `1px solid ${T.border}` }} />
                <div className="min-w-0 flex-1">
                  <span className="text-[9.5px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                    style={{
                      background: r.status === "Approved" ? "rgba(34,197,94,0.10)" : r.status === "Removed" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                      color: r.status === "Approved" ? "#15803d" : r.status === "Removed" ? T.danger : "#92400e",
                    }}>
                    {r.status}
                  </span>
                  <p className="text-[12.5px] font-black mt-1 truncate" style={{ color: T.ink }}>{r.displayName}</p>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                    {r.suiteNumber && <span className="font-mono">#{r.suiteNumber} · </span>}
                    since {r.joinedYear}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>
                    Submitted {new Date(r.consentedAtIso).toLocaleDateString()}
                  </p>
                  {r.removedReason && <p className="text-[10px] mt-0.5 italic" style={{ color: T.inkSoft }}>“{r.removedReason}”</p>}
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {r.status !== "Approved" && (
                  <button type="button" onClick={() => onApprove(r)} disabled={busy}
                    className="text-[10.5px] font-black px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                    ✓ Approve
                  </button>
                )}
                {r.status !== "Removed" && (
                  <button type="button" onClick={() => onRemove(r)} disabled={busy}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
