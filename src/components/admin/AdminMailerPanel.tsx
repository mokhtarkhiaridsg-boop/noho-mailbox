"use client";

// iter-118 — Apple-Mail-style admin mailer.
//
// Three-pane layout that fills the available viewport (no page scroll;
// each pane scrolls independently):
//
//   ┌─────────────┬─────────────────┬─────────────────────────────────┐
//   │  Folders    │  Thread list    │  Reading pane + reply composer  │
//   │  · Inbox    │  · sender       │  ┌───────────────────────────┐  │
//   │  · Sent     │  · subject      │  │ original message thread   │  │
//   │  · Archive  │  · preview      │  └───────────────────────────┘  │
//   │  · Templates│                 │  ┌───────────────────────────┐  │
//   │             │                 │  │ reply composer            │  │
//   │             │                 │  └───────────────────────────┘  │
//   └─────────────┴─────────────────┴─────────────────────────────────┘
//
// Templates "folder" swaps the right pane to a notice picker — admin
// chooses a template, plugs in a recipient email, and sends.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listInboxThreads,
  listSentThreads,
  listArchivedThreads,
  getThreadMessages,
  markThreadRead,
  archiveThread,
  replyToThread,
  listNoticeTemplates,
  sendNoticeTemplate,
  getMailerFolderCounts,
  type ThreadRow,
  type ThreadMessage,
} from "@/app/actions/mailerInbox";
import type { NoticeTemplate } from "@/lib/notice-templates";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const PANE_BORDER = "#e8e5e0";

type FolderKey = "inbox" | "sent" | "archived" | "templates";

const FOLDER_META: Record<FolderKey, { label: string; emoji: string }> = {
  inbox:     { label: "Inbox",     emoji: "📥" },
  sent:      { label: "Sent",      emoji: "📤" },
  archived:  { label: "Archived",  emoji: "🗄" },
  templates: { label: "Notices",   emoji: "📝" },
};

export default function AdminMailerPanel() {
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [counts, setCounts] = useState<{ inboxUnread: number; inboxTotal: number; sentTotal: number; archivedTotal: number }>({ inboxUnread: 0, inboxTotal: 0, sentTotal: 0, archivedTotal: 0 });
  const [pending, startTransition] = useTransition();

  function loadFolder(f: FolderKey) {
    setSelectedThread(null);
    setMessages(null);
    if (f === "templates") { setThreads([]); return; }
    setThreads(null);
    startTransition(async () => {
      const fn = f === "inbox" ? listInboxThreads : f === "sent" ? listSentThreads : listArchivedThreads;
      const rows = await fn();
      setThreads(rows);
    });
  }

  function refreshCounts() {
    void getMailerFolderCounts().then(setCounts).catch(() => undefined);
  }

  useEffect(() => { loadFolder(folder); }, [folder]);
  useEffect(() => { refreshCounts(); }, []);

  function selectThread(t: ThreadRow) {
    setSelectedThread(t);
    setMessages(null);
    startTransition(async () => {
      const msgs = await getThreadMessages(t.id);
      setMessages(msgs);
      if (t.unreadCount > 0) {
        await markThreadRead(t.id);
        refreshCounts();
        // Update local list so the badge clears without a refetch.
        setThreads((prev) => prev?.map((x) => x.id === t.id ? { ...x, unreadCount: 0 } : x) ?? null);
      }
    });
  }

  function archive(t: ThreadRow) {
    startTransition(async () => {
      await archiveThread(t.id);
      setThreads((prev) => (prev ?? []).filter((x) => x.id !== t.id));
      if (selectedThread?.id === t.id) { setSelectedThread(null); setMessages(null); }
      refreshCounts();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Comms · Mailbox
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Mailer</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Read replies, send notices from a template library, blast announcements. Folders left, threads middle, message + composer right.
        </p>
      </div>

      {/* The 3-pane shell. Fixed total height so panes scroll internally
          and the page itself stays put — no body scroll. Tweak the
          subtraction if your admin chrome above gets taller. */}
      <div
        className="grid rounded-2xl overflow-hidden"
        style={{
          gridTemplateColumns: "200px 320px 1fr",
          height: "calc(100vh - 240px)",
          minHeight: 480,
          border: `1px solid ${PANE_BORDER}`,
          background: "white",
        }}
      >
        {/* ─── Pane 1: Folders ──────────────────────────────────────── */}
        <aside className="overflow-y-auto" style={{ background: "#fafaf7", borderRight: `1px solid ${PANE_BORDER}` }}>
          <div className="px-3 py-3" style={{ borderBottom: `1px solid ${PANE_BORDER}` }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Mailboxes
            </p>
          </div>
          <ul className="py-1.5">
            {(Object.keys(FOLDER_META) as FolderKey[]).map((k) => {
              const meta = FOLDER_META[k];
              const active = folder === k;
              const count =
                k === "inbox"     ? counts.inboxTotal
                : k === "sent"     ? counts.sentTotal
                : k === "archived" ? counts.archivedTotal
                :                    null;
              const badge =
                k === "inbox" && counts.inboxUnread > 0 ? counts.inboxUnread : null;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setFolder(k)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background: active ? "rgba(51,116,133,0.10)" : "transparent",
                      color: active ? NOHO_BLUE_DEEP : NOHO_INK,
                    }}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    <span className="flex-1 text-[13px] font-bold">{meta.label}</span>
                    {badge != null && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: NOHO_BLUE, color: "white" }}>
                        {badge}
                      </span>
                    )}
                    {badge == null && count != null && (
                      <span className="text-[10.5px] tabular-nums" style={{ color: "rgba(45,16,15,0.45)" }}>
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2 mt-2" style={{ borderTop: `1px solid ${PANE_BORDER}` }}>
            <p className="text-[9.5px]" style={{ color: "rgba(45,16,15,0.45)" }}>
              Inbox fills as customers reply. Configure your provider's inbound webhook to POST <code className="font-mono">/api/email/inbound</code>.
            </p>
          </div>
        </aside>

        {/* ─── Pane 2: Thread list (or empty for Templates) ─────────── */}
        <section className="overflow-y-auto" style={{ borderRight: `1px solid ${PANE_BORDER}`, background: "white" }}>
          {folder === "templates" ? (
            <NoticePickerPane
              onSent={() => { refreshCounts(); }}
            />
          ) : threads === null ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : threads.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[28px]">{folder === "inbox" ? "📭" : folder === "sent" ? "✉️" : "🗄"}</p>
              <p className="text-[12.5px] font-black mt-2" style={{ color: NOHO_INK }}>
                {folder === "inbox" ? "Inbox empty" : folder === "sent" ? "Nothing sent yet" : "No archive"}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                {folder === "inbox" ? "Customer replies will land here." : folder === "sent" ? "Sent notices + replies show up here." : "Archived threads show up here."}
              </p>
            </div>
          ) : (
            <ul>
              {threads.map((t, i) => {
                const active = selectedThread?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectThread(t)}
                      className="w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors"
                      style={{
                        background: active ? "rgba(51,116,133,0.06)" : "white",
                        borderTop: i === 0 ? "none" : `1px solid ${PANE_BORDER}`,
                        borderLeft: active ? `3px solid ${NOHO_BLUE}` : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[12.5px] font-black truncate flex-1" style={{ color: NOHO_INK }}>
                          {t.direction === "in" ? "📨 " : "↗ "}
                          {t.customerName ?? t.customerEmail}
                          {t.customerSuite && (
                            <span className="ml-1 text-[10px] font-mono" style={{ color: NOHO_BLUE_DEEP }}>
                              #{t.customerSuite}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(45,16,15,0.55)" }}>
                          {formatRel(t.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-bold truncate" style={{ color: t.unreadCount > 0 ? NOHO_INK : "rgba(45,16,15,0.70)" }}>
                        {t.subject}
                      </p>
                      <p className="text-[10.5px] truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {t.preview}
                      </p>
                      {t.unreadCount > 0 && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 self-start"
                          style={{ background: NOHO_BLUE, color: "white" }}>
                          {t.unreadCount} unread
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ─── Pane 3: Reading + Composer ─────────────────────────── */}
        <section className="flex flex-col overflow-hidden" style={{ background: "white" }}>
          {folder === "templates" ? (
            <TemplatePreviewPane onSent={() => { refreshCounts(); }} />
          ) : !selectedThread ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-[40px]">📬</p>
                <p className="text-[13px] font-black mt-2" style={{ color: NOHO_INK }}>Select a thread</p>
                <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                  Pick a conversation from the list to read it.
                </p>
              </div>
            </div>
          ) : (
            <ReadingPane
              thread={selectedThread}
              messages={messages}
              onArchive={() => archive(selectedThread)}
              onReplied={() => {
                // Reload the messages + the list (sent count + lastMessage update).
                startTransition(async () => {
                  const msgs = await getThreadMessages(selectedThread.id);
                  setMessages(msgs);
                  loadFolder(folder);
                  refreshCounts();
                });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Reading pane ───────────────────────────────────────────────────────
function ReadingPane({ thread, messages, onArchive, onReplied }: {
  thread: ThreadRow;
  messages: ThreadMessage[] | null;
  onArchive: () => void;
  onReplied: () => void;
}) {
  return (
    <>
      {/* Header */}
      <header className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${PANE_BORDER}`, background: "#fafaf7" }}>
        <div className="min-w-0">
          <p className="text-[14px] font-black truncate" style={{ color: NOHO_INK }}>
            {thread.subject}
          </p>
          <p className="text-[11px] truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
            {thread.customerName ? `${thread.customerName} · ${thread.customerEmail}` : thread.customerEmail}
            {thread.customerSuite && ` · suite #${thread.customerSuite}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a href={`mailto:${thread.customerEmail}`}
            className="px-2.5 py-1.5 rounded-md text-[10.5px] font-bold border"
            style={{ borderColor: PANE_BORDER, color: NOHO_INK, background: "white" }}>
            ↗ Open in mail app
          </a>
          {!thread.archived && (
            <button type="button" onClick={onArchive}
              className="px-2.5 py-1.5 rounded-md text-[10.5px] font-bold border"
              style={{ borderColor: PANE_BORDER, color: NOHO_INK, background: "white" }}>
              🗄 Archive
            </button>
          )}
        </div>
      </header>

      {/* Messages — scrolls */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {!messages ? (
          <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>No messages in this thread.</p>
        ) : messages.map((m) => (
          <article key={m.id} className="rounded-xl p-3" style={{
            background: m.direction === "in" ? "rgba(51,116,133,0.05)" : "rgba(22,163,74,0.05)",
            border: `1px solid ${PANE_BORDER}`,
          }}>
            <header className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: m.direction === "in" ? NOHO_BLUE_DEEP : "#15803d" }}>
                {m.direction === "in" ? "📨 Customer" : "↗ NOHO"} · {new Date(m.sentAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {m.templateId && <span className="ml-2 text-[9px] font-mono opacity-70">tpl:{m.templateId}</span>}
              </p>
            </header>
            <div className="text-[12.5px]" style={{ color: NOHO_INK, lineHeight: 1.55 }}
              dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
          </article>
        ))}
      </div>

      {/* Reply composer */}
      <ReplyComposer threadId={thread.id} subject={thread.subject} onReplied={onReplied} />
    </>
  );
}

function ReplyComposer({ threadId, subject, onReplied }: {
  threadId: string;
  subject: string;
  onReplied: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function send() {
    setErr(null);
    if (!body.trim()) { setErr("Write a reply"); return; }
    startTransition(async () => {
      const html = body.split(/\n\n+/).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
      const res = await replyToThread({ threadId, bodyHtml: html, subject });
      if (res.error) { setErr(res.error); return; }
      setBody("");
      onReplied();
    });
  }

  return (
    <footer className="border-t p-3" style={{ borderColor: PANE_BORDER, background: "#fafaf7" }}>
      {err && (
        <p className="rounded-md px-2.5 py-1.5 mb-2 text-[11px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
          {err}
        </p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a reply… (plain text OK; double-newline = paragraph)"
        className="w-full rounded-md border px-3 py-2 text-[12.5px] resize-none"
        style={{ borderColor: PANE_BORDER, background: "white", color: NOHO_INK }}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Sends as <strong>NOHO Mailbox</strong>. Customer can reply to this email.
        </p>
        <button type="button" onClick={send} disabled={pending || !body.trim()}
          className="px-4 py-1.5 rounded-md text-white text-[12px] font-black disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
          {pending ? "Sending…" : "↗ Send reply"}
        </button>
      </div>
    </footer>
  );
}

// ─── Notices: picker + preview ──────────────────────────────────────────
function NoticePickerPane({ onSent: _onSent }: { onSent: () => void }) {
  const [templates, setTemplates] = useState<NoticeTemplate[] | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    void listNoticeTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0 && !selectedSlug) setSelectedSlug(t[0].slug);
    }).catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    if (!templates) return {} as Record<string, NoticeTemplate[]>;
    return templates.reduce<Record<string, NoticeTemplate[]>>((acc, t) => {
      (acc[t.category] ??= []).push(t);
      return acc;
    }, {});
  }, [templates]);

  return (
    <div onClick={() => undefined}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${PANE_BORDER}` }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Notice templates ({templates?.length ?? 0})
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Pick → preview → send to one customer. For audience blasts use Bulk Mailer.
        </p>
      </div>
      {!templates ? (
        <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
      ) : (
        <ul>
          {Object.entries(grouped).map(([cat, list]) => (
            <li key={cat}>
              <p className="px-3 pt-3 pb-1 text-[9.5px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.45)" }}>
                {cat}
              </p>
              {list.map((t) => {
                const active = selectedSlug === t.slug;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(t.slug);
                      // Broadcast via custom event so the right pane re-reads.
                      window.dispatchEvent(new CustomEvent("noho:select-template", { detail: t.slug }));
                    }}
                    className="w-full text-left px-3 py-2 flex flex-col"
                    style={{
                      background: active ? "rgba(51,116,133,0.06)" : "transparent",
                      borderLeft: active ? `3px solid ${NOHO_BLUE}` : "3px solid transparent",
                    }}>
                    <p className="text-[12.5px] font-black" style={{ color: NOHO_INK }}>{t.label}</p>
                    <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>{t.description}</p>
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplatePreviewPane({ onSent }: { onSent: () => void }) {
  const [templates, setTemplates] = useState<NoticeTemplate[] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void listNoticeTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0) {
        setSlug((cur) => cur ?? t[0].slug);
      }
    }).catch(() => setTemplates([]));
  }, []);

  // Listen for picker selection so the panes stay in sync.
  useEffect(() => {
    function onPick(e: Event) {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === "string") setSlug(ce.detail);
    }
    window.addEventListener("noho:select-template", onPick);
    return () => window.removeEventListener("noho:select-template", onPick);
  }, []);

  // Pre-fill subject + body whenever the slug flips.
  const current = useMemo(() => templates?.find((t) => t.slug === slug) ?? null, [templates, slug]);
  useEffect(() => {
    if (!current) return;
    setSubject(current.subject);
    setBody(current.bodyHtml);
  }, [current]);

  function send() {
    setMsg(null);
    if (!current) return;
    startTransition(async () => {
      const res = await sendNoticeTemplate({
        templateSlug: current.slug,
        toEmail,
        subjectOverride: subject !== current.subject ? subject : undefined,
        bodyOverrideHtml: body !== current.bodyHtml ? body : undefined,
      });
      if (res.error) { setMsg(res.error); return; }
      setMsg(`✓ Sent to ${toEmail} · thread saved to Sent`);
      setToEmail("");
      onSent();
    });
  }

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-[40px]">📝</p>
          <p className="text-[13px] font-black mt-2" style={{ color: NOHO_INK }}>Pick a notice</p>
          <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>Choose from the list to preview + send.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="px-5 py-3" style={{ borderBottom: `1px solid ${PANE_BORDER}`, background: "#fafaf7" }}>
        <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: NOHO_BLUE_DEEP }}>
          {current.category} · template
        </p>
        <p className="text-[14px] font-black" style={{ color: NOHO_INK }}>{current.label}</p>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {msg && (
          <p className="rounded-md px-2.5 py-1.5 text-[11.5px] font-bold" style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>{msg}</p>
        )}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>To</label>
          <input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="customer@example.com"
            className="mt-1 w-full rounded-md border px-3 py-2 text-[13px]"
            style={{ borderColor: PANE_BORDER, background: "white", color: NOHO_INK }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-[13px]"
            style={{ borderColor: PANE_BORDER, background: "white", color: NOHO_INK }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Body (HTML · variables: {`{{firstName}} {{suiteNumber}} {{planDueDate}}`})
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
            className="mt-1 w-full rounded-md border px-3 py-2 text-[12px] font-mono resize-y"
            style={{ borderColor: PANE_BORDER, background: "white", color: NOHO_INK }} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(45,16,15,0.55)" }}>Preview</p>
          <div className="rounded-md border p-3 text-[12.5px]" style={{ borderColor: PANE_BORDER, background: "white", color: NOHO_INK, lineHeight: 1.55 }}
            dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      </div>
      <footer className="border-t p-3 flex items-center justify-between" style={{ borderColor: PANE_BORDER, background: "#fafaf7" }}>
        <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Variables render against the recipient's record automatically.
        </p>
        <button type="button" onClick={send} disabled={pending || !toEmail.trim()}
          className="px-4 py-1.5 rounded-md text-white text-[12px] font-black disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
          {pending ? "Sending…" : "↗ Send notice"}
        </button>
      </footer>
    </>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatRel(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
