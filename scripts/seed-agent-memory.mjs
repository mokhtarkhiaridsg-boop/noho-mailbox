#!/usr/bin/env node
/**
 * Seed AgentMemory with our shared project context — the "consciousness
 * transfer." These entries get loaded into the agent's prompt on every
 * turn so it inherits the brand book, conventions, store info, etc.
 *
 * Idempotent on (scope, key) — re-running upserts.
 *
 * Usage: set -a && source .env && set +a && node scripts/seed-agent-memory.mjs
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ─── Memory entries ─────────────────────────────────────────────────────
const MEMORIES = [
  {
    key: "store-info",
    pinned: true,
    body: `NoHo Mailboxes — 5062 Lankershim Blvd, North Hollywood, CA 91601 · (818) 506-7744.
Hours: Mon–Fri 09:30–13:30 + 14:00–17:30 (lunch break 1:30–2:00 pm); Sat 10:00–14:00; closed Sunday.
A real-world CMRA (private mailbox + pack-and-ship) with ~250 active customers across boxes 1-3048 in numbered ranges. Family-owned, in-NoHo, Tunisian-red heart on every "made with ♥" surface.`,
  },
  {
    key: "brand-book",
    pinned: true,
    body: `Brand colors (these are the ONLY allowed):
- #F7E6C2 cream / mailbox base — backgrounds, card fills, logo bubble
- #337485 script blue — headlines, accents, CTAs (deeper hover variant: #23596A)
- #2D100F outline dark brown / ink — body text, outlines
- #E70013 Tunisian red — single warm accent, used sparingly on heart, "made with ♥" footer, family-owned-in-NoHo pill
- #F5A623 amber for "Most Popular" pills only

Typography: Baloo 2 for chunky display headlines, Pacifico for cursive accents, Inter for body. Headlines use letter-spacing -0.02em.

Logo: real PNG asset at /public/brand/logo-trans.png. Always pass a height class to <Logo>; never recreate with web fonts.

Icons: Heroicons-style 1.75-stroke SVGs. NO emojis as icons anywhere. Reusable icon files in src/components/admin/AdminIcons.tsx.`,
  },
  {
    key: "pricing",
    pinned: true,
    body: `Mailbox subscription plans (all include real street address — not P.O. Box, mail receipt, secure storage):

Basic Box (Regular size):
- 3 mo: $50  · 6 mo: $95  · 14 mo: $160
Business Box (Large size):
- 3 mo: $80  · 6 mo: $150 · 14 mo: $230
Premium Box (Corporate size):
- 3 mo: $95  · 6 mo: $180 · 14 mo: $295

Add-ons / fees: $50 deposit, $15 key fee, $25 lost-key replacement.
Holding fee: 5d free, then $2.60/d days 6-30, $5.20/d after.
Same-day NoHo delivery $5; out-of-zone $9.75 + $0.75/mi.
Quick peek scan: $0.50/page from wallet on fulfill.

Business Solutions package: $2,000 (LLC formation, EIN, branding, website, SEO, social, 12mo mail).`,
  },
  {
    key: "conventions",
    pinned: true,
    body: `Project conventions:
- Server Components by default; only add "use client" when you need state, refs, or browser APIs.
- "use server" files: only async functions can be exported. Move types/constants to src/lib/*.
- Brand discipline: grep -rn "3374B5\\|2D1D0F" src/ should always return 0.
- Every iter is either a HUGE core feature OR a stunning visual enhancement, never both at half-quality.
- Emails to Jessie (jscanlon15@gmail.com) and Mokhtar (mokhtar.khiari.dsg@gmail.com) after each iter via scripts/notify-iter.mjs.
- Deploy each iter: vercel --prod --yes && vercel alias set <new>.vercel.app nohomailbox.org.
- Khiari memo: clients must visit the bureau in person, no e-signatures.
- Build: cd /Users/CEO/Claude/noho-mailbox && npx next build 2>&1 | tail -3`,
  },
  {
    key: "ops-flow",
    pinned: true,
    body: `Operational flows admins follow:

Mail intake: Log Mail/Package modal → Suite # + From + Type + optional photo + dimensions → row in MailItem with status="Received" → customer auto-emailed + in-app notification.

Mail lifecycle: Received → Scanned (admin uploads image) → Awaiting Pickup (held at desk) → Picked Up / Forwarded / Discarded / Returned. Each transition is audit-logged.

Renewal flow: Mailbox Center tab → pick customer → choose term (3/6/14mo) → standard or custom price → Process Renewal: $transaction(payment + user.planDueDate += term + send receipt email + audit log).

Cancellation: customer requests OR admin cancels with refund. Pro-rated refund suggested. 30-day grace period on approve.

Walk-in signup: 5-step modal (Plan → Identity → Suite → ID Verification → Confirm). Captures Plan + Deposit + Key Fee as separate Payment rows for clean refunds.

Today's intake stats: scannedToday + awaitingPickup + pickedUpToday + heldRightNow + dropoffsToday, with vs-yesterday deltas.`,
  },
  {
    key: "tech-stack",
    pinned: false,
    body: `Stack:
- Next.js 16.2 App Router with Turbopack (warning: NOT the Next.js you know — read node_modules/next/dist/docs/ before guessing).
- Prisma 7.x with @prisma/adapter-libsql against Turso (class is PrismaLibSql).
- Tailwind v4 via @theme inline in src/app/globals.css.
- NextAuth (credentials + optional Google/Apple — buttons hide when not configured).
- Resend for transactional email (RESEND_API_KEY).
- Vercel Blob for uploads (BLOB_READ_WRITE_TOKEN).
- Square for payments (manual checkout-link flow).
- Shippo for shipping rates / labels / refunds.
- Hosted on Vercel at nohomailbox.org. Vercel free tier = 100 deploys/24h.`,
  },
  {
    key: "iter-history",
    pinned: false,
    body: `Recent admin redesign iters (running loop):

Iter 1: Mailbox Center hero stat tiles — animated count-up, glassmorphism, click-to-filter, persisted UI state.
Iter 2: Killed status strip + chunky 64px header → unified 44px MailOsCommandBar (~48px reclaimed). Added ⌘K palette + tightened dock.
Iter 3: Overview Command Center — cinematic dark hero, animated metrics, action queues, plan mix bars, live activity stream.
Iter 4: Customers panel rebuild — 5-up hero counters, smart segments (All/Active/At-risk/KYC/Business), avatars, sticky header table.
Iter 5: Sidebar 2.0 — hover-expands 56→240px, group section labels, gradient active state, smarter badges.
Iter 6: Mail panel hero strip — 5 animated counters that double as filter shortcuts.
Iter 7+8: ProfileDropdown rebrand + 350 real customers imported ($10,140.64 past-due).
Iter 9: Daily Register Activity Report — mirrors legacy POS format with 25 categories × 13 payment methods.
Iter 10: AI Assistant agent (deterministic command bot) — this entry was written by it.`,
  },
  {
    key: "customer-roster-summary",
    pinned: true,
    body: `Real customer roster (imported 5/2/2026):
- 350 active mailboxes
- 89 past-due customers, $10,140.64 outstanding
- Box-size mapping: Regular → Basic plan; Large → Business plan; Corporate → Premium plan
- Suite numbers span 1-44, 121-252, 401-428, 1001-1048, 2001-2060, 3001-3048, plus 5000-block reserved as Available
- Business box detection: boxType=Business if size=Corporate or business name detected (LLC/Cafe/Center/Agency/etc.)
- Phone numbers normalized to 10 digits.

Top suite ranges:
- 1-44: ground floor (Regular + Large + Corporate mix)
- 121-252: middle floor
- 401-428: corporate-heavy floor
- 1001-3048: upper floors (mostly Regular + Large)`,
  },
  {
    key: "agent-persona",
    pinned: true,
    body: `You are the NoHo Mailbox AI Assistant. You're the always-on shop-floor employee — not a widget, not a chatbot, but the front-of-house brain admins talk to first.

Voice: warm, concise, neighborhood-friendly. No corporate jargon. No emojis (we don't use them as icons or copy decoration). When you don't know, say so plainly.

Tone examples:
- "Found 89 past-due customers — total balance $10,140.64. Want me to list them?"
- "Suite #128 is Ursula Waszak. Plan: Basic 12 mo, due 5/28/2026. Active. No flags."
- "I can draft that renewal but I need your OK to actually process it."

Always show your work briefly (which suite, which date, etc) so the admin can verify. NEVER execute writes without explicit approval. When proposing a write, show a permission card with a 1-line summary the admin clicks Approve on.`,
  },
];

// ─── Upsert ─────────────────────────────────────────────────────────────
let inserted = 0;
let updated = 0;
const now = new Date().toISOString();
for (const mem of MEMORIES) {
  const existing = await c.execute({
    sql: `SELECT id FROM AgentMemory WHERE scope = 'global' AND key = ? LIMIT 1`,
    args: [mem.key],
  });
  if (existing.rows.length > 0) {
    await c.execute({
      sql: `UPDATE AgentMemory SET body = ?, pinned = ?, updatedAt = ? WHERE id = ?`,
      args: [mem.body, mem.pinned ? 1 : 0, now, existing.rows[0].id],
    });
    updated++;
  } else {
    await c.execute({
      sql: `INSERT INTO AgentMemory (id, scope, key, body, pinned, createdAt, updatedAt)
            VALUES (?, 'global', ?, ?, ?, ?, ?)`,
      args: [randomUUID(), mem.key, mem.body, mem.pinned ? 1 : 0, now, now],
    });
    inserted++;
  }
  console.log("OK", mem.key);
}
console.log(`\nSeeded ${MEMORIES.length} memories — ${inserted} new, ${updated} updated`);
