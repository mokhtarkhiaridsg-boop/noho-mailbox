# Production Deployment Checklist

What to verify after running `vercel deploy --prod`. Skip this and
small things break unnoticed for days.

---

## Pre-deploy (1 minute)

- [ ] Confirm you&apos;re on the right branch: `git status` shows
      `main` (or your default branch)
- [ ] Confirm no uncommitted changes you don&apos;t want to deploy:
      `git status` shows clean
- [ ] Run final type-check: `./node_modules/.bin/tsc --noEmit` (no
      errors)
- [ ] Run linting if configured: `npm run lint` (no errors)

---

## Deploy

```bash
cd /Users/CEO/Claude/noho-mailbox
vercel deploy --prod --yes
```

Wait for the deployment URL to print. Should take 5-10 minutes.

If you hit Vercel&apos;s rate limit (100 free deploys/day):
- Wait until the next reset window
- Or upgrade Vercel plan if blocking critical work

---

## Post-deploy verification (10 minutes)

### Critical — verify these first

- [ ] **Homepage loads**: `https://nohomailbox.org/`
- [ ] **Pricing page loads**: `https://nohomailbox.org/pricing`
- [ ] **Sitemap loads**: `https://nohomailbox.org/sitemap.xml` —
      should show ~164 URLs
- [ ] **RSS feed loads**: `https://nohomailbox.org/feed.xml`
- [ ] **Robots.txt loads**: `https://nohomailbox.org/robots.txt`

### New pages (verify a sample)

- [ ] `/start` — visitor self-segmentation (5 lanes)
- [ ] `/about` — operating CMRA story
- [ ] `/glossary` — 15 plain-English term definitions
- [ ] `/case-studies` — index page
- [ ] `/llms.txt` — LLM crawler discovery

### New tools (interactive — verify they work)

- [ ] `/tools/llc-cost-calculator` — pick CA + WY + DE, see results
- [ ] `/tools/should-i-form-an-llc` — answer all 9 questions, see
      recommendation
- [ ] `/tools/mailbox-plan-picker` — answer all 5 questions, see
      plan recommendation

### Sample programmatic SEO

- [ ] State page: `/business-solutions/california`
- [ ] State page: `/business-solutions/wyoming`
- [ ] Use case: `/for/etsy-sellers`
- [ ] Use case: `/for/saas-founders`
- [ ] Competitor: `/vs/ipostal1`
- [ ] Competitor: `/vs/zenbusiness`
- [ ] ZIP: `/delivery/91601` (NoHo)
- [ ] ZIP: `/delivery/90069` (West Hollywood)

### Sample blog posts

- [ ] `/blog` — index shows 20 posts categorized
- [ ] `/blog/anonymous-llc-how-it-works`
- [ ] `/blog/real-estate-investor-llc-checklist`
- [ ] `/blog/what-to-do-if-your-business-address-gets-rejected`

### Schema.org structured data verification

For each page type, paste the URL into:
https://search.google.com/test/rich-results

- [ ] Homepage shows LocalBusiness schema
- [ ] Blog post shows Article + BreadcrumbList schema
- [ ] Tool page shows SoftwareApplication schema
- [ ] Glossary shows DefinedTermSet schema
- [ ] Use case shows FAQ schema (where applicable)

---

## Google Search Console (5 minutes)

- [ ] Sign in to Google Search Console
- [ ] Submit sitemap: paste `https://nohomailbox.org/sitemap.xml`
- [ ] Click "Submit" and verify status shows "Success"
- [ ] Check coverage report (will populate over 24-48 hours)
- [ ] Verify there are no manual actions / penalties

After submitting, expect:
- 24-48 hours for Google to crawl initial subset
- 1-2 weeks for full indexing of 164 URLs
- 4-12 weeks for SEO rankings to stabilize

---

## Email deliverability (3 minutes)

- [ ] Send a test email from `real@nohomailbox.org` to your personal
      Gmail
- [ ] Verify it arrives in inbox (not spam)
- [ ] Verify SPF / DKIM / DMARC pass: paste the test email&apos;s
      headers into mailtester.com
- [ ] Resend dashboard shows healthy delivery rate (>98%)

If deliverability drops below 95%, investigate:
- Recent IP reputation issues (Resend will alert)
- Recent send-rate spikes (warmup violation)
- Spam complaints in Resend logs

---

## Database health (2 minutes)

- [ ] Visit `https://nohomailbox.org/api/health` — should return JSON
      with status: ok
- [ ] Verify Turso connection working
- [ ] Check Turso dashboard for any errors / slow queries

---

## Inbound capture verification (5 minutes)

This is critical — if forms break, you lose leads.

- [ ] Submit a test form on `/business-solutions` — verify it lands
      in admin dashboard + sends an email notification
- [ ] Submit a test form on `/for-cmra-operators/apply` — same check
- [ ] Submit a test form on `/affiliates` — same check
- [ ] Submit a test form on `/partners` — same check
- [ ] Submit a test newsletter signup — verify subscriber added to
      database

If any form fails: HALT acquisition activities until fixed. Broken
forms = wasted ad spend + missed conversions.

---

## Phone verification

- [ ] Call (818) 506-7744 — verify rings + voicemail picks up after
      hours
- [ ] Verify voicemail message matches sales kit doc 31 script
- [ ] Verify SMS-to-voicemail forwarding (if configured)

---

## Storefront (if applicable)

- [ ] Verify hours posted on Google Business Profile match real hours
- [ ] Verify storefront photos are current (refresh if season-specific)
- [ ] Verify GBP responses to recent reviews are up-to-date

---

## Ad campaigns (if running)

- [ ] Check Google Ads dashboard — no disapproved ads
- [ ] Verify daily budget caps haven&apos;t shifted
- [ ] Check conversion tracking is firing (test conversion event
      should appear in dashboard within 24 hours)

---

## Performance monitoring

- [ ] Lighthouse score on homepage: >90 across all categories
- [ ] Largest Contentful Paint (LCP): <2.5s
- [ ] First Input Delay (FID): <100ms
- [ ] Cumulative Layout Shift (CLS): <0.1

Run via Chrome DevTools Lighthouse panel. Or via:
https://pagespeed.web.dev/

If any score drops below threshold, investigate before next deploy.

---

## Security verification

- [ ] HTTPS-only (no HTTP fallback)
- [ ] Visit `https://nohomailbox.org/.well-known/security.txt` —
      RFC 9116 disclosure file loads
- [ ] Admin routes (`/admin/*`) require authentication
- [ ] No exposed `.env` files or secrets

---

## Communication

- [ ] Newsletter to existing customer list announcing new tools (if
      applicable)
- [ ] LinkedIn post announcing new infrastructure (if applicable)
- [ ] Slack / Discord (if internal team) message about deploy

---

## What to do if something is broken

### Page returns 404 or 500

1. Check `https://vercel.com` deployment logs
2. Look for build errors in the deployment
3. If urgent: roll back to previous deployment via Vercel dashboard
4. Fix locally, re-test, redeploy

### Form submission fails silently

1. Check browser console for JavaScript errors
2. Check Network tab for failed API calls
3. Check Vercel logs for server-side errors
4. Most common cause: environment variable missing in production

### Sitemap not indexing

1. Verify sitemap.xml loads + has correct URLs
2. Re-submit in Google Search Console
3. Check robots.txt isn&apos;t blocking
4. Allow 24-48 hours; Google&apos;s crawl cycle is gradual

### Email going to spam

1. Verify Resend domain status: should be "verified"
2. Check SPF / DKIM / DMARC
3. Check Resend logs for any flag indicators
4. If recent volume spike: scale down send rate + warmup gradually

---

## Day 1 metrics to set up

- [ ] Google Analytics 4 tracking ID configured
- [ ] Google Search Console property verified
- [ ] Vercel Analytics enabled (free tier)
- [ ] Sentry error tracking (optional but recommended)
- [ ] Conversion goals defined in GA4

---

## Weekly post-deploy maintenance (15 min, every Friday)

- [ ] Check Google Search Console — any new indexing errors?
- [ ] Check Vercel — any deployment errors / function timeouts?
- [ ] Check Stripe — any disputed charges?
- [ ] Check Resend — deliverability rate steady?
- [ ] Check inbound forms — any failures?

---

## What to NEVER skip

The non-negotiables:

1. **Sitemap submission** to Google Search Console after first deploy
2. **Test form submission** end-to-end
3. **Email deliverability test**

These three checks catch 80% of post-deploy issues. Don&apos;t skip
them.

---

## After this checklist passes

You&apos;re live. Start executing per `38-first-90-days-roadmap.md`.

The infrastructure is built. The execution is now the gate to
revenue.
