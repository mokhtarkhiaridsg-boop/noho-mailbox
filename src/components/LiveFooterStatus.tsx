/**
 * Server component sub-tree for the footer's live status card.
 * Renders three live signals: open/closed (computed at request time),
 * today's mail intake count, and last courier run "ago" string.
 *
 * Updates per-request (which on Vercel = roughly per-CDN-revalidation —
 * good enough for an ambient signal at the bottom of the page).
 */
import { getFooterStats, timeAgo } from "@/lib/footer-stats";

type Status = "open" | "lunch" | "closed";

function nowInLA(): { day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = dayMap[get("weekday")] ?? 0;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { day, hour, minute };
}

function computeStatus(): { status: Status; sub: string } {
  const { day, hour, minute } = nowInLA();
  const m = hour * 60 + minute;
  if (day >= 1 && day <= 5) {
    if (m < 570) return { status: "closed", sub: "opens 9:30 am" };
    if (m < 810) return { status: "open", sub: "lunch break 1:30–2 pm" };
    if (m < 840) return { status: "lunch", sub: "back at 2:00 pm" };
    if (m < 1050) return { status: "open", sub: "closes 5:30 pm" };
    return { status: "closed", sub: day === 5 ? "opens Sat 10 am" : "opens 9:30 am tomorrow" };
  }
  if (day === 6) {
    if (m < 600) return { status: "closed", sub: "opens 10:00 am" };
    if (m < 810) return { status: "open", sub: "closes 1:30 pm" };
    return { status: "closed", sub: "opens Mon 9:30 am" };
  }
  return { status: "closed", sub: "opens Mon 9:30 am" };
}

export async function LiveFooterStatus() {
  const stats = await getFooterStats();
  const { status, sub } = computeStatus();
  const dotColor =
    status === "open" ? "#16a34a" : status === "lunch" ? "#F5A623" : "#9CA3AF";
  const headline =
    status === "open" ? "Open now" : status === "lunch" ? "On lunch" : "Closed";

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
