"use client";

/**
 * Messenger-style chat stream — bubbles, auto-poll, send-on-Enter.
 * Used by both the admin two-pane chat and the member single-thread chat.
 */
import { useEffect, useRef, useState } from "react";
import {
  getChatMessages,
  sendChatMessage,
} from "@/app/actions/chat";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachments: {
    id: string;
    filename: string;
    url: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
  }[];
};

type Props = {
  threadId: string;
  meId: string;
  otherName: string;
  otherSubtitle?: string | null;
  /** Hint shown above the input on first render (e.g. "Type to start chatting…"). */
  emptyHint?: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ChatStream({ threadId, meId, otherName, otherSubtitle, emptyHint }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  // Initial + periodic load. Polls every 3.5s while mounted.
  useEffect(() => {
    let alive = true;
    let tries = 0;

    async function load() {
      const res = await getChatMessages(threadId);
      if (!alive || "error" in res) return;
      const next = res.messages;
      // Only update state if the tail changed, to avoid scroll jumps.
      const tail = next[next.length - 1]?.id ?? null;
      if (tail !== lastIdRef.current) {
        lastIdRef.current = tail;
        setMessages(next);
        // Scroll to bottom on update.
        requestAnimationFrame(() => {
          const el = scrollerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    }

    load();
    const interval = setInterval(() => {
      tries++;
      // Slow down polling after a few minutes of inactivity to save bandwidth.
      if (tries > 80 && tries % 4 !== 0) return;
      load();
    }, 3500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [threadId]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    // Optimistic — show the bubble immediately.
    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      senderId: meId,
      body: text,
      createdAt: new Date().toISOString(),
      attachments: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    const res = await sendChatMessage({ threadId, body: text });
    setSending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      // Roll back optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } else {
      // Re-fetch to get the real id + sync.
      const fresh = await getChatMessages(threadId);
      if ("success" in fresh && fresh.success && fresh.messages) {
        const ms = fresh.messages;
        lastIdRef.current = ms[ms.length - 1]?.id ?? null;
        setMessages(ms);
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ background: "white", borderBottom: "1px solid rgba(45,16,15,0.1)" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
          style={{
            background: "#F7E6C2",
            border: "2px solid #2D100F",
            color: "#2D100F",
            fontFamily: "var(--font-baloo), sans-serif",
          }}
        >
          {otherName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "•"}
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm truncate" style={{ color: "#2D100F" }}>
            {otherName}
          </p>
          {otherSubtitle && (
            <p className="text-[11px] truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
              {otherSubtitle}
            </p>
          )}
        </div>
        <span
          className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.10em]"
          style={{ color: "rgba(45,16,15,0.55)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--color-success)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "var(--color-success)" }}
            />
          </span>
          Live
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2"
        style={{ background: "#F8F2EA" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <span
              className="ai-icon mb-3 inline-flex items-center justify-center w-12 h-12 rounded-2xl"
              style={{ background: "white", border: "1px solid rgba(45,16,15,0.10)", color: "#337485" }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 ai-envelope" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 8 L12 14 L21 8" />
              </svg>
            </span>
            <p className="text-sm font-bold max-w-xs" style={{ color: "rgba(45,16,15,0.65)" }}>
              {emptyHint ?? "No messages yet — say hi"}
            </p>
          </div>
        ) : (
          (() => {
            // Group consecutive messages from the same sender to feel like Messenger.
            const out: React.ReactElement[] = [];
            let prevSender: string | null = null;
            let prevTime = 0;

            messages.forEach((m, i) => {
              const mine = m.senderId === meId;
              const t = new Date(m.createdAt).getTime();
              const showTimeBreak = i === 0 || t - prevTime > 5 * 60 * 1000; // 5 min
              const stacked = !showTimeBreak && prevSender === m.senderId;
              prevSender = m.senderId;
              prevTime = t;

              if (showTimeBreak) {
                out.push(
                  <p
                    key={`t-${m.id}`}
                    className="text-center text-[10px] font-semibold py-2 select-none"
                    style={{ color: "rgba(45,16,15,0.4)" }}
                  >
                    {fmtTime(m.createdAt)}
                  </p>,
                );
              }

              out.push(
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${stacked ? "mt-0.5" : "mt-1.5"}`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug whitespace-pre-wrap break-words ${
                      mine ? "" : "shadow-sm"
                    }`}
                    style={
                      mine
                        ? {
                            background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                            color: "#F7E6C2",
                            borderTopRightRadius: stacked ? 12 : 18,
                            borderBottomRightRadius: 6,
                            boxShadow: "0 4px 14px rgba(45,16,15,0.20)",
                          }
                        : {
                            background: "white",
                            color: "#2D100F",
                            border: "1px solid rgba(45,16,15,0.08)",
                            borderTopLeftRadius: stacked ? 12 : 18,
                            borderBottomLeftRadius: 6,
                          }
                    }
                  >
                    {m.body && <span>{m.body}</span>}
                    {m.attachments.length > 0 && (
                      <div className={`${m.body ? "mt-2" : ""} flex flex-col gap-1.5`}>
                        {m.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold underline underline-offset-2"
                            style={{ color: mine ? "rgba(247,230,194,0.92)" : "#337485" }}
                          >
                            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 5 L6.5 10 C5.5 11 5.5 12.5 6.5 13.5 C7.5 14.5 9 14.5 10 13.5 L13 10.5 C14.5 9 14.5 6.5 13 5 C11.5 3.5 9 3.5 7.5 5 L4.5 8 C2.5 10 2.5 13 4.5 15" />
                            </svg>
                            {a.filename}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>,
              );
            });
            return out;
          })()
        )}
      </div>

      {/* Composer */}
      <div
        className="px-3 py-3"
        style={{ background: "white", borderTop: "1px solid rgba(45,16,15,0.1)" }}
      >
        {error && (
          <p
            className="text-[11px] font-bold mb-2 px-1"
            style={{ color: "var(--color-danger)" }}
          >
            {error}
          </p>
        )}
        <div
          className="flex items-end gap-2 rounded-3xl px-3 py-2"
          style={{ background: "#F8F2EA", border: "1px solid rgba(45,16,15,0.12)" }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Message…"
            className="flex-1 bg-transparent border-0 resize-none focus:outline-none text-sm leading-snug py-1"
            style={{ color: "#2D100F", maxHeight: 120 }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
              color: "#F7E6C2",
              boxShadow: "0 4px 14px rgba(45,16,15,0.30)",
            }}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 12 18-9-7 18-3-7-8-2z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] mt-1.5 px-3" style={{ color: "rgba(45,16,15,0.4)" }}>
          Enter to send · Shift+Enter for newline · auto-refreshes every 3 seconds
        </p>
      </div>
    </div>
  );
}
