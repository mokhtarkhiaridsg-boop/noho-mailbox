"use client";

import { useEffect, useState } from "react";
import { BRAND } from "./types";
import { getMyEmailHistory } from "@/app/actions/user";

type EmailRow = {
  id: string;
  toEmail: string;
  subject: string;
  kind: string;
  status: string;
  createdAt: string | Date;
  sentAt: string | Date | null;
};

const KIND_LABELS: Record<string, string> = {
  password_reset: "Password reset",
  mail_arrived: "Mail arrived",
  package_arrived: "Package arrived",
  contact_confirmation: "Contact confirmation",
  contact_notification: "Contact received",
  kyc_approved: "ID verified",
  kyc_rejected: "ID re-upload needed",
  plan_renewal_reminder: "Plan renewal",
  mailbox_activated: "Mailbox activated",
  receipt: "Receipt",
  notification: "Notification",
  welcome: "Welcome",
  other: "Other",
};

function kindLabel(k: string) {
  return KIND_LABELS[k] ?? k.replace(/_/g, " ");
}

function statusStyle(status: string) {
  if (status === "sent") return { bg: "var(--color-success-soft)", fg: "#166534", label: "Delivered" };
  if (status === "failed") return { bg: "var(--color-danger-soft)", fg: "#7F1D1D", label: "Failed" };
  if (status === "bounced") return { bg: "var(--color-warning-soft)", fg: "#7C2D12", label: "Bounced" };
  return { bg: BRAND.blueSoft, fg: BRAND.blueDeep, label: "Queued" };
}

function fmt(d: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EmailHistoryPanel() {
  const [rows, setRows] = useState<EmailRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyEmailHistory(100)
      .then((data) => {
        if (!cancelled) setRows(data as EmailRow[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Email History
        </h2>
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-full"
          style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
        >
          {rows === null ? "…" : `${rows.length} EMAILS`}
        </span>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </div>
      ) : rows === null ? (
        <div className="p-10 text-center text-sm" style={{ color: BRAND.inkFaint }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
            No emails yet
          </p>
          <p className="text-xs mt-1" style={{ color: BRAND.inkFaint }}>
            Every email we send you will appear here — password resets, mail alerts, receipts.
          </p>
        </div>
      ) : (
        <div>
          {rows.map((r, i) => {
            const s = statusStyle(r.status);
            return (
              <div
                key={r.id}
                className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3"
                style={{ borderBottom: i < rows.length - 1 ? `1px solid ${BRAND.border}` : "none" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black truncate" style={{ color: BRAND.ink }}>
                    {r.subject}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>
                    <span className="font-bold" style={{ color: BRAND.blueDeep }}>
                      {kindLabel(r.kind)}
                    </span>
                    {" · "}
                    to {r.toEmail}
                    {" · "}
                    {fmt(r.sentAt ?? r.createdAt)}
                  </p>
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                  style={{ background: s.bg, color: s.fg }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
