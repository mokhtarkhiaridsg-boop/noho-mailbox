"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reviewKyc, assignMailbox } from "@/app/actions/admin";
import type { ComplianceRow } from "./types";

type Props = {
  complianceQueue: ComplianceRow[];
};

export function AdminCompliancePanel({ complianceQueue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg uppercase tracking-wide text-[#162d3a]">
          KYC & Onboarding Queue
        </h2>
        <span className="text-[11px] font-black px-3 py-1 rounded-full bg-[#162d3a]/8 text-[#162d3a]">
          {complianceQueue.length} PENDING
        </span>
      </div>

      <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
        {complianceQueue.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#162d3a]/60">
            No pending KYC submissions.
          </p>
        ) : (
          <ul className="divide-y divide-[#162d3a]/8">
            {complianceQueue.map((row) => (
              <li key={row.id} className="p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-black text-[#162d3a]">
                      {row.name}
                    </p>
                    <p className="text-xs text-[#162d3a]/60">{row.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className="px-2 py-1 rounded-full bg-[#162d3a]/6">
                        Plan: {row.plan ?? "Free"}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        KYC: {row.kycStatus}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-[#162d3a]/6">
                        Mailbox: {row.mailboxStatus}
                      </span>
                      {row.suiteNumber && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          Suite #{row.suiteNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.kycForm1583Url && (
                      <a
                        href={row.kycForm1583Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-black px-3 py-1.5 rounded-full bg-[#162d3a]/8 text-[#162d3a] hover:bg-[#162d3a]/15"
                      >
                        Form 1583
                      </a>
                    )}
                    {row.kycIdImageUrl && (
                      <a
                        href={row.kycIdImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-black px-3 py-1.5 rounded-full bg-[#162d3a]/8 text-[#162d3a] hover:bg-[#162d3a]/15"
                      >
                        ID Image
                      </a>
                    )}
                    <button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await reviewKyc(row.id, "Approved");
                          router.refresh();
                        })
                      }
                      className="text-[11px] font-black px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        const note = window.prompt("Reason for rejection:") ?? undefined;
                        startTransition(async () => {
                          await reviewKyc(row.id, "Rejected", note);
                          router.refresh();
                        });
                      }}
                      className="text-[11px] font-black px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        const suite = window.prompt(
                          "Assign suite number:",
                          row.suiteNumber ?? ""
                        );
                        if (!suite) return;
                        startTransition(async () => {
                          const res = await assignMailbox(row.id, suite);
                          if (res?.error) alert(res.error);
                          router.refresh();
                        });
                      }}
                      className="text-[11px] font-black px-3 py-1.5 rounded-full bg-accent text-white hover:bg-[#1e4d8c] disabled:opacity-50"
                    >
                      Assign Mailbox
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
