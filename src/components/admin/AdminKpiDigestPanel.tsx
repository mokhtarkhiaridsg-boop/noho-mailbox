"use client";

// iter-104 — Daily KPI digest admin panel.
//
// Two sections: live preview of yesterday's snapshot (cards in the same
// shape as the email) + "Send now" button so admin can fire the digest
// outside the daily cron. Last-sent timestamp surfaces from the audit
// row written by the action.

import { useEffect, useState, useTransition } from "react";
import {
  adminPreviewKpiDigest,
  adminSendKpiDigestNow,
  type KpiSnapshot,
} from "@/app/actions/kpiDigest";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

export default function AdminKpiDigestPanel() {
  const [snap, setSnap] = useState<KpiSnapshot | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void adminPreviewKpiDigest()
      .then((r) => setSnap(r.snap))
      .catch(() => setSnap({ windowStartIso: "", windowEndIso: "", windowLabel: "—", cards: [] }));
  }
  useEffect(() => { refresh(); }, []);

  function send() {
    if (!confirm("Send the daily digest to all admins right now?")) return;
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await adminSendKpiDigestNow();
        setMsg(`✓ Sent · ${r.sent} delivered · ${r.failed} failed (${r.recipients} admins)`);
      } catch (e) {
        setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
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
          Daily Digest
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
          morning numbers
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {snap ? `${snap.cards.length} card${snap.cards.length === 1 ? "" : "s"} · ${snap.windowLabel}` : "loading"}
        </span>
      </div>

      {msg && (
        <div className="rounded-xl px-3 py-2 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      <div className="rounded-md bg-white p-4" style={{ border: "1px solid #ECEEF1" }}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>
              Preview · {snap?.windowLabel ?? "loading…"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
              Same data the email will contain. Refreshes when you reopen this tab.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={refresh} disabled={pending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
              Refresh
            </button>
            <button type="button" onClick={send} disabled={pending || !snap}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
              {pending ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>

        {!snap ? (
          <p className="text-[12px] italic" style={{ color: "rgba(0,0,0,0.55)" }}>Loading…</p>
        ) : snap.cards.length === 0 ? (
          <p className="text-[12px] italic" style={{ color: "rgba(0,0,0,0.55)" }}>No data window available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {snap.cards.map((c) => {
              const arrow = c.delta?.direction === "up" ? "▲" : c.delta?.direction === "down" ? "▼" : "•";
              const arrowColor = c.delta?.direction === "up" ? "#15803d" : c.delta?.direction === "down" ? "#991b1b" : "rgba(0,0,0,0.45)";
              return (
                <div key={c.key} className="rounded-xl p-3"
                  style={{ background: "#f7faff", border: "1px solid #e8f0fa" }}>
                  <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.45)" }}>{c.label}</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: NOHO_INK, letterSpacing: "-0.5px" }}>
                    {c.value}{c.unit && <span className="text-[12px] font-bold ml-1" style={{ color: "rgba(0,0,0,0.55)" }}>{c.unit}</span>}
                  </p>
                  {c.delta ? (
                    <p className="text-[10.5px] font-bold mt-1" style={{ color: arrowColor }}>{arrow} {c.delta.label}</p>
                  ) : c.detail ? (
                    <p className="text-[10.5px] mt-1" style={{ color: "rgba(0,0,0,0.55)" }}>{c.detail}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md bg-white p-4" style={{ border: "1px solid #ECEEF1" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>
          Cron setup
        </p>
        <p className="text-[11.5px] mt-1" style={{ color: NOHO_INK }}>
          Schedule a daily GET to <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)" }}>/api/cron/kpi-digest</code> with header <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)" }}>Authorization: Bearer ${'${CRON_SECRET}'}</code>. Recommended cadence: every day at 7:30am PT.
        </p>
        <p className="text-[10.5px] mt-2 italic" style={{ color: "rgba(0,0,0,0.55)" }}>
          Tip: pair this with the iter-103 webhook bridge to also push the same KPI events into your Slack channel as they happen — the digest is the daily wrap, the webhooks are the live feed.
        </p>
      </div>
    </div>
  );
}
