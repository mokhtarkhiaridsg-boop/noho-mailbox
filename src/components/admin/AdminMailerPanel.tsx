"use client";

/**
 * Admin Mailer — Gmail-clone (iter 11).
 *
 * 3-pane layout: folders rail | thread list | reading pane. Compose
 * window floats bottom-right. Search box in the top bar filters threads
 * client-side. Reading pane shows the full thread + a reply composer
 * pinned to the bottom. Stars persist in localStorage (no server table
 * yet — we can promote to DB if you want history-preserved stars).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  listInboxThreads,
  listSentThreads,
  listArchivedThreads,
  getThreadMessages,
  markThreadRead,
  archiveThread,
  replyToThread,
  sendNoticeTemplate,
  getMailerFolderCounts,
  type ThreadRow,
  type ThreadMessage,
} from "@/app/actions/mailerInbox";

// ─── Brand tokens (mirror the rest of the admin shell) ────────────────
const T = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#E5DACA",
  borderStrong: "#CFC2AC",
  hairline: "rgba(0,0,0,0.10)",
  ink: "#2D100F",
  inkSoft: "#5C4540",
  inkFaint: "#7A6050",
  cream: "#F7E6C2",
  blue: "#337485",
  blueDeep: "#23596A",
  red: "#E70013",
  amber: "#F5A623",
  success: "#16A34A",
};
const STAR_KEY = "noho-mailer-stars-v1";

type Folder = "inbox" | "starred" | "sent" | "archive";

function readStars(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STAR_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
function writeStars(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAR_KEY, JSON.stringify(Array.from(s)));
  } catch { /* private browsing */ }
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

function initials(name: string | null, email: string): string {
  const src = (name?.trim() || email.split("@")[0]).trim();
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarTint(email: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 70%, 92%)`, fg: `hsl(${hue}, 60%, 28%)` };
}

export default function AdminMailerPanel() {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ThreadMessage[]>([]);
  const [counts, setCounts] = useState<{ inboxUnread: number; inboxTotal: number; sentTotal: number; archivedTotal: number } | null>(null);
  const [search, setSearch] = useState("");
  const [stars, setStars] = useState<Set<string>>(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMin, setComposeMin] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [replyMsg, setReplyMsg] = useState<string | null>(null);

  useEffect(() => { setStars(readStars()); }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const c = await getMailerFolderCounts();
      setCounts(c);
    } catch { /* fail-silent */ }
  }, []);

  const loadFolder = useCallback(async (f: Folder) => {
    let rows: ThreadRow[] = [];
    if (f === "inbox") rows = await listInboxThreads();
    else if (f === "sent") rows = await listSentThreads();
    else if (f === "archive") rows = await listArchivedThreads();
    else if (f === "starred") {
      const all = [...await listInboxThreads(), ...await listSentThreads()];
      const seen = new Set<string>();
      rows = all.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return stars.has(r.id); });
    }
    setThreads(rows);
  }, [stars]);

  useEffect(() => {
    startTransition(async () => {
      await Promise.all([loadFolder(folder), refreshCounts()]);
    });
    // eslint-disable-next-line
  }, [folder]);

  useEffect(() => {
    if (!activeThreadId) { setActiveMessages([]); return; }
    setLoadingMessages(true);
    let cancelled = false;
    (async () => {
      try {
        const m = await getThreadMessages(activeThreadId);
        if (!cancelled) setActiveMessages(m);
        const t = threads.find((x) => x.id === activeThreadId);
        if (t && t.unreadCount > 0) {
          await markThreadRead(activeThreadId);
          await refreshCounts();
        }
      } catch { /* fail-silent */ } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [activeThreadId]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const hay = `${t.customerName ?? ""} ${t.customerEmail} ${t.subject} ${t.preview}`.toLowerCase();
      return hay.includes(q);
    });
  }, [threads, search]);

  function toggleStar(id: string) {
    setStars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeStars(next);
      return next;
    });
  }

  async function handleArchive(id: string) {
    await archiveThread(id);
    if (activeThreadId === id) setActiveThreadId(null);
    await Promise.all([loadFolder(folder), refreshCounts()]);
  }

  async function handleSendReply() {
    if (!activeThreadId || !replyText.trim()) return;
    setReplyPending(true);
    setReplyMsg(null);
    try {
      const res = await replyToThread({
        threadId: activeThreadId,
        bodyHtml: replyText.trim().replace(/\n/g, "<br/>"),
      });
      if ("error" in res && res.error) {
        setReplyMsg(`Error: ${res.error}`);
      } else {
        setReplyText("");
        setReplyMsg("Sent.");
        const m = await getThreadMessages(activeThreadId);
        setActiveMessages(m);
        await refreshCounts();
        setTimeout(() => setReplyMsg(null), 2500);
      }
    } finally {
      setReplyPending(false);
    }
  }

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) ?? null : null;

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        minHeight: 560,
      }}
    >
      {/* ─── Left rail: Compose + folders ─── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0"
        style={{ borderRight: `1px solid ${T.border}`, background: T.surface }}
      >
        <div className="p-3">
          <button
            type="button"
            onClick={() => { setComposeOpen(true); setComposeMin(false); }}
            className="inline-flex items-center gap-2 h-11 px-4 w-full rounded-2xl text-[12px] font-black uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5"
            style={{
              background: T.cream,
              color: T.ink,
              border: `1px solid ${T.borderStrong}`,
              boxShadow: "0 4px 14px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.7) inset",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 21l3-1 13-13-2-2L4 18l-1 3z" />
              <path d="M14 7l3 3" />
            </svg>
            Compose
          </button>
        </div>
        <nav className="flex-1 px-2 pb-3 space-y-0.5 overflow-y-auto">
          <FolderItem
            label="Inbox"
            active={folder === "inbox"}
            badge={counts?.inboxUnread ?? null}
            onClick={() => { setFolder("inbox"); setActiveThreadId(null); }}
            icon={(
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13 V20 H21 V13 L17 13 L15 16 L9 16 L7 13 Z" />
                <path d="M3 13 L7 4 H17 L21 13" />
              </svg>
            )}
          />
          <FolderItem
            label="Starred"
            active={folder === "starred"}
            badge={stars.size > 0 ? stars.size : null}
            onClick={() => { setFolder("starred"); setActiveThreadId(null); }}
            icon={(
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 L14.5 9 L21 9.6 L16 14 L17.6 21 L12 17.5 L6.4 21 L8 14 L3 9.6 L9.5 9 Z" />
              </svg>
            )}
          />
          <FolderItem
            label="Sent"
            active={folder === "sent"}
            badge={counts?.sentTotal ?? null}
            onClick={() => { setFolder("sent"); setActiveThreadId(null); }}
            icon={(
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 L11 13" />
                <path d="M22 2 L15 22 L11 13 L2 9 Z" />
              </svg>
            )}
          />
          <FolderItem
            label="Archive"
            active={folder === "archive"}
            badge={counts?.archivedTotal ?? null}
            onClick={() => { setFolder("archive"); setActiveThreadId(null); }}
            icon={(
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8 V20 H19 V8 M10 12 H14" />
              </svg>
            )}
          />
        </nav>
        <div className="px-3 py-2 text-[10px] font-bold tracking-[0.10em] uppercase" style={{ color: T.inkFaint, borderTop: `1px solid ${T.border}` }}>
          {counts ? `${counts.inboxTotal} threads · ${counts.inboxUnread} unread` : "Loading…"}
        </div>
      </aside>

      {/* ─── Middle: search + list ─── */}
      <section className="flex flex-col w-full md:w-[360px] shrink-0" style={{ borderRight: `1px solid ${T.border}` }}>
        <div className="p-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div
            className="flex items-center gap-2 rounded-xl px-3 h-10"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={T.inkFaint} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="6" />
              <path d="m17 17 4 4" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mail"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: T.ink }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[11px] font-bold" style={{ color: T.inkFaint }} aria-label="Clear">
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ background: T.surfaceAlt }}>
          {pending && filteredThreads.length === 0 && (
            <div className="px-4 py-12 text-center text-[12px]" style={{ color: T.inkFaint }}>
              Loading…
            </div>
          )}
          {!pending && filteredThreads.length === 0 && (
            <div className="px-4 py-12 text-center" style={{ color: T.inkFaint }}>
              <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="14" width="48" height="36" rx="3" />
                <path d="M8 18 L32 36 L56 18" />
              </svg>
              <p className="text-[13px] font-bold" style={{ color: T.ink }}>
                {folder === "inbox" ? "Inbox zero" : folder === "starred" ? "No starred threads" : folder === "sent" ? "Nothing sent yet" : "Archive empty"}
              </p>
              <p className="text-[11px] mt-1">
                {search ? `No matches for "${search}"` : "Mail will land here as customers reply."}
              </p>
            </div>
          )}
          <ul className="space-y-px">
            {filteredThreads.map((t) => {
              const isActive = activeThreadId === t.id;
              const isStarred = stars.has(t.id);
              const tint = avatarTint(t.customerEmail);
              const unread = t.unreadCount > 0;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    className="group w-full flex items-start gap-3 px-3 py-3 text-left transition-colors"
                    style={{
                      background: isActive ? T.cream : unread ? T.surface : T.surfaceAlt,
                      borderLeft: `3px solid ${isActive ? T.blue : "transparent"}`,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(247,230,194,0.55)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = unread ? T.surface : T.surfaceAlt; }}
                  >
                    <span
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
                      style={{ background: tint.bg, color: tint.fg }}
                    >
                      {initials(t.customerName, t.customerEmail)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p
                          className="text-[13px] truncate"
                          style={{ color: T.ink, fontWeight: unread ? 800 : 500 }}
                        >
                          {t.customerName ?? t.customerEmail.split("@")[0]}
                          {t.customerSuite && (
                            <span className="ml-1.5 text-[10px] font-bold" style={{ color: T.inkFaint }}>
                              · #{t.customerSuite}
                            </span>
                          )}
                        </p>
                        <span
                          className="ml-auto shrink-0 text-[10px] tabular-nums"
                          style={{ color: T.inkFaint, fontWeight: unread ? 800 : 500 }}
                        >
                          {fmtRelative(t.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className="text-[12px] truncate mt-0.5"
                        style={{ color: T.ink, fontWeight: unread ? 700 : 500 }}
                      >
                        {t.subject || "(no subject)"}
                      </p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: T.inkFaint }}>
                        {t.preview || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleStar(t.id); }}
                      className="shrink-0 self-start mt-1.5 p-1 rounded transition-opacity"
                      style={{ opacity: isStarred ? 1 : 0 }}
                      aria-label={isStarred ? "Unstar" : "Star"}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isStarred ? T.amber : "none"} stroke={isStarred ? T.amber : T.inkFaint} strokeWidth="1.8" strokeLinejoin="round">
                        <path d="M12 3 L14.5 9 L21 9.6 L16 14 L17.6 21 L12 17.5 L6.4 21 L8 14 L3 9.6 L9.5 9 Z" />
                      </svg>
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ─── Right: reading pane ─── */}
      <section className="hidden md:flex flex-col flex-1 min-w-0">
        {!activeThread && (
          <div className="flex-1 flex items-center justify-center px-6 py-12 text-center" style={{ color: T.inkFaint }}>
            <div>
              <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="14" width="48" height="36" rx="3" />
                <path d="M8 18 L32 36 L56 18" />
              </svg>
              <p className="text-[14px] font-bold" style={{ color: T.ink }}>Pick a thread to read</p>
              <p className="text-[12px] mt-1">{filteredThreads.length} thread{filteredThreads.length === 1 ? "" : "s"} in {folder}</p>
            </div>
          </div>
        )}
        {activeThread && (
          <>
            <header
              className="flex items-start gap-3 p-4"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight truncate" style={{ color: T.ink }}>
                  {activeThread.subject || "(no subject)"}
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>
                  {activeThread.customerName ?? activeThread.customerEmail}
                  {activeThread.customerSuite && ` · Suite #${activeThread.customerSuite}`}
                  {" · "}{activeMessages.length} message{activeMessages.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleStar(activeThread.id)}
                className="p-2 rounded-md transition-colors"
                style={{ color: stars.has(activeThread.id) ? T.amber : T.inkFaint }}
                title={stars.has(activeThread.id) ? "Unstar" : "Star"}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill={stars.has(activeThread.id) ? T.amber : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <path d="M12 3 L14.5 9 L21 9.6 L16 14 L17.6 21 L12 17.5 L6.4 21 L8 14 L3 9.6 L9.5 9 Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleArchive(activeThread.id)}
                className="p-2 rounded-md transition-colors"
                style={{ color: T.inkFaint }}
                title="Archive thread"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8 V20 H19 V8 M10 12 H14" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: T.bg }}>
              {loadingMessages && activeMessages.length === 0 && (
                <div className="text-center py-12" style={{ color: T.inkFaint }}>Loading thread…</div>
              )}
              {activeMessages.map((m) => (
                <article
                  key={m.id}
                  className="rounded-xl p-4"
                  style={{
                    background: m.direction === "out" ? "rgba(51,116,133,0.06)" : T.surface,
                    border: `1px solid ${m.direction === "out" ? "rgba(51,116,133,0.2)" : T.border}`,
                  }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className="w-7 h-7 rounded-full shrink-0 inline-flex items-center justify-center text-[10px] font-black"
                      style={{
                        background: m.direction === "out" ? T.blue : avatarTint(m.fromEmail).bg,
                        color: m.direction === "out" ? "#fff" : avatarTint(m.fromEmail).fg,
                      }}
                    >
                      {m.direction === "out" ? "NM" : initials(null, m.fromEmail)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate" style={{ color: T.ink }}>
                        {m.direction === "out" ? "NOHO Mailbox" : m.fromEmail}
                      </p>
                      <p className="text-[10px]" style={{ color: T.inkFaint }}>
                        to {m.toEmail} · {fmtRelative(m.sentAtIso)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="text-[13px] leading-relaxed"
                    style={{ color: T.ink, wordBreak: "break-word" }}
                    dangerouslySetInnerHTML={{ __html: m.bodyHtml || (m.bodyText ?? "").replace(/\n/g, "<br/>") }}
                  />
                </article>
              ))}
            </div>

            <div className="p-3" style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}>
              <div className="flex flex-col gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${activeThread.customerName ?? activeThread.customerEmail}…`}
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 resize-none"
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px]" style={{ color: T.inkFaint }}>
                    {replyMsg ?? `Re: ${activeThread.subject || "(no subject)"}`}
                  </span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={replyPending || !replyText.trim()}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-black uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    style={{ background: T.blue, color: "#fff", boxShadow: "0 4px 14px rgba(51,116,133,0.30)" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 L11 13" />
                      <path d="M22 2 L15 22 L11 13 L2 9 Z" />
                    </svg>
                    {replyPending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {composeOpen && (
        <ComposeFloater
          minimized={composeMin}
          onMinimize={() => setComposeMin((v) => !v)}
          onClose={() => { setComposeOpen(false); setComposeMin(false); }}
          onSent={async () => {
            await Promise.all([loadFolder(folder), refreshCounts()]);
          }}
        />
      )}
    </div>
  );
}

function FolderItem({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 h-9 px-3 rounded-r-full rounded-l-md text-[13px] font-bold transition-colors"
      style={{
        background: active ? "rgba(51,116,133,0.12)" : "transparent",
        color: active ? T.blueDeep : "#2D100F",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ color: active ? T.blue : "#7A6050" }}>
        {icon}
      </span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== null && badge > 0 && (
        <span
          className="text-[10px] font-black tabular-nums"
          style={{ color: active ? T.blue : "#7A6050" }}
        >
          {badge > 999 ? "999+" : badge}
        </span>
      )}
    </button>
  );
}

function ComposeFloater({
  minimized,
  onMinimize,
  onClose,
  onSent,
}: {
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onSent: () => void | Promise<void>;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!minimized) requestAnimationFrame(() => inputRef.current?.focus());
  }, [minimized]);

  async function handleSend() {
    setMsg(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      setMsg("Enter a valid email.");
      return;
    }
    if (!subject.trim()) { setMsg("Subject required."); return; }
    if (!body.trim())    { setMsg("Body required."); return; }
    setPending(true);
    try {
      const res = await sendNoticeTemplate({
        templateSlug: "general",
        toEmail: to.trim(),
        subjectOverride: subject.trim(),
        bodyOverrideHtml: body.trim().replace(/\n/g, "<br/>"),
      });
      if ("error" in res && res.error) {
        setMsg(`Error: ${res.error}`);
      } else {
        setMsg("Sent.");
        setTimeout(async () => {
          setMsg(null);
          await onSent();
          onClose();
        }, 700);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed right-6 bottom-3 z-50 rounded-t-2xl overflow-hidden"
      style={{
        width: minimized ? 320 : 480,
        background: T.surface,
        border: `1px solid ${T.borderStrong}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.7) inset",
      }}
      role="dialog"
      aria-label="Compose new message"
    >
      <header
        className="flex items-center gap-2 px-4 h-10 cursor-pointer select-none"
        style={{ background: T.ink, color: T.cream }}
        onClick={onMinimize}
      >
        <span className="text-[12px] font-black uppercase tracking-[0.10em] flex-1 truncate">
          {subject.trim() || "New message"}
        </span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-1 hover:opacity-80" aria-label={minimized ? "Expand" : "Minimize"}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d={minimized ? "M6 14 L12 8 L18 14" : "M6 10 L12 16 L18 10"} />
          </svg>
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:opacity-80" aria-label="Close">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6 L18 18 M6 18 L18 6" />
          </svg>
        </button>
      </header>
      {!minimized && (
        <div className="p-3 space-y-2">
          <input
            ref={inputRef}
            type="email"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full h-9 px-3 rounded-md text-sm focus:outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-9 px-3 rounded-md text-sm focus:outline-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <textarea
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none resize-none"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: msg?.startsWith("Error") ? T.red : T.inkFaint }}>
              {msg ?? "Sends from nohomailbox@gmail.com"}
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-black uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              style={{ background: T.blue, color: "#fff", boxShadow: "0 4px 14px rgba(51,116,133,0.30)" }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 L11 13" />
                <path d="M22 2 L15 22 L11 13 L2 9 Z" />
              </svg>
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
