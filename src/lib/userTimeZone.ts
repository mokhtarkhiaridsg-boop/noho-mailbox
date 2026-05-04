// iter-123 — Helper to render a date against a customer's preferred TZ
// inside email templates / notification copy. Falls back to the bureau's
// configured TZ when the user hasn't set one.

import { getOperatingHours } from "@/app/actions/operatingHours";

const DEFAULT_TZ = "America/Los_Angeles";

export type FormatTzOptions = Intl.DateTimeFormatOptions;

const NICE_DEFAULT: FormatTzOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

// Tries the user TZ, falls back to bureau TZ, then DEFAULT_TZ. Bad
// strings are tolerated — Intl will throw, we catch and degrade.
export async function formatDateForUser(
  date: Date,
  user: { timeZone?: string | null } | null,
  opts: FormatTzOptions = NICE_DEFAULT,
): Promise<string> {
  let tz: string | undefined = user?.timeZone ?? undefined;
  if (!tz) {
    try {
      const cfg = await getOperatingHours();
      tz = cfg.timezone || DEFAULT_TZ;
    } catch {
      tz = DEFAULT_TZ;
    }
  }
  try {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: DEFAULT_TZ }).format(date);
  }
}

// Sync version when caller already knows the resolved TZ — handy for
// inside loops where one operatingHours read amortizes across many recipients.
export function formatDateInTz(
  date: Date,
  tz: string,
  opts: FormatTzOptions = NICE_DEFAULT,
): string {
  try {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: DEFAULT_TZ }).format(date);
  }
}

// Curated short list of common IANA timezones for the picker. We don't
// need 400+ — a dozen covers everyone the bureau is realistically
// serving + an "Other" option that lets advanced users type any IANA tz.
export const COMMON_TIMEZONES: Array<{ tz: string; label: string }> = [
  { tz: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { tz: "America/Denver",      label: "Mountain (Denver)" },
  { tz: "America/Phoenix",     label: "Mountain — no DST (Phoenix)" },
  { tz: "America/Chicago",     label: "Central (Chicago)" },
  { tz: "America/New_York",    label: "Eastern (New York)" },
  { tz: "America/Anchorage",   label: "Alaska (Anchorage)" },
  { tz: "Pacific/Honolulu",    label: "Hawaii (Honolulu)" },
  { tz: "America/Toronto",     label: "Eastern Canada (Toronto)" },
  { tz: "America/Mexico_City", label: "Central Mexico (Mexico City)" },
  { tz: "Europe/London",       label: "United Kingdom (London)" },
  { tz: "Europe/Paris",        label: "Central Europe (Paris)" },
  { tz: "Africa/Tunis",        label: "North Africa (Tunis)" },
  { tz: "Asia/Dubai",          label: "Gulf (Dubai)" },
  { tz: "Asia/Tokyo",          label: "Japan (Tokyo)" },
  { tz: "Asia/Singapore",      label: "Southeast Asia (Singapore)" },
  { tz: "Australia/Sydney",    label: "Eastern Australia (Sydney)" },
];
