import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "NOHO Mailbox privacy policy — how we collect, use, and protect your personal information including CMRA compliance, CCPA rights, and data security practices.",
  openGraph: {
    title: "Privacy Policy — NOHO Mailbox",
    description: "Learn how NOHO Mailbox collects, uses, and protects your personal information.",
    url: "https://nohomailbox.org/privacy",
  },
  alternates: { canonical: "https://nohomailbox.org/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Privacy Policy
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Your privacy matters. Here&apos;s how we handle your information.
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

            {/* Introduction */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Introduction</h2>
              <p className="text-text-light-muted">
                NOHO Mailbox (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website{" "}
                <a href="https://nohomailbox.org" className="text-accent hover:underline">nohomailbox.org</a>{" "}
                and provides mailbox rental and related services at 5062 Lankershim Blvd, North Hollywood, CA 91601.
                This Privacy Policy describes how we collect, use, disclose, and protect your personal information
                when you use our website, services, and customer dashboard. By using our services, you agree to the
                practices described in this policy.
              </p>
            </div>

            {/* Information We Collect */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Information We Collect</h2>

              <h3 className="text-lg font-bold text-text-light mt-6 mb-3">Personal Information</h3>
              <p className="text-text-light-muted mb-3">
                When you sign up for a mailbox or use our services, we collect:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Full legal name, mailing address, email address, and phone number</li>
                <li>Two valid government-issued photo IDs (required by USPS CMRA regulations)</li>
                <li>Completed and notarized USPS Form 1583</li>
                <li>Business name and entity information (for business accounts)</li>
                <li>Signature specimens for notary and account verification</li>
              </ul>

              <h3 className="text-lg font-bold text-text-light mt-6 mb-3">Payment Information</h3>
              <p className="text-text-light-muted">
                Payment processing is handled by Square. We do not store your full credit card number,
                CVV, or other sensitive payment details on our servers. Square collects and processes
                your payment information in accordance with PCI-DSS standards. We retain transaction
                records including amounts, dates, and the last four digits of your payment method.
              </p>

              <h3 className="text-lg font-bold text-text-light mt-6 mb-3">Automatically Collected Information</h3>
              <p className="text-text-light-muted mb-3">
                When you visit our website, we may automatically collect:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>IP address and approximate geolocation</li>
                <li>Browser type, operating system, and device information</li>
                <li>Pages visited, time spent, and referring URLs</li>
                <li>Dashboard usage patterns and feature interactions</li>
              </ul>

              <h3 className="text-lg font-bold text-text-light mt-6 mb-3">Mail and Package Data</h3>
              <p className="text-text-light-muted">
                We photograph the exterior of incoming mail and packages for your dashboard notifications.
                When you request a scan of mail contents, those images are stored securely in your account.
                Package tracking information, delivery timestamps, and forwarding records are maintained
                as part of our service.
              </p>
            </div>

            {/* How We Use Your Information */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">How We Use Your Information</h2>
              <p className="text-text-light-muted mb-3">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Provide and manage your mailbox rental, mail scanning, forwarding, and package services</li>
                <li>Process payments and manage your account billing</li>
                <li>Verify your identity as required by USPS CMRA regulations</li>
                <li>Send you notifications about incoming mail, packages, and account updates</li>
                <li>Provide same-day delivery and notary services you request</li>
                <li>Facilitate business formation services</li>
                <li>Improve our website, services, and customer experience</li>
                <li>Comply with legal obligations and respond to law enforcement requests</li>
                <li>Prevent fraud and protect the security of our services</li>
              </ul>
            </div>

            {/* Third-Party Sharing */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Third-Party Sharing</h2>
              <p className="text-text-light-muted mb-3">
                We do not sell your personal information. We share your data only with the following
                third parties as necessary to provide our services:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Square</strong> — Payment processing. Square handles
                  all credit card transactions and stores payment credentials under their own privacy policy.
                </li>
                <li>
                  <strong className="text-text-light">Vercel</strong> — Website hosting and infrastructure.
                  Vercel may process server logs containing IP addresses and request metadata.
                </li>
                <li>
                  <strong className="text-text-light">Turso</strong> — Database hosting. Your account data
                  and mail records are stored in Turso&apos;s managed database infrastructure.
                </li>
                <li>
                  <strong className="text-text-light">USPS</strong> — We submit USPS Form 1583 data as
                  required by federal regulation for Commercial Mail Receiving Agencies (CMRAs).
                </li>
                <li>
                  <strong className="text-text-light">Shipping carriers</strong> — When forwarding mail or
                  packages, we share necessary address information with USPS, UPS, FedEx, or DHL.
                </li>
                <li>
                  <strong className="text-text-light">Delivery couriers</strong> — For same-day delivery
                  service, we share your delivery address with our local courier partners.
                </li>
                <li>
                  <strong className="text-text-light">Law enforcement</strong> — We may disclose information
                  when required by law, subpoena, or court order.
                </li>
              </ul>
            </div>

            {/* Cookies and Tracking */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Cookies and Tracking Technologies</h2>
              <p className="text-text-light-muted mb-3">Our website uses cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>Maintain your login session and authentication state</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Improve website performance and functionality</li>
              </ul>
              <p className="text-text-light-muted mt-3">
                You can control cookies through your browser settings. Disabling cookies may affect
                your ability to use certain features of our website and dashboard.
              </p>
            </div>

            {/* Security */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Security Measures</h2>
              <p className="text-text-light-muted">
                We implement reasonable administrative, technical, and physical safeguards to protect
                your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5 mt-3">
                <li>SSL/TLS encryption for all data transmitted between your browser and our servers</li>
                <li>Encrypted database storage for sensitive personal information</li>
                <li>Role-based access controls limiting staff access to customer data</li>
                <li>24/7 security surveillance at our physical location</li>
                <li>Secure, locked mailbox storage accessible only by authorized staff</li>
                <li>Regular security audits and monitoring</li>
              </ul>
              <p className="text-text-light-muted mt-3">
                While we take reasonable steps to protect your information, no method of transmission
                over the internet or electronic storage is completely secure. We cannot guarantee
                absolute security.
              </p>
            </div>

            {/* Data Retention */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Data Retention</h2>
              <p className="text-text-light-muted">
                We retain your personal information for as long as your account is active and as needed
                to provide our services. Under USPS CMRA regulations, we are required to retain copies
                of USPS Form 1583 and associated identification documents for a minimum of two (2) years
                after the termination of your mailbox agreement. Payment records are retained for seven
                (7) years for tax and accounting purposes. Mail scan images are retained for 90 days
                after processing unless you request earlier deletion. After the applicable retention
                period, data is securely deleted or anonymized.
              </p>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Your Rights</h2>
              <p className="text-text-light-muted mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Access</strong> — Request a copy of the personal
                  information we hold about you.
                </li>
                <li>
                  <strong className="text-text-light">Correction</strong> — Request that we correct
                  inaccurate or incomplete personal information.
                </li>
                <li>
                  <strong className="text-text-light">Deletion</strong> — Request that we delete your
                  personal information, subject to legal retention requirements (such as the CMRA
                  two-year retention rule).
                </li>
                <li>
                  <strong className="text-text-light">Data portability</strong> — Request your data in a
                  structured, commonly used format.
                </li>
                <li>
                  <strong className="text-text-light">Opt out</strong> — Opt out of marketing
                  communications at any time.
                </li>
              </ul>
              <p className="text-text-light-muted mt-3">
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:hello@nohomailbox.org" className="text-accent hover:underline">
                  hello@nohomailbox.org
                </a>{" "}
                or call{" "}
                <a href="tel:+18187651539" className="text-accent hover:underline">(818) 765-1539</a>.
                We will respond to your request within 30 days.
              </p>
            </div>

            {/* Children's Privacy */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Children&apos;s Privacy</h2>
              <p className="text-text-light-muted">
                Our services are not directed to individuals under the age of 18. We do not knowingly
                collect personal information from children. USPS Form 1583 requires valid government-issued
                photo identification, which inherently limits our services to adults. If we become aware
                that we have collected personal information from a child under 18, we will take steps to
                delete that information promptly.
              </p>
            </div>

            {/* CCPA */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">California Privacy Rights (CCPA)</h2>
              <p className="text-text-light-muted mb-3">
                If you are a California resident, you have additional rights under the California
                Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
              </p>
              <ul className="list-disc pl-6 text-text-light-muted space-y-1.5">
                <li>
                  <strong className="text-text-light">Right to know</strong> — You may request that we
                  disclose the categories and specific pieces of personal information we have collected
                  about you, the sources, the business purposes, and the third parties with whom we share it.
                </li>
                <li>
                  <strong className="text-text-light">Right to delete</strong> — You may request deletion
                  of your personal information, subject to exceptions required by law (including CMRA
                  retention requirements).
                </li>
                <li>
                  <strong className="text-text-light">Right to opt out of sale</strong> — We do not sell
                  your personal information. If this practice ever changes, we will provide a
                  &quot;Do Not Sell My Personal Information&quot; link.
                </li>
                <li>
                  <strong className="text-text-light">Right to non-discrimination</strong> — We will not
                  discriminate against you for exercising any of your CCPA rights.
                </li>
                <li>
                  <strong className="text-text-light">Right to correct</strong> — You may request correction
                  of inaccurate personal information.
                </li>
                <li>
                  <strong className="text-text-light">Right to limit use of sensitive personal information</strong> — You
                  may request that we limit our use of sensitive personal information to what is necessary
                  to provide the services you requested.
                </li>
              </ul>
              <p className="text-text-light-muted mt-3">
                To submit a CCPA request, email us at{" "}
                <a href="mailto:hello@nohomailbox.org" className="text-accent hover:underline">
                  hello@nohomailbox.org
                </a>{" "}
                with the subject line &quot;CCPA Request.&quot; We may need to verify your identity before
                processing your request.
              </p>
            </div>

            {/* Changes */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Changes to This Policy</h2>
              <p className="text-text-light-muted">
                We may update this Privacy Policy from time to time. When we make material changes, we
                will notify you by posting the updated policy on this page and updating the &quot;Last
                updated&quot; date. We encourage you to review this page periodically.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-2xl font-extrabold text-text-light mb-4">Contact Us</h2>
              <p className="text-text-light-muted">
                If you have questions or concerns about this Privacy Policy or our data practices,
                please contact us:
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
                <Link href="/terms" className="text-accent hover:underline font-semibold">
                  Terms of Service
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
