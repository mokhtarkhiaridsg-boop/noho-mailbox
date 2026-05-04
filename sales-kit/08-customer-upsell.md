# Existing-Customer Upsell Campaign

Your existing mailbox customers are the highest-converting list you'll ever have. They already trust you, already pay you, already walk into your store. The cost-per-acquisition for an upsell is approximately zero.

**Two campaigns to run this month:**
1. **Business-tier customers → $1,700 Business Solutions Bundle** ($300 off)
2. **Premium customers → recurring delivery route**
3. **All customers → referral incentive** (3 months free if their referral becomes a customer)

---

## Pulling the lists from Prisma

Run this in the Turso console (or write a one-off node script in the project root, per HANDOFF.md pattern).

```sql
-- Business-tier active mailbox customers
SELECT id, email, businessName, businessOwnerName, planExpiresAt, createdAt
FROM "User"
WHERE boxType = 'Business'
  AND planExpiresAt > strftime('%Y-%m-%d', 'now')
ORDER BY createdAt DESC;

-- Premium customers (good candidates for recurring delivery)
SELECT id, email, businessName, planExpiresAt
FROM "User"
WHERE planTier = 'Premium' OR planTier = 'premium'   -- check actual column/value
  AND planExpiresAt > strftime('%Y-%m-%d', 'now');

-- Anyone with an open MailRequest for forward (signal: they're moving stuff)
SELECT u.id, u.email, COUNT(m.id) as forward_count
FROM "User" u
JOIN "MailRequest" m ON m.userId = u.id
WHERE m.type = 'forward'
GROUP BY u.id
HAVING forward_count > 2;
```

(Adjust column names to actual schema — see `prisma/schema.prisma`.)

Save each list as a CSV. Don't email more than 50/day during the first 14 days of the new domain.

---

## Campaign 1: Business-tier → Business Solutions Bundle

**Audience:** Business-tier customers, active plan.

**Three-touch sequence over 14 days. Stop the moment they reply.**

### Email 1 (Day 0) — soft offer

**Subject:** A discount only Business-box customers get

**Body:**

> Hi [First name] —
>
> [Your name] from NOHO Mailbox. Quick note for you specifically because you're on our Business plan.
>
> We just opened up the **Business Launch Bundle** to existing customers at **$1,700** instead of $2,000 — that's a $300 thank-you discount only for current Business-tier mailbox customers.
>
> What's in it:
>
> - California LLC filed (state fee included)
> - EIN with the IRS
> - Brand book — logo, type, color, 50 business cards
> - 5-page Next.js website on your domain
> - 12 more months of mail at our address (you keep your same box)
> - Form 1583 notarized free, again
>
> If you've ever thought "I should make this a real company" or "my business needs a real site" — this is the cheapest, fastest way. We're a real shop on Lankershim, not a LegalZoom hand-off.
>
> Call (818) 506-7744, walk in, or reply with a good time and I'll set up a 20-min consult.
>
> — [Your name]
> NOHO Mailbox · 5062 Lankershim Blvd, North Hollywood, CA 91601
> *This $300 discount is only for active Business-plan customers and expires [30 days from send].*
> *Reply STOP to opt out of NOHO offers.*

### SMS 1 (Day +3, no reply)

> [First name], [Your name] @ NOHO. The $1,700 launch bundle (LLC + brand + site) is open for current Business-box customers. $300 off the public price. Reply Y for a 5-min call or stop by. STOP to opt out. — NOHO

### Email 2 (Day +10, no reply)

**Subject:** Closing this discount Friday

> [First name] — last note. The $300 Business-customer discount on our Launch Bundle closes [date]. After that the bundle is back to the $2,000 public price.
>
> If you're a maybe, even a 10-min call this week is enough — no pressure either way.
>
> (818) 506-7744 · [Your name] · STOP to unsub.

### In-store (every Business-tier customer who walks in this month)

When they pick up mail, hand them a small printed card:

```
Active Business-box customers:
$300 off the full Business Launch Bundle.
$1,700 instead of $2,000 — LLC + brand + site + a year of mail.
Ask us at the counter. Expires [date].
```

---

## Campaign 2: Premium customers → recurring delivery

**Audience:** Premium-plan customers (they already get same-day delivery credits).

### Email

**Subject:** A standing pickup at your office?

> Hi [First name] —
>
> Quick idea. As a Premium customer you already have same-day delivery credits. Most Premium customers use them on one-off runs.
>
> If you'd ever want a **standing daily or weekly pickup** at your office or home — same time every day, 5 days a week, $XX flat — we can set that up. Common use: outgoing mail dropped at our store, packages picked up from FedEx/UPS, recurring document drops to clients.
>
> If that's useful, reply with a time window and I'll quote it. If not, no worries — your one-off credits stay as-is.
>
> — [Your name] · NOHO Mailbox · STOP to unsub.

---

## Campaign 3: Customer referral push

**Audience:** All active mailbox customers.

### Email

**Subject:** Three months free if you bring a neighbor

> Hi [First name] —
>
> Here's a deal: **refer one new mailbox customer and your next 3 months are on us.** No cap — refer 4, get 12 months free.
>
> If you want to send anyone our way, just have them mention your name when they sign up (or use code `[their first name + last initial, e.g. JANES]`). We'll credit your account automatically.
>
> Easiest neighbors to refer: home-based businesses, anyone whose mail keeps getting stolen on the porch, anyone running an Etsy / Shopify, anyone forming an LLC.
>
> Thanks for the trust — it's how a small NoHo shop grows.
>
> — [Your name] · NOHO Mailbox · (818) 506-7744 · 5062 Lankershim Blvd · STOP to unsub.

### SMS variant

> [First name] — refer a friend to NOHO and your next 3 months are free. No cap. Reply REFER and I'll send you a code. — NOHO Mailbox · STOP to opt out

### In-store

Print a 1/3-sheet card for the counter:

```
Refer a friend → 3 months free.
Each new mailbox customer = 3 months
on your account, no cap. Ask us today.
```

---

## Why these convert better than cold

- **Identity match:** the message names a specific tier they know they're on. Trust signal.
- **Locality match:** they already walk in. They've seen the storefront. The "$2k bundle" goes from abstract to "the people I see Tuesday."
- **Tier-only discount:** "$300 only for Business customers" creates loss aversion + status. People who just barely need an LLC will buy in.

## Tracking

Track conversions in admin (or a sheet):

```
| Customer | Tier | Campaign | Touch 1 | Touch 2 | Touch 3 | Reply | Closed | $ |
```

Targets:
- Campaign 1: 5% bundle-close rate on Business-tier list. If you have 40 Business customers, expect 2 closes = $3,400.
- Campaign 2: 10% recurring-delivery sign-up on Premium list.
- Campaign 3: 1 in 10 customers refers within 60 days.

## Don't do this

- Don't email more than once a month. Customers will start ignoring everything.
- Don't bundle Campaigns 1+3 in one send. One ask per email.
- Don't email people on a *cancelled* plan with a "we miss you" — that's a separate winback campaign with a different angle.
