"use client";

/**
 * iter-198 — Carrier-mismatch admin panel (Tier 14 #107).
 *
 * Lists every MailItem where admin-typed `carrier` disagrees with
 * iter-108 AI's `carrierGuess`, with one-click apply-AI-suggestion +
 * dismiss-as-false-positive. Window picker chips (7/14/30d) for
 * coaching context. Stat tiles + top mismatch pairs row so admin
 * sees patterns ("I keep typing UPS when it's USPS").
 */

import { useEffect, useState, useTransition } from "react";
import {
  listCarrierMismatches,
  applyCarrierFix,
  dismissCarrierMismatch,
  type CarrierMismatchRow,
  type CarrierMismatchSummary,
} from "@/app/actions/carrierMismatch";

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

const WINDOW_OPTIONS = [7, 14, 30] as const;

export default function AdminCarrierMismatchPanel() {
  const [windowDays, setWindowDays] = useState<number>(7);
  const [data, setData] = useState<{ rows: CarrierMismatchRow[]; summary: CarrierMismatchSummary } | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listCarrierMismatches({ windowDays }).then(setData).catch(() => setData(null));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [windowDays]);

  function onApply(r: CarrierMismatchRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await applyCarrierFix({ mailItemId: r.id, newCarrier: r.aiCarrier });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Corrected to ${r.aiCarrier} for "${r.fromSender}"`); refresh(); }
    });
  }
  function onDismiss(r: CarrierMismatchRow) {
    const reason = prompt("Why is the typed carrier correct? (optional)") ?? "";
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await dismissCarrierMismatch({ mailItemId: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo("Dismissed"); refresh(); }
    });
  }

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
          Carrier Mismatch
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
          coach the eye
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {data?.summary.total ?? 0} flagged
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        When you typed one carrier at intake but iter-108 AI Vision detected another. Wrong carrier breaks tracking polls + routes insurance claims to the wrong portal — fix here in one click.
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {WINDOW_OPTIONS.map((d) => (
          <button key={d} type="button" onClick={() => setWindowDays(d)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: windowDays === d ? T.blue : "white",
              color: windowDays === d ? "white" : T.ink,
              border: `1px solid ${windowDays === d ? T.blue : T.border}`,
            }}>
            Last {d}d
          </button>
        ))}
        <button type="button" onClick={refresh} className="text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
          ↻ Refresh
        </button>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Mismatches" value={data?.summary.total ?? 0} accent={data?.summary.thresholdExceeded ? T.danger : T.blueDeep} />
        <Tile label="Threshold" value={data?.summary.threshold ?? "—"} accent={T.warning} />
        <Tile label="Last coaching" value={data?.summary.lastCoachingSentIso ? new Date(data.summary.lastCoachingSentIso).toLocaleDateString() : "—"} accent={T.inkFaint} />
      </div>

      {data?.summary.thresholdExceeded && (
        <div className="rounded-xl px-4 py-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.30)" }}>
          <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>
            🪪 Threshold exceeded ({data.summary.total} ≥ {data.summary.threshold}) — a coaching email will fire on the next daily cron sweep (deduped to once per 6 days).
          </p>
        </div>
      )}

      {data && data.summary.pairs.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>Most-common typed→AI pairs</p>
          <div className="flex flex-wrap gap-1.5">
            {data.summary.pairs.slice(0, 8).map((p, i) => (
              <span key={i} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>
                <span className="font-mono" style={{ color: T.danger }}>{p.typed}</span>
                <span style={{ color: T.inkFaint }}> → </span>
                <span className="font-mono" style={{ color: T.success }}>{p.ai}</span>
                <span style={{ color: T.inkFaint }}> · {p.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!data ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : data.rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 No carrier mismatches in the last {windowDays}d. Intake quality is on point.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start gap-3 flex-wrap">
                {r.exteriorImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.exteriorImageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: `1px solid ${T.border}` }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(239,68,68,0.10)", color: T.danger }}>
                      typed: {r.typedCarrier}
                    </span>
                    <span style={{ color: T.inkFaint }}>→</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(34,197,94,0.10)", color: T.success }}>
                      AI: {r.aiCarrier}
                    </span>
                    {r.trackingNumber && <span className="text-[10px] font-mono" style={{ color: T.inkFaint }}>· {r.trackingNumber}</span>}
                  </div>
                  <p className="text-[12px] font-bold mt-1" style={{ color: T.ink }}>{r.fromSender}</p>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                    {r.userName ?? "(no member)"}
                    {r.suiteNumber && <span className="font-mono"> · #{r.suiteNumber}</span>}
                    {" · "}intake {new Date(r.intakeAtIso).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => onApply(r)} disabled={busy}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                    ✓ Apply {r.aiCarrier}
                  </button>
                  <button type="button" onClick={() => onDismiss(r)} disabled={busy}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                    style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                    Typed is correct
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

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}
