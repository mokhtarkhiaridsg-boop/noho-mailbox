import { verifyAdmin } from "@/lib/dal";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import { getDailyZReport } from "@/app/actions/pos";

export default async function ZReportPrintPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  await verifyAdmin();
  const { date } = await params;

  // Validate date format YYYY-MM-DD; otherwise default to today
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const data = await getDailyZReport(valid ? date : undefined);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const dateLabel = (() => {
    try {
      return new Date(`${data.dateYmd}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    } catch {
      return data.dateYmd;
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
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .row.bold { font-weight: 900; color: #2D100F; border-top: 1px solid #2D100F; padding-top: 3px; margin-top: 2px; font-size: 10pt; }
        .h { font-size: 7pt; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #666; margin: 8px 0 3px; }
      `}</style>

      <div className="no-print" style={{ maxWidth: "4in", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/admin?tab=register" style={{ fontSize: 12, color: "#337485", textDecoration: "none", fontWeight: 600 }}>
          ← Register
        </a>
        <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>4×6 thermal Z-Report</span>
        <PrintButton />
      </div>

      <div className="receipt-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingBottom: 6, borderBottom: "1.5px solid #2D100F" }}>
          <Image
            src="/brand/logo-trans.png"
            alt="NOHO Mailbox"
            width={596}
            height={343}
            priority
            style={{ height: 34, width: "auto" }}
          />
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", margin: 0, lineHeight: 1.2 }}>
              Z-Report<br />Station 1
            </p>
            <p style={{ fontSize: 7, fontWeight: 700, color: "#888", margin: "2px 0 0" }}>
              {data.dateYmd}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 4, paddingBottom: 4, borderBottom: "1px dashed #c9c4bc" }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: "#444", margin: 0, lineHeight: 1.35 }}>
            {dateLabel}<br />
            Generated {new Date(data.generatedAtIso).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>

        <div style={{ marginTop: 6 }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 1px" }}>
            Net Total
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#2D100F", letterSpacing: "-0.01em" }}>
            {fmt(data.totals.netCents)}{" "}
            <span style={{ fontSize: 8, fontWeight: 700, color: "#888" }}>USD</span>
          </p>
          <p style={{ fontSize: 7.5, color: "#888", margin: "2px 0 0" }}>
            {data.totals.saleCount} sale{data.totals.saleCount === 1 ? "" : "s"}
            {data.totals.voidCount > 0 ? ` · ${data.totals.voidCount} voided (${fmt(data.totals.voidedCents)})` : ""}
          </p>
        </div>

        <div className="h">Totals</div>
        <div className="row"><span>Gross</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(data.totals.grossCents)}</span></div>
        <div className="row"><span>Discounts</span><span style={{ fontVariantNumeric: "tabular-nums" }}>− {fmt(data.totals.discountCents)}</span></div>
        <div className="row"><span>Tax</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(data.totals.taxCents)}</span></div>
        <div className="row"><span>Tips</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(data.totals.tipCents)}</span></div>
        <div className="row bold"><span>Net</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(data.totals.netCents)}</span></div>

        <div className="h">By Method</div>
        {data.byMethod.length === 0 ? (
          <p style={{ fontSize: 8, color: "#888", margin: 0 }}>No sales today.</p>
        ) : data.byMethod.map((r) => (
          <div className="row" key={r.method}>
            <span>{r.method === "CardOnFile" ? "Card on File" : r.method} · {r.count}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.cents)}</span>
          </div>
        ))}

        <div className="h">By Category</div>
        {data.byCategory.length === 0 ? (
          <p style={{ fontSize: 8, color: "#888", margin: 0 }}>—</p>
        ) : data.byCategory.map((r) => (
          <div className="row" key={r.category}>
            <span>{r.category} · {r.quantity}×</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.cents)}</span>
          </div>
        ))}

        <div className="h">Top Items</div>
        {data.topItems.length === 0 ? (
          <p style={{ fontSize: 8, color: "#888", margin: 0 }}>—</p>
        ) : data.topItems.map((r) => (
          <div className="row" key={r.name}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.quantity}× {r.name}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.cents)}</span>
          </div>
        ))}

        <div className="h">Cashiers</div>
        {data.byCashier.length === 0 ? (
          <p style={{ fontSize: 8, color: "#888", margin: 0 }}>—</p>
        ) : data.byCashier.map((r) => (
          <div className="row" key={r.name}>
            <span>{r.name} · {r.count} ring{r.count === 1 ? "" : "s"}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.cents)}</span>
          </div>
        ))}

        <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1.5px solid #2D100F", textAlign: "center" }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", margin: 0 }}>
            — End of Z-Report —
          </p>
          <p style={{ fontSize: 6.5, color: "#888", margin: "2px 0 0" }}>
            5062 Lankershim Blvd · NoHo CA 91601 · (818) 506-7744
          </p>
        </div>
      </div>
    </div>
  );
}
