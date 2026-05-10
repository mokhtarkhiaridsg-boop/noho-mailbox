"use client";

/**
 * iter-172 — Admin ESP audience sync panel (Tier 11 #81).
 *
 * Configure one or more ESP audiences (Mailchimp / ConvertKit /
 * Buttondown / CSV download), preview eligible candidates, and "Sync
 * now". CSV path triggers a Blob download in the browser.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listEspAudienceSyncs,
  upsertEspAudienceSync,
  deleteEspAudienceSync,
  previewEspAudience,
  runEspAudienceSync,
  listEspSyncRuns,
  type EspAudienceRow,
  type EspPreview,
  type EspRunRow,
} from "@/app/actions/espAudienceSync";
import { PROVIDER_LABELS, PROVIDER_DESCRIPTIONS, type EspProvider } from "@/lib/esp/types";

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

export default function AdminEspSyncPanel() {
  const [audiences, setAudiences] = useState<EspAudienceRow[] | null>(null);
  const [preview, setPreview] = useState<EspPreview | null>(null);
  const [editing, setEditing] = useState<EspAudienceRow | "new" | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, EspRunRow[]>>({});

  function refresh() {
    void listEspAudienceSyncs().then(setAudiences).catch(() => setAudiences([]));
    void previewEspAudience({ marketingOptInOnly: true }).then(setPreview).catch(() => undefined);
  }
  useEffect(refresh, []);

  function onRun(a: EspAudienceRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await runEspAudienceSync({ id: a.id });
      if (res.csvBody && res.csvDownloadName) {
        // Browser download path for CSV provider.
        const blob = new Blob([res.csvBody], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = res.csvDownloadName;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      if (!res.ok) setError(res.error ?? `${res.failed} failed`);
      else setInfo(`✓ ${res.added} added · ${res.skipped} skipped${res.failed > 0 ? ` · ${res.failed} failed` : ""}`);
      refresh();
      // Re-load drill-down if it's the open one
      if (drilldownId === a.id) {
        void listEspSyncRuns({ audienceId: a.id, limit: 12 }).then((r) => setRuns((prev) => ({ ...prev, [a.id]: r })));
      }
    });
  }

  function onDrilldown(a: EspAudienceRow) {
    if (drilldownId === a.id) { setDrilldownId(null); return; }
    setDrilldownId(a.id);
    if (!runs[a.id]) {
      void listEspSyncRuns({ audienceId: a.id, limit: 12 }).then((r) => setRuns((prev) => ({ ...prev, [a.id]: r })));
    }
  }

  function onDelete(a: EspAudienceRow) {
    if (!confirm(`Delete "${a.label}"? Sync history will also be deleted.`)) return;
    startTransition(async () => {
      const res = await deleteEspAudienceSync({ id: a.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  const optedInPct = useMemo(() => {
    if (!preview || preview.withEmail === 0) return 0;
    return Math.round((preview.eligible / preview.withEmail) * 100);
  }, [preview]);

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
          ESP Sync
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
          send to their inbox
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {audiences?.length ?? 0} audiences
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        One-click sync of opted-in members to Mailchimp, ConvertKit/Kit, Buttondown, or a CSV download. Per-member <code>notifPrefs.marketing.email</code> opt-in is honored.
      </p>

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Members total" value={preview.total} accent={T.blueDeep} />
          <Tile label="With email" value={preview.withEmail} accent={T.success} />
          <Tile label="Marketing opt-in" value={preview.eligible} accent={T.blue} />
          <Tile label="Opt-in rate" value={`${optedInPct}%`} accent={optedInPct >= 30 ? T.success : optedInPct >= 10 ? T.warning : T.danger} />
        </div>
      )}

      <div className="flex items-center justify-end">
        <button type="button" onClick={() => setEditing("new")} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          + New audience
        </button>
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      {audiences == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : audiences.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No audiences configured yet. Click <strong style={{ color: T.blue }}>+ New audience</strong> to wire up your first ESP.
        </div>
      ) : (
        <ul className="space-y-2">
          {audiences.map((a) => (
            <li key={a.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: a.isActive ? 1 : 0.55 }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-black truncate" style={{ color: T.ink }}>{a.label}</p>
                    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(25,118,255,0.10)", color: T.blueDeep }}>
                      {PROVIDER_LABELS[a.provider]}
                    </span>
                    {!a.isActive && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(120,113,108,0.12)", color: "#57534e" }}>PAUSED</span>}
                    {a.marketingOptInOnly && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>opt-in only</span>}
                    {a.doubleOptIn && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>double opt-in</span>}
                  </div>
                  {a.audienceId && <p className="text-[10.5px] font-mono mt-0.5" style={{ color: T.inkFaint }}>audience: {a.audienceId}{a.apiServer ? ` · ${a.apiServer}` : ""}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-[10.5px] flex-wrap" style={{ color: T.inkFaint }}>
                    {a.lastSyncAtIso ? (
                      <span>
                        Last synced {fmtRel(a.lastSyncAtIso)} · <strong style={{ color: T.success }}>+{a.lastSyncCount ?? 0}</strong>
                        {a.lastSyncFailed && a.lastSyncFailed > 0 ? <span> · <strong style={{ color: T.danger }}>{a.lastSyncFailed} failed</strong></span> : null}
                      </span>
                    ) : <span style={{ fontStyle: "italic" }}>Never synced</span>}
                    {a.lastSyncError && <span style={{ color: T.danger }}>· {a.lastSyncError}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button type="button" disabled={busy || !a.isActive} onClick={() => onRun(a)} className="text-[11.5px] font-black px-3 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: T.blue }}>
                    {a.provider === "csv" ? "📥 Download CSV" : "↻ Sync now"}
                  </button>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onDrilldown(a)} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                      {drilldownId === a.id ? "Hide" : "History"}
                    </button>
                    <button type="button" onClick={() => setEditing(a)} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(a)} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {drilldownId === a.id && (
                <div className="mt-3 rounded-lg p-2.5" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                  {!runs[a.id] ? (
                    <p className="text-[11px]" style={{ color: T.inkFaint }}>Loading…</p>
                  ) : runs[a.id]!.length === 0 ? (
                    <p className="text-[11px] italic" style={{ color: T.inkFaint }}>No sync runs yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {runs[a.id]!.map((r) => (
                        <li key={r.id} className="text-[10.5px] font-mono flex items-center gap-2 flex-wrap" style={{ color: T.ink }}>
                          <span style={{ color: r.failed === 0 && !r.error ? T.success : T.danger, fontWeight: 700 }}>
                            {r.failed === 0 && !r.error ? "OK" : "ERR"}
                          </span>
                          <span style={{ color: T.blueDeep }}>{r.source}</span>
                          <span>+{r.added}</span>
                          {r.skipped > 0 && <span style={{ color: T.inkFaint }}>~{r.skipped}</span>}
                          {r.failed > 0 && <span style={{ color: T.danger }}>✕{r.failed}</span>}
                          {r.durationMs != null && <span style={{ color: T.inkFaint }}>{r.durationMs}ms</span>}
                          <span style={{ color: T.inkFaint }}>{fmtRel(r.startedAtIso)}</span>
                          {r.error && <span className="block w-full truncate" style={{ color: T.danger }} title={r.error}>{r.error}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}

function Editor({ row, onClose, onSaved }: { row: EspAudienceRow | null; onClose: () => void; onSaved: () => void }) {
  const [provider, setProvider] = useState<EspProvider>(row?.provider ?? "mailchimp");
  const [label, setLabel] = useState(row?.label ?? "");
  const [audienceId, setAudienceId] = useState(row?.audienceId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [apiServer, setApiServer] = useState(row?.apiServer ?? "");
  const [marketingOptInOnly, setMarketingOptInOnly] = useState(row?.marketingOptInOnly ?? true);
  const [doubleOptIn, setDoubleOptIn] = useState(row?.doubleOptIn ?? false);
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await upsertEspAudienceSync({
        id: row?.id, provider, label,
        audienceId: audienceId.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        apiServer: apiServer.trim() || undefined,
        marketingOptInOnly, doubleOptIn, isActive,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>{row ? "Edit audience" : "New audience"}</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>{row?.label ?? "Connect an ESP"}</h3>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Provider</label>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {(Object.keys(PROVIDER_LABELS) as EspProvider[]).map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)} className="text-[11.5px] font-bold px-2.5 py-2 rounded-lg text-left" style={{
                  background: provider === p ? "rgba(25,118,255,0.06)" : "white",
                  border: `1px solid ${provider === p ? T.blue : T.border}`,
                  color: T.ink,
                }}>
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: T.inkFaint }}>{PROVIDER_DESCRIPTIONS[provider]}</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Main marketing list" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          {provider !== "csv" && (
            <>
              {provider !== "buttondown" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
                    {provider === "mailchimp" ? "Audience (List) ID" : "Form ID"}
                  </label>
                  <input value={audienceId} onChange={(e) => setAudienceId(e.target.value)} placeholder="abc123def4" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>API Key {row && row.hasApiKey ? "(leave blank to keep current)" : ""}</label>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={row && row.hasApiKey ? "•••••••• (saved)" : "Paste API key"} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} type="password" />
              </div>
              {provider === "mailchimp" && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Data center suffix</label>
                  <input value={apiServer} onChange={(e) => setApiServer(e.target.value)} placeholder="us21" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                  <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>Auto-detected from key suffix if blank.</p>
                </div>
              )}
            </>
          )}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[11.5px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
              <input type="checkbox" checked={marketingOptInOnly} onChange={(e) => setMarketingOptInOnly(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
              Strict marketing opt-in only (members must have notifPrefs.marketing.email = true)
            </label>
            {provider !== "csv" && (
              <label className="flex items-center gap-2 text-[11.5px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
                <input type="checkbox" checked={doubleOptIn} onChange={(e) => setDoubleOptIn(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
                Use double opt-in (provider sends a confirmation email)
              </label>
            )}
            <label className="flex items-center gap-2 text-[11.5px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
              Active (allow Sync now)
            </label>
          </div>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSave} disabled={busy} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Saving…" : row ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
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
