# Execution Checklist — your week-by-week

This is the only file you need to look at to actually do the work. Each item is checkable. Skip what doesn't apply, but don't skip the *order*.

---

## Pre-flight (do once, before week 1)

- [ ] Forward `partners@nohomailbox.org` and `hello@nohomailbox.org` to your inbox (Resend domain is verified now).
- [ ] Pull Business-tier customer list from Turso (queries in `08-customer-upsell.md`). Save as CSV.
- [ ] Pull Premium customer list. Save as CSV.
- [ ] Pull all-active customer list. Save as CSV.
- [ ] Order door / counter stickers from VistaPrint or Sticker Mule (200 units, ~$30, design in `05-sms-voicemail.md`).
- [ ] Print 25 partner one-pagers from `06-partner-program.md`. Real paper, brand colors.
- [ ] Print 100 referral cards from `08-customer-upsell.md` Campaign 3.
- [ ] Print 100 Google review QR-code cards (point to your GBP review link — get the link from `business.google.com` after you've verified the profile).
- [ ] Open one Google Sheet titled "NOHO Sales Tracker" with 4 tabs: `Lane A prospects`, `Lane B prospects`, `Partners`, `Customer upsell`. Headers from each section's "Tracking" instructions.

---

## Week 1 — Fill the funnel

**Goal: 30 walk-ins, 5 trial deliveries booked, 2 partner conversations.**

### Monday
- [ ] Send Campaign 1 (Business-tier upsell) Email 1 — max 50 sends. Use `hello@nohomailbox.org` via Resend.
- [ ] Walk to **5161 Lankershim** (Mary Macisaac Coleman) — your closest law firm prospect. Pitch in person.
- [ ] Walk to **5016 Lankershim** (Josie's Flower Shop) — your closest florist. Pitch in person.
- [ ] Walk to **Roland Fink, CPA** — your closest CPA partner. Hand him the one-pager.

### Tuesday
- [ ] 5 more law-firm walk-ins. Use the directory links in `02-prospects-delivery.md`.
- [ ] Send Campaign 3 (referral push) to 50 active customers via email. Same domain warmup limit.

### Wednesday
- [ ] Verify Google Business Profile (`07-local-listings.md` step 1).
- [ ] 5 more walk-ins (mix of print shops + boutique e-com on Lankershim/Magnolia).
- [ ] Send Campaign 1 SMS follow-up to anyone who didn't open Email 1 (3 days later — schedule in your calendar).

### Thursday
- [ ] Verify Apple Business Connect.
- [ ] Walk to 3 more CPA / immigration-attorney partners (B2a, B2b in `03-prospects-bizsol.md`).
- [ ] Send 25 emails using Email A-1 (law firms) from `04-email-templates.md` to law firms you couldn't walk in to.

### Friday
- [ ] Set up Yelp claim + Nextdoor business page.
- [ ] Hand out remaining stickers / cards in person.
- [ ] **Tally Week 1.** Update the sheet. Were you under or over 30 walk-ins? Adjust pace next week.

### Saturday
- [ ] Florist walk-ins (florists are open Sat, more time to talk).
- [ ] Quick email send: Campaign 2 (Premium → recurring delivery) to 25 Premium customers.

---

## Week 2 — Activate, follow up, build content

**Goal: 5 first paid runs from Week 1 prospects, 1 partner-signed, 10 Google reviews.**

- [ ] Follow up on every Week 1 walk-in via SMS (use the script in `05-sms-voicemail.md`, A-SMS-1).
- [ ] Send Campaign 1 Email 2 (10-day follow-up).
- [ ] Walk in to 15 more Lane A prospects.
- [ ] Hand out the Google review QR-code card to **every** customer who walks into the store. Goal: 5 reviews this week.
- [ ] Write blog post 1: "How to choose a same-day courier in North Hollywood" — drop in `/src/app/(marketing)/blog/`. Aim for 800 words, 1 internal link to `/delivery`, 1 to `/services`.
- [ ] Write blog post 2: "What's actually inside our $2,000 LLC + brand + website bundle" — same destination, internal link to `/business-solutions`.

---

## Week 3 — First partner closes, GBP momentum

**Goal: first partner referral closed, GBP starts ranking, 2 bundle-leads booked.**

- [ ] Check in on every partner from Week 1 with a short SMS or walk-by: "Anything moving this week I can help with?"
- [ ] Pay any partner who has earned a commission already, **even if it's $50**. Speed of first payout = retention.
- [ ] 15 more Lane A walk-ins (push deeper into Studio City + Burbank now that close-radius is exhausted).
- [ ] Write blog posts 3 and 4: "How to form an LLC in California (2026 guide for first-timers)" and "PO Box vs Real Mailbox Address: What Banks, the IRS, and Amazon Actually Want."
- [ ] Add 10 photos to GBP. Post 1 GBP update.
- [ ] Reply to every review (5 stars and otherwise). Within 48 hrs.
- [ ] Send Campaign 1 Email 2 (final, 10-day) to anyone still un-replied.

---

## Week 4 — Iterate

**Goal: figure out which channel is closing, double down. Cut what's not.**

- [ ] Look at your tracker. Which channel produced the most paid customers / paid bundles?
  - Walk-ins?
  - Existing-customer upsell?
  - Partner referrals?
  - GBP / search?
- [ ] Triple the time on the winning channel for Week 5–8.
- [ ] Cut whatever is below cost-per-lead targets ($15 for Lane A, $250 for Lane B).
- [ ] Run one $50 Nextdoor sponsored post to test paid acquisition.
- [ ] Write blog post 5: "The 7 LA businesses that should NEVER use a P.O. Box (and what to use instead)."

---

## Week 5–8 — Compound

- [ ] Each week: 15 more Lane A walk-ins, 5 partner check-ins, 10 review asks, 1 blog post, 1 GBP update.
- [ ] Keep pumping referral cards in-store.
- [ ] If a partner sends 3+ closes by week 6, send them a $25 thank-you (cafe gift card or branded mug — `06-partner-program.md`).
- [ ] If GBP shows up top-3 for "private mailbox North Hollywood" by Week 8, you're on track. If not, more reviews + more posts.

---

## What to ask me to do once you're ready

(I won't touch the website without you saying so. When you do want website work, here's the queue with biggest sales impact first.)

1. **Build `/partners` page** with the program details + simple application form. Form posts to `partners@nohomailbox.org` and creates a `Partner` row in Prisma.
2. **Build `/refer` page** — existing customers can grab their referral code, see their credits, share a link.
3. **Build `/quote` widget for delivery** — zone picker → instant price → "book now" — drop on `/delivery` and `/`.
4. **Build `/business-solutions` enhancements** — add a 5-step intake flow with Calendly embed for the consult.
5. **Lane A landing pages by vertical** — `/delivery/for-law-firms`, `/delivery/for-florists`, `/delivery/for-real-estate` — each tuned to that ICP. SEO win + better cold-email landing.
6. **Add `Referral` model logic in admin** — admin can verify and pay out referrals from the dashboard. Already a `Referral` model in schema per HANDOFF.md.
7. **Add automated review-ask** — after a delivery completes (or 7 days after a mailbox signup), send the SMS with the Google review link automatically. Resend + Twilio.

Each of these is 1–3 hours of work and lifts conversion or removes manual ops. Order matters — `/partners` first, because partners are your fastest scale path.

---

## Things you should NOT do

- ❌ Don't buy a B2B email list and blast it. You'll torch the new domain. 40 sends/day, hand-curated, max.
- ❌ Don't run Google Search Ads in week 1. GBP first, then paid.
- ❌ Don't try to compete with ClockWork on enterprise medical. They have OSHA + 25 years + 24/7. You'd burn money.
- ❌ Don't promise a $5 run to Sherman Oaks. Stick to the published zone pricing.
- ❌ Don't mass-text anyone whose number you didn't legitimately collect (TCPA, your phone gets flagged).
- ❌ Don't offer review discounts (FTC).
- ❌ Don't take HIPAA-protected jobs without a BAA in place.

---

## North-star numbers to hit by end of Week 8

- 5 new repeating delivery customers per week
- 3 qualified Business Solutions consults per week
- 25+ Google reviews, 4.7+ avg
- 5 active partners (1+ referral each)
- 1 GBP top-3 ranking ("private mailbox North Hollywood" or "same day delivery North Hollywood")

If you hit those, you're at roughly **$2k/mo new MRR from delivery + 1 closed bundle/month ($2k one-time + retainer potential)**. That's the trigger to start paid ads.

---

## What I've already shipped to production

These are live at `https://nohomailbox.org`:

- **`/partners`** — landing page + application form. Apps land in the existing Messages panel as `service: "partner-program"` ContactSubmissions.
- **`/refer`** — member-only page with auto-generated referral code, Copy/SMS/Email share buttons, stats. Wired to the existing `Referral` model.
- **`/signup?ref=CODE`** — signup form auto-fills referral codes from URL; on submit, the credit is applied to both wallets via `applyReferralCode`. Suspense boundary added for `useSearchParams`.
- **`/delivery/for-law-firms`** — vertical landing for cold-email/walk-in conversions to attorneys.
- **`/delivery/for-florists`** — vertical landing for the Mother's Day / Valentine's overflow pitch.
- **`/delivery/for-real-estate`** — vertical landing for keys, escrow runs, signed addenda.
- **`/blog`** — index now lists 5 real long-form articles (was "Coming Soon" stubs).
- **`/blog/same-day-courier-north-hollywood`** — buying-intent SEO post.
- **`/blog/llc-formation-california-2026-guide`** — buying-intent SEO post.
- **`/blog/po-box-vs-real-mailbox-address`** — buying-intent SEO post.
- **`/blog/form-1583-explained`** — supporting SEO post.
- **`/blog/businesses-that-should-never-use-po-box`** — converter for B-tier upsells.
- **Navbar** — added `/partners` link.
- **Footer** — added `/partners` and `/refer` links.

All routes return 200; `/refer` correctly redirects unauthenticated visitors to `/login?next=/refer`.

## Customer lists pulled

Run once locally to pull the live data into gitignored CSVs:

```bash
cd /Users/CEO/Claude/noho-mailbox
set -a && source .env && set +a
node sales-kit/_pull-customers.mjs
```

This produces:

- `_customers-business-tier.csv` — for Campaign 1 (Business → $1,700 bundle upsell)
- `_customers-premium-tier.csv` — for Campaign 2 (Premium → recurring delivery)
- `_customers-all-active.csv` — for Campaign 3 (referral push)

Initial counts at deploy time: 6 Business-tier, 3 Premium-tier, 24 total active.

## When you want me to execute the next phase

Reply with one of these and I'll start:

- **"Run Campaign 1"** — I'll draft per-customer personalized emails for each of the 6 Business-tier customers from the CSV and queue them in EmailLog rows so you can review and trigger sends in batches via Resend.
- **"Plan Mother's Day florist push"** — dated SMS/email sequence + named florist hit-list (Josie's, LA Wholesale, Toluca Lake Florist, Dottie's, etc.) with phone numbers.
- **"Add the AdminReferralsPanel"** — dedicated admin tab that shows all customer referrals + partner applications + commission tracking.
- **"Build /quote homepage widget"** — instant-quote zone picker on the homepage hero so 100% of arrivals see a price.
- **"Add Google review automation"** — 7 days after a delivery completes (or a mailbox setup), automatically text the customer the review link.
- **"Add structured data / schema.org"** — LocalBusiness + Service + Product markup for richer Google results.

Pick one and I'll go.
