"use client";

// iter-102 — Member-side ID expiring banner.
//
// Top-of-dashboard urgency strip. Stays out of the way (single line,
// dismissible per-session) unless the doc is actually expired or in the
// 7-day window — then it stays sticky. Click → Compliance tab.

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyIdExpiryStatus, type ExpiryStage } from "@/app/actions/idExpiry";

type Row = {
  document: "primary" | "secondary";
  type: string | null;
  expDate: string;
  daysLeft: number;
  stage: ExpiryStage;
};

function tone(stage: ExpiryStage): { bg: string; border: string; ink: string; chipBg: string } {
  if (stage === "expired") return { bg: "rgba(231,0,19,0.08)", border: "#E70013", ink: "#991b1b", chipBg: "rgba(231,0,19,0.18)" };
  if (stage === "7d")      return { bg: "rgba(245,166,35,0.12)", border: "#F5A623", ink: "#92400e", chipBg: "rgba(245,166,35,0.22)" };
  if (stage === "30d")     return { bg: "rgba(245,166,35,0.06)", border: "#F5A623", ink: "#92400e", chipBg: "rgba(245,166,35,0.16)" };
  return                       { bg: "rgba(51,116,133,0.06)", border: "#337485", ink: "#23596A", chipBg: "rgba(51,116,133,0.14)" };
}

export default function IdExpiringBanner() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancel = false;
    getMyIdExpiryStatus()
      .then((r) => { if (!cancel) setRows(r as Row[]); })
      .catch(() => { if (!cancel) setRows([]); });
    return () => { cancel = true; };
  }, []);

  if (!rows || rows.length === 0) return null;

  // Most-urgent row drives the banner.
  const lead = rows.slice().sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const t = tone(lead.stage);

  // Soft dismissal allowed for the gentle 90d/30d tiers; 7d + expired stay.
  const sticky = lead.stage === "expired" || lead.stage === "7d";
  if (dismissed && !sticky) return null;

  const headline = lead.stage === "expired"
    ? `Your ${lead.type ?? "ID"} on file has expired (${lead.expDate})`
    : `Your ${lead.type ?? "ID"} expires in ${lead.daysLeft} day${lead.daysLeft === 1 ? "" : "s"} (${lead.expDate})`;

  return (
    <div
      role="alert"
      className="rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 flex-wrap"
      style={{ background: t.bg, border: `1px solid ${t.border}66`, borderLeftWidth: 3, borderLeftColor: t.border }}
    >
      <span className="text-[10.5px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
        style={{ background: t.chipBg, color: t.ink }}>
        {lead.stage === "expired" ? "ID expired" : `ID expires soon`}
      </span>
      <p className="flex-1 min-w-0 text-[12.5px] font-bold truncate" style={{ color: t.ink }}>
        {headline}
      </p>
      {rows.length > 1 && (
        <span className="text-[10.5px] font-bold opacity-70" style={{ color: t.ink }}>
          +{rows.length - 1} more
        </span>
      )}
      <Link href="/dashboard?tab=settings"
        className="px-3 py-1.5 rounded-lg text-[11px] font-black"
        style={{ background: t.border, color: "white" }}>
        Renew ID
      </Link>
      {!sticky && (
        <button type="button" onClick={() => setDismissed(true)}
          className="text-[11px] font-bold opacity-60 hover:opacity-100"
          style={{ color: t.ink }}>
          Dismiss
        </button>
      )}
    </div>
  );
}
