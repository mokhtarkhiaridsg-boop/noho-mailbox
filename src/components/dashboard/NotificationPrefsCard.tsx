"use client";

// iter-84 — Notification preferences card.
//
// Member-facing toggle grid: each event type (mail arrived, package
// picked up, storage warning, plan expiring, KYC status) × each channel
// (email / SMS / in-app). SMS opt-in is gated server-side on having a
// phone number on file.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getMyNotifPrefs, updateMyNotifPrefs } from "@/app/actions/user";
import { DEFAULT_PREFS, getChannelPrefs, type NotifEvent, type NotifPrefs, type ChannelPrefs } from "@/lib/notifPrefs";

const EVENTS: Array<{ id: NotifEvent; label: string; help: string }> = [
  { id: "mailArrived",     label: "Mail / package arrives",     help: "Fires the moment admin scans a new package or letter for you." },
  { id: "packagePickedUp", label: "Package picked up at counter", help: "Confirms an in-person handoff. Helps catch any unauthorized pickups." },
  { id: "storageWarning",  label: "Storage fee warning",         help: "Sent when something has been sitting on the shelf > 3 days (storage starts day 4)." },
  { id: "planExpiring",    label: "Plan renewal due",            help: "Heads-up before your mailbox plan hits its renewal date." },
  { id: "kycStatus",       label: "ID / KYC status updates",     help: "When admin reviews your ID documents, you'll know." },
];

const CHANNELS: Array<{ id: keyof ChannelPrefs; label: string; sub: string }> = [
  { id: "email", label: "Email",  sub: "to your inbox" },
  { id: "sms",   label: "SMS",    sub: "to your phone" },
  { id: "inApp", label: "In-app", sub: "dashboard bell" },
];

export default function NotificationPrefsCard({ hasPhone }: { hasPhone: boolean }) {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null); // "{event}:{channel}"
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    void getMyNotifPrefs().then(setPrefs).catch(() => setPrefs({}));
  }, []);

  function toggle(event: NotifEvent, channel: keyof ChannelPrefs, current: boolean) {
    if (!prefs) return;
    const key = `${event}:${channel}`;
    setSavingFor(key);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateMyNotifPrefs(event, { [channel]: !current });
      if ((res as { error?: string }).error) {
        setErrorMsg((res as { error?: string }).error || "Failed");
        setSavingFor(null);
        return;
      }
      const next = (res as { prefs?: NotifPrefs }).prefs;
      if (next) setPrefs(next);
      setSavingFor(null);
    });
  }

  const ready = prefs !== null;

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Notification preferences
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Pick how we contact you for each kind of update. SMS only works after you add a phone number on your profile.
      </p>

      {!hasPhone && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{ background: "rgba(245,166,35,0.10)", color: "#92400e", border: "1px solid rgba(245,166,35,0.30)" }}
        >
          ℹ Add a phone number above to enable SMS toggles.
        </div>
      )}

      {errorMsg && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b", border: "1px solid rgba(231,0,19,0.30)" }}
        >
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr style={{ color: BRAND.inkSoft }}>
              <th className="pb-2 pr-3 font-black text-[10px] uppercase tracking-wider">Event</th>
              {CHANNELS.map((c) => (
                <th key={c.id} className="pb-2 px-2 text-center font-black text-[10px] uppercase tracking-wider">
                  {c.label}
                  <span className="block font-normal normal-case tracking-normal mt-0.5" style={{ color: BRAND.inkFaint }}>{c.sub}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((ev) => {
              const current = ready ? getChannelPrefs(prefs!, ev.id) : DEFAULT_PREFS[ev.id];
              return (
                <tr key={ev.id} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                  <td className="py-3 pr-3">
                    <p className="font-black" style={{ color: BRAND.ink }}>{ev.label}</p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>{ev.help}</p>
                  </td>
                  {CHANNELS.map((ch) => {
                    const isOn = current[ch.id];
                    const key = `${ev.id}:${ch.id}`;
                    const saving = savingFor === key;
                    const disabled = !ready || saving || (ch.id === "sms" && !hasPhone);
                    return (
                      <td key={ch.id} className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(ev.id, ch.id, isOn)}
                          disabled={disabled}
                          aria-pressed={isOn}
                          title={ch.id === "sms" && !hasPhone ? "Add a phone number to enable SMS" : undefined}
                          className="relative inline-flex w-11 h-6 rounded-full transition-colors disabled:opacity-40"
                          style={{
                            background: isOn ? BRAND.blue : "rgba(45,16,15,0.15)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                            style={{
                              left: isOn ? "calc(100% - 1.25rem - 2px)" : "0.125rem",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
