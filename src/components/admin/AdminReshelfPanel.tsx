"use client";

/**
 * iter-188 — Admin re-shelving suggestions panel (Tier 13 #97).
 */

import { useEffect, useState, useTransition } from "react";
import {
  listReshelfSuggestions,
  snoozeReshelfSuggestion,
  dismissReshelfSuggestion,
  markReshelfActed,
  type ReshelfSuggestionRow,
} from "@/app/actions/reShelving";

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

const KIND_META: Record<string, { label: string; emoji: string; bg: string; fg: string }> = {
  dormant_suite:           { label: "Dormant suite",      emoji: "💤", bg: "rgba(120,113,108,0.12)", fg: "#57534e" },
  overflow_member:         { label: "Member overflowing", emoji: "📈", bg: "rgba(34,197,94,0.10)",   fg: "#15803d" },
  size_mismatch:           { label: "Size mismatch",      emoji: "↔️", bg: "rgba(245,158,11,0.12)",  fg: "#92400e" },
  vacant_box_for_waitlist: { label: "Vacant box",         emoji: "📦", bg: "rgba(25,118,255,0.10)",  fg: "#0F5BD9" },
};

const SEV_META: Record<string, { color: string; label: string }> = {
  high:   { color: T.danger,  label: "HIGH" },
  medium: { color: T.warning, label: "MED" },
  low:    { color: T.inkFaint, label: "LOW" },
};

export default function AdminReshelfPanel() {
  const [rows, setRows] = useState<ReshelfSuggestionRow[] | null>(null);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [includeSnoozed, setIncludeSnoozed] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listReshelfSuggestions({ includeDismissed, includeSnoozed }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [includeDismissed, includeSnoozed]);

  function onSnooze(r: ReshelfSuggestionRow) {
    const days = parseInt(prompt("Snooze for how many days?", "30") ?? "0", 10);
    if (!Number.isFinite(days) || days <= 0) return;
    startTransition(async () => {
      const res = await snoozeReshelfSuggestion({ id: r.id, days });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onDismiss(r: ReshelfSuggestionRow) {
    const reason = prompt("Reason for dismissing? (optional)") ?? "";
    startTransition(async () => {
      const res = await dismissReshelfSuggestion({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onActed(r: ReshelfSuggestionRow) {
    const note = prompt("What did you do? (e.g. 'Called Karim, downgraded to Basic')") ?? "";
    if (!note.trim()) return;
    startTransition(async () => {
      const res = await markReshelfActed({ id: r.id, note: note.trim() });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  const high = rows?.filter((r) => r.severity === "high").length ?? 0;
  const medium = rows?.filter((r) => r.severity === "medium").length ?? 0;
  const low = rows?.filter((r) => r.severity === "low").length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Re-shelving
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Smart re-shelving suggestions</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Daily cron analyzes mail volume × plan tier × suite assignment and surfaces actionable nudges. Snooze 30d to revisit later, or mark acted-on to log what you did.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="High" value={high} accent={T.danger} />
        <Tile label="Medium" value={medium} accent={T.warning} />
        <Tile label="Low" value={low} accent={T.inkFaint} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
          <input type="checkbox" checked={includeSnoozed} onChange={(e) => setIncludeSnoozed(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
          Show snoozed
        </label>
        <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
          <input type="checkbox" checked={includeDismissed} onChange={(e) => setIncludeDismissed(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
          Show dismissed
        </label>
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 Clean slate — no re-shelving needed right now. Cron re-checks daily.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const k = KIND_META[r.kind] ?? KIND_META.dormant_suite!;
            const s = SEV_META[r.severity] ?? SEV_META.medium!;
            const isOpen = !r.dismissedAtIso && (!r.snoozedUntilIso || new Date(r.snoozedUntilIso) < new Date());
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: isOpen ? 1 : 0.55 }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span aria-hidden style={{ fontSize: 18 }}>{k.emoji}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: k.bg, color: k.fg }}>{k.label}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: s.color }}>{s.label}</span>
                      {r.suiteNumber && <span className="text-[11.5px] font-mono font-bold" style={{ color: T.blueDeep }}>#{r.suiteNumber}</span>}
                      {r.userName && <span className="text-[11px]" style={{ color: T.ink }}>{r.userName}</span>}
                      {r.userPlan && <span className="text-[10px]" style={{ color: T.inkFaint }}>· {r.userPlan}</span>}
                    </div>
                    <p className="text-[12.5px] mt-1.5" style={{ color: T.ink }}>{r.suggestedAction}</p>
                    {r.reasons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.reasons.map((rs, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>
                            <strong style={{ color: T.ink }}>{rs.label}:</strong> {rs.value}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.actedNote && (
                      <p className="text-[10.5px] italic mt-1.5" style={{ color: T.inkFaint }}>📝 {r.actedNote}</p>
                    )}
                    {r.snoozedUntilIso && new Date(r.snoozedUntilIso) > new Date() && (
                      <p className="text-[10px] mt-1" style={{ color: T.warning }}>⏰ Snoozed until {new Date(r.snoozedUntilIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    )}
                  </div>
                  {isOpen && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={() => onActed(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                        ✓ Did it
                      </button>
                      <button type="button" onClick={() => onSnooze(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                        ⏰ Snooze
                      </button>
                      <button type="button" onClick={() => onDismiss(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                        Dismiss
                      </button>
                    </div>
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

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
