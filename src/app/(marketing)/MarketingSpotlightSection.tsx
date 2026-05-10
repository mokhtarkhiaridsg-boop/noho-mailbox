// iter-169 — Public homepage spotlight for the current Customer of the
// Month. Server-component (RSC) — fetches the most recent published
// MarketingSpotlightView at request time. Renders nothing when no
// member has opted in.

import { getCurrentMarketingSpotlight } from "@/app/actions/cotmMarketingSlot";

export default async function MarketingSpotlightSection() {
  const v = await getCurrentMarketingSpotlight();
  if (!v) return null;

  return (
    <section
      className="py-16 px-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #F7E6C2 0%, #FFF5DC 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: "rgba(245,166,35,0.12)",
              color: "#92400e",
              border: "1px solid rgba(245,166,35,0.30)",
            }}
          >
            ★ Customer of the Month · {v.monthLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "#2D100F", letterSpacing: "-0.02em" }}>
            Meet a NOHO Mailbox member
          </h2>
        </div>

        <article
          className="rounded-3xl p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center"
          style={{
            background: "white",
            border: "1px solid rgba(45,16,15,0.08)",
            boxShadow: "0 12px 32px rgba(45,16,15,0.10)",
          }}
        >
          {v.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.photoUrl}
              alt={`${v.businessName} — ${v.userName}`}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover mx-auto sm:mx-0"
              style={{ border: "3px solid #F5A623", boxShadow: "0 8px 22px rgba(245,166,35,0.30)" }}
            />
          ) : (
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl mx-auto sm:mx-0 grid place-items-center"
              style={{
                background: "linear-gradient(135deg, #F5A623, #F5C242)",
                fontSize: 56,
              }}
              aria-hidden
            >
              🌟
            </div>
          )}
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#92400e" }}>
              {v.userName}
            </p>
            <h3 className="text-2xl sm:text-3xl font-black mt-1" style={{ color: "#2D100F", letterSpacing: "-0.01em" }}>
              {v.businessName}
            </h3>
            <blockquote
              className="mt-4 text-lg sm:text-xl italic"
              style={{
                color: "#3A1816",
                lineHeight: 1.5,
                borderLeft: "4px solid #F5A623",
                paddingLeft: 16,
              }}
            >
              “{v.quote}”
            </blockquote>
            {v.websiteUrl && (
              <a
                href={v.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-bold rounded-full px-3 py-1.5"
                style={{
                  background: "#23596A",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                Visit {v.businessName} →
              </a>
            )}
          </div>
        </article>

        <p className="mt-6 text-center text-[11.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Every month we celebrate one member who's done something exceptional. Want to be featured?{" "}
          <a href="/dashboard" style={{ color: "#23596A", fontWeight: 700 }}>Sign in</a> &amp; opt in.
        </p>
      </div>
    </section>
  );
}
