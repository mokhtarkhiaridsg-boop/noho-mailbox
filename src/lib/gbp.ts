// iter-205 — Google Business Profile (GBP) hours-publish helpers.
//
// Translates iter-90 OperatingHoursConfig into the GBP `regularHours` +
// `specialHours` shapes and PATCHes them onto the configured location
// via the My Business v4 API. Auth uses an OAuth refresh token (so
// the cron can run without user interaction).
//
// Configuration via env vars (all required for the push to actually
// fire — without them the action returns reason "no_credentials" and
// the cron no-ops gracefully):
//   GBP_OAUTH_CLIENT_ID
//   GBP_OAUTH_CLIENT_SECRET
//   GBP_OAUTH_REFRESH_TOKEN
//   GBP_ACCOUNT_ID            (e.g. accounts/12345)
//   GBP_LOCATION_ID           (e.g. locations/67890)
//
// We deliberately don't pull in googleapis SDK — direct fetch keeps
// the dependency surface minimal, matches the iter-108/iter-194 AI
// libs that hit Anthropic's HTTP API directly.

import type { OperatingHoursConfig } from "@/lib/operating-hours";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const MYBUSINESS_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const TIMEOUT_MS = 15_000;

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

export type GbpTimePoint = { hours: number; minutes: number };
export type GbpTimePeriod = {
  openDay: typeof DAY_NAMES[number];
  openTime: GbpTimePoint;
  closeDay: typeof DAY_NAMES[number];
  closeTime: GbpTimePoint;
};

export type GbpRegularHours = { periods: GbpTimePeriod[] };

export type GbpSpecialHourPeriod = {
  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  openTime?: GbpTimePoint;
  closeTime?: GbpTimePoint;
  closed: boolean;
};

export type GbpSpecialHours = { specialHourPeriods: GbpSpecialHourPeriod[] };

export type GbpEnvCheck =
  | { ok: true; clientId: string; clientSecret: string; refreshToken: string; accountId: string; locationId: string }
  | { ok: false; reason: "no_credentials"; missing: string[] };

export function checkGbpEnv(): GbpEnvCheck {
  const need = {
    clientId:    process.env.GBP_OAUTH_CLIENT_ID?.trim(),
    clientSecret: process.env.GBP_OAUTH_CLIENT_SECRET?.trim(),
    refreshToken: process.env.GBP_OAUTH_REFRESH_TOKEN?.trim(),
    accountId:   process.env.GBP_ACCOUNT_ID?.trim(),
    locationId:  process.env.GBP_LOCATION_ID?.trim(),
  };
  const missing = Object.entries(need).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) return { ok: false, reason: "no_credentials", missing };
  return { ok: true, clientId: need.clientId!, clientSecret: need.clientSecret!, refreshToken: need.refreshToken!, accountId: need.accountId!, locationId: need.locationId! };
}

function parseHHMM(s: string): GbpTimePoint | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mn = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return { hours: h, minutes: mn };
}

// Map iter-90 weekly hours → GBP regularHours.periods.
// We split around the lunch break: a Mon "9:30–17:30 with break 13:30–14:00"
// becomes TWO periods (9:30-13:30 + 14:00-17:30) so GBP shows the gap.
export function buildGbpRegularHours(cfg: OperatingHoursConfig): GbpRegularHours {
  const periods: GbpTimePeriod[] = [];
  for (let i = 0; i < 7; i++) {
    const d = cfg.weekly[i];
    if (!d?.open || !d.openHHMM || !d.closeHHMM) continue;
    const dayName = DAY_NAMES[i]!;
    const open = parseHHMM(d.openHHMM);
    const close = parseHHMM(d.closeHHMM);
    if (!open || !close) continue;

    if (d.breakHHMM) {
      const bs = parseHHMM(d.breakHHMM[0]);
      const be = parseHHMM(d.breakHHMM[1]);
      if (bs && be) {
        periods.push({ openDay: dayName, openTime: open, closeDay: dayName, closeTime: bs });
        periods.push({ openDay: dayName, openTime: be, closeDay: dayName, closeTime: close });
        continue;
      }
    }
    periods.push({ openDay: dayName, openTime: open, closeDay: dayName, closeTime: close });
  }
  return { periods };
}

// Map iter-90 holidays → GBP specialHours.specialHourPeriods. Honors
// holiday.closed=true (closes that day) and holiday.openClose (custom
// hours overriding the default for that day).
export function buildGbpSpecialHours(cfg: OperatingHoursConfig): GbpSpecialHours {
  const periods: GbpSpecialHourPeriod[] = [];
  for (const h of cfg.holidays) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(h.date);
    if (!m) continue;
    const date = { year: parseInt(m[1]!, 10), month: parseInt(m[2]!, 10), day: parseInt(m[3]!, 10) };
    if (h.closed) {
      periods.push({ startDate: date, endDate: date, closed: true });
      continue;
    }
    if (h.openClose) {
      const open = parseHHMM(h.openClose.open);
      const close = parseHHMM(h.openClose.close);
      if (open && close) {
        periods.push({ startDate: date, endDate: date, openTime: open, closeTime: close, closed: false });
      }
    }
  }
  return { specialHourPeriods: periods };
}

export type GbpAccessToken = { ok: true; accessToken: string; expiresIn: number } | { ok: false; reason: string; detail?: string };

export async function getGbpAccessToken(input: { clientId: string; clientSecret: string; refreshToken: string }): Promise<GbpAccessToken> {
  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: "oauth_http", detail: `HTTP ${res.status}` };
    const j = await res.json() as { access_token?: string; expires_in?: number; error?: string };
    if (!j.access_token) return { ok: false, reason: "oauth_no_token", detail: j.error ?? "no token in response" };
    return { ok: true, accessToken: j.access_token, expiresIn: j.expires_in ?? 3600 };
  } catch (e) {
    return { ok: false, reason: "oauth_fetch", detail: e instanceof Error ? e.message : String(e) };
  }
}

export type GbpPushResult =
  | { ok: true; appliedAtIso: string; periodsRegular: number; periodsSpecial: number }
  | { ok: false; reason: string; detail?: string };

export async function pushHoursToGbp(input: {
  accessToken: string;
  accountId: string;        // e.g. "accounts/12345"
  locationId: string;       // e.g. "locations/67890"
  regular: GbpRegularHours;
  special: GbpSpecialHours;
}): Promise<GbpPushResult> {
  // GBP location PATCH: /v1/{name=accounts/*/locations/*}?updateMask=regularHours,specialHours
  const accountPart = input.accountId.startsWith("accounts/") ? input.accountId : `accounts/${input.accountId}`;
  const locationPart = input.locationId.startsWith("locations/") ? input.locationId : `locations/${input.locationId}`;
  const path = `${accountPart}/${locationPart}`;
  const url = `${MYBUSINESS_BASE}/${path}?updateMask=regularHours,specialHours`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "authorization": `Bearer ${input.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        regularHours: input.regular,
        specialHours: input.special,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, reason: "gbp_http", detail: `HTTP ${res.status} · ${txt.slice(0, 300)}` };
    }
    return {
      ok: true,
      appliedAtIso: new Date().toISOString(),
      periodsRegular: input.regular.periods.length,
      periodsSpecial: input.special.specialHourPeriods.length,
    };
  } catch (e) {
    return { ok: false, reason: "gbp_fetch", detail: e instanceof Error ? e.message : String(e) };
  }
}
