import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import { ZELLE_RECIPIENT_EMAIL } from "@/lib/pos";

export default async function POSReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const sale = await ((prisma as unknown) as {
    pOSSale: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        number: number;
        cashierName: string | null;
        customerName: string | null;
        customerSuite: string | null;
        customerEmail: string | null;
        customerPhone: string | null;
        subtotalCents: number;
        discountCents: number;
        taxCents: number;
        tipCents: number;
        totalCents: number;
        cashTenderedCents: number | null;
        cashChangeCents: number | null;
        paymentMethod: string;
        customMethodLabel: string | null;
        paymentRef: string | null;
        zelleEmail: string | null;
        status: string;
        paidAt: Date | null;
        notes: string | null;
        createdAt: Date;
        items: Array<{
          id: string;
          name: string;
          category: string | null;
          unitPriceCents: number;
          quantity: number;
          discountCents: number;
          totalCents: number;
        }>;
      } | null>;
    };
  }).pOSSale.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!sale) return notFound();

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const paidStr = (sale.paidAt ?? sale.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const methodLabel =
    sale.paymentMethod === "Custom"
      ? `Custom · ${sale.customMethodLabel ?? "—"}`
      : sale.paymentMethod === "CardOnFile"
        ? "Card on File"
        : sale.paymentMethod;

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
        <a href="/admin?tab=register" style={{ fontSize: 12, color: "#337485", textDecoration: "none", fontWeight: 600 }}>
          ← Register
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
              Sales<br />Receipt
            </p>
            <p style={{ fontSize: 7, fontWeight: 700, color: "#888", margin: "2px 0 0" }}>
              #{String(sale.number).padStart(5, "0")}
            </p>
          </div>
        </div>

        {/* Store address */}
        <div style={{ marginTop: 4, paddingBottom: 4, borderBottom: "1px dashed #c9c4bc" }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: "#444", margin: 0, lineHeight: 1.35 }}>
            5062 Lankershim Blvd · North Hollywood, CA 91601<br />
            (818) 506-7744 · nohomailbox.org
          </p>
        </div>

        {/* Voided banner */}
        {sale.status === "Voided" && (
          <div style={{ marginTop: 6, background: "#5a1d1c", color: "#ffd5d2", padding: "4px 8px", textAlign: "center", fontWeight: 800, fontSize: 9, letterSpacing: "0.2em" }}>
            ★ VOIDED ★
          </div>
        )}

        {/* Total + paid */}
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 1px" }}>
            Total Paid
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#2D100F", letterSpacing: "-0.01em" }}>
            {fmt(sale.totalCents)}{" "}
            <span style={{ fontSize: 8, fontWeight: 700, color: "#888" }}>USD</span>
          </p>
          <p style={{ fontSize: 7.5, color: "#888", margin: "2px 0 0", lineHeight: 1.3 }}>
            {paidStr} · {methodLabel}
            {sale.paymentRef ? ` · ref ${sale.paymentRef}` : ""}
          </p>
        </div>

        {/* Customer */}
        {sale.customerName && (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
              Customer
            </p>
            <p style={{ fontSize: 10, fontWeight: 800, margin: 0, color: "#1a1714", lineHeight: 1.25 }}>
              {sale.customerName}
              {sale.customerSuite && (
                <span style={{ color: "#337485", fontWeight: 700 }}> · Suite #{sale.customerSuite}</span>
              )}
            </p>
            {sale.customerEmail && (
              <p style={{ fontSize: 7.5, color: "#666", margin: "1px 0 0" }}>{sale.customerEmail}</p>
            )}
          </div>
        )}

        {/* Line items */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 4px" }}>
            Items
          </p>
          {sale.items.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, margin: 0, color: "#1a1714", lineHeight: 1.25 }}>
                  {it.name}
                </p>
                <p style={{ fontSize: 7, color: "#888", margin: 0, lineHeight: 1.2 }}>
                  {it.quantity} × {fmt(it.unitPriceCents)}
                  {it.discountCents > 0 ? ` · disc ${fmt(it.discountCents)}` : ""}
                </p>
              </div>
              <p style={{ fontSize: 9, fontWeight: 800, margin: 0, color: "#1a1714", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {fmt(it.totalCents)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px dashed #c9c4bc", fontSize: 8, color: "#444" }}>
          <Row k="Subtotal" v={fmt(sale.subtotalCents)} />
          {sale.discountCents > 0 && <Row k="Discount" v={`− ${fmt(sale.discountCents)}`} />}
          {sale.taxCents > 0 && <Row k="Tax" v={fmt(sale.taxCents)} />}
          {sale.tipCents > 0 && <Row k="Tip" v={fmt(sale.tipCents)} />}
          <Row k="Total" v={fmt(sale.totalCents)} bold />
          {sale.cashTenderedCents != null && (
            <>
              <Row k="Cash tendered" v={fmt(sale.cashTenderedCents)} />
              <Row k="Change" v={fmt(sale.cashChangeCents ?? 0)} />
            </>
          )}
        </div>

        {/* Method-specific footer */}
        {sale.paymentMethod === "Zelle" && (
          <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px dashed #c9c4bc", fontSize: 7.5, color: "#1a3a6a", lineHeight: 1.4 }}>
            Paid by Zelle to <b>{sale.zelleEmail ?? ZELLE_RECIPIENT_EMAIL}</b>
            {sale.paymentRef ? <> · confirm <b>{sale.paymentRef}</b></> : null}
          </div>
        )}

        {/* Customer signature — only when notes contains SIGNATURE: prefix */}
        {sale.notes && sale.notes.startsWith("SIGNATURE:") && (
          <div style={{ marginTop: 8, paddingTop: 5, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
              Customer Signature
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sale.notes.slice("SIGNATURE:".length)}
              alt="Customer signature"
              style={{
                display: "block",
                width: "100%",
                maxHeight: 50,
                objectFit: "contain",
                border: "1px solid #d8d4ce",
                borderRadius: 2,
                background: "white",
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1.5px solid #2D100F", textAlign: "center" }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", margin: 0 }}>
            Thank you for choosing NOHO Mailbox
          </p>
          <p style={{ fontSize: 6.5, color: "#888", margin: "2px 0 0" }}>
            Returns within 30 days with this receipt · Mailbox renewals non-refundable after 7 days
          </p>
          {sale.cashierName && (
            <p style={{ fontSize: 6.5, color: "#aaa", margin: "3px 0 0" }}>
              Rang up by {sale.cashierName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 900 : 600, color: bold ? "#2D100F" : "#444", fontSize: bold ? 10 : 8, marginTop: bold ? 2 : 0, paddingTop: bold ? 3 : 0, borderTop: bold ? "1px solid #2D100F" : "none" }}>
      <span>{k}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}
