"use client";

/**
 * iter-205 — Google Business Profile auto-publish admin panel (Tier 14 #114).
 *
 * Shows configured/unconfigured state for GBP_* env vars, last-publish
 * timestamp, the live payload preview (regularHours periods + special
 * holidays), and a "🚀 Publish now" force-republish button. Renders
 * helpful "missing env vars" hint when not yet configured.
 */

import { useEffect, useState, useTransition } from "react";
import { previewGbpHoursPublish, forceGbpHoursPublish, type GbpPublishResult } from "@/app/actions/gbpHoursPublish";

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

const DAY_LABELS: Record<string, string> = {
  SUNDAY: "Sun", MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
};

function fmtTp(t: { hours: number; minutes: number }): string {
  return `${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}`;
}

export default function AdminGbpHoursPanel() {
  const [data, setData] = useState<GbpPublishResult | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    void previewGbpHoursPublish().then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }
  useEffect(refresh, []);

  function onForce() {
    setInfo(null); setError(null);
    if (!confirm("Force-publish current hours to Google Business Profile now?")) return;
    startTransition(async () => {
      try {
        const res = await forceGbpHoursPublish();
        setData(res);
        if (res.error) setError(res.error);
        else if (res.pushed) setInfo(`✓ Published ${res.periodsRegular} regular + ${res.periodsSpecial} special periods`);
        else if (!res.configured) setError("GBP_* env vars not configured — cannot push live.");
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
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
          GBP Hours
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
          we are open
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {data?.configured ? "configured" : "setup pending"}
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        Daily cron pushes iter-90 OperatingHours (weekly + holidays) to your Google Business Profile so customers searching Google see live hours and holiday closures. Skips the push if nothing changed.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Status" value={data.configured ? "Configured" : "Setup pending"} accent={data.configured ? T.success : T.warning} />
            <Tile label="Last publish" value={data.lastPublishedAtIso ? new Date(data.lastPublishedAtIso).toLocaleDateString() : "Never"} accent={T.blueDeep} />
            <Tile label="Regular periods" value={data.payloadPreview?.regular.periods.length ?? 0} accent={T.blue} />
            <Tile label="Special days" value={data.payloadPreview?.special.specialHourPeriods.length ?? 0} accent={T.warning} />
          </div>

          {!data.configured && data.missing && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.30)" }}>
              <p className="text-[11.5px] font-semibold" style={{ color: "#92400e" }}>⚙️ Missing env vars</p>
              <ul className="text-[11px] mt-1 list-disc pl-5" style={{ color: T.inkSoft }}>
                {data.missing.map((m) => <li key={m} className="font-mono">GBP_{m.replace(/([A-Z])/g, "_$1").toUpperCase()}</li>)}
              </ul>
              <p className="text-[10.5px] mt-2" style={{ color: T.inkFaint }}>
                See Google&apos;s OAuth 2.0 + My Business Business Information API docs to mint a refresh token tied to the bureau&apos;s GBP listing. The dry-run preview below shows the payload regardless.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={onForce} disabled={busy || !data.configured}
              className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {busy ? "Publishing…" : "🚀 Publish now"}
            </button>
            <button type="button" onClick={refresh} disabled={busy}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              ↻ Refresh preview
            </button>
            <span className="text-[10px] self-center" style={{ color: T.inkFaint }}>
              Payload hash: <code className="font-mono">{data.payloadHash}</code>
              {data.unchanged && " · unchanged since last push"}
            </span>
          </div>

          {data.payloadPreview && (
            <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>📋 Payload preview (what we&apos;d push)</p>

              <div>
                <p className="text-[11px] font-bold mb-1" style={{ color: T.ink }}>Weekly hours</p>
                {data.payloadPreview.regular.periods.length === 0 ? (
                  <p className="text-[11px] italic" style={{ color: T.inkFaint }}>No open days configured.</p>
                ) : (
                  <ul className="space-y-0.5 text-[11px] font-mono">
                    {data.payloadPreview.regular.periods.map((p, i) => (
                      <li key={i} style={{ color: T.ink }}>
                        <span style={{ color: T.blueDeep, display: "inline-block", minWidth: 36 }}>{DAY_LABELS[p.openDay] ?? p.openDay}</span>
                        {fmtTp(p.openTime)} → {fmtTp(p.closeTime)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {data.payloadPreview.special.specialHourPeriods.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold mb-1" style={{ color: T.ink }}>Special / holiday hours</p>
                  <ul className="space-y-0.5 text-[11px] font-mono">
                    {data.payloadPreview.special.specialHourPeriods.map((s, i) => {
                      const date = `${s.startDate.year}-${String(s.startDate.month).padStart(2, "0")}-${String(s.startDate.day).padStart(2, "0")}`;
                      return (
                        <li key={i} style={{ color: T.ink }}>
                          <span style={{ color: T.warning, display: "inline-block", minWidth: 100 }}>{date}</span>
                          {s.closed ? <span style={{ color: T.danger, fontWeight: 900 }}>CLOSED</span> : (s.openTime && s.closeTime ? `${fmtTp(s.openTime)} → ${fmtTp(s.closeTime)}` : "—")}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
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
