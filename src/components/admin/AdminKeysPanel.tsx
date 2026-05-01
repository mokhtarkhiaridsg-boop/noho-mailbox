"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { issueNewKey } from "@/app/actions/admin";
import type { KeyRequestRow } from "./types";

type Props = {
  keyRequests: KeyRequestRow[];
};

export function AdminKeysPanel({ keyRequests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
        Mailbox Key Replacement Requests
      </h2>
      <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
        {keyRequests.length === 0 ? (
          <div className="p-12 text-center">
            <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="#162d3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="14" cy="24" r="6" />
              <path d="M20 24 L40 24" />
              <path d="M34 24 L34 30 M40 24 L40 32" />
            </svg>
            <p className="text-sm font-bold text-[#162d3a]/70">No pending key requests</p>
            <p className="text-xs text-[#162d3a]/50 mt-1">Customers request replacements from the Member dashboard.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#162d3a]/8">
            {keyRequests.map((r) => (
              <li
                key={r.id}
                className="p-5 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-[#162d3a]">
                    {r.userName}
                  </p>
                  <p className="text-xs text-[#162d3a]/60 mt-0.5">
                    {r.reason}
                  </p>
                  <p className="text-[10px] text-[#162d3a]/40 mt-1">
                    ${(r.feeCents / 100).toFixed(2)} · {r.status} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {r.status === "Pending" && (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await issueNewKey(r.userId, r.id);
                        router.refresh();
                      })
                    }
                    className="text-[11px] font-black px-4 py-2 rounded-full bg-accent text-white hover:bg-[#23596A] disabled:opacity-50"
                  >
                    Issue Key (−$25)
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
