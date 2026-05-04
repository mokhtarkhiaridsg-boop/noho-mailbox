import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  computeInvoiceTotals,
  type InvoiceMeta,
} from "@/lib/invoice-builder";
import PrintButton from "./PrintButton";

/**
 * Printable invoice page — auto-prints on load via window.print(), but stays
 * usable as a "preview" if the user cancels the dialog. 8.5×11 letter layout
 * with @page rules so it fits cleanly on a single page when possible.
 *
 * Hidden lines are excluded — admin sees them only inside the builder.
 */
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, phone: true, suiteNumber: true } } },
  });
  if (!inv) notFound();
  const meta: InvoiceMeta = inv.meta ? JSON.parse(inv.meta) : { lines: [] };
  const totals = computeInvoiceTotals(meta);
  const visible = (meta.lines ?? []).filter((l) => !l.hidden);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "—";

  const recipientName = meta.recipientName || inv.user?.name || "Customer";
  const recipientEmail = meta.recipientEmail || inv.user?.email || "";

  const status = inv.status.toUpperCase();
  const statusColors: Record<string, { bg: string; fg: string }> = {
    PAID: { bg: "#DCFCE7", fg: "#166534" },
    SENT: { bg: "#FEF3C7", fg: "#7C2D12" },
    DRAFT: { bg: "#F3F3F3", fg: "#5C4540" },
    VOID: { bg: "#FEE2E2", fg: "#7F1D1D" },
  };
  const statusStyle = statusColors[status] ?? statusColors.DRAFT;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F8F2EA",
        padding: "32px 16px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#2D100F",
      }}
    >
      {/* Auto-print only when query string ?print=1 is set, so admins can preview */}
      {/* PrintTrigger logic was merged into PrintButton's useEffect. */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "white",
          border: "1px solid #E8DDD0",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 14px rgba(45,16,15,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#F7E6C2",
            padding: "28px 36px",
            borderBottom: "1px solid #E8DDD0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#337485",
              }}
            >
              Invoice
            </p>
            <h1
              style={{
                margin: "6px 0 0",
                fontSize: 28,
                fontWeight: 900,
                color: "#2D100F",
                letterSpacing: "-0.01em",
              }}
            >
              {inv.number}
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.10em",
                background: statusStyle.bg,
                color: statusStyle.fg,
              }}
            >
              {status}
            </span>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#5C4540" }}>
              Issued {fmtDate(inv.createdAt)}
              {inv.dueAt && (
                <>
                  <br />
                  Due {fmtDate(inv.dueAt)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 36px" }}>
          <table style={{ width: "100%", marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top", width: "50%" }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#A89484",
                    }}
                  >
                    From
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#2D100F", lineHeight: 1.55, fontWeight: 700 }}>
                    NOHO Mailbox
                    <br />
                    5062 Lankershim Blvd
                    <br />
                    North Hollywood, CA 91601
                    <br />
                    (818) 506-7744
                  </p>
                </td>
                <td style={{ verticalAlign: "top", width: "50%" }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#A89484",
                    }}
                  >
                    Bill to
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#2D100F", lineHeight: 1.55, fontWeight: 700 }}>
                    {recipientName}
                    {recipientEmail && (
                      <>
                        <br />
                        {recipientEmail}
                      </>
                    )}
                    {inv.user?.suiteNumber && (
                      <>
                        <br />
                        Suite #{inv.user.suiteNumber}
                      </>
                    )}
                    {meta.billTo && (
                      <>
                        <br />
                        {meta.billTo.split("\n").map((line, i) => (
                          <span key={i}>
                            {line}
                            <br />
                          </span>
                        ))}
                      </>
                    )}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ margin: "0 0 14px", fontSize: 14, color: "#5C4540" }}>{inv.description}</p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={tableHead("left")}>Description</th>
                <th style={{ ...tableHead("center"), width: 60 }}>Qty</th>
                <th style={{ ...tableHead("right"), width: 80 }}>Unit</th>
                <th style={{ ...tableHead("right"), width: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "#A89484" }}>
                    No line items.
                  </td>
                </tr>
              ) : (
                visible.map((l) => {
                  const lineGross = Math.round(l.qty * l.unitPriceCents);
                  const lineNet = lineGross - (l.discountCents ?? 0);
                  return (
                    <tr key={l.id}>
                      <td style={tableCell("left")}>
                        {l.description}
                        {l.discountCents ? (
                          <div style={{ fontSize: 11, color: "#A89484", marginTop: 2 }}>Discount: −{fmt(l.discountCents)}</div>
                        ) : null}
                        {l.taxable === false ? (
                          <div style={{ fontSize: 11, color: "#A89484", marginTop: 2 }}>Tax-exempt</div>
                        ) : null}
                      </td>
                      <td style={tableCell("center")}>{l.qty}</td>
                      <td style={tableCell("right")}>{fmt(l.unitPriceCents)}</td>
                      <td style={{ ...tableCell("right"), fontWeight: 700, color: "#2D100F" }}>{fmt(lineNet)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%" }} />
                <td style={{ paddingTop: 14 }}>
                  <table cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 12px", fontSize: 13, color: "#5C4540", textAlign: "right" }}>
                          Subtotal
                        </td>
                        <td style={{ padding: "4px 0", fontSize: 13, color: "#2D100F", textAlign: "right", width: 90 }}>
                          {fmt(totals.subtotalVisible)}
                        </td>
                      </tr>
                      {totals.discount > 0 && (
                        <tr>
                          <td style={{ padding: "4px 12px", fontSize: 13, color: "#5C4540", textAlign: "right" }}>
                            Discount
                          </td>
                          <td style={{ padding: "4px 0", fontSize: 13, color: "#7F1D1D", textAlign: "right" }}>
                            −{fmt(totals.discount)}
                          </td>
                        </tr>
                      )}
                      {totals.tax > 0 && (
                        <tr>
                          <td style={{ padding: "4px 12px", fontSize: 13, color: "#5C4540", textAlign: "right" }}>
                            Tax{meta.taxRate ? ` (${(meta.taxRate * 100).toFixed((meta.taxRate * 100) % 1 === 0 ? 0 : 2)}%)` : ""}
                          </td>
                          <td style={{ padding: "4px 0", fontSize: 13, color: "#2D100F", textAlign: "right" }}>
                            {fmt(totals.tax)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td
                          style={{
                            padding: "8px 12px 0",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#2D100F",
                            textAlign: "right",
                            borderTop: "1px solid #E8DDD0",
                          }}
                        >
                          Total
                        </td>
                        <td
                          style={{
                            padding: "8px 0 0",
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#2D100F",
                            textAlign: "right",
                            borderTop: "1px solid #E8DDD0",
                          }}
                        >
                          {fmt(totals.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {meta.notes && (
            <div
              style={{
                marginTop: 20,
                padding: "12px 14px",
                background: "#F8F2EA",
                border: "1px solid #E8DDD0",
                borderRadius: 12,
                fontSize: 12,
                color: "#5C4540",
                whiteSpace: "pre-wrap",
              }}
            >
              {meta.notes}
            </div>
          )}

          {meta.paidVia && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: "#DCFCE7",
                border: "1px solid rgba(34,197,94,0.30)",
                borderRadius: 10,
                fontSize: 12,
                color: "#166534",
                fontWeight: 700,
              }}
            >
              Paid via {meta.paidVia}
              {meta.paidRef ? ` · ${meta.paidRef}` : ""}
              {inv.paidAt ? ` · ${fmtDate(inv.paidAt)}` : ""}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            background: "#F7E6C2",
            padding: "16px 36px",
            borderTop: "1px solid #E8DDD0",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: "#5C4540" }}>
            Thank you for your business. Questions?{" "}
            <a href="mailto:nohomailbox@gmail.com" style={{ color: "#337485", fontWeight: 700, textDecoration: "none" }}>
              nohomailbox@gmail.com
            </a>{" "}
            ·{" "}
            <a href="tel:+18185067744" style={{ color: "#337485", fontWeight: 700, textDecoration: "none" }}>
              (818) 506-7744
            </a>
          </p>
        </div>
      </div>

      {/* Admin-only print toolbar — hidden in @media print */}
      <div
        className="no-print"
        style={{
          maxWidth: 720,
          margin: "20px auto 0",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <PrintButton />
        <a
          href="/admin?tab=billing"
          style={{
            padding: "10px 18px",
            borderRadius: 14,
            background: "white",
            color: "#2D100F",
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            textDecoration: "none",
            border: "1px solid #E8DDD0",
          }}
        >
          ← Back to billing
        </a>
      </div>

      <style>{`
        @media print {
          body, main { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
        @page { size: letter; margin: 0.5in; }
      `}</style>
    </main>
  );
}

function tableHead(align: "left" | "center" | "right"): React.CSSProperties {
  return {
    padding: "8px 0",
    borderBottom: "2px solid #2D100F",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#2D100F",
    textAlign: align,
  };
}
function tableCell(align: "left" | "center" | "right"): React.CSSProperties {
  return {
    padding: "10px 0",
    borderBottom: "1px solid #E8DDD0",
    fontSize: 13,
    color: "#5C4540",
    textAlign: align,
  };
}

// PrintButton + auto-print trigger live in their own client component
// (PrintButton.tsx) so this page can stay a Server Component and access
// the database directly via verifyAdmin / prisma.
