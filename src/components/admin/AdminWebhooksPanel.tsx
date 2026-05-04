"use client";

// iter-103 — Webhook endpoints admin panel.
//
// Two-column layout: left = configured endpoints + "+ New", right = inline
// editor for whichever endpoint is selected (or a fresh new one). Each row
// shows label + masked URL + format pill + lastFiredAt + lastStatus dot +
// recent counts (last 7 days). Test button fires a synthetic ping
// immediately and the deliveries drawer below shows real-time results.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listWebhooks,
  upsertWebhook,
  deleteWebhook,
  toggleWebhookActive,
  testWebhook,
  listWebhookDeliveries,
  type WebhookRow,
} from "@/app/actions/webhooks";
import { ALL_WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type EditingState =
  | { mode: "new" }
  | { mode: "edit"; row: WebhookRow }
  | null;

export default function AdminWebhooksPanel() {
  const [rows, setRows] = useState<WebhookRow[] | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [pending, startTransition] = useTransition();
  const [drawerEndpointId, setDrawerEndpointId] = useState<string | null>(null);

  function refresh() {
    void listWebhooks().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  function onSaved(id?: string) {
    setEditing(null);
    refresh();
    if (id) setDrawerEndpointId(id);
  }

  function onDelete(row: WebhookRow) {
    if (!confirm(`Delete webhook "${row.label}"? Past delivery logs are also removed.`)) return;
    startTransition(async () => {
      const res = await deleteWebhook(row.id);
      if (res.error) { alert(res.error); return; }
      if (drawerEndpointId === row.id) setDrawerEndpointId(null);
      refresh();
    });
  }

  function onToggle(row: WebhookRow) {
    startTransition(async () => {
      const res = await toggleWebhookActive(row.id);
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  function onTest(row: WebhookRow) {
    startTransition(async () => {
      const res = await testWebhook(row.id);
      if (res.error) { alert(res.error); return; }
      setDrawerEndpointId(row.id);
      // small delay before refresh so the delivery row exists.
      setTimeout(refresh, 800);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          System · Webhooks
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Outbound webhooks (Slack / Discord / generic)</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Get real-time pings in your team chat when packages arrive, get picked up, or dropped off. Per-event filters; HMAC-SHA256 signed if you set a secret.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* List */}
        <div className="rounded-md bg-white" style={{ border: "1px solid #E5DACA" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #e8e5e0" }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Endpoints ({rows?.length ?? 0})
            </p>
            <button type="button" onClick={() => setEditing({ mode: "new" })}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
              + New webhook
            </button>
          </div>
          {!rows ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
              No webhooks configured yet. Add one to start posting events to Slack or Discord.
            </p>
          ) : (
            <ul>
              {rows.map((r, i) => (
                <li key={r.id} className="px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>{r.label}</p>
                      <p className="text-[10.5px] mt-0.5 truncate font-mono" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {maskUrl(r.url)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <FormatPill format={r.format} />
                        <StatusDot active={r.active} lastStatus={r.lastStatus} />
                        {r.events.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(45,16,15,0.04)", color: "rgba(45,16,15,0.55)" }}>
                            {r.events.length} event{r.events.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {r.hasSecret && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}>
                            🔒 signed
                          </span>
                        )}
                        {r.recentDeliveries > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.08)", color: NOHO_BLUE_DEEP }}>
                            7d: {r.recentDeliveries - r.recentFailures}/{r.recentDeliveries} ok
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <button type="button" onClick={() => setEditing({ mode: "edit", row: r })}
                      className="px-2 py-1 rounded text-[10.5px] font-bold border"
                      style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onTest(r)} disabled={pending}
                      className="px-2 py-1 rounded text-[10.5px] font-bold border disabled:opacity-50"
                      style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}>
                      Test
                    </button>
                    <button type="button" onClick={() => onToggle(r)} disabled={pending}
                      className="px-2 py-1 rounded text-[10.5px] font-bold border disabled:opacity-50"
                      style={{ borderColor: "#e8e5e0", color: r.active ? "#92400e" : "#15803d", background: "white" }}>
                      {r.active ? "Pause" : "Activate"}
                    </button>
                    <button type="button" onClick={() => setDrawerEndpointId(r.id)}
                      className="px-2 py-1 rounded text-[10.5px] font-bold border"
                      style={{ borderColor: "#e8e5e0", color: "rgba(45,16,15,0.55)", background: "white" }}>
                      Deliveries
                    </button>
                    <button type="button" onClick={() => onDelete(r)} disabled={pending}
                      className="px-2 py-1 rounded text-[10.5px] font-bold disabled:opacity-50 ml-auto"
                      style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        <div className="rounded-md bg-white p-4" style={{ border: "1px solid #E5DACA" }}>
          {!editing ? (
            <div className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
              Pick a webhook to edit, or click <strong>+ New webhook</strong>.
              <details className="mt-3 not-italic">
                <summary className="cursor-pointer text-[11px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>How to get a Slack webhook URL</summary>
                <ol className="mt-2 text-[11.5px] space-y-1 list-decimal pl-5" style={{ color: NOHO_INK }}>
                  <li>Slack → app you control → <em>Incoming Webhooks</em></li>
                  <li>Click <em>Add New Webhook to Workspace</em>, pick a channel.</li>
                  <li>Copy the <code>https://hooks.slack.com/services/...</code> URL and paste it here.</li>
                </ol>
              </details>
              <details className="mt-2 not-italic">
                <summary className="cursor-pointer text-[11px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>How to get a Discord webhook URL</summary>
                <ol className="mt-2 text-[11.5px] space-y-1 list-decimal pl-5" style={{ color: NOHO_INK }}>
                  <li>Discord channel → <em>Edit Channel</em> → <em>Integrations</em> → <em>Webhooks</em></li>
                  <li>Click <em>New Webhook</em>, give it a name, copy the URL.</li>
                </ol>
              </details>
            </div>
          ) : (
            <Editor key={editing.mode === "edit" ? editing.row.id : "new"} state={editing} onCancel={() => setEditing(null)} onSaved={onSaved} />
          )}
        </div>
      </div>

      {drawerEndpointId && (
        <DeliveriesDrawer
          endpointId={drawerEndpointId}
          endpoint={rows?.find((r) => r.id === drawerEndpointId)}
          onClose={() => setDrawerEndpointId(null)}
        />
      )}
    </div>
  );
}

function FormatPill({ format }: { format: "slack" | "discord" | "generic" }) {
  const c = format === "slack"  ? { bg: "rgba(74,21,75,0.10)",  fg: "#4a154b" }
          : format === "discord" ? { bg: "rgba(88,101,242,0.12)", fg: "#5865f2" }
          :                          { bg: "rgba(45,16,15,0.06)",  fg: "rgba(45,16,15,0.55)" };
  return (
    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {format}
    </span>
  );
}

function StatusDot({ active, lastStatus }: { active: boolean; lastStatus: string | null }) {
  if (!active) return <span className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.45)" }}>○ paused</span>;
  if (!lastStatus) return <span className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.55)" }}>· not yet fired</span>;
  const ok = lastStatus === "ok";
  return (
    <span className="text-[10px] font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ok ? "#16a34a" : "#e70013", boxShadow: `0 0 4px ${ok ? "#16a34a" : "#e70013"}` }} />
      <span style={{ color: ok ? "#15803d" : "#991b1b" }}>{ok ? "delivering" : lastStatus}</span>
    </span>
  );
}

function maskUrl(url: string): string {
  // Slack URLs look like .../services/T.../B.../<token>. Mask the token tail.
  return url.replace(/(\/[A-Za-z0-9_-]{12,})$/u, (m) => "/…" + m.slice(-4));
}

function Editor({ state, onCancel, onSaved }: {
  state: { mode: "new" } | { mode: "edit"; row: WebhookRow };
  onCancel: () => void;
  onSaved: (id?: string) => void;
}) {
  const initial = state.mode === "edit" ? state.row : null;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [format, setFormat] = useState<"slack" | "discord" | "generic">(initial?.format ?? "slack");
  const [events, setEvents] = useState<WebhookEvent[]>(initial?.events ?? ["mail.arrived", "mail.picked_up", "dropoff.logged"]);
  const [secret, setSecret] = useState("");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const detectedFormat = useMemo(() => {
    if (/hooks\.slack\.com/i.test(url)) return "slack" as const;
    if (/discord(app)?\.com\/api\/webhooks/i.test(url)) return "discord" as const;
    return null;
  }, [url]);

  function toggleEvent(e: WebhookEvent) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await upsertWebhook({
        id: initial?.id,
        label,
        url,
        format,
        events,
        active,
        // For new endpoints: send the secret as-is. For edits: only send when
        // the user typed something, so empty input keeps existing secret.
        secret: state.mode === "new" ? secret : (secret ? secret : undefined),
      });
      if (res.error) { setErr(res.error); return; }
      onSaved(res.id);
    });
  }

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
        {state.mode === "edit" ? "Edit webhook" : "New webhook"}
      </p>
      {err && (
        <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
          {err}
        </p>
      )}
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Label *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Front desk Slack"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>POST URL *</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          {detectedFormat && (
            <button type="button" onClick={() => setFormat(detectedFormat)}
              className="mt-1.5 text-[10.5px] font-bold underline" style={{ color: NOHO_BLUE_DEEP }}>
              Detected {detectedFormat} — use this format?
            </button>
          )}
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Format</label>
          <div className="mt-1 flex gap-1.5">
            {(["slack", "discord", "generic"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                style={{
                  background: format === f ? NOHO_BLUE : "white",
                  color: format === f ? "white" : NOHO_INK,
                  border: `1px solid ${format === f ? NOHO_BLUE : "#e8e5e0"}`,
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Subscribe to events ({events.length})
          </label>
          <ul className="mt-1 space-y-1">
            {ALL_WEBHOOK_EVENTS.map((e) => {
              const on = events.includes(e.key);
              return (
                <li key={e.key}>
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg px-2 py-1.5"
                    style={{ background: on ? "rgba(51,116,133,0.06)" : "transparent" }}>
                    <input type="checkbox" checked={on} onChange={() => toggleEvent(e.key)} className="mt-1" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold" style={{ color: NOHO_INK }}>{e.label} <code className="ml-1 text-[10px] font-mono opacity-60">{e.key}</code></p>
                      <p className="text-[10.5px] mt-0.5 italic" style={{ color: "rgba(45,16,15,0.55)" }}>{e.example}</p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Optional shared secret
          </label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
            placeholder={state.mode === "edit" && initial?.hasSecret ? "(unchanged — type new value to replace)" : "leave blank for unsigned"}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          <p className="text-[10.5px] mt-0.5 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            If set, every request includes <code className="font-mono">X-NOHO-Signature: sha256=…</code> (HMAC-SHA256 of the JSON body).
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px]" style={{ color: NOHO_INK }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (fire on events)
        </label>
        <div className="flex items-center gap-2 pt-2">
          <button type="button" onClick={save} disabled={pending || !label || !url || events.length === 0}
            className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
            {pending ? "Saving…" : state.mode === "edit" ? "Save changes" : "Create webhook"}
          </button>
          <button type="button" onClick={onCancel}
            className="px-3 py-2.5 rounded-lg text-xs font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveriesDrawer({ endpointId, endpoint, onClose }: {
  endpointId: string;
  endpoint: WebhookRow | undefined;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listWebhookDeliveries>> | null>(null);
  useEffect(() => {
    let cancel = false;
    listWebhookDeliveries({ endpointId, limit: 25 })
      .then((r) => { if (!cancel) setRows(r); })
      .catch(() => { if (!cancel) setRows([]); });
    return () => { cancel = true; };
  }, [endpointId]);

  return (
    <div className="rounded-md bg-white p-4" style={{ border: "1px solid #E5DACA" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Recent deliveries · {endpoint?.label ?? endpointId}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            Last 25 attempts. Auto-trims at ~200 per endpoint.
          </p>
        </div>
        <button type="button" onClick={onClose}
          className="px-2 py-1 rounded text-[11px] font-bold border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
          Close
        </button>
      </div>
      {!rows ? (
        <p className="text-[11.5px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11.5px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>No deliveries yet — fire a Test, or wait for a real event.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#e8e5e0" }}>
          <table className="w-full text-[11.5px]">
            <thead style={{ background: "#fafaf7" }}>
              <tr style={{ color: "rgba(45,16,15,0.55)" }}>
                <th className="text-left px-2 py-1.5 font-black text-[10px] uppercase tracking-wider">Time</th>
                <th className="text-left px-2 py-1.5 font-black text-[10px] uppercase tracking-wider">Event</th>
                <th className="text-left px-2 py-1.5 font-black text-[10px] uppercase tracking-wider">Status</th>
                <th className="text-left px-2 py-1.5 font-black text-[10px] uppercase tracking-wider">Latency</th>
                <th className="text-left px-2 py-1.5 font-black text-[10px] uppercase tracking-wider">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e8e5e0" }}>
                  <td className="px-2 py-1.5 font-mono text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {new Date(r.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10.5px]" style={{ color: NOHO_INK }}>{r.event}</td>
                  <td className="px-2 py-1.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === "ok" ? "rgba(22,163,74,0.14)" : "rgba(231,0,19,0.10)",
                        color: r.status === "ok" ? "#15803d" : "#991b1b",
                      }}>
                      {r.status === "ok" ? `ok ${r.httpStatus ?? ""}` : `fail ${r.httpStatus ?? ""}`}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums" style={{ color: "rgba(45,16,15,0.55)" }}>{r.durationMs ?? "—"}ms</td>
                  <td className="px-2 py-1.5 truncate max-w-[280px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {r.error ?? r.payloadPreview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
