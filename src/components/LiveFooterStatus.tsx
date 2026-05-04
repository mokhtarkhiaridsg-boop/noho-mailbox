/**
 * Server component sub-tree for the footer's live status card.
 * Renders three live signals: open/closed (computed at request time),
 * today's mail intake count, and last courier run "ago" string.
 *
 * iter-90: Hours computation now reads from the editable operating-hours
 * config in SiteConfig instead of hardcoded windows. Holiday exceptions
 * are honored automatically.
 */
import { getFooterStats, timeAgo } from "@/lib/footer-stats";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { isOpenNow } from "@/lib/operating-hours";

export async function LiveFooterStatus() {
  const [stats, hours] = await Promise.all([getFooterStats(), getOperatingHours()]);
  const result = isOpenNow(hours);
  const dotColor =
    result.status === "open" ? "#16a34a"
    : result.status === "closing_soon" ? "#F5A623"
    : result.status === "break" ? "#F5A623"
    : result.status === "closed_holiday" ? "#E70013"
    : "#9CA3AF";
  const headline =
    result.status === "open" ? "Open now"
    : result.status === "closing_soon" ? "Closing soon"
    : result.status === "break" ? "On lunch"
    : result.status === "closed_holiday" ? `Closed · ${result.holiday?.label ?? "holiday"}`
    : "Closed";
  const sub =
    result.status === "open" || result.status === "closing_soon"
      ? `${result.todayLabel}${result.minutesUntilClose != null ? ` · closes in ${result.minutesUntilClose} min` : ""}`
      : result.status === "break"
      ? `Back shortly · ${result.todayLabel}`
      : result.status === "closed_holiday"
      ? (result.holiday?.note ?? "Reopens next business day")
      : `Today: ${result.todayLabel}`;
  const status = result.status === "open" || result.status === "closing_soon" ? "open"
    : result.status === "break" ? "lunch"
    : "closed";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(247,230,194,0.06)",
        border: "1px solid rgba(247,230,194,0.12)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          {status === "open" && (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-pulse-soft"
              style={{ background: dotColor }}
            />
          )}
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{
              background: dotColor,
              border: "1.5px solid rgba(247,230,194,0.6)",
            }}
          />
        </span>
        <p
          className="text-[12px] font-black uppercase tracking-[0.18em]"
          style={{
            color: "#FAFAF8",
            fontFamily: "var(--font-baloo), sans-serif",
          }}
        >
          {headline}
        </p>
      </div>
      <p
        className="text-[11px] mb-3"
        style={{ color: "rgba(250,250,248,0.55)" }}
      >
        {sub}
      </p>
      <div
        className="pt-3 space-y-1.5 text-[11px]"
        style={{
          borderTop: "1px solid rgba(250,250,248,0.08)",
          color: "rgba(250,250,248,0.55)",
        }}
      >
        {stats.todayIntake !== null && (
          <p>
            <span className="font-black" style={{ color: "#FAFAF8" }}>
              {stats.todayIntake.toLocaleString("en-US")}
            </span>{" "}
            {stats.todayIntake === 1 ? "mail item" : "mail items"} logged today
          </p>
        )}
        {stats.lastDeliveryAt && (
          <p>
            Last courier run{" "}
            <span className="font-black" style={{ color: "#FAFAF8" }}>
              {timeAgo(stats.lastDeliveryAt)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
