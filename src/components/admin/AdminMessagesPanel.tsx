"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, archiveThread, trashThread } from "@/app/actions/messages";
import type { MessageThreadRow, ContactRow } from "./types";

type Props = {
  messageThreads: MessageThreadRow[];
  contactSubmissions: ContactRow[];
};

const SERVICE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "partner-program": {
    label: "Partner App",
    color: "#92400e",
    bg: "rgba(245,166,35,0.18)",
  },
  "lawfirm-delivery-quote": {
    label: "Law Firm Quote",
    color: "#5b21b6",
    bg: "rgba(124,58,237,0.15)",
  },
  mailbox: {
    label: "Mailbox",
    color: "#337485",
    bg: "rgba(51,116,133,0.12)",
  },
  notary: {
    label: "Notary",
    color: "#15803d",
    bg: "rgba(22,163,74,0.12)",
  },
  business: {
    label: "Business Bundle",
    color: "#B07030",
    bg: "rgba(176,112,48,0.18)",
  },
  formation: {
    label: "Formation Only",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  branding: {
    label: "Branding",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  "brand-mgmt": {
    label: "Brand Mgmt",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  website: {
    label: "Website",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  social: {
    label: "Social Media",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  print: {
    label: "Print",
    color: "#B07030",
    bg: "rgba(176,112,48,0.12)",
  },
  other: {
    label: "Other",
    color: "#7A6050",
    bg: "rgba(122,96,80,0.12)",
  },
};

function getServiceMeta(s: string | null | undefined) {
  if (!s) return { label: "General", color: "#7A6050", bg: "rgba(122,96,80,0.12)" };
  return SERVICE_LABELS[s] ?? { label: s, color: "#7A6050", bg: "rgba(122,96,80,0.12)" };
}

function ThreadReply({
  threadId,
  onSent,
}: {
  threadId: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await sendMessage({ threadId, body });
      if (res?.error) {
        setErr(res.error);
      } else {
        setBody("");
        setErr(null);
        onSent();
      }
    });
  }

  return (
    <div className="mt-3 flex items-start gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Reply…"
        rows={2}
        className="flex-1 rounded-lg border border-[#e8e5e0] px-3 py-2 text-sm resize-y"
      />
      <button
        disabled={pending || !body.trim()}
        onClick={send}
        className="text-[11px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #337485, #23596A)",
          whiteSpace: "nowrap",
        }}
      >
        {pending ? "Sending…" : "Send Reply"}
      </button>
      {err && <p className="text-[10px] text-red-700 ml-2">{err}</p>}
    </div>
  );
}

// Extract a phone number from the message body (we save partner/lawfirm
// quotes with structured "Phone: (xxx) xxx-xxxx" lines).
function extractPhone(message: string | null | undefined): string | null {
  if (!message) return null;
  const m = message.match(/(?:Phone|phone)\s*:\s*([+\d().\s-]+)/);
  if (!m) return null;
  // Normalize to digits-only.
  const digits = m[1].replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10); // last 10 digits = US national
}

function buildSmsBody(submission: ContactRow): string {
  const firstName = submission.name.split(" ")[0] || submission.name;
  const meta = getServiceMeta(submission.service);
  if (submission.service === "partner-program") {
    return `Hi ${firstName} — Mokhtar from NOHO Mailbox. Got your Partner Program application. Quick 15-min call to set up your code? — NOHO`;
  }
  if (submission.service === "lawfirm-delivery-quote") {
    return `Hi ${firstName} — Mokhtar from NOHO Mailbox. Got your delivery quote request. Calling now if you're free, or text the address if easier. — NOHO`;
  }
  return `Hi ${firstName} — thanks for contacting NOHO Mailbox about ${meta.label}. We'll be in touch shortly. — NOHO`;
}

export function AdminMessagesPanel({
  messageThreads,
  contactSubmissions,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  function doArchive(id: string) {
    startTransition(async () => {
      await archiveThread(id);
      router.refresh();
    });
  }
  function doTrash(id: string) {
    if (!confirm("Move thread to trash?")) return;
    startTransition(async () => {
      await trashThread(id);
      router.refresh();
    });
  }

  // Counts by service type.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: contactSubmissions.length };
    contactSubmissions.forEach((s) => {
      const k = s.service ?? "general";
      c[k] = (c[k] ?? 0) + 1;
    });
    return c;
  }, [contactSubmissions]);

  // Filter list.
  const filtered = useMemo(() => {
    if (serviceFilter === "all") return contactSubmissions;
    return contactSubmissions.filter((s) => (s.service ?? "general") === serviceFilter);
  }, [contactSubmissions, serviceFilter]);

  // Service options to show in the filter dropdown — only those with submissions.
  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    contactSubmissions.forEach((s) => seen.add(s.service ?? "general"));
    return Array.from(seen).sort();
  }, [contactSubmissions]);

  return (
    <div className="space-y-6">
      <h2 className="font-black text-lg uppercase tracking-wide text-text-light">
        Messages &amp; Contact Submissions
      </h2>

      {/* Type counter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setServiceFilter("all")}
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          style={{
            background: serviceFilter === "all" ? "#337485" : "#FFFFFF",
            color: serviceFilter === "all" ? "#FFFFFF" : "#162d3a",
            border: "1px solid #162d3a26",
          }}
        >
          All ({counts.all ?? 0})
        </button>
        {serviceOptions.map((s) => {
          const meta = getServiceMeta(s);
          const active = serviceFilter === s;
          return (
            <button
              key={s}
              onClick={() => setServiceFilter(s)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? meta.color : meta.bg,
                color: active ? "#FFFFFF" : meta.color,
                border: active ? "1px solid transparent" : "1px solid #162d3a26",
              }}
            >
              {meta.label} ({counts[s] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Contact form submissions */}
      <div
        className="rounded-2xl overflow-hidden bg-white"
        style={{
          boxShadow:
            "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">
            Contact Form Submissions
          </h3>
          <span className="text-xs font-bold text-[#162d3a]/50">
            {filtered.length} shown
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-light/40">
            {serviceFilter === "all"
              ? "No contact submissions yet."
              : `No submissions for ${getServiceMeta(serviceFilter).label}.`}
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: "rgba(232,229,224,0.3)" }}
          >
            {filtered.map((c) => {
              const meta = getServiceMeta(c.service);
              const phoneDigits = extractPhone(c.message);
              const smsBody = encodeURIComponent(buildSmsBody(c));
              return (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-text-light">
                          {c.name}
                        </p>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-light/50">
                        <a href={`mailto:${c.email}`} className="hover:text-[#337485]">
                          {c.email}
                        </a>
                        {" · "}
                        {new Date(c.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-text-light/70 mt-1.5 max-w-2xl leading-relaxed whitespace-pre-wrap">
                        {c.message}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <a
                        href={`mailto:${c.email}?subject=Re: Your NOHO Mailbox inquiry`}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white text-center"
                        style={{
                          background:
                            "linear-gradient(135deg, #337485, #23596A)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Email reply
                      </a>
                      {phoneDigits ? (
                        <a
                          href={`sms:+1${phoneDigits}?&body=${smsBody}`}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white text-center"
                          style={{
                            background:
                              "linear-gradient(135deg, #16a34a, #15803d)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          SMS quick reply
                        </a>
                      ) : (
                        <span
                          className="text-[10px] text-center text-text-light/35 px-3 py-1.5"
                          title="No phone in submission body"
                        >
                          (no phone)
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Message threads */}
      <div
        className="rounded-2xl overflow-hidden bg-white"
        style={{
          boxShadow:
            "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">
            In-App Message Threads
          </h3>
        </div>
        {messageThreads.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-light/40">
            No message threads yet.
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: "rgba(232,229,224,0.3)" }}
          >
            {messageThreads.map((t) => {
              const unread = t.unreadForUserIds
                ? JSON.parse(t.unreadForUserIds).length > 0
                : false;
              const isOpen = openId === t.id;
              return (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setOpenId(isOpen ? null : t.id)}
                      className="min-w-0 text-left flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-text-light truncate">
                          {t.subject}
                        </p>
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-[#337485] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-light/50 mt-0.5 truncate">
                        {t.preview || "(no message)"}
                      </p>
                    </button>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="text-[10px] text-text-light/35">
                        {new Date(t.lastMessageAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => doArchive(t.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#e8e5e0] hover:bg-[#f5f3f0]"
                          title="Archive"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => doTrash(t.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                          title="Trash"
                        >
                          Trash
                        </button>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <ThreadReply
                      threadId={t.id}
                      onSent={() => {
                        setOpenId(null);
                        router.refresh();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
