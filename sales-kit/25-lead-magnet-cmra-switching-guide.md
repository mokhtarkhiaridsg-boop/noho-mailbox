# Lead Magnet — CMRA Operator Switching Guide

**Format**: 4-page PDF for B2B CMRA SaaS prospects. Higher-value lead
magnet than consumer-facing cheat sheets — designed to capture
operators researching alternatives to iPostal1 / Anytime / PostScan.

**Distribution**:
- Gated on `/for-cmra-operators` Apply page
- Linked in LinkedIn outbound DMs (`21-linkedin-outbound-playbook.md`)
- Linked in CMRA-relevant Reddit answers (r/postoffice, r/smallbusiness)
- Sent to LinkedIn replies who ask about migration

**Email capture flow**:
1. Operator enters email + active box count (qualifying field)
2. Auto-email sends with PDF link
3. They enter SaaS demo nurture sequence (`20-email-nurture-sequences.md`
   Sequence B)

**Conversion target**: 8-15% of LinkedIn-driven downloads result in demos
booked. Of those, 25-35% close.

---

# CMRA Operator Switching Guide 2026

*The honest playbook for moving off iPostal1, Anytime Mailbox, or
PostScan to your own software stack. Written by an operator who did it.*

**By NOHO Mailbox · 5062 Lankershim Blvd, North Hollywood CA 91601 ·
nohomailbox.org**

---

## Why This Guide Exists

We ran NOHO Mailbox on iPostal1 for the first two years. The platform
worked. Our customers were happy. We were paying ~30% of our gross to
their network in subscription cuts and per-piece fees.

In 2024 we decided to build our own software stack. Took six months. The
math worked: $299/month flat license vs ~$2,400/month in network fees
at our scale. We've now licensed that software to other operators in
Texas, Arizona, Nevada, and Florida.

This guide is what we wished we&apos;d had when we made the switch. No
hidden agenda — we&apos;ll tell you when staying on iPostal1 is the right
call.

---

## When to Switch

**Switch if any of these apply:**

- You have 50+ active boxes and your network take is over $200/mo
- You&apos;ve hit a feature gap (custom dashboards, multi-location,
  white-label) and the network won&apos;t address it
- You&apos;re scaling to a second / third location and the per-location
  cost is doubling
- You&apos;re ready to add adjacent revenue (same-day delivery, packing
  & shipping, notary services) but the platform doesn&apos;t support it

**Do NOT switch if:**

- You have under 30 active boxes — the math probably doesn&apos;t work yet
- You don&apos;t have technical bandwidth (or a vendor) to handle data
  migration
- Your business is for sale within 12 months — buyer continuity is
  easier on a known network
- You&apos;re happy with the network and growth is slow

The sweet spot: 50-200 boxes, profitable but margin-constrained, ready
to add adjacent revenue.

---

## The Real Math

Most operators undervalue the network cost. Here&apos;s the standard math:

### Network fee structure (iPostal1, similar networks)

| Component | Typical take |
|---|---|
| Monthly subscription rev share | 15-30% |
| Forwarding postage markup | 25-50% |
| Per-piece scanning fees | $1-$3 / piece |
| Setup / activation fees | $25-$50 / new account |

### Example: 100 active boxes, $20/mo average revenue

**On iPostal1**:
- Box subscription gross: 100 × $20 × 12 = **$24,000 / yr**
- Network rev share (20%): -$4,800
- Forwarding markup (assume 50 forwards/mo × $3 markup): -$1,800
- Per-piece scanning (assume 200 scans/mo × $1.50): -$3,600
- **Net to operator: $13,800 / yr**

**On your own platform** (NOHO Mailbox software, $299/mo Solo tier):
- Box subscription gross: $24,000
- License fee: -$3,588
- Forwarding markup: keeps for operator (+$3,600 vs network)
- Scanning fees: keeps for operator (+$3,600 vs network)
- **Net to operator: $20,412 / yr**

**Difference: $6,612 / yr more for the operator.**

This grows non-linearly with box count. At 250 boxes, the gap is
~$15-20k/yr. At 500+, the savings cover a junior staff hire.

---

## The Migration Timeline (Real)

We&apos;ve done this 6 times across our customer base. Here&apos;s what
actually happens:

### Week 0: Pre-decision
- Pull current customer list + active subscriptions
- Pull payment history (essential for revenue continuity)
- Document current dispatch / forwarding workflows
- Identify any custom integrations (Stripe, QuickBooks, accounting)

### Week 1-2: Setup
- Provision your platform license (we onboard inside 48 hours)
- Configure storefront branding (colors, logo, domain)
- Import customer list via CSV
- Import historical payment records
- Configure CMRA compliance settings (Form 1583 archive, USPS reporting)

### Week 3: Parallel running
- Both systems live. New customers go to the new platform.
- Existing customers continue on the old until billing cycle ends.
- Train staff on the new admin dashboard.
- Test scanning, forwarding, dispatch workflows end-to-end.

### Week 4: Cutover
- Migrate billing for existing customers (one-time email + Stripe
  customer migration)
- Update Form 1583 archive
- Update USPS quarterly reporting to point at new system
- Announce to customers (transparent message: "we&apos;ve upgraded our
  platform; nothing you have to do")

### Week 5+: Sunset
- Old network gets a 30-day cancellation notice (most have this in their
  contract)
- Final reconciliation: did all payments transfer? Any gaps?
- Final 30-day customer-care monitoring (we&apos;ve seen 0 churn from
  the migrations we&apos;ve done — but be ready for support questions)

**Total operator time invested**: 40-80 hours over 5 weeks. We support
you actively for the first 3 weeks.

---

## CMRA Compliance During Migration

USPS DMM Section 508 requires:
- Form 1583 on file for every active mailbox
- Quarterly reporting to local Postmaster
- Identity verification before mail receipt

Migration concerns:
- **Form 1583 archive**: must transfer to the new system. We import as
  PDFs into the customer record.
- **Quarterly USPS reporting**: must continue without gap. We provide
  the export format that satisfies USPS standards.
- **Identity verification**: customers don&apos;t need to re-verify.
  Their existing 1583 carries over.

Our software passes USPS-CMRA inspection — we&apos;ve been through 3
without findings. We&apos;ll provide compliance documentation in
writing.

---

## What You&apos;re Buying With Our License

The $299-$1,499/mo license includes:

**Customer-facing**:
- Member dashboard (web + mobile-responsive)
- Mail scanning interface
- Forwarding requests
- Same-day pickup scheduling
- Plan upgrades / downgrades
- Account settings + payment management

**Admin-facing**:
- Customer management (search, filter, bulk actions)
- Mail intake + scanning workflow
- Dispatch console (same-day delivery, route optimization)
- CMRA compliance (Form 1583, USPS reporting)
- Billing + revenue dashboard
- Staff permissions + audit log

**Operations**:
- Stripe Connect integration (your payment processor, your money)
- Twilio SMS + email notifications
- Customer self-service portal
- API access (if you want to integrate other tools)

**Excluded** (for clarity):
- Your storefront lease (you handle)
- USPS-CMRA registration (you handle — straightforward, USPS does the
  paperwork)
- State business licenses (you handle)
- Customer marketing (we provide templates; you execute)

---

## Pricing Tiers

| Tier | Boxes | Locations | Price |
|---|---|---|---|
| Solo | up to 250 | 1 | $299 / month |
| Growth | up to 750 | 1-3 | $799 / month |
| Multi | up to 2,500 | 1-10 | $1,499 / month |
| Enterprise | 2,500+ or 10+ locations | custom | Quote |

No revenue share. No per-customer fees. No setup fees. Cancel any time
with 30 days notice.

---

## Common Concerns

### "What if your software has bugs?"

The platform runs NOHO Mailbox in production at ~500 boxes. Any bug
that affects operators affects us first. We fix fast — typical
critical-bug-to-deploy is 4-12 hours. Non-critical: 1-3 days.

You get direct access to engineering — not a tier-1 helpdesk queue.

### "What if you go out of business?"

We provide a data export tool that gives you everything (customer list,
payment history, Form 1583 archive, scans) in standard formats (CSV +
PDF). You can move that data to any other platform if needed.

We&apos;ve been operating NOHO Mailbox profitably for 4 years, and we
operate in two markets (storefront customers + SaaS license customers).
Diversified revenue.

### "What about USPS audits?"

USPS-CMRA audits check: Form 1583 on file, quarterly reporting accurate,
mail handling procedures. Our software supports all three. We&apos;ve
passed 3 audits with zero findings; we share the audit pack
documentation we used.

### "Will my customers notice the change?"

If done right, no. The dashboard URL might change (we use a custom
subdomain like `boxes.yourbusiness.com`). Branding stays yours. Login
flow stays familiar.

### "What about same-day delivery integration?"

Built into the platform. If you don&apos;t currently offer same-day,
this is the easiest moment to add it (we provide pricing logic + dispatch
workflow + driver app). Most operators add $1,500-$5,000/mo of revenue
within 6 months of launching same-day from their existing customer base.

---

## Decision Tree — Should You Switch?

1. Do you have 50+ active boxes? → If no, wait until 50.
2. Are you paying $200+/mo to your network? → If no, the math probably
   doesn&apos;t work yet.
3. Are you blocked from adding adjacent revenue (same-day, custom
   features) by your network? → If yes, switching is the unlock.
4. Do you have technical bandwidth to manage migration? → If no, hire
   a vendor (we recommend a few) or wait until you do.
5. Are you scaling to multiple locations? → If yes, the per-location
   savings compound fast.

If 3+ of these are "yes," the migration probably pays for itself within
6-12 months.

---

## Next Steps

1. **Run the math on your specific numbers.** Reply to this email with
   your active box count, average monthly revenue per box, and current
   network. We&apos;ll send a custom ROI calculation.

2. **Schedule a real demo.** 30 minutes. We&apos;ll show you the actual
   admin dashboard, member portal, dispatch console, billing module,
   CMRA compliance checks. Not a sales pitch — a product demo.

3. **Read the migration playbook.**
   nohomailbox.org/for-cmra-operators/migrate

4. **Talk to a current operator using our software.** We&apos;ll
   introduce you on request.

---

## About Us

NOHO Mailbox runs out of 5062 Lankershim Blvd, North Hollywood CA. We
process ~500 active boxes and run same-day delivery for 50+ B2B
accounts. We license our software to operators in 4 states.

Founder: [Name redacted in template]
Direct: real@nohomailbox.org · (818) 506-7744
Walk-in counter: Mon-Sat 9am-6pm.

---

*This guide is informational. Specific terms vary by network and may
have changed since publication. Verify current network fees with your
provider. Compare line-item to our $299-$1,499/mo flat-fee pricing.*
