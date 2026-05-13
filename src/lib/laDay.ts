// Helpers for computing day boundaries in America/Los_Angeles regardless of
// where the server actually lives. Vercel serverless runs in UTC by default,
// so calling `setHours(0,0,0,0)` on a naked Date gives the wrong moment for
// LA-anchored "today" counts (the count would visibly reset at 5pm PT when
// UTC rolls over). Use these helpers anywhere we want "today in LA" semantics.

const LA_TZ = "America/Los_Angeles";

/**
 * Return the UTC moment that corresponds to **00:00 today in LA**.
 *
 * Strategy: format `now` in LA to get how many hours/minutes/seconds have
 * elapsed in LA today, then subtract that many ms from `now`. The result is
 * the same instant for "today started" regardless of the server's local TZ
 * and correctly handles DST without needing to compute offsets.
 */
export function laStartOfToday(now: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "0";
  // `hour` can come back as "24" right at midnight in some ICU builds — clamp.
  let h = parseInt(get("hour"), 10);
  if (!Number.isFinite(h) || h === 24) h = 0;
  const m = parseInt(get("minute"), 10) || 0;
  const s = parseInt(get("second"), 10) || 0;
  const elapsedMs = (h * 3600 + m * 60 + s) * 1000;
  // Drop sub-second precision so the boundary is exactly on the wall-clock minute.
  const baseMs = Math.floor(now.getTime() / 1000) * 1000;
  return new Date(baseMs - elapsedMs);
}

/**
 * Return the UTC moment that corresponds to **23:59:59.999 today in LA** —
 * the inclusive upper bound for `today` queries.
 */
export function laEndOfToday(now: Date = new Date()): Date {
  const start = laStartOfToday(now);
  return new Date(start.getTime() + 24 * 3600 * 1000 - 1);
}
