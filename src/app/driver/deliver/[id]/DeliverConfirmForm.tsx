"use client";

// iter-97 — POD photo capture + recipient name + Mark delivered.
//
// Flow:
//   1. Driver taps "Take POD photo" → file input with capture=environment
//   2. We POST the file to /api/upload (existing admin-gated endpoint)
//      → get back a Vercel Blob URL
//   3. Driver optionally types the recipient's name
//   4. Tap "Mark delivered" → confirmDelivery server action

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDelivery } from "@/app/actions/driver";

const NOHO_INK = "#2D100F";
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";

export default function DeliverConfirmForm({
  deliveryId,
  alreadyDelivered,
  existingPodPhotoUrl,
  existingRecipientName,
}: {
  deliveryId: string;
  alreadyDelivered: boolean;
  existingPodPhotoUrl: string | null;
  existingRecipientName: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingPodPhotoUrl);
  const [recipientName, setRecipientName] = useState<string>(existingRecipientName ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const j = (await res.json()) as { url?: string; error?: string };
      if (!j.url) throw new Error(j.error ?? "upload failed");
      setPhotoUrl(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!photoUrl) { setError("Take a POD photo first."); return; }
    setError(null);
    startTransition(async () => {
      const res = await confirmDelivery({
        deliveryId,
        podPhotoUrl: photoUrl,
        recipientName: recipientName.trim() || undefined,
      });
      if ((res as { error?: string }).error) {
        setError((res as { error?: string }).error || "Failed");
        return;
      }
      router.push("/driver/route");
      router.refresh();
    });
  }

  if (alreadyDelivered) {
    return (
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.30)" }}>
        <p style={{ margin: 0, fontWeight: 800, color: "#15803d" }}>Already marked delivered ✓</p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
          {existingRecipientName ? `Received by ${existingRecipientName}.` : "No recipient name on file."}
        </p>
        {existingPodPhotoUrl && (
          <div style={{ marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={existingPodPhotoUrl} alt="POD" style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid rgba(45,16,15,0.10)" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* POD photo capture */}
      {photoUrl ? (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="POD"
            style={{ width: "100%", borderRadius: 12, border: `1px solid ${NOHO_BLUE}40` }}
          />
          <button
            type="button"
            onClick={() => { setPhotoUrl(null); fileInputRef.current?.click(); }}
            style={{
              position: "absolute",
              top: 10, right: 10,
              padding: "6px 12px",
              borderRadius: 8,
              background: "white",
              color: NOHO_INK,
              border: "1px solid rgba(45,16,15,0.20)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(45,16,15,0.18)",
            }}
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: "100%",
            padding: "60px 14px",
            borderRadius: 12,
            border: `2px dashed ${NOHO_BLUE}80`,
            background: "rgba(51,116,133,0.04)",
            color: NOHO_BLUE_DEEP,
            fontWeight: 900,
            fontSize: 16,
            cursor: uploading ? "wait" : "pointer",
          }}
        >
          {uploading ? "Uploading…" : "📸 Take POD photo"}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {/* Recipient name */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)", marginBottom: 6 }}>
          Recipient name (optional)
        </label>
        <input
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Who received it?"
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 15,
            color: NOHO_INK,
            background: "white",
            border: "1px solid rgba(45,16,15,0.15)",
            borderRadius: 10,
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && (
        <p style={{ marginTop: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#991b1b", background: "rgba(231,0,19,0.08)", borderRadius: 8 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !photoUrl}
        style={{
          marginTop: 18,
          width: "100%",
          padding: "16px 16px",
          background: pending ? "#15803d" : `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
          color: "white",
          border: "none",
          borderRadius: 14,
          fontWeight: 900,
          fontSize: 16,
          cursor: pending || !photoUrl ? "not-allowed" : "pointer",
          opacity: pending || !photoUrl ? 0.6 : 1,
          boxShadow: "0 6px 16px rgba(35,89,106,0.30)",
        }}
      >
        {pending ? "Confirming…" : "Mark delivered ✓"}
      </button>
    </div>
  );
}
