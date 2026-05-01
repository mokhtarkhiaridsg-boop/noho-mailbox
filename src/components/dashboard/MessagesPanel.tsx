"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type Thread } from "./types";
import { IconMessage } from "@/components/MemberIcons";
import { sendMessage } from "@/app/actions/messages";

type Props = {
  threads: Thread[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

export default function MessagesPanel({
  threads,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  const [composing, setComposing] = useState(false);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

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
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <IconMessage className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h2
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Internal Messages
          </h2>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
          style={{
            background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            boxShadow: "0 4px 14px rgba(51,116,133,0.32)",
          }}
        >
          Compose
        </button>
      </div>

      {composing && (
        <form
          className="p-6 space-y-3"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await sendMessage({
                subject: (fd.get("subject") as string) || "(no subject)",
                body: (fd.get("body") as string) || "",
              });
              if (res?.error) {
                refresh(res.error);
                return;
              }
              setComposing(false);
              refresh("Message sent");
            });
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkFaint }}>
            New message to NOHO Mailbox staff
          </p>
          <input
            name="subject"
            placeholder="Subject"
            required
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
          />
          <textarea
            name="body"
            required
            rows={5}
            placeholder="Your message…"
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
          />
          <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>
            Need to attach a file? Reply to the email confirmation we send you and we&apos;ll add it to the thread.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-60 disabled:cursor-wait"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              {isPending && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {isPending ? "Sending…" : "Send to staff"}
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 ? (
        <div className="p-12 text-center">
          <IconMessage
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: BRAND.inkFaint }}
            strokeWidth={1.2}
          />
          <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
            No messages yet
          </p>
          <p className="text-xs mt-1" style={{ color: BRAND.inkFaint }}>
            Click Compose to start a conversation with our staff.
          </p>
        </div>
      ) : (
        <ul>
          {threads.map((t, i) => (
            <li
              key={t.id}
              className="px-6 py-4 hover:bg-[#337485]/4 transition-colors flex items-start justify-between gap-4"
              style={{
                borderBottom:
                  i < threads.length - 1 ? `1px solid ${BRAND.border}` : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.unread && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: BRAND.blue }}
                    />
                  )}
                  <p
                    className="text-sm font-black truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {t.subject}
                  </p>
                </div>
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: BRAND.inkSoft }}
                >
                  {t.preview}
                </p>
              </div>
              <span
                className="text-[10px] font-bold whitespace-nowrap"
                style={{ color: BRAND.inkFaint }}
              >
                {new Date(t.lastMessageAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
