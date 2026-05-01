import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";

export default async function MailboxRenewalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const row = await ((prisma as unknown) as {
    mailboxRenewal: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        userId: string;
        termMonths: number;
        planAtRenewal: string;
        amountCents: number;
        paymentMethod: string;
        paidAt: Date;
        prevPlanDueDate: string | null;
        newPlanDueDate: string;
        receiptSentAt: Date | null;
        notes: string | null;
        createdAt: Date;
        user: { name: string; suiteNumber: string | null; email: string; phone: string | null } | null;
      } | null>;
    };
  }).mailboxRenewal.findUnique({
    where: { id },
    include: { user: { select: { name: true, suiteNumber: true, email: true, phone: true } } },
  });

  if (!row || !row.user) return notFound();

  const dollars = (row.amountCents / 100).toFixed(2);
  const paidStr = row.paidAt.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const dueStr = (() => {
    try {
      const [y, m, d] = row.newPlanDueDate.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return row.newPlanDueDate;
    }
  })();

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#efefe9",
        minHeight: "100vh",
        padding: "24px 12px",
        color: "#111",
      }}
    >
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .receipt-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
            width: 4in !important;
            min-height: 6in !important;
            padding: 0.18in !important;
            page-break-after: always;
          }
        }
        .receipt-card {
          width: 4in;
          min-height: 6in;
          margin: 0 auto;
          padding: 0.18in;
          background: white;
          border-radius: 4px;
          border: 1px solid #d8d4ce;
          box-shadow: 0 4px 18px rgba(0,0,0,0.06);
          font-size: 9pt;
          line-height: 1.35;
          color: #111;
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: "4in", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <a href="/admin" style={{ fontSize: 12, color: "#337485", textDecoration: "none", fontWeight: 600 }}>
          ← Admin
        </a>
        <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>4×6 thermal · email-friendly</span>
        <PrintButton />
      </div>

      <div className="receipt-card">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingBottom: 6, borderBottom: "1.5px solid #2D100F" }}>
          <Image
            src="/brand/logo-trans.png"
            alt="NOHO Mailbox"
            width={596}
            height={343}
            priority
            style={{ height: 36, width: "auto" }}
          />
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", margin: 0, lineHeight: 1.2 }}>
              Mailbox<br />Receipt
            </p>
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginTop: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 800, margin: 0, color: "#1a1714", lineHeight: 1.2 }}>
            {row.planAtRenewal} Plan
          </p>
          <p style={{ fontSize: 9, fontWeight: 600, margin: "1px 0 0", color: "#444" }}>
            {row.termMonths}-month renewal
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, margin: "5px 0 0", color: "#2D100F", letterSpacing: "-0.01em" }}>
            ${dollars}{" "}
            <span style={{ fontSize: 8, fontWeight: 700, color: "#888" }}>USD</span>
          </p>
          <p style={{ fontSize: 7.5, color: "#888", margin: "2px 0 0", lineHeight: 1.3 }}>
            Paid {paidStr} · {row.paymentMethod}
          </p>
        </div>

        {/* Customer */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
            Customer
          </p>
          <p style={{ fontSize: 11, fontWeight: 800, margin: 0, color: "#1a1714", lineHeight: 1.25 }}>
            {row.user.name}
            {row.user.suiteNumber && (
              <span style={{ color: "#337485", fontWeight: 700 }}> · Suite #{row.user.suiteNumber}</span>
            )}
          </p>
          <p style={{ fontSize: 8, margin: "1px 0 0", color: "#666", lineHeight: 1.3 }}>
            {row.user.email}
            {row.user.phone && <> · {row.user.phone}</>}
          </p>
        </div>

        {/* Plan box — emphasized */}
        <div style={{ marginTop: 8, padding: 8, background: "#FFF9F3", border: "1px solid #E8DDD0", borderRadius: 4 }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7A6050", margin: "0 0 3px" }}>
            New due date
          </p>
          <p style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "#2D100F", letterSpacing: "-0.01em" }}>
            {dueStr}
          </p>
          {row.prevPlanDueDate && (
            <p style={{ fontSize: 7.5, margin: "2px 0 0", color: "#7A6050" }}>
              Previously: {row.prevPlanDueDate}
            </p>
          )}
        </div>

        {/* Notes (admin internal note, optional) */}
        {row.notes && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
              Notes
            </p>
            <p style={{ fontSize: 8.5, margin: 0, color: "#333", lineHeight: 1.4 }}>{row.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1px solid #2D100F", fontSize: 6.5, color: "#888", lineHeight: 1.4 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#2D100F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            NOHO Mailbox · 5062 Lankershim Blvd · (818) 506-7744
          </p>
          <p style={{ margin: "1px 0 0", wordBreak: "break-all" }}>
            Receipt {row.id}
          </p>
          {row.receiptSentAt && (
            <p style={{ margin: "1px 0 0", color: "#16a34a", fontWeight: 700 }}>
              Emailed to customer {row.receiptSentAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
