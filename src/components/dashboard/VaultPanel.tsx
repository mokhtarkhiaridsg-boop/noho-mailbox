"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { deleteVaultItem, uploadVaultItem } from "@/app/actions/vault";
import { BRAND } from "./types";
import { EmptyState } from "./ui";

type VaultItem = {
  id: string;
  kind: string;
  title: string;
  blobUrl: string;
  mimeType: string;
  sizeBytes: number;
  tags?: string | null;
  createdAt: string;
};

type Props = {
  vaultItems: VaultItem[];
};

const KINDS = ["All", "Scan", "Invoice", "Receipt", "Form1583", "POD", "Other"];

// Display labels for the filter pills — keys (e.g. "Form1583") match the
// schema/DB value so we don't break filtering, but we render them with the
// space humans expect ("Form 1583").
const KIND_LABELS: Record<string, string> = {
  Form1583: "Form 1583",
};

// Brand-aligned: blue accent for digital scans, semantic colors for billing/legal,
// cream/brown for catch-all. All AA-readable on white.
const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  Scan:     { bg: "rgba(51,116,133,0.10)",  text: "#23596A" },
  Invoice:  { bg: "var(--color-success-soft)", text: "#166534" },
  Receipt:  { bg: "var(--color-warning-soft)", text: "#7C2D12" },
  Form1583: { bg: "rgba(45,16,15,0.08)",     text: "#2D100F" },
  POD:      { bg: "var(--color-danger-soft)",  text: "#7F1D1D" },
  Other:    { bg: "#F0DBA9",                  text: "#5C4540" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VaultPanel({ vaultItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState("Other");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [vaultErr, setVaultErr] = useState<string | null>(null);

  const filtered = filter === "All" ? vaultItems : vaultItems.filter((v) => v.kind === filter);

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.url) throw new Error("Upload failed");

      await uploadVaultItem({
        title: uploadTitle || uploadFile.name,
        blobUrl: data.url,
        kind: uploadKind,
        mimeType: uploadFile.type || "application/octet-stream",
        sizeBytes: uploadFile.size,
      });

      setUploadSuccess(true);
      setUploadFile(null);
      setUploadTitle("");
      router.refresh();
      setTimeout(() => { setUploadSuccess(false); setShowUpload(false); }, 1500);
    } catch {
      setVaultErr("Upload failed — please try again");
      setTimeout(() => setVaultErr(null), 4000);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this document from your vault?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteVaultItem(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Header — refined: standard icon-chip pattern, brand-blue solid CTA */}
      <section
        className="rounded-3xl p-5 sm:p-6"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(51,116,133,0.10)" }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#337485" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7 C3 6 4 5 5 5 L9 5 L11 7 L19 7 C20 7 21 8 21 9 L21 18 C21 19 20 20 19 20 L5 20 C4 20 3 19 3 18 Z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "rgba(45,29,15,0.55)" }}
              >
                Document vault
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(45,29,15,0.45)" }}>
                {vaultItems.length} document{vaultItems.length !== 1 ? "s" : ""} stored securely
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => { setShowUpload(!showUpload); setUploadSuccess(false); }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="text-[11.5px] font-semibold px-3.5 h-8 rounded-full transition-colors"
            style={{
              background: showUpload ? "white" : "#337485",
              color: showUpload ? "#337485" : "#F7EEC2",
              border: showUpload ? "1px solid rgba(51,116,133,0.20)" : "none",
            }}
          >
            {showUpload ? "Close" : "Upload"}
          </motion.button>
        </div>

        {/* Upload error toast */}
        {vaultErr && (
          <div className="mb-3 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(231,0,19,0.06)", color: "#b91c1c", border: "1px solid rgba(231,0,19,0.2)" }}>
            {vaultErr}
          </div>
        )}

        {/* Upload form */}
        {showUpload && (
          <div className="mb-5 rounded-2xl p-4 space-y-3" style={{ background: BRAND.bgDeep, border: `1px solid ${BRAND.border}` }}>
            {uploadSuccess ? (
              <div className="text-center py-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto mb-1" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M7 12 L11 16 L17 9" />
                </svg>
                <p className="font-bold text-sm" style={{ color: BRAND.ink }}>Uploaded to vault!</p>
              </div>
            ) : (
              <>
                {/* File picker */}
                <div
                  className="rounded-xl border-2 border-dashed p-5 text-center cursor-pointer"
                  style={{ borderColor: uploadFile ? BRAND.blue : BRAND.border }}
                  onClick={() => document.getElementById("vault-file-input")?.click()}
                >
                  <input
                    id="vault-file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setUploadFile(f);
                      if (f && !uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                  {uploadFile ? (
                    <div>
                      <p className="font-bold text-sm" style={{ color: BRAND.ink }}>{uploadFile.name}</p>
                      <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>{formatBytes(uploadFile.size)} · Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto mb-1" fill="none" stroke={BRAND.blue} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                        <path d="M14 3 L7 3 C5.5 3 5 3.5 5 5 L5 19 C5 20.5 5.5 21 7 21 L17 21 C18.5 21 19 20.5 19 19 L19 8 Z" />
                        <path d="M14 3 L14 8 L19 8" />
                        <path d="M9 14 L15 14 M9 17 L13 17" />
                      </svg>
                      <p className="font-bold text-sm" style={{ color: BRAND.ink }}>Click to browse</p>
                      <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>PDF, PNG, JPG, DOC</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.inkFaint }}>Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Form 1583 signed"
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                      style={{ border: `1px solid ${BRAND.border}`, background: "white" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.inkFaint }}>Category</label>
                    <select
                      value={uploadKind}
                      onChange={(e) => setUploadKind(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                      style={{ border: `1px solid ${BRAND.border}` }}
                    >
                      {KINDS.filter((k) => k !== "All").map((k) => <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>)}
                    </select>
                  </div>
                </div>

                <motion.button
                  disabled={!uploadFile || uploading}
                  onClick={handleUpload}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-11 rounded-full text-[13px] font-semibold disabled:opacity-40 transition-colors"
                  style={{
                    background: "#337485",
                    color: "#F7EEC2",
                  }}
                >
                  {uploading ? "Uploading…" : "Save to vault"}
                </motion.button>
              </>
            )}
          </div>
        )}

        {/* Filter pills — motion shared layoutId, brand-blue active */}
        <div className="flex gap-1 flex-wrap mb-5">
          {KINDS.map((k) => {
            const active = filter === k;
            return (
              <motion.button
                key={k}
                onClick={() => setFilter(k)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative text-[11.5px] font-medium px-3 h-8 rounded-full"
                style={{
                  color: active ? "#F7EEC2" : "#2D1D0F",
                  background: active ? "transparent" : "white",
                  border: active ? "none" : "1px solid rgba(45,29,15,0.10)",
                  zIndex: 1,
                }}
                aria-pressed={active}
              >
                {active && (
                  <motion.span
                    layoutId="vault-filter-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#337485" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{KIND_LABELS[k] ?? k}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <EmptyState
            tone="calm"
            title={filter === "All" ? "No documents yet" : `No ${filter} documents`}
            body="Upload your first document with the button above. Form 1583, IDs, scans, invoices — all stored securely."
          />
        ) : (
          <div className="space-y-1.5">
            {filtered.map((item, idx) => {
              const colors = KIND_COLORS[item.kind] ?? KIND_COLORS.Other;
              const isImg = item.mimeType.startsWith("image/");
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: 0.04 * idx, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-colors"
                  style={{ border: "1px solid rgba(45,29,15,0.08)", background: "white" }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {isImg ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" fill="currentColor" /><path d="M3 17 L9 12 L13 16 L17 12 L21 16" /></svg>
                    ) : item.kind === "Invoice" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M5 3 L19 3 L19 21 L17 19 L15 21 L13 19 L11 21 L9 19 L7 21 L5 21 Z" /><path d="M9 9 L15 9 M9 13 L15 13" /></svg>
                    ) : item.kind === "Form1583" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M9 8 L15 8 M9 12 L15 12 M9 16 L13 16" /></svg>
                    ) : item.kind === "Scan" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><circle cx="12" cy="13" r="1.5" fill="currentColor" /><path d="M9 6 L9 4 L15 4 L15 6" /></svg>
                    ) : item.kind === "POD" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12 L11 15 L16 9" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M14 3 L7 3 C5.5 3 5 3.5 5 5 L5 19 C5 20.5 5.5 21 7 21 L17 21 C18.5 21 19 20.5 19 19 L19 8 Z" /><path d="M14 3 L14 8 L19 8" /></svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] tracking-tight truncate"
                      style={{ color: "#2D1D0F", fontWeight: 700 }}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {item.kind}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: "rgba(45,29,15,0.45)" }}>
                        {formatBytes(item.sizeBytes)}
                      </span>
                      <span className="text-[11px]" style={{ color: "rgba(45,29,15,0.45)" }}>
                        {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <motion.a
                      href={item.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.97 }}
                      className="px-3 h-8 rounded-full text-[11.5px] font-semibold inline-flex items-center transition-colors"
                      style={{
                        background: "white",
                        color: "#337485",
                        border: "1px solid rgba(51,116,133,0.20)",
                      }}
                    >
                      View
                    </motion.a>
                    <motion.button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id || isPending}
                      whileTap={{ scale: 0.97 }}
                      className="w-8 h-8 rounded-full text-[11.5px] font-semibold transition-colors disabled:opacity-40 inline-flex items-center justify-center hover:bg-[rgba(231,0,19,0.08)]"
                      style={{ color: "rgba(45,29,15,0.45)" }}
                      aria-label="Delete document"
                    >
                      {deletingId === item.id ? "…" : (
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                          <path d="M3 4 H13 M6 4 V3 a1 1 0 0 1 1-1 h2 a1 1 0 0 1 1 1 V4 M5 4 V13 a1 1 0 0 0 1 1 h4 a1 1 0 0 0 1-1 V4" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
