"use client";

import { useEffect, useState, useMemo } from "react";
import {
  listChats,
  getOrCreateDirectChatAsAdmin,
} from "@/app/actions/chat";
import { ChatStream } from "@/components/chat/ChatStream";
import type { Customer } from "./types";

type Chat = Awaited<ReturnType<typeof listChats>>[number];

type Props = {
  meId: string;
  customers: Customer[];
};

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#FF3B30";
const NOHO_CREAM = "#EBF2FF";
const NOHO_GREEN = "#22C55E";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function huesFor(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const PAIRS: Array<[string, string]> = [
    [NOHO_BLUE, NOHO_BLUE_DEEP],
    [NOHO_INK, "#1F0807"],
    ["#7C3AED", "#5B21B6"],
    ["#F59E0B", "#8B5A24"],
    [NOHO_GREEN, "#166534"],
    [NOHO_RED, "#991b1b"],
  ];
  const [from, to] = PAIRS[h % PAIRS.length];
  return { from, to };
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AdminChatPanel({ meId, customers }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMeta, setActiveMeta] = useState<{
    name: string;
    subtitle: string | null;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "recent">("all");

  // Initial load + slow poll for unread updates while panel is mounted
  useEffect(() => {
    let alive = true;
    async function load() {
      const data = await listChats();
      if (!alive) return;
      setChats(data);
      setLoading(false);
    }
    load();
    const t = setInterval(load, 7000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function startChatWith(c: Customer) {
    const res = await getOrCreateDirectChatAsAdmin(c.id);
    if ("error" in res && res.error) return;
    if (res.threadId) {
      setActiveThreadId(res.threadId);
      setActiveMeta({
        name: c.name,
        subtitle: [c.suiteNumber ? `Suite #${c.suiteNumber}` : null, c.email]
          .filter(Boolean)
          .join(" · ") || null,
      });
      const data = await listChats();
      setChats(data);
    }
  }

  function openExistingChat(chat: Chat) {
    setActiveThreadId(chat.threadId);
    setActiveMeta({
      name: chat.otherName,
      subtitle: [
        chat.otherSuiteNumber ? `Suite #${chat.otherSuiteNumber}` : null,
        chat.otherEmail,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    });
  }

  // Build the unified list: existing chats first, then customers without one.
  const existingByCustomer = useMemo(
    () => new Map(chats.filter((c) => c.otherUserId).map((c) => [c.otherUserId!, c])),
    [chats],
  );

  const customersWithoutChat = useMemo(
    () =>
      customers
        .filter((c) => !existingByCustomer.has(c.id))
        .filter((c) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            c.name.toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.suiteNumber ?? "").toLowerCase().includes(q)
          );
        }),
    [customers, existingByCustomer, search],
  );

  const filteredChats = useMemo(() => {
    let list = chats;
    if (filter === "unread") list = list.filter((c) => c.unread && c.lastSenderId !== meId);
    if (filter === "recent") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      list = list.filter((c) => new Date(c.lastMessageAt).getTime() > cutoff);
    }
    return list.filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.otherName.toLowerCase().includes(q) ||
        (c.otherSuiteNumber ?? "").toLowerCase().includes(q) ||
        (c.otherEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [chats, filter, meId, search]);

  const unreadCount = chats.filter((c) => c.unread && c.lastSenderId !== meId).length;
  const recentCount = chats.filter(
    (c) => Date.now() - new Date(c.lastMessageAt).getTime() < 24 * 60 * 60 * 1000,
  ).length;

  return (
    <div className="space-y-3">
      {/* iPad-OS title row — Baloo + Pacifico script accent. */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: NOHO_INK,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Customer Chat
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
          live threads
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {chats.length} threads · {unreadCount} unread · {recentCount} active in last 24h
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5 items-center">
          {(
            [
              ["all", "All", chats.length],
              ["unread", "Unread", unreadCount],
              ["recent", "24h", recentCount],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="text-[10px] font-semibold uppercase tracking-[0.10em] px-2.5 py-1.5 rounded-md transition-all inline-flex items-center gap-1.5"
              style={{
                background: filter === key ? NOHO_INK : "transparent",
                color: filter === key ? "#FFFFFF" : NOHO_INK,
                border: `1px solid ${filter === key ? NOHO_INK : "#ECEEF1"}`,
              }}
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded text-[9px]"
                style={{
                  background: filter === key ? "rgba(255,255,255,0.20)" : "#F4F5F7",
                  color: filter === key ? "#FFFFFF" : NOHO_INK,
                }}
              >
                {n}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Two-pane chat */}
      <div
        className="rounded-2xl overflow-hidden flex bg-white"
        style={{
          border: `1px solid ${NOHO_INK}11`,
          boxShadow:
            "0 1px 3px rgba(45,16,15,0.04), 0 8px 22px rgba(45,16,15,0.06)",
          height: "calc(100vh - 240px)",
          minHeight: 540,
        }}
      >
        {/* Left pane: chat list */}
        <aside
          className="w-72 shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${NOHO_INK}0d` }}
        >
          {/* Search */}
          <div
            className="px-3 py-3"
            style={{ borderBottom: `1px solid ${NOHO_INK}0d` }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all focus-within:ring-2 focus-within:ring-[#1976FF]/30"
              style={{
                background: `${NOHO_CREAM}33`,
                border: `1px solid ${NOHO_INK}11`,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                style={{ color: `${NOHO_INK}77` }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="m17 17 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers"
                className="flex-1 bg-transparent text-[12px] font-bold focus:outline-none"
                style={{ color: NOHO_INK }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[10px] font-black"
                  style={{ color: `${NOHO_INK}77` }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 flex items-center gap-2 text-[11px] font-bold" style={{ color: `${NOHO_INK}66` }}>
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: NOHO_BLUE }}
                />
                Loading…
              </div>
            ) : (
              <>
                {/* Existing conversations */}
                {filteredChats.length > 0 && (
                  <div>
                    <p
                      className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ color: `${NOHO_INK}66` }}
                    >
                      Conversations
                    </p>
                    <ul>
                      {filteredChats.map((c) => {
                        const active = c.threadId === activeThreadId;
                        const fromMe = c.lastSenderId === meId;
                        const unread = c.unread && !fromMe;
                        const { from, to } = huesFor(c.otherName);
                        return (
                          <li key={c.threadId}>
                            <button
                              onClick={() => openExistingChat(c)}
                              className="w-full flex items-start gap-2.5 px-3 py-2.5 transition-all text-left relative"
                              style={{
                                background: active ? `${NOHO_BLUE}10` : "transparent",
                                borderLeft: active
                                  ? `3px solid ${NOHO_BLUE}`
                                  : "3px solid transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (!active)
                                  e.currentTarget.style.background = `${NOHO_INK}05`;
                              }}
                              onMouseLeave={(e) => {
                                if (!active)
                                  e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <div className="relative shrink-0">
                                <div
                                  className="w-9 h-9 rounded-md flex items-center justify-center text-[11px] font-bold"
                                  style={{
                                    background: "#F4F5F7",
                                    color: NOHO_INK,
                                    border: "1px solid #ECEEF1",
                                  }}
                                >
                                  {initials(c.otherName)}
                                </div>
                                {unread && (
                                  <span
                                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                    style={{ background: NOHO_RED }}
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className="text-[12px] font-black truncate"
                                    style={{ color: NOHO_INK }}
                                  >
                                    {c.otherName}
                                  </p>
                                  <span
                                    className="text-[9px] shrink-0 font-bold"
                                    style={{ color: `${NOHO_INK}66` }}
                                  >
                                    {timeAgo(c.lastMessageAt)}
                                  </span>
                                </div>
                                {c.otherSuiteNumber && (
                                  <p
                                    className="text-[9px] font-bold"
                                    style={{ color: NOHO_BLUE_DEEP }}
                                  >
                                    Suite #{c.otherSuiteNumber}
                                  </p>
                                )}
                                <p
                                  className={`text-[11px] truncate leading-tight mt-0.5 ${unread ? "font-bold" : ""}`}
                                  style={{
                                    color: unread ? NOHO_INK : `${NOHO_INK}77`,
                                  }}
                                >
                                  {fromMe && c.lastMessagePreview ? (
                                    <span style={{ color: `${NOHO_INK}55` }}>You: </span>
                                  ) : (
                                    ""
                                  )}
                                  {c.lastMessagePreview || (
                                    <span className="italic" style={{ color: `${NOHO_INK}55` }}>
                                      No messages yet
                                    </span>
                                  )}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Start a new chat bucket */}
                {customersWithoutChat.length > 0 && (
                  <div className="border-t mt-1" style={{ borderColor: `${NOHO_INK}0d` }}>
                    <p
                      className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ color: `${NOHO_INK}66` }}
                    >
                      Start a new chat ({customersWithoutChat.length})
                    </p>
                    <ul className="pb-3">
                      {customersWithoutChat.slice(0, 50).map((c) => {
                        const { from, to } = huesFor(c.name);
                        return (
                          <li key={c.id}>
                            <button
                              onClick={() => startChatWith(c)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${NOHO_INK}05`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                                style={{
                                  background: "#F4F5F7",
                                  color: NOHO_INK,
                                  border: "1px solid #ECEEF1",
                                }}
                              >
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-[11px] font-bold truncate"
                                  style={{ color: NOHO_INK }}
                                >
                                  {c.name}
                                </p>
                                <p
                                  className="text-[9px] truncate"
                                  style={{ color: `${NOHO_INK}66` }}
                                >
                                  {c.suiteNumber ? `#${c.suiteNumber} · ` : ""}
                                  {c.email}
                                </p>
                              </div>
                              <span
                                className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
                                style={{
                                  background: `${NOHO_BLUE}11`,
                                  color: NOHO_BLUE,
                                }}
                              >
                                + chat
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {customersWithoutChat.length > 50 && (
                        <p
                          className="px-3 pt-2 text-[9px] italic"
                          style={{ color: `${NOHO_INK}55` }}
                        >
                          Showing 50 of {customersWithoutChat.length} · refine search
                        </p>
                      )}
                    </ul>
                  </div>
                )}

                {filteredChats.length === 0 && customersWithoutChat.length === 0 && (
                  <div
                    className="px-4 py-8 text-center text-[11px] font-bold"
                    style={{ color: `${NOHO_INK}66` }}
                  >
                    No matches.
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Right pane: chat stream */}
        <main className="flex-1 min-w-0 flex flex-col">
          {activeThreadId && activeMeta ? (
            <ChatStream
              threadId={activeThreadId}
              meId={meId}
              otherName={activeMeta.name}
              otherSubtitle={activeMeta.subtitle}
              emptyHint="No messages yet — type below to start the conversation."
            />
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${NOHO_CREAM}33 0%, white 100%)`,
              }}
            >
              <div
                className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${NOHO_BLUE} 0%, transparent 70%)`,
                }}
              />
              <div
                className="w-16 h-16 rounded-md flex items-center justify-center mb-4 relative"
                style={{
                  background: NOHO_INK,
                  border: `1px solid ${NOHO_INK}`,
                }}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="white" strokeWidth="1.6">
                  <path strokeLinejoin="round" d="M4 5h16v12H8l-4 4z" />
                  <path strokeLinecap="round" d="M8 9h8 M8 12h5" />
                </svg>
              </div>
              <p
                className="font-black text-lg"
                style={{
                  color: NOHO_INK,
                  fontFamily: "var(--font-baloo, system-ui)",
                }}
              >
                Pick a conversation
              </p>
              <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: `${NOHO_INK}88` }}>
                Click a customer on the left to open their chat. Replies show up live for them
                in their dashboard.
              </p>

              {chats.length > 0 && unreadCount > 0 && (
                <div
                  className="mt-4 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] font-bold"
                  style={{
                    background: `${NOHO_RED}10`,
                    color: NOHO_RED,
                    border: `1px solid ${NOHO_RED}33`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: NOHO_RED }}
                  />
                  {unreadCount} unread {unreadCount === 1 ? "thread" : "threads"}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
