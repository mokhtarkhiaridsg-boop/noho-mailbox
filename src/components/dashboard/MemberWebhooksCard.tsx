"use client";

/**
 * iter-167 — Member-registered webhooks card (Tier 11 #76).
 *
 * Sister card to ApiTokensCard (iter-166). Members register a URL +
 * pick events; we POST HMAC-signed payloads when those events fire
 * for THEIR mailbox. Secret is shown ONCE on creation.
 *
 * UX:
 *  - Empty state explains what webhooks are + 1-click "Register first"
 *  - List: per-row label, URL, event chips, last-fired status pill,
 *    24h delivery count, "Test ping" / "Pause" / "View deliveries" /
 *    "Revoke" actions
 *  - Create form: label, https URL (validated), event checkboxes
 *  - Result modal: shows the secret ONCE with curl + verification
 *    snippet, plus a "we never see this again" warning
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMyMemberWebhooks,
  createMyMemberWebhook,
  revokeMyMemberWebhook,
  setMyMemberWebhookActive,
  testMyMemberWebhook,
  getMyMemberWebhookDeliveries,
  type MemberWebhookRow,
  type MemberWebhookDeliveryRow,
} from "@/app/actions/memberWebhooks";
import { ALL_MEMBER_WEBHOOK_EVENTS, type MemberWebhookEvent } from "@/lib/memberWebhooks";

export default function MemberWebhooksCard() {
  const [hooks, setHooks] = useState<MemberWebhookRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState<{ row: MemberWebhookRow; secret: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, MemberWebhookDeliveryRow[]>>({});

  function refresh() {
    void listMyMemberWebhooks().then(setHooks).catch(() => setHooks([]));
  }
  useEffect(refresh, []);

  function onRevoke(w: MemberWebhookRow) {
    if (!confirm(`Revoke "${w.label}"? Any integration receiving these events will stop immediately.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeMyMemberWebhook({ id: w.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  function onPauseToggle(w: MemberWebhookRow) {
    setError(null);
    startTransition(async () => {
      const res = await setMyMemberWebhookActive({ id: w.id, active: !w.active });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  function onTest(w: MemberWebhookRow) {
    setError(null);
    startTransition(async () => {
      const res = await testMyMemberWebhook({ id: w.id });
      if (res.error) setError(res.error);
      else {
        // Re-load deliveries shortly after so the test ping appears.
        setTimeout(() => {
          if (expandedId === w.id) {
            void getMyMemberWebhookDeliveries({ webhookId: w.id, limit: 30 }).then((rows) => {
              setDeliveries((d) => ({ ...d, [w.id]: rows }));
            });
          }
          refresh();
        }, 1500);
      }
    });
  }

  function onToggleActivity(w: MemberWebhookRow) {
    if (expandedId === w.id) { setExpandedId(null); return; }
    setExpandedId(w.id);
    if (!deliveries[w.id]) {
      void getMyMemberWebhookDeliveries({ webhookId: w.id, limit: 30 }).then((rows) => {
        setDeliveries((d) => ({ ...d, [w.id]: rows }));
      });
    }
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Developer · Webhooks
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            Webhooks
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Push your mail events into your tools the moment they happen. We POST HMAC-signed JSON to your URL when packages arrive, get picked up, IDs are about to expire, and more. Compare against{" "}
            <code style={{ background: "#F4EEE3", padding: "0 4px", borderRadius: 3 }}>X-NOHO-Signature</code> to verify authenticity.
          </p>
        </div>
        {!creating && hooks && hooks.length > 0 && (
          <button type="button" onClick={() => setCreating(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            + New webhook
          </button>
        )}
      </div>

      {creating && (
        <CreateWebhookForm
          onCancel={() => setCreating(false)}
          onCreated={(secret, row) => {
            setCreating(false);
            setShowSecret({ row, secret });
            refresh();
          }}
        />
      )}

      {hooks == null ? (
        <p className="mt-4 text-[12px]" style={{ color: BRAND.inkSoft }}>Loading…</p>
      ) : hooks.length === 0 && !creating ? (
        <div className="mt-4 rounded-xl px-4 py-6 text-center" style={{ background: "#F4EEE3", border: `1px dashed ${BRAND.border}` }}>
          <p className="text-[24px] mb-1">🪝</p>
          <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>No webhooks yet</p>
          <p className="text-[11px] mt-1 max-w-sm mx-auto" style={{ color: BRAND.inkSoft }}>
            Pick the events you care about, point us at your URL, and we'll POST a signed JSON payload the moment something happens.
          </p>
          <button type="button" onClick={() => setCreating(true)} className="mt-3 text-[11.5px] font-black px-4 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            Register first webhook
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {(hooks ?? []).map((w) => (
            <WebhookRow
              key={w.id}
              hook={w}
              busy={busy}
              expanded={expandedId === w.id}
              deliveries={deliveries[w.id] ?? null}
              onToggleActivity={() => onToggleActivity(w)}
              onTest={() => onTest(w)}
              onPauseToggle={() => onPauseToggle(w)}
              onRevoke={() => onRevoke(w)}
            />
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      {showSecret && (
        <SecretReveal
          row={showSecret.row}
          secret={showSecret.secret}
          onClose={() => setShowSecret(null)}
        />
      )}
    </section>
  );
}

function WebhookRow({ hook, busy, expanded, deliveries, onToggleActivity, onTest, onPauseToggle, onRevoke }: {
  hook: MemberWebhookRow;
  busy: boolean;
  expanded: boolean;
  deliveries: MemberWebhookDeliveryRow[] | null;
  onToggleActivity: () => void;
  onTest: () => void;
  onPauseToggle: () => void;
  onRevoke: () => void;
}) {
  const isRevoked = !!hook.revokedAtIso;
  const status = isRevoked ? "revoked" : !hook.active ? "paused" : hook.lastStatus === "ok" ? "ok" : hook.lastStatus?.startsWith("failed") ? "failing" : "ready";
  const statusStyle = {
    ok:      { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "DELIVERED" },
    ready:   { bg: "rgba(25,118,255,0.10)", fg: "#0F5BD9", label: "READY" },
    paused:  { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "PAUSED" },
    failing: { bg: "rgba(239,68,68,0.10)",  fg: "#991b1b", label: "FAILING" },
    revoked: { bg: "rgba(120,113,108,0.12)", fg: "#57534e", label: "REVOKED" },
  }[status];

  return (
    <li className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}`, opacity: status === "revoked" ? 0.6 : 1 }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{hook.label}</p>
            <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: statusStyle.bg, color: statusStyle.fg }}>{statusStyle.label}</span>
          </div>
          <p className="text-[10.5px] font-mono mt-0.5 truncate" style={{ color: BRAND.inkSoft }}>{hook.url}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {hook.events.map((e) => (
              <span key={e} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#F4EEE3", color: BRAND.blueDeep }}>
                {e}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]" style={{ color: BRAND.inkSoft }}>
            {hook.lastFiredAtIso ? (
              <span>Last fired {fmtRel(hook.lastFiredAtIso)}{hook.lastStatus ? ` · ${hook.lastStatus}` : ""}</span>
            ) : (
              <span style={{ fontStyle: "italic" }}>Never fired</span>
            )}
            {hook.recentDeliveryCount > 0 && (
              <span className="font-bold" style={{ color: BRAND.blueDeep }}>· {hook.recentDeliveryCount} req/24h</span>
            )}
            {hook.failureCount >= 5 && (
              <span className="font-bold" style={{ color: "#b91c1c" }}>· {hook.failureCount} consecutive fails</span>
            )}
            <span>· created {fmtRel(hook.createdAtIso)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!isRevoked && (
            <>
              <button type="button" disabled={busy || !hook.active} onClick={onTest} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: BRAND.blue, color: "white", border: `1px solid ${BRAND.blue}` }}>
                🧪 Test
              </button>
              <button type="button" disabled={busy} onClick={onToggleActivity} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: "#F4EEE3", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                {expanded ? "Hide" : "Activity"}
              </button>
              <button type="button" disabled={busy} onClick={onPauseToggle} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                {hook.active ? "Pause" : "Resume"}
              </button>
              <button type="button" disabled={busy} onClick={onRevoke} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
                Revoke
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg p-2.5" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
          {deliveries == null ? (
            <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: BRAND.inkSoft }}>No deliveries yet. Click "Test" to send a test ping.</p>
          ) : (
            <ul className="space-y-1">
              {deliveries.map((d) => (
                <li key={d.id} className="text-[10.5px] font-mono flex items-center gap-2 flex-wrap" style={{ color: BRAND.ink }}>
                  <span style={{ color: d.status === "ok" ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
                    {d.httpStatus ?? "—"}
                  </span>
                  <span style={{ color: BRAND.blueDeep }}>{d.event}</span>
                  {d.attempt > 1 && <span style={{ color: "#92400e" }}>·attempt {d.attempt}</span>}
                  {d.deadLettered && <span style={{ color: "#b91c1c", fontWeight: 700 }}>·DEAD</span>}
                  {d.durationMs != null && <span style={{ color: BRAND.inkSoft }}>{d.durationMs}ms</span>}
                  <span style={{ color: BRAND.inkSoft }}>{fmtRel(d.sentAtIso)}</span>
                  {d.error && <span className="block w-full truncate" style={{ color: "#b91c1c" }} title={d.error}>{d.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function CreateWebhookForm({ onCancel, onCreated }: {
  onCancel: () => void;
  onCreated: (secret: string, row: MemberWebhookRow) => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("https://");
  const [events, setEvents] = useState<Set<MemberWebhookEvent>>(new Set(["package.arrived"]));
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(e: MemberWebhookEvent) {
    setEvents((cur) => {
      const next = new Set(cur);
      if (next.has(e)) next.delete(e); else next.add(e);
      return next;
    });
  }

  function onSubmit() {
    setError(null);
    if (label.trim().length < 2) { setError("Label required."); return; }
    if (!url.startsWith("https://")) { setError("URL must start with https://."); return; }
    if (events.size === 0) { setError("Pick at least one event."); return; }
    startTransition(async () => {
      const res = await createMyMemberWebhook({ label: label.trim(), url: url.trim(), events: Array.from(events) });
      if (!res.ok) { setError(res.error); return; }
      onCreated(res.secret, res.row);
    });
  }

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Zapier · package events" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>HTTPS URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Events</label>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {ALL_MEMBER_WEBHOOK_EVENTS.map((e) => {
            const active = events.has(e.key);
            return (
              <label key={e.key} className="flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer" style={{
                background: active ? "rgba(25,118,255,0.06)" : "white",
                border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
              }}>
                <input type="checkbox" checked={active} onChange={() => toggle(e.key)} className="mt-0.5 w-3.5 h-3.5 accent-[#1976FF]" />
                <span className="flex-1">
                  <p className="text-[11.5px] font-black" style={{ color: BRAND.ink }}>{e.label}</p>
                  <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>{e.description}</p>
                  <p className="text-[9.5px] font-mono mt-0.5" style={{ color: BRAND.inkSoft }}>{e.key}</p>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      {error && <p className="mt-2 text-[11px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>Cancel</button>
        <button type="button" disabled={busy} onClick={onSubmit} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
          {busy ? "Registering…" : "Register webhook"}
        </button>
      </div>
    </div>
  );
}

function SecretReveal({ row, secret, onClose }: {
  row: MemberWebhookRow;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const verifySnippet = `// Verify the X-NOHO-Signature header
const expected = "sha256=" + crypto
  .createHmac("sha256", "${secret}")
  .update(rawBody)
  .digest("hex");
if (expected !== req.headers["x-noho-signature"]) reject();`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.65)" }} onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ background: "white", border: `1px solid ${BRAND.border}` }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#15803d" }}>
          ✓ Webhook registered
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: BRAND.ink }}>{row.label}</h3>
        <p className="text-[11.5px] mt-1" style={{ color: BRAND.inkSoft }}>
          Save this signing secret now — <strong style={{ color: "#b91c1c" }}>it will not be shown again</strong>. Use it to verify the{" "}
          <code style={{ background: "#F4EEE3", padding: "0 3px", borderRadius: 3 }}>X-NOHO-Signature</code> header on every incoming POST.
        </p>
        <div className="mt-3 rounded-xl p-3 font-mono text-[12px] flex items-center gap-2" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}`, color: BRAND.ink, wordBreak: "break-all" }}>
          <span className="flex-1 select-all">{secret}</span>
          <button type="button" onClick={copy} className="shrink-0 text-[11px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: copied ? "#15803d" : BRAND.blue }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mt-4" style={{ color: BRAND.inkSoft }}>How to verify in your handler</p>
        <pre className="mt-1 text-[11px] font-mono whitespace-pre-wrap rounded-lg p-3" style={{ background: "#1A1D23", color: "#A8E6CF", border: `1px solid ${BRAND.border}` }}>{verifySnippet}</pre>
        <p className="text-[10.5px] mt-2" style={{ color: BRAND.inkSoft }}>
          Each POST has these headers: <code style={{ background: "#F4EEE3", padding: "0 3px", borderRadius: 3 }}>X-NOHO-Event</code>,{" "}
          <code style={{ background: "#F4EEE3", padding: "0 3px", borderRadius: 3 }}>X-NOHO-Signature</code>,{" "}
          <code style={{ background: "#F4EEE3", padding: "0 3px", borderRadius: 3 }}>X-NOHO-Retry</code> (on retries). Body is JSON{" "}
          <code style={{ background: "#F4EEE3", padding: "0 3px", borderRadius: 3 }}>{"{event, text, url, detail, sentAt}"}</code>. Return any 2xx to ack; non-2xx triggers retries (6 total over ~14h).
        </p>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg" style={{ background: BRAND.inkSoft, color: "white" }}>
            I've saved it
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtRel(iso: string): string {
  const t = new Date(iso).getTime();
  const dt = Date.now() - t;
  if (dt < 0) {
    const days = Math.round(-dt / (1000 * 60 * 60 * 24));
    if (days < 1) return "soon";
    if (days < 30) return `in ${days}d`;
    return `in ${Math.round(days / 30)}mo`;
  }
  const sec = Math.floor(dt / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}
