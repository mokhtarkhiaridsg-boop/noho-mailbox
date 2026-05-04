# Cold Email Sequences — B2B SaaS Prospects

3 sequences for cold-outbound to CMRA operators (highest LTV lane in our
business). Used in tandem with `21-linkedin-outbound-playbook.md` —
LinkedIn drives connection + first reply, cold email is the second
touchpoint when LinkedIn DM doesn&apos;t work or the prospect isn&apos;t
on LinkedIn.

**Compliance**: All sequences are CAN-SPAM compliant. Real sender, real
physical address in footer, working unsubscribe, transactional / B2B
context (not consumer marketing). Send rate: ≤30/day from a single
domain. Use a separate sending domain (`outbound.nohomailbox.org`) to
protect main domain reputation.

**Tools**: SmartLead, Instantly, Lemlist, or similar. NOT Mailchimp /
Klaviyo (those are for opt-in lists).

---

## Sequence A: CMRA Operator on iPostal1

**Trigger**: Prospect identified as iPostal1 operator via:
- LinkedIn profile mentions iPostal1 / "private mailbox"
- Their website lists iPostal1 as their software
- Their address shows up in iPostal1's directory

**Volume**: 5-15 sends/day per operator email account.

**Sequence**: 4 emails over 14 days. Stop on reply.

### Email A1 (Day 0)

**Subject lines** (rotate; never reuse same subject in same domain twice):
- `Quick question, [first name]`
- `[their_business] + iPostal1 — quick math`
- `LA mailbox operator → you`

```
Hey [First Name],

I run NOHO Mailbox in North Hollywood — about 500 active boxes, plus
same-day delivery. We were on iPostal1 for the first 2 years. Their
take was killing margin, so we built our own software. Now we license
it to other operators.

Quick question: how many active boxes are you running today?

Asking because the math gets dramatically better around 50-100 boxes.
At 50 boxes, our $299/mo flat license vs ~30% network fees probably
saves you $5-7k/yr. At 200 boxes, more like $20k+.

If your numbers are smaller, I won&apos;t bother you again.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601 · (818) 506-7744

P.S. We&apos;ve migrated 6 operators. Took 2 weeks each, no customer
churn. If you&apos;re curious: nohomailbox.org/for-cmra-operators/migrate

[Unsubscribe link — required by CAN-SPAM]
```

### Email A2 (Day 4)

**Subject lines**:
- `re: quick math`
- `Did you see my note about iPostal1 fees?`

```
[First Name],

Bumping this in case it got buried. The short version:

If you&apos;re running 50+ boxes and paying iPostal1 a piece of every
subscription / forward / scan, the math probably works to switch.
$299/mo flat license, no rev share, no per-customer fees.

Three things that make our software different:

1. Operator-built (we run a real CMRA on this exact stack)
2. Same-day delivery integration (most operators add $1.5-5k/mo of
   revenue within 6 months of launching this)
3. CMRA compliance (Form 1583 archive, USPS reporting) — passes audit

Want to see a 30-min demo? Real product walkthrough, not a sales
pitch. Reply with a time that works.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601

[Unsubscribe link]
```

### Email A3 (Day 9)

**Subject lines**:
- `Migration playbook (no pitch)`
- `What 6 operators learned switching from iPostal1`

```
[First Name],

Last note from me — I won&apos;t keep bothering you.

If switching ever becomes interesting, here&apos;s the migration
playbook we wrote based on 6 operator switches:

nohomailbox.org/for-cmra-operators/migrate

Walks through: what to pull from iPostal1, USPS forwarding setup, the
2-week parallel-run, customer notification template, and the audit
documentation.

Use it whether you switch to us or someone else. The framework is the
same.

— [Your Name]

[Unsubscribe link]
```

### Email A4 (Day 14 — final, breakup)

**Subject lines**:
- `Closing the loop`
- `One more question`

```
[First Name],

I&apos;ve emailed 3 times without a reply, so I&apos;ll take that as a
&quot;not now.&quot;

If you&apos;ve evaluated and decided iPostal1 is the right fit for
your business, that&apos;s a totally valid call. Their network has
real advantages.

If you&apos;d be open to a 5-minute call when your contract is up, I
can send a calendar link. Otherwise, I&apos;ll move on.

— [Your Name]
NOHO Mailbox

[Unsubscribe link]
```

---

## Sequence B: CMRA Operator on Anytime Mailbox / PostScan / Earth Class Mail

**Trigger**: Prospect identified as user of one of these networks.

**Sequence**: 3 emails over 10 days. Higher reply rates than iPostal1
(operators are often more frustrated with these).

### Email B1 (Day 0)

**Subject**: `[their_business] + [their_network] — quick question`

```
Hey [First Name],

I noticed you run [their_business] on [their_network]. We run a real
CMRA in LA — about 500 active boxes — and license our own software
stack to other operators.

Quick question: are you happy with [their_network] today?

We mostly hear from operators who:
- Hit feature gaps the network won&apos;t close (custom dashboards,
  multi-location, white-label)
- Want to add adjacent revenue (same-day delivery, packing & shipping)
  but the platform won&apos;t support it
- Are tired of their take rate eating margin at scale

If any of those apply, I&apos;d love to walk you through what we
built. 30-minute demo. Not a sales pitch.

If you&apos;re happy where you are, no problem.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601 · (818) 506-7744

[Unsubscribe link]
```

### Email B2 (Day 5)

**Subject**: `Quick numbers from operators who switched`

```
[First Name],

If you&apos;re curious about migration math, here&apos;s real data
from operators who switched:

- 50-box operator switching from Anytime: saved ~$8k/yr after license
  fees. Added same-day delivery, $2k/mo new revenue.
- 150-box operator switching from PostScan: saved ~$15k/yr. Doubled
  active customer growth in 6 months because they could actually run
  marketing campaigns (the network blocked custom emails).
- 250-box operator switching from Earth Class Mail: saved ~$22k/yr.
  Used the savings to hire a part-time staff person.

Common thread: the operators that switch usually grow faster afterward,
not slower. The platform stops being a rate-limit on what they can build.

Want to talk through your numbers? Reply with active box count + your
network and I&apos;ll send a custom comparison.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601

[Unsubscribe link]
```

### Email B3 (Day 10 — final)

**Subject**: `Last note + the playbook`

```
[First Name],

Last email from me. If I haven&apos;t been useful by now, I won&apos;t
get there with another email.

If switching becomes interesting later, here&apos;s the migration
playbook:

nohomailbox.org/for-cmra-operators/migrate

Walks through what to pull from your current network, USPS forwarding,
2-week parallel-run, customer notification, audit docs. Same framework
whether you switch to us or someone else.

— [Your Name]

[Unsubscribe link]
```

---

## Sequence C: UPS Store / Pack-and-Ship Considering CMRA Add-On

**Trigger**: UPS Store franchisee or pack-and-ship operator who hasn&apos;t
formally added CMRA-as-a-service to their offering.

**Angle**: New revenue stream for an existing storefront. Different
pitch from the &quot;leave your network&quot; angle in A and B.

**Sequence**: 3 emails over 10 days.

### Email C1 (Day 0)

**Subject**: `Adding CMRA to [their_business]?`

```
Hey [First Name],

I noticed [their_business] does pack-and-ship + UPS services. Have you
considered adding CMRA mailbox subscriptions as a new revenue stream?

Most pack-and-ship stores have idle counter space for 50-200 boxes.
At an average $20/mo per box, that&apos;s $12-48k/yr of new recurring
revenue from the same square footage you already have.

Plus: every CMRA customer becomes a frequent visitor (they pick up
packages, drop off forwards, ship things). Customer lifetime value
goes way up because the same person hits your storefront 5-15x/month
instead of 1-2x.

We license CMRA software (admin + member portal + dispatch + billing
+ compliance) for $299/mo flat. We&apos;ll walk you through the USPS-CMRA
registration (it&apos;s straightforward — about 2 weeks).

Want to see the platform? 30-minute demo, no pitch.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601 · (818) 506-7744

[Unsubscribe link]
```

### Email C2 (Day 5)

**Subject**: `Operator math for pack-and-ship + CMRA`

```
[First Name],

A few stats from operators who added CMRA to their existing
pack-and-ship business:

- Average ramp: 0 → 100 boxes in 18-24 months
- Margin: ~70% on subscription revenue (after USPS-CMRA fees and
  software license)
- Customer behavior: CMRA customers spend 2-4x more on packing &
  shipping at the same store (they&apos;re already there picking up
  mail)

The cleanest path:

1. Register as USPS-CMRA (~2 weeks paperwork)
2. Set up our software ($299/mo)
3. Promote to existing customers (the people already using your
   storefront)
4. Add same-day local delivery (built into our software — many
   operators add $1-3k/mo additional revenue)

Want to talk through whether your specific store fits this model? 15
minutes is enough to figure out yes/no. Reply with a time.

— [Your Name]
NOHO Mailbox · 5062 Lankershim Blvd · NoHo CA 91601

[Unsubscribe link]
```

### Email C3 (Day 10 — final)

**Subject**: `Last note — the operator playbook`

```
[First Name],

Last email from me. Here&apos;s the operator-onboarding playbook in
case you want to review at your own pace:

nohomailbox.org/for-cmra-operators

Includes pricing, migration steps for existing pack-and-ship stores,
and ROI math for typical scenarios.

If it ever becomes relevant, reply or call (818) 506-7744. We&apos;re
onboarding 1-2 operators per month.

— [Your Name]

[Unsubscribe link]
```

---

## Personalization

These templates use:

- **`[First Name]`**: from your prospect data (validate before send — wrong
  names tank reply rates)
- **`[their_business]`**: business name from LinkedIn / website
- **`[their_network]`**: iPostal1 / Anytime / PostScan / Earth Class Mail
  (validate from their public profile or website)

**Do not** mass-personalize with AI tools that hallucinate (e.g., made-up
business details). The wrong personalization is worse than no
personalization.

---

## Reply handling

When a prospect replies:

1. **Pause the sequence immediately.** No more automated emails.
2. **Reply within 4 hours during business hours.** First-touch speed
   is the #1 predictor of conversion.
3. **Read carefully.** Don&apos;t respond to the wrong objection.
4. **Move to direct conversation.** Drop the templates after first
   reply — every conversation should feel one-on-one from email 2
   onward.

Common reply patterns + responses:

**&quot;What&apos;s your pricing?&quot;**
> Quick rundown: $299/mo Solo (up to 250 boxes, 1 location), $799/mo
> Growth (up to 750 boxes, 1-3 locations), $1499/mo Multi (up to 2500
> boxes, 1-10 locations). Flat — no rev share, no per-customer fees.
> Want to see the full pricing page or schedule a demo first?

**&quot;Send me more info.&quot;**
> Sure — here&apos;s the operator landing:
> nohomailbox.org/for-cmra-operators. The migration playbook is at
> /for-cmra-operators/migrate. Happy to walk you through specifics on
> a 15-min call when you&apos;re ready.

**&quot;Not interested / take me off your list.&quot;**
> Got it — removed. All the best with [their_business]. If anything
> changes, reply to this thread and I&apos;ll see it.

**&quot;What&apos;s the catch?&quot;**
> No catch. We license the software at flat fee. You bring the
> storefront, the customers, the operations. We provide the platform.
> The math works because we serve operators directly instead of the
> consumer market — different price point, different volume, different
> economics.

---

## Compliance footer (paste in every email)

```
NOHO Mailbox · 5062 Lankershim Blvd, North Hollywood CA 91601 ·
(818) 506-7744. This is a one-time outreach to operators in the CMRA
industry. Not interested? Reply STOP or use the unsubscribe link.
```

---

## Tools setup

**Sender domain**: `outbound.nohomailbox.org` (separate from main domain)
**SPF / DKIM / DMARC**: properly configured (use Mail-Tester to verify)
**Inbox warmup**: 14 days minimum before scaling beyond 10/day
**Send platform**: SmartLead or Instantly (built for cold outreach with
proper warmup + sequence management)

**Daily volume per inbox**:
- Days 1-7: 5-10 sends/day
- Days 8-14: 10-25 sends/day
- Day 15+: 25-50 sends/day max

**Reply rates** (target):
- Sequence A (iPostal1 operators): 8-15%
- Sequence B (other networks): 12-20%
- Sequence C (UPS Store / pack-ship): 15-25%

**Demo conversion** (target):
- 25-40% of replies → demo booked
- 30-45% of demos → close

---

## When to stop a prospect

Stop sending immediately if:
- They reply &quot;not interested&quot; (any form of it)
- They request unsubscribe
- Their email bounces (auto-handled by most platforms)
- You discover they&apos;re actually a competitor or out of business

Re-add to a 90-day-cold list if:
- They didn&apos;t reply to the full sequence
- They replied with &quot;not now, maybe later&quot; — schedule a follow-up
  in your calendar 90 days out

---

## Tracking

Minimum tracking per prospect:
- Date of each send
- Open rate (use platform&apos;s native tracking)
- Reply received? Type (positive / negative / unsubscribe)
- Demo booked? Outcome?
- Closed? MRR + start date

Weekly review:
- Open rate (target: 40-60% — below 30% means deliverability issue)
- Reply rate by sequence
- Demo conversion rate
- Best-performing subject lines (rotate winners more)
- Worst-performing emails in sequence (test alternatives)
