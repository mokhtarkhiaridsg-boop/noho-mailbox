"use client";

// iter-99 — Bulk customer-onboard CSV panel.
//
// Three-step flow: paste/upload CSV → validate (preview table with
// per-row error chips + conflict counts) → commit (creates User rows
// + audits). Header aliases mean admin can paste from QuickBooks,
// Square, or a spreadsheet without renaming columns.

import { useRef, useState, useTransition } from "react";
import { previewOnboardCsv, commitOnboardCsv, type OnboardRow } from "@/app/actions/bulkOnboard";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_RED = "#E70013";

const SAMPLE_CSV = `name,email,phone,suite,plan,notes,kyc
Mariem Saidi,mariem@example.com,(818) 555-1234,042,Basic,Walk-in signup,Pending
Karim Ben Ali,karim@example.com,(818) 555-5678,043,Business,Referred by Mariem,Approved
Sarah Johnson,sarah@example.com,,044,Premium,,Pending`;

export default function AdminCsvOnboardPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string>("");
  const [preview, setPreview] = useState<{ rows: OnboardRow[]; errorCount: number; ok: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof commitOnboardCsv>> | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(f);
  }

  function runPreview() {
    setPreview(null); setResult(null);
    startTransition(async () => {
      const res = await previewOnboardCsv({ csv });
      setPreview(res);
    });
  }

  function commit() {
    setConfirming(false); setResult(null);
    startTransition(async () => {
      const res = await commitOnboardCsv({ csv });
      setResult(res);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Customers · Bulk onboarding
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Bulk customer onboarding</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Paste a CSV (or drop a .csv file) → preview every row → commit. Headers are aliased so QuickBooks / Square / spreadsheet exports work without renaming.
        </p>
      </div>

      {/* Step 1: input */}
      <div className="rounded-md bg-white p-4 space-y-3" style={{ border: "1px solid #E5DACA" }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
            1 · Paste or upload CSV
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setCsv(SAMPLE_CSV)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
              Load sample
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
              style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}>
              Upload .csv
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
          </div>
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={SAMPLE_CSV}
          className="w-full rounded-xl border px-3 py-2 text-[12.5px] font-mono leading-relaxed"
          style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
        />
        <div className="rounded-lg p-2 text-[11px]" style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)", color: "#92400e" }}>
          Recognized headers: <code className="font-mono">name · email · phone · suite (or mailbox) · plan · notes · kyc</code>. Case-insensitive. Extras ignored.
        </div>
        <button type="button" onClick={runPreview} disabled={pending || !csv.trim()}
          className="w-full h-10 rounded-md text-white text-[12px] font-bold uppercase tracking-[0.10em] disabled:opacity-40 transition-colors"
          style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}>
          {pending ? "…" : "Preview rows →"}
        </button>
      </div>

      {/* Step 2: preview */}
      {preview && (
        <div className="rounded-md bg-white p-4 space-y-3" style={{ border: "1px solid #E5DACA" }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              2 · Preview · {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-black px-2 py-1 rounded-full" style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}>
                {preview.ok} ready
              </span>
              {preview.errorCount > 0 && (
                <span className="text-[10.5px] font-black px-2 py-1 rounded-full" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
                  {preview.errorCount} blocked
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#e8e5e0" }}>
            <table className="w-full text-[12px]">
              <thead style={{ background: "#fafaf7" }}>
                <tr style={{ color: "rgba(45,16,15,0.55)" }}>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Row</th>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Name</th>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Email</th>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Suite</th>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Plan</th>
                  <th className="text-left px-2 py-2 font-black text-[10px] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const ok = r.errors.length === 0;
                  return (
                    <tr key={r.rowIdx} style={{ borderTop: "1px solid #e8e5e0", background: ok ? "white" : "rgba(231,0,19,0.04)" }}>
                      <td className="px-2 py-2 font-mono text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>{r.rowIdx}</td>
                      <td className="px-2 py-2 font-bold" style={{ color: NOHO_INK }}>{r.name || <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}</td>
                      <td className="px-2 py-2" style={{ color: NOHO_INK }}>{r.email || <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}</td>
                      <td className="px-2 py-2 font-mono">{r.suiteNumber ?? <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}</td>
                      <td className="px-2 py-2">{r.plan ?? <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}</td>
                      <td className="px-2 py-2">
                        {ok ? (
                          <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}>Ready</span>
                        ) : (
                          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }} title={r.errors.join(" · ")}>
                            {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Step 3: commit */}
          {preview.ok > 0 && (
            !confirming ? (
              <button type="button" onClick={() => setConfirming(true)} disabled={pending}
                className="w-full h-11 rounded-md text-white text-[12px] font-bold uppercase tracking-[0.10em] disabled:opacity-40 transition-colors"
                style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}>
                Create {preview.ok} member{preview.ok === 1 ? "" : "s"} →
              </button>
            ) : (
              <div className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: NOHO_RED, background: "rgba(231,0,19,0.04)" }}>
                <p className="text-[12px] font-black" style={{ color: NOHO_RED }}>
                  Confirm: create {preview.ok} new member{preview.ok === 1 ? "" : "s"}?
                </p>
                <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.65)" }}>
                  Each gets a placeholder password — send them a password-reset email after import. Audit-logged.
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={commit} disabled={pending}
                    className="flex-1 py-2.5 rounded-lg text-white font-black"
                    style={{ background: NOHO_RED }}>
                    {pending ? "Creating…" : "Yes — create now"}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)}
                    className="px-3 py-2.5 rounded-lg text-xs font-bold border"
                    style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border p-3"
          style={{
            borderColor: result.errors.length > 0 ? "rgba(231,0,19,0.40)" : "rgba(22,163,74,0.40)",
            background: result.errors.length > 0 ? "rgba(231,0,19,0.04)" : "rgba(22,163,74,0.04)",
          }}>
          <p className="text-[12px] font-black" style={{ color: result.errors.length > 0 ? "#991b1b" : "#15803d" }}>
            ✓ Imported {result.created} member{result.created === 1 ? "" : "s"}
            {result.skipped > 0 && ` · ${result.skipped} skipped (had errors)`}
            {result.errors.length > 0 && ` · ${result.errors.length} insert-time errors`}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-[10.5px] mt-1 space-y-0.5" style={{ color: "#991b1b" }}>
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>· Row {e.rowIdx} ({e.email}) — {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
