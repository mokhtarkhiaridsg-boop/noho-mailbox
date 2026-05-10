"use client";

/**
 * iter-186 — Member-side dispute thread card.
 *
 * Renders only when the member has at least one open StorageFeeDispute.
 * Shows the thread + a reply composer. Auto-marks read on mount.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyDisputeThread,
  postDisputeMessage,
  markDisputeRead,
  type DisputeThreadView,
} from "@/app/actions/disputeMessages";
import { getMyStorageDisputes } from "@/app/actions/storageDispute";

export default function DisputeThreadCard() {
  const [openDisputeIds, setOpenDisputeIds] = useState<string[] | null>(null);
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);
  const [thread, setThread] = useState<DisputeThreadView | null>(null);
  const [body, setBody] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Discover open disputes for this member.
  useEffect(() => {
    void getMyStorageDisputes().then((map) => {
      const open = Object.values(map).filter((d) => d.status === "Open").map((d) => d.id);
      setOpenDisputeIds(open);
      if (open.length > 0 && !activeDisputeId) setActiveDisputeId(open[0]!);
    }).catch(() => setOpenDisputeIds([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the active thread + auto-mark read.
  useEffect(() => {
    if (!activeDisputeId) return;
    void getMyDisputeThread({ disputeId: activeDisputeId }).then(setThread).catch(() => setThread(null));
    void markDisputeRead({ disputeId: activeDisputeId }).catch(() => undefined);
  }, [activeDisputeId]);

  if (openDisputeIds == null) return null;
  if (openDisputeIds.length === 0) return null;
  if (!thread) return null;

  function onPost() {
    if (!activeDisputeId) return;
    setError(null);
    if (body.trim().length < 2) { setError("Type a message."); return; }
    startTransition(async () => {
      const res = await postDisputeMessage({ disputeId: activeDisputeId, body });
      if (!res.ok) { setError(res.error ?? "Send failed"); return; }
      setBody("");
      void getMyDisputeThread({ disputeId: activeDisputeId }).then(setThread).catch(() => undefined);
    });
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Billing · Open dispute
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            Storage dispute · ${(thread.feeCents / 100).toFixed(2)}
            {thread.unreadForViewer > 0 && (
              <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(239,68,68,0.10)", color: "#991b1b" }}>
                {thread.unreadForViewer} new
              </span>
            )}
          </h3>
          <p className="text-[11px] mt-0.5 italic" style={{ color: BRAND.inkSoft }}>
            Your reason: "{thread.reason}"
          </p>
        </div>
      </div>

      {openDisputeIds.length > 1 && (
        <div className="mt-3 flex gap-1 flex-wrap">
          {openDisputeIds.map((id, i) => (
            <button key={id} type="button" onClick={() => setActiveDisputeId(id)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
              background: activeDisputeId === id ? BRAND.blue : "white",
              color: activeDisputeId === id ? "white" : BRAND.inkSoft,
              border: `1px solid ${activeDisputeId === id ? BRAND.blue : BRAND.border}`,
            }}>
              Dispute {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl p-3 max-h-80 overflow-y-auto space-y-2" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
        {thread.messages.length === 0 ? (
          <p className="text-[11.5px] italic text-center" style={{ color: BRAND.inkFaint }}>No replies yet — say something below to get the conversation started.</p>
        ) : thread.messages.map((m) => {
          const isMine = m.authorRole === "MEMBER";
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] rounded-2xl px-3 py-2" style={{
                background: isMine ? BRAND.blue : "white",
                color: isMine ? "white" : BRAND.ink,
                border: isMine ? "none" : `1px solid ${BRAND.border}`,
              }}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-75">
                  {isMine ? "You" : (m.authorName ?? "NOHO Team")}
                </p>
                <p className="text-[12.5px] mt-0.5 whitespace-pre-wrap" style={{ lineHeight: 1.45 }}>{m.body}</p>
                <p className="text-[9.5px] mt-0.5 opacity-70">
                  {new Date(m.createdAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} placeholder="Type your reply…" className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        {error && <p className="text-[11px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
        <div className="flex justify-end">
          <button type="button" disabled={busy || body.trim().length < 2} onClick={onPost} className="text-[12px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
            {busy ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>
    </section>
  );
}
