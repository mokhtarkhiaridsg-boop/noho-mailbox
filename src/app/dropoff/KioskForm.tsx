"use client";

/**
 * iter-176 — Public kiosk form. Submits to the server action, then
 * redirects the browser to /dropoff/<code> for the printable receipt.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateDropoffBarcode } from "@/app/actions/dropoffBarcode";
import { DROPOFF_CARRIERS, type DropoffCarrier } from "@/lib/dropoff-barcode";

export default function KioskForm() {
  const router = useRouter();
  const [suiteNumber, setSuiteNumber] = useState("");
  const [expectedSender, setExpectedSender] = useState("");
  const [expectedTracking, setExpectedTracking] = useState("");
  const [expectedCarrier, setExpectedCarrier] = useState<DropoffCarrier | "">("");
  const [notes, setNotes] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await generateDropoffBarcode({
        suiteNumber: suiteNumber.trim(),
        expectedSender: expectedSender.trim(),
        expectedTracking: expectedTracking.trim() || undefined,
        expectedCarrier: expectedCarrier || undefined,
        notes: notes.trim() || undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/dropoff/${res.code}`);
    });
  }

  return (
    <form onSubmit={onSubmit} style={{
      background: "white",
      border: "1px solid rgba(45,16,15,0.10)",
      borderRadius: 20,
      padding: 24,
      boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
      display: "grid",
      gap: 12,
    }}>
      <div>
        <label style={LBL}>Suite # *</label>
        <input value={suiteNumber} onChange={(e) => setSuiteNumber(e.target.value)} required maxLength={12} placeholder="042" autoComplete="off" inputMode="numeric" style={{ ...INP, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 18 }} />
      </div>
      <div>
        <label style={LBL}>Sender *</label>
        <input value={expectedSender} onChange={(e) => setExpectedSender(e.target.value)} required maxLength={80} placeholder="Acme Coffee Co." style={INP} />
      </div>
      <div>
        <label style={LBL}>Carrier (optional)</label>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" onClick={() => setExpectedCarrier("")} style={pillStyle(expectedCarrier === "")}>None</button>
          {DROPOFF_CARRIERS.map((c) => (
            <button key={c} type="button" onClick={() => setExpectedCarrier(c)} style={pillStyle(expectedCarrier === c)}>{c}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={LBL}>Tracking # (optional)</label>
        <input value={expectedTracking} onChange={(e) => setExpectedTracking(e.target.value)} maxLength={80} placeholder="1Z…" style={{ ...INP, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
      </div>
      <div>
        <label style={LBL}>Note for staff (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Fragile — please hold for me, I'll pick up tomorrow." style={{ ...INP, resize: "vertical" }} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
      <button type="submit" disabled={busy} style={{
        marginTop: 4, padding: "14px 24px", borderRadius: 12,
        background: "#337485", color: "white", fontWeight: 900, fontSize: 15,
        border: "none", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
      }}>
        {busy ? "Generating…" : "🖨 Generate barcode"}
      </button>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)", textAlign: "center" }}>
        Codes expire in 14 days. We never share your info with anyone outside NOHO.
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

function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "#337485" : "white",
    color: active ? "white" : "#2D100F",
    fontSize: 12, fontWeight: 700,
    border: `1px solid ${active ? "#337485" : "rgba(45,16,15,0.15)"}`,
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
  };
}
