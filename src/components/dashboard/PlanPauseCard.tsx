"use client";

/**
 * iter-206 — Member self-serve plan-pause card (Tier 14 #115).
 *
 * Two states:
 *   - No active pause → form: start/end date pickers + reason + live
 *     fee preview ("$5.83 for 35d, ≈$5/mo holding fee") + Schedule btn
 *   - Active/Scheduled pause → status panel with countdown + cancel/
 *     resume-early buttons
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyPlanPause,
  previewPlanPauseFee,
  requestPlanPause,
  cancelMyPlanPause,
  resumeMyPlanPauseEarly,
  type PlanPauseRow,
} from "@/app/actions/planPause";

export default function PlanPauseCard() {
  const [active, setActive] = useState<PlanPauseRow | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<{ feeCents: number; durationDays: number; months: number; error?: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void getMyPlanPause().then(setActive).catch(() => setActive(null));
  }
  useEffect(refresh, []);

  // Recompute fee preview as dates change.
  useEffect(() => {
    if (!start || !end) { setPreview(null); return; }
    void previewPlanPauseFee({ startDate: start, endDate: end }).then(setPreview).catch(() => setPreview(null));
  }, [start, end]);

  function onSubmit() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await requestPlanPause({ startDate: start, endDate: end, reason: reason.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Pause scheduled · ${start} → ${end}`);
      setShowForm(false);
      setStart(""); setEnd(""); setReason(""); setPreview(null);
      refresh();
    });
  }
  function onCancel() {
    if (!confirm("Cancel this scheduled pause?")) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await cancelMyPlanPause();
      if (res.error) { setError(res.error); return; }
      setInfo("Pause cancelled");
      refresh();
    });
  }
  function onResumeEarly() {
    if (!confirm("Resume your full subscription right now?")) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await resumeMyPlanPauseEarly();
      if (res.error) { setError(res.error); return; }
      setInfo("✓ Welcome back — your plan is active");
      refresh();
    });
  }

  if (active === undefined) return null;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="8" cy="8" r="6.5" /><path d="M6 5 L6 11 M10 5 L10 11" /></svg>
          Plan Pause · Snowbird & traveler
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Pause your full subscription for a $5/mo holding fee. Mail still arrives at your suite — we hold everything for you. Different from Vacation Hold (which stops mail intake).
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      {active ? (
        <ActivePanel row={active} busy={busy} onCancel={onCancel} onResumeEarly={onResumeEarly} />
      ) : !showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="text-xs font-black px-4 py-2 rounded-xl text-white" style={{ background: BRAND.blue }}>
          Schedule a pause
        </button>
      ) : (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Start date</p>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
            </div>
            <div>
              <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>End date (auto-resume)</p>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Reason (optional)</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
              placeholder="e.g. snowbird in Tucson Oct–Mar"
              className="w-full rounded-xl px-3 py-2 text-[12.5px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
          </div>
          {preview && (
            <div className="rounded-xl px-3 py-2" style={{ background: preview.error ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", border: `1px solid ${preview.error ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)"}` }}>
              {preview.error ? (
                <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{preview.error}</p>
              ) : (
                <p className="text-[11.5px] font-bold" style={{ color: "#15803d" }}>
                  ${(preview.feeCents / 100).toFixed(2)} for {preview.durationDays} days (~{preview.months} months) · billed at activation
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="text-xs font-bold" style={{ color: BRAND.inkFaint }}>Cancel</button>
            <button type="button" onClick={onSubmit} disabled={busy || !start || !end || !!preview?.error}
              className="text-xs font-black px-4 py-1.5 rounded-xl text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {busy ? "Saving…" : "Schedule pause"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivePanel({ row, busy, onCancel, onResumeEarly }: { row: PlanPauseRow; busy: boolean; onCancel: () => void; onResumeEarly: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const isActive = row.status === "Active";
  const daysUntil = (() => {
    const target = isActive ? row.endDate : row.startDate;
    const diff = (new Date(target + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / (24 * 3600 * 1000);
    return Math.max(0, Math.round(diff));
  })();

  return (
    <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded" style={{ background: isActive ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.10)", color: isActive ? "#15803d" : "#92400e" }}>
            {isActive ? "⏸ Currently paused" : "📅 Scheduled"}
          </p>
          <p className="text-[13px] font-black mt-1" style={{ color: BRAND.ink }}>
            {row.startDate} → {row.endDate}
            <span className="ml-1 text-[11px] font-bold" style={{ color: BRAND.inkFaint }}>· {row.durationDays} days</span>
          </p>
          <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
            {isActive ? `Auto-resumes in ${daysUntil}d` : `Activates in ${daysUntil}d`}
            {row.originalPlan && <> · restoring <strong>{row.originalPlan}</strong></>}
          </p>
          <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkFaint }}>
            Holding fee: ${(row.holdingFeeCents / 100).toFixed(2)}
            {row.reason && <span className="italic"> · &ldquo;{row.reason}&rdquo;</span>}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {isActive && (
            <button type="button" onClick={onResumeEarly} disabled={busy} className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: "#15803d" }}>
              ▶ Resume now
            </button>
          )}
          <button type="button" onClick={onCancel} disabled={busy} className="text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
            Cancel pause
          </button>
        </div>
      </div>
    </div>
  );
}
