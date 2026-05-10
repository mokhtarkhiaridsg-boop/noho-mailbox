"use client";

/**
 * iter-179 — Plan downgrade card.
 *
 * Renders only for members on a paid plan above Basic. Shows the
 * eligibility checklist (so a blocked member knows exactly what to
 * resolve: pay overdue invoice, end vacation hold, etc), available
 * lower tiers with their monthly savings, and an inline form to
 * request the downgrade with an optional reason.
 *
 * Once a request is in flight, the card flips to a status view with
 * Cancel button.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyPlanDowngradeOptions,
  requestPlanDowngrade,
  cancelMyPlanDowngrade,
  listMyPlanDowngrades,
  type DowngradeEligibility,
  type PlanDowngradeRow,
} from "@/app/actions/planDowngrade";

export default function PlanDowngradeCard() {
  const [elig, setElig] = useState<DowngradeEligibility | null>(null);
  const [history, setHistory] = useState<PlanDowngradeRow[]>([]);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<"Basic" | "Business" | null>(null);
  const [reason, setReason] = useState("");

  function refresh() {
    void getMyPlanDowngradeOptions().then(setElig).catch(() => setElig(null));
    void listMyPlanDowngrades().then(setHistory).catch(() => setHistory([]));
  }
  useEffect(refresh, []);

  // Render nothing for members not on a paid plan or already on Basic
  // (no lower tier available). Skips the card cleanly for free + cancelled.
  if (!elig) return null;
  if (!elig.currentPlan || elig.currentPlan === "Basic") return null;

  // If there's an in-flight request (pending/approved) — show the
  // status view instead of the request form.
  const inFlight = history.find((h) => h.status === "pending" || h.status === "approved") ?? null;

  function onSubmit() {
    if (!selected) { setError("Pick a plan to downgrade to."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await requestPlanDowngrade({ toPlan: selected, reason: reason.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo("Got it — we've scheduled your downgrade.");
      setReason(""); setSelected(null);
      refresh();
    });
  }

  function onCancel(id: string) {
    if (!confirm("Cancel this downgrade and keep your current plan?")) return;
    startTransition(async () => {
      const res = await cancelMyPlanDowngrade({ id });
      if (res.error) { setError(res.error); return; }
      setInfo("✓ Downgrade cancelled. You're back on your current plan.");
      refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          Billing · Plan downgrade
        </p>
        <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
          Move to a lower plan
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Currently on <strong>{elig.currentPlan} (${(elig.currentMonthlyCents / 100).toFixed(2)}/mo)</strong>. Downgrades keep your current features through the end of the term — the new lower price kicks in at your next renewal.
        </p>
      </div>

      {inFlight ? (
        <InFlightStatus row={inFlight} onCancel={() => onCancel(inFlight.id)} busy={busy} />
      ) : !elig.ok ? (
        <BlockedReasons reasons={elig.reasons.filter((r) => !r.met)} />
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {elig.options.map((o) => {
              const active = selected === o.plan;
              return (
                <button
                  key={o.plan}
                  type="button"
                  onClick={() => setSelected(o.plan as "Basic" | "Business")}
                  className="rounded-xl p-3 text-left"
                  style={{
                    background: active ? "rgba(25,118,255,0.06)" : "white",
                    border: `2px solid ${active ? BRAND.blue : BRAND.border}`,
                  }}
                >
                  <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>{o.plan}</p>
                  <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>${(o.monthlyCents / 100).toFixed(2)}/mo</p>
                  <p className="text-[10.5px] font-bold mt-1" style={{ color: "#15803d" }}>
                    Save ${(o.monthlySavingsCents / 100).toFixed(2)}/mo
                  </p>
                </button>
              );
            })}
          </div>
          {selected && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Reason (optional, helps us improve)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="What can we do better?" className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
            </div>
          )}
          {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
          {info && <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy || !selected} onClick={onSubmit} className="text-[12px] font-black px-3.5 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {busy ? "Submitting…" : selected ? `Schedule ${selected} downgrade` : "Pick a plan"}
            </button>
          </div>
          {elig.currentDueDate && (
            <p className="text-[10.5px]" style={{ color: BRAND.inkFaint }}>
              Effective <strong>{new Date(`${elig.currentDueDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</strong> (your current plan's renewal date).
            </p>
          )}
        </div>
      )}

      {history.filter((h) => h.status === "applied" || h.status === "denied" || h.status === "cancelled").length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkSoft }}>Past requests</p>
          <ul className="space-y-1">
            {history.filter((h) => h.status === "applied" || h.status === "denied" || h.status === "cancelled").slice(0, 5).map((h) => (
              <li key={h.id} className="text-[11px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                <span className="font-black" style={{ color: BRAND.ink }}>{h.fromPlan} → {h.toPlan}</span>
                <StatusPill status={h.status} />
                {h.deniedReason && <span className="italic" style={{ color: "#b91c1c" }}>· {h.deniedReason}</span>}
                <span className="ml-auto" style={{ color: BRAND.inkFaint }}>
                  {new Date(h.appliedAtIso ?? h.createdAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function BlockedReasons({ reasons }: { reasons: Array<{ key: string; label: string; met: boolean; detail?: string }> }) {
  return (
    <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}>
      <p className="text-[11px] font-black mb-1.5" style={{ color: "#92400e" }}>Resolve these to enable downgrade:</p>
      <ul className="space-y-1">
        {reasons.map((r) => (
          <li key={r.key} className="text-[11.5px] flex items-start gap-1.5" style={{ color: "#92400e" }}>
            <span style={{ fontWeight: 900 }}>•</span>
            <span>
              {r.label}
              {r.detail && <span className="ml-1" style={{ color: "#7C4D00" }}>({r.detail})</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InFlightStatus({ row, onCancel, busy }: { row: PlanDowngradeRow; onCancel: () => void; busy: boolean }) {
  const eff = new Date(`${row.effectiveAt}T00:00:00`);
  const effLabel = eff.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="mt-4 rounded-xl p-3" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill status={row.status} />
        <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>{row.fromPlan} → {row.toPlan}</p>
        <span className="text-[11px]" style={{ color: BRAND.inkSoft }}>· effective {effLabel}</span>
      </div>
      {row.reason && (
        <p className="text-[11px] italic mt-1" style={{ color: BRAND.inkSoft }}>Your note: "{row.reason}"</p>
      )}
      <button type="button" disabled={busy} onClick={onCancel} className="mt-3 text-[11.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
        Cancel downgrade
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: PlanDowngradeRow["status"] }) {
  const style = (() => {
    if (status === "pending") return { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "PENDING" };
    if (status === "approved") return { bg: "rgba(25,118,255,0.10)", fg: "#0F5BD9", label: "APPROVED" };
    if (status === "applied") return { bg: "rgba(34,197,94,0.10)", fg: "#15803d", label: "APPLIED" };
    if (status === "cancelled") return { bg: "rgba(120,113,108,0.12)", fg: "#57534e", label: "CANCELLED" };
    if (status === "denied") return { bg: "rgba(239,68,68,0.10)", fg: "#991b1b", label: "DENIED" };
    return { bg: "rgba(120,113,108,0.12)", fg: "#57534e", label: status };
  })();
  return (
    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: style.bg, color: style.fg }}>
      {style.label}
    </span>
  );
}
