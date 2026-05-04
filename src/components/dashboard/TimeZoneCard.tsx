"use client";

// iter-123 — Member-side timezone preference card.
//
// Lets the customer pick from common IANA timezones (or type a custom
// one) so emails like "your package arrived" + "your plan renews on"
// render in their local time. Default = bureau's TZ.

import { useEffect, useMemo, useState, useTransition } from "react";
import { BRAND } from "./types";
import { setMyTimeZone, getMyTimeZoneStatus } from "@/app/actions/timezonePref";
import { COMMON_TIMEZONES } from "@/lib/userTimeZone";

type Status = Awaited<ReturnType<typeof getMyTimeZoneStatus>>;

export default function TimeZoneCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [picked, setPicked] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void getMyTimeZoneStatus().then((s) => {
      setStatus(s);
      setPicked(s.userTimeZone ?? "");
    }).catch(() => setStatus(null));
  }
  useEffect(() => { refresh(); }, []);

  // Browser auto-detect — a one-tap shortcut.
  const browserTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
  }, []);

  // Live preview of "now" in the about-to-be-set TZ.
  const previewTz = picked || custom || status?.effectiveTimeZone || "America/Los_Angeles";
  const previewNow = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: previewTz,
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      }).format(new Date());
    } catch {
      return "(invalid timezone)";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTz]);

  function save(tz: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await setMyTimeZone({ timeZone: tz });
      if (res.error) { setMsg(res.error); return; }
      setMsg(tz ? `✓ Time zone set to ${tz}` : "Reverted to bureau time zone");
      refresh();
    });
  }

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Time zone
        </h3>
      </div>
      <p className="text-[11.5px] mb-3" style={{ color: BRAND.inkSoft }}>
        Set your home time zone so emails like "your package arrived" or "your plan renews on" show times you can act on. Default = the bureau's local time.
      </p>

      {msg && (
        <div className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") || msg.startsWith("Reverted") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") || msg.startsWith("Reverted") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      {/* Status + preview */}
      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.blueDeep }}>
          Now in {previewTz}
        </p>
        <p className="text-[14px] font-black tabular-nums mt-0.5" style={{ color: BRAND.ink }}>
          {previewNow}
        </p>
        {status && (
          <p className="text-[10.5px] mt-1" style={{ color: BRAND.inkSoft }}>
            Currently saved: <strong>{status.userTimeZone ?? `(default — bureau ${status.bureauTimeZone})`}</strong>
            {browserTz && status.userTimeZone !== browserTz && (
              <button type="button" onClick={() => save(browserTz)} disabled={pending}
                className="ml-2 underline font-bold"
                style={{ color: BRAND.blueDeep }}>
                Use my browser's TZ ({browserTz}) →
              </button>
            )}
          </p>
        )}
      </div>

      {/* Common timezones */}
      <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>
        Common time zones
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
        {COMMON_TIMEZONES.map((opt) => {
          const active = picked === opt.tz;
          return (
            <button key={opt.tz} type="button" onClick={() => setPicked(opt.tz)}
              className="px-2.5 py-1.5 rounded-md text-[11.5px] font-bold text-left"
              style={{
                background: active ? BRAND.blue : "white",
                color: active ? "white" : BRAND.ink,
                border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
          Or use a custom IANA TZ
        </summary>
        <div className="mt-2 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Europe/Berlin"
            className="flex-1 rounded-md border px-3 py-1.5 text-sm font-mono"
            style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
          <button type="button" onClick={() => { setPicked(custom); }}
            className="px-3 py-1.5 rounded-md text-[11px] font-bold border"
            style={{ borderColor: BRAND.blue, color: BRAND.blueDeep, background: "white" }}>
            Preview
          </button>
        </div>
      </details>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => save(picked)} disabled={pending || !picked}
          className="flex-1 py-2.5 rounded-lg text-white font-black text-[12px] disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
          {pending ? "Saving…" : "Save time zone"}
        </button>
        {status?.userTimeZone && (
          <button type="button" onClick={() => save("")} disabled={pending}
            className="px-3 py-2.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
            style={{ borderColor: BRAND.border, color: BRAND.inkSoft, background: "white" }}>
            Revert to default
          </button>
        )}
      </div>
    </div>
  );
}
