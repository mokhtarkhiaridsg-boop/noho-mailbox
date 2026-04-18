"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVaultItem, uploadVaultItem } from "@/app/actions/vault";
import { BRAND } from "./types";

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

const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  Scan:     { bg: "#EBF2FA", text: "#2060A0" },
  Invoice:  { bg: "#F0FDF4", text: "#16A34A" },
  Receipt:  { bg: "#FEF9C3", text: "#CA8A04" },
  Form1583: { bg: "#F5F3FF", text: "#7C3AED" },
  POD:      { bg: "#FEE2E2", text: "#DC2626" },
  Other:    { bg: "#F0EDE8", text: "#6B6560" },
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
      alert("Upload failed — please try again");
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
      {/* Header */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-sm uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
              📁 Document Vault
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>
              {vaultItems.length} document{vaultItems.length !== 1 ? "s" : ""} stored securely
            </p>
          </div>
          <button
            onClick={() => { setShowUpload(!showUpload); setUploadSuccess(false); }}
            className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
          >
            {showUpload ? "Close" : "Upload Document"}
          </button>
        </div>

        {/* Upload form */}
        {showUpload && (
          <div className="mb-5 rounded-2xl p-4 space-y-3" style={{ background: BRAND.bgDeep, border: `1px solid ${BRAND.border}` }}>
            {uploadSuccess ? (
              <div className="text-center py-3">
                <p className="text-xl mb-1">✅</p>
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
                      <p className="text-xl mb-1">📄</p>
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
                      {KINDS.filter((k) => k !== "All").map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  disabled={!uploadFile || uploading}
                  onClick={handleUpload}
                  className="w-full py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
                >
                  {uploading ? "Uploading…" : "Save to Vault"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
              style={filter === k
                ? { background: BRAND.blue, color: "white" }
                : { background: BRAND.bgDeep, color: BRAND.inkSoft }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">🗄️</p>
            <p className="font-bold text-sm" style={{ color: BRAND.ink }}>
              {filter === "All" ? "No documents yet" : `No ${filter} documents`}
            </p>
            <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
              Upload your first document using the button above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const colors = KIND_COLORS[item.kind] ?? KIND_COLORS.Other;
              const isImg = item.mimeType.startsWith("image/");
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-colors"
                  style={{ border: `1px solid ${BRAND.border}`, background: BRAND.bg }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: colors.bg }}
                  >
                    {isImg ? "🖼️" : item.kind === "Invoice" ? "🧾" : item.kind === "Form1583" ? "📋" : item.kind === "Scan" ? "📷" : item.kind === "POD" ? "✅" : "📄"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] truncate" style={{ color: BRAND.ink }}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: colors.bg, color: colors.text }}
                      >{item.kind}</span>
                      <span className="text-[11px]" style={{ color: BRAND.inkFaint }}>{formatBytes(item.sizeBytes)}</span>
                      <span className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                        {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={item.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                      style={{ background: BRAND.blueSoft, color: BRAND.blue }}
                    >View</a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id || isPending}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40"
                      style={{ background: "#FEE2E2", color: "#DC2626" }}
                    >
                      {deletingId === item.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
