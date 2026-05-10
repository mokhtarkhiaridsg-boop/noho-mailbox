// iter-170 — Scheduled-forwarding date math & batch primitives.
// Lives outside any "use server" file so the cron route + member UI
// share the same constants without the async-only constraint.

export type ForwardingFrequency = "weekly" | "biweekly" | "monthly";

export const ALL_FREQUENCIES: ForwardingFrequency[] = ["weekly", "biweekly", "monthly"];

export const FREQUENCY_LABELS: Record<ForwardingFrequency, string> = {
  weekly:   "Weekly",
  biweekly: "Every 2 weeks",
  monthly:  "Monthly",
};

// Compute the next run date as YYYY-MM-DD (string, not Date). Caller
// passes the day to anchor on (defaults to today). Pure function — no
// timezone surprises beyond what the host machine has.
export function computeNextRunDate(frequency: ForwardingFrequency, fromIsoDate?: string): string {
  const d = fromIsoDate ? new Date(`${fromIsoDate}T00:00:00`) : new Date();
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return ymd(d);
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayYmd(): string {
  return ymd(new Date());
}

// Eligibility predicate: true when this row's next-run date is on/before
// today AND it's not paused for vacation. Same logic the cron uses, so
// we centralize it for tests + UI display.
export function isDueNow(row: { nextRunDate: string; pauseUntil: string | null; enabled: boolean; active: boolean }): boolean {
  if (!row.enabled || !row.active) return false;
  const today = todayYmd();
  if (row.pauseUntil && row.pauseUntil > today) return false;
  return row.nextRunDate <= today;
}
