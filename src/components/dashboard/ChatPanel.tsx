"use client";

import { useEffect, useState } from "react";
import { getOrCreateMyChat } from "@/app/actions/chat";
import { ChatStream } from "@/components/chat/ChatStream";

type Props = { meId: string };

export function MemberChatPanel({ meId }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getOrCreateMyChat().then((res) => {
      if (!alive) return;
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res.threadId) setThreadId(res.threadId);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-[calc(100svh-160px)] sm:h-[calc(100vh-180px)] min-h-[420px] sm:min-h-[540px] max-h-[820px]"
      style={{
        background: "white",
        border: "1px solid rgba(45,16,15,0.1)",
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      {error ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm" style={{ color: "rgba(45,16,15,0.55)" }}>
            {error}
          </p>
        </div>
      ) : !threadId ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center" style={{ background: "#F8F2EA" }}>
          <p className="text-sm" style={{ color: "rgba(45,16,15,0.55)" }}>
            Connecting…
          </p>
        </div>
      ) : (
        <ChatStream
          threadId={threadId}
          meId={meId}
          otherName="NOHO Mailbox"
          otherSubtitle="(818) 506-7744 · Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm"
          emptyHint="Hi! Send us a message — we usually reply within an hour during business hours."
        />
      )}
    </div>
  );
}
