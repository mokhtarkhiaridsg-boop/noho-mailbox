/**
 * Small CSV helpers used by the admin Shipping Center exports.
 *
 * No external dep. Excel-friendly: CRLF line endings, UTF-8 BOM, fields
 * with comma/quote/newline get double-quoted, embedded quotes doubled.
 */

export type CsvValue = string | number | boolean | null | undefined | Date;

function escapeCell(v: CsvValue): string {
  if (v == null) return "";
  let s: string;
  if (v instanceof Date) {
    s = v.toISOString();
  } else if (typeof v === "boolean") {
    s = v ? "true" : "false";
  } else if (typeof v === "number") {
    s = String(v);
  } else {
    s = String(v);
  }
  // Quote if the cell contains comma, quote, or newline. Embedded quotes
  // get doubled per RFC 4180.
  if (/[",\r\n]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: Array<Record<string, CsvValue>>, opts?: { headers?: string[] }): string {
  if (rows.length === 0 && !opts?.headers) return "";
  const headers = opts?.headers ?? Object.keys(rows[0]);
  const headerLine = headers.map(escapeCell).join(",");
  const body = rows
    .map((r) => headers.map((h) => escapeCell(r[h])).join(","))
    .join("\r\n");
  // BOM for Excel auto-detect of UTF-8.
  return "﻿" + headerLine + "\r\n" + body + "\r\n";
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke to next tick so the click finishes processing first.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Date-stamped filename like "noho-labels-2026-04-29.csv"
export function dateStampedName(prefix: string, ext = "csv", d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${prefix}-${yyyy}-${mm}-${dd}.${ext}`;
}
