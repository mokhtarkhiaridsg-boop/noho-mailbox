/**
 * iter-85 — Annual Mailbox Statement.
 *
 * Branded full-page SSR report a member can print or save as PDF straight
 * from the browser. No PDF library dep — same print-to-PDF pattern the
 * thermal receipts use (/admin/inbound/receipt/[id], etc.).
 *
 * Sections:
 *  1. Hero — customer name + suite + year + run date
 *  2. Mail snapshot — total, breakdown (letters / packages / scans /
 *     forwards / picked-up / priority / junk-blocked) with CSS bar chart
 *  3. Top senders — top 5 ranked
 *  4. Wallet activity — total spent + total deposited
 *  5. Delivery & request summary
 *  6. Footer — bureau address + tax-doc disclaimer
 */

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getAnnualSummary } from "@/app/actions/annualSummary";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AnnualStatementPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 2020 || year > 2100) return notFound();

  const session = await verifySession();
  const [user, summary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true, suiteNumber: true, plan: true, mailboxAssignedAt: true },
    }),
    getAnnualSummary(year),
  ]);
  if (!user) return notFound();

  const runDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const ms = summary.mail;
  const maxCount = Math.max(ms.letters, ms.packages, ms.scanned, ms.forwarded, ms.pickedUp, ms.priority, ms.junk, 1);

  const breakdown: Array<{ label: string; n: number; color: string }> = [
    { label: "Letters",            n: ms.letters,   color: NOHO_BLUE },
    { label: "Packages",           n: ms.packages,  color: NOHO_BLUE_DEEP },
    { label: "Scanned for you",    n: ms.scanned,   color: "#0f766e" },
    { label: "Forwarded",          n: ms.forwarded, color: "#16A34A" },
    { label: "Picked up in person",n: ms.pickedUp,  color: "#15803d" },
    { label: "Marked priority",    n: ms.priority,  color: "#F5A623" },
    { label: "Junk-blocked",       n: ms.junk,      color: "#991b1b" },
  ];

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#efefe9",
        minHeight: "100vh",
        padding: "24px 12px",
        color: NOHO_INK,
      }}
    >
      <style>{`
        @page { size: Letter; margin: 0.5in; }
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .stmt-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          .stmt-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 720, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Link
          href="/dashboard?tab=annual"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2D100F22", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 12, background: "#fff" }}
        >
          ← Dashboard
        </Link>
        <PrintButton />
      </div>

      <div
        className="stmt-page"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "white",
          padding: "32px 36px",
          boxShadow: "0 6px 18px rgba(45,16,15,0.10)",
          border: "1px solid #2D100F1A",
          borderRadius: 8,
        }}
      >
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="stmt-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingBottom: 16, borderBottom: `2px solid ${NOHO_INK}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Image src="/brand/logo-trans.png" alt="NOHO Mailbox" width={64} height={36} style={{ height: 32, width: "auto", objectFit: "contain" }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
                Annual statement
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", color: NOHO_INK }}>
              {year}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 800, color: NOHO_INK }}>
              {user.name}
            </p>
            {user.suiteNumber && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
                Suite #{user.suiteNumber}{user.plan ? ` · ${user.plan}` : ""}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
              Generated
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: NOHO_INK }}>
              {runDate}
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
              Member since
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: NOHO_INK }}>
              {user.mailboxAssignedAt ? new Date(user.mailboxAssignedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* ── Snapshot ─────────────────────────────────────────── */}
        <div className="stmt-section" style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
            Mail snapshot
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 56, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: NOHO_INK }}>
            {ms.totalMail.toLocaleString()}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
            total mail items handled in {year}
          </p>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {breakdown.map((b) => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: NOHO_INK }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: b.color }}>{b.n}</span>
                </div>
                <div style={{ background: "rgba(45,16,15,0.06)", borderRadius: 999, height: 6, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(b.n / maxCount) * 100}%`,
                      height: "100%",
                      background: b.color,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top senders ──────────────────────────────────────── */}
        {summary.topSenders.length > 0 && (
          <div className="stmt-section" style={{ marginTop: 28 }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
              Your top 5 senders
            </p>
            <ol style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {summary.topSenders.map((s, i) => (
                <li
                  key={s.sender}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: i === 0 ? "rgba(51,116,133,0.08)" : "white",
                    border: `1px solid ${i === 0 ? "rgba(51,116,133,0.20)" : "#e8e5e0"}`,
                    marginTop: i === 0 ? 0 : 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: i === 0 ? NOHO_BLUE : "rgba(45,16,15,0.06)",
                        color: i === 0 ? "white" : NOHO_INK,
                        fontSize: 11,
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NOHO_INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.sender}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.65)" }}>
                    {s.count}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Wallet activity ──────────────────────────────────── */}
        <div className="stmt-section" style={{ marginTop: 28 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
            Wallet activity
          </p>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.20)" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#15803d" }}>
                Deposited
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#15803d" }}>
                {fmtCents(summary.wallet.totalDepositedCents)}
              </p>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(231,0,19,0.04)", border: "1px solid rgba(231,0,19,0.18)" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#991b1b" }}>
                Spent on services
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#991b1b" }}>
                {fmtCents(summary.wallet.totalSpentCents)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Deliveries + requests ────────────────────────────── */}
        <div className="stmt-section" style={{ marginTop: 28 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
            Delivery + service requests
          </p>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: "white", border: "1px solid #e8e5e0", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: NOHO_INK }}>{summary.deliveries.total}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>Deliveries</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>{fmtCents(summary.deliveries.totalSpend * 100)}</p>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: "white", border: "1px solid #e8e5e0", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: NOHO_INK }}>{summary.requests.scans}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>Scan requests</p>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: "white", border: "1px solid #e8e5e0", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: NOHO_INK }}>{summary.requests.forwards}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>Forward requests</p>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="stmt-section" style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${NOHO_INK}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: NOHO_INK, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            5062 Lankershim Blvd · NoHo, CA 91601
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(45,16,15,0.65)" }}>
            (818) 506-7744 · nohomailbox.org · Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm
          </p>
          <p style={{ margin: "16px 0 0", fontSize: 9.5, color: "rgba(45,16,15,0.45)", lineHeight: 1.5 }}>
            This document is an informational summary of your NOHO Mailbox activity for {year}. It is not a tax document. For payment receipts, please refer to your invoices or wallet history. Generated automatically from your account on {runDate}.
          </p>
        </div>
      </div>
    </div>
  );
}
