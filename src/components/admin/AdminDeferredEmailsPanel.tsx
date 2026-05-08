"use client";

// iter-130 — Holiday-aware deferred-email queue.

import { useEffect, useState, useTransition } from "react";
import {
  listAdminDeferredEmails,
  adminCancelDeferred,
  adminSendDeferredNow,
  type DeferredRow,
} from "@/app/actions/deferredEmail";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type StatusFilter = "Pending" | "Sent" | "Failed" | "Cancelled" | "all";

export default function AdminDeferredEmailsPanel() {
  const [data, setData] = useState<{ rows: DeferredRow[]; pendingCount: number } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("Pending");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void listAdminDeferredEmails({ status: filter })
      .then(setData)
      .catch(() => setData({ rows: [], pendingCount: 0 }));
  }
  useEffect(() => { refresh(); }, [filter]);

  function cancel(id: string) {
    if (!confirm("Cancel this queued email? It won't be sent.")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await adminCancelDeferred(id);
      if (res.error) { setMsg(res.error); return; }
      setMsg("Cancelled");
      refresh();
    });
  }
  function sendNow(id: string) {
    if (!confirm("Send this email immediately, skipping the holiday defer?")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await adminSendDeferredNow(id);
      if (res.error) { setMsg(res.error); return; }
      setMsg("✓ Sent");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          System · Deferred emails
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Holiday-aware email queue</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Time-sensitive emails (storage warnings, plan-renewal nudges, ID-expiry alerts) get queued here when they land during a closure. The hourly drain cron sends them when the bureau re-opens — so customers don't get a "renew today" email when we're closed.
        </p>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Tile label="Pending queue" value={data?.pendingCount ?? 0} accent={(data?.pendingCount ?? 0) > 0 ? "#92400e" : "#15803d"} />
        <Tile label="Showing" value={data?.rows.length ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Filter" value={filter === "all" ? "All" : filter} accent={NOHO_INK} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["Pending", "Sent", "Failed", "Cancelled", "all"] as StatusFilter[]).map((s) => {
          const active = filter === s;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: active ? NOHO_BLUE : "white",
                color: active ? "white" : NOHO_INK,
                border: `1px solid ${active ? NOHO_BLUE : "#e8e5e0"}`,
              }}>
              {s === "all" ? "All" : s}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            {filter === "Pending" ? "No emails queued — all sends going out in real time. ✓" : "No emails in this view."}
          </p>
        ) : (
          <ul>
            {data.rows.map((r, i) => (
              <li key={r.id} className="px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                      {r.recipientName ?? r.recipientEmail}
                      <StatusChip status={r.status} />
                      <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        {r.kind}
                      </span>
                    </p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: NOHO_INK }}>{r.subject}</p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {r.recipientEmail} · enqueued {new Date(r.enqueuedAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {r.sentAtIso && ` · sent ${new Date(r.sentAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                    </p>
                    <p className="text-[11px] mt-1.5 italic" style={{ color: NOHO_INK, background: "rgba(245,166,35,0.06)", padding: "6px 10px", borderRadius: "6px" }}>
                      {r.reason}
                    </p>
                    {r.lastError && (
                      <p className="text-[10.5px] mt-1" style={{ color: "#991b1b" }}>
                        Last error: {r.lastError} · {r.attemptCount} attempt{r.attemptCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  {r.status === "Pending" && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => sendNow(r.id)} disabled={pending}
                        className="px-2.5 py-1.5 rounded-md text-[10.5px] font-black text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
                        Send now
                      </button>
                      <button type="button" onClick={() => cancel(r.id)} disabled={pending}
                        className="px-2.5 py-1.5 rounded-md text-[10.5px] font-bold border disabled:opacity-50"
                        style={{ borderColor: "#dc2626", color: "#991b1b", background: "white" }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Cron setup
        </p>
        <p className="text-[11.5px] mt-1" style={{ color: NOHO_INK }}>
          Schedule a periodic GET to <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(45,16,15,0.06)" }}>/api/cron/deferred-email-drain</code> with header <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(45,16,15,0.06)" }}>Authorization: Bearer ${'${CRON_SECRET}'}</code>. Recommended: every hour during business hours.
        </p>
        <p className="text-[10.5px] mt-2 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
          Default deferred kinds: storage_fee, plan_renewal_reminder, id_expiring, vacation_hold_*, auto_renew_reminder, wallet_auto_top_up_fired, guest_pickup_auth, package_insured.
        </p>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #E5DACA" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const c = status === "Pending"   ? { bg: "rgba(245,166,35,0.18)", fg: "#92400e" }
          : status === "Sent"      ? { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" }
          : status === "Failed"    ? { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" }
          :                          { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" };
  return (
    <span className="ml-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}
