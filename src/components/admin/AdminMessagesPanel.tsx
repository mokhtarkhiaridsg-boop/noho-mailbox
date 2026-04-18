"use client";

import type { MessageThreadRow, ContactRow } from "./types";

type Props = {
  messageThreads: MessageThreadRow[];
  contactSubmissions: ContactRow[];
};

export function AdminMessagesPanel({ messageThreads, contactSubmissions }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Messages & Contact Submissions</h2>

      {/* Contact form submissions */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Contact Form Submissions</h3>
        </div>
        {contactSubmissions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-light/40">No contact submissions yet.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
            {contactSubmissions.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-black text-text-light">{c.name}</p>
                    <p className="text-xs text-text-light/50">{c.email} · {c.service ?? "General"} · {new Date(c.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-text-light/70 mt-1.5 max-w-lg leading-relaxed">{c.message}</p>
                  </div>
                  <a
                    href={`mailto:${c.email}?subject=Re: Your NOHO Mailbox inquiry`}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", whiteSpace: "nowrap" }}
                  >
                    Reply
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Message threads */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">In-App Message Threads</h3>
        </div>
        {messageThreads.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-light/40">No message threads yet.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
            {messageThreads.map((t) => {
              const unread = t.unreadForUserIds ? JSON.parse(t.unreadForUserIds).length > 0 : false;
              return (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-text-light truncate">{t.subject}</p>
                        {unread && <span className="w-2 h-2 rounded-full bg-[#3374B5] shrink-0" />}
                      </div>
                      <p className="text-xs text-text-light/50 mt-0.5 truncate">{t.preview || "(no message)"}</p>
                    </div>
                    <p className="text-[10px] text-text-light/35 shrink-0">{new Date(t.lastMessageAt).toLocaleDateString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
