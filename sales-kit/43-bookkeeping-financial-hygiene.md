# Bookkeeping + Financial Hygiene

The financial discipline that prevents disasters at $5M MRR. Most
founders skip this in early stages and pay 5-10x the cost cleaning
up later.

**Principle**: Set up clean from day one. The cost of messy books
shows up as audit risk, missed tax deductions, valuation discounts
at exit, and bad decisions made on bad data.

---

## The minimum viable financial stack

For a CMRA + same-day delivery + SaaS + bundled-services business:

| Tool | Purpose | Cost |
|---|---|---|
| Mercury or Brex | Business checking + cards | Free |
| Stripe | Payment processing | 2.9% + 30¢ |
| Stripe Connect | Operator-routed payments (SaaS) | Configurable |
| QuickBooks Online | Accounting | $30-90/mo |
| Gusto or OnPay | Payroll (when LLC + S-corp election kicks in) | $40-50/mo + $6/employee |
| Bench or Pilot | Bookkeeper service (when self-bookkeeping breaks down) | $200-600/mo |
| TurboTax Business / CPA | Tax filing | $1k-3k/yr |

Recommended setup for our scale:

- **Year 1 ($0-$50k revenue)**: Mercury + Stripe + QuickBooks
  Self-Employed. DIY bookkeeping. Maybe $500-$2k for tax filing.
- **Year 2 ($50k-$500k)**: Switch to QuickBooks Online. Hire
  monthly bookkeeper ($200-400/mo). CPA for taxes ($1-2k).
- **Year 3+ ($500k+)**: Outsource bookkeeping fully (Bench / Pilot
  / Wave). Hire dedicated CPA. Possibly hire fractional CFO for
  $2-5k/mo.

---

## Daily / weekly / monthly cadence

### Daily (5 min)
- Check Stripe dashboard: any failed charges? Disputes? Refund
  requests?
- Sweep emails: any vendor invoices? Customer billing issues?

### Weekly (30 min, Friday)
- Reconcile Mercury / Brex transactions (categorize each)
- Reconcile Stripe payouts (match to QuickBooks)
- Process any outstanding vendor invoices
- File receipts (camera scan + upload to QuickBooks)

### Monthly (1-2 hours, end of month)
- Run P&L report
- Run cash flow report
- Compare to budget (variance analysis)
- Lock the books (close the period in QuickBooks)
- Pay any quarterly estimated taxes if due

### Quarterly (3-4 hours)
- Quarterly tax payment (Apr 15 / Jun 15 / Sep 15 / Jan 15)
- Quarterly P&L review
- Update annual forecast

### Annually (8-16 hours)
- Annual tax filing (LLC / S-corp / personal)
- Annual review of insurance, vendors, banking
- Annual review of tax structure (does S-corp election still make
  sense?)

---

## Chart of accounts (essential categories)

For our business specifically:

### Revenue (income)
- Mailbox plan revenue (Basic / Business / Premium tiers tracked
  separately)
- Same-day delivery revenue
- $2k Bundle revenue
- CMRA SaaS subscription revenue
- Affiliate commission earnings (if you affiliate elsewhere)
- Partner referral fees
- Notary fees
- Shipping supplies / packaging revenue
- Other revenue

### Cost of goods sold (COGS)
- Stripe processing fees
- Shippo / shipping costs (when forwarding)
- USPS-CMRA license fees
- Carrier costs (FedEx, UPS for forwards)
- Operator referral fees (your costs to acquire the SaaS license)

### Operating expenses
- Rent (storefront + office if separate)
- Utilities
- Insurance (general liability, professional, cyber, workers comp)
- Salaries + payroll taxes
- Software subscriptions (categorize by purpose: marketing /
  operations / engineering / accounting)
- Marketing + advertising (Google Ads, content tools, etc.)
- Travel + entertainment (be careful — IRS scrutiny)
- Professional services (legal, accounting, consulting)
- Office supplies + equipment
- Telephone + internet
- Vehicle expenses (if you provide for drivers)
- Equipment depreciation

### Other categories
- Interest expense
- Tax expense (federal, state, local)
- Owner&apos;s draw / S-corp distributions
- Owner&apos;s salary (S-corp only)

---

## What to track per customer (revenue attribution)

In QuickBooks, set up "classes" or "tags" for:

- **Customer ID** (linked to admin dashboard)
- **Product line** (mailbox / delivery / bundle / SaaS)
- **Acquisition channel** (organic / paid / referral / direct)
- **Plan tier** (Basic / Business / Premium / Solo / Growth / Multi)
- **Customer cohort** (signup month)

Why: this lets you answer "what&apos;s the LTV of customers from
[channel] who started in [cohort]?" That&apos;s the question that
drives growth investment decisions.

---

## Tax-deductible business expenses (commonly missed)

Things you can legitimately deduct for a business like ours:

- **Home office** (if you have one + use it primarily for business):
  $5/sq ft × sq ft used, up to $1,500/year (simple method) OR
  actual-cost method
- **Vehicle**: $0.67/mile (2026 rate) for business miles. Track in
  MileIQ or similar.
- **Phone**: business-use percentage of monthly bill
- **Software subscriptions**: 100% deductible
- **Marketing + advertising**: 100% deductible
- **Travel for business**: 100% deductible (with receipts)
- **Meals (50% deductible)**: business-purpose meals
- **Professional development**: courses, books, conferences
- **Supplies**: office supplies, packing supplies, business cards
- **Equipment** (over $2,500): depreciate over useful life. Under
  $2,500: deduct in year of purchase.
- **Mileage**: track ALL business miles
- **Health insurance** (S-corp owners): can be deductible if set up
  correctly
- **Retirement contributions**: SEP-IRA / Solo 401k — significant
  tax savings

**Things NOT deductible**:
- Personal commute (home → first work location)
- Personal expenses on business card (separate them)
- Most clothing (only required uniforms / branded)
- Penalties / fines

---

## Common bookkeeping mistakes

### 1. Mixing personal + business expenses

Worst mistake. Causes IRS scrutiny + makes books unreadable. Fix:
separate accounts. Personal card for personal stuff. Business card
for business stuff. Period.

### 2. Not categorizing transactions

QuickBooks needs every transaction categorized. Skipping this means
end-of-year is a 40-hour cleanup project. Spend 5 minutes/day to
categorize as you go.

### 3. Not reconciling bank accounts

Reconcile monthly. If your QuickBooks balance ≠ bank balance,
something&apos;s wrong. Don&apos;t ignore.

### 4. Treating Stripe payouts as deposits

Stripe deducts fees BEFORE depositing. Your QuickBooks needs to
record gross revenue + Stripe fee (as expense). Otherwise revenue
is understated by 3% and books don&apos;t reconcile.

### 5. Not tracking inventory

If you sell shipping supplies / packing supplies, those need
inventory accounting. Beginning inventory + purchases - ending
inventory = COGS.

### 6. Ignoring quarterly taxes

Self-employed (or S-corp owner) owes quarterly estimated taxes.
April 15, June 15, September 15, January 15. Underpayment =
penalty.

### 7. Late annual reports / franchise tax

CA $800 franchise tax due April 15 (LLC) or 15th day of 4th month.
Statement of Information due every 2 years. Late = penalties +
dissolution risk.

### 8. Cash-only accounting at scale

Cash basis (count revenue when received) is fine for very small
businesses. Past $250k revenue, switch to accrual basis (count
revenue when earned). Required for accurate financial picture +
required by GAAP for raising capital.

---

## Cash flow management

Different from profit. You can be profitable on paper but cash-poor
in practice (because of timing of receivables, deferred revenue,
inventory, etc.).

Weekly cash flow check:

- **Cash on hand** (sum of all bank balances)
- **Outstanding receivables** (money owed to us)
- **Outstanding payables** (money we owe vendors / payroll / taxes)
- **Net 30-day cash** (cash + collectibles - payables due in 30 days)

If "Net 30-day cash" trends down for 4+ weeks, take action:
- Slow customer payments → tighter A/R
- Slow vendor pays (but be a good payer overall)
- Cut variable expenses (paid ads, contractors)

---

## Setting prices to support healthy unit economics

For each product line, calculate:

- **Gross margin** = (Revenue - direct COGS) / Revenue
- **Contribution margin** = (Revenue - direct COGS - direct customer
  acquisition cost) / Revenue
- **LTV/CAC ratio** (lifetime value / customer acquisition cost)

Healthy targets:

| Metric | Target | Crisis if below |
|---|---|---|
| Gross margin | 70%+ for SaaS, 50%+ for services | 40% |
| Contribution margin | 30%+ | 15% |
| LTV/CAC ratio | 3:1+ | 1.5:1 |
| CAC payback period | <12 months | 24+ months |

If a product line has bad unit economics, fix (raise price /
reduce CAC) or kill.

---

## Year-end tax preparation

Starting October 1:

1. **Pull annual P&L** from QuickBooks (or wait til Dec 31 + adjust)
2. **Tag every expense** as deductible / not / partially deductible
3. **Pull all 1099-NECs** sent + received
4. **Prep K-1s** if you have a multi-member LLC
5. **Calculate estimated tax liability** for January 15 payment
6. **Send to CPA** by mid-January at latest

Common end-of-year moves to reduce tax:
- Bonus to employees (deductible in current year)
- Equipment purchase before year-end (Section 179 deduction)
- Retirement contributions (SEP-IRA / Solo 401k)
- Charitable donations (with documentation)

Don&apos;t do these JUST for the tax deduction — only when they
make business sense AND have a tax benefit.

---

## What a $5M MRR P&L looks like (rough projection)

If we hit $60M annualized revenue:

| Line | $/yr | % of revenue |
|---|---|---|
| Revenue | $60,000,000 | 100% |
| COGS (Stripe, USPS, carriers, hosting) | $9,000,000 | 15% |
| Gross profit | $51,000,000 | 85% |
| Sales + marketing | $9,000,000 | 15% |
| Engineering + product | $6,000,000 | 10% |
| Customer success + support | $4,500,000 | 7.5% |
| Operations (storefront + dispatch + compliance) | $7,500,000 | 12.5% |
| G&A (legal + accounting + admin) | $3,000,000 | 5% |
| **Total opex** | **$30,000,000** | **50%** |
| EBITDA | $21,000,000 | 35% |
| Net income (after tax) | ~$15,000,000 | 25% |

This is a healthy public-SaaS-quality P&L. Achievable for a
combined SaaS + services business at scale, but requires discipline.

---

## When to bring in professional help

Hire a CPA when:
- Revenue clears $100k/year
- You make S-corp election
- You hire your first W-2 employee
- You receive any IRS notice
- You start raising capital

Hire a fractional CFO when:
- Revenue clears $1M/year
- You&apos;re raising venture capital
- You need financial modeling for board / investors
- You&apos;re considering an acquisition (theirs or ours)

Hire full-time CFO when:
- Revenue clears $10M/year
- You have multiple revenue lines + complex margin analysis
- You&apos;re preparing for IPO / acquisition / large debt facility

---

## Common questions

### "Can I be the CFO of my own business?"

For revenue under $1M, yes. With QuickBooks + a good CPA + 1 hour
a week of finance work, you have what you need.

Above $1M, the opportunity cost of CEO-doing-CFO-work is huge.
Hire help.

### "Should I incorporate as LLC or S-corp or C-corp?"

For a bootstrap business at our scale: S-corp (election on top of
LLC) when revenue clears $80k. Saves $5-15k/yr in self-employment
tax (sales kit doc has the math). C-corp if you&apos;re raising VC.

### "What about international / multi-state operations?"

If you have W-2 employees in multiple states, you have to register
+ file payroll in each state. If you have customers in multiple
states, sales tax may apply (we don&apos;t generally — services
are tax-exempt in most states). Consult a CPA.

### "Should I get business insurance?"

Yes. Specifically:
- General liability ($500-1500/yr)
- Professional liability / E&O ($1k-3k/yr)
- Cyber liability (becoming standard for any tech business)
- Workers comp (required by CA law if you have W-2 employees)
- Property + business interruption (if you own / heavily lease
  storefront)

Don&apos;t over-insure. Don&apos;t under-insure. Talk to a
commercial broker.

---

## The big idea

Bookkeeping is not exciting. It&apos;s also not optional. The
businesses that grow to $5M+ MRR are the ones that built financial
discipline early.

5 minutes a day. 30 minutes a week. 1-2 hours a month. Skip those
and you&apos;ll spend 40 hours every March cleaning up.

Set the system up. Stick to the cadence. The compounding effect of
clean books for 5 years vs messy books is the difference between a
sellable business and a personal mess.
