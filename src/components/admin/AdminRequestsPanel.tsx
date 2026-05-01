"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { fulfillMailRequest } from "@/app/actions/mail";
import type { MailRequestRow } from "./types";

type Props = {
  mailRequests: MailRequestRow[];
};

export function AdminRequestsPanel({ mailRequests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
        Mail Request Queue
      </h2>
      <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
        {mailRequests.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#162d3a]/60">
            No pending mail requests.
          </p>
        ) : (
          <ul className="divide-y divide-[#162d3a]/8">
            {mailRequests.map((r) => (
              <li
                key={r.id}
                className="p-5 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-[#162d3a]">
                    {r.kind} request — {r.mailFrom}
                  </p>
                  <p className="text-xs text-[#162d3a]/60">
                    {r.userName}
                    {r.suiteNumber ? ` · Suite #${r.suiteNumber}` : ""} ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.notes && (
                    <p className="text-[11px] text-[#162d3a]/50 mt-1">
                      {r.notes}
                    </p>
                  )}
                </div>
                <button
                  disabled={isPending}
                  onClick={() => {
                    let scanPages: number | undefined;
                    if (r.kind === "Scan") {
                      const ans = window.prompt(
                        `How many pages did you scan for ${r.userName}? (charges $2/page from their wallet)`,
                        "1",
                      );
                      if (ans === null) return; // cancelled
                      const n = parseInt(ans, 10);
                      if (!Number.isFinite(n) || n < 1) {
                        alert("Enter a whole number ≥ 1");
                        return;
                      }
                      scanPages = n;
                    }
                    startTransition(async () => {
                      await fulfillMailRequest(r.id, undefined, scanPages);
                      router.refresh();
                    });
                  }}
                  className="text-[11px] font-black px-4 py-2 rounded-full bg-accent text-white hover:bg-[#23596A] disabled:opacity-50"
                >
                  Fulfill
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
