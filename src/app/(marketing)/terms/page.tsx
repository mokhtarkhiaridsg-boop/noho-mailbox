import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "NOHO Mailbox terms of service — mailbox rental agreement terms, CMRA compliance requirements, pricing, fees, cancellation policy, and service conditions.",
  openGraph: {
    title: "Terms of Service — NOHO Mailbox",
    description: "Terms and conditions for NOHO Mailbox mailbox rental, mail services, and related offerings.",
    url: "https://nohomailbox.org/terms",
  },
  alternates: { canonical: "https://nohomailbox.org/terms" },
};

export default function TermsOfServicePage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Terms of Service
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            The terms that govern your use of NOHO Mailbox services.
          </p>
          <p className="text-text-dark-muted/50 text-sm mt-4 animate-fade-up delay-300">
            Last updated: April 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto prose-container">
          <div className="space-y-12 text-text-light text-[15px] leading-relaxed">

            {/* 1. Acceptance */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">1. Acceptance of Terms</h2>
              <p className="text-text-light-muted">
                By accessing or using the services provided by NOHO Mailbox (&quot;we,&quot; &quot;us,&quot;
                or &quot;our&quot;), including our website at{" "}
                <a href="https://nohomailbox.org" className="text-accent hover:underline">nohomailbox.org</a>,
                customer dashboard, and in-store services at 5062 Lankershim Blvd, North Hollywood, CA 91601,
                you agree to be bound by these Terms of Service. If you do not agree to these terms, do not
                use our services.
              </p>
            </div>

            {/* 2. Eligibility */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">2. Eligibility</h2>
              <p className="text-text-light-muted">
                You must be at least 18 years of age and legally capable of entering into a binding
                agreement to use our services. By registering for an account, you represent and warrant
                that you meet these requirements. Business accounts must be registered by an authorized
                representative of the business entity.
              </p>
            </div>

            {/* 3. Account Registration & CMRA */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">3. Account Registration &amp; CMRA Compliance</h2>
              <p className="text-text-light-muted mb-3">
                NOHO Mailbox operates as a Commercial Mail Receiving Agency (CMRA) under United States
                Postal Service regulations. To open a mailbox account, you must:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  Complete USPS Form 1583 (Application for Delivery of Mail Through Agent) in person
                  at our location
                </li>
                <li>
                  Present two (2) valid forms of government-issued photo identification (e.g.,
                  driver&apos;s license, passport, state ID, military ID)
                </li>
                <li>
                  Have USPS Form 1583 notarized — we provide complimentary notarization at sign-up
                </li>
                <li>Provide accurate and current contact information</li>
                <li>
                  Notify us within 30 days of any change to the information on your Form 1583
                </li>
              </ul>
              <p className="text-text-light-muted mt-3">
                We submit Form 1583 to the USPS and retain copies as required by federal regulation.
                Providing false information on Form 1583 is a violation of federal law.
              </p>
            </div>

            {/* 4. Plans & Pricing */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">4. Plans and Pricing</h2>
              <p className="text-text-light-muted mb-3">
                We offer the following mailbox rental plans, each available in 3-month, 6-month, and
                14-month terms:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Basic Box</strong> — Private street address, mail
                  notifications, package acceptance from all carriers, and dashboard access.
                </li>
                <li>
                  <strong className="text-text-light">Business Box</strong> — Everything in Basic, plus
                  mail scanning, extended package holding, and priority support.
                </li>
                <li>
                  <strong className="text-text-light">Premium Box</strong> — Everything in Business, plus
                  mail forwarding, priority processing, notary discounts, and dedicated account support.
                </li>
              </ul>
              <p className="text-text-light-muted mt-3">
                Current pricing is displayed on our{" "}
                <Link href="/pricing" className="text-accent hover:underline">pricing page</Link>.
                Prices are subject to change with 30 days&apos; notice to existing customers. Plan terms
                are prepaid for the selected duration. Partial-term refunds are subject to the cancellation
                policy below.
              </p>
            </div>

            {/* 5. Security Deposit & Key */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">5. Security Deposit and Keys</h2>
              <p className="text-text-light-muted">
                A refundable security deposit of <strong className="text-text-light">$50.00</strong> is
                required at sign-up. This deposit is returned upon termination of your account, provided
                all keys are returned, no outstanding balances remain, and no damage has occurred to the
                mailbox unit. You will receive one (1) mailbox key at sign-up. Lost or damaged keys will
                be replaced at a fee of <strong className="text-text-light">$25.00</strong> per key.
                You must return all keys upon account closure.
              </p>
            </div>

            {/* 6. Payment & Late Fees */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">6. Payment Terms and Late Fees</h2>
              <p className="text-text-light-muted mb-3">
                All payments are processed through Square. Payment is due at the start of each billing
                term. By providing a payment method, you authorize us to charge the applicable fees.
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Grace period</strong> — A 10-day grace period
                  applies after the payment due date.
                </li>
                <li>
                  <strong className="text-text-light">Late fee</strong> — A{" "}
                  <strong className="text-text-light">$15.00</strong> late fee will be assessed if payment
                  is not received within the grace period.
                </li>
                <li>
                  <strong className="text-text-light">Account suspension</strong> — Accounts with
                  balances overdue by more than 30 days may be suspended. During suspension, we will
                  continue to accept and hold mail, but dashboard access and forwarding services will
                  be disabled.
                </li>
                <li>
                  <strong className="text-text-light">Account termination</strong> — Accounts with
                  balances overdue by more than 60 days may be terminated. Unclaimed mail will be
                  returned to sender or disposed of in accordance with USPS regulations.
                </li>
              </ul>
            </div>

            {/* 7. Mail Handling */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">7. Mail and Package Handling</h2>
              <p className="text-text-light-muted mb-3">
                We accept mail and packages from all carriers (USPS, UPS, FedEx, DHL, Amazon, and others)
                on your behalf. Our responsibilities and policies include:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Mail and packages are logged and photographed upon receipt</li>
                <li>You will receive digital notifications when new items arrive</li>
                <li>Standard mail and packages are held for up to 30 days</li>
                <li>Extended holding may be arranged by contacting us in advance</li>
                <li>
                  Unclaimed items after the holding period will be returned to sender (mail) or
                  disposed of (packages), with reasonable notice to you
                </li>
                <li>We are not responsible for items damaged during shipping by third-party carriers</li>
                <li>We are not liable for delays caused by carriers, weather, or other circumstances beyond our control</li>
              </ul>
            </div>

            {/* 8. Mail Scanning */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">8. Mail Scanning Services</h2>
              <p className="text-text-light-muted">
                Mail scanning is available for eligible plans and on a per-request basis. When you request
                a content scan, we open your mail and scan the contents to your secure dashboard. A fee of{" "}
                <strong className="text-text-light">$2.00 per page</strong> applies for content scanning
                beyond what is included in your plan. Exterior scans (envelope/package photos) are included
                with all plans at no additional charge. We exercise reasonable care when opening and scanning
                mail but are not responsible for damage inherent to the process.
              </p>
            </div>

            {/* 9. Mail Forwarding */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">9. Mail Forwarding</h2>
              <p className="text-text-light-muted mb-3">
                When you request mail or package forwarding, the following terms apply:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  A handling fee of <strong className="text-text-light">$5.00</strong> applies per
                  forwarding request, in addition to actual postage or shipping costs
                </li>
                <li>
                  Postage and shipping charges are calculated based on weight, dimensions, destination,
                  and carrier rates at the time of shipment
                </li>
                <li>
                  You are responsible for providing an accurate forwarding address — we are not liable
                  for items lost due to incorrect address information
                </li>
                <li>
                  Forwarding requests are typically processed within one (1) business day
                </li>
                <li>
                  Premium Box subscribers receive mail forwarding as part of their plan (postage still applies)
                </li>
              </ul>
            </div>

            {/* 10. Notary */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">10. Notary Services</h2>
              <p className="text-text-light-muted">
                We offer notary public services at our location. The fee is{" "}
                <strong className="text-text-light">$15.00 per signature</strong> for general customers.
                Premium Box subscribers receive discounted notary rates. Walk-in notary service is
                available based on staff availability; we recommend booking an appointment online to
                guarantee service. Notarization of USPS Form 1583 is provided at no charge when signing
                up for a new mailbox. Our notary public follows all California notary laws and may refuse
                to notarize a document if legal requirements are not met.
              </p>
            </div>

            {/* 11. Same-Day Delivery */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">11. Same-Day Delivery Service</h2>
              <p className="text-text-light-muted mb-3">
                Our same-day delivery service is available to all customers (mailbox membership not required)
                within the Los Angeles area. Terms include:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Delivery is available during business hours, subject to courier availability</li>
                <li>North Hollywood zone deliveries are a flat $5.00</li>
                <li>
                  Deliveries outside the North Hollywood zone start at $9.75 for up to 5 miles, plus
                  $0.75 per additional mile (maximum 15-mile radius)
                </li>
                <li>
                  We are not responsible for delays due to traffic, weather, or other circumstances
                  beyond our control
                </li>
                <li>Someone must be available to receive the delivery at the provided address</li>
                <li>
                  Delivery confirmation (photo or signature) will be provided through the dashboard
                  or notification
                </li>
              </ul>
            </div>

            {/* 12. Business Formation */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">12. Business Formation Services</h2>
              <p className="text-text-light-muted">
                We offer business formation packages including LLC, DBA, and S-Corp formation, EIN
                registration, branding, website development, and related services. Business formation
                services are provided as a convenience and do not constitute legal or tax advice. We
                recommend consulting with a licensed attorney or CPA for specific legal or tax questions.
                Timelines and deliverables are estimates and may vary. Fees for business formation packages
                are non-refundable once filing has been initiated with the relevant government agency.
              </p>
            </div>

            {/* 13. Prohibited Items */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">13. Prohibited Items and Conduct</h2>
              <p className="text-text-light-muted mb-3">
                You may not use your mailbox to receive or store:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Illegal substances, controlled substances, or drug paraphernalia</li>
                <li>Explosives, firearms, ammunition, or hazardous materials</li>
                <li>Stolen property or items involved in fraudulent activity</li>
                <li>Perishable goods that may spoil and damage other customers&apos; mail</li>
                <li>Live animals or biological specimens</li>
                <li>Items prohibited by USPS, carrier policies, or applicable law</li>
              </ul>
              <p className="text-text-light-muted mt-3">
                Using our services for any illegal purpose, fraud, identity theft, or activity that
                violates federal, state, or local law is strictly prohibited and will result in
                immediate account termination and referral to law enforcement. We reserve the right
                to refuse or return any item we reasonably believe is prohibited.
              </p>
            </div>

            {/* 14. Cancellation & Refunds */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">14. Cancellation and Refund Policy</h2>
              <p className="text-text-light-muted mb-3">
                You may cancel your mailbox at any time by providing written notice (email or in person).
                Upon cancellation:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Within 30 days of sign-up</strong> — Full refund
                  of prepaid rent minus any services used and a $25.00 processing fee.
                </li>
                <li>
                  <strong className="text-text-light">After 30 days</strong> — No refund for the
                  remaining term. Your mailbox will remain active until the end of the paid period.
                </li>
                <li>
                  The $50.00 security deposit is refunded within 14 business days after all keys are
                  returned and outstanding balances are settled.
                </li>
                <li>
                  You must arrange forwarding or pickup of remaining mail within 30 days of account
                  closure. After 30 days, unclaimed mail will be returned to sender.
                </li>
                <li>
                  We will continue to hold mail received after cancellation for 30 days and will
                  attempt to notify you.
                </li>
              </ul>
            </div>

            {/* 15. Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">15. Limitation of Liability</h2>
              <p className="text-text-light-muted">
                To the maximum extent permitted by law, NOHO Mailbox and its owners, employees, and
                agents shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages arising from or related to your use of our services. Our total liability
                for any claim related to our services shall not exceed the amount you paid for services
                during the twelve (12) months preceding the claim. We are not liable for loss, theft, or
                damage to mail or packages caused by third-party carriers, acts of God, government action,
                or other events outside our reasonable control. We are not liable for delays in mail
                delivery, scanning, or forwarding beyond our reasonable control.
              </p>
            </div>

            {/* 16. Indemnification */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">16. Indemnification</h2>
              <p className="text-text-light-muted">
                You agree to indemnify, defend, and hold harmless NOHO Mailbox and its owners, employees,
                and agents from and against any claims, liabilities, damages, losses, and expenses
                (including reasonable attorneys&apos; fees) arising from your use of our services, your
                violation of these Terms, or your violation of any law or the rights of any third party.
              </p>
            </div>

            {/* 17. Governing Law */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">17. Governing Law</h2>
              <p className="text-text-light-muted">
                These Terms shall be governed by and construed in accordance with the laws of the State
                of California, without regard to its conflict of law provisions. Any legal action or
                proceeding relating to these Terms shall be brought exclusively in the state or federal
                courts located in Los Angeles County, California, and you consent to the jurisdiction
                of such courts.
              </p>
            </div>

            {/* 18. Dispute Resolution */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">18. Dispute Resolution</h2>
              <p className="text-text-light-muted">
                Before initiating any legal proceeding, you agree to first contact us at{" "}
                <a href="mailto:hello@nohomailbox.org" className="text-accent hover:underline">
                  hello@nohomailbox.org
                </a>{" "}
                and attempt to resolve the dispute informally for at least 30 days. If informal resolution
                is unsuccessful, either party may pursue resolution through the courts as described in the
                Governing Law section. Small claims court actions in Los Angeles County may be initiated
                without the informal resolution requirement.
              </p>
            </div>

            {/* 19. Modifications */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">19. Modifications to Terms</h2>
              <p className="text-text-light-muted">
                We reserve the right to modify these Terms at any time. Material changes will be
                communicated via email to your registered address and posted on this page at least
                30 days before taking effect. Your continued use of our services after changes take
                effect constitutes your acceptance of the revised Terms. If you do not agree to the
                modified Terms, you may cancel your account in accordance with the cancellation policy.
              </p>
            </div>

            {/* 20. Severability */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">20. Severability</h2>
              <p className="text-text-light-muted">
                If any provision of these Terms is found to be invalid or unenforceable by a court of
                competent jurisdiction, the remaining provisions shall remain in full force and effect.
                The invalid provision will be modified to the minimum extent necessary to make it valid
                and enforceable.
              </p>
            </div>

            {/* 21. Entire Agreement */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">21. Entire Agreement</h2>
              <p className="text-text-light-muted">
                These Terms, together with our{" "}
                <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> and
                any signed mailbox rental agreement, constitute the entire agreement between you and
                NOHO Mailbox regarding your use of our services and supersede all prior agreements and
                understandings.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Contact Us</h2>
              <p className="text-text-light-muted">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="mt-4 bg-surface-light rounded-xl p-6 text-text-light-muted text-sm space-y-1.5">
                <p className="font-bold text-text-light">NOHO Mailbox</p>
                <p>5062 Lankershim Blvd, North Hollywood, CA 91601</p>
                <p>
                  Phone:{" "}
                  <a href="tel:+18187651539" className="text-accent hover:underline">(818) 765-1539</a>
                </p>
                <p>
                  Email:{" "}
                  <a href="mailto:hello@nohomailbox.org" className="text-accent hover:underline">
                    hello@nohomailbox.org
                  </a>
                </p>
                <p>
                  Website:{" "}
                  <a href="https://nohomailbox.org" className="text-accent hover:underline">
                    nohomailbox.org
                  </a>
                </p>
              </div>
            </div>

            {/* Cross-link */}
            <div className="pt-6 border-t border-text-light/10">
              <p className="text-text-light-muted text-sm">
                See also our{" "}
                <Link href="/privacy" className="text-accent hover:underline font-semibold">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
