# NOHO Mailbox Sales Kit — Start Here

End-to-end sales operations system. **46 numbered docs**. Most of them
you won&apos;t need most days. The 5 you'll use weekly are at the top
of "Where to start" below.

> **Need to find something fast?** Jump to `_QUICK-REFERENCE.md` —
> maps "I need help with X" → "see doc Y."
>
> **Just woke up to autonomous build?** Read
> `_OVERNIGHT-BUILD-SUMMARY.md` first.
>
> **Just deployed?** Run through `_PRODUCTION-CHECKLIST.md` to verify
> everything is live and working.
>
> **Want to stop the loop?** Reply with "Sa7it" in your next message.

---

## Where to start (60-min read, in order)

If you read NOTHING else from this kit, read these 5:

1. **`_OVERNIGHT-BUILD-SUMMARY.md`** (10 min) — what got built + what
   needs your action
2. **`38-first-90-days-roadmap.md`** (15 min) — exact day-by-day
   execution sequence for the next 90 days
3. **`45-founders-operating-system.md`** (10 min) — daily / weekly
   / monthly / quarterly / annual rhythm
4. **`22-daily-playbook-30min.md`** (10 min) — the 30 min/day
   commitment
5. **`31-inbound-triage-playbook.md`** (15 min) — how to handle
   leads when they arrive

After that, dip into specific docs as situations arise. Use
`_QUICK-REFERENCE.md` as your map.

---

## The kit by category

### Strategy + planning
- `01-strategy.md` — original strategy + framework
- `16-paths-to-5m-net-monthly.md` — strategic plan to $5M/mo net
- `34-annual-planning-template.md` — 4-hour annual planning session
- `38-first-90-days-roadmap.md` — exact day-by-day execution
- `41-seasonal-revenue-calendar.md` — when each product peaks
- `45-founders-operating-system.md` — integrating cadence

### Acquisition (outbound + content)
- `04-email-templates.md` — cold email copy + CAN-SPAM rules
- `05-sms-voicemail.md` — phone scripts, SMS, walk-in pitch
- `13-paid-ads-copy-pack.md` — paid ads copy library
- `14-content-distribution-pack.md` — content distribution playbook
- `17-revenue-stream-outreach.md` — outreach by revenue lane
- `18-reddit-quora-answers.md` — 12 ready-to-paste organic Q&A
- `19-paid-search-keyword-pack.md` — 5 Google Ads campaigns + 100+ keywords
- `21-linkedin-outbound-playbook.md` — CMRA SaaS LinkedIn DM playbook
- `23-youtube-shortform-scripts.md` — 10 ready-to-record video scripts
- `26-tiktok-ig-reel-scripts.md` — 15 ultra-short TikTok / IG Reel scripts
- `28-cold-email-b2b-saas-sequences.md` — 3 cold-outbound sequences
- `30-90-day-content-calendar.md` — daily content schedule
- `35-press-release-templates.md` — 5 PR templates + distribution

### Conversion (closing leads)
- `15-cmra-saas-pitch-pack.md` — B2B SaaS pitch deck
- `20-email-nurture-sequences.md` — 4 drip sequences (14 emails)
- `29-b2b-demo-walkthrough-script.md` — 30-min CMRA SaaS demo script
- `31-inbound-triage-playbook.md` — first-touch response system
- `33-pricing-objection-handler.md` — pricing objection responses
- `37-customer-personas.md` — 5 detailed personas (80%+ of revenue)

### Customer success + retention
- `08-customer-upsell.md` — campaigns 1/2/3 strategy
- `39-customer-success-onboarding.md` — first-30-days CS playbook
- `40-retention-expansion-playbook.md` — long-term retention + expansion

### Local + brand
- `07-local-listings.md` — Yelp / Apple / Bing / Nextdoor overview
- `10-gbp-copy-paste-pack.md` — every GBP field pre-filled
- `11-mothers-day-florist-sprint.md` — Mother's Day operational playbook
- `12-walk-in-day-playbook.md` — walk-in day reference (NOT primary)
- `46-local-seo-deep-strategy.md` — beyond GBP fields, full local SEO
- `47-international-cmra-prospect-research.md` — international CMRA SaaS expansion

### Lead magnets (gated PDFs for email capture)
- `24-lead-magnet-ca-llc-cheat-sheet.md` — California LLC 2-pager
- `25-lead-magnet-cmra-switching-guide.md` — B2B CMRA SaaS PDF

### Affiliate + partner programs
- `06-partner-program.md` — referral program + printable one-pager
- `27-affiliate-asset-pack.md` — copy templates + creative assets

### Operations + risk
- `02-prospects-delivery.md` — strategy for delivery prospect targeting
- `03-prospects-bizsol.md` — strategy for business solutions + partners
- `09-execute.md` — execution checklist
- `32-weekly-metrics-dashboard.md` — 12-metric Friday review
- `42-crisis-response-playbooks.md` — 6 crisis-response playbooks
- `43-bookkeeping-financial-hygiene.md` — financial discipline

### Hiring + scale
- `36-hiring-roadmap.md` — when to hire each role (solo → $5M/mo)

### Exit / transaction
- `44-investor-acquisition-prep.md` — data room + transaction prep

---

## Special docs (not numbered)

- `_OVERNIGHT-BUILD-SUMMARY.md` — what got built during autonomous loop
- `_QUICK-REFERENCE.md` — situational navigation index
- `_PRODUCTION-CHECKLIST.md` — post-deploy verification steps
- `00-START-HERE.md` — this doc

## Live prospect data (gitignored CSVs — PII never leaves your box)

- `_prospects-law-firms-walking.csv` — 17 Lankershim-corridor attorneys with phones
- `_prospects-florists.csv` — 14 florists for the Mother's Day push
- `_prospects-cpas.csv` — 15 CPAs for the partner program
- `_prospects-immigration-attorneys.csv` — 14 immigration attorneys for the partner program
- `_customers-business-tier.csv` — 6 active Business-plan customers
- `_customers-premium-tier.csv` — 3 Premium-plan customers
- `_customers-all-active.csv` — 24 active customers

## Scripts

- `_pull-customers.mjs` — re-runs the customer query against Turso
- `_send-campaign-1.mjs` — sender for Business-tier upsell
- `_send-campaign-3.mjs` — sender for refer-a-friend push
- `_campaign-1-drafts.json` — Campaign 1 raw drafts (already sent)

---

## What's actually live in production

`https://nohomailbox.org` (deployed when you approve):

**Pages**:
- `/`, `/pricing`, `/services`, `/business-solutions`, `/delivery`,
  `/notary`, `/shipping`, `/shop`, `/contact`, `/faq`, `/compare`,
  `/security`, `/privacy`, `/terms`, `/how-it-works`
- `/start` — visitor self-segmentation (5 lanes)
- `/about` — operating CMRA story + numbers
- `/glossary` — 15 plain-English term definitions
- `/case-studies` + `/case-studies/noho-mailbox`
- `/coverage`, `/resources`, `/tools`
- `/partners`, `/affiliates`, `/franchise`, `/enterprise`, `/refer`
- `/for-cmra-operators` + `/for-cmra-operators/apply` + `/migrate`
- `/blog/[slug]` — 20 long-form SEO posts with Article + BreadcrumbList JSON-LD
- `/business-solutions/[state]` — 51 state LLC pages (all 50 + DC)
- `/delivery/[zip]` — 30 ZIP code pages
- `/delivery/for-{law-firms|florists|real-estate|medical-offices|print-shops|boutique-ecom|recurring-routes|compare-couriers}`
- `/vs/[competitor]` — 11 competitor comparison pages
- `/for/[useCase]` — 10 vertical use-case pages

**Tools** (interactive, free, no email):
- `/tools/llc-name-checker`
- `/tools/mailbox-roi-calculator`
- `/tools/llc-cost-calculator` (50 states + DC)
- `/tools/should-i-form-an-llc` (9-question quiz)
- `/tools/mailbox-plan-picker` (5-question quiz)

**Discovery**:
- `/sitemap.xml` — ~164 URLs
- `/feed.xml` — RSS feed (auto-discovered)
- `/llms.txt` — LLM crawler discovery
- `/robots.txt` — search engine directives

**Database** (Turso production):
- `Partner` table — external referral partners
- `PartnerCommission` table — per-referral tracking
- `Tenant` + `TenantSubscription` + `TenantBillingEvent` tables — multi-tenant SaaS foundation
- `NewsletterSubscriber` table

---

## What needs your action

1. **Deploy queued changes**: `vercel deploy --prod --yes` from
   `/Users/CEO/Claude/noho-mailbox`
2. **Submit sitemap to Google Search Console** after deploy
3. **Pick ONE thing from `38-first-90-days-roadmap.md` Day 1** and
   do it today
4. **Watch inbound for 7 days** using `31-inbound-triage-playbook.md`

---

## Continuing automatically until you say "Sa7it"

I'm in a self-paced loop. Each iteration adds infrastructure
(content, tools, sales kit docs). If you have priorities you want
me to jump to, just type them.
