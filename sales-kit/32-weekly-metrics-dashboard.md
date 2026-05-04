# Weekly Metrics Dashboard Template

The 30-min Friday review that keeps the business honest. Tracks the
dozen numbers that actually predict revenue.

**Cadence**: Every Friday. End of business day.

**Format**: Spreadsheet (Google Sheets or Excel) with the metrics
below. One row per week. Quarterly review = read 13 rows.

**Owner**: Founder (or co-founder / GM if delegated). NOT the
salesperson — they&apos;ll spin the numbers.

---

## The 12 numbers

### Acquisition (4 metrics)

1. **New leads this week** (count, by tier A/B/C from inbound triage
   playbook)
2. **Leads by source** (organic SEO / paid ads / Reddit / LinkedIn /
   referral / walk-in)
3. **Conversion rate, lead → close** (closes ÷ leads × 100)
4. **Cost per acquisition** (ad spend ÷ closes from paid; $0 for
   organic)

### Revenue (4 metrics)

5. **New MRR added this week** (sum of all new monthly subscriptions)
6. **Total MRR** (running total of all active subscriptions)
7. **One-time revenue** ($2k bundle closes + same-day delivery + other)
8. **Churn this week** (count of cancellations + MRR lost)

### Operations (4 metrics)

9. **Mail volume** (pieces processed — bellwether for active customer
   engagement)
10. **Same-day delivery runs** (count + revenue)
11. **Form 1583 backlog** (customers without notarized 1583 — should
    stay near zero)
12. **Audit/compliance issues** (USPS reporting on time? Form 1583
    archive intact? Any complaints?)

---

## Sample weekly row

| Week | Mon-Sun | Notes |
|---|---|---|
| Week of [Apr 21, 2026] | | |
| New leads (A/B/C) | 3 / 12 / 28 | Above target |
| Lead sources | 18 organic / 5 paid / 3 referral / 17 walk-in | Walk-in surge from Mother&apos;s Day promo |
| Lead→close rate | 8.5% | Slightly below target of 12%. Investigate. |
| CPA paid ads | $42 | Within target ($35-50) |
| New MRR | $245 | 8 new mailbox subscriptions |
| Total MRR | $28,400 | +1.2% week |
| One-time revenue | $4,000 | 2 × $2k bundle closes |
| Churn | -$45 (2 cancellations) | Both moved out of LA |
| Mail volume | 2,400 pieces | Average week |
| Same-day runs | 35 runs / $312 | Above target — Mother&apos;s Day prep |
| 1583 backlog | 4 (down from 6) | On track |
| Compliance | All clear | USPS Q1 reporting filed Apr 14 |

---

## Targets to hit (after 90 days of execution)

These are realistic 90-day targets if you&apos;re running the daily
playbook (sales kit doc 22) consistently.

| Metric | 90-day target | Why |
|---|---|---|
| New leads/week (A+B+C) | 25-50 | Mix of organic + walk-in + outbound |
| Tier A leads/week | 2-5 | High-intent SaaS / bundle inquiries |
| Lead→close rate | 10-15% | Industry standard for B2B/B2C mix |
| CPA paid ads | < $50 | Keeps unit economics positive |
| New MRR/week | $200-500 | Mix of mailbox plans + SaaS |
| Total MRR | $30-50k | Up from ~$28k baseline |
| One-time revenue/week | $2-6k | $2k bundle closes + delivery surges |
| Churn/week | < 2% of MRR | Healthy SaaS rate |
| Mail volume | growing 5-10%/mo | Predicts customer activity |
| 1583 backlog | < 5 | Anything more = process problem |
| Compliance | always clear | USPS audit failures = existential |

If any metric is consistently 30%+ below target for 4 weeks, that&apos;s
a real problem worth diagnosing. One bad week is noise.

---

## Quarterly review (every 13 weeks)

Pull the 13 weeks of data. Look for:

1. **Trend on each metric** — improving, flat, declining?
2. **Best week vs worst week** — what changed?
3. **Best lead source** — invest more there
4. **Worst lead source** — kill or fix
5. **Best content piece** (from content calendar tracking) — make a
   template; replicate
6. **Worst content piece** — kill that format
7. **Lost lead reasons** — pattern? Fixable?
8. **Customer feedback themes** — most common complaint, most common
   compliment
9. **Competitor activity** — anyone pricing changes? New features
   shipped?
10. **One thing to change next quarter** — one priority, not five

**Output**: a 1-page memo. Save in `/sales-kit/_quarterly-reviews/`.

---

## Pretend-revenue traps to avoid

These look good in the dashboard but don&apos;t actually move revenue:

- **Newsletter subscriber count** — only matters if you&apos;re
  monetizing email directly (sponsorships, paid newsletter).
- **Twitter / LinkedIn followers** — vanity unless they&apos;re paying.
- **Webpage traffic without conversion data** — empty number unless
  ROAS is positive.
- **Number of leads in CRM (cumulative)** — only counts if you&apos;re
  working them.
- **Number of demos booked** — meaningless without close rate.
- **Number of blog posts published** — only matters if they rank +
  drive traffic + drive conversions.

**The actual numbers that matter**:
- New MRR added (every week)
- Lead→close rate (consistent over time)
- Churn rate (low is the whole game)
- Cost per acquisition (sustainable below LTV/3)

---

## The "where do I look first?" priority

Each Friday review, glance at metrics in this order:

1. **Total MRR** — direction matters. Up = good. Flat = look closer.
   Down = panic.
2. **Churn** — anything > 5%/mo (small CMRA scale) is a fire.
3. **Lead→close rate** — anything < 5% means leads aren&apos;t
   qualified or follow-up isn&apos;t working.
4. **New leads/week** — if low, we have a top-of-funnel problem.
5. **CPA paid ads** — if positive ROAS, scale; if not, kill the
   campaign.

Look at #1 → #5 in order. Don&apos;t deep-dive into #4 until #1 is
solved.

---

## Templates

### Spreadsheet headers (Google Sheets)

```
| Week ending | New leads (A) | New leads (B) | New leads (C) | Lead source: organic | Lead source: paid | Lead source: referral | Lead source: walk-in | Lead source: other | Lead→close (%) | CPA paid | New MRR | Total MRR | One-time revenue | Churn (count) | Churn (MRR loss) | Mail volume | Same-day runs | Same-day revenue | 1583 backlog | Compliance issues | Notes |
```

### Quarterly memo template

```
# Q[N] Review — [Date Range]

## Headline numbers
- Starting MRR: $X
- Ending MRR: $Y (+/- Z%)
- Total revenue (one-time + MRR): $Z
- Lead→close rate: X% (vs target Y%)
- CPA paid: $X (vs target Y)
- Churn rate: X%/mo (vs target Y%)

## What went right (3 bullets)
- [Specific thing]
- [Specific thing]
- [Specific thing]

## What went wrong (3 bullets)
- [Specific thing]
- [Specific thing]
- [Specific thing]

## One priority for Q[N+1]
- [The single most important thing to fix or scale]

## Numbers to watch next quarter
- [Specific metric + target]
- [Specific metric + target]
```

---

## When the dashboard reveals a real problem

1. **Lead→close rate dropped** → diagnose: is it new leads (different
   source/quality)? Or is follow-up worse (response time slipped)?
2. **CPA paid ads exploded** → usually keyword bid inflation or ad
   creative fatigue. Pause winners, kill losers.
3. **Total MRR flat for 4+ weeks** → product-market fit signal weak.
   Talk to 5 recent churned customers.
4. **Compliance issue** → halt new sign-ups until resolved. CMRA
   compliance failures end CMRA businesses.

Quick problems should be solved in a week. Deep problems take a
quarter.

---

## What this dashboard is NOT

- **Not a vanity-metrics dashboard.** No "page views" or "social
  followers" without conversion attribution.
- **Not a forecasting tool.** It&apos;s backward-looking. Forecasting
  needs separate models.
- **Not a substitute for talking to customers.** The dashboard tells
  you what; customer calls tell you why.

The whole point: 30 minutes a week tells you whether the business is
working. Gives you the signals to redirect effort. Don&apos;t skip it.
