import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "./PrintButton";

type Snapshot = {
  generatedAt?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  suiteNumber?: string | null;
  plan?: string | null;
  planTerm?: string | null;
  mailboxStatus?: string | null;
  kycStatus?: string | null;
  kycForm1583Url?: string | null;
  kycIdImageUrl?: string | null;
  kycIdImage2Url?: string | null;
  idPrimaryType?: string | null;
  idSecondaryType?: string | null;
  idPrimaryExpDate?: string | null;
  idSecondaryExpDate?: string | null;
  idPrimaryNumber?: string | null;
  idSecondaryNumber?: string | null;
  idPrimaryIssuer?: string | null;
  idSecondaryIssuer?: string | null;
  boxType?: string | null;
  businessName?: string | null;
  businessOwnerName?: string | null;
  businessOwnerRelation?: string | null;
  businessOwnerPhone?: string | null;
};

export default async function QuarterlyStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const s = await (prisma as unknown as {
    quarterlyStatement: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        userId: string;
        year: number;
        quarter: number;
        periodStart: string | null;
        periodEnd: string | null;
        notes: string | null;
        createdAt: Date;
      } | null>;
    };
  }).quarterlyStatement.findUnique({ where: { id } });

  if (!s) return notFound();

  const snap: Snapshot = s.notes ? (() => {
    try { return JSON.parse(s.notes!) as Snapshot; } catch { return {}; }
  })() : {};

  // Fall back to live data if the snapshot is missing fields
  const live = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { name: true, email: true, suiteNumber: true },
  });

  const display = {
    name: snap.name ?? live?.name ?? "(unknown)",
    email: snap.email ?? live?.email ?? "",
    suiteNumber: snap.suiteNumber ?? live?.suiteNumber ?? "—",
    phone: snap.phone ?? "",
    boxType: snap.boxType ?? "Personal",
    businessName: snap.businessName ?? "",
    businessOwnerName: snap.businessOwnerName ?? "",
    businessOwnerRelation: snap.businessOwnerRelation ?? "",
    businessOwnerPhone: snap.businessOwnerPhone ?? "",
    plan: snap.plan ?? "—",
    planTerm: snap.planTerm ?? "",
    mailboxStatus: snap.mailboxStatus ?? "",
    kycStatus: snap.kycStatus ?? "",
    kycForm1583Url: snap.kycForm1583Url ?? "",
    kycIdImageUrl: snap.kycIdImageUrl ?? "",
    kycIdImage2Url: snap.kycIdImage2Url ?? "",
    idPrimaryType: snap.idPrimaryType ?? "",
    idSecondaryType: snap.idSecondaryType ?? "",
    idPrimaryExpDate: snap.idPrimaryExpDate ?? "",
    idSecondaryExpDate: snap.idSecondaryExpDate ?? "",
    idPrimaryNumber: snap.idPrimaryNumber ?? "",
    idSecondaryNumber: snap.idSecondaryNumber ?? "",
    idPrimaryIssuer: snap.idPrimaryIssuer ?? "",
    idSecondaryIssuer: snap.idSecondaryIssuer ?? "",
    generatedAt: snap.generatedAt ?? s.createdAt.toISOString(),
  };

  const Q = `Q${s.quarter} ${s.year}`;
  const period = `${s.periodStart ?? "—"} → ${s.periodEnd ?? "—"}`;

  function row(label: string, value: string | null | undefined) {
    return (
      <tr>
        <td
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #e5e5e5",
            color: "#555",
            width: "40%",
            verticalAlign: "top",
            fontSize: 13,
          }}
        >
          {label}
        </td>
        <td
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #e5e5e5",
            color: "#111",
            fontSize: 13,
            fontWeight: 500,
            wordBreak: "break-word",
          }}
        >
          {value && value !== "" ? value : <span style={{ color: "#aaa" }}>—</span>}
        </td>
      </tr>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#f8f7f4",
        minHeight: "100vh",
        padding: "32px 16px",
        color: "#111",
      }}
    >
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "white",
          padding: 36,
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <a
            href="/admin"
            style={{ fontSize: 13, color: "#337485", textDecoration: "none" }}
          >
            ← Back to admin
          </a>
          <PrintButton />
        </div>

        {/* Header */}
        <div
          style={{
            paddingBottom: 18,
            borderBottom: "2px solid #2D100F",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <Image
              src="/brand/logo-trans.png"
              alt="NOHO Mailbox"
              width={596}
              height={343}
              priority
              style={{ height: 56, width: "auto" }}
            />
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#337485",
                margin: 0,
                textAlign: "right",
                lineHeight: 1.5,
              }}
            >
              Quarterly<br />Statement
            </p>
          </div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#337485",
              margin: 0,
            }}
          >
            CMRA Compliance Record
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: "6px 0 4px",
              color: "#1a1714",
            }}
          >
            {Q} · {display.name}
          </h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            Period {period} · Suite #{display.suiteNumber}
          </p>
          <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>
            NOHO Mailbox · 5062 Lankershim Blvd, North Hollywood, CA 91601 ·
            (818) 506-7744
          </p>
        </div>

        {/* Customer */}
        <h2
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#666",
            margin: "0 0 8px",
          }}
        >
          Customer
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 22,
          }}
        >
          <tbody>
            {row("Name", display.name)}
            {row("Email", display.email)}
            {row("Phone", display.phone)}
            {row("Suite #", display.suiteNumber)}
            {row("Plan", `${display.plan}${display.planTerm ? ` (${display.planTerm} mo)` : ""}`)}
            {row("Mailbox Status", display.mailboxStatus)}
          </tbody>
        </table>

        {/* Box type / Business */}
        <h2
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#666",
            margin: "0 0 8px",
          }}
        >
          Box Ownership
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 22,
          }}
        >
          <tbody>
            {row("Box Type", display.boxType)}
            {display.boxType === "Business" && (
              <>
                {row("Business Name", display.businessName)}
                {row("Owner / Officer", display.businessOwnerName)}
                {row("Role / Relation", display.businessOwnerRelation)}
                {row("Owner Phone", display.businessOwnerPhone)}
              </>
            )}
          </tbody>
        </table>

        {/* IDs */}
        <h2
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#666",
            margin: "0 0 8px",
          }}
        >
          Identification On File
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 22,
          }}
        >
          <tbody>
            {row("KYC Status", display.kycStatus)}
            {row(
              "USPS Form 1583",
              display.kycForm1583Url ? "On file ✓" : "Not on file",
            )}
            {row(
              "Primary ID — Type",
              display.idPrimaryType || (display.kycIdImageUrl ? "On file" : "Not on file"),
            )}
            {row("Primary ID — Number", display.idPrimaryNumber)}
            {row("Primary ID — Issuer", display.idPrimaryIssuer)}
            {row("Primary ID — Expiration", display.idPrimaryExpDate)}
            {row(
              "Second ID — Type",
              display.idSecondaryType || (display.kycIdImage2Url ? "On file" : "Not on file"),
            )}
            {row("Second ID — Number", display.idSecondaryNumber)}
            {row("Second ID — Issuer", display.idSecondaryIssuer)}
            {row("Second ID — Expiration", display.idSecondaryExpDate)}
          </tbody>
        </table>

        {/* Footer / certification */}
        <div
          style={{
            marginTop: 30,
            paddingTop: 18,
            borderTop: "1px solid #e5e5e5",
            fontSize: 11,
            color: "#777",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>CMRA Certification:</strong> This statement is an
            auto-generated record of the customer&apos;s file with NOHO Mailbox
            as of {new Date(display.generatedAt).toLocaleString()}. It is
            retained per USPS DMM 508.1.8 and CA B&amp;P Code §17538.5.
          </p>
          <p style={{ margin: 0 }}>
            Generated automatically by NOHO Mailbox · Statement ID:{" "}
            <code style={{ color: "#337485" }}>{s.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
