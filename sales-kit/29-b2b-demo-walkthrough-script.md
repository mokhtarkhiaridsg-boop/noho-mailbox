# B2B Demo Walkthrough Script — CMRA SaaS

The 30-minute demo that closes 25-35% of qualified prospects.

This script is for live operator demos booked from the LinkedIn outbound
playbook (`21-linkedin-outbound-playbook.md`) or the B2B cold email
sequences (`28-cold-email-b2b-saas-sequences.md`). Audience: existing
CMRA operators on iPostal1 / Anytime / PostScan / Earth Class Mail, OR
pack-and-ship store operators considering adding CMRA.

**Format**: 30 minutes. Real product walkthrough. NOT a pitch. Buyers in
this market are tired of pitches — they want to see software that works.

**Tools**: Zoom or Google Meet with screen share. Pre-loaded admin
dashboard with realistic demo data (~50 fake customers, mixed states,
realistic mail volume). Backup: live system if demo data is stale.

---

## Pre-demo prep (5 min before)

- [ ] Pull up demo dashboard in incognito tab (clean state)
- [ ] Pre-load member portal in another tab (logged in as fake user)
- [ ] Confirm Stripe test environment is live
- [ ] Confirm same-day delivery dispatch console has 2-3 test orders
- [ ] Pull up prospect&apos;s LinkedIn / website in another tab for
      personalization references
- [ ] Have the 6-month migration playbook open in a tab as backup
- [ ] Pen + paper for notes (don&apos;t take notes IN the demo — looks
      distracted)

---

## Opening (3 minutes)

```
"Hey [Name], thanks for taking the time. Quick check before we dive in:

You mentioned you&apos;re running [their_count] active boxes today on
[their_network]. Anything else change on your end since we set this up?"
```

Listen for: changes in box count, recent network issues, any new
constraints (e.g., they hired staff, they added a location, they had
a customer-service incident).

```
"Cool. Here&apos;s what I want to do in our 30 min:

5 minutes — I&apos;ll show you the admin dashboard the way we use it
running NOHO Mailbox. About 500 active boxes.

10 minutes — I&apos;ll show you the workflows that matter day-to-day
(mail intake, scanning, customer dashboard, dispatch).

5 minutes — pricing, migration timeline, anything specific to your
situation.

Last 10 minutes — your questions. Whatever I haven&apos;t answered.

Sound right?"
```

Wait for confirmation. If they push back ("can you start with pricing?"),
go with their preference — most prospects pre-judge based on price, so
giving it early sometimes builds trust.

---

## Section 1: Admin Dashboard (5 min)

Share screen. Show the admin home view.

```
"This is what I see when I open the admin every morning. Top of the
screen: today&apos;s mail intake count, today&apos;s revenue, today&apos;s
forwarding queue.

Right side: real-time alerts. Things like Form 1583 expiring soon,
USPS reporting due, or a customer billing failure.

Down here: the activity feed. Shows last 24 hours of events — new
sign-ups, scans completed, forwards processed. We use this for shift
handoff between morning and afternoon staff.

Anything you&apos;re NOT seeing here that you have on [their_network]
today?"
```

Listen carefully. The biggest signal is what they ask for that you
don&apos;t have. Note it. Either commit to building it (if reasonable)
or honestly say it&apos;s not on our roadmap.

Click into the customer list view.

```
"Customer list — searchable, filterable. By plan, by status (active /
suspended / pending Form 1583), by location if you&apos;re multi-store.

Bulk actions: send Form 1583 reminder, archive inactive customers,
export to CSV. We use export for monthly USPS reporting.

Click any customer — full profile with their plan, their Form 1583
status, payment history, mail activity, support notes.

This is also where you&apos;d see their Stripe customer ID if you need
to issue refunds, change cards, etc."
```

---

## Section 2: Daily Workflows (10 min)

### Mail intake (3 min)

Switch to the mail intake screen.

```
"Morning mail comes in — UPS, USPS, FedEx, whoever. Staff scans the
package barcode or types the box number. Photo gets attached
automatically from the desk camera.

Customer gets a notification within 30 seconds: text + email + push
notification. Their dashboard updates in real-time.

If it&apos;s a Form 1583-required-photo (driver&apos;s license, IRS
letter, etc.), we flag it for human review before sending the scan."
```

Demo: scan a fake package, show the notification trigger.

### Scanning workflow (2 min)

Switch to scanning queue.

```
"Customer requests a scan — either auto (per their plan) or on-demand
($2/page after free tier). Goes into this queue. Staff opens the
envelope, scans, types brief description, presses Send.

Customer dashboard gets the PDF + thumbnail. They can download, forward
to email, or order a physical forward of the original."
```

### Customer dashboard (member portal) (3 min)

Switch tabs to the member portal.

```
"This is what the customer sees. Their plan, their box, recent mail,
forwarding requests, billing history.

Mail tab: every piece they&apos;ve received. Searchable. Click any to
see scan, request forward, or shred.

Forwarding tab: in-progress requests with tracking. They pick the
carrier (USPS Priority / FedEx / DHL) at the time of forward.

Settings: change their plan, update card, manage Form 1583. We make
the 1583 renewal process automated — emails them 60 days before
expiration.

This is mobile-responsive — most of our customers actually use it on
their phone, not desktop."
```

### Dispatch console (for same-day delivery, if relevant) (2 min)

```
"If you&apos;re thinking about adding same-day local delivery — and a
lot of operators do this for adjacent revenue — here&apos;s the
dispatch console.

Real-time map of pending pickups. We can assign drivers manually or
let the auto-router optimize the run. Driver app is mobile-only, real
GPS tracking, customer gets ETA texts.

We&apos;ve seen operators add $1,500-$5,000/mo of revenue within 6
months of launching same-day. The platform doesn&apos;t cost extra —
it&apos;s included in the license."
```

If prospect is purely interested in CMRA mailboxes (not delivery),
skip this section. Save the time for Q&A.

---

## Section 3: Pricing + Migration (5 min)

Pull up the pricing slide (or just speak it):

```
"Pricing is flat. No revenue share. No per-customer fees.

Solo tier: $299/mo. Up to 250 boxes, 1 location.
Growth tier: $799/mo. Up to 750 boxes, 1-3 locations.
Multi tier: $1,499/mo. Up to 2,500 boxes, 1-10 locations.
Enterprise: custom quote for 10+ locations or 2,500+ boxes.

No setup fee. No long-term contract — month-to-month after a 30-day
notice.

Migration: we&apos;ve done this 6 times now. Took 2 weeks each. We
provide:

1. CSV import tool for your customer list + payment history
2. Stripe Connect setup so payments go directly to your account
3. Form 1583 archive import (PDF format)
4. USPS reporting export configured
5. 3 weeks of active support during the transition

Migration is included in the license. No separate fee.

For your numbers — [their_count] boxes — that&apos;s [tier_recommendation].
Saves you about [estimated_savings] vs [their_network] over 12 months."
```

Wait. Don&apos;t fill silence. Let them respond.

If they ask "what about [feature X]," answer honestly. If we have it:
show it. If we don&apos;t: say so + ask if it&apos;s a deal-breaker.

---

## Section 4: Q&A (10 min)

Common questions + responses:

### Q: "Can I white-label the customer portal?"

```
"Yes, on Growth tier and up. Custom domain (boxes.yourbusiness.com),
your logo, your colors. Login flow looks like your business, not ours.

Solo tier uses our domain with your branding within. Want to see what
both look like?"
```

### Q: "What if my customers see my old branding for a few weeks during migration?"

```
"They won&apos;t. We set up the new portal with your full branding
before migration day. Customers log in to a portal that looks like
yours from day 1. The old [their_network] portal stays live until
you cancel — no overlap visible to them."
```

### Q: "What about my Stripe / payment continuity?"

```
"You connect your existing Stripe account via Stripe Connect. Customers&apos;
saved cards transfer over. Their billing cycles continue as scheduled.

If you&apos;re using a different processor (Authorize.net, Square),
we can usually integrate — check with us on day 1 of evaluation."
```

### Q: "What about USPS-CMRA compliance?"

```
"Software supports everything USPS requires: Form 1583 archive,
quarterly reporting export, identity verification logs. We&apos;ve
been through 3 USPS audits ourselves with zero findings.

We provide the audit-prep documentation in PDF when an inspection is
scheduled."
```

### Q: "What if your software has bugs?"

```
"Software runs NOHO Mailbox in production. Any bug affecting operators
affects us first. We fix fast — typical critical-bug-to-deploy is 4-12
hours. Non-critical: 1-3 days.

You get direct access to engineering — me or my co-founder, depending
on the issue. Not a tier-1 helpdesk queue."
```

### Q: "What if you go out of business?"

```
"Data export tool gives you everything (customer list, payment history,
Form 1583 archive, scans) in standard formats. You can move that data
to any other platform if needed.

We&apos;ve been operating profitably for 4 years and we&apos;re
diversified — storefront customers + SaaS license customers. So we&apos;re
not betting the company on a single revenue stream."
```

### Q: "Can I talk to a current operator using your software?"

```
"Yes. We&apos;ll connect you with one of our existing operators —
similar size to yours. Can ask them anything you want. We&apos;ll
introduce you over email."
```

### Q: "What&apos;s your roadmap?"

```
"Public roadmap is on the customer portal. Next 90 days:

[Feature 1] — currently in dev
[Feature 2] — design phase
[Feature 3] — research / spec

We ship something visible monthly. Operator feedback drives what comes
next — if you have specific asks, they get priority over generic
roadmap items."
```

### Q: "Pricing — can you do less than $299?"

```
"$299 is our floor. Below that the math doesn&apos;t work for us — we
need to fund engineering, support, hosting, USPS-CMRA compliance work.

If $299 is a stretch for you right now, the right answer is probably
&quot;wait a quarter or two until you&apos;re ready.&quot; The migration
itself takes effort and you want to be sure the platform fee is
sustainable.

Our smallest active operator is at 35 boxes. They&apos;re close to
break-even on the license. They&apos;re scaling — if you&apos;re NOT
scaling, the platform fee won&apos;t feel right."
```

### Q: "What about white-labeling for enterprise / franchise opportunity?"

```
"Yes — on Multi tier and up, full white-label is available. We work
with two franchise systems and one regional pack-and-ship chain on
white-label deals.

Enterprise quote includes: custom branded mobile app, dedicated
infrastructure, custom integrations, account manager. Quote varies
by scope — usually $3-15k/mo depending on customization."
```

---

## Closing (last 2 min)

After Q&A finishes:

```
"OK — we&apos;ve covered a lot. Three things to figure out next:

1. Does the platform handle what you need? You&apos;ve seen the
   admin, the customer portal, the workflows. If something&apos;s
   missing, tell me now or email me later.

2. Does the math work for your numbers? At [their_count] boxes,
   [tier] saves you about [savings_estimate] over 12 months vs
   [their_network].

3. Is timing right? We can start migration in 2 weeks if you&apos;re
   ready. We can also schedule for 60-90 days out if you have a
   contract end date you want to align with.

Where are you at on those three?"
```

Wait. Listen. Three common responses:

### "I&apos;m sold — what&apos;s next?"

```
"Awesome. Two things:

1. I&apos;ll send a migration intake form by EOD today. Pulls together
   your active customer count, current network, billing details, and
   timing.

2. We&apos;ll book a kickoff call in 7-10 days once you&apos;ve had
   time to fill that out.

Sound right?"
```

### "Need to think about it / discuss with [partner / spouse / co-owner]"

```
"Totally fair. Couple things to send your way that might help:

- Migration playbook (15-min read): nohomailbox.org/for-cmra-operators/migrate
- Operator switching guide PDF: [link from sales kit doc 25]
- Reference operator we can connect you with

Want all three? I&apos;ll email by EOD.

Also — what timeframe should I follow up? Don&apos;t want to bother you
weekly, but I do want to be useful when you&apos;re ready."
```

### "Not the right fit / not ready"

```
"Got it. What specifically didn&apos;t fit?"
```

Listen carefully. If it&apos;s a real product gap: take notes, follow
up in 60 days when fixed (if applicable). If it&apos;s just price /
timing: schedule a follow-up in 90 days. If it&apos;s a fundamental
mismatch (wrong industry, wrong scale): wish them well, move on.

```
"Appreciate the time. If anything changes or you have questions later,
my direct line is (818) 506-7744. Best of luck with [their_business]."
```

---

## Post-demo (within 1 hour)

Send a short recap email:

```
Subject: Recap — [their_business] x NOHO Mailbox

Hey [Name],

Quick recap of what we covered today:

✦ Walked through the admin dashboard, customer portal, mail intake
  workflow, scanning queue, dispatch console.
✦ Pricing: [tier] at [price]/mo for your size.
✦ Migration: 2 weeks, 6-time playbook, included in license.

Three things you asked about:
[Specific items they wanted answers to]

Resources I promised:
- Migration playbook: nohomailbox.org/for-cmra-operators/migrate
- Operator reference call: I&apos;ll connect you with [Name] this week
- [Other items they asked for]

Next: I&apos;ll follow up in [their_specified_timeframe]. If anything
comes up earlier, my direct line is (818) 506-7744.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601
```

---

## Tracking

After every demo, log:
- Date + duration
- Their numbers (box count, current network, monthly revenue estimate)
- Specific objections raised
- What they wanted next (close, think, defer, decline)
- Estimated MRR if they close
- Follow-up date

**Track demo conversion**:
- Demos held → closed
- Time-to-close (median: 18-30 days from first demo)
- Reasons for losses (price, feature gap, timing, fit)

**Iterate**:
- If demo conversion is below 25%, the demo content needs work
- If specific objections come up 3+ times, build them into the script
  preemptively
- If specific feature gaps come up 5+ times, add to product roadmap

---

## What NOT to do in demos

- **Don&apos;t pitch.** Show the product. Let it sell itself.
- **Don&apos;t talk over the prospect.** Wait through silence. Their
  objections are gold; don&apos;t pre-answer them.
- **Don&apos;t bullshit features.** If we don&apos;t have something,
  say so. &quot;Not yet&quot; or &quot;not on roadmap&quot; — don&apos;t
  fake it. Sales calls are recorded sometimes; lies kill trust.
- **Don&apos;t discount on demand.** $299 is the floor for a reason.
  Discounting cheapens the product and sets a precedent.
- **Don&apos;t end without a clear next step.** Every demo ends with:
  (a) booked migration, (b) scheduled follow-up date, or (c) explicit
  &quot;not a fit, no follow-up.&quot;

---

## The big idea

Buyers in this market are tired of slick SaaS pitches. The thing that
closes them is showing real software that solves real ops problems
they have today.

Your job in the demo isn&apos;t to convince. It&apos;s to be useful
enough that the math + product fit make the decision easy.
