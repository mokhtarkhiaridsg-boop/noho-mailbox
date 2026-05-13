"use client";

/**
 * iter-181 — Public tour-booking form. Submits to server action, shows
 * success state with what-happens-next copy.
 */

import { useState, useTransition } from "react";
import { requestMailboxTour } from "@/app/actions/mailboxTour";

export default function TourForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(() => {
    // Default to tomorrow.
    const t = new Date(); t.setDate(t.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [time, setTime] = useState("10:30");
  const [partySize, setPartySize] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await requestMailboxTour({
        name: name.trim(), email: email.trim(),
        phone: phone.trim() || undefined,
        requestedDate: date, requestedTime: time,
        partySize, reason: reason.trim() || undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #fff, #FAFAF8)",
        border: `2px solid #16A34A`, borderRadius: 20, padding: 28,
        boxShadow: "0 6px 18px rgba(22,163,74,0.18)", textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 36 }}>🎟</p>
        <p style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 900, color: "#2D100F" }}>
          We got your request!
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(45,16,15,0.65)", lineHeight: 1.5 }}>
          Check your email — we sent a confirmation. We'll send another email when staff confirm your slot (usually within a few hours).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{
      background: "white",
      border: "1px solid rgba(45,16,15,0.10)",
      borderRadius: 20, padding: 24,
      boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
      display: "grid", gap: 12,
    }}>
      <div>
        <label htmlFor="tour-name" style={LBL}>Your name *</label>
        <input id="tour-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Sami Khiari" style={INP} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label htmlFor="tour-email" style={LBL}>Email *</label>
          <input id="tour-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} placeholder="you@example.com" style={INP} />
        </div>
        <div>
          <label htmlFor="tour-phone" style={LBL}>Phone (optional)</label>
          <input id="tour-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="(818) 555-1234" style={INP} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 8 }}>
        <div>
          <label htmlFor="tour-date" style={LBL}>Date *</label>
          <input id="tour-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={INP} />
        </div>
        <div>
          <label htmlFor="tour-time" style={LBL}>Time *</label>
          <input id="tour-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={INP} />
        </div>
        <div>
          <label htmlFor="tour-party" style={LBL}>Party size</label>
          <input id="tour-party" type="number" min={1} max={10} value={partySize} onChange={(e) => setPartySize(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} style={INP} />
        </div>
      </div>
      <div>
        <label htmlFor="tour-reason" style={LBL}>What brings you in? (optional)</label>
        <textarea id="tour-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="I'm starting an LLC and need a real street address that's not my apartment." style={{ ...INP, resize: "vertical" }} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
      <button type="submit" disabled={busy} style={{
        marginTop: 4, padding: "14px 24px", borderRadius: 12,
        background: "#337485", color: "white", fontWeight: 900, fontSize: 15,
        border: "none", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
      }}>
        {busy ? "Sending…" : "🎟 Request my tour"}
      </button>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)", textAlign: "center" }}>
        Free, no obligation. We confirm by email within a few hours.
      </p>
    </form>
  );
}

const LBL: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" };
const INP: React.CSSProperties = {
  marginTop: 6, width: "100%", boxSizing: "border-box",
  padding: "12px 14px", borderRadius: 12,
  border: "1px solid rgba(45,16,15,0.15)",
  fontFamily: "inherit", fontSize: 14, color: "#2D100F",
  outline: "none", background: "white",
};
