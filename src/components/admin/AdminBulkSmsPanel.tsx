"use client";

/**
 * iter-163 — Bulk SMS campaigns admin panel (Tier 10 #73).
 *
 * Compose → preview reachable opted-in members → optionally test-send
 * to your own phone → fire the real campaign. Past-issues list shows
 * succeeded / failed / not-sent counts per row.
 *
 * Design notes:
 *  - The audience preview is debounced (server-bound), but segment count
 *    is computed locally so it updates per keystroke.
 *  - "Marketing opt-in" toggle: when ON (default) only members who set
 *    `marketing.sms = true` in notifPrefs are reachable; when OFF we also
 *    include anyone who's enabled the transactional `mailArrived` SMS
 *    channel. The panel makes the cost of relaxing this explicit.
 *  - The Send button is double-gated: explicit confirm() + a typed-in
 *    "SEND" word match for any audience >100 reachable.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  previewBulkSmsAudience,
  sendBulkSms,
  listBulkSmsCampaigns,
  getBulkSmsAudienceOptions,
  type SmsAudience,
  type BulkSmsCampaignRow,
} from "@/app/actions/bulkSms";
import { computeSegments } from "@/lib/sms-segments";

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

type AudKind = "all" | "plan" | "expired" | "explicit";

const TEMPLATES: Array<{ name: string; body: string }> = [
  { name: "Holiday hours reminder",
    body: "NOHO Mailbox: hi {{firstName}} — reminder we're closed Mon for Memorial Day. Box access via your suite key still works 24/7. Mail resumes Tue 9:30am." },
  { name: "Storage clearout nudge",
    body: "NOHO: hey {{firstName}}, suite #{{suiteNumber}} has packages waiting >7d. Pop by today to skip storage fees. Mon-Fri 9:30am-5:30pm. Reply STOP to opt out." },
  { name: "Bureau open house",
    body: "NOHO Mailbox: open-house Sat 10am-2pm 🎉 free coffee + 10% off pkg supplies. 5062 Lankershim Blvd. Bring a friend, get a free notary stamp. {{firstName}} we hope to see you!" },
];

export default function AdminBulkSmsPanel() {
  const [aud, setAud] = useState<AudKind>("all");
  const [plan, setPlan] = useState<string>("");
  const [explicit, setExplicit] = useState<string>("");
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(true);
  const [body, setBody] = useState<string>(TEMPLATES[0]!.body);
  const [label, setLabel] = useState<string>("");
  const [testPhone, setTestPhone] = useState<string>("");

  const [options, setOptions] = useState<Awaited<ReturnType<typeof getBulkSmsAudienceOptions>> | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBulkSmsAudience>> | null>(null);
  const [issues, setIssues] = useState<BulkSmsCampaignRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [sendPending, startSendTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audience: SmsAudience = useMemo(() => {
    if (aud === "all") return { kind: "all" };
    if (aud === "plan") return { kind: "plan", plan };
    if (aud === "expired") return { kind: "expired" };
    return { kind: "explicit", phones: explicit.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) };
  }, [aud, plan, explicit]);

  const localSegs = useMemo(() => computeSegments(body), [body]);

  const refreshOptions = useCallback(() => {
    void getBulkSmsAudienceOptions().then(setOptions).catch(() => undefined);
  }, []);
  const refreshIssues = useCallback(() => {
    void listBulkSmsCampaigns(20).then(setIssues).catch(() => setIssues([]));
  }, []);
  const refreshPreview = useCallback(() => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await previewBulkSmsAudience({ audience, body, marketingOptIn });
        setPreview(res);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }, [audience, body, marketingOptIn]);

  useEffect(() => { refreshOptions(); refreshIssues(); }, [refreshOptions, refreshIssues]);
  // Debounced re-preview when audience / body / opt-in toggle changes.
  useEffect(() => {
    const h = setTimeout(refreshPreview, 350);
    return () => clearTimeout(h);
  }, [refreshPreview]);

  function applyTemplate(t: { name: string; body: string }) {
    setBody(t.body);
    if (!label.trim()) setLabel(t.name);
  }

  function onTestSend() {
    setErrorMsg(null);
    setResultMsg(null);
    startSendTransition(async () => {
      try {
        const res = await sendBulkSms({ label, audience, body, marketingOptIn, testPhone });
        if (res.errors[0]) {
          setErrorMsg(res.errors[0].reason);
        } else {
          setResultMsg(`✓ Test sent (${res.sent ? "sent" : res.notSent ? "logged — Twilio off" : "failed"})`);
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function onSendNow() {
    if (!preview || preview.reachable === 0) {
      setErrorMsg("Audience matched 0 reachable opted-in members.");
      return;
    }
    const summary = `Send "${label || "(unlabeled)"}" to ${preview.reachable} member${preview.reachable === 1 ? "" : "s"}? (~${preview.estimatedSegmentsTotal} segments at ~$0.0079/segment ≈ $${(preview.estimatedSegmentsTotal * 0.0079).toFixed(2)})`;
    if (!confirm(summary)) return;
    if (preview.reachable > 100) {
      const word = window.prompt(`Audience >100. Type SEND to confirm.`);
      if (word?.trim().toUpperCase() !== "SEND") {
        setErrorMsg("Cancelled — confirmation phrase not matched.");
        return;
      }
    }
    setErrorMsg(null);
    setResultMsg(null);
    startSendTransition(async () => {
      try {
        const res = await sendBulkSms({ label, audience, body, marketingOptIn });
        if (!res.ok) {
          setErrorMsg(res.errors[0]?.reason ?? "Unknown error");
          return;
        }
        setResultMsg(`✓ Campaign sent — ${res.sent} delivered · ${res.failed} failed · ${res.notSent} not sent`);
        refreshIssues();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
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
          Bulk SMS
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
          ping the room
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {preview?.reachable ?? 0} reachable
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        Compose, audience-target, and send a campaign to opted-in members via Twilio.
        Costs render below per recipient. Per-customer SMS preferences are honored — members who haven&apos;t opted in are auto-skipped.
      </p>

      {options && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Active members" value={options.totalActive} accent={T.blue} />
          <Tile label="With phone #" value={options.totalWithPhone} accent={T.success} />
          <Tile label="SMS opted-in" value={options.totalSmsOptedIn} accent={T.blueDeep} />
          <Tile label="Reachable now" value={preview?.reachable ?? 0} accent={T.warning} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* Compose pane */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            Audience
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "plan", "expired", "explicit"] as AudKind[]).map((k) => {
              const active = aud === k;
              const label = k === "all" ? "All members" : k === "plan" ? "By plan" : k === "expired" ? "Expired plans" : "Explicit phones";
              return (
                <button key={k} type="button" onClick={() => setAud(k)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: active ? T.blue : T.surfaceAlt,
                    color: active ? "white" : T.inkSoft,
                    border: `1px solid ${active ? T.blue : T.border}`,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
          {aud === "plan" && (
            <select value={plan} onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[12.5px]"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}>
              <option value="">Pick a plan…</option>
              {(options?.plans ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {aud === "explicit" && (
            <textarea value={explicit} onChange={(e) => setExplicit(e.target.value)}
              placeholder={"+18185067744\n+15551234567"}
              rows={4}
              className="w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none font-mono"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          )}
          <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            <span>Strict marketing opt-in only</span>
            <span className="ml-1 text-[10px] font-normal" style={{ color: T.inkFaint }}>
              (off = also reach members with transactional SMS turned on)
            </span>
          </label>

          <p className="text-[10px] font-black uppercase tracking-[0.16em] pt-2" style={{ color: T.inkFaint }}>
            Quick templates
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => applyTemplate(t)}
                className="px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                {t.name}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.16em] pt-2" style={{ color: T.inkFaint }}>
            Campaign label (history)
          </p>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Internal name e.g. 'May closure reminder'"
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg outline-none text-[12.5px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] pt-2" style={{ color: T.inkFaint }}>
            Body — supports {`{{firstName}}`} · {`{{suiteNumber}}`}
          </p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <div className="flex items-center justify-between text-[10.5px]" style={{ color: T.inkFaint }}>
            <span>
              {localSegs.length} chars · <strong style={{ color: T.ink }}>{localSegs.segments}</strong> segment{localSegs.segments === 1 ? "" : "s"} ({localSegs.encoding})
            </span>
            {preview && preview.reachable > 0 && (
              <span>
                ≈ <strong style={{ color: T.ink }}>{preview.estimatedSegmentsTotal}</strong> total · ~${(preview.estimatedSegmentsTotal * 0.0079).toFixed(2)}
              </span>
            )}
          </div>

          <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Test phone (E.164)"
              className="flex-1 min-w-0 px-2 py-1 rounded-md outline-none text-[11.5px]"
              style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <button type="button" disabled={sendPending || !testPhone.trim()} onClick={onTestSend}
              className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
              style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
              📲 Send test
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={refreshPreview} disabled={pending}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-md disabled:opacity-50"
              style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              ↻ Refresh preview
            </button>
            <button type="button" onClick={onSendNow} disabled={sendPending || !preview || preview.reachable === 0}
              className="ml-auto text-[11.5px] font-black px-3.5 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: T.blue }}>
              {sendPending ? "Sending…" : `📨 Send to ${preview?.reachable ?? 0}`}
            </button>
          </div>
          {resultMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{resultMsg}</p>}
          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
        </div>

        {/* Preview pane */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            Audience preview
          </p>
          {pending && !preview ? (
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : preview ? (
            <>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <SmallTile label="Matched" value={preview.total} />
                <SmallTile label="Opted in" value={preview.optedIn} />
                <SmallTile label="Reachable" value={preview.reachable} accent />
              </div>

              <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-1" style={{ color: T.inkFaint }}>
                  iPhone-ish preview
                </p>
                <div className="rounded-2xl px-3 py-2 max-w-[92%]" style={{ background: "linear-gradient(135deg, #1976FF, #0F5BD9)", color: "white" }}>
                  <p className="text-[11.5px] leading-snug" style={{ whiteSpace: "pre-wrap" }}>
                    {body.replace(/\{\{\s*firstName\s*\}\}/gi, "Sami").replace(/\{\{\s*suiteNumber\s*\}\}/gi, "042").replace(/\{\{\s*name\s*\}\}/gi, "Sami Khiari")}
                  </p>
                </div>
              </div>

              {preview.sample.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
                    Reachable sample
                  </p>
                  <ul className="divide-y" style={{ borderColor: T.border }}>
                    {preview.sample.map((s) => (
                      <li key={s.id} className="px-3 py-1.5 flex items-center gap-2 text-[11px]">
                        <span className="font-bold flex-1 truncate" style={{ color: T.ink }}>{s.name}</span>
                        {s.suiteNumber && <span className="font-mono" style={{ color: T.inkFaint }}>#{s.suiteNumber}</span>}
                        <span className="font-mono" style={{ color: T.blueDeep }}>{s.phone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.unreachableSamples.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.warning, borderBottom: `1px solid ${T.border}` }}>
                    Unreachable sample
                  </p>
                  <ul className="divide-y" style={{ borderColor: T.border }}>
                    {preview.unreachableSamples.map((s) => (
                      <li key={`${s.id}-${s.reason}`} className="px-3 py-1.5 flex items-center gap-2 text-[11px]">
                        <span className="font-bold flex-1 truncate" style={{ color: T.inkSoft }}>{s.name}</span>
                        <span className="text-[10.5px]" style={{ color: T.inkFaint }}>{s.reason.replace(/_/g, " ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Pick an audience above to preview.</p>
          )}
        </div>
      </div>

      {/* Past issues */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Past campaigns</p>
          <button type="button" onClick={refreshIssues} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>↻</button>
        </div>
        {issues == null ? (
          <p className="p-4 text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
        ) : issues.length === 0 ? (
          <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>No campaigns sent yet.</div>
        ) : (
          <ul>
            {issues.map((i) => (
              <li key={i.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: T.ink }}>{i.label}</p>
                  <p className="text-[10.5px] truncate" style={{ color: T.inkFaint }}>{i.audienceLabel} · {i.bodyPreview}</p>
                </div>
                <span className="text-[10.5px] tabular-nums" style={{ color: T.success }}>✓ {i.succeededCount}</span>
                {i.failedCount > 0 && <span className="text-[10.5px] tabular-nums" style={{ color: T.danger }}>✕ {i.failedCount}</span>}
                {i.notSentCount > 0 && <span className="text-[10.5px] tabular-nums" style={{ color: T.warning }}>⊘ {i.notSentCount}</span>}
                <span className="text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>{i.estSegments} seg</span>
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

function SmallTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[18px] font-black tabular-nums" style={{ color: accent ? T.blue : T.ink }}>{value}</p>
    </div>
  );
}
