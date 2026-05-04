# Crisis Response Playbooks

When something breaks badly, you don&apos;t want to think clearly under
pressure. Pre-written response patterns save hours.

**Each playbook**: warning signs, immediate response (first 60 minutes),
days 1-7 stabilization, learning loop.

---

## Crisis 1: USPS-CMRA Audit Failure

### What it is

USPS-CMRA inspectors visit (announced or unannounced) and find issues
with Form 1583 archives, mail handling, or compliance procedures.
USPS can revoke CMRA status if findings aren&apos;t fixed.

### Warning signs

- Quarterly USPS reporting late by 30+ days
- Form 1583 backlog growing (>10 customers without notarized 1583)
- Identity verification skipped for multiple customers
- Mail-handling staff not following USPS procedures

### Immediate response (first 60 minutes if audit fails)

1. **Don&apos;t argue.** Take notes. Get the inspector&apos;s
   findings in writing.
2. **Confirm the timeline** to fix issues (typically 30-60 days).
3. **Call your founder + ops manager immediately** if not the
   inspector themselves.
4. **Don&apos;t share with customers yet.** First understand what
   you&apos;re fixing.

### Days 1-7 stabilization

Day 1:
- Pull every Form 1583 in archive. Audit for completeness.
- List every customer missing a notarized 1583.
- Fix the ones that can be fixed (notarize, sign, file).

Day 2-3:
- Email customers with missing 1583s — schedule notarization within
  14 days.
- Update USPS quarterly reporting if it was the gap.
- Document procedures (what we should be doing) and where we
  deviated.

Day 4-7:
- Submit corrective action plan to USPS in writing.
- Implement automated reminders for Form 1583 expiration / quarterly
  reporting.
- Train staff on procedures (refresher).

### Communication to customers (only if status change)

If USPS revokes CMRA status (worst case): customers can&apos;t legally
have their mail held by us. We&apos;d need to:

1. Email all customers within 24 hours: "USPS is requiring
   restructuring of our CMRA license. Your mail is safe. Here&apos;s
   what happens next."
2. Forward any held mail to addresses customers provide.
3. Pause new sign-ups until status resumed.
4. File appeal / re-application immediately.

### Learning loop

After resolution:
- Documented procedures in /sales-kit/_compliance/
- Calendared monthly self-audit (10-min check)
- Quarterly compliance review (30-min)
- Annual professional audit by outside CMRA consultant ($500-$1000)

---

## Crisis 2: Customer Mail Loss

### What it is

A customer&apos;s expected mail piece doesn&apos;t arrive (or worse,
went somewhere wrong). Some are operational mistakes; some are USPS
errors; some are customer expectations.

### Warning signs

- Customer says "I was expecting [X] from [Y] — it should have arrived
  by now"
- Multiple recent missing-mail tickets

### Immediate response (first 60 min)

1. **Confirm the details**: who sent it, when, expected delivery
   date, tracking number if any.
2. **Search the box** + any unsorted bins thoroughly.
3. **Search archive** (we keep mail for 4 years per USPS rules).
4. **Check USPS tracking** if available.
5. **Reply to customer within 1 hour**:

```
Hey [Name],

I&apos;m on it. Quick update: I&apos;ve searched your box, our
unsorted bins, and our archive. Status: [searching / not yet found /
found, here it is].

Searching the rest of the building now. I&apos;ll update you within
[2 hours].

If we can&apos;t find it, here&apos;s what I&apos;ll do:
1. Contact USPS tracking on your behalf
2. If they confirm delivery to us, we&apos;ll keep searching
3. If we genuinely lost it, we&apos;ll [credit / replace / refund as
   appropriate]

— [Your Name]
```

### Days 1-7 stabilization

If found within 24 hours:
- Scan + deliver to customer
- Apologize for the delay
- Document the find: where was it, what went wrong (sorting error?
  wrong box?)
- Fix the underlying process

If not found within 7 days:
- Honest conversation with customer: "we can&apos;t find it. Here&apos;s
  what we know."
- Offer: free month of service, refund for the trouble, escalate to
  USPS for trace
- Document for future training

### Customer recovery

Customers who experience a loss + good recovery often become
**stronger** advocates than customers who never had a problem. The
moment is gold if handled right.

After resolution:
- Personal follow-up 7 days later
- "How can we make this up?" question
- If they choose not to leave: send them a small thank-you (mail
  themselves a $20 Starbucks card, etc.)

### Learning loop

- Operational fix to prevent recurrence
- Train staff on the specific failure mode
- If 3+ losses in 30 days, that&apos;s a systemic issue: fix the
  whole process

---

## Crisis 3: Security Incident (Data Breach)

### What it is

Unauthorized access to customer data (mail scans, Form 1583 archives,
admin dashboard, billing info). Worst-case scenario.

### Warning signs

- Suspicious admin login from unknown IP
- Unauthorized password resets
- Customer reports something on their dashboard they didn&apos;t do
- Unexpected database activity in logs

### Immediate response (first 60 min)

1. **Lock down immediately**: revoke all admin sessions, force
   password resets for staff
2. **Stop the bleeding**: identify the access vector (compromised
   password? exploited vulnerability? insider threat?)
3. **Isolate affected systems**: take admin offline if needed, keep
   member portal online if not affected
4. **Document timeline**: when did unauthorized access start? When
   did we detect? What was accessed?

### Days 1-7 stabilization

Day 1:
- Confirm scope of breach (who&apos;s data was accessed)
- Engage legal counsel (CCPA / state breach notification laws)
- Engage cybersecurity firm for forensic analysis ($5-15k)
- Internal communication: who knows what, when

Day 2-3:
- Customer notification (where required by law) within 72 hours
- Public-facing statement on website
- Press notification (if required by scope)

Day 4-7:
- Implement remediation (patches, MFA, access reviews, credential
  rotation)
- Update privacy policy / security page if needed
- Customer support stepped up for questions

### Customer notification template

```
Subject: Important security update from NOHO Mailbox

[Date]

Dear [Customer Name],

I&apos;m writing to inform you of a security incident affecting
NOHO Mailbox customer data.

What happened: [factual description in plain English]

When: [date discovered, date of unauthorized access]

What was accessed: [specific data types]

What you should do: [specific actions — change password, monitor
accounts, etc.]

What we&apos;re doing: [remediation actions]

We take security seriously and we failed in this instance. We&apos;re
working with a cybersecurity firm to investigate and have implemented
[specific protective measures] to prevent recurrence.

For the next 12 months, we&apos;re providing [identity-monitoring
service] free to affected customers at no cost.

If you have questions, reply to this email or call (818) 506-7744.

Sincerely,
[Founder Name]
NOHO Mailbox
```

### Legal / compliance

- CA AB 1130 requires notification to CA residents for breaches of
  personal information
- Federal: depending on data type, may require notification to
  affected parties + AG offices
- ALWAYS work with legal counsel — generic templates can&apos;t
  substitute

### Learning loop

- Root-cause analysis written up
- Security improvements implemented
- Annual security audit added to compliance calendar
- MFA mandatory for all staff
- Quarterly access review

---

## Crisis 4: Major Customer Churn / Revenue Drop

### What it is

A 10%+ drop in MRR within a month, OR loss of a top-3 customer.

### Warning signs

- Single month with 5%+ churn
- Top customer is unresponsive to recent emails
- Major customer shifted to a competitor
- Industry-wide event (recession, regulatory change)

### Immediate response (first 24 hours)

1. **Don&apos;t panic.** One bad month is sometimes noise.
2. **Verify**: pull data, confirm the drop is real (not a billing
   glitch).
3. **Identify**: which specific customers churned + why.
4. **Outreach**: personally call the top 5 churners (if applicable)
   and listen to their reasons.

### Days 1-7 stabilization

Day 1-3:
- Customer interview series: 5 churners, 30 minutes each
- Compile patterns: was it product? pricing? support? competitor?
- Internal discussion: what&apos;s the underlying cause?

Day 4-7:
- Action plan for the top 1-2 root causes
- If pricing: stay firm but examine value perception
- If product: prioritize the most-requested fixes
- If support: improve response times / quality
- If competitor: understand what they offer better

### What NOT to do

1. **Don&apos;t panic-discount.** Cheap discount-driven retention
   doesn&apos;t solve the underlying issue.
2. **Don&apos;t fire staff in panic.** Bad decisions made in crisis
   compound.
3. **Don&apos;t pause acquisition.** You need NEW customers as you
   work on retention. Cutting acquisition = death spiral.

### Learning loop

- Documented retention playbook updates (sales kit doc 40)
- Specific churn-prevention checklist for the top root cause
- Monthly customer health check (proactive)
- Quarterly customer interviews (3-5 customers, 30 minutes each)

---

## Crisis 5: Critical Software Bug in CMRA SaaS

### What it is

Bug in our software that affects multiple licensed operators. Could
be: dashboard not loading, dispatch console showing wrong data,
billing calculations wrong, scanning queue corrupted, etc.

### Warning signs

- Multiple operator support tickets within hours of each other
- Operators report inconsistent data
- Internal monitoring alerts (if set up)
- Customer-facing "is your service down?" questions

### Immediate response (first 60 min)

1. **Confirm the bug**: reproduce it. Verify scope.
2. **Communicate**: send an "we&apos;re investigating" message to
   affected operators within 30 min. Use Status Page (or email if no
   status page yet).
3. **Triage**: what&apos;s critical? what&apos;s not? Severity 1 =
   data loss / billing wrong; Severity 2 = feature broken; Severity
   3 = display issue.

### Days 1-7 stabilization

Day 1 (focus: stop the bleed):
- Hotfix critical issues
- If hotfix not possible quickly: communicate workarounds to
  operators
- Monitor for collateral damage (other things that broke as a result)

Day 2-3 (focus: complete fix):
- Complete fix tested + deployed
- Communication to all affected operators
- Refunds / credits if billing was affected

Day 4-7 (focus: prevention):
- Root-cause analysis (RCA) document
- Test coverage added for the failure mode
- Monitoring added if missing
- Process improvement (was it a deployment? code review missed it?
  staging skipped?)

### Communication template

```
Subject: [Resolved/Investigating] Issue with [feature]

Hey [Operator name],

We identified [issue description] starting at [time]. As of [time],
[status: under investigation / fixing / fixed].

What this means for you:
[Specific impact]

What we&apos;re doing:
[Specific actions]

ETA for fix: [time]

We&apos;ll send another update by [time]. If you have urgent
questions in the meantime, reply or call (818) 506-7744.

Apologies for the disruption,
[Founder Name]
```

### Learning loop

- RCA documented in `/engineering/incidents/[YYYY-MM-DD]-[summary].md`
- Test added for the failure mode
- Process update if procedural fix needed
- Compensation policy if customer impact was significant

---

## Crisis 6: Negative Press / Public Complaint

### What it is

Customer posts a negative review (Yelp, Google, BBB) OR a journalist
publishes a critical story OR something goes viral on social media.

### Warning signs

- 1-star Google review with detailed complaint
- Journalist outreach asking for comment
- Customer making public threats ("I&apos;m going to write about this")
- Competitor publishing a teardown

### Immediate response (first 4 hours)

For a negative review:
1. **Read it carefully.** Identify what&apos;s factually true vs
   exaggerated.
2. **Reply publicly + politely.** Acknowledge, apologize for the
   experience, offer to make it right offline. Don&apos;t argue
   facts in public.
3. **Reach out privately.** Email the customer directly to resolve.

For journalist outreach:
1. **Confirm legitimate** journalist (check their byline + outlet).
2. **Don&apos;t answer immediately.** Take 24 hours to draft a
   response.
3. **Respond in writing**, not on a phone call (can&apos;t be
   misquoted).

### Days 1-7 stabilization

Day 1-3:
- Resolve underlying issue with customer if possible
- If they update review after resolution → ask politely for the
  update
- Internal review: was the complaint valid? What changed?

Day 4-7:
- Process update if there was a legit issue
- Communication to staff if it&apos;s a recurring complaint type

### Sample public reply to negative review

```
Hi [Name], I'm sorry your experience with NOHO Mailbox didn't meet
expectations. [Acknowledge specific complaint without arguing facts.]

I'd like to make this right. Could you reply to me directly at
real@nohomailbox.org or call me at (818) 506-7744? I'll personally
follow up.

Thanks,
[Founder Name]
NOHO Mailbox Founder
```

### What NOT to do

1. **Don&apos;t respond emotionally.** Walk away for 1 hour first.
2. **Don&apos;t argue facts publicly.** Even if you&apos;re right,
   it looks defensive.
3. **Don&apos;t threaten legal action.** Streisand effect.
4. **Don&apos;t buy fake positive reviews.** Crooked + detectable +
   eventual reputation hit.

### Learning loop

- Feedback incorporated into retention / onboarding playbooks
- Pattern monitoring: if same complaint type 3+ times, it&apos;s
  systemic
- Annual reputation audit

---

## Universal crisis principles

For ANY crisis:

1. **First 60 minutes is for gathering facts**, not action. Don&apos;t
   make decisions in panic.
2. **Communication is everything**. Customers forgive issues if
   they&apos;re informed; they don&apos;t forgive silence.
3. **Document everything**. Memory is unreliable; logs aren&apos;t.
4. **Bring in outside help if needed**. Lawyers, security firms,
   PR consultants. Cheaper than the wrong DIY decision.
5. **Don&apos;t hide bad news**. Customers + staff + investors
   eventually find out. Better to control the narrative.
6. **Take the loss**. Some crises end in real revenue loss, real
   customer loss, real damage. Accept it, learn from it, move forward.

---

## Crisis prevention (the cheapest crisis is the one that doesn&apos;t happen)

Quarterly:
- USPS-CMRA self-audit (10 min check of Form 1583 archive + reporting)
- Security review (access logs, MFA status, password rotation)
- Customer health check (top 5 customers by revenue — call them)

Annually:
- Outside compliance audit
- Outside security audit
- Customer satisfaction survey (NPS)
- Annual planning session (sales kit doc 34)

Most crises are either preventable OR detectable early. Investing in
prevention is the best ROI in the playbook.

---

## What this playbook ISN&apos;T

- Not a substitute for legal counsel. Real crises need real lawyers.
- Not exhaustive. Specific industries / regulations have their own
  crisis types.
- Not for everything. Most "crises" are normal operational issues.
  Reserve crisis-mode for the ones that actually matter.
