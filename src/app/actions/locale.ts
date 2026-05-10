"use server";

// iter-110 — Server-side locale persistence.
// iter-183 — Extended to also write the choice to User.locale so it
// survives device changes + signs-out, with audit trail.
//
// Three helpers:
//  - getServerLocale() — reads User.locale (when authed) → cookie →
//    Accept-Language header → "en". Layouts call this to pick the
//    initial dir/lang attrs.
//  - setLocaleAction(locale) — cookie-only setter (used by anonymous
//    marketing-site visitors). Persists to cookie, no DB write.
//  - setMyLocale(locale) — auth-required setter. Writes the User row
//    + cookie + audit so the choice is permanent across devices.

import { cookies, headers } from "next/headers";
import { LOCALES, LOCALE_COOKIE, pickLocale, type Locale } from "@/lib/i18n/dictionary";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  const cookieVal = c.get(LOCALE_COOKIE)?.value ?? null;
  const h = await headers();
  const accept = h.get("accept-language") ?? null;

  // iter-183 — When the user is authed, prefer User.locale over the
  // cookie so a member who switched languages on their phone sees
  // the same locale on their laptop. Cookie still wins for anon
  // marketing-site visitors.
  try {
    const session = await auth();
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { locale: true },
      });
      if (u?.locale && (LOCALES as readonly string[]).includes(u.locale)) {
        return u.locale as Locale;
      }
    }
  } catch { /* fall through to cookie */ }

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

// iter-183 — Auth-required, persists to DB + writes audit.
export async function setMyLocale(locale: Locale): Promise<{ ok: boolean; locale: Locale; persisted: boolean; error?: string }> {
  const valid = (LOCALES as readonly string[]).includes(locale) ? locale : "en";
  const session = await auth();
  if (!session?.user?.id) {
    // Fall back to cookie-only when not authed.
    await setLocaleAction(valid as Locale);
    return { ok: true, locale: valid as Locale, persisted: false };
  }
  const userId = session.user.id as string;
  await setLocaleAction(valid as Locale);
  try {
    const prev = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    await prisma.user.update({ where: { id: userId }, data: { locale: valid } });
    if (prev?.locale !== valid) {
      await prisma.auditLog.create({
        data: {
          actorId: userId,
          actorRole: (session.user as { role?: string }).role ?? "MEMBER",
          action: "member.locale_changed",
          entityType: "User",
          entityId: userId,
          metadata: JSON.stringify({ previousLocale: prev?.locale ?? null, newLocale: valid }),
        },
      }).catch(() => undefined);
    }
    return { ok: true, locale: valid as Locale, persisted: true };
  } catch (e) {
    return { ok: true, locale: valid as Locale, persisted: false, error: e instanceof Error ? e.message : String(e) };
  }
}
