"use client";

/**
 * iter-168 — Public sender-side note submission form.
 *
 * Renders below the iter-93 hero card on /p/[id]?t=…. Submits to the
 * server action which validates against the share token, rate-limits,
 * notifies the recipient, and fires their member webhooks.
 *
 * Success view shows a friendly confirmation + a teaser of the
 * recipient's first name (if available) so the sender knows the
 * message landed with the right person.
 */

import { useState, useTransition } from "react";
import { submitSenderThankYou } from "@/app/actions/senderThankYou";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F8F2EA";

const SUGGESTED_MESSAGES = [
  { emoji: "🎁", text: "Hope you love it!" },
  { emoji: "💕", text: "Thinking of you." },
  { emoji: "🎂", text: "Happy birthday!" },
  { emoji: "🙏", text: "Thank you for everything." },
  { emoji: "✨", text: "A little something for you." },
];

export default function SenderThankYouForm({
  mailItemId,
  shareToken,
  recipientFirstName,
  initialNoteCount,
}: {
  mailItemId: string;
  shareToken: string;
  recipientFirstName: string | null;
  initialNoteCount: number;
}) {
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 2) { setError("Add a short message."); return; }
    startTransition(async () => {
      const res = await submitSenderThankYou({
        mailItemId, shareToken,
        message: message.trim(),
        senderName: senderName.trim() || undefined,
        senderEmail: senderEmail.trim() || undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{
        marginTop: 14, background: "linear-gradient(135deg, #fff, #FAFAF8)",
        border: `2px solid #16A34A`, borderRadius: 20, padding: 24,
        boxShadow: "0 6px 18px rgba(22,163,74,0.18)", textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 36 }}>💌</p>
        <p style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 900, color: NOHO_INK }}>
          Note sent to {recipientFirstName ?? "the recipient"}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
          They'll see your message in their dashboard the next time they sign in.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 14, background: "white",
      border: "1px solid rgba(45,16,15,0.10)", borderRadius: 20, padding: 24,
      boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
          Send a note
        </p>
        {initialNoteCount > 0 && (
          <span style={{ fontSize: 11, color: "rgba(45,16,15,0.55)" }}>
            {initialNoteCount} {initialNoteCount === 1 ? "person has" : "people have"} already left a note
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 14, color: NOHO_INK, lineHeight: 1.5 }}>
        Add a short message — {recipientFirstName ?? "the recipient"} will see it on their dashboard.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={recipientFirstName ? `Hey ${recipientFirstName}…` : "Type your note here…"}
          maxLength={500}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 14px", borderRadius: 12,
            border: "1px solid rgba(45,16,15,0.15)",
            fontFamily: "inherit", fontSize: 14, color: NOHO_INK,
            resize: "vertical", outline: "none", background: NOHO_CREAM,
          }}
          aria-label="Message"
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "rgba(45,16,15,0.45)" }}>{message.length}/500</span>
          <span style={{ fontSize: 10, color: "rgba(45,16,15,0.45)" }}>Visible only to {recipientFirstName ?? "recipient"}</span>
        </div>

        {/* Suggested-message chips */}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTED_MESSAGES.map((s) => (
            <button
              key={s.text}
              type="button"
              onClick={() => setMessage(`${s.emoji} ${s.text}`)}
              style={{
                background: NOHO_CREAM, color: NOHO_INK, fontSize: 11.5, fontWeight: 700,
                border: "1px solid rgba(45,16,15,0.10)", borderRadius: 999,
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              {s.emoji} {s.text}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={80}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(45,16,15,0.15)",
              fontFamily: "inherit", fontSize: 13, color: NOHO_INK, outline: "none", background: "white",
            }}
          />
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="Your email (optional)"
            maxLength={120}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(45,16,15,0.15)",
              fontFamily: "inherit", fontSize: 13, color: NOHO_INK, outline: "none", background: "white",
            }}
          />
        </div>

        {error && (
          <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || message.trim().length < 2}
          style={{
            marginTop: 14, width: "100%",
            padding: "12px 16px", borderRadius: 12,
            background: NOHO_BLUE, color: "white",
            fontSize: 14, fontWeight: 900, letterSpacing: "0.02em",
            border: "none", cursor: pending ? "wait" : "pointer",
            opacity: pending || message.trim().length < 2 ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {pending ? "Sending…" : `📬 Send to ${recipientFirstName ?? "recipient"}`}
        </button>

        <p style={{ margin: "10px 0 0", fontSize: 10, color: "rgba(45,16,15,0.45)", textAlign: "center" }}>
          Your name + email are optional. We never share your message publicly.
        </p>
      </form>
    </div>
  );
}
