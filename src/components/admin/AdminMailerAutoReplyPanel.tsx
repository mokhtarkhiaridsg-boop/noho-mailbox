"use client";

/**
 * iter-141 — Mailer auto-reply rules admin (Tier 8 #53).
 *
 * Admin defines per-keyword auto-replies for inbound mailer threads.
 * Each rule fires at most once per customer per cooldown window.
 * Templates support {customerName}, {firstName}, {originalSubject},
 * {firstLine}.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAutoReplyRules,
  upsertAutoReplyRule,
  deleteAutoReplyRule,
  toggleAutoReplyRuleActive,
  type AutoReplyRuleRow,
} from "@/app/actions/mailerAutoReply";

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

type EditingState =
  | { mode: "new" }
  | { mode: "edit"; row: AutoReplyRuleRow }
  | null;

const PRESETS: Array<{ label: string; keywords: string[]; subject: string; bodyHtml: string }> = [
  {
    label: "Vacation / out-of-office",
    keywords: ["vacation", "holiday", "out of office", "ooo", "away"],
    subject: "Re: {originalSubject} — we got your message",
    bodyHtml:
      "<p>Hi {firstName},</p><p>Thanks for the note — our team is currently out of the office and we'll get back to you within 1 business day.</p><p>If it's urgent, please call <a href=\"tel:+18185067744\">(818) 506-7744</a> and leave a voicemail.</p><p>— The NOHO Mailbox team</p>",
  },
  {
    label: "After-hours auto-reply",
    keywords: ["urgent", "asap", "today"],
    subject: "Re: {originalSubject}",
    bodyHtml:
      "<p>Hi {firstName},</p><p>We received your message after hours. We'll review it first thing next business day. For urgent in-bureau pickups, our hours are Mon–Fri 9:30am–5:30pm and Sat 10am–1:30pm.</p><p>— The NOHO Mailbox team</p>",
  },
  {
    label: "Pricing / plan inquiry",
    keywords: ["price", "pricing", "plan", "cost", "how much"],
    subject: "Re: {originalSubject} — pricing info",
    bodyHtml:
      "<p>Hi {firstName},</p><p>Thanks for asking about our plans! Quick overview:</p><ul><li><strong>Basic</strong> — $50/mo</li><li><strong>Business</strong> — $90/mo</li><li><strong>Premium</strong> — $145/mo</li></ul><p>Full breakdown at <a href=\"https://nohomailbox.org/plans\">nohomailbox.org/plans</a>. Reply with any questions.</p><p>— The NOHO Mailbox team</p>",
  },
];

export default function AdminMailerAutoReplyPanel() {
  const [rows, setRows] = useState<AutoReplyRuleRow[] | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void listAutoReplyRules().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  function onSaved() {
    setEditing(null);
    refresh();
  }

  function onDelete(row: AutoReplyRuleRow) {
    if (!confirm(`Delete auto-reply rule "${row.label}"? This action is audit-logged but cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteAutoReplyRule(row.id);
      if ("error" in res) { alert(res.error); return; }
      refresh();
    });
  }

  function onToggle(row: AutoReplyRuleRow) {
    startTransition(async () => {
      const res = await toggleAutoReplyRuleActive(row.id);
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Money & Comms · Mailer auto-replies
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Auto-reply rules
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Inbound mailer threads matching a rule's keywords get a templated reply automatically. Cooldown prevents reply-loops. Each fire is audit-logged.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* Rules list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              {rows == null ? "Loading…" : `${rows.length} rule${rows.length === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={() => setEditing({ mode: "new" })}
              className="text-[11px] font-black px-2.5 py-1 rounded-md text-white"
              style={{ background: T.blue }}
            >
              + New rule
            </button>
          </div>
          {rows && rows.length === 0 ? (
            <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>
              No rules yet. Create one to start auto-replying to inbound mailer messages.
            </div>
          ) : (
            <ul>
              {(rows ?? []).map((r) => (
                <li
                  key={r.id}
                  className="px-4 py-3 flex items-start gap-2 group"
                  style={{ borderBottom: `1px solid ${T.border}`, opacity: r.active ? 1 : 0.55 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-black" style={{ color: T.ink }}>{r.label}</span>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: r.active ? "rgba(34,197,94,0.10)" : "rgba(0,0,0,0.06)", color: r.active ? "#15803d" : T.inkFaint }}>
                        {r.active ? "active" : "paused"}
                      </span>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.08)", color: "#23596A" }}>
                        {r.matchOn}
                      </span>
                      {r.businessHours !== "any" && (
                        <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.10)", color: "#92400e" }}>
                          {r.businessHours} hours
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.keywords.slice(0, 6).map((k) => (
                        <span key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                          {k}
                        </span>
                      ))}
                      {r.keywords.length > 6 && (
                        <span className="text-[10px]" style={{ color: T.inkFaint }}>+{r.keywords.length - 6}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[10.5px]" style={{ color: T.inkFaint }}>
                      Fired {r.sendCount}× · cooldown {r.cooldownHours}h
                      {r.lastFiredAt && ` · last ${new Date(r.lastFiredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onToggle(r)}
                      className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                      style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
                    >
                      {r.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditing({ mode: "edit", row: r })}
                      className="text-[10.5px] font-black px-2 py-1 rounded-md text-white disabled:opacity-50"
                      style={{ background: T.blue }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(r)}
                      className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.10)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}
                    >
                      Del
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        {editing && (
          <RuleEditor state={editing} onCancel={() => setEditing(null)} onSaved={onSaved} />
        )}
        {!editing && (
          <div className="rounded-2xl p-4 text-[11.5px]" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px dashed ${T.border}` }}>
            Pick a rule to edit, or click <strong>+ New rule</strong>. Use templates: <code>{"{customerName}"}</code>, <code>{"{firstName}"}</code>, <code>{"{originalSubject}"}</code>, <code>{"{firstLine}"}</code>.
          </div>
        )}
      </div>
    </div>
  );
}

function RuleEditor({
  state,
  onCancel,
  onSaved,
}: {
  state: { mode: "new" } | { mode: "edit"; row: AutoReplyRuleRow };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const initial = state.mode === "edit" ? state.row : null;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [matchOn, setMatchOn] = useState<"any" | "subject" | "body">(initial?.matchOn ?? "any");
  const [keywords, setKeywords] = useState(initial?.keywords.join(", ") ?? "");
  const [replySubject, setReplySubject] = useState(initial?.replySubject ?? "Re: {originalSubject}");
  const [replyBodyHtml, setReplyBodyHtml] = useState(initial?.replyBodyHtml ?? "<p>Hi {firstName},</p><p>Thanks for your message — we got it and will reply soon.</p>");
  const [active, setActive] = useState(initial?.active ?? true);
  const [cooldownHours, setCooldownHours] = useState(initial?.cooldownHours ?? 24);
  const [businessHours, setBusinessHours] = useState<"any" | "open" | "closed">(initial?.businessHours ?? "any");
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function applyPreset(p: typeof PRESETS[number]) {
    setLabel(p.label);
    setKeywords(p.keywords.join(", "));
    setReplySubject(p.subject);
    setReplyBodyHtml(p.bodyHtml);
  }

  function onSave() {
    setErrorMsg(null);
    const kws = keywords.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
    if (kws.length === 0) { setErrorMsg("Add at least one keyword (comma- or newline-separated)"); return; }
    startTransition(async () => {
      const res = await upsertAutoReplyRule({
        id: initial?.id,
        label,
        matchOn,
        keywords: kws,
        replySubject,
        replyBodyHtml,
        active,
        cooldownHours,
        businessHours,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black" style={{ color: T.ink }}>
          {initial ? "Edit rule" : "New auto-reply rule"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
          style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
        >
          Cancel
        </button>
      </div>

      {!initial && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
            Start from preset
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[10.5px] font-bold px-2 py-1 rounded-full"
                style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Label (admin-only)</Label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. After-hours auto-reply"
          className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Match on</Label>
          <select
            value={matchOn}
            onChange={(e) => setMatchOn(e.target.value as "any" | "subject" | "body")}
            className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
            style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
          >
            <option value="any">Subject + body</option>
            <option value="subject">Subject only</option>
            <option value="body">Body only</option>
          </select>
        </div>
        <div>
          <Label>Cooldown (hours)</Label>
          <input
            type="number"
            min={1}
            max={720}
            value={cooldownHours}
            onChange={(e) => setCooldownHours(Math.max(1, Math.min(720, parseInt(e.target.value) || 24)))}
            className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm tabular-nums"
            style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
          />
        </div>
        <div>
          <Label>Business hours</Label>
          <select
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value as "any" | "open" | "closed")}
            className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
            style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
          >
            <option value="any">Any time</option>
            <option value="open">Only when open</option>
            <option value="closed">Only when closed</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Keywords (comma or newline separated, case-insensitive)</Label>
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="vacation, out of office, holiday"
          rows={2}
          className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
          style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
        />
      </div>

      <div>
        <Label>Reply subject (template)</Label>
        <input
          type="text"
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
          placeholder="Re: {originalSubject}"
          className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
        />
      </div>

      <div>
        <Label>Reply body HTML (template)</Label>
        <textarea
          value={replyBodyHtml}
          onChange={(e) => setReplyBodyHtml(e.target.value)}
          rows={6}
          className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-[11.5px] font-mono resize-none"
          style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
        />
        <p className="mt-1 text-[10px]" style={{ color: T.inkFaint }}>
          Placeholders: <code>{"{customerName}"}</code>, <code>{"{firstName}"}</code>, <code>{"{originalSubject}"}</code>, <code>{"{firstLine}"}</code>.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-[11.5px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
        Active (will fire on next inbound match)
      </label>

      {errorMsg && (
        <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>
          {errorMsg}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="px-3 py-2 rounded-lg text-[11.5px] font-black text-white disabled:opacity-50"
          style={{ background: T.blue }}
        >
          {pending ? "Saving…" : initial ? "Save changes" : "Create rule"}
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
      {children}
    </label>
  );
}
