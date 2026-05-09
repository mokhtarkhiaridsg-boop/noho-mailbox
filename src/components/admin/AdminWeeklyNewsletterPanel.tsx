"use client";

/**
 * iter-159 — Weekly newsletter admin panel (Tier 10 #69).
 *
 * Live preview of the auto-compiled digest + optional editorial intro
 * + "Send now" override (idempotent unless `force` checkbox is on).
 * History list of past issues.
 */

import { useEffect, useState, useTransition } from "react";
import {
  previewWeeklyNewsletter,
  sendWeeklyNewsletter,
  listNewsletterIssues,
  type WeeklyDigest,
  type NewsletterIssueRow,
} from "@/app/actions/weeklyNewsletter";

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

export default function AdminWeeklyNewsletterPanel() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [html, setHtml] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [editorial, setEditorial] = useState<string>("");
  const [force, setForce] = useState<boolean>(false);
  const [issues, setIssues] = useState<NewsletterIssueRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function refreshPreview() {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await previewWeeklyNewsletter({ editorial });
        setDigest(res.digest); setHtml(res.html); setSubject(res.subject);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function refreshHistory() {
    void listNewsletterIssues(12).then(setIssues).catch(() => setIssues([]));
  }

  useEffect(() => { refreshPreview(); refreshHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function onSendNow() {
    if (!confirm(`Send the newsletter to all active members for week ${digest?.weekKey ?? "(unknown)"}?${force ? " (Force-resend ON.)" : ""}`)) return;
    setResultMsg(null);
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await sendWeeklyNewsletter({ editorial: editorial.trim() || undefined, force });
        if (res.alreadySent) {
          setResultMsg(`Skipped — week ${res.weekKey} was already sent. Toggle Force to override.`);
        } else {
          setResultMsg(`✓ Sent to ${res.recipients} member${res.recipients === 1 ? "" : "s"} · ${res.failed} failed`);
        }
        refreshHistory();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Communications · Weekly newsletter
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Bureau weekly newsletter
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Auto-compiles last week's volume + customer-of-the-month + top referrer + upcoming closures. Cron sends Mondays; you can preview, add an editorial intro, and send manually here.
        </p>
      </div>

      {digest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Mail handled" value={digest.totalMailHandled} accent={T.blue} />
          <Tile label="Packages" value={digest.totalPackages} accent={T.success} />
          <Tile label="Pickups" value={digest.totalPickups} accent={T.blueDeep} />
          <Tile label="Forwarded" value={digest.totalForwarded} accent={T.warning} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* Editorial editor + send controls */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            Editorial intro (optional)
          </p>
          <textarea
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            placeholder={"A note from the team — what made this week feel right? Any reminders for next week?"}
            rows={6}
            maxLength={1200}
            className="w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <p className="text-[10px]" style={{ color: T.inkFaint }}>
            {editorial.length}/1200 · rendered as a quoted note above the stats grid in the email.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" disabled={pending} onClick={refreshPreview} className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              ↻ Refresh preview
            </button>
            <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
              Force-resend
            </label>
            <button type="button" disabled={pending} onClick={onSendNow} className="ml-auto text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "Sending…" : "📨 Send now"}
            </button>
          </div>
          {resultMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{resultMsg}</p>}
          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
          {digest && (
            <div className="rounded-lg p-3 text-[10.5px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px solid ${T.border}` }}>
              Week: <span className="font-mono font-bold">{digest.weekKey}</span> · {digest.weekLabel}<br/>
              Subject preview: <strong style={{ color: T.ink }}>{subject}</strong>
            </div>
          )}
        </div>

        {/* Live HTML preview — sandboxed iframe so the email styles
            don't leak into the admin shell. */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
            Live preview
          </div>
          <div style={{ background: "#f1f1ec", padding: "14px" }}>
            <iframe
              title="Newsletter preview"
              srcDoc={html || "<p style=\"font-family:-apple-system\">Loading…</p>"}
              sandbox=""
              style={{ width: "100%", height: 540, border: "1px solid #ECEEF1", borderRadius: 10, background: "white" }}
            />
          </div>
        </div>
      </div>

      {/* Past issues */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Past issues</p>
          <button type="button" onClick={refreshHistory} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>↻</button>
        </div>
        {issues == null ? (
          <p className="p-4 text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
        ) : issues.length === 0 ? (
          <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>No newsletters sent yet.</div>
        ) : (
          <ul>
            {issues.map((i) => (
              <li key={i.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <span className="text-[11px] font-mono font-bold" style={{ color: T.blueDeep }}>{i.weekKey}</span>
                <span className="flex-1 truncate text-[12px]" style={{ color: T.ink }}>{i.subject}</span>
                <span className="text-[10.5px] tabular-nums" style={{ color: T.success }}>✓ {i.recipientCount}</span>
                {i.failedCount > 0 && <span className="text-[10.5px] tabular-nums" style={{ color: T.danger }}>✕ {i.failedCount}</span>}
                <span className="text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>
                  {new Date(i.sentAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
