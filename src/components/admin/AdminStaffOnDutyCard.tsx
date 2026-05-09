"use client";

/**
 * iter-154 — "Staff on duty" admin widget. Lives inside the Operating
 * Hours panel as a small inline card. Sets the name shown on the
 * public /open landing page.
 */

import { useEffect, useState, useTransition } from "react";
import { setStaffOnDuty, getLiveBureauStatus } from "@/app/actions/liveBureau";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  success: "#22C55E",
};

export default function AdminStaffOnDutyCard() {
  const [name, setName] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);

  function refresh() {
    void getLiveBureauStatus().then((s) => {
      setCurrent(s.staffOnDuty);
      setName(s.staffOnDuty ?? "");
    }).catch(() => undefined);
  }
  useEffect(refresh, []);

  function onSave(nextName: string) {
    startTransition(async () => {
      const res = await setStaffOnDuty({ name: nextName });
      if (res.error) { alert(res.error); return; }
      setCurrent(nextName.trim() || null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    });
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            On the public /open page
          </p>
          <p className="text-[12px] font-bold" style={{ color: T.ink }}>
            {current ? `"${current} is here for you"` : "(no one on duty — page shows generic copy)"}
          </p>
        </div>
        {savedFlash && (
          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: T.success }}>
            ✓ Saved
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Staffer name (e.g. Karim)"
          className="flex-1 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
        />
        <button
          type="button"
          disabled={pending || name.trim() === (current ?? "")}
          onClick={() => onSave(name)}
          className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: T.blue }}
        >
          {pending ? "Saving…" : "Update"}
        </button>
        {current && (
          <button
            type="button"
            disabled={pending}
            onClick={() => { setName(""); onSave(""); }}
            className="text-[10.5px] font-bold px-2 py-1 rounded-md"
            style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
