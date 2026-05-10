"use client";

/**
 * iter-181 — Admin mailbox-tours queue panel.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listMailboxTours,
  confirmMailboxTour,
  markTourCompleted,
  markTourNoShow,
  cancelMailboxTour,
  getMailboxTourCounts,
  getTourCalendarSubscribeUrl,
  type MailboxTourRow,
} from "@/app/actions/mailboxTour";

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

const STATUSES = ["all", "Pending", "Confirmed", "Completed", "No Show", "Cancelled"] as const;

export default function AdminMailboxToursPanel() {
  const [filter, setFilter] = useState<typeof STATUSES[number]>("Pending");
  const [rows, setRows] = useState<MailboxTourRow[] | null>(null);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getMailboxTourCounts>> | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // iter-201: iCal subscribe URL — null until admin clicks "Reveal"
  const [calUrl, setCalUrl] = useState<{ url: string | null; configured: boolean } | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [copied, setCopied] = useState(false);

  function refresh() {
    void listMailboxTours({ status: filter === "all" ? undefined : (filter as MailboxTourRow["status"]) }).then(setRows).catch(() => setRows([]));
    void getMailboxTourCounts().then(setCounts).catch(() => undefined);
  }

  function loadCalUrl() {
    setShowCal(true);
    if (calUrl) return;
    void getTourCalendarSubscribeUrl().then(setCalUrl).catch(() => setCalUrl({ url: null, configured: false }));
  }
  function copyCalUrl() {
    if (!calUrl?.url) return;
    void navigator.clipboard.writeText(calUrl.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onConfirm(r: MailboxTourRow) {
    startTransition(async () => {
      const res = await confirmMailboxTour({ id: r.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onComplete(r: MailboxTourRow) {
    const becameMember = confirm(`Did "${r.name}" sign up after the tour? Click OK if yes, Cancel if no.`);
    const adminNotes = prompt("Notes (optional):") ?? undefined;
    startTransition(async () => {
      const res = await markTourCompleted({ id: r.id, becameMember, adminNotes: adminNotes?.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onNoShow(r: MailboxTourRow) {
    const reason = prompt(`Mark "${r.name}" as no-show? Reason (optional):`);
    if (reason === null) return;
    startTransition(async () => {
      const res = await markTourNoShow({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onCancel(r: MailboxTourRow) {
    const reason = prompt(`Cancel "${r.name}" tour? Reason (optional):`);
    if (reason === null) return;
    startTransition(async () => {
      const res = await cancelMailboxTour({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Marketing · Mailbox tours
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Tour booking queue</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Prospects book a 15-min walkthrough at <code style={{ background: T.surfaceAlt, padding: "0 4px", borderRadius: 3 }}>nohomailbox.org/tour</code>. Confirm here → fires a friendly confirmation email → mark complete (with conversion flag) after the visit.
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Pending" value={counts.pending} accent={counts.pending > 0 ? T.warning : T.inkFaint} />
          <Tile label="Confirmed today" value={counts.confirmedToday} accent={T.blue} />
          <Tile label="Completed (month)" value={counts.completedThisMonth} accent={T.success} />
          <Tile label="Conversion 30d" value={`${counts.conversionRate30d}%`} accent={counts.conversionRate30d >= 30 ? T.success : counts.conversionRate30d >= 10 ? T.warning : T.danger} />
        </div>
      )}

      {/* iter-201: Subscribe-to-calendar widget */}
      <div className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>📅 Subscribe in your calendar</p>
            <p className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
              Add this feed to Google Calendar / Apple Calendar / Outlook to see tours alongside your personal events. Updates every ~15min automatically.
            </p>
          </div>
          {!showCal ? (
            <button type="button" onClick={loadCalUrl} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white" style={{ background: T.blue }}>
              Reveal subscribe URL
            </button>
          ) : (
            <button type="button" onClick={() => setShowCal(false)} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              Hide
            </button>
          )}
        </div>
        {showCal && calUrl && (
          <div className="mt-2">
            {!calUrl.configured ? (
              <p className="text-[11px] font-semibold" style={{ color: T.danger }}>
                ⚠️ ADMIN_CAL_TOKEN env var not set on the server. Configure it (any random 32+ char string) and reload.
              </p>
            ) : calUrl.url ? (
              <>
                <code className="block text-[10.5px] break-all rounded p-2 font-mono" style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}>
                  {calUrl.url}
                </code>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={copyCalUrl} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white" style={{ background: copied ? T.success : T.blue }}>
                    {copied ? "✓ Copied!" : "📋 Copy URL"}
                  </button>
                  <a href={calUrl.url.replace(/^https?:/, "webcal:")} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}`, textDecoration: "none" }}>
                    Open in Calendar (webcal://)
                  </a>
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: T.inkFaint }}>
                  Treat this URL as a secret — anyone with it can read tour bookings. Rotate by changing ADMIN_CAL_TOKEN on the server.
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
            background: filter === s ? T.blue : "white",
            color: filter === s ? "white" : T.inkSoft,
            border: `1px solid ${filter === s ? T.blue : T.border}`,
          }}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No tours in this filter.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: r.status === "Cancelled" ? 0.55 : 1 }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-black" style={{ color: T.ink }}>{r.name}</p>
                    <StatusPill status={r.status} />
                    {r.becameMember && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>✓ CONVERTED</span>}
                    <span className="text-[10.5px] font-bold" style={{ color: T.blueDeep }}>
                      🗓 {r.requestedDate} · {r.requestedTime}
                    </span>
                    {r.partySize > 1 && <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· party of {r.partySize}</span>}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                    📧 <a href={`mailto:${r.email}`} style={{ color: T.blueDeep }}>{r.email}</a>
                    {r.phone && <> · 📞 <a href={`tel:${r.phone}`} style={{ color: T.blueDeep }}>{r.phone}</a></>}
                  </p>
                  {r.reason && (
                    <p className="text-[11px] italic mt-0.5" style={{ color: T.inkSoft }}>💬 {r.reason}</p>
                  )}
                  {r.adminNotes && (
                    <p className="text-[10.5px] mt-0.5 italic" style={{ color: T.inkFaint }}>📝 {r.adminNotes}</p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>Requested {fmtRel(r.createdAtIso)}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {r.status === "Pending" && (
                    <button type="button" onClick={() => onConfirm(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.blue }}>
                      ✓ Confirm
                    </button>
                  )}
                  {(r.status === "Confirmed" || r.status === "Pending") && (
                    <button type="button" onClick={() => onComplete(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                      ✓ Mark done
                    </button>
                  )}
                  {(r.status === "Confirmed" || r.status === "Pending") && (
                    <>
                      <button type="button" onClick={() => onNoShow(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                        No-show
                      </button>
                      <button type="button" onClick={() => onCancel(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: MailboxTourRow["status"] }) {
  const style = (() => {
    if (status === "Pending") return { bg: "rgba(245,158,11,0.12)", fg: "#92400e" };
    if (status === "Confirmed") return { bg: "rgba(25,118,255,0.10)", fg: "#0F5BD9" };
    if (status === "Completed") return { bg: "rgba(34,197,94,0.10)", fg: "#15803d" };
    if (status === "No Show") return { bg: "rgba(239,68,68,0.10)", fg: "#991b1b" };
    return { bg: "rgba(120,113,108,0.12)", fg: "#57534e" };
  })();
  return <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: style.bg, color: style.fg }}>{status}</span>;
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function fmtRel(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
