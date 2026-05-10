"use client";

/**
 * iter-166 — Member-facing API tokens card (Tier 10 #75).
 *
 * Lives inside SettingsPanel. Members can mint, list, drill, and revoke
 * their own bearer tokens for the /api/v1/* read-only endpoints.
 *
 * UX:
 *  - Empty state: explains what tokens are + 1-click "Generate first token"
 *  - List: pill per token with prefix `noho_xxxxxxxx…`, scope chips, last
 *    used relative time, "View activity" expands the recent-usage table,
 *    "Revoke" does an immediate destructive action with confirm()
 *  - Create form: label, scope checkboxes (Profile / Mail / Packages /
 *    Billing), expiration picker (Never / 30d / 90d / 1y)
 *  - Result modal: shows the plaintext ONCE with a big "Copy" button +
 *    a stern "this is the only time you'll see it" warning
 *
 * This is the only place in the codebase where a token's plaintext is
 * ever displayed — the server hashes it and forgets. Closing the modal
 * means the token is gone forever (revoke + recreate).
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMyApiTokens,
  createApiToken,
  revokeMyApiToken,
  getMyApiTokenUsage,
  type ApiTokenRow,
  type ApiUsageEntry,
} from "@/app/actions/apiTokens";
import { API_SCOPES, type ApiScope } from "@/lib/apiTokens";

type ExpirationPreset = "never" | "30" | "90" | "365";
const EXPIRATION_OPTIONS: Array<{ key: ExpirationPreset; label: string; days: number | null }> = [
  { key: "never", label: "Never expires", days: null },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "365", label: "1 year", days: 365 },
];

export default function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState<{ row: ApiTokenRow; plaintext: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, ApiUsageEntry[]>>({});

  function refresh() {
    void listMyApiTokens().then(setTokens).catch(() => setTokens([]));
  }
  useEffect(refresh, []);

  function onRevoke(t: ApiTokenRow) {
    if (!confirm(`Revoke token "${t.name}"? Any integrations using it will immediately stop working.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeMyApiToken({ id: t.id });
      if (res.error) { setError(res.error); return; }
      refresh();
    });
  }

  function onToggleActivity(t: ApiTokenRow) {
    if (expandedId === t.id) { setExpandedId(null); return; }
    setExpandedId(t.id);
    if (!usage[t.id]) {
      void getMyApiTokenUsage({ tokenId: t.id, limit: 25 }).then((rows) => {
        setUsage((u) => ({ ...u, [t.id]: rows }));
      });
    }
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Developer · API tokens
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            API tokens
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Mint a read-only bearer token to pull your mail history into Zapier, QuickBooks, or your own tooling. Tokens hit{" "}
            <code style={{ background: "#F4EEE3", padding: "0 4px", borderRadius: 3 }}>https://nohomailbox.org/api/v1/me</code>,{" "}
            <code style={{ background: "#F4EEE3", padding: "0 4px", borderRadius: 3 }}>/mail</code>, and{" "}
            <code style={{ background: "#F4EEE3", padding: "0 4px", borderRadius: 3 }}>/packages</code>.
          </p>
        </div>
        {!creating && tokens && tokens.length > 0 && (
          <button type="button" onClick={() => setCreating(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            + New token
          </button>
        )}
      </div>

      {creating && (
        <CreateTokenForm
          onCancel={() => setCreating(false)}
          onCreated={(plaintext, row) => {
            setCreating(false);
            setShowSecret({ row, plaintext });
            refresh();
          }}
        />
      )}

      {tokens == null ? (
        <p className="mt-4 text-[12px]" style={{ color: BRAND.inkSoft }}>Loading…</p>
      ) : tokens.length === 0 && !creating ? (
        <div className="mt-4 rounded-xl px-4 py-6 text-center" style={{ background: "#F4EEE3", border: `1px dashed ${BRAND.border}` }}>
          <p className="text-[24px] mb-1">🔑</p>
          <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>No tokens yet</p>
          <p className="text-[11px] mt-1 max-w-xs mx-auto" style={{ color: BRAND.inkSoft }}>
            Tokens let you read your mailbox data programmatically (read-only — never modifies anything). Most members never need one.
          </p>
          <button type="button" onClick={() => setCreating(true)} className="mt-3 text-[11.5px] font-black px-4 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            Generate first token
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {(tokens ?? []).map((t) => (
            <TokenRow
              key={t.id}
              token={t}
              busy={busy}
              expanded={expandedId === t.id}
              usage={usage[t.id] ?? null}
              onToggleActivity={() => onToggleActivity(t)}
              onRevoke={() => onRevoke(t)}
            />
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      {showSecret && (
        <SecretReveal
          row={showSecret.row}
          plaintext={showSecret.plaintext}
          onClose={() => setShowSecret(null)}
        />
      )}
    </section>
  );
}

function TokenRow({ token, busy, expanded, usage, onToggleActivity, onRevoke }: {
  token: ApiTokenRow;
  busy: boolean;
  expanded: boolean;
  usage: ApiUsageEntry[] | null;
  onToggleActivity: () => void;
  onRevoke: () => void;
}) {
  const isRevoked = !!token.revokedAtIso;
  const isExpired = !!token.expiresAtIso && new Date(token.expiresAtIso) < new Date();
  const status = isRevoked ? "revoked" : isExpired ? "expired" : "active";
  const statusStyle = {
    active: { bg: "rgba(34,197,94,0.10)", fg: "#15803d", label: "ACTIVE" },
    expired: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "EXPIRED" },
    revoked: { bg: "rgba(239,68,68,0.10)", fg: "#991b1b", label: "REVOKED" },
  }[status];

  return (
    <li className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}`, opacity: status !== "active" ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{token.name}</p>
            <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: statusStyle.bg, color: statusStyle.fg }}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-[10.5px] font-mono mt-0.5" style={{ color: BRAND.inkSoft }}>
            noho_{token.prefix}<span style={{ opacity: 0.5 }}>…</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {token.scopes.map((s) => (
              <span key={s} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#F4EEE3", color: BRAND.blueDeep }}>
                {s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]" style={{ color: BRAND.inkSoft }}>
            {token.lastUsedAtIso ? (
              <span>Last used {fmtRel(token.lastUsedAtIso)}{token.lastUsedIp ? ` · ${token.lastUsedIp}` : ""}</span>
            ) : (
              <span style={{ fontStyle: "italic" }}>Never used</span>
            )}
            {token.recentUsageCount > 0 && (
              <span className="font-bold" style={{ color: BRAND.blueDeep }}>· {token.recentUsageCount} req/24h</span>
            )}
            <span>· created {fmtRel(token.createdAtIso)}</span>
            {token.expiresAtIso && !isExpired && <span>· expires {fmtRel(token.expiresAtIso)}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button type="button" onClick={onToggleActivity} className="text-[10.5px] font-bold px-2 py-1 rounded-md" style={{ background: "#F4EEE3", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
            {expanded ? "Hide activity" : "View activity"}
          </button>
          {!isRevoked && (
            <button type="button" disabled={busy} onClick={onRevoke} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
              Revoke
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg p-2.5" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
          {usage == null ? (
            <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>Loading…</p>
          ) : usage.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: BRAND.inkSoft }}>No requests yet.</p>
          ) : (
            <ul className="space-y-1">
              {usage.map((u) => (
                <li key={u.id} className="text-[10.5px] font-mono flex items-center gap-2 flex-wrap" style={{ color: BRAND.ink }}>
                  <span style={{ color: u.status >= 200 && u.status < 300 ? "#15803d" : u.status >= 400 ? "#b91c1c" : BRAND.inkSoft, fontWeight: 700 }}>
                    {u.status}
                  </span>
                  <span style={{ color: BRAND.blueDeep }}>{u.method}</span>
                  <span className="truncate flex-1" style={{ color: BRAND.ink }}>{u.endpoint}</span>
                  {u.durationMs != null && <span style={{ color: BRAND.inkSoft }}>{u.durationMs}ms</span>}
                  <span style={{ color: BRAND.inkSoft }}>{fmtRel(u.createdAtIso)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function CreateTokenForm({ onCancel, onCreated }: {
  onCancel: () => void;
  onCreated: (plaintext: string, row: ApiTokenRow) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<ApiScope>>(new Set(["mail:read", "packages:read"]));
  const [exp, setExp] = useState<ExpirationPreset>("never");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(scope: ApiScope) {
    setScopes((cur) => {
      const next = new Set(cur);
      if (next.has(scope)) next.delete(scope); else next.add(scope);
      return next;
    });
  }

  function onSubmit() {
    setError(null);
    if (name.trim().length < 2) { setError("Name required."); return; }
    if (scopes.size === 0) { setError("Pick at least one scope."); return; }
    const days = EXPIRATION_OPTIONS.find((o) => o.key === exp)?.days ?? null;
    startTransition(async () => {
      const res = await createApiToken({ name: name.trim(), scopes: Array.from(scopes), expiresInDays: days });
      if (!res.ok) { setError(res.error); return; }
      onCreated(res.plaintext, res.row);
    });
  }

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Token name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Zapier integration" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Scopes</label>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {API_SCOPES.map((s) => {
            const active = scopes.has(s.key as ApiScope);
            return (
              <label key={s.key} className="flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer" style={{
                background: active ? "rgba(25,118,255,0.06)" : "white",
                border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
              }}>
                <input type="checkbox" checked={active} onChange={() => toggle(s.key as ApiScope)} className="mt-0.5 w-3.5 h-3.5 accent-[#1976FF]" />
                <span className="flex-1">
                  <p className="text-[11.5px] font-black" style={{ color: BRAND.ink }}>{s.label}</p>
                  <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>{s.description}</p>
                  <p className="text-[9.5px] font-mono mt-0.5" style={{ color: BRAND.inkSoft }}>{s.key}</p>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Expiration</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {EXPIRATION_OPTIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => setExp(o.key)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
              background: exp === o.key ? BRAND.blue : "white",
              color: exp === o.key ? "white" : BRAND.inkSoft,
              border: `1px solid ${exp === o.key ? BRAND.blue : BRAND.border}`,
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 text-[11px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>Cancel</button>
        <button type="button" disabled={busy} onClick={onSubmit} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
          {busy ? "Generating…" : "Generate token"}
        </button>
      </div>
    </div>
  );
}

function SecretReveal({ row, plaintext, onClose }: {
  row: ApiTokenRow;
  plaintext: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [calCopied, setCalCopied] = useState(false);
  const example = `curl -H "Authorization: Bearer ${plaintext}" https://nohomailbox.org/api/v1/me`;
  // iter-180 — calendar:read tokens get a copy-paste subscription URL
  // that calendar apps accept as-is (token in query param because
  // calendar subscriptions can't send custom Authorization headers).
  const hasCalendar = row.scopes.includes("calendar:read");
  const calendarUrl = `https://nohomailbox.org/api/v1/calendar.ics?token=${encodeURIComponent(plaintext)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }
  async function copyCalendarUrl() {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCalCopied(true);
      setTimeout(() => setCalCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.65)" }} onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ background: "white", border: `1px solid ${BRAND.border}` }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#15803d" }}>
          ✓ Token created
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: BRAND.ink }}>{row.name}</h3>
        <p className="text-[11.5px] mt-1" style={{ color: BRAND.inkSoft }}>
          Copy this token now — <strong style={{ color: "#b91c1c" }}>it will not be shown again</strong>. Only its hash is stored, so we can't recover it. If you lose it, revoke + regenerate.
        </p>
        <div className="mt-3 rounded-xl p-3 font-mono text-[12px] flex items-center gap-2" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}`, color: BRAND.ink, wordBreak: "break-all" }}>
          <span className="flex-1 select-all">{plaintext}</span>
          <button type="button" onClick={copy} className="shrink-0 text-[11px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: copied ? "#15803d" : BRAND.blue }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {hasCalendar && (
          <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(25,118,255,0.06)", border: `1px solid ${BRAND.blue}40` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.blueDeep }}>
              📅 Subscribe in your calendar app
            </p>
            <p className="text-[11px] mt-1" style={{ color: BRAND.inkSoft }}>
              Paste this URL into Apple Calendar (File → New Calendar Subscription), Google Calendar (Other calendars → From URL), or Outlook (Add calendar → From web). Updates hourly.
            </p>
            <div className="mt-2 rounded-lg p-2 font-mono text-[10.5px] flex items-center gap-2" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink, wordBreak: "break-all" }}>
              <span className="flex-1 select-all">{calendarUrl}</span>
              <button type="button" onClick={copyCalendarUrl} className="shrink-0 text-[10.5px] font-black px-2.5 py-1 rounded-md text-white" style={{ background: calCopied ? "#15803d" : BRAND.blue }}>
                {calCopied ? "✓ Copied" : "Copy URL"}
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] font-black uppercase tracking-[0.16em] mt-4" style={{ color: BRAND.inkSoft }}>Try the API</p>
        <pre className="mt-1 text-[11px] font-mono whitespace-pre-wrap rounded-lg p-3" style={{ background: "#1A1D23", color: "#A8E6CF", border: `1px solid ${BRAND.border}` }}>
{example}
        </pre>
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
    const future = -dt;
    const days = Math.round(future / (1000 * 60 * 60 * 24));
    if (days < 1) return "soon";
    if (days < 30) return `in ${days}d`;
    if (days < 365) return `in ${Math.round(days / 30)}mo`;
    return `in ${Math.round(days / 365)}y`;
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
