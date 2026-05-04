"use client";

// iter-92 — Feedback form client island. 5-star picker + comment +
// submit. Calls submitPickupSurvey server action by token.

import { useState, useTransition } from "react";
import { submitPickupSurvey } from "@/app/actions/pickupSurvey";

export default function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    if (rating < 1) { setError("Please pick a rating"); return; }
    setError(null);
    startTransition(async () => {
      const res = await submitPickupSurvey({ token, rating, comment: comment.trim() || undefined });
      if ((res as { error?: string }).error) {
        setError((res as { error?: string }).error || "Failed");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.30)" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#15803d" }}>
          Thanks for the feedback ✓
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
          Your bureau team will read this. If you flagged something, we'll reach out directly.
        </p>
      </div>
    );
  }

  const display = hoverRating > 0 ? hoverRating : rating;
  return (
    <div style={{ marginTop: 24 }}>
      {/* Star picker — large tap targets so it works on phones */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "10px 0" }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = display >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => { setRating(n); setError(null); }}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={rating === n}
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                border: "none",
                background: active ? "#fef3c7" : "transparent",
                cursor: "pointer",
                fontSize: 36,
                color: active ? "#f59e0b" : "rgba(45,16,15,0.20)",
                transition: "all 0.12s ease",
              }}
            >
              ★
            </button>
          );
        })}
      </div>

      {/* Quick context label under the stars */}
      {display > 0 && (
        <p style={{ margin: "0 0 16px", textAlign: "center", fontSize: 12, fontWeight: 800, color: display >= 4 ? "#15803d" : display === 3 ? "#92400e" : "#991b1b" }}>
          {display === 5 && "Loved it"}
          {display === 4 && "Pretty good"}
          {display === 3 && "It was OK"}
          {display === 2 && "Not great"}
          {display === 1 && "Bad — we want to fix it"}
        </p>
      )}

      <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)", marginBottom: 6 }}>
        Anything to add? (optional)
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="What stood out — good or bad?"
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 13,
          fontFamily: "inherit",
          color: "#2D100F",
          background: "white",
          border: "1px solid rgba(45,16,15,0.15)",
          borderRadius: 10,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      {error && (
        <p style={{ marginTop: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#991b1b", background: "rgba(231,0,19,0.08)", borderRadius: 8 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || rating === 0}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "12px 16px",
          background: "linear-gradient(135deg, #337485, #23596A)",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontWeight: 900,
          fontSize: 14,
          cursor: pending || rating === 0 ? "not-allowed" : "pointer",
          opacity: pending || rating === 0 ? 0.4 : 1,
        }}
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
