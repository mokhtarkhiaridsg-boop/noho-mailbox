"use client";

/**
 * iter-153 — Admin renewal-discount offers panel (Tier 9 #63).
 *
 * Lists offers (sent / expired / redeemed) + a "Run sweep now" button
 * for testing. The cron runs daily; this is the diagnostic surface.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listRenewalOffers,
  runRenewalDiscountSweep,
  type AdminRenewalOfferRow,
} from "@/app/actions/renewalDiscountOffer";

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

type Status = "active" | "redeemed" | "expired";
function deriveStatus(r: AdminRenewalOfferRow): Status {
  if (r.redeemedAtIso) return "redeemed";
  if (new Date(r.expiresAtIso) <= new Date()) return "expired";
  return "active";
}
const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  active:   { bg: "rgba(51,116,133,0.10)", fg: "#23596A", label: "Active" },
  redeemed: { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "Redeemed" },
  expired:  { bg: "rgba(0,0,0,0.06)",   fg: T.inkFaint, label: "Expired" },
};

export default function AdminRenewalOffersPanel() {
  const [rows, setRows] = useState<AdminRenewalOfferRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function refresh() {
    void listRenewalOffers({ limit: 100 }).then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onRunSweep() {
    setErrorMsg(null);
    setSweepResult(null);
    startTransition(async () => {
      try {
        const res = await runRenewalDiscountSweep();
        setSweepResult(`Scanned ${res.scanned} due-renewal members · ${res.candidates} at-risk · ${res.sent} offers sent · ${res.skipped} already had active offers · ${res.errors} errors`);
        refresh();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const counts = useMemo(() => {
    let active = 0, redeemed = 0, expired = 0;
    for (const r of rows ?? []) {
      const s = deriveStatus(r);
      if (s === "active") active++;
      else if (s === "redeemed") redeemed++;
      else expired++;
    }
    return { active, redeemed, expired };
  }, [rows]);

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
          Renewal Offers
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
          renewal countdown
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {counts.active} active · {counts.redeemed} redeemed
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: T.inkFaint }}>
          Cron sweep finds at-risk members (per health score) with renewal in the next 30 days and emails a one-time discount code. 90-day cooldown enforces "no spam".
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Active" value={counts.active} accent="#23596A" />
        <Tile label="Redeemed" value={counts.redeemed} accent={T.success} />
        <Tile label="Expired" value={counts.expired} accent={T.inkFaint} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={onRunSweep} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
          {pending ? "Running…" : "Run sweep now"}
        </button>
        <button type="button" onClick={refresh} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>↻ Refresh</button>
        {sweepResult && <p className="text-[11px]" style={{ color: T.success }}>{sweepResult}</p>}
        {errorMsg && <p className="text-[11px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No offers sent yet — run the sweep above or wait for the daily cron.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: T.surfaceAlt }}>
              <tr>
                <Th>Customer</Th>
                <Th>Code</Th>
                <Th align="right">% off</Th>
                <Th align="right">Sent</Th>
                <Th align="right">Expires</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = deriveStatus(r);
                const s = STATUS_STYLE[status];
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td className="px-4 py-2.5">
                      <p className="text-[12.5px] font-bold truncate" style={{ color: T.ink }}>{r.customerName}</p>
                      <p className="text-[10.5px] truncate" style={{ color: T.inkFaint }}>{r.customerEmail}</p>
                      {r.reason && <p className="text-[10px] italic" style={{ color: T.inkFaint }}>{r.reason}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: T.blueDeep }}>
                      {r.code}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px] font-black tabular-nums" style={{ color: T.success }}>
                      {r.percentOff}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>
                      {new Date(r.sentAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>
                      {new Date(r.expiresAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
                        {s.label}
                      </span>
                      {r.redeemedAtIso && (
                        <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>
                          {new Date(r.redeemedAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>{children}</th>;
}
function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
