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
          <p className="p-10 text-center text-sm text-[#162d3a]/60">
            No pending key requests.
          </p>
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
                    className="text-[11px] font-black px-4 py-2 rounded-full bg-accent text-white hover:bg-[#1e4d8c] disabled:opacity-50"
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
