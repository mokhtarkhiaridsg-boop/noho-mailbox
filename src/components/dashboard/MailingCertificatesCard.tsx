"use client";

/**
 * iter-187 — Member-side certificates list.
 *
 * Renders only when the member has at least one issued certificate.
 * Each row shows the cert # + sender + date + revoked badge + open
 * link. The "Issue a new certificate" button opens a tiny dropdown
 * over the member's recent mail items so they can pick which one.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMyMailingCertificates,
  issueCertificateForMyMail,
  type MailingCertificateRow,
} from "@/app/actions/mailingCertificate";

export default function MailingCertificatesCard() {
  const [rows, setRows] = useState<MailingCertificateRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [mailItemId, setMailItemId] = useState("");
  const [notes, setNotes] = useState("");

  function refresh() {
    void listMyMailingCertificates().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onIssue() {
    setError(null); setInfo(null);
    if (!mailItemId.trim()) { setError("Paste the mail item ID (admin can give it to you)."); return; }
    startTransition(async () => {
      const res = await issueCertificateForMyMail({ mailItemId: mailItemId.trim(), notes: notes.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Certificate issued · ${res.verifyToken}`);
      setIssuing(false);
      setMailItemId("");
      setNotes("");
      refresh();
    });
  }

  if (rows == null) return null;
  if (rows.length === 0 && !issuing) {
    return (
      <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
              Mailbox · Mailing certificates
            </p>
            <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
              Proof-of-mailing certificates
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
              Need to prove a sender mailed you a document on date X? Generate a printable, publicly-verifiable certificate from any item in your mailbox history.
            </p>
          </div>
          <button type="button" onClick={() => setIssuing(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            + Issue certificate
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Mailbox · Mailing certificates
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            Proof-of-mailing certificates
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Printable, publicly-verifiable proof that a sender mailed you a document on a specific date.
          </p>
        </div>
        {!issuing && (
          <button type="button" onClick={() => setIssuing(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: BRAND.blue }}>
            + Issue certificate
          </button>
        )}
      </div>

      {issuing && (
        <div className="mt-4 rounded-xl p-3 space-y-2" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkFaint }}>Issue certificate for an item in your mailbox</p>
          <input value={mailItemId} onChange={(e) => setMailItemId(e.target.value)} placeholder="Paste mail item ID (from your Packages or Mail tab)" className="w-full px-3 py-2 rounded-lg text-[12.5px] font-mono" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Optional context for the certificate (e.g. 'IRS form 1040, sent certified mail')" className="w-full px-3 py-2 rounded-lg text-[12px] resize-none" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          {error && <p className="text-[11px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setIssuing(false); setError(null); }} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={onIssue} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {busy ? "Issuing…" : "Issue certificate"}
            </button>
          </div>
        </div>
      )}

      {info && <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((c) => {
            const isRevoked = !!c.revokedAtIso;
            return (
              <li key={c.id} className="rounded-xl p-3 flex items-start justify-between gap-2 flex-wrap" style={{ background: "white", border: `1px solid ${BRAND.border}`, opacity: isRevoked ? 0.55 : 1 }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12.5px] font-black font-mono" style={{ color: BRAND.ink }}>{c.certificateNumber}</p>
                    {isRevoked && <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>REVOKED</span>}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                    From <strong style={{ color: BRAND.ink }}>{c.senderName}</strong> · {c.itemType} · received {c.itemDate}
                  </p>
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: BRAND.inkFaint }}>
                    /cert/{c.verifyToken}
                  </p>
                </div>
                <a href={`/cert/${c.verifyToken}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: BRAND.blue, color: "white", textDecoration: "none" }}>
                  Open ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
