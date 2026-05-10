"use client";

/**
 * iter-227 — 🔥 Priority queue card (Tier 17 #136).
 *
 * Surfaces the member's top-priority unscanned mail (≥40 score).
 * Renders ZERO when nothing's pending — keeps the dashboard clean
 * for members with no urgent mail.
 */

import { useEffect, useState } from "react";
import { BRAND } from "./types";
import { getMyPriorityQueue, type PriorityRow } from "@/app/actions/mailPriority";

export default function PriorityQueueCard() {
  const [rows, setRows] = useState<PriorityRow[] | null>(null);

  useEffect(() => {
    void getMyPriorityQueue({ limit: 8 }).then(setRows).catch(() => setRows([]));
  }, []);

  if (rows == null || rows.length === 0) return null;

  // Sort highest score first.
  const top = rows[0]!;
  const isUrgent = top.priorityScore >= 90;

  return (
    <section className="rounded-2xl bg-white border p-5"
      style={{
        borderColor: isUrgent ? "rgba(239,68,68,0.50)" : BRAND.border,
        boxShadow: isUrgent ? "0 8px 24px rgba(239,68,68,0.18)" : undefined,
      }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: isUrgent ? "#b91c1c" : "#92400e" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: isUrgent ? "#EF4444" : "#F59E0B", boxShadow: `0 0 6px ${isUrgent ? "#EF4444" : "#F59E0B"}` }} />
            🔥 Priority queue
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            {isUrgent ? "Action needed soon" : "Worth your attention"} ({rows.length})
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            AI-scored 0-100 by content + classifier signals. Court summons + tax forms top the list; junk + ads are filtered out.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: r.bandBg, border: `1px solid ${r.band === "Urgent" ? "rgba(239,68,68,0.40)" : BRAND.border}` }}>
            <div style={{ minWidth: 56, textAlign: "center" }}>
              <p className="font-mono font-black tabular-nums" style={{ fontSize: 24, color: r.bandColor, lineHeight: 1 }}>{r.priorityScore}</p>
              <p className="text-[9.5px] font-black uppercase tracking-wider mt-1" style={{ color: r.bandColor }}>{r.bandEmoji} {r.band}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{r.from}</p>
              <p className="text-[10.5px]" style={{ color: BRAND.inkFaint }}>
                {r.type} · {r.status} · arrived {new Date(r.intakeAtIso).toLocaleDateString()}
              </p>
              {r.topReasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.topReasons.map((t, i) => (
                    <span key={i} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                      {t.reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a href="/dashboard?tab=mail" className="text-[10.5px] font-black px-2.5 py-1 rounded-md text-white shrink-0" style={{ background: BRAND.blue, textDecoration: "none" }}>
              Open
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
