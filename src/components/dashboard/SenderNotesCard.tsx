"use client";

/**
 * iter-168 — Sender thank-you notes inbox card.
 *
 * Lives on the dashboard overview between RenewalDiscount and the
 * referral leaderboard area. Lazy-loads notes; renders nothing when
 * the member has zero (so it stays out of the way for new members).
 *
 * UX:
 *  - 3-up grid of recent notes with the package thumbnail, sender name,
 *    short message preview, time
 *  - Click a note to expand it inline (full message + hide toggle)
 *  - "Show all" link reveals every note from the last 50
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMySenderNotes,
  hideSenderNote,
  type SenderNoteRow,
} from "@/app/actions/senderThankYou";

export default function SenderNotesCard() {
  const [notes, setNotes] = useState<SenderNoteRow[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function refresh() {
    void listMySenderNotes({ limit: showAll ? 100 : 6, includeHidden: showAll }).then(setNotes).catch(() => setNotes([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [showAll]);

  // Render nothing until loaded + only render if there ARE notes (this
  // is a "your mailbox got loved on" surface, not a "no notes yet" CTA).
  if (notes == null) return null;
  if (notes.length === 0) return null;

  function onToggleHidden(n: SenderNoteRow) {
    startTransition(async () => {
      const res = await hideSenderNote({ id: n.id, hidden: !n.hidden });
      if (!res.error) refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Mailbox · Sender notes
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            Notes from senders 💌
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            People who scanned your package's share-link added these notes.
          </p>
        </div>
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "white", color: BRAND.blueDeep, border: `1px solid ${BRAND.border}` }}>
          {showAll ? "Show recent" : "Show all"}
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {notes.map((n) => {
          const expanded = expandedId === n.id;
          const truncated = n.message.length > 100 && !expanded;
          return (
            <li
              key={n.id}
              className="rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
              style={{ background: n.hidden ? "#FAFAF8" : "white", border: `1px solid ${BRAND.border}`, opacity: n.hidden ? 0.6 : 1 }}
              onClick={() => setExpandedId(expanded ? null : n.id)}
            >
              <div className="flex items-start gap-2">
                {n.mailItemImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.mailItemImageUrl} alt="" className="w-12 h-12 rounded-md object-cover" style={{ border: `1px solid ${BRAND.border}` }} />
                ) : (
                  <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: "#F4EEE3", border: `1px solid ${BRAND.border}` }}>
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black truncate" style={{ color: BRAND.ink }}>
                    {n.senderName ?? "Anonymous sender"}
                  </p>
                  <p className="text-[10px]" style={{ color: BRAND.inkSoft }}>
                    {n.mailItemType.toLowerCase()} from {n.mailItemFrom}
                  </p>
                </div>
                {n.hidden && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(120,113,108,0.10)", color: "#57534e" }}>HIDDEN</span>
                )}
              </div>
              <p className="text-[12px] mt-2" style={{ color: BRAND.ink, lineHeight: 1.45 }}>
                {truncated ? n.message.slice(0, 100) + "…" : n.message}
              </p>
              <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: BRAND.inkSoft }}>
                <span>{fmtRel(n.createdAtIso)}</span>
                {expanded && (
                  <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); onToggleHidden(n); }}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "white", color: n.hidden ? BRAND.blueDeep : "#57534e", border: `1px solid ${BRAND.border}` }}
                  >
                    {n.hidden ? "Unhide" : "Hide"}
                  </button>
                )}
              </div>
              {expanded && n.senderEmail && (
                <p className="text-[10px] mt-1.5" style={{ color: BRAND.blueDeep }}>
                  ✉️ <a href={`mailto:${n.senderEmail}`} onClick={(e) => e.stopPropagation()} style={{ color: "inherit" }}>{n.senderEmail}</a>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function fmtRel(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.floor(day / 30)}mo ago`;
}
