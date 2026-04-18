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

const TYPE_COLORS: Record<string, { bg: string; dot: string }> = {
  mail_arrived:    { bg: "#EBF2FA", dot: "#3374B5" },
  package_arrived: { bg: "#EBF2FA", dot: "#2060A0" },
  plan_expiring:   { bg: "#FEF9C3", dot: "#CA8A04" },
  kyc_approved:    { bg: "#DCFCE7", dot: "#16A34A" },
  kyc_rejected:    { bg: "#FEE2E2", dot: "#DC2626" },
  delivery_update: { bg: "#F0FDF4", dot: "#16A34A" },
  key_ready:       { bg: "#F5F3FF", dot: "#7C3AED" },
  general:         { bg: "#F8F2EA", dot: "#B07030" },
};

export default function NotificationBell({ notifications }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = localNotifs.filter((n) => !n.read).length;

  // Close on outside click
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
      setLocalNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      await markNotificationRead(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  }

  async function handleMarkAll() {
    if (markingAll) return;
    setMarkingAll(true);
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
    setMarkingAll(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black text-white px-1"
            style={{ background: "#DC2626" }}
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
            background: "#fff",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 20px 50px -8px rgba(0,0,0,0.15)",
            border: "1px solid #E8E5E0",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E5E0]">
            <h3 className="font-black text-sm text-[#1A1714]">
              Notifications {unread > 0 && <span className="text-[#3374B5]">({unread})</span>}
            </h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-[11px] font-bold text-[#3374B5] hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[420px] overflow-y-auto">
            {localNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm font-semibold text-[#A89F94]">No notifications yet</p>
                <p className="text-[11px] text-[#A89F94] mt-0.5">We&apos;ll let you know when mail arrives</p>
              </div>
            ) : (
              localNotifs.map((notif) => {
                const colors = TYPE_COLORS[notif.type] ?? TYPE_COLORS.general;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover:bg-[#FAFAF8] border-b border-[#E8E5E0]/60 last:border-0"
                    style={{ background: notif.read ? "transparent" : `${colors.bg}40` }}
                  >
                    {/* Dot */}
                    <div className="mt-1 shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: notif.read ? "transparent" : colors.dot }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-tight ${notif.read ? "font-semibold text-[#6B6560]" : "font-black text-[#1A1714]"}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-[#A89F94] mt-0.5 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-[#A89F94] mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {localNotifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#E8E5E0] bg-[#FAFAF8]">
              <p className="text-[10px] text-center text-[#A89F94]">
                Showing {Math.min(localNotifs.length, 50)} of {localNotifs.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
