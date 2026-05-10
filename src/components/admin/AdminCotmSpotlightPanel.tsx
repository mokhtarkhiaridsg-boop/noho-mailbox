"use client";

/**
 * iter-169 — Admin review queue for CotM marketing spotlights.
 *
 * Admin lands on a default `pending` filter and approves or rejects
 * each row. Approved rows show on the marketing homepage. Rejected
 * rows show the reason to the member, who can resubmit.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAdminCotmSlots,
  publishCotmSpotlight,
  rejectCotmSpotlight,
  type AdminCotmSlotRow,
  type CotmSlotStatus,
} from "@/app/actions/cotmMarketingSlot";

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

const STATUS_FILTERS: Array<{ key: CotmSlotStatus | "all"; label: string }> = [
  { key: "pending",   label: "Pending" },
  { key: "published", label: "Published" },
  { key: "rejected",  label: "Rejected" },
  { key: "retracted", label: "Retracted" },
  { key: "all",       label: "All" },
];

export default function AdminCotmSpotlightPanel() {
  const [filter, setFilter] = useState<CotmSlotStatus | "all">("pending");
  const [rows, setRows] = useState<AdminCotmSlotRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setRows(null);
    void listAdminCotmSlots({ status: filter }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onPublish(row: AdminCotmSlotRow) {
    if (!confirm(`Publish "${row.businessName}" to the homepage?`)) return;
    startTransition(async () => {
      const res = await publishCotmSpotlight({ id: row.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  function onReject(row: AdminCotmSlotRow) {
    const reason = prompt(`Reject "${row.businessName}" — reason (shown to member):`, "");
    if (!reason || reason.trim().length < 2) return;
    startTransition(async () => {
      const res = await rejectCotmSpotlight({ id: row.id, reason: reason.trim() });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Marketing · CotM spotlights
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Customer-of-the-Month spotlights
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Members opt in to a homepage spotlight from their dashboard. Review submissions here. Only the most recent <strong>published</strong> slot shows on nohomailbox.org.
        </p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: filter === f.key ? T.blue : "white",
              color: filter === f.key ? "white" : T.inkSoft,
              border: `1px solid ${filter === f.key ? T.blue : T.border}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No spotlights in this state.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 items-start">
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt="" className="w-20 h-20 rounded-xl object-cover" style={{ border: `1px solid ${T.border}` }} />
                ) : (
                  <div className="w-20 h-20 rounded-xl grid place-items-center" style={{ background: T.surfaceAlt, fontSize: 32 }}>🌟</div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-black" style={{ color: T.ink }}>{r.businessName}</p>
                    <StatusBadge status={r.status} />
                    <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                      Member: {r.userName} · suite #{r.suiteNumber ?? "—"}
                    </span>
                    <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                      Award: {r.year}-{String(r.month).padStart(2, "0")}
                    </span>
                  </div>
                  <blockquote className="mt-1.5 text-[12.5px] italic" style={{ color: T.inkSoft, borderLeft: `3px solid ${T.warning}`, paddingLeft: 8 }}>
                    “{r.quote}”
                  </blockquote>
                  {r.websiteUrl && (
                    <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-mono mt-1 inline-block" style={{ color: T.blueDeep }}>
                      {r.websiteUrl} ↗
                    </a>
                  )}
                  <p className="text-[10px] mt-1.5" style={{ color: T.inkFaint }}>
                    Citation: <em>{r.awardCitation}</em>
                  </p>
                  {r.rejectionReason && (
                    <p className="text-[10.5px] mt-1.5" style={{ color: T.danger }}>
                      Rejection reason: {r.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {(r.status === "pending" || r.status === "rejected" || r.status === "retracted") && (
                    <button type="button" disabled={busy} onClick={() => onPublish(r)} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                      ✓ Publish
                    </button>
                  )}
                  {r.status === "pending" && (
                    <button type="button" disabled={busy} onClick={() => onReject(r)} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
                      Reject
                    </button>
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

function StatusBadge({ status }: { status: CotmSlotStatus }) {
  const style = {
    pending:   { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "PENDING" },
    published: { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "PUBLISHED" },
    retracted: { bg: "rgba(120,113,108,0.12)", fg: "#57534e", label: "RETRACTED" },
    rejected:  { bg: "rgba(239,68,68,0.10)",  fg: "#991b1b", label: "REJECTED" },
  }[status];
  return (
    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: style.bg, color: style.fg }}>
      {style.label}
    </span>
  );
}
