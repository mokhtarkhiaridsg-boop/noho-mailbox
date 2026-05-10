"use client";

/**
 * iter-189 — KYC trust-score admin panel (Tier 13 #98).
 *
 * Lists members below the trust threshold + lets admin drill into
 * any single member to see the full per-axis breakdown + manually
 * recompute. Action labels in the flag chips reuse the score-axis
 * key vocabulary so admin learns it as they triage.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listLowTrustMembers,
  getMemberKycTrustScore,
  recomputeUserKycTrust,
  type KycTrustRow,
} from "@/app/actions/kycTrustScore";
import { bandColor, type KycTrustResult } from "@/lib/kyc-trust";

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

const FLAG_LABELS: Record<string, string> = {
  has_kyc_form: "📄 No Form 1583",
  has_primary_id_image: "🪪 No primary ID photo",
  has_secondary_id: "🪪 No secondary ID",
  primary_id_type: "❓ Primary ID type missing",
  primary_id_number: "❓ Primary ID # missing",
  primary_id_not_expired: "⚠️ Primary ID expired",
  secondary_id_not_expired: "⚠️ Secondary ID expired",
  kyc_status: "⏳ KYC not approved",
  has_phone: "📞 No phone",
  email_well_formed: "📧 Email malformed",
  has_forwarding: "📬 No forwarding address",
};

export default function AdminKycTrustPanel() {
  const [threshold, setThreshold] = useState(65);
  const [rows, setRows] = useState<KycTrustRow[] | null>(null);
  const [drilldown, setDrilldown] = useState<KycTrustResult | null>(null);
  const [drilldownUserId, setDrilldownUserId] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listLowTrustMembers({ thresholdScore: threshold, limit: 100 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [threshold]);

  function onDrill(r: KycTrustRow) {
    setDrilldownUserId(r.userId);
    void getMemberKycTrustScore({ userId: r.userId }).then(setDrilldown).catch(() => setDrilldown(null));
  }
  function onRecompute(userId: string) {
    setInfo(null);
    startTransition(async () => {
      const res = await recomputeUserKycTrust({ userId });
      if (res.ok) {
        setInfo(`✓ Recomputed: ${res.score}/100 · ${res.band}`);
        refresh();
        if (drilldownUserId === userId) {
          void getMemberKycTrustScore({ userId }).then(setDrilldown);
        }
      }
    });
  }

  const counts = (() => {
    if (!rows) return { atRisk: 0, watch: 0, none: 0 };
    return {
      atRisk: rows.filter((r) => r.score != null && r.score < 40).length,
      watch: rows.filter((r) => r.score != null && r.score >= 40 && r.score < 65).length,
      none: rows.filter((r) => r.score == null).length,
    };
  })();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Compliance · KYC trust
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>KYC trust scores</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          0-100 composite per member from ID images + types + expirations + KYC status + contact + forwarding axes. Sort + drill-down to see what's missing.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="At risk (<40)" value={counts.atRisk} accent={T.danger} />
        <Tile label="Watch (40-64)" value={counts.watch} accent={T.warning} />
        <Tile label="Never computed" value={counts.none} accent={T.inkFaint} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: T.inkSoft }}>
          Threshold:
          <input type="range" min={0} max={100} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))} style={{ width: 160 }} />
          <span className="font-mono font-black" style={{ color: T.blueDeep, minWidth: 30, textAlign: "right" }}>{threshold}</span>
        </label>
        <span className="text-[10px]" style={{ color: T.inkFaint }}>
          Showing members with score &lt; {threshold} OR no score yet.
        </span>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {rows == null ? (
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-[12px] italic text-center py-6" style={{ color: T.inkFaint }}>
              🌟 No low-trust members at this threshold. Compliance is in great shape.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: T.border }}>
              {rows.map((r) => {
                const c = r.score != null ? bandColor(r.band as "Trusted" | "Verified" | "Watch" | "At Risk") : { bg: T.surfaceAlt, fg: T.inkFaint };
                return (
                  <li key={r.userId} className="py-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-black tabular-nums" style={{ color: c.fg, minWidth: 36 }}>
                      {r.score == null ? "—" : r.score}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: c.bg, color: c.fg }}>
                      {r.band}
                    </span>
                    <span className="font-bold text-[12px]" style={{ color: T.ink }}>{r.userName}</span>
                    {r.suiteNumber && <span className="text-[10.5px] font-mono" style={{ color: T.inkFaint }}>#{r.suiteNumber}</span>}
                    {r.plan && <span className="text-[10px]" style={{ color: T.inkFaint }}>· {r.plan}</span>}
                    {r.flagCount > 0 && <span className="text-[10px]" style={{ color: T.warning }}>· {r.flagCount} flag{r.flagCount === 1 ? "" : "s"}</span>}
                    <button type="button" onClick={() => onDrill(r)} className="ml-auto text-[10.5px] font-bold px-2 py-0.5 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                      Drill ↗
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Drilldown</p>
          {!drilldown ? (
            <p className="text-[11px] italic" style={{ color: T.inkFaint }}>Click "Drill ↗" on any row to see the per-axis breakdown.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[28px] font-black tabular-nums" style={{ color: bandColor(drilldown.band).fg }}>{drilldown.score}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: bandColor(drilldown.band).bg, color: bandColor(drilldown.band).fg }}>{drilldown.band}</span>
                <button type="button" onClick={() => onRecompute(drilldown.userId)} disabled={busy} className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: T.blue, color: "white" }}>
                  ↻ Recompute
                </button>
              </div>
              <ul className="space-y-1">
                {drilldown.axes.map((a) => (
                  <li key={a.key} className="text-[11px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: a.passed ? "#15803d" : T.danger, fontWeight: 900 }}>{a.passed ? "✓" : "✕"}</span>
                    <span className="flex-1 truncate" style={{ color: T.ink }}>
                      {a.label}
                      <span className="ml-1 text-[10px]" style={{ color: T.inkFaint }}>({a.detail})</span>
                    </span>
                    <span className="font-mono font-black tabular-nums" style={{ color: a.contribution > 0 ? "#15803d" : a.contribution < 0 ? T.danger : T.inkFaint, minWidth: 30, textAlign: "right" }}>
                      {a.contribution > 0 ? "+" : ""}{a.contribution}
                    </span>
                  </li>
                ))}
              </ul>
              {drilldown.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {drilldown.flags.map((f) => (
                    <span key={f} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#92400e" }}>
                      {FLAG_LABELS[f] ?? f}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
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
