"use client";

// iter-88 — Guest pickup authorization card.
//
// Member can authorize a friend / family member to pick up packages
// from their NOHO Mailbox. Each auth gets a unique QR encoded as
// `NOHO-GUEST:{authId}`. Guest brings the QR (printed or on phone) +
// photo ID; admin scans it at the counter; the existing pickup flow
// handles the rest.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  createGuestPickupAuth,
  getMyGuestPickups,
  revokeGuestPickup,
  getGuestPickupQr,
} from "@/app/actions/guestPickup";

type GuestRow = Awaited<ReturnType<typeof getMyGuestPickups>>[number];

export default function GuestPickupCard() {
  const [rows, setRows] = useState<GuestRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createdQr, setCreatedQr] = useState<string | null>(null);
  // QR display per row (lazy)
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");

  function refresh() {
    void getMyGuestPickups().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  function submit() {
    setCreateMsg(null);
    setCreatedQr(null);
    if (!name.trim()) {
      setCreateMsg("Guest name is required");
      return;
    }
    startTransition(async () => {
      const res = await createGuestPickupAuth({
        guestName: name.trim(),
        guestEmail: email.trim() || undefined,
        guestPhone: phone.trim() || undefined,
        expiresAt: expiresAt || null,
        notes: notes.trim() || undefined,
      });
      if ((res as { error?: string }).error) {
        setCreateMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setCreateMsg(`✓ Authorized ${name.trim()}${email.trim() ? ` — sent QR to ${email.trim()}` : ""}`);
      setCreatedQr((res as { qrDataUrl?: string }).qrDataUrl ?? null);
      setName(""); setEmail(""); setPhone(""); setExpiresAt(""); setNotes("");
      refresh();
    });
  }

  function revoke(authId: string, guestName: string) {
    if (!confirm(`Revoke pickup authorization for ${guestName}?`)) return;
    startTransition(async () => {
      const res = await revokeGuestPickup(authId);
      if ((res as { error?: string }).error) {
        alert((res as { error?: string }).error);
        return;
      }
      refresh();
    });
  }

  function showQr(authId: string) {
    if (qrFor === authId) { setQrFor(null); setQrUrl(null); return; }
    setQrFor(authId);
    setQrUrl(null);
    void getGuestPickupQr(authId).then((res) => {
      if ((res as { qrDataUrl?: string }).qrDataUrl) setQrUrl((res as { qrDataUrl?: string }).qrDataUrl ?? null);
    });
  }

  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
            Guest pickup
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-black px-3 py-1.5 rounded-xl text-white"
          style={{ background: open ? BRAND.brown : `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
        >
          {open ? "Cancel" : "Authorize a guest →"}
        </button>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Authorize someone to pick up packages on your behalf. They'll get a unique QR code by email (or you can print it from here). At the counter, our staff scans the QR and verifies their photo ID before handing anything over.
      </p>

      {open && (
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ border: `1px solid ${BRAND.border}`, background: BRAND.blueSoft }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>Guest name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mariem Saidi"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>Guest email <span style={{ color: BRAND.inkFaint }}>(sends QR)</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@example.com"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>Guest phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(818) 555-1234"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>Expires <span style={{ color: BRAND.inkFaint }}>(optional)</span></label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>Note for the bureau (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Only the FedEx package"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
          </div>
          <button type="button" onClick={submit} disabled={pending || !name.trim()}
            className="w-full py-2.5 rounded-xl text-white font-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            {pending ? "Authorizing…" : "Create pickup pass →"}
          </button>
          {createMsg && (
            <p className="text-[12px] font-bold rounded-lg px-3 py-2"
              style={{
                background: createMsg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
                color: createMsg.startsWith("✓") ? "#15803d" : "#991b1b",
              }}>
              {createMsg}
            </p>
          )}
          {createdQr && (
            <div className="text-center pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: BRAND.inkSoft }}>
                Print or screenshot this for your guest
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={createdQr} alt="Guest pickup QR" style={{ width: 180, height: 180, display: "inline-block", border: `1px solid ${BRAND.border}`, borderRadius: 8 }} />
            </div>
          )}
        </div>
      )}

      {/* Active auths list */}
      {rows === null ? (
        <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>
          No active guest authorizations right now.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((g) => (
            <li key={g.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.border, background: "white" }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-black text-[13px]" style={{ color: BRAND.ink }}>{g.guestName}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                    {g.guestEmail ?? "(no email)"}
                    {g.expiresAt && (
                      <span style={{ marginLeft: 6, color: BRAND.inkFaint }}>
                        · expires {new Date(g.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                    {g.usedAt && (
                      <span style={{ marginLeft: 6, color: "#15803d", fontWeight: 700 }}>
                        · used {new Date(g.usedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  {g.notes && (
                    <p className="text-[10.5px] mt-0.5 italic" style={{ color: BRAND.inkFaint }}>"{g.notes}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => showQr(g.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
                    style={{ borderColor: BRAND.blue, color: BRAND.blueDeep, background: "white" }}>
                    {qrFor === g.id ? "Hide QR" : "Show QR"}
                  </button>
                  <button type="button" onClick={() => revoke(g.id, g.guestName)} disabled={pending}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50"
                    style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                    Revoke
                  </button>
                </div>
              </div>
              {qrFor === g.id && (
                <div className="text-center mt-3 pt-3 border-t" style={{ borderColor: BRAND.border }}>
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrUrl} alt="Pickup QR" style={{ width: 180, height: 180, display: "inline-block", border: `1px solid ${BRAND.border}`, borderRadius: 8 }} />
                  ) : (
                    <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>Loading QR…</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
