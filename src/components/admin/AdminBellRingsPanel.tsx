"use client";

/**
 * iter-217 — Admin pickup-bell rings queue (Tier 16 #126).
 *
 * Lists recent bell rings, unack first. Per-row shows suite # +
 * member name + open package count + time since rung. Admin taps
 * "✓ Ack" when they go to the counter.
 *
 * Auto-polls every 10s when on this tab so a fresh ring shows up
 * without manual refresh.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listBellRings,
  acknowledgeBellRing,
  type BellRingRow,
} from "@/app/actions/bellRing";

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

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function AdminBellRingsPanel() {
  const [showAcked, setShowAcked] = useState(false);
  const [rows, setRows] = useState<BellRingRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listBellRings({ onlyUnacked: !showAcked, limit: 60 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [showAcked]);

  function onAck(r: BellRingRow) {
    setInfo(null);
    startTransition(async () => {
      const res = await acknowledgeBellRing({ id: r.id });
      if (res.success) { setInfo(`✓ Acknowledged #${r.suiteNumber}`); refresh(); }
    });
  }

  const unacked = (rows ?? []).filter((r) => !r.acknowledgedAtIso);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Bell Rings
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          ring the bell
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {unacked.length} unanswered
        </span>
        <a href="/bell" target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}`, textDecoration: "none" }}>
          Open /bell ↗
        </a>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        Walk-ins scan the QR sticker on the front-desk bell + tap their suite # — appears here in real time. Auto-refreshes every 10s.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      {unacked.length > 0 && (
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(245,158,11,0.10)", border: "2px solid rgba(245,158,11,0.55)" }}>
          <p className="text-[12px] font-black" style={{ color: "#92400e" }}>
            🛎️ {unacked.length} unanswered ring{unacked.length === 1 ? "" : "s"} — head to the counter
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
          <input type="checkbox" checked={showAcked} onChange={(e) => setShowAcked(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
          Show acknowledged
        </label>
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 Quiet — no rings to handle.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const acked = !!r.acknowledgedAtIso;
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${acked ? T.border : T.warning}`, opacity: acked ? 0.6 : 1 }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[18px] font-black font-mono" style={{ color: acked ? T.inkSoft : "#92400e" }}>
                        #{r.suiteNumber}
                      </span>
                      <span className="text-[11px]" style={{ color: T.inkFaint }}>{relTime(r.ringedAtIso)}</span>
                      {!acked && r.openPackageCount > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.10em]" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>
                          {r.openPackageCount} open pkg{r.openPackageCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {!r.userId && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.06)", color: T.danger }}>
                          ⚠️ unknown suite
                        </span>
                      )}
                    </div>
                    {r.userName && <p className="text-[12.5px] font-bold mt-1" style={{ color: T.ink }}>{r.userName}</p>}
                    {acked && (
                      <p className="text-[10.5px] mt-1" style={{ color: T.inkFaint }}>
                        ✓ Acked by {r.acknowledgedByName ?? "admin"}
                        {r.acknowledgedAtIso && <span> {relTime(r.acknowledgedAtIso)}</span>}
                      </p>
                    )}
                    {r.notes && <p className="text-[10.5px] italic mt-0.5" style={{ color: T.inkFaint }}>📝 {r.notes}</p>}
                  </div>
                  {!acked && (
                    <button type="button" onClick={() => onAck(r)} disabled={busy}
                      className="text-[12px] font-black px-4 py-2 rounded-lg text-white shrink-0 disabled:opacity-50" style={{ background: T.success }}>
                      ✓ I&apos;m on it
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
