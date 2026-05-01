"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link?: string | null;
  createdAt: Date | string;
};

type Props = {
  notifications: Notification[];
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// Brand-aligned: cream/blue/brown surfaces with semantic dots from CSS vars.
// Each variant is `{ bg: tinted-card-bg, dot: signal-dot-color }`.
const TYPE_COLORS: Record<string, { bg: string; dot: string }> = {
  mail_arrived:    { bg: "rgba(51,116,133,0.08)",  dot: "#337485" },
  package_arrived: { bg: "rgba(51,116,133,0.08)",  dot: "#337485" },
  plan_expiring:   { bg: "var(--color-warning-soft)", dot: "var(--color-warning)" },
  kyc_approved:    { bg: "var(--color-success-soft)", dot: "var(--color-success)" },
  kyc_rejected:    { bg: "var(--color-danger-soft)",  dot: "var(--color-danger)" },
  delivery_update: { bg: "var(--color-success-soft)", dot: "var(--color-success)" },
  key_ready:       { bg: "rgba(45,16,15,0.06)",     dot: "#2D100F" },
  general:         { bg: "rgba(247,230,194,0.50)",  dot: "#B07030" },
};

const CREAM = "#F7E6C2";
const BG_CREAM = "#F8F2EA";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

export default function NotificationBell({ notifications }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-sync local state when the parent passes fresh notifications (after
  // router.refresh()). Without this, server-side reality can drift from
  // local optimistic updates indefinitely.
  useEffect(() => {
    setLocalNotifs(notifications);
  }, [notifications]);

  const unread = localNotifs.filter((n) => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      // Optimistic local mark — revert if server rejects
      setLocalNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      try {
        const res = await markNotificationRead(notif.id);
        if (res && "error" in res && (res as { error: string }).error) {
          setLocalNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: false } : n));
          setErrMsg("Couldn't mark read — try again");
          setTimeout(() => setErrMsg(null), 3000);
        }
      } catch {
        setLocalNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: false } : n));
        setErrMsg("Network error — try again");
        setTimeout(() => setErrMsg(null), 3000);
      }
    }
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  }

  async function handleMarkAll() {
    if (markingAll) return;
    setMarkingAll(true);
    const snapshot = localNotifs;
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const res = await markAllNotificationsRead();
      if (res && "error" in res && (res as { error: string }).error) {
        setLocalNotifs(snapshot);
        setErrMsg("Couldn't mark all read");
        setTimeout(() => setErrMsg(null), 3000);
      }
      router.refresh();
    } catch {
      setLocalNotifs(snapshot);
      setErrMsg("Network error — try again");
      setTimeout(() => setErrMsg(null), 3000);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#2D100F]/8"
        style={{ color: INK }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black text-white px-1"
            style={{ background: "var(--color-danger)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: "white",
            boxShadow: "var(--shadow-cream-lg)",
            border: `1px solid ${BORDER}`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${BORDER}`, background: CREAM }}
          >
            <h3 className="font-black text-sm" style={{ color: INK }}>
              Notifications{" "}
              {unread > 0 && <span style={{ color: BLUE }}>({unread})</span>}
            </h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-[11px] font-bold hover:underline disabled:opacity-50"
                style={{ color: BLUE }}
              >
                Mark all read
              </button>
            )}
          </div>

          {errMsg && (
            <div className="px-4 py-2 text-[11px] font-bold" style={{ background: "rgba(231,0,19,0.06)", color: "#b91c1c", borderBottom: `1px solid ${BORDER}` }}>
              {errMsg}
            </div>
          )}

          {/* Notifications list */}
          <div className="max-h-[420px] overflow-y-auto">
            {localNotifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span
                  className="ai-icon inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                  style={{ background: BG_CREAM, color: BLUE }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <p className="text-sm font-bold" style={{ color: INK_SOFT }}>
                  No notifications yet
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: INK_FAINT }}>
                  We&apos;ll let you know when mail arrives
                </p>
              </div>
            ) : (
              localNotifs.map((notif) => {
                const colors = TYPE_COLORS[notif.type] ?? TYPE_COLORS.general;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover:bg-[#F8F2EA] last:border-0"
                    style={{
                      background: notif.read ? "transparent" : colors.bg,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    <div className="mt-1 shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: notif.read ? "transparent" : colors.dot }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] leading-tight ${notif.read ? "font-semibold" : "font-black"}`}
                        style={{ color: notif.read ? INK_SOFT : INK }}
                      >
                        {notif.title}
                      </p>
                      <p
                        className="text-[12px] mt-0.5 leading-snug line-clamp-2"
                        style={{ color: INK_SOFT }}
                      >
                        {notif.body}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: INK_FAINT }}>
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {localNotifs.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderTop: `1px solid ${BORDER}`, background: BG_CREAM }}
            >
              <p className="text-[11px] text-center" style={{ color: INK_FAINT }}>
                Showing {Math.min(localNotifs.length, 50)} of {localNotifs.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
