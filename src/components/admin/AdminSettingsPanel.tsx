"use client";

import { useState } from "react";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

type StoreField = {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
};

type NotifField = {
  label: string;
  on: boolean;
  sub: string;
  icon: React.ReactNode;
};

export function AdminSettingsPanel() {
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editSettingValue, setEditSettingValue] = useState("");
  const [storeInfo, setStoreInfo] = useState<StoreField[]>([
    {
      label: "Store Name",
      value: "NOHO Mailbox",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      ),
    },
    {
      label: "Address",
      value: "5062 Lankershim Blvd, North Hollywood, CA",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      label: "Phone",
      value: "(818) 506-7744",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    {
      label: "Email",
      value: "hello@nohomailbox.org",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      label: "Hours",
      value: "Mon-Fri 9:30am-5:30pm (break 1:30-2pm), Sat 10am-1:30pm",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ]);
  const [notifications, setNotifications] = useState<NotifField[]>([
    {
      label: "Email alerts for new mail",
      on: true,
      sub: "Customer notification on each scan",
      icon: <span className="text-base leading-none">📬</span>,
    },
    {
      label: "SMS alerts for packages",
      on: true,
      sub: "Texts when a package arrives",
      icon: <span className="text-base leading-none">📱</span>,
    },
    {
      label: "Daily summary email",
      on: false,
      sub: "5pm digest of mail + packages",
      icon: <span className="text-base leading-none">📊</span>,
    },
    {
      label: "Notary appointment reminders",
      on: true,
      sub: "24h-prior reminder + day-of",
      icon: <span className="text-base leading-none">⚖️</span>,
    },
  ]);

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${NOHO_INK} 0%, ${NOHO_BLUE_DEEP} 100%)`,
          boxShadow: "0 8px 28px rgba(45,16,15,0.30)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1.2px, transparent 1.2px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: NOHO_AMBER }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              Store Configuration
            </span>
          </div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontFamily: "var(--font-baloo, system-ui)",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }}
          >
            Settings
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            Storefront information shown to customers and notification preferences for the
            mailroom team.
          </p>
        </div>
      </div>

      {/* Store info card */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{
          border: `1px solid ${NOHO_INK}11`,
          boxShadow: "0 1px 3px rgba(45,16,15,0.04), 0 8px 22px rgba(45,16,15,0.06)",
        }}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${NOHO_INK}0d` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${NOHO_BLUE}15`, color: NOHO_BLUE }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <h3
              className="font-black text-[12px] uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Store Information
            </h3>
          </div>
          <span
            className="text-[10px] font-bold inline-flex items-center gap-1"
            style={{ color: `${NOHO_INK}66` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOHO_GREEN }} />
            Customer-facing
          </span>
        </div>

        <div className="p-2">
          {storeInfo.map((f, i) => {
            const isEditing = editingSetting === f.label;
            return (
              <div
                key={f.label}
                className="rounded-xl p-3 transition-all"
                style={{
                  background: isEditing ? `${NOHO_BLUE}08` : "transparent",
                  border: isEditing ? `1px solid ${NOHO_BLUE}33` : "1px solid transparent",
                  marginBottom: i === storeInfo.length - 1 ? 0 : 4,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      background: isEditing
                        ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
                        : `${NOHO_INK}08`,
                      color: isEditing ? "white" : NOHO_INK,
                      boxShadow: isEditing ? `0 4px 12px ${NOHO_BLUE}55` : "none",
                    }}
                  >
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.15em]"
                      style={{ color: `${NOHO_INK}66` }}
                    >
                      {f.label}
                    </p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editSettingValue}
                        onChange={(e) => setEditSettingValue(e.target.value)}
                        className="text-sm font-black mt-1 w-full rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 transition-all"
                        style={{
                          border: `1px solid ${NOHO_BLUE}55`,
                          background: "white",
                          color: NOHO_INK,
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setStoreInfo((prev) =>
                              prev.map((s) => (s.label === f.label ? { ...s, value: editSettingValue } : s)),
                            );
                            setEditingSetting(null);
                          } else if (e.key === "Escape") {
                            setEditingSetting(null);
                          }
                        }}
                      />
                    ) : (
                      <p className="text-sm font-black mt-0.5 break-words" style={{ color: NOHO_INK }}>
                        {f.value}
                      </p>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setStoreInfo((prev) =>
                            prev.map((s) => (s.label === f.label ? { ...s, value: editSettingValue } : s)),
                          );
                          setEditingSetting(null);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg text-white transition-all hover:shadow-md"
                        style={{
                          background: `linear-gradient(180deg, ${NOHO_GREEN} 0%, #15803d 100%)`,
                          boxShadow: `0 2px 6px ${NOHO_GREEN}40`,
                        }}
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={() => setEditingSetting(null)}
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: `${NOHO_INK}08`,
                          color: NOHO_INK,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingSetting(f.label);
                        setEditSettingValue(f.value);
                      }}
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all shrink-0"
                      style={{
                        background: `${NOHO_BLUE}11`,
                        color: NOHO_BLUE,
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications card */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{
          border: `1px solid ${NOHO_INK}11`,
          boxShadow: "0 1px 3px rgba(45,16,15,0.04), 0 8px 22px rgba(45,16,15,0.06)",
        }}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${NOHO_INK}0d` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${NOHO_AMBER}15`, color: NOHO_AMBER }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h3
              className="font-black text-[12px] uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Notifications
            </h3>
          </div>
          <span
            className="text-[10px] font-bold"
            style={{ color: `${NOHO_INK}66` }}
          >
            {notifications.filter((n) => n.on).length} of {notifications.length} active
          </span>
        </div>

        <div className="p-2">
          {notifications.map((n, idx) => (
            <div
              key={n.label}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{
                marginBottom: idx === notifications.length - 1 ? 0 : 4,
                background: n.on ? `${NOHO_GREEN}06` : "transparent",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                style={{
                  background: n.on ? `${NOHO_GREEN}15` : `${NOHO_INK}08`,
                }}
              >
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-black"
                  style={{ color: n.on ? NOHO_INK : `${NOHO_INK}aa` }}
                >
                  {n.label}
                </p>
                <p className="text-[10px]" style={{ color: `${NOHO_INK}66` }}>
                  {n.sub}
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, on: !item.on } : item)),
                  )
                }
                className="w-11 h-6 rounded-full relative transition-all shrink-0"
                style={{
                  background: n.on
                    ? `linear-gradient(180deg, ${NOHO_GREEN} 0%, #15803d 100%)`
                    : `${NOHO_INK}1a`,
                  boxShadow: n.on ? `0 2px 6px ${NOHO_GREEN}40` : "inset 0 1px 2px rgba(45,16,15,0.10)",
                }}
                aria-pressed={n.on}
                aria-label={`Toggle ${n.label}`}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{
                    left: n.on ? "22px" : "2px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
