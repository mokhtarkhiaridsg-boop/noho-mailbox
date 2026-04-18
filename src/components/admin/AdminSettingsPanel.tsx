"use client";

import { useState } from "react";

export function AdminSettingsPanel() {
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editSettingValue, setEditSettingValue] = useState("");
  const [storeInfo, setStoreInfo] = useState([
    { label: "Store Name", value: "NOHO Mailbox" },
    { label: "Address", value: "North Hollywood, CA" },
    { label: "Phone", value: "(818) 765-1539" },
    { label: "Email", value: "hello@nohomailbox.org" },
    { label: "Hours", value: "Mon-Fri 9:30am-5:30pm (break 1:30-2pm), Sat 10am-1:30pm" },
  ]);
  const [notifications, setNotifications] = useState([
    { label: "Email alerts for new mail", on: true },
    { label: "SMS alerts for packages", on: true },
    { label: "Daily summary email", on: false },
    { label: "Notary appointment reminders", on: true },
  ]);

  return (
    <div className="space-y-6">
      <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Settings</h2>

      <div className="rounded-2xl p-6 bg-white space-y-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Store Information</h3>
        {storeInfo.map((f) => (
          <div key={f.label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(232,229,224,0.25)", border: "1px solid rgba(232,229,224,0.5)" }}>
            <div className="flex-1 mr-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/35">{f.label}</p>
              {editingSetting === f.label ? (
                <input
                  type="text"
                  value={editSettingValue}
                  onChange={(e) => setEditSettingValue(e.target.value)}
                  className="text-sm font-semibold text-text-light bg-white border border-[#3374B5] rounded-lg px-2 py-1 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setStoreInfo((prev) => prev.map((s) => s.label === f.label ? { ...s, value: editSettingValue } : s));
                      setEditingSetting(null);
                    } else if (e.key === "Escape") {
                      setEditingSetting(null);
                    }
                  }}
                />
              ) : (
                <p className="text-sm font-semibold text-text-light">{f.value}</p>
              )}
            </div>
            {editingSetting === f.label ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStoreInfo((prev) => prev.map((s) => s.label === f.label ? { ...s, value: editSettingValue } : s));
                    setEditingSetting(null);
                  }}
                  className="text-xs font-bold text-green-600 hover:underline"
                >
                  Save
                </button>
                <button onClick={() => setEditingSetting(null)} className="text-xs font-bold text-text-light/40 hover:underline">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingSetting(f.label); setEditSettingValue(f.value); }}
                className="text-xs font-bold text-accent hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 bg-white space-y-4" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Notifications</h3>
        {notifications.map((n, idx) => (
          <div key={n.label} className="flex items-center justify-between py-2">
            <span className="text-sm text-text-light/70">{n.label}</span>
            <div
              onClick={() => setNotifications((prev) => prev.map((item, i) => i === idx ? { ...item, on: !item.on } : item))}
              className="w-10 h-6 rounded-full relative cursor-pointer transition-colors"
              style={{ background: n.on ? "#3374B5" : "rgba(26,23,20,0.12)" }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                style={{ left: n.on ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
