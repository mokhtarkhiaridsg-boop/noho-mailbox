"use client";

/**
 * iter-233 — Admin postal-letter queue panel (Tier 17 #142).
 *
 * When members fire address-change notices, email items are sent
 * inline; postal items queue here for admin to print + mail. Each row
 * shows the recipient address + the new address text the admin should
 * print on the letter, plus a "Mark mailed" button to clear from the
 * queue.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAddressNoticesAdmin,
  markPostalLetterMailed,
  getAddressNoticesSummary,
  type AddressChangeNoticeRunRow,
} from "@/app/actions/addressNotifications";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

export default function AdminAddressNoticesPanel() {
  const [runs, setRuns] = useState<AddressChangeNoticeRunRow[] | null>(null);
  const [summary, setSummary] = useState<{ pendingPostalCount: number; last30Runs: number; last30EmailsSent: number; last30PostalGenerated: number } | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<"all" | "postal" | "email">("postal");

  function refresh() {
    void listAddressNoticesAdmin({ channel: filterChannel === "all" ? undefined : filterChannel, limit: 50 })
      .then(setRuns)
      .catch(() => setRuns([]));
    void getAddressNoticesSummary().then(setSummary).catch(() => setSummary(null));
  }
  useEffect(refresh, [filterChannel]);

  function onMarkMailed(itemId: string, contactLabel: string) {
    const note = prompt(`Mark letter to "${contactLabel}" as mailed? Optional tracking note:`);
    if (note === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markPostalLetterMailed({ itemId, trackingNote: note.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Marked mailed: ${contactLabel}`); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Address Notices
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          tell the world
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {summary ? `${summary.pendingPostalCount} postal pending` : "live queue"}
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        Members curate their own org list (banks, employers, etc) + fire address-change notices when their forwarding address shifts. Email goes out inline; postal letters queue here for the bureau to print + mail.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Postal pending" value={summary ? String(summary.pendingPostalCount) : "—"} accent={summary && summary.pendingPostalCount > 0 ? T.amber : T.inkFaint} />
        <Tile label="30d runs" value={summary ? String(summary.last30Runs) : "—"} accent={T.inkSoft} />
        <Tile label="30d emails" value={summary ? String(summary.last30EmailsSent) : "—"} accent={T.green} />
        <Tile label="30d postal" value={summary ? String(summary.last30PostalGenerated) : "—"} accent={T.blue} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["postal", "email", "all"] as const).map((c) => (
          <button key={c} type="button" onClick={() => setFilterChannel(c)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md"
            style={{
              background: filterChannel === c ? T.blue : T.surface,
              color: filterChannel === c ? "white" : T.inkSoft,
              border: `1px solid ${filterChannel === c ? T.blue : T.border}`,
            }}>
            {c === "postal" ? "✉️ Postal queue" : c === "email" ? "📧 Email log" : "All"}
          </button>
        ))}
      </div>

      {!runs ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : runs.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No notice runs in this filter.
        </div>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold" style={{ color: T.ink }}>
                    {r.userName ?? "(member)"}{r.userSuite && <span className="text-[10px] ml-1.5 font-mono" style={{ color: T.inkFaint }}>· #{r.userSuite}</span>}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                    {new Date(r.createdAtIso).toLocaleString()} · {r.contactsTotal} contacts · {r.emailsSent} emails / {r.postalGenerated} postal
                    {r.effectiveDate && ` · effective ${r.effectiveDate}`}
                  </p>
                  <div className="mt-1.5 p-2 rounded-md text-[10.5px]" style={{ background: T.surfaceAlt }}>
                    <p className="font-bold mb-0.5" style={{ color: "#15803d" }}>NEW ADDRESS</p>
                    <pre className="font-mono whitespace-pre-line" style={{ color: T.ink, margin: 0 }}>{r.newAddressBody}</pre>
                  </div>
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {r.items.filter((it) => filterChannel === "all" || it.channel === filterChannel).map((it) => (
                  <li key={it.id} className="rounded-md p-2 text-[11px] flex items-start justify-between gap-2" style={{ background: it.status === "queued" && it.channel === "postal" ? `${T.amber}10` : T.surfaceAlt, border: `1px solid ${it.status === "queued" && it.channel === "postal" ? `${T.amber}40` : "transparent"}` }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color: T.ink }}>{it.channel === "email" ? "📧" : "✉️"} {it.contactLabel}</span>
                      <span className="text-[9.5px] ml-1.5 px-1 py-0 rounded" style={{
                        background: it.status === "sent" || it.status === "mailed" ? "#DCFCE7" : it.status === "failed" ? "#FEE2E2" : "#F4F5F7",
                        color: it.status === "sent" || it.status === "mailed" ? "#15803d" : it.status === "failed" ? "#b91c1c" : T.inkFaint,
                      }}>{it.status}</span>
                      {it.accountNumber && <span className="text-[9.5px] ml-1.5 font-mono" style={{ color: T.inkFaint }}>{it.accountNumber}</span>}
                      <p className="text-[10px] mt-0.5 font-mono whitespace-pre-line" style={{ color: T.inkSoft }}>{it.recipient}</p>
                      {it.error && <p className="text-[9.5px] italic" style={{ color: T.red }}>✕ {it.error}</p>}
                      {it.sentAtIso && <p className="text-[9.5px]" style={{ color: T.inkFaint }}>{it.channel === "postal" ? "Mailed" : "Sent"} {new Date(it.sentAtIso).toLocaleString()}</p>}
                    </div>
                    {it.channel === "postal" && it.status === "queued" && (
                      <button type="button" onClick={() => onMarkMailed(it.id, it.contactLabel)} disabled={busy}
                        className="text-[10px] font-bold px-2 py-1 rounded-md disabled:opacity-50 shrink-0"
                        style={{ background: T.green, color: "white" }}>
                        ✓ Mark mailed
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="font-mono font-black tabular-nums text-[18px] mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}
