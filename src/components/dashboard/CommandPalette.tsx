"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { BRAND, type DashboardUser, type MailItem, type Thread } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────

type Group = "Navigate" | "Quick action" | "Mail" | "Messages" | "Account";

type Command = {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  /** Keywords boost match score (synonyms / aliases). */
  keywords?: string[];
  /** Optional inline glyph. */
  icon?: React.ReactNode;
  /** Right-side shortcut chip (purely cosmetic). */
  shortcut?: string;
  perform: () => void;
};

type Props = {
  user: DashboardUser;
  mailItems: MailItem[];
  threads: Thread[];
  setActiveTab: (tab: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────

export default function CommandPalette({ user, mailItems, threads, setActiveTab }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ─── Build the command index ────────────────────────────────────────
  // Re-derived on every prop change. Each command is one keystroke away
  // for the user — design carefully.
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // — Tabs
    const tabs: { id: string; label: string; keywords?: string[] }[] = [
      { id: "overview", label: "Overview", keywords: ["home", "dashboard", "summary"] },
      { id: "mail", label: "Mail", keywords: ["letters", "scans", "inbox"] },
      { id: "services", label: "Services", keywords: ["scan", "forward", "delivery", "shred"] },
      { id: "packages", label: "Packages", keywords: ["box", "shipment"] },
      { id: "wallet", label: "Wallet", keywords: ["credits", "balance", "card"] },
      { id: "messages", label: "Messages", keywords: ["chat", "support", "noho"] },
      { id: "emails", label: "Email history", keywords: ["receipts", "logs"] },
      { id: "deliveries", label: "Deliveries", keywords: ["courier", "same-day"] },
      { id: "shipping", label: "Shipping", keywords: ["labels", "shippo"] },
      { id: "invoices", label: "Invoices", keywords: ["bills", "receipts"] },
      { id: "forwarding", label: "Forwarding addresses", keywords: ["address", "ship to"] },
      { id: "notary", label: "Notary", keywords: ["sign", "1583", "appointment"] },
      { id: "settings", label: "Settings", keywords: ["account", "profile", "preferences"] },
      { id: "vault", label: "Document vault", keywords: ["upload", "documents", "files"] },
      { id: "qrpickup", label: "QR pickup", keywords: ["pickup code", "guest"] },
      { id: "annual", label: "Year in review", keywords: ["stats", "summary", "annual"] },
    ];
    for (const t of tabs) {
      cmds.push({
        id: "tab:" + t.id,
        group: "Navigate",
        label: t.label,
        hint: "Open tab",
        keywords: t.keywords,
        icon: <NavIcon />,
        perform: () => setActiveTab(t.id),
      });
    }

    // — Quick actions
    const qa: Command[] = [
      {
        id: "qa:topup",
        group: "Quick action",
        label: "Top up wallet",
        hint: `Balance: $${(user.walletBalanceCents / 100).toFixed(2)}`,
        keywords: ["add credits", "deposit", "money", "fund"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("wallet"),
      },
      {
        id: "qa:forward",
        group: "Quick action",
        label: "Forward mail",
        hint: "Open Forwarding tab",
        keywords: ["send", "redirect"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("forwarding"),
      },
      {
        id: "qa:schedule_delivery",
        group: "Quick action",
        label: "Schedule a delivery",
        hint: "Same-day courier",
        keywords: ["courier", "drop off", "pickup"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("deliveries"),
      },
      {
        id: "qa:vacation",
        group: "Quick action",
        label: "Vacation hold",
        hint: "Hold mail while you're away",
        keywords: ["away", "pause", "hold"],
        icon: <DotIcon color="var(--color-warning)" />,
        perform: () => setActiveTab("settings"),
      },
      {
        id: "qa:notary",
        group: "Quick action",
        label: "Book a notary",
        hint: "Online or in-store",
        keywords: ["sign", "1583"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("notary"),
      },
      {
        id: "qa:upload_vault",
        group: "Quick action",
        label: "Upload to vault",
        keywords: ["save", "file", "document"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("vault"),
      },
      {
        id: "qa:qr_pickup",
        group: "Quick action",
        label: "Generate QR pickup code",
        keywords: ["guest pickup", "share code"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("qrpickup"),
      },
      {
        id: "qa:contact",
        group: "Quick action",
        label: "Message NOHO support",
        keywords: ["chat", "help", "ticket"],
        icon: <DotIcon color={BRAND.blue} />,
        perform: () => setActiveTab("messages"),
      },
    ];
    cmds.push(...qa);

    // — Mail (most recent 30 — let users jump straight to senders by name)
    for (const m of mailItems.slice(0, 30)) {
      const status = m.status;
      const summary =
        m.label ?? `${m.type} · ${m.date}${m.recipientName ? " · " + m.recipientName : ""}`;
      cmds.push({
        id: "mail:" + m.id,
        group: "Mail",
        label: m.from || "Unknown sender",
        hint: `${summary} · ${status}`,
        keywords: [m.type, m.status, m.label ?? "", m.recipientName ?? "", m.trackingNumber ?? ""],
        icon: <DotIcon color={m.priority ? "var(--color-warning)" : BRAND.blueDeep} />,
        perform: () => setActiveTab("mail"),
      });
    }

    // — Threads (chats)
    for (const t of threads.slice(0, 12)) {
      cmds.push({
        id: "thread:" + t.id,
        group: "Messages",
        label: t.subject || "Direct message",
        hint: t.preview ? t.preview.slice(0, 60) : "Open conversation",
        keywords: ["chat", "message"],
        icon: <DotIcon color={t.unread ? BRAND.blue : BRAND.inkFaint} />,
        perform: () => setActiveTab("messages"),
      });
    }

    // — Account / global
    cmds.push(
      {
        id: "acct:profile",
        group: "Account",
        label: "Edit profile",
        hint: "Name, phone, password",
        keywords: ["account", "settings", "name"],
        icon: <DotIcon color={BRAND.inkSoft} />,
        perform: () => setActiveTab("settings"),
      },
      {
        id: "acct:2fa",
        group: "Account",
        label: user.totpEnabled ? "Manage 2FA" : "Enable 2FA",
        hint: "Authenticator app · 6-digit code",
        keywords: ["security", "authenticator", "two factor"],
        icon: <DotIcon color={BRAND.inkSoft} />,
        perform: () => setActiveTab("settings"),
      },
      {
        id: "acct:home",
        group: "Account",
        label: "Public site",
        hint: "Marketing pages",
        keywords: ["marketing", "landing"],
        icon: <DotIcon color={BRAND.inkSoft} />,
        perform: () => router.push("/"),
      },
      {
        id: "acct:signout",
        group: "Account",
        label: "Sign out",
        keywords: ["log out", "logout", "exit"],
        icon: <DotIcon color="var(--color-danger)" />,
        perform: () => {
          logout();
        },
      },
    );

    return cmds;
  }, [mailItems, threads, user, setActiveTab, router]);

  // ─── Filter + score ─────────────────────────────────────────────────
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show top picks: tabs + quick actions, no mail items.
      return commands.filter((c) => c.group === "Navigate" || c.group === "Quick action");
    }
    const scored = commands
      .map((c) => ({ c, score: scoreCommand(c, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    return scored.map((x) => x.c);
  }, [commands, query]);

  // Keep activeIdx in range as matches change
  useEffect(() => {
    setActiveIdx((idx) => Math.min(idx, Math.max(0, matches.length - 1)));
  }, [matches.length]);

  // ─── Open / close handlers ──────────────────────────────────────────
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIdx(0);
  }, []);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // Quick K shortcut when not in a field — many command-bar-style apps.
      if (!inField && e.key === "k" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Only react if the user pressed K twice quickly? Skip for now to
        // avoid hijacking single keystrokes inside list views — strict ⌘K only.
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Listen for the same custom event the navbar / other places fire to open.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("noho:openCommandPalette", onOpen);
    return () => window.removeEventListener("noho:openCommandPalette", onOpen);
  }, []);

  // Focus input when opened, scroll active row into view as idx changes.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function executeAt(idx: number) {
    const c = matches[idx];
    if (!c) return;
    c.perform();
    close();
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeAt(activeIdx);
    } else if (e.key === "Tab") {
      e.preventDefault();
      setActiveIdx((i) => (e.shiftKey ? Math.max(i - 1, 0) : Math.min(i + 1, matches.length - 1)));
    }
  }

  // ─── Group results for display ──────────────────────────────────────
  const grouped = useMemo(() => {
    const order: Group[] = ["Navigate", "Quick action", "Mail", "Messages", "Account"];
    const out: { group: Group; items: { c: Command; idx: number }[] }[] = [];
    for (const g of order) {
      const items: { c: Command; idx: number }[] = [];
      matches.forEach((c, idx) => {
        if (c.group === g) items.push({ c, idx });
      });
      if (items.length) out.push({ group: g, items });
    }
    return out;
  }, [matches]);

  if (!open) {
    return (
      // Floating shortcut hint shown bottom-right on desktop. Tap to open.
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex fixed bottom-6 right-6 z-40 items-center gap-2 px-3 h-10 rounded-full font-black uppercase tracking-[0.06em] text-[11px] transition-transform hover:-translate-y-0.5"
        style={{
          background: BRAND.brown,
          color: BRAND.cream,
          boxShadow: "0 8px 24px rgba(45,16,15,0.32)",
        }}
        aria-label="Open command palette"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11 L14 14" />
        </svg>
        Quick search
        <kbd
          className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono"
          style={{ background: "rgba(247,230,194,0.18)", color: BRAND.cream }}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(45,16,15,0.55)", backdropFilter: "blur(8px)" }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl rounded-3xl overflow-hidden animate-scale-in"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 30px 80px rgba(45,16,15,0.40)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div
          className="flex items-center gap-3 px-5 h-14"
          style={{ borderBottom: `1px solid ${BRAND.border}`, background: BRAND.cream }}
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke={BRAND.brown} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Type to search tabs, actions, mail, settings…"
            className="flex-1 bg-transparent text-[15px] focus:outline-none"
            style={{ color: BRAND.ink }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setActiveIdx(0);
                inputRef.current?.focus();
              }}
              className="text-[11px] font-bold"
              style={{ color: BRAND.inkFaint }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.inkSoft,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
          {matches.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                No matches
              </p>
              <p className="text-[12px] mt-1" style={{ color: BRAND.inkSoft }}>
                Try a different keyword — sender names, tab names, or actions like
                &quot;forward&quot; or &quot;top up&quot;.
              </p>
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="py-1">
                <p
                  className="px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: BRAND.inkFaint }}
                >
                  {g.group}
                </p>
                {g.items.map(({ c, idx }) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={c.id}
                      data-cmd-idx={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => executeAt(idx)}
                      className="w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors"
                      style={{
                        background: active ? BRAND.bgDeep : "transparent",
                        color: BRAND.ink,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
                        style={{ background: active ? "white" : BRAND.bgDeep }}
                      >
                        {c.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate" style={{ color: BRAND.ink }}>
                          {highlight(c.label, query)}
                        </p>
                        {c.hint && (
                          <p className="text-[11px] truncate" style={{ color: BRAND.inkSoft }}>
                            {c.hint}
                          </p>
                        )}
                      </span>
                      {c.shortcut && (
                        <kbd
                          className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono shrink-0"
                          style={{
                            background: "white",
                            border: `1px solid ${BRAND.border}`,
                            color: BRAND.inkSoft,
                          }}
                        >
                          {c.shortcut}
                        </kbd>
                      )}
                      {active && (
                        <kbd
                          className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono shrink-0"
                          style={{
                            background: BRAND.brown,
                            color: BRAND.cream,
                          }}
                        >
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-2 flex items-center gap-4 text-[11px]"
          style={{
            background: BRAND.bgDeep,
            borderTop: `1px solid ${BRAND.border}`,
            color: BRAND.inkSoft,
          }}
        >
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd>
            select
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function NavIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke={BRAND.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8 L13 8" />
      <path d="M9 4 L13 8 L9 12" />
    </svg>
  );
}

function DotIcon({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: color }}
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        color: BRAND.inkSoft,
      }}
    >
      {children}
    </kbd>
  );
}

/**
 * Score a command against a (lowercase) query. Higher = better match.
 *
 *   - Exact prefix on label → 100
 *   - Substring on label → 60
 *   - Prefix on any keyword → 50
 *   - Substring on any keyword or hint → 30
 *   - 0 = no match
 *
 * Scaled so navigate/action commands beat mail rows for short queries
 * (avoiding the "type 'm' and the palette is just 30 mail items" trap).
 */
function scoreCommand(c: Command, q: string): number {
  const label = c.label.toLowerCase();
  if (label === q) return 200;
  if (label.startsWith(q)) return 100;
  let score = 0;
  if (label.includes(q)) score = Math.max(score, 60);
  for (const k of c.keywords ?? []) {
    if (!k) continue;
    const kk = k.toLowerCase();
    if (kk.startsWith(q)) score = Math.max(score, 50);
    else if (kk.includes(q)) score = Math.max(score, 30);
  }
  if (c.hint && c.hint.toLowerCase().includes(q)) score = Math.max(score, 25);
  // Small group bias: tabs/actions outrank mail/threads when scores are equal.
  if (score > 0) {
    if (c.group === "Navigate") score += 10;
    if (c.group === "Quick action") score += 8;
    if (c.group === "Account") score += 4;
  }
  return score;
}

/** Wrap matched substring in a brand-tinted <mark>. */
function highlight(text: string, q: string): React.ReactNode {
  const trimmed = q.trim();
  if (!trimmed) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(trimmed.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(245,166,35,0.30)",
          color: "inherit",
          padding: "0 1px",
          borderRadius: 2,
        }}
      >
        {text.slice(idx, idx + trimmed.length)}
      </mark>
      {text.slice(idx + trimmed.length)}
    </>
  );
}
