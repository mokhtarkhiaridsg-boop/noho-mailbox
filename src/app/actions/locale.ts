"use server";

// iter-110 — Server-side locale persistence.
//
// Two helpers:
//  - getServerLocale() — reads the cookie, falls back to Accept-Language
//    header, then "en". Used by layouts to pick the initial dir/lang attrs.
//  - setLocaleAction(locale) — server action used by the client switcher
//    to persist the choice into the same cookie a server-side reader picks.
//
// Cookie-based (no URL routing) so existing routes don't have to change.

import { cookies, headers } from "next/headers";
import { LOCALES, LOCALE_COOKIE, pickLocale, type Locale } from "@/lib/i18n/dictionary";

export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  const cookieVal = c.get(LOCALE_COOKIE)?.value ?? null;
  const h = await headers();
  const accept = h.get("accept-language") ?? null;
  return pickLocale({ cookie: cookieVal, acceptLanguage: accept });
}

export async function setLocaleAction(locale: Locale): Promise<{ ok: boolean; locale: Locale }> {
  const valid = (LOCALES as readonly string[]).includes(locale) ? locale : "en";
  const c = await cookies();
  c.set({
    name: LOCALE_COOKIE,
    value: valid,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true, locale: valid as Locale };
}
