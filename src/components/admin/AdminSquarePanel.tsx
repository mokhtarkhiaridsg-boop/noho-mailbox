"use client";

import { useTransition } from "react";
import {
  syncSquareCustomers,
  syncSquarePayments,
  syncSquareCatalog,
  syncAll,
  type SyncResult,
} from "@/app/actions/square";
import { StatusBadge } from "./StatusBadge";
import type { SquareStatus } from "./types";

type Props = {
  squareStatus: SquareStatus;
  syncResults: SyncResult[] | null;
  setSyncResults: (results: SyncResult[] | null) => void;
};

export function AdminSquarePanel({ squareStatus, syncResults, setSyncResults }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Square Integration</h2>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: squareStatus.configured ? "#22c55e" : "#ef4444" }}
          />
          <span className="text-xs font-bold text-text-light/50">
            {squareStatus.configured ? "Connected" : "Not Connected"}
          </span>
        </div>
      </div>

      {!squareStatus.configured && (
        <div
          className="rounded-2xl p-6 bg-white"
          style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "2px dashed rgba(239,68,68,0.3)" }}
        >
          <h3 className="font-black text-sm text-text-light mb-2">Setup Required</h3>
          <ol className="text-sm text-text-light/60 space-y-1 list-decimal list-inside">
            <li>Go to <span className="font-mono text-xs text-accent">developer.squareup.com/apps</span></li>
            <li>Create or select your application</li>
            <li>Copy your Access Token from the Credentials tab</li>
            <li>Add it as <span className="font-mono text-xs">SQUARE_ACCESS_TOKEN</span> in your Vercel environment variables</li>
          </ol>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Linked Customers", value: squareStatus.linkedCustomers },
          { label: "Payments Synced", value: squareStatus.totalPayments },
          { label: "Catalog Items", value: squareStatus.catalogItems },
          { label: "Total Revenue", value: `$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <p className="text-2xl font-black text-text-light">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/35 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sync buttons */}
      <div className="rounded-2xl p-6 bg-white space-y-4" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Sync Data</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Customers", action: () => startTransition(async () => { const r = await syncSquareCustomers(); setSyncResults([r]); }) },
            { label: "Payments", action: () => startTransition(async () => { const r = await syncSquarePayments(); setSyncResults([r]); }) },
            { label: "Catalog", action: () => startTransition(async () => { const r = await syncSquareCatalog(); setSyncResults([r]); }) },
            { label: "Sync All", action: () => startTransition(async () => { const r = await syncAll(); setSyncResults(r); }) },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              disabled={isPending || !squareStatus.configured}
              className="px-4 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
            >
              {isPending ? "Syncing..." : btn.label}
            </button>
          ))}
        </div>

        {syncResults && (
          <div className="mt-4 space-y-2">
            {syncResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl text-sm"
                style={{ background: r.success ? "rgba(34,139,34,0.08)" : "rgba(200,50,50,0.08)" }}
              >
                <span className="font-bold text-text-light">{r.syncType}</span>
                <span style={{ color: r.success ? "#1a8a1a" : "#c03030" }}>
                  {r.success ? `${r.itemsSynced} synced` : r.error}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync history */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Sync History</h3>
        </div>
        {squareStatus.recentLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-light/40">No syncs performed yet</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
            {squareStatus.recentLogs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-light capitalize">{log.syncType}</p>
                  <p className="text-[10px] text-text-light/40">
                    {new Date(log.startedAt).toLocaleString()} &middot; {log.itemsSynced} items
                  </p>
                </div>
                <StatusBadge status={log.status === "completed" ? "Completed" : log.status === "failed" ? "Expired" : "Pending"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
