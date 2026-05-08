/**
 * iter-133 — Wallet Ledger Statement (Tier 8 #46).
 *
 * Branded full-page SSR statement of every wallet transaction with a
 * running balance column. Member opens it from the wallet panel; the
 * page renders, the user clicks Print (or hits ⌘P) and the browser
 * Save-as-PDF flow takes over. Same print-to-PDF pattern the annual
 * statement and thermal receipts use — no PDF library dep, ledger
 * lives as raw HTML for accessibility + email-attachment use cases.
 *
 * Sections:
 *   1. Hero — member name, suite, plan, generated date, period
 *   2. Summary tiles — opening / closing / credited / debited
 *   3. Full transaction table — date, type pill, description,
 *      amount (signed), running balance (sorted DESC)
 *   4. Footer — bureau address + disclaimer
 *
 * Optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params restrict the
 * window. Default = full lifetime ledger.
 */

import { verifySession } from "@/lib/dal";
import { getWalletLedger } from "@/app/actions/walletLedger";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_GREEN = "#15803d";
const NOHO_RED = "#991b1b";

function fmtCents(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function fmtCentsRaw(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function kindStyle(kind: string): { bg: string; fg: string; label: string } {
  // Friendly label + color per WalletTransaction.kind.
  switch (kind) {
    case "TopUp":          return { bg: "rgba(22,163,74,0.10)",  fg: NOHO_GREEN,    label: "Top-up" };
    case "Refund":         return { bg: "rgba(22,163,74,0.10)",  fg: NOHO_GREEN,    label: "Refund" };
    case "DepositRefund":  return { bg: "rgba(34,197,94,0.10)",  fg: NOHO_GREEN,    label: "Deposit refund" };
    case "DepositCharge":  return { bg: "rgba(231,0,19,0.06)",   fg: NOHO_RED,      label: "Deposit charge" };
    case "Charge":         return { bg: "rgba(45,16,15,0.08)",   fg: NOHO_INK,      label: "Charge" };
    default:               return { bg: "rgba(45,16,15,0.06)",   fg: NOHO_INK,      label: kind };
  }
}

export default async function WalletLedgerStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await verifySession();
  const params = await searchParams;
  const fromIso = params.from ? new Date(params.from).toISOString() : undefined;
  const toIso = params.to ? new Date(params.to).toISOString() : undefined;

  let ledger;
  try {
    ledger = await getWalletLedger({ fromIso, toIso });
  } catch {
    return notFound();
  }

  const { user, entries, summary, generatedAt } = ledger;

  const periodLabel = (() => {
    if (summary.entryCount === 0) {
      return "No activity yet";
    }
    const earliestStr = summary.earliestAt ? fmtDate(summary.earliestAt) : "—";
    const latestStr = summary.latestAt ? fmtDate(summary.latestAt) : "—";
    if (earliestStr === latestStr) return earliestStr;
    return `${earliestStr} – ${latestStr}`;
  })();

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
          .ledger-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          .ledger-section { page-break-inside: avoid; }
          .ledger-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div
        className="no-print"
        style={{
          maxWidth: 880,
          margin: "0 auto 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Link
          href="/dashboard?tab=wallet"
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #2D100F22",
            color: NOHO_INK,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 12,
            background: "#fff",
          }}
        >
          ← Back to wallet
        </Link>
        <PrintButton />
      </div>

      <div
        className="ledger-page"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          background: "white",
          padding: "32px 36px",
          boxShadow: "0 6px 18px rgba(45,16,15,0.10)",
          border: "1px solid #2D100F1A",
          borderRadius: 8,
        }}
      >
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div
          className="ledger-section"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingBottom: 16,
            borderBottom: `2px solid ${NOHO_INK}`,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Image
                src="/brand/logo-trans.png"
                alt="NOHO Mailbox"
                width={64}
                height={36}
                style={{ height: 32, width: "auto", objectFit: "contain" }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.20em",
                  textTransform: "uppercase",
                  color: NOHO_BLUE_DEEP,
                }}
              >
                Wallet statement
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: NOHO_INK,
              }}
            >
              {periodLabel}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 800, color: NOHO_INK }}>
              {user.name}
            </p>
            {user.suiteNumber && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)" }}>
                Suite #{user.suiteNumber}
                {user.plan ? ` · ${user.plan}` : ""}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(45,16,15,0.55)",
              }}
            >
              Generated
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: NOHO_INK }}>
              {fmtDateTime(generatedAt)}
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(45,16,15,0.55)",
              }}
            >
              Member since
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: NOHO_INK }}>
              {user.mailboxAssignedAt
                ? new Date(user.mailboxAssignedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {/* ── Summary tiles ────────────────────────────────────── */}
        <div
          className="ledger-section"
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "rgba(45,16,15,0.04)",
              border: "1px solid rgba(45,16,15,0.10)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(45,16,15,0.55)",
              }}
            >
              Opening balance
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: NOHO_INK }}>
              {fmtCentsRaw(summary.openingBalanceCents)}
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.20)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: NOHO_GREEN,
              }}
            >
              Credited (in)
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: NOHO_GREEN }}>
              +{fmtCentsRaw(summary.totalCreditedCents)}
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "rgba(231,0,19,0.04)",
              border: "1px solid rgba(231,0,19,0.18)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: NOHO_RED,
              }}
            >
              Debited (out)
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: NOHO_RED }}>
              −{fmtCentsRaw(summary.totalDebitedCents)}
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "rgba(51,116,133,0.06)",
              border: "1px solid rgba(51,116,133,0.20)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: NOHO_BLUE_DEEP,
              }}
            >
              Closing balance
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: NOHO_BLUE_DEEP }}>
              {fmtCentsRaw(summary.closingBalanceCents)}
            </p>
          </div>
        </div>

        {/* ── Net change strip ─────────────────────────────────── */}
        <div
          className="ledger-section"
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(45,16,15,0.03)",
            border: "1px solid rgba(45,16,15,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(45,16,15,0.55)",
            }}
          >
            Net change · {summary.entryCount} {summary.entryCount === 1 ? "entry" : "entries"}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: summary.netChangeCents >= 0 ? NOHO_GREEN : NOHO_RED,
            }}
          >
            {summary.netChangeCents >= 0 ? "+" : "−"}
            {fmtCentsRaw(Math.abs(summary.netChangeCents))}
          </span>
        </div>

        {/* ── Transaction table ────────────────────────────────── */}
        <div className="ledger-section" style={{ marginTop: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: NOHO_BLUE_DEEP,
            }}
          >
            Transaction detail
          </p>
          {entries.length === 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: "30px 18px",
                borderRadius: 10,
                background: "rgba(45,16,15,0.03)",
                border: "1px dashed rgba(45,16,15,0.18)",
                textAlign: "center",
                color: "rgba(45,16,15,0.55)",
                fontSize: 12,
              }}
            >
              No wallet activity in this period.
            </div>
          ) : (
            <table
              className="ledger-table"
              style={{
                marginTop: 12,
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11.5,
              }}
            >
              <thead>
                <tr style={{ background: "rgba(45,16,15,0.04)" }}>
                  <th style={th()}>Date</th>
                  <th style={th()}>Type</th>
                  <th style={th()}>Description</th>
                  <th style={{ ...th(), textAlign: "right" }}>Amount</th>
                  <th style={{ ...th(), textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const ks = kindStyle(e.kind);
                  const isCredit = e.amountCents >= 0;
                  return (
                    <tr
                      key={e.id}
                      style={{ borderBottom: "1px solid rgba(45,16,15,0.06)" }}
                    >
                      <td style={td()}>{fmtDate(e.createdAt)}</td>
                      <td style={td()}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            background: ks.bg,
                            color: ks.fg,
                          }}
                        >
                          {ks.label}
                        </span>
                      </td>
                      <td style={{ ...td(), color: "rgba(45,16,15,0.75)" }}>
                        {e.description}
                      </td>
                      <td
                        style={{
                          ...td(),
                          textAlign: "right",
                          fontWeight: 800,
                          color: isCredit ? NOHO_GREEN : NOHO_RED,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {isCredit ? "+" : "−"}
                        {fmtCentsRaw(Math.abs(e.amountCents))}
                      </td>
                      <td
                        style={{
                          ...td(),
                          textAlign: "right",
                          fontWeight: 700,
                          color: NOHO_INK,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtCents(e.balanceAfterCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div
          className="ledger-section"
          style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${NOHO_INK}` }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 800,
              color: NOHO_INK,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            5062 Lankershim Blvd · NoHo, CA 91601
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(45,16,15,0.65)" }}>
            (818) 506-7744 · nohomailbox.org · Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm
          </p>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 9.5,
              color: "rgba(45,16,15,0.45)",
              lineHeight: 1.5,
            }}
          >
            Wallet statement for {user.name} ({user.email}). Each row reflects an
            individual posting against your prepaid wallet. Balance column shows
            running balance after each transaction. This is an informational
            ledger — not a tax document. For payment receipts please refer to
            your individual invoices. Generated automatically on{" "}
            {fmtDateTime(generatedAt)}.
          </p>
        </div>
      </div>
    </div>
  );
}

function th(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(45,16,15,0.55)",
    borderBottom: "1px solid rgba(45,16,15,0.10)",
  };
}

function td(): React.CSSProperties {
  return {
    padding: "10px",
    color: NOHO_INK,
    verticalAlign: "top",
  };
}
